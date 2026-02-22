"""Tests for the Resolve assembler (EDL -> timeline execution)."""

import pytest
from unittest.mock import patch

from src.edit_engine.edl_generator import EDL, EDLEntry
from src.edit_engine.resolve_assembler import assemble_timeline, AssemblyError


class TestAssembleTimeline:

    def test_assembly_with_mock(self, mock_resolve_api, temp_video_file):
        """Full assembly path against mock Resolve."""
        mock_resolve_api.create_project("AssemblerTest")

        # Create a simple EDL
        edl = EDL()
        edl.add(EDLEntry(str(temp_video_file), 0, 10, score=8, reason="Opening"))
        edl.add(EDLEntry(str(temp_video_file), 20, 30, score=7, reason="Middle"))

        result = assemble_timeline(
            mock_resolve_api, edl,
            project_name="TestProject",
            timeline_name="TestTimeline",
        )

        assert result.clips_added == 2
        assert result.clips_failed == 0
        assert result.project_name == "TestProject"
        assert result.timeline_name == "TestTimeline"
        assert result.elapsed_seconds > 0

    def test_assembly_with_title_cards(self, mock_resolve_api, temp_video_file):
        mock_resolve_api.create_project("TitleTest")
        edl = EDL()
        edl.add(EDLEntry(str(temp_video_file), 5, 15, score=9, reason="Main"))

        result = assemble_timeline(
            mock_resolve_api, edl,
            project_name="TitleProject",
            timeline_name="TitleTimeline",
            intro_title="Welcome",
            outro_title="The End",
        )
        assert result.clips_added >= 1

    def test_assembly_raises_when_not_connected(self):
        from src.resolve_api import ResolveAPI
        api = ResolveAPI()
        edl = EDL()
        edl.add(EDLEntry("/fake.mp4", 0, 10))

        with pytest.raises(AssemblyError, match="not connected"):
            assemble_timeline(api, edl)

    def test_result_to_dict(self, mock_resolve_api, temp_video_file):
        mock_resolve_api.create_project("DictTest")
        edl = EDL()
        edl.add(EDLEntry(str(temp_video_file), 0, 10, score=8))

        result = assemble_timeline(mock_resolve_api, edl, project_name="DictProject", timeline_name="DictTL")
        d = result.to_dict()
        assert "project_name" in d
        assert "clips_added" in d
        assert "success" in d
