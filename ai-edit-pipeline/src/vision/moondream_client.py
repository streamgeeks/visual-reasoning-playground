"""Moondream VLM client for the AI edit pipeline.

Handles communication with the Moondream cloud API for frame analysis
and moment scoring. The base URL is configurable via MOONDREAM_BASE_URL
environment variable to support swapping in a local Moondream instance.

All image data stays as local file paths or base64 -- frames are only
sent to the configured Moondream endpoint.
"""

from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

import httpx

from src.utils.logging_config import get_logger

log = get_logger("moondream_client")

DEFAULT_BASE_URL = "https://api.moondream.ai/v1"
DEFAULT_TIMEOUT = 60.0


class MoondreamError(Exception):
    """Raised when a Moondream API call fails."""


class MoondreamClient:
    """Python client for the Moondream Vision Language Model API.

    Usage:
        client = MoondreamClient(api_key="md_...")
        result = client.query(image_path, "Describe this scene")
        detection = client.detect(image_path, "person")
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.api_key = api_key or os.environ.get("MOONDREAM_API_KEY", "")
        self.base_url = (base_url or os.environ.get("MOONDREAM_BASE_URL", DEFAULT_BASE_URL)).rstrip("/")
        self.timeout = timeout

        if not self.api_key:
            log.warning("No Moondream API key configured. Set MOONDREAM_API_KEY in .env")

        self._client = httpx.Client(
            timeout=httpx.Timeout(timeout),
            headers={
                "X-Moondream-Auth": self.api_key,
                "Content-Type": "application/json",
            },
        )
        log.info("MoondreamClient initialized (base_url=%s)", self.base_url)

    def _encode_image(self, image_path: str | Path) -> str:
        """Read an image file and return its base64-encoded data URL."""
        path = Path(image_path)
        if not path.exists():
            raise MoondreamError(f"Image file not found: {path}")

        data = path.read_bytes()

        # Detect MIME type from extension
        ext = path.suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".bmp": "image/bmp",
        }
        mime = mime_map.get(ext, "image/jpeg")

        b64 = base64.b64encode(data).decode("utf-8")
        return f"data:{mime};base64,{b64}"

    def query(self, image_path: str | Path, prompt: str) -> dict:
        """Send a query to Moondream with an image and prompt.

        Args:
            image_path: Path to the image file.
            prompt: The question or instruction for the VLM.

        Returns:
            Dict with 'answer' key containing the model's response.
        """
        image_data = self._encode_image(image_path)

        payload = {
            "image_url": image_data,
            "question": prompt,
            "stream": False,
        }

        log.info("Querying Moondream: prompt='%s' image=%s", prompt[:60], Path(image_path).name)

        try:
            resp = self._client.post(f"{self.base_url}/query", json=payload)
            resp.raise_for_status()
            result = resp.json()
            answer = result.get("answer", result.get("result", ""))
            log.info("Moondream response: %s", str(answer)[:100])
            return {"answer": answer}
        except httpx.HTTPStatusError as e:
            raise MoondreamError(f"Moondream API error {e.response.status_code}: {e.response.text[:200]}") from e
        except httpx.RequestError as e:
            raise MoondreamError(f"Moondream request failed: {e}") from e

    def detect(self, image_path: str | Path, object_name: str) -> dict:
        """Detect an object in an image and return bounding boxes.

        Args:
            image_path: Path to the image file.
            object_name: Name of the object to detect (e.g., "person", "whiteboard").

        Returns:
            Dict with 'objects' key containing list of detections:
            [{'x_min', 'y_min', 'x_max', 'y_max', 'x', 'y', 'width', 'height'}]
        """
        image_data = self._encode_image(image_path)

        payload = {
            "image_url": image_data,
            "object": object_name,
            "stream": False,
        }

        log.info("Detecting '%s' in %s", object_name, Path(image_path).name)

        try:
            resp = self._client.post(f"{self.base_url}/detect", json=payload)
            resp.raise_for_status()
            result = resp.json()

            # Normalize detection results
            objects = []
            for det in result.get("objects", result.get("detections", [])):
                obj = {
                    "x_min": det.get("x_min", 0),
                    "y_min": det.get("y_min", 0),
                    "x_max": det.get("x_max", 0),
                    "y_max": det.get("y_max", 0),
                }
                # Compute center and size (normalized 0-1)
                obj["x"] = (obj["x_min"] + obj["x_max"]) / 2
                obj["y"] = (obj["y_min"] + obj["y_max"]) / 2
                obj["width"] = obj["x_max"] - obj["x_min"]
                obj["height"] = obj["y_max"] - obj["y_min"]
                objects.append(obj)

            log.info("Detected %d '%s' object(s)", len(objects), object_name)
            return {"objects": objects}
        except httpx.HTTPStatusError as e:
            raise MoondreamError(f"Moondream detect error {e.response.status_code}: {e.response.text[:200]}") from e
        except httpx.RequestError as e:
            raise MoondreamError(f"Moondream detect failed: {e}") from e

    def score_moment(
        self,
        image_path: str | Path,
        context: str = "Score this frame 0-10 for highlight value in a sports broadcast.",
    ) -> dict:
        """Score a single frame for highlight/editorial value.

        Args:
            image_path: Path to the keyframe image.
            context: Scoring prompt with instructions.

        Returns:
            Dict with: {score: float, reason: str, tags: list[str]}
        """
        prompt = (
            f"{context}\n\n"
            "Respond with ONLY valid JSON (no markdown, no backticks):\n"
            '{"score": <0-10 float>, "reason": "<one sentence>", "tags": ["tag1", "tag2"]}'
        )

        result = self.query(image_path, prompt)
        return self._parse_score_response(result["answer"])

    def _parse_score_response(self, text: str) -> dict:
        """Parse a score response from the VLM into structured data."""
        import json

        try:
            # Strip markdown fences if present
            clean = text
            if "```" in clean:
                import re
                match = re.search(r"```(?:json)?\s*([\s\S]*?)```", clean)
                if match:
                    clean = match.group(1)

            # Find JSON object
            start = clean.index("{")
            end = clean.rindex("}") + 1
            parsed = json.loads(clean[start:end])

            score = float(parsed.get("score", 5))
            score = max(0, min(10, score))

            return {
                "score": round(score, 1),
                "reason": parsed.get("reason", ""),
                "tags": parsed.get("tags", []),
            }
        except (ValueError, json.JSONDecodeError) as e:
            log.warning("Failed to parse score response: %s | raw: %s", e, text[:100])
            return {"score": 5.0, "reason": "Could not parse VLM response", "tags": []}

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
