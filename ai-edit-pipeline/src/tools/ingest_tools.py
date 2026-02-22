"""MCP-callable tools for file watching, session management, and multi-camera.

Phase 4 tools that close the loop from camera to cut.
"""

from __future__ import annotations

import time
from pathlib import Path
from mcp.server.fastmcp import FastMCP

from src.utils.logging_config import get_logger

log = get_logger("tools.ingest")

# Module-level state for the file watcher and session manager
_watcher_state = None
_session_manager = None


def _get_session_manager():
    global _session_manager
    if _session_manager is None:
        from src.ingest.session_manager import SessionManager
        _session_manager = SessionManager()
    return _session_manager


def register_ingest_tools(mcp: FastMCP) -> None:
    """Register all ingest / Phase 4 MCP tools."""

    @mcp.tool()
    def watch_directory(path: str, auto_edit_idle_minutes: float = 5.0) -> dict:
        """Start watching a directory for new video files from PTZ cameras.

        When new files appear, they are auto-ingested and assigned to a session.
        If no new files arrive for `auto_edit_idle_minutes`, an auto-edit can
        be triggered.

        Args:
            path: Directory path to watch (e.g., a NAS mount or local folder).
            auto_edit_idle_minutes: Minutes of inactivity before auto-edit trigger (0 = disabled).

        Returns:
            Dict with {watching, path, existing_files}.
        """
        from src.ingest.file_watcher import watch_directory as _watch, scan_directory

        global _watcher_state
        watch_path = Path(path)

        existing = scan_directory(watch_path)
        sm = _get_session_manager()

        def on_new_file(file_path: str):
            log.info("Auto-ingest: %s", Path(file_path).name)
            sm.auto_assign_clip(file_path)

        def on_idle():
            log.info("Auto-edit idle trigger fired (no new files for %.0f min)", auto_edit_idle_minutes)

        idle_seconds = auto_edit_idle_minutes * 60 if auto_edit_idle_minutes > 0 else 0

        _watcher_state = _watch(
            directory=watch_path,
            on_new_file=on_new_file,
            on_idle_trigger=on_idle if idle_seconds > 0 else None,
            idle_trigger_seconds=idle_seconds if idle_seconds > 0 else 300,
        )

        log.info("MCP watch_directory: watching %s (%d existing files)", watch_path, len(existing))
        return {
            "watching": True,
            "path": str(watch_path),
            "existing_files": len(existing),
        }

    @mcp.tool()
    def stop_watching() -> dict:
        """Stop the directory file watcher."""
        global _watcher_state
        if _watcher_state and _watcher_state.running:
            _watcher_state.running = False
            log.info("MCP stop_watching: file watcher stopped")
            return {"stopped": True, "ingested_count": _watcher_state.ingested_count}
        return {"stopped": False, "reason": "No watcher running"}

    @mcp.tool()
    def create_session(name: str) -> dict:
        """Create a named recording session to group clips.

        Args:
            name: Session name (e.g., 'Sunday morning service', 'Game 4 — U12 soccer').

        Returns:
            Session info dict.
        """
        sm = _get_session_manager()
        session = sm.create_session(name)
        log.info("MCP create_session: '%s'", name)
        return session.to_dict()

    @mcp.tool()
    def add_clip_to_session(session_name: str, clip_path: str) -> dict:
        """Add a video clip to a named session.

        Args:
            session_name: The session to add to (created if it doesn't exist).
            clip_path: Path to the video file.

        Returns:
            Updated session info.
        """
        sm = _get_session_manager()
        session = sm.add_clip_to_session(session_name, clip_path)
        log.info("MCP add_clip_to_session: '%s' -> '%s'", Path(clip_path).name, session_name)
        return session.to_dict()

    @mcp.tool()
    def list_sessions() -> list[dict]:
        """List all recording sessions.

        Returns:
            List of session info dicts.
        """
        sm = _get_session_manager()
        sessions = sm.list_sessions()
        log.info("MCP list_sessions: %d sessions", len(sessions))
        return sessions

    @mcp.tool()
    def get_session_clips(session_name: str) -> dict:
        """Return all clips associated with a named recording session.

        Args:
            session_name: The session name.

        Returns:
            Dict with {session_name, clips, clip_count}.
        """
        sm = _get_session_manager()
        clips = sm.get_session_clips(session_name)
        log.info("MCP get_session_clips: '%s' has %d clips", session_name, len(clips))
        return {
            "session_name": session_name,
            "clips": clips,
            "clip_count": len(clips),
        }

    @mcp.tool()
    def group_multi_camera_clips(clip_paths: list[str], sync_tolerance_seconds: float = 5.0) -> list[dict]:
        """Group clips from multiple cameras by timestamp for multi-angle editing.

        Clips created within `sync_tolerance_seconds` of each other are grouped
        as simultaneous recordings from different angles.

        Args:
            clip_paths: List of video file paths from multiple cameras.
            sync_tolerance_seconds: Maximum time difference to consider clips simultaneous.

        Returns:
            List of sync groups, each with camera info and clip paths.
        """
        from src.ingest.multi_camera import group_clips_by_time

        groups = group_clips_by_time(clip_paths, sync_tolerance=sync_tolerance_seconds)
        log.info("MCP group_multi_camera_clips: %d paths -> %d sync groups", len(clip_paths), len(groups))
        return [g.to_dict() for g in groups]
