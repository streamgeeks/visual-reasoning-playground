"""Tests for session manager and multi-camera grouping."""

import time
import tempfile
from pathlib import Path

import pytest

from src.ingest.session_manager import Session, SessionManager
from src.ingest.multi_camera import CameraClip, SyncGroup, group_clips_by_time, find_best_angle


class TestSession:

    def test_create_session(self):
        s = Session(name="Test Session")
        assert s.name == "Test Session"
        assert s.clip_count == 0
        assert s.session_id.startswith("session_")

    def test_add_clip(self):
        s = Session(name="Test")
        s.add_clip("/video/clip1.mp4")
        s.add_clip("/video/clip2.mp4")
        assert s.clip_count == 2
        assert "/video/clip1.mp4" in s.clip_paths

    def test_roundtrip_dict(self):
        s = Session(name="Roundtrip")
        s.add_clip("/clip.mp4")
        d = s.to_dict()
        s2 = Session.from_dict(d)
        assert s2.name == "Roundtrip"
        assert s2.clip_count == 1


class TestSessionManager:

    def test_create_and_list(self, tmp_path):
        sm = SessionManager(storage_path=tmp_path / "sessions.json")
        sm.create_session("Session A")
        sm.create_session("Session B")
        sessions = sm.list_sessions()
        assert len(sessions) == 2

    def test_add_clip_to_session(self, tmp_path):
        sm = SessionManager(storage_path=tmp_path / "sessions.json")
        sm.create_session("My Session")
        sm.add_clip_to_session("My Session", "/clip1.mp4")
        clips = sm.get_session_clips("My Session")
        assert "/clip1.mp4" in clips

    def test_auto_create_session(self, tmp_path):
        sm = SessionManager(storage_path=tmp_path / "sessions.json")
        sm.add_clip_to_session("Auto Created", "/clip.mp4", auto_create=True)
        assert sm.get_session("Auto Created") is not None

    def test_delete_session(self, tmp_path):
        sm = SessionManager(storage_path=tmp_path / "sessions.json")
        sm.create_session("Delete Me")
        assert sm.delete_session("Delete Me") is True
        assert sm.get_session("Delete Me") is None

    def test_persistence(self, tmp_path):
        path = tmp_path / "sessions.json"
        sm1 = SessionManager(storage_path=path)
        sm1.create_session("Persistent")
        sm1.add_clip_to_session("Persistent", "/clip.mp4")

        sm2 = SessionManager(storage_path=path)
        assert len(sm2.sessions) == 1
        assert sm2.sessions[0].name == "Persistent"
        assert sm2.sessions[0].clip_count == 1

    def test_auto_assign_clip(self, tmp_path):
        sm = SessionManager(storage_path=tmp_path / "sessions.json")
        s1 = sm.auto_assign_clip("/clip1.mp4", grouping_window=60)
        s2 = sm.auto_assign_clip("/clip2.mp4", grouping_window=60)
        # Both should be in the same session (within grouping window)
        assert s1.session_id == s2.session_id
        assert s2.clip_count == 2


class TestMultiCamera:

    def test_camera_clip_creation(self, tmp_path):
        f = tmp_path / "cam1_clip001.mp4"
        f.write_bytes(b"\x00" * 100)
        clip = CameraClip(path=str(f))
        assert clip.camera_id == "cam1"
        assert clip.filename == "cam1_clip001.mp4"

    def test_group_simultaneous_clips(self, tmp_path):
        # Create files with very close timestamps
        files = []
        for i, name in enumerate(["cam1_001.mp4", "cam2_001.mp4", "cam3_001.mp4"]):
            f = tmp_path / name
            f.write_bytes(b"\x00" * 100)
            files.append(str(f))

        groups = group_clips_by_time(files, sync_tolerance=10.0)
        # All should be in one group since they were created at ~same time
        assert len(groups) >= 1
        assert groups[0].camera_count >= 1

    def test_sync_group_properties(self):
        g = SyncGroup()
        c1 = CameraClip.__new__(CameraClip)
        c1.path = "/cam1.mp4"
        c1.filename = "cam1.mp4"
        c1.camera_id = "cam1"
        c1.created_at = 1000.0
        c1.duration_seconds = 60.0

        c2 = CameraClip.__new__(CameraClip)
        c2.path = "/cam2.mp4"
        c2.filename = "cam2.mp4"
        c2.camera_id = "cam2"
        c2.created_at = 1002.0
        c2.duration_seconds = 60.0

        g.add(c1)
        g.add(c2)
        assert g.camera_count == 2
        assert "cam1" in g.camera_ids
        assert "cam2" in g.camera_ids

    def test_find_best_angle_with_scores(self):
        g = SyncGroup()
        c1 = CameraClip.__new__(CameraClip)
        c1.path = "/cam1.mp4"
        c1.filename = "cam1.mp4"
        c1.camera_id = "cam1"
        c1.created_at = 1000.0
        c1.duration_seconds = 60.0

        c2 = CameraClip.__new__(CameraClip)
        c2.path = "/cam2.mp4"
        c2.filename = "cam2.mp4"
        c2.camera_id = "cam2"
        c2.created_at = 1001.0
        c2.duration_seconds = 60.0

        g.add(c1)
        g.add(c2)

        scores = {
            "cam1": [{"seconds": 30, "score": 5.0}],
            "cam2": [{"seconds": 30, "score": 9.0}],
        }
        best = find_best_angle(g, 30.0, scored_frames=scores)
        assert best is not None
        assert best.camera_id == "cam2"

    def test_find_best_angle_no_scores(self):
        g = SyncGroup()
        c1 = CameraClip.__new__(CameraClip)
        c1.path = "/cam1.mp4"
        c1.filename = "cam1.mp4"
        c1.camera_id = "cam1"
        c1.created_at = 1000.0
        c1.duration_seconds = 60.0
        g.add(c1)

        best = find_best_angle(g, 30.0)
        assert best is not None
        assert best.camera_id == "cam1"
