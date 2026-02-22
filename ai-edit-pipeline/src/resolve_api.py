"""DaVinci Resolve Python API abstraction layer.

This is the SINGLE abstraction layer between the pipeline and DaVinci Resolve.
MCP tools and all other code MUST use this module -- never import
DaVinciResolveScript or call Resolve objects directly.

Every method:
    - Logs its call and result via the pipeline logger
    - Returns Python-native types (dicts, lists, strings) -- never raw Resolve objects
    - Uses pathlib.Path for all file paths
    - Handles errors gracefully with descriptive exceptions
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Optional

from src.resolve_connection import ResolveConnectionError, connect_to_resolve
from src.utils.logging_config import get_logger
from src.utils.paths import normalize_video_path
from src.utils.timecode import Timecode, seconds_to_smpte

log = get_logger("resolve_api")


class ResolveAPIError(Exception):
    """Raised when a Resolve API call fails."""


class ResolveAPI:
    """High-level abstraction over the DaVinci Resolve scripting API.

    Usage:
        api = ResolveAPI()
        api.connect()
        project_id = api.create_project("My Project")
        clip_id = api.import_footage(Path("/path/to/video.mp4"))
        api.create_timeline("Main Timeline")
        api.append_to_timeline(clip_id)
        api.export_timeline(Path("/output/edit.mp4"), format="H.264")
    """

    def __init__(self) -> None:
        self._resolve: Any = None
        self._project: Any = None
        self._media_pool: Any = None
        self._timeline: Any = None

    # ──────────────────────────────────────────────
    #  Connection
    # ──────────────────────────────────────────────

    @property
    def is_connected(self) -> bool:
        """Check if we have a live connection to Resolve."""
        return self._resolve is not None

    def connect(self) -> bool:
        """Connect to a running DaVinci Resolve instance.

        Returns True on success. Raises ResolveConnectionError on failure.
        """
        start = time.time()
        self._resolve = connect_to_resolve()
        elapsed = time.time() - start

        # Cache the current project and media pool if a project is open
        pm = self._resolve.GetProjectManager()
        self._project = pm.GetCurrentProject() if pm else None
        if self._project:
            self._media_pool = self._project.GetMediaPool()
            self._timeline = self._project.GetCurrentTimeline()

        log.info(
            "Connected to Resolve in %.2fs | project=%s | timeline=%s",
            elapsed,
            self._project.GetName() if self._project else "None",
            self._timeline.GetName() if self._timeline else "None",
        )
        return True

    def _require_connection(self) -> None:
        if not self.is_connected:
            raise ResolveAPIError("Not connected to DaVinci Resolve. Call connect() first.")

    def _require_project(self) -> None:
        self._require_connection()
        if self._project is None:
            raise ResolveAPIError("No project is open in DaVinci Resolve.")

    def _require_timeline(self) -> None:
        self._require_project()
        if self._timeline is None:
            raise ResolveAPIError("No timeline is active. Create or load a timeline first.")

    # ──────────────────────────────────────────────
    #  Project Management
    # ──────────────────────────────────────────────

    def create_project(self, name: str) -> str:
        """Create a new Resolve project.

        Args:
            name: Project name (must be unique in the current database).

        Returns:
            The project name on success.

        Raises:
            ResolveAPIError: If project creation fails (e.g., name already exists).
        """
        self._require_connection()
        pm = self._resolve.GetProjectManager()

        start = time.time()
        project = pm.CreateProject(name)
        elapsed = time.time() - start

        if project is None:
            raise ResolveAPIError(
                f"Failed to create project '{name}'. "
                "A project with this name may already exist."
            )

        self._project = project
        self._media_pool = project.GetMediaPool()
        self._timeline = None

        log.info("Created project '%s' in %.2fs", name, elapsed)
        return name

    def load_project(self, name: str) -> str:
        """Load an existing Resolve project by name.

        Returns the project name on success.
        """
        self._require_connection()
        pm = self._resolve.GetProjectManager()

        start = time.time()
        project = pm.LoadProject(name)
        elapsed = time.time() - start

        if project is None:
            raise ResolveAPIError(f"Failed to load project '{name}'. Project may not exist.")

        self._project = project
        self._media_pool = project.GetMediaPool()
        self._timeline = project.GetCurrentTimeline()

        log.info("Loaded project '%s' in %.2fs", name, elapsed)
        return name

    def save_project(self) -> bool:
        """Save the current Resolve project.

        Returns True on success.
        """
        self._require_project()
        pm = self._resolve.GetProjectManager()

        start = time.time()
        result = pm.SaveProject()
        elapsed = time.time() - start

        log.info("Saved project '%s' in %.2fs | success=%s",
                 self._project.GetName(), elapsed, result)
        return bool(result)

    def get_project_list(self) -> list[str]:
        """Return a list of all project names in the current database."""
        self._require_connection()
        pm = self._resolve.GetProjectManager()
        projects = pm.GetProjectListInCurrentFolder() or []
        log.info("Listed %d projects", len(projects))
        return list(projects)

    def get_current_project_name(self) -> str | None:
        """Return the name of the currently open project, or None."""
        if self._project:
            return self._project.GetName()
        return None

    # ──────────────────────────────────────────────
    #  Media Pool
    # ──────────────────────────────────────────────

    def import_footage(self, file_path: str | Path) -> dict:
        """Import a video file into the DaVinci Resolve media pool.

        Args:
            file_path: Absolute or relative path to the video file.

        Returns:
            Dict with clip info: {id, name, path, duration_frames}.
        """
        self._require_project()
        path = normalize_video_path(str(file_path))

        if not path.exists():
            raise ResolveAPIError(f"File not found: {path}")

        ms = self._resolve.GetMediaStorage()
        start = time.time()
        clips = ms.AddItemListToMediaPool(str(path))
        elapsed = time.time() - start

        if not clips or len(clips) == 0:
            raise ResolveAPIError(f"Failed to import '{path}' to media pool.")

        clip = clips[0]
        clip_info = {
            "id": clip.GetMediaId(),
            "name": clip.GetName(),
            "path": str(path),
            "duration_frames": clip.GetClipProperty("Frames") or 0,
        }

        log.info("Imported '%s' in %.2fs | id=%s | frames=%s",
                 clip_info["name"], elapsed, clip_info["id"], clip_info["duration_frames"])
        return clip_info

    def list_media_pool(self) -> list[dict]:
        """Return all clips in the Resolve media pool.

        Returns a list of dicts: [{id, name, path, duration_frames}, ...]
        """
        self._require_project()

        def _walk_folder(folder: Any) -> list[dict]:
            items = []
            clips = folder.GetClipList() or []
            for clip in clips:
                items.append({
                    "id": clip.GetMediaId(),
                    "name": clip.GetName(),
                    "path": clip.GetClipProperty("File Path") or "",
                    "duration_frames": clip.GetClipProperty("Frames") or 0,
                })
            # Recurse into subfolders
            subfolders = folder.GetSubFolderList() or []
            for sub in subfolders:
                items.extend(_walk_folder(sub))
            return items

        root = self._media_pool.GetRootFolder()
        clips = _walk_folder(root)
        log.info("Listed %d clips in media pool", len(clips))
        return clips

    def get_media_pool_clip_by_name(self, name: str) -> Any:
        """Find a MediaPoolItem by name. Returns the raw Resolve object (internal use only)."""
        self._require_project()
        root = self._media_pool.GetRootFolder()
        return self._find_clip_in_folder(root, name)

    def _find_clip_in_folder(self, folder: Any, name: str) -> Any:
        clips = folder.GetClipList() or []
        for clip in clips:
            if clip.GetName() == name:
                return clip
        subfolders = folder.GetSubFolderList() or []
        for sub in subfolders:
            found = self._find_clip_in_folder(sub, name)
            if found:
                return found
        return None

    # ──────────────────────────────────────────────
    #  Timeline
    # ──────────────────────────────────────────────

    def create_timeline(self, name: str) -> str:
        """Create a new empty timeline in the current project.

        Returns the timeline name on success.
        """
        self._require_project()

        start = time.time()
        timeline = self._media_pool.CreateEmptyTimeline(name)
        elapsed = time.time() - start

        if timeline is None:
            raise ResolveAPIError(f"Failed to create timeline '{name}'.")

        self._project.SetCurrentTimeline(timeline)
        self._timeline = timeline

        log.info("Created timeline '%s' in %.2fs", name, elapsed)
        return name

    def append_to_timeline(
        self,
        clip_id: str,
        in_tc: str | None = None,
        out_tc: str | None = None,
    ) -> bool:
        """Append a clip (or clip segment) to the current timeline.

        Args:
            clip_id: The media pool clip ID (from import_footage).
            in_tc: Optional SMPTE in-point timecode (e.g., '00:01:30:00').
            out_tc: Optional SMPTE out-point timecode.

        Returns:
            True on success.
        """
        self._require_timeline()

        # Find the clip in the media pool by ID
        clip = self._find_clip_by_id(clip_id)
        if clip is None:
            raise ResolveAPIError(f"Clip with ID '{clip_id}' not found in media pool.")

        clip_info = {"mediaPoolItem": clip}
        if in_tc:
            clip_info["startFrame"] = Timecode.from_smpte(in_tc).to_frames()
        if out_tc:
            clip_info["endFrame"] = Timecode.from_smpte(out_tc).to_frames()

        start = time.time()
        result = self._media_pool.AppendToTimeline([clip_info])
        elapsed = time.time() - start

        success = result is not None and len(result) > 0
        log.info(
            "Appended clip '%s' to timeline | in=%s out=%s | success=%s | %.2fs",
            clip.GetName(), in_tc or "start", out_tc or "end", success, elapsed,
        )
        return success

    def _find_clip_by_id(self, clip_id: str) -> Any:
        """Find a MediaPoolItem by its media ID."""
        self._require_project()
        root = self._media_pool.GetRootFolder()
        return self._search_folder_by_id(root, clip_id)

    def _search_folder_by_id(self, folder: Any, clip_id: str) -> Any:
        clips = folder.GetClipList() or []
        for clip in clips:
            if clip.GetMediaId() == clip_id:
                return clip
        subfolders = folder.GetSubFolderList() or []
        for sub in subfolders:
            found = self._search_folder_by_id(sub, clip_id)
            if found:
                return found
        return None

    def get_timeline_duration(self) -> dict:
        """Return the current timeline's duration.

        Returns:
            Dict with keys: {frames, seconds, smpte}.
        """
        self._require_timeline()

        start_frame = self._timeline.GetStartFrame()
        end_frame = self._timeline.GetEndFrame()
        fps = float(self._timeline.GetSetting("timelineFrameRate") or 29.97)
        total_frames = end_frame - start_frame
        total_seconds = total_frames / fps
        smpte = seconds_to_smpte(total_seconds, fps)

        result = {
            "frames": total_frames,
            "seconds": round(total_seconds, 3),
            "smpte": smpte,
            "fps": fps,
        }
        log.info("Timeline duration: %s (%d frames, %.1fs)", smpte, total_frames, total_seconds)
        return result

    def get_timeline_name(self) -> str | None:
        """Return the name of the current timeline, or None."""
        if self._timeline:
            return self._timeline.GetName()
        return None

    # ──────────────────────────────────────────────
    #  Title Cards
    # ──────────────────────────────────────────────

    def add_title_card(self, text: str, position: str = "start", duration_seconds: float = 5.0) -> bool:
        """Insert a text title card into the current timeline.

        Args:
            text: The title text to display.
            position: Where to insert -- 'start', 'end', or a SMPTE timecode.
            duration_seconds: Duration of the title card in seconds.

        Returns:
            True on success.
        """
        self._require_timeline()
        fps = float(self._timeline.GetSetting("timelineFrameRate") or 29.97)
        duration_frames = round(duration_seconds * fps)

        # Use Resolve's built-in Fusion Title generator
        start = time.time()

        # Resolve's approach: create a Fusion Title clip in the media pool
        # then append it to the timeline. The exact API varies by version.
        try:
            # Try the generator approach (Resolve 18+)
            generators = self._project.GetToolkitList() if hasattr(self._project, "GetToolkitList") else None

            # Fallback: Create a Fusion composition title
            # Add a solid color generator as placeholder
            timeline_item_count = self._timeline.GetItemListInTrack("video", 1)
            if timeline_item_count is None:
                timeline_item_count = []

            # For now, create a Text+ Fusion title via timeline manipulation
            # This is version-dependent -- log what we attempt
            log.info(
                "Adding title card: text='%s' position=%s duration=%.1fs (%d frames)",
                text[:50], position, duration_seconds, duration_frames,
            )

            # The most reliable cross-version approach is to add a Fusion Title
            # generator from the media pool
            result = self._media_pool.AppendToTimeline([{
                "mediaType": 1,  # Generator
                "generatorType": "Fusion Title",
                "generatorName": text[:40],
                "duration": duration_frames,
            }])

            elapsed = time.time() - start
            success = result is not None and len(result) > 0
            log.info("Title card added in %.2fs | success=%s", elapsed, success)
            return success

        except (AttributeError, TypeError) as e:
            elapsed = time.time() - start
            log.warning("Title card insertion failed (%.2fs): %s", elapsed, e)
            log.info(
                "Title card creation may require manual addition. "
                "The Resolve Fusion Title API varies across versions."
            )
            return False

    # ──────────────────────────────────────────────
    #  Export / Render
    # ──────────────────────────────────────────────

    def export_timeline(
        self,
        output_path: str | Path,
        format: str = "H.264",
    ) -> dict:
        """Render and export the current timeline.

        Args:
            output_path: Full path for the output file (e.g., '/output/edit.mp4').
            format: Export format -- 'H.264', 'H.265', 'ProRes', 'DNxHR'.

        Returns:
            Dict with {output_path, format, status}.
        """
        self._require_timeline()
        out = normalize_video_path(str(output_path))
        out.parent.mkdir(parents=True, exist_ok=True)

        # Map format names to Resolve codec identifiers
        format_map = {
            "H.264": "H.264",
            "H.265": "H.265",
            "h264": "H.264",
            "h265": "H.265",
            "ProRes": "Apple ProRes",
            "prores": "Apple ProRes",
            "DNxHR": "DNxHR",
            "dnxhr": "DNxHR",
        }
        codec = format_map.get(format, format)

        start = time.time()

        # Configure render settings
        self._project.SetRenderSettings({
            "TargetDir": str(out.parent),
            "CustomName": out.stem,
            "FormatWidth": 1920,
            "FormatHeight": 1080,
        })

        # Set format/codec
        self._project.SetCurrentRenderFormatAndCodec(codec, codec)

        # Add render job
        job_id = self._project.AddRenderJob()
        if not job_id:
            raise ResolveAPIError(f"Failed to add render job for format '{format}'.")

        # Start rendering
        self._project.StartRendering(job_id)

        # Wait for render to complete (poll status)
        while self._project.IsRenderingInProgress():
            time.sleep(1)

        elapsed = time.time() - start
        status = self._project.GetRenderJobStatus(job_id)

        result = {
            "output_path": str(out),
            "format": codec,
            "status": status,
            "duration_seconds": round(elapsed, 1),
        }

        log.info("Export complete in %.1fs | path=%s | format=%s | status=%s",
                 elapsed, out, codec, status)
        return result

    # ──────────────────────────────────────────────
    #  Page Navigation
    # ──────────────────────────────────────────────

    def open_page(self, page: str) -> bool:
        """Switch to a specific Resolve page.

        Args:
            page: One of 'media', 'cut', 'edit', 'fusion', 'color', 'fairlight', 'deliver'.
        """
        self._require_connection()
        valid_pages = {"media", "cut", "edit", "fusion", "color", "fairlight", "deliver"}
        if page.lower() not in valid_pages:
            raise ResolveAPIError(f"Invalid page '{page}'. Must be one of: {valid_pages}")

        result = self._resolve.OpenPage(page.lower())
        log.info("Opened page '%s' | success=%s", page, result)
        return bool(result)

    # ──────────────────────────────────────────────
    #  Convenience / Info
    # ──────────────────────────────────────────────

    def get_resolve_version(self) -> str:
        """Return the DaVinci Resolve version string."""
        self._require_connection()
        # Resolve doesn't have a direct version API, but we can get it from the product name
        try:
            version = self._resolve.GetVersion()
            if version:
                return ".".join(str(v) for v in version) if isinstance(version, (list, tuple)) else str(version)
        except (AttributeError, TypeError):
            pass
        return "unknown"

    def get_current_page(self) -> str:
        """Return the currently displayed page name."""
        self._require_connection()
        return self._resolve.GetCurrentPage() or "unknown"
