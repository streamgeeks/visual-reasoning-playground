"""Tests for the file watcher service."""

import time
import tempfile
from pathlib import Path

import pytest

from src.ingest.file_watcher import (
    is_video_file,
    scan_directory,
    FileWatcherState,
    watch_directory,
)


class TestIsVideoFile:

    def test_video_extensions(self):
        assert is_video_file("clip.mp4") is True
        assert is_video_file("clip.mov") is True
        assert is_video_file("clip.mxf") is True
        assert is_video_file("/path/to/file.MKV") is True
        assert is_video_file("recording.ts") is True

    def test_non_video_extensions(self):
        assert is_video_file("photo.jpg") is False
        assert is_video_file("document.pdf") is False
        assert is_video_file("script.py") is False
        assert is_video_file("readme.txt") is False


class TestScanDirectory:

    def test_scan_empty_dir(self, tmp_path):
        files = scan_directory(tmp_path)
        assert files == []

    def test_scan_with_videos(self, tmp_path):
        (tmp_path / "clip1.mp4").write_bytes(b"\x00")
        (tmp_path / "clip2.mov").write_bytes(b"\x00")
        (tmp_path / "photo.jpg").write_bytes(b"\x00")  # not a video
        files = scan_directory(tmp_path)
        assert len(files) == 2
        names = [f.name for f in files]
        assert "clip1.mp4" in names
        assert "clip2.mov" in names

    def test_scan_nonexistent_dir(self):
        files = scan_directory("/nonexistent/path")
        assert files == []


class TestFileWatcherState:

    def test_initial_state(self):
        state = FileWatcherState()
        assert state.running is False
        assert state.pending_count == 0
        assert state.ingested_count == 0

    def test_add_and_get_ready(self):
        state = FileWatcherState()
        state.add_pending("/clip.mp4")
        assert state.pending_count == 1
        # Not ready yet (just added)
        ready = state.get_ready_files(debounce=0.0)
        assert len(ready) == 1

    def test_mark_ingested(self):
        state = FileWatcherState()
        state.add_pending("/clip.mp4")
        state.mark_ingested("/clip.mp4")
        assert state.ingested_count == 1
        assert state.pending_count == 0


class TestWatchDirectory:

    def test_watch_and_detect(self, tmp_path):
        """Start watcher, create a file, verify it's detected."""
        detected = []

        def on_new(path):
            detected.append(path)

        state = watch_directory(
            tmp_path,
            on_new_file=on_new,
            debounce_seconds=0.5,
            poll_interval=0.3,
        )

        assert state.running is True

        # Create a new video file
        new_file = tmp_path / "new_clip.mp4"
        new_file.write_bytes(b"\x00" * 100)

        # Wait for detection
        time.sleep(2.0)
        state.running = False
        time.sleep(0.5)

        assert len(detected) >= 1
        assert "new_clip.mp4" in detected[0]
