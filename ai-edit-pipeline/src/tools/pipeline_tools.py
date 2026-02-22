"""MCP-callable end-to-end pipeline and refinement tools.

These are the high-level tools that wire the full workflow:
- Full auto-edit pipeline (footage in -> Resolve timeline out)
- Conversational refinement (shorten, lengthen, remove, replace, add title)
- Session and ingest management (Phase 4)
"""

from __future__ import annotations

import time
from pathlib import Path
from mcp.server.fastmcp import FastMCP

from src.utils.logging_config import get_logger

log = get_logger("tools.pipeline")


def register_pipeline_tools(mcp: FastMCP) -> None:
    """Register end-to-end pipeline and refinement MCP tools."""

    @mcp.tool()
    def auto_edit(
        clip_path: str,
        target_duration: float = 90.0,
        scoring_context: str = "",
        project_name: str = "AI Edit",
        timeline_name: str = "AI Generated Timeline",
        intro_title: str = "",
        outro_title: str = "",
        sample_rate: float = 5.0,
    ) -> dict:
        """Full end-to-end AI edit pipeline: footage in, Resolve timeline out.

        Given a video file, this tool:
        1. Extracts keyframes at the given sample rate
        2. Scores each frame with Visual Reasoning AI
        3. Generates an Edit Decision List targeting the desired duration
        4. Assembles the timeline in DaVinci Resolve with optional title cards

        Args:
            clip_path: Path to the video file to edit.
            target_duration: Target edit duration in seconds (default: 90).
            scoring_context: What to look for (e.g., 'sports highlights focusing on goals and celebrations').
            project_name: DaVinci Resolve project name.
            timeline_name: Timeline name in Resolve.
            intro_title: Optional intro title card text.
            outro_title: Optional outro title card text.
            sample_rate: Seconds between sampled frames (default: 5).

        Returns:
            Dict with full pipeline result including EDL, assembly status, and scoring summary.
        """
        from src.vision.moondream_client import MoondreamClient
        from src.vision.moment_scorer import score_video
        from src.edit_engine.edl_generator import generate_edl
        from src.edit_engine.resolve_assembler import assemble_timeline
        from src.resolve_api import ResolveAPI

        start = time.time()
        log.info("Starting auto_edit pipeline: clip=%s target=%.1fs", clip_path, target_duration)

        # Step 1-2: Score the video
        client = MoondreamClient()
        scoring = score_video(
            clip_path, client,
            interval_seconds=sample_rate,
            scoring_prompt=scoring_context,
        )
        client.close()

        # Step 3: Generate EDL
        edl = generate_edl(
            scored_moments=[m.to_dict() for m in scoring.moments],
            clip_path=clip_path,
            target_seconds=target_duration,
            clip_duration_seconds=scoring.clip_duration,
        )

        # Step 4: Assemble in Resolve
        api = ResolveAPI()
        try:
            api.connect()
            assembly = assemble_timeline(
                api, edl,
                project_name=project_name,
                timeline_name=timeline_name,
                intro_title=intro_title or None,
                outro_title=outro_title or None,
            )
            assembly_result = assembly.to_dict()
        except Exception as e:
            log.error("Assembly failed: %s", e)
            assembly_result = {"error": str(e), "success": False}

        elapsed = time.time() - start
        log.info("auto_edit complete in %.1fs", elapsed)

        return {
            "scoring_summary": scoring.to_summary(),
            "edl": edl.to_dict_list(),
            "edl_duration": edl.total_duration,
            "edl_clip_count": edl.clip_count,
            "assembly": assembly_result,
            "elapsed_seconds": round(elapsed, 2),
        }

    @mcp.tool()
    def refine_shorten(reduce_seconds: float, edl_json: list[dict]) -> dict:
        """Make the current edit shorter by removing the weakest clips.

        Args:
            reduce_seconds: How many seconds to cut from the edit.
            edl_json: The current EDL as a list of clip dicts.

        Returns:
            Updated EDL with reduced duration.
        """
        from src.edit_engine.edl_generator import EDL, EDLEntry
        from src.edit_engine.refinement import shorten_edit

        edl = _rebuild_edl(edl_json)
        original = edl.total_duration
        shorten_edit(edl, reduce_seconds)
        log.info("Refined (shorten): %.1fs -> %.1fs", original, edl.total_duration)

        return {
            "edl": edl.to_dict_list(),
            "total_duration": edl.total_duration,
            "clip_count": edl.clip_count,
            "removed_seconds": round(original - edl.total_duration, 2),
        }

    @mcp.tool()
    def refine_remove_weakest(count: int, edl_json: list[dict]) -> dict:
        """Remove the N weakest clips from the edit.

        Args:
            count: Number of clips to remove.
            edl_json: The current EDL as a list of clip dicts.

        Returns:
            Updated EDL with clips removed, plus details of what was removed.
        """
        from src.edit_engine.edl_generator import EDL
        from src.edit_engine.refinement import remove_weakest_clips

        edl = _rebuild_edl(edl_json)
        removed = remove_weakest_clips(edl, count)

        return {
            "edl": edl.to_dict_list(),
            "total_duration": edl.total_duration,
            "clip_count": edl.clip_count,
            "removed": removed,
        }

    @mcp.tool()
    def refine_add_title(text: str, position: str = "start", edl_json: list[dict] = []) -> dict:
        """Add a title card to the edit.

        Args:
            text: Title text to display.
            position: 'start' or 'end'.
            edl_json: The current EDL as a list of clip dicts.

        Returns:
            Updated EDL with title added.
        """
        from src.edit_engine.refinement import add_title

        edl = _rebuild_edl(edl_json)
        title_info = add_title(edl, text, position)

        return {
            "edl": edl.to_dict_list(),
            "total_duration": edl.total_duration,
            "clip_count": edl.clip_count,
            "added_title": title_info,
        }

    @mcp.tool()
    def reassemble_edl(
        edl_json: list[dict],
        project_name: str = "AI Edit",
        timeline_name: str = "AI Refined Timeline",
    ) -> dict:
        """Re-assemble a modified EDL into DaVinci Resolve.

        Use this after refine_shorten, refine_remove_weakest, or refine_add_title
        to apply the changes to a new Resolve timeline.

        Args:
            edl_json: The refined EDL as a list of clip dicts.
            project_name: DaVinci Resolve project name.
            timeline_name: Timeline name for the refined edit.

        Returns:
            Assembly result with status and metadata.
        """
        from src.edit_engine.edl_generator import EDL
        from src.edit_engine.resolve_assembler import assemble_timeline
        from src.resolve_api import ResolveAPI

        edl = _rebuild_edl(edl_json)

        api = ResolveAPI()
        try:
            api.connect()
            result = assemble_timeline(api, edl, project_name=project_name, timeline_name=timeline_name)
            return result.to_dict()
        except Exception as e:
            log.error("Reassembly failed: %s", e)
            return {"error": str(e), "success": False}


def _rebuild_edl(edl_json: list[dict]):
    """Reconstruct an EDL object from a JSON dict list."""
    from src.edit_engine.edl_generator import EDL, EDLEntry
    entries = []
    for item in edl_json:
        entries.append(EDLEntry(
            clip_path=item.get("clip_path", ""),
            in_seconds=item.get("in_seconds", 0),
            out_seconds=item.get("out_seconds", 0),
            score=item.get("score", 0),
            reason=item.get("reason", ""),
            tags=item.get("tags", []),
        ))
    return EDL(entries)
