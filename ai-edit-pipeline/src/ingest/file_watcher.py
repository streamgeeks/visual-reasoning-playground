"""File watcher service for auto-ingesting new video files.

Monitors a configurable directory for new video files from PTZ cameras.
On detection (after write completes), triggers the ingest pipeline.

Uses the `watchdog` library for cross-platform filesystem monitoring.
"""

from __future__ import annotations

import time
import threading
from pathlib import Path
from typing import Callable

from src.utils.logging_config import get_logger

log = get_logger("ingest.file_watcher")

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mxf", ".avi", ".mkv", ".ts", ".mts", ".m4v"}

# Debounce: wait this many seconds after last file modification before triggering
DEFAULT_DEBOUNCE_SECONDS = 5.0

# Auto-edit trigger: if no new files for this long, trigger auto-edit
DEFAULT_IDLE_TRIGGER_SECONDS = 300.0  # 5 minutes


class FileWatcherState:
    """Thread-safe state for the file watcher."""

    def __init__(self):
        self._lock = threading.Lock()
        self._pending_files: dict[str, float] = {}  # path -> last_modified_time
        self._ingested_files: set[str] = set()
        self._last_activity: float = 0.0
        self._running = False

    @property
    def running(self) -> bool:
        with self._lock:
            return self._running

    @running.setter
    def running(self, value: bool):
        with self._lock:
            self._running = value

    def add_pending(self, path: str) -> None:
        with self._lock:
            self._pending_files[path] = time.time()
            self._last_activity = time.time()

    def get_ready_files(self, debounce: float) -> list[str]:
        """Return files that haven't been modified for at least `debounce` seconds."""
        now = time.time()
        ready = []
        with self._lock:
            for path, last_mod in list(self._pending_files.items()):
                if now - last_mod >= debounce and path not in self._ingested_files:
                    ready.append(path)
        return ready

    def mark_ingested(self, path: str) -> None:
        with self._lock:
            self._ingested_files.add(path)
            self._pending_files.pop(path, None)

    def seconds_since_activity(self) -> float:
        with self._lock:
            if self._last_activity == 0:
                return 0.0
            return time.time() - self._last_activity

    @property
    def pending_count(self) -> int:
        with self._lock:
            return len(self._pending_files)

    @property
    def ingested_count(self) -> int:
        with self._lock:
            return len(self._ingested_files)


def is_video_file(path: str | Path) -> bool:
    """Check if a file path has a recognized video extension."""
    return Path(path).suffix.lower() in VIDEO_EXTENSIONS


def scan_directory(directory: str | Path) -> list[Path]:
    """Scan a directory for existing video files (non-recursive)."""
    d = Path(directory)
    if not d.exists():
        return []
    return sorted(p for p in d.iterdir() if p.is_file() and is_video_file(p))


def watch_directory(
    directory: str | Path,
    on_new_file: Callable[[str], None],
    debounce_seconds: float = DEFAULT_DEBOUNCE_SECONDS,
    idle_trigger_seconds: float = DEFAULT_IDLE_TRIGGER_SECONDS,
    on_idle_trigger: Callable[[], None] | None = None,
    poll_interval: float = 2.0,
) -> FileWatcherState:
    """Start watching a directory for new video files.

    Uses polling (not watchdog) for simplicity and cross-platform reliability.
    Returns immediately; watching happens in a background thread.

    Args:
        directory: Directory to watch.
        on_new_file: Callback invoked with the file path when a new video is ready.
        debounce_seconds: Wait this long after last modification before triggering.
        idle_trigger_seconds: If no new files for this long, fire on_idle_trigger.
        on_idle_trigger: Optional callback when the directory goes idle (auto-edit trigger).
        poll_interval: Seconds between directory scans.

    Returns:
        FileWatcherState object to monitor and control the watcher.
    """
    watch_dir = Path(directory)
    if not watch_dir.exists():
        watch_dir.mkdir(parents=True, exist_ok=True)
        log.info("Created watch directory: %s", watch_dir)

    state = FileWatcherState()
    state.running = True

    # Seed with existing files (don't trigger callbacks for already-existing files)
    existing = scan_directory(watch_dir)
    for f in existing:
        state.mark_ingested(str(f))
    log.info("File watcher initialized: %s (%d existing files excluded)", watch_dir, len(existing))

    def _poll_loop():
        idle_triggered = False
        while state.running:
            try:
                # Scan for new files
                current_files = scan_directory(watch_dir)
                for f in current_files:
                    fstr = str(f)
                    if fstr not in state._ingested_files and fstr not in state._pending_files:
                        state.add_pending(fstr)
                        log.info("New video detected: %s", f.name)

                # Check for ready files (debounced)
                ready = state.get_ready_files(debounce_seconds)
                for fpath in ready:
                    try:
                        on_new_file(fpath)
                        state.mark_ingested(fpath)
                        log.info("Ingested: %s", Path(fpath).name)
                        idle_triggered = False
                    except Exception as e:
                        log.error("Ingest callback failed for %s: %s", fpath, e)
                        state.mark_ingested(fpath)  # don't retry

                # Check idle trigger
                if on_idle_trigger and not idle_triggered:
                    idle_time = state.seconds_since_activity()
                    if idle_time >= idle_trigger_seconds and state.ingested_count > 0:
                        log.info("Idle trigger: no new files for %.0fs, firing auto-edit", idle_time)
                        try:
                            on_idle_trigger()
                        except Exception as e:
                            log.error("Idle trigger callback failed: %s", e)
                        idle_triggered = True

            except Exception as e:
                log.error("Watch loop error: %s", e)

            time.sleep(poll_interval)

        log.info("File watcher stopped")

    thread = threading.Thread(target=_poll_loop, daemon=True, name="file_watcher")
    thread.start()
    log.info("File watcher started: polling %s every %.1fs", watch_dir, poll_interval)

    return state
