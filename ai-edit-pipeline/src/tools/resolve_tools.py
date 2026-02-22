"""MCP-callable tools for DaVinci Resolve operations.

Each function is registered as an MCP tool that Claude can invoke.
All Resolve interactions go through resolve_api.py -- never directly.
"""

from __future__ import annotations

import time
from mcp.server.fastmcp import FastMCP

from src.resolve_api import ResolveAPI, ResolveAPIError
from src.utils.logging_config import get_logger

log = get_logger("tools.resolve")

# Singleton Resolve API instance shared across all tool calls
_resolve_api: ResolveAPI | None = None


def _get_api() -> ResolveAPI:
    """Get or create the shared ResolveAPI instance."""
    global _resolve_api
    if _resolve_api is None or not _resolve_api.is_connected:
        _resolve_api = ResolveAPI()
        _resolve_api.connect()
    return _resolve_api


def register_resolve_tools(mcp: FastMCP) -> None:
    """Register all Resolve MCP tools with the FastMCP server."""

    @mcp.tool()
    def import_footage(file_path: str) -> dict:
        """Import a video file into the DaVinci Resolve media pool.

        Args:
            file_path: Absolute path to the video file to import.

        Returns:
            Dict with clip info: {id, name, path, duration_frames}.
        """
        start = time.time()
        api = _get_api()
        result = api.import_footage(file_path)
        log.info("MCP import_footage: %s -> %s (%.2fs)", file_path, result["id"], time.time() - start)
        return result

    @mcp.tool()
    def create_timeline(name: str) -> dict:
        """Create a new empty timeline in the current DaVinci Resolve project.

        Args:
            name: Name for the new timeline.

        Returns:
            Dict with {name, status}.
        """
        start = time.time()
        api = _get_api()
        tl_name = api.create_timeline(name)
        log.info("MCP create_timeline: '%s' (%.2fs)", tl_name, time.time() - start)
        return {"name": tl_name, "status": "created"}

    @mcp.tool()
    def add_clip(clip_id: str, in_tc: str = "", out_tc: str = "") -> dict:
        """Append a clip segment to the active timeline using SMPTE timecodes.

        Args:
            clip_id: The media pool clip ID (returned by import_footage).
            in_tc: Optional SMPTE in-point (e.g., '00:01:30:00'). Empty string for start.
            out_tc: Optional SMPTE out-point. Empty string for end.

        Returns:
            Dict with {clip_id, in_tc, out_tc, success}.
        """
        start = time.time()
        api = _get_api()
        success = api.append_to_timeline(
            clip_id,
            in_tc=in_tc if in_tc else None,
            out_tc=out_tc if out_tc else None,
        )
        log.info("MCP add_clip: %s [%s - %s] success=%s (%.2fs)",
                 clip_id, in_tc or "start", out_tc or "end", success, time.time() - start)
        return {"clip_id": clip_id, "in_tc": in_tc, "out_tc": out_tc, "success": success}

    @mcp.tool()
    def add_title_card(text: str, position: str = "start") -> dict:
        """Insert a text title card at the given timeline position.

        Args:
            text: The title text to display.
            position: Where to insert -- 'start', 'end', or a SMPTE timecode.

        Returns:
            Dict with {text, position, success}.
        """
        start = time.time()
        api = _get_api()
        success = api.add_title_card(text, position=position)
        log.info("MCP add_title_card: '%s' at %s success=%s (%.2fs)",
                 text[:40], position, success, time.time() - start)
        return {"text": text, "position": position, "success": success}

    @mcp.tool()
    def export_timeline(output_path: str, format: str = "H.264") -> dict:
        """Render and export the current timeline to a video file.

        Args:
            output_path: Full file path for the exported video (e.g., 'C:/output/edit.mp4').
            format: Export format -- 'H.264', 'H.265', 'ProRes', or 'DNxHR'.

        Returns:
            Dict with {output_path, format, status, duration_seconds}.
        """
        start = time.time()
        api = _get_api()
        result = api.export_timeline(output_path, format=format)
        log.info("MCP export_timeline: %s format=%s (%.2fs)", output_path, format, time.time() - start)
        return result

    @mcp.tool()
    def get_timeline_duration() -> dict:
        """Return the current timeline duration in seconds and SMPTE timecode.

        Returns:
            Dict with {frames, seconds, smpte, fps}.
        """
        api = _get_api()
        result = api.get_timeline_duration()
        log.info("MCP get_timeline_duration: %s", result["smpte"])
        return result

    @mcp.tool()
    def list_media_pool() -> list[dict]:
        """Return all clips currently in the DaVinci Resolve media pool.

        Returns:
            List of dicts: [{id, name, path, duration_frames}, ...].
        """
        api = _get_api()
        clips = api.list_media_pool()
        log.info("MCP list_media_pool: %d clips", len(clips))
        return clips

    @mcp.tool()
    def load_project(name: str) -> dict:
        """Open an existing DaVinci Resolve project by name.

        Args:
            name: The project name to open.

        Returns:
            Dict with {name, status}.
        """
        start = time.time()
        api = _get_api()
        proj_name = api.load_project(name)
        log.info("MCP load_project: '%s' (%.2fs)", proj_name, time.time() - start)
        return {"name": proj_name, "status": "loaded"}

    @mcp.tool()
    def save_project() -> dict:
        """Save the current DaVinci Resolve project.

        Returns:
            Dict with {success, project_name}.
        """
        api = _get_api()
        success = api.save_project()
        name = api.get_current_project_name()
        log.info("MCP save_project: '%s' success=%s", name, success)
        return {"success": success, "project_name": name}
