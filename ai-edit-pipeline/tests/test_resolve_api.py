"""Tests for resolve_api.py -- the Resolve abstraction layer.

All tests use the mock Resolve environment (no DaVinci Resolve required).
Integration tests against live Resolve are in a separate file and marked
with @pytest.mark.integration.
"""

import pytest
from unittest.mock import patch

from src.resolve_api import ResolveAPI, ResolveAPIError


class TestConnection:
    """Tests for connect/disconnect behavior."""

    def test_not_connected_initially(self):
        api = ResolveAPI()
        assert api.is_connected is False

    def test_connect_succeeds_with_mock(self, mock_resolve_api):
        assert mock_resolve_api.is_connected is True

    def test_methods_raise_when_not_connected(self):
        api = ResolveAPI()
        with pytest.raises(ResolveAPIError, match="Not connected"):
            api.create_project("test")

    def test_methods_raise_when_no_project(self, mock_resolve):
        """API is connected but no project is open."""
        api = ResolveAPI()
        api._resolve = mock_resolve
        # Don't set _project
        api._project = None
        with pytest.raises(ResolveAPIError, match="No project"):
            api.import_footage("test.mp4")


class TestProjectManagement:
    """Tests for project create/load/save operations."""

    def test_create_project(self, mock_resolve_api):
        name = mock_resolve_api.create_project("TestProject2")
        assert name == "TestProject2"
        assert mock_resolve_api.get_current_project_name() == "TestProject2"

    def test_create_duplicate_project_fails(self, mock_resolve_api):
        mock_resolve_api.create_project("UniqueProject")
        with pytest.raises(ResolveAPIError, match="Failed to create"):
            mock_resolve_api.create_project("UniqueProject")

    def test_load_project(self, mock_resolve_api):
        mock_resolve_api.create_project("LoadMe")
        mock_resolve_api.create_project("OtherProject")  # switches away
        name = mock_resolve_api.load_project("LoadMe")
        assert name == "LoadMe"
        assert mock_resolve_api.get_current_project_name() == "LoadMe"

    def test_load_nonexistent_project_fails(self, mock_resolve_api):
        with pytest.raises(ResolveAPIError, match="Failed to load"):
            mock_resolve_api.load_project("DoesNotExist")

    def test_save_project(self, mock_resolve_api):
        mock_resolve_api.create_project("SaveMe")
        assert mock_resolve_api.save_project() is True

    def test_get_project_list(self, mock_resolve_api):
        mock_resolve_api.create_project("ProjectA")
        mock_resolve_api.create_project("ProjectB")
        projects = mock_resolve_api.get_project_list()
        assert "ProjectA" in projects
        assert "ProjectB" in projects


class TestMediaPool:
    """Tests for media pool import and listing."""

    def test_import_footage(self, mock_resolve_api, temp_video_file):
        mock_resolve_api.create_project("ImportTest")
        clip = mock_resolve_api.import_footage(temp_video_file)
        assert "id" in clip
        assert "name" in clip
        assert clip["name"] == temp_video_file.name
        assert clip["duration_frames"] == 900  # mock default

    def test_import_nonexistent_file_fails(self, mock_resolve_api):
        mock_resolve_api.create_project("ImportFail")
        with pytest.raises(ResolveAPIError, match="File not found"):
            mock_resolve_api.import_footage("/nonexistent/video.mp4")

    def test_list_media_pool(self, mock_resolve_api, temp_video_file):
        mock_resolve_api.create_project("ListTest")
        mock_resolve_api.import_footage(temp_video_file)
        clips = mock_resolve_api.list_media_pool()
        assert len(clips) >= 1
        assert clips[0]["name"] == temp_video_file.name

    def test_list_media_pool_empty(self, mock_resolve_api):
        mock_resolve_api.create_project("EmptyPool")
        clips = mock_resolve_api.list_media_pool()
        assert clips == []


class TestTimeline:
    """Tests for timeline creation and clip appending."""

    def test_create_timeline(self, mock_resolve_api):
        mock_resolve_api.create_project("TimelineTest")
        name = mock_resolve_api.create_timeline("Main Edit")
        assert name == "Main Edit"
        assert mock_resolve_api.get_timeline_name() == "Main Edit"

    def test_append_to_timeline(self, mock_resolve_api, temp_video_file):
        mock_resolve_api.create_project("AppendTest")
        clip = mock_resolve_api.import_footage(temp_video_file)
        mock_resolve_api.create_timeline("TestTimeline")
        success = mock_resolve_api.append_to_timeline(clip["id"])
        assert success is True

    def test_append_with_in_out_points(self, mock_resolve_api, temp_video_file):
        mock_resolve_api.create_project("InOutTest")
        clip = mock_resolve_api.import_footage(temp_video_file)
        mock_resolve_api.create_timeline("TrimmedTimeline")
        success = mock_resolve_api.append_to_timeline(
            clip["id"],
            in_tc="00:00:05:00",
            out_tc="00:00:15:00",
        )
        assert success is True

    def test_append_nonexistent_clip_fails(self, mock_resolve_api):
        mock_resolve_api.create_project("BadClip")
        mock_resolve_api.create_timeline("BadTimeline")
        with pytest.raises(ResolveAPIError, match="not found in media pool"):
            mock_resolve_api.append_to_timeline("nonexistent_id")

    def test_get_timeline_duration(self, mock_resolve_api, temp_video_file):
        mock_resolve_api.create_project("DurationTest")
        clip = mock_resolve_api.import_footage(temp_video_file)
        mock_resolve_api.create_timeline("DurationTimeline")
        mock_resolve_api.append_to_timeline(clip["id"])
        duration = mock_resolve_api.get_timeline_duration()
        assert "frames" in duration
        assert "seconds" in duration
        assert "smpte" in duration
        assert "fps" in duration
        assert duration["frames"] > 0

    def test_timeline_operations_require_timeline(self, mock_resolve_api):
        mock_resolve_api.create_project("NoTimeline")
        with pytest.raises(ResolveAPIError, match="No timeline"):
            mock_resolve_api.get_timeline_duration()


class TestTitleCard:
    """Tests for title card insertion."""

    def test_add_title_card(self, mock_resolve_api):
        mock_resolve_api.create_project("TitleTest")
        mock_resolve_api.create_timeline("TitleTimeline")
        result = mock_resolve_api.add_title_card("Hello World", position="start", duration_seconds=3.0)
        assert result is True


class TestExport:
    """Tests for timeline export/render."""

    def test_export_timeline(self, mock_resolve_api, temp_video_file, temp_dir):
        mock_resolve_api.create_project("ExportTest")
        clip = mock_resolve_api.import_footage(temp_video_file)
        mock_resolve_api.create_timeline("ExportTimeline")
        mock_resolve_api.append_to_timeline(clip["id"])

        output = temp_dir / "output.mp4"
        result = mock_resolve_api.export_timeline(output, format="H.264")
        assert "output_path" in result
        assert result["format"] == "H.264"
        assert "status" in result


class TestPageNavigation:
    """Tests for page switching."""

    def test_open_valid_page(self, mock_resolve_api):
        assert mock_resolve_api.open_page("edit") is True
        assert mock_resolve_api.open_page("color") is True
        assert mock_resolve_api.open_page("deliver") is True

    def test_open_invalid_page(self, mock_resolve_api):
        with pytest.raises(ResolveAPIError, match="Invalid page"):
            mock_resolve_api.open_page("nonexistent")

    def test_get_current_page(self, mock_resolve_api):
        mock_resolve_api.open_page("media")
        assert mock_resolve_api.get_current_page() == "media"


class TestResolveInfo:
    """Tests for info/utility methods."""

    def test_get_version(self, mock_resolve_api):
        version = mock_resolve_api.get_resolve_version()
        assert "19" in version  # mock returns [19, 1, 2]
