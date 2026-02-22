"""MCP-callable tools for Visual Reasoning AI (Moondream VLM) operations.

Each function is registered as an MCP tool that Claude can invoke.
"""

from __future__ import annotations

import time
from mcp.server.fastmcp import FastMCP

from src.vision.moondream_client import MoondreamClient, MoondreamError
from src.vision.frame_extractor import extract_keyframes, FrameExtractionError
from src.utils.logging_config import get_logger

log = get_logger("tools.vision")

# Singleton VLM client
_vlm_client: MoondreamClient | None = None


def _get_vlm() -> MoondreamClient:
    """Get or create the shared MoondreamClient instance."""
    global _vlm_client
    if _vlm_client is None:
        _vlm_client = MoondreamClient()
    return _vlm_client


def register_vision_tools(mcp: FastMCP) -> None:
    """Register all Vision AI MCP tools with the FastMCP server."""

    @mcp.tool()
    def analyze_frame(image_path: str, prompt: str) -> dict:
        """Run VLM inference on a single image frame.

        Args:
            image_path: Absolute path to the image file (JPEG, PNG).
            prompt: The question or instruction for the vision model.

        Returns:
            Dict with {answer, image_path}.
        """
        start = time.time()
        client = _get_vlm()
        result = client.query(image_path, prompt)
        elapsed = time.time() - start
        log.info("MCP analyze_frame: prompt='%s' -> %s (%.2fs)",
                 prompt[:50], str(result["answer"])[:80], elapsed)
        return {
            "answer": result["answer"],
            "image_path": image_path,
            "latency_seconds": round(elapsed, 2),
        }

    @mcp.tool()
    def score_moment(image_path: str, context: str = "") -> dict:
        """Score a frame 0-10 for highlight value.

        Args:
            image_path: Path to the keyframe image.
            context: Optional scoring context (e.g., 'sports highlight reel',
                     'wedding ceremony key moments'). If empty, uses a default
                     broadcast scoring prompt.

        Returns:
            Dict with {score, reason, tags, image_path}.
        """
        start = time.time()
        client = _get_vlm()

        scoring_prompt = context if context else (
            "Score this frame 0-10 for highlight value in a broadcast production. "
            "10 = unmissable moment, 0 = nothing happening."
        )

        result = client.score_moment(image_path, scoring_prompt)
        elapsed = time.time() - start

        log.info("MCP score_moment: score=%.1f reason='%s' (%.2fs)",
                 result["score"], result["reason"][:60], elapsed)
        return {
            **result,
            "image_path": image_path,
            "latency_seconds": round(elapsed, 2),
        }

    @mcp.tool()
    def extract_keyframes_from_video(
        video_path: str,
        interval_seconds: float = 5.0,
    ) -> dict:
        """Extract one frame every N seconds from a video file.

        Args:
            video_path: Path to the video file.
            interval_seconds: Seconds between each extracted frame (default: 5).

        Returns:
            Dict with {frames: [{timecode, seconds, image_path, frame_index}], count, video_path}.
        """
        start = time.time()
        frames = extract_keyframes(video_path, interval_seconds=interval_seconds)
        elapsed = time.time() - start

        log.info("MCP extract_keyframes: %d frames from %s at %.1fs interval (%.2fs)",
                 len(frames), video_path, interval_seconds, elapsed)
        return {
            "frames": frames,
            "count": len(frames),
            "video_path": video_path,
            "interval_seconds": interval_seconds,
            "latency_seconds": round(elapsed, 2),
        }

    @mcp.tool()
    def batch_analyze_clip(
        clip_path: str,
        prompt: str = "Describe what is happening in this frame. Note any key moments, actions, or events.",
        sample_rate: float = 5.0,
    ) -> dict:
        """Run full VLM analysis on a video clip at a configurable sample rate.

        Extracts keyframes, analyzes each with the VLM, and returns a scored manifest.

        Args:
            clip_path: Path to the video clip.
            prompt: Analysis prompt for each frame.
            sample_rate: Seconds between sampled frames (default: 5).

        Returns:
            Dict with {analyses: [{timecode, seconds, image_path, answer}], count, clip_path}.
        """
        start = time.time()

        # Step 1: Extract keyframes
        frames = extract_keyframes(clip_path, interval_seconds=sample_rate)

        # Step 2: Analyze each frame
        client = _get_vlm()
        analyses = []
        for i, frame in enumerate(frames):
            try:
                result = client.query(frame["image_path"], prompt)
                analyses.append({
                    **frame,
                    "answer": result["answer"],
                })
                log.info("  Frame %d/%d analyzed: %s", i + 1, len(frames), str(result["answer"])[:60])
            except MoondreamError as e:
                log.warning("  Frame %d/%d failed: %s", i + 1, len(frames), e)
                analyses.append({
                    **frame,
                    "answer": f"Analysis failed: {e}",
                })

        elapsed = time.time() - start
        log.info("MCP batch_analyze_clip: %d frames analyzed (%.2fs)", len(analyses), elapsed)

        return {
            "analyses": analyses,
            "count": len(analyses),
            "clip_path": clip_path,
            "sample_rate": sample_rate,
            "latency_seconds": round(elapsed, 2),
        }
