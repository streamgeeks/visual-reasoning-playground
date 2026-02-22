"""Tests for the EDL generator and EDL data structures."""

import json
import tempfile
from pathlib import Path

import pytest

from src.edit_engine.edl_generator import EDL, EDLEntry, generate_edl


def _make_moments(count=10, spacing=10.0, base_score=9.0):
    return [
        {"seconds": i * spacing, "score": max(1, base_score - i * 0.3),
         "reason": f"Moment {i}", "tags": [f"t{i}"], "image_path": f"/tmp/f{i}.jpg"}
        for i in range(count)
    ]


class TestEDLEntry:

    def test_basic_properties(self):
        e = EDLEntry("/clip.mp4", 10.0, 20.0, score=8.0, reason="Goal")
        assert e.duration == 10.0
        assert e.score == 8.0
        assert e.in_tc.startswith("00:00:1")  # 10 seconds -> 00:00:10:xx
        assert e.out_tc.startswith("00:00:1")  # 20 seconds -> 00:00:19:xx or 00:00:20:xx

    def test_to_dict(self):
        e = EDLEntry("/clip.mp4", 5.0, 12.0, score=7.5, reason="Play", tags=["action"])
        d = e.to_dict()
        assert d["clip_path"] == "/clip.mp4"
        assert d["duration_seconds"] == 7.0
        assert d["score"] == 7.5
        assert "action" in d["tags"]


class TestEDL:

    def test_empty_edl(self):
        edl = EDL()
        assert edl.clip_count == 0
        assert edl.total_duration == 0.0
        assert edl.average_score == 0.0

    def test_add_entries(self):
        edl = EDL()
        edl.add(EDLEntry("/a.mp4", 0, 10, score=8))
        edl.add(EDLEntry("/a.mp4", 20, 30, score=6))
        assert edl.clip_count == 2
        assert edl.total_duration == 20.0
        assert edl.average_score == 7.0

    def test_remove_weakest(self):
        edl = EDL()
        edl.add(EDLEntry("/a.mp4", 0, 10, score=8))
        edl.add(EDLEntry("/a.mp4", 20, 30, score=3))
        edl.add(EDLEntry("/a.mp4", 40, 50, score=6))
        removed = edl.remove_weakest(1)
        assert len(removed) == 1
        assert removed[0].score == 3
        assert edl.clip_count == 2

    def test_trim_to_duration(self):
        edl = EDL()
        for i in range(5):
            edl.add(EDLEntry("/a.mp4", i * 20, i * 20 + 10, score=10 - i))
        edl.trim_to_duration(25.0)
        assert edl.total_duration <= 25.0

    def test_sort_chronological(self):
        edl = EDL()
        edl.add(EDLEntry("/a.mp4", 30, 40, score=5))
        edl.add(EDLEntry("/a.mp4", 0, 10, score=9))
        edl.add(EDLEntry("/a.mp4", 15, 25, score=7))
        edl.sort_chronological()
        assert edl.entries[0].in_seconds == 0
        assert edl.entries[1].in_seconds == 15
        assert edl.entries[2].in_seconds == 30

    def test_json_roundtrip(self, tmp_path):
        edl = EDL()
        edl.add(EDLEntry("/clip.mp4", 5, 15, score=8.5, reason="Test", tags=["x"]))
        edl.add(EDLEntry("/clip.mp4", 25, 35, score=7.0, reason="Test2"))

        path = tmp_path / "test_edl.json"
        edl.save(path)
        assert path.exists()

        loaded = EDL.load(path)
        assert loaded.clip_count == 2
        assert loaded.entries[0].score == 8.5
        assert loaded.entries[1].reason == "Test2"


class TestGenerateEDL:

    def test_basic_generation(self):
        moments = _make_moments(10)
        edl = generate_edl(moments, "/clip.mp4", target_seconds=60)
        assert edl.clip_count > 0
        assert edl.total_duration <= 60 * 1.15

    def test_respects_max_clips(self):
        moments = _make_moments(20)
        edl = generate_edl(moments, "/clip.mp4", target_seconds=200, max_clips=3)
        assert edl.clip_count <= 3

    def test_no_overlapping_segments(self):
        moments = _make_moments(10, spacing=5.0)
        edl = generate_edl(moments, "/clip.mp4", target_seconds=60, padding_seconds=2.0)
        for i in range(len(edl.entries) - 1):
            assert edl.entries[i].out_seconds <= edl.entries[i + 1].in_seconds

    def test_chronological_output(self):
        moments = _make_moments(10)
        edl = generate_edl(moments, "/clip.mp4", target_seconds=60)
        for i in range(len(edl.entries) - 1):
            assert edl.entries[i].in_seconds <= edl.entries[i + 1].in_seconds

    def test_empty_moments(self):
        edl = generate_edl([], "/clip.mp4", target_seconds=60)
        assert edl.clip_count == 0
