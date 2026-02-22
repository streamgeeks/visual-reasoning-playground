"""Resolve Assembler — executes an EDL against DaVinci Resolve.

Takes a generated EDL and drives the Resolve API to:
1. Import all source clips to the media pool
2. Create a new timeline
3. Append clips in chronological order with in/out points
4. Optionally add intro/outro title cards
5. Return the project path for further refinement
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from src.resolve_api import ResolveAPI, ResolveAPIError
from src.edit_engine.edl_generator import EDL, EDLEntry
from src.utils.logging_config import get_logger

log = get_logger("edit_engine.assembler")


class AssemblyError(Exception):
    """Raised when timeline assembly fails."""


class AssemblyResult:
    """Result of a timeline assembly operation."""

    def __init__(
        self,
        project_name: str,
        timeline_name: str,
        clips_added: int,
        clips_failed: int,
        total_duration: float,
        elapsed_seconds: float,
    ):
        self.project_name = project_name
        self.timeline_name = timeline_name
        self.clips_added = clips_added
        self.clips_failed = clips_failed
        self.total_duration = total_duration
        self.elapsed_seconds = elapsed_seconds

    def to_dict(self) -> dict:
        return {
            "project_name": self.project_name,
            "timeline_name": self.timeline_name,
            "clips_added": self.clips_added,
            "clips_failed": self.clips_failed,
            "total_duration": self.total_duration,
            "elapsed_seconds": round(self.elapsed_seconds, 2),
            "success": self.clips_failed == 0,
        }


def assemble_timeline(
    api: ResolveAPI,
    edl: EDL,
    project_name: str = "AI Edit",
    timeline_name: str = "AI Generated Timeline",
    intro_title: str | None = None,
    outro_title: str | None = None,
) -> AssemblyResult:
    """Execute an EDL against DaVinci Resolve to build a timeline.

    Args:
        api: A connected ResolveAPI instance.
        edl: The Edit Decision List to assemble.
        project_name: Name for the Resolve project.
        timeline_name: Name for the timeline.
        intro_title: Optional text for an intro title card.
        outro_title: Optional text for an outro title card.

    Returns:
        AssemblyResult with assembly status and metadata.
    """
    start = time.time()
    clips_added = 0
    clips_failed = 0

    if not api.is_connected:
        raise AssemblyError("ResolveAPI is not connected. Call api.connect() first.")

    log.info("Starting timeline assembly: project='%s' timeline='%s' clips=%d",
             project_name, timeline_name, edl.clip_count)

    # Step 1: Create project (or use existing)
    try:
        api.create_project(project_name)
        log.info("Created project '%s'", project_name)
    except ResolveAPIError:
        # Project may already exist, try loading it
        try:
            api.load_project(project_name)
            log.info("Loaded existing project '%s'", project_name)
        except ResolveAPIError as e:
            raise AssemblyError(f"Cannot create or load project '{project_name}': {e}") from e

    # Step 2: Import all unique source clips
    clip_id_map: dict[str, str] = {}  # path -> clip_id
    unique_paths = set(entry.clip_path for entry in edl.entries)

    for clip_path in unique_paths:
        try:
            clip_info = api.import_footage(clip_path)
            clip_id_map[clip_path] = clip_info["id"]
            log.info("Imported '%s' -> %s", Path(clip_path).name, clip_info["id"])
        except ResolveAPIError as e:
            log.error("Failed to import '%s': %s", clip_path, e)
            clips_failed += len([e for e in edl.entries if e.clip_path == clip_path])

    # Step 3: Create timeline
    try:
        api.create_timeline(timeline_name)
        log.info("Created timeline '%s'", timeline_name)
    except ResolveAPIError as e:
        raise AssemblyError(f"Cannot create timeline '{timeline_name}': {e}") from e

    # Step 4: Add intro title card if requested
    if intro_title:
        try:
            api.add_title_card(intro_title, position="start", duration_seconds=5.0)
            log.info("Added intro title: '%s'", intro_title[:40])
        except ResolveAPIError as e:
            log.warning("Intro title failed: %s", e)

    # Step 5: Append clips in EDL order
    for i, entry in enumerate(edl.entries):
        clip_id = clip_id_map.get(entry.clip_path)
        if not clip_id:
            log.warning("Skipping clip %d: no clip_id for '%s'", i, entry.clip_path)
            clips_failed += 1
            continue

        try:
            success = api.append_to_timeline(
                clip_id,
                in_tc=entry.in_tc,
                out_tc=entry.out_tc,
            )
            if success:
                clips_added += 1
                log.info("  Clip %d/%d: %s [%s - %s] (score %.1f)",
                         i + 1, edl.clip_count, Path(entry.clip_path).name,
                         entry.in_tc, entry.out_tc, entry.score)
            else:
                clips_failed += 1
                log.warning("  Clip %d/%d: append returned False", i + 1, edl.clip_count)
        except ResolveAPIError as e:
            clips_failed += 1
            log.error("  Clip %d/%d failed: %s", i + 1, edl.clip_count, e)

    # Step 6: Add outro title card if requested
    if outro_title:
        try:
            api.add_title_card(outro_title, position="end", duration_seconds=5.0)
            log.info("Added outro title: '%s'", outro_title[:40])
        except ResolveAPIError as e:
            log.warning("Outro title failed: %s", e)

    # Step 7: Save project
    try:
        api.save_project()
    except ResolveAPIError:
        log.warning("Could not save project after assembly")

    elapsed = time.time() - start

    # Get actual duration from timeline
    try:
        dur_info = api.get_timeline_duration()
        actual_duration = dur_info["seconds"]
    except ResolveAPIError:
        actual_duration = edl.total_duration

    result = AssemblyResult(
        project_name=project_name,
        timeline_name=timeline_name,
        clips_added=clips_added,
        clips_failed=clips_failed,
        total_duration=actual_duration,
        elapsed_seconds=elapsed,
    )

    log.info(
        "Assembly complete: %d added, %d failed, %.1fs duration (%.1fs elapsed)",
        clips_added, clips_failed, actual_duration, elapsed,
    )
    return result
