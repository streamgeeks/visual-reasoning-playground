"""Multi-camera awareness for the AI edit pipeline.

When multiple PTZ cameras record simultaneously, this module correlates
clips by timestamp so the pipeline can choose the best angle per moment.
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any
from datetime import datetime

from src.utils.logging_config import get_logger

log = get_logger("ingest.multi_camera")

# Maximum time difference (seconds) between clips to consider them "simultaneous"
DEFAULT_SYNC_TOLERANCE = 5.0


class CameraClip:
    """A single clip from one camera."""

    def __init__(
        self,
        path: str,
        camera_id: str = "",
        created_at: float | None = None,
        duration_seconds: float = 0.0,
    ):
        self.path = path
        self.filename = Path(path).name
        self.camera_id = camera_id or self._infer_camera_id()
        self.created_at = created_at or self._get_file_creation_time()
        self.duration_seconds = duration_seconds

    def _infer_camera_id(self) -> str:
        """Try to infer camera ID from filename (e.g., 'cam1_clip001.mp4' -> 'cam1')."""
        name = Path(self.path).stem.lower()
        for prefix in ["cam", "camera", "ptz"]:
            if prefix in name:
                parts = name.split("_")
                for part in parts:
                    if part.startswith(prefix):
                        return part
        return "camera_unknown"

    def _get_file_creation_time(self) -> float:
        """Get file creation time (or modification time as fallback)."""
        try:
            p = Path(self.path)
            if p.exists():
                stat = p.stat()
                # On Windows, st_ctime is creation time; on Unix it's metadata change time
                return min(stat.st_ctime, stat.st_mtime)
        except OSError:
            pass
        return time.time()

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "filename": self.filename,
            "camera_id": self.camera_id,
            "created_at": self.created_at,
            "created_at_iso": datetime.fromtimestamp(self.created_at).isoformat(),
            "duration_seconds": self.duration_seconds,
        }


class SyncGroup:
    """A group of clips from different cameras that overlap in time."""

    def __init__(self, clips: list[CameraClip] | None = None):
        self.clips: list[CameraClip] = clips or []

    @property
    def camera_count(self) -> int:
        return len(set(c.camera_id for c in self.clips))

    @property
    def camera_ids(self) -> list[str]:
        return sorted(set(c.camera_id for c in self.clips))

    @property
    def start_time(self) -> float:
        if not self.clips:
            return 0.0
        return min(c.created_at for c in self.clips)

    def add(self, clip: CameraClip) -> None:
        self.clips.append(clip)

    def get_clip_for_camera(self, camera_id: str) -> CameraClip | None:
        for c in self.clips:
            if c.camera_id == camera_id:
                return c
        return None

    def to_dict(self) -> dict:
        return {
            "camera_count": self.camera_count,
            "camera_ids": self.camera_ids,
            "start_time": self.start_time,
            "start_time_iso": datetime.fromtimestamp(self.start_time).isoformat() if self.clips else "",
            "clips": [c.to_dict() for c in self.clips],
        }


def group_clips_by_time(
    clip_paths: list[str],
    sync_tolerance: float = DEFAULT_SYNC_TOLERANCE,
) -> list[SyncGroup]:
    """Group clips from multiple cameras by their creation timestamps.

    Clips created within `sync_tolerance` seconds of each other are grouped
    together as simultaneous recordings from different angles.

    Args:
        clip_paths: List of video file paths.
        sync_tolerance: Maximum time difference in seconds to consider clips simultaneous.

    Returns:
        List of SyncGroups, each containing clips from different cameras
        that were recording at the same time.
    """
    # Create CameraClip objects and sort by creation time
    clips = [CameraClip(path=p) for p in clip_paths]
    clips.sort(key=lambda c: c.created_at)

    groups: list[SyncGroup] = []
    for clip in clips:
        # Try to add to an existing group
        added = False
        for group in groups:
            # Check if this clip's timestamp is within tolerance of the group's start
            if abs(clip.created_at - group.start_time) <= sync_tolerance:
                # Check we don't already have this camera in the group
                if clip.camera_id not in group.camera_ids:
                    group.add(clip)
                    added = True
                    break

        if not added:
            new_group = SyncGroup()
            new_group.add(clip)
            groups.append(new_group)

    multi_cam_groups = [g for g in groups if g.camera_count > 1]
    single_cam_groups = [g for g in groups if g.camera_count == 1]

    log.info(
        "Grouped %d clips into %d sync groups (%d multi-cam, %d single-cam)",
        len(clips), len(groups), len(multi_cam_groups), len(single_cam_groups),
    )
    return groups


def find_best_angle(
    sync_group: SyncGroup,
    moment_seconds: float,
    scored_frames: dict[str, list[dict]] | None = None,
) -> CameraClip | None:
    """Given a sync group and a moment timecode, find the best camera angle.

    If scored_frames is provided (camera_id -> [{seconds, score}]),
    pick the camera with the highest score at the given moment.
    Otherwise, return the first clip.

    Args:
        sync_group: Group of simultaneous clips.
        moment_seconds: The moment to evaluate (seconds into the recording).
        scored_frames: Optional per-camera scoring data.

    Returns:
        The CameraClip representing the best angle, or None.
    """
    if not sync_group.clips:
        return None

    if scored_frames is None:
        return sync_group.clips[0]

    best_clip = None
    best_score = -1.0

    for clip in sync_group.clips:
        camera_scores = scored_frames.get(clip.camera_id, [])
        # Find the closest scored frame to the requested moment
        closest_score = 0.0
        closest_dist = float("inf")
        for frame in camera_scores:
            dist = abs(frame.get("seconds", 0) - moment_seconds)
            if dist < closest_dist:
                closest_dist = dist
                closest_score = frame.get("score", 0)

        if closest_score > best_score:
            best_score = closest_score
            best_clip = clip

    if best_clip:
        log.info("Best angle at %.1fs: %s (score=%.1f)", moment_seconds, best_clip.camera_id, best_score)
    return best_clip
