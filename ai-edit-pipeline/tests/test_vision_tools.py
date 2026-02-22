"""Tests for the Moondream VLM client and frame extractor."""

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch, PropertyMock

import pytest

from src.vision.moondream_client import MoondreamClient, MoondreamError


class TestMoondreamClient:
    """Tests for the Moondream API client."""

    def test_init_with_key(self):
        client = MoondreamClient(api_key="md_test_key")
        assert client.api_key == "md_test_key"
        assert "moondream" in client.base_url
        client.close()

    def test_init_from_env(self, monkeypatch):
        monkeypatch.setenv("MOONDREAM_API_KEY", "md_env_key")
        monkeypatch.setenv("MOONDREAM_BASE_URL", "http://localhost:8000")
        client = MoondreamClient()
        assert client.api_key == "md_env_key"
        assert client.base_url == "http://localhost:8000"
        client.close()

    def test_encode_image_missing_file(self):
        client = MoondreamClient(api_key="test")
        with pytest.raises(MoondreamError, match="not found"):
            client._encode_image("/nonexistent/image.jpg")
        client.close()

    def test_encode_image_success(self, tmp_path):
        img = tmp_path / "test.jpg"
        img.write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 100)
        client = MoondreamClient(api_key="test")
        result = client._encode_image(img)
        assert result.startswith("data:image/jpeg;base64,")
        client.close()

    def test_parse_score_response_valid(self):
        client = MoondreamClient(api_key="test")
        result = client._parse_score_response('{"score": 8.5, "reason": "Great action", "tags": ["goal"]}')
        assert result["score"] == 8.5
        assert result["reason"] == "Great action"
        assert "goal" in result["tags"]
        client.close()

    def test_parse_score_response_with_markdown(self):
        client = MoondreamClient(api_key="test")
        text = '```json\n{"score": 7, "reason": "Nice play", "tags": ["assist"]}\n```'
        result = client._parse_score_response(text)
        assert result["score"] == 7.0
        assert result["reason"] == "Nice play"
        client.close()

    def test_parse_score_response_invalid(self):
        client = MoondreamClient(api_key="test")
        result = client._parse_score_response("this is not json at all")
        assert result["score"] == 5.0  # default fallback
        assert "Could not parse" in result["reason"]
        client.close()

    def test_parse_score_response_clamps_range(self):
        client = MoondreamClient(api_key="test")
        result = client._parse_score_response('{"score": 15, "reason": "Over max", "tags": []}')
        assert result["score"] == 10.0  # clamped to max
        result = client._parse_score_response('{"score": -3, "reason": "Under min", "tags": []}')
        assert result["score"] == 0.0  # clamped to min
        client.close()

    def test_context_manager(self):
        with MoondreamClient(api_key="test") as client:
            assert client.api_key == "test"


class TestFrameExtractor:

    def test_check_ffmpeg(self):
        from src.vision.frame_extractor import check_ffmpeg
        # This will return True/False depending on the system - just verify it runs
        result = check_ffmpeg()
        assert isinstance(result, bool)

    def test_extract_raises_on_missing_file(self):
        from src.vision.frame_extractor import extract_keyframes, FrameExtractionError
        # Will fail either because ffmpeg is missing or file doesn't exist
        with pytest.raises((FrameExtractionError, FileNotFoundError)):
            extract_keyframes("/nonexistent/video.mp4")
