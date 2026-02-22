"""Recording session manager.

Groups clips into named sessions (e.g., 'Sunday morning service',
'Game 4 — U12 soccer'). Sessions can be named via Claude and are
used to organize clips in Resolve and label EDLs.

Sessions are persisted to a local JSON file.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from src.utils.logging_config import get_logger

log = get_logger("ingest.session_manager")

DEFAULT_SESSION_FILE = "sessions.json"
# Clips arriving within this window are grouped into the same session
DEFAULT_GROUPING_WINDOW_SECONDS = 1800.0  # 30 minutes


class Session:
    """A named recording session containing grouped clips."""

    def __init__(
        self,
        name: str,
        session_id: str | None = None,
        clips: list[dict] | None = None,
        created_at: float | None = None,
        metadata: dict | None = None,
    ):
        self.session_id = session_id or f"session_{int(time.time())}_{id(self) % 10000}"
        self.name = name
        self.clips: list[dict] = clips or []
        self.created_at = created_at or time.time()
        self.metadata = metadata or {}

    def add_clip(self, clip_path: str, clip_metadata: dict | None = None) -> None:
        entry = {
            "path": clip_path,
            "filename": Path(clip_path).name,
            "added_at": time.time(),
            "metadata": clip_metadata or {},
        }
        self.clips.append(entry)
        log.info("Session '%s': added clip '%s' (%d total)", self.name, Path(clip_path).name, len(self.clips))

    @property
    def clip_count(self) -> int:
        return len(self.clips)

    @property
    def clip_paths(self) -> list[str]:
        return [c["path"] for c in self.clips]

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "name": self.name,
            "clips": self.clips,
            "clip_count": self.clip_count,
            "created_at": self.created_at,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Session:
        return cls(
            name=data["name"],
            session_id=data.get("session_id"),
            clips=data.get("clips", []),
            created_at=data.get("created_at"),
            metadata=data.get("metadata", {}),
        )


class SessionManager:
    """Manages recording sessions with persistence."""

    def __init__(self, storage_path: str | Path | None = None):
        self._storage_path = Path(storage_path) if storage_path else Path(DEFAULT_SESSION_FILE)
        self.sessions: list[Session] = []
        self._load()

    def _load(self) -> None:
        if self._storage_path.exists():
            try:
                data = json.loads(self._storage_path.read_text(encoding="utf-8"))
                self.sessions = [Session.from_dict(s) for s in data.get("sessions", [])]
                log.info("Loaded %d sessions from %s", len(self.sessions), self._storage_path)
            except (json.JSONDecodeError, KeyError) as e:
                log.warning("Could not load sessions: %s", e)
                self.sessions = []
        else:
            self.sessions = []

    def _save(self) -> None:
        data = {"sessions": [s.to_dict() for s in self.sessions]}
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._storage_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def create_session(self, name: str, metadata: dict | None = None) -> Session:
        session = Session(name=name, metadata=metadata)
        self.sessions.append(session)
        self._save()
        log.info("Created session '%s' (id=%s)", name, session.session_id)
        return session

    def get_session(self, name: str) -> Session | None:
        for s in self.sessions:
            if s.name == name:
                return s
        return None

    def get_session_by_id(self, session_id: str) -> Session | None:
        for s in self.sessions:
            if s.session_id == session_id:
                return s
        return None

    def add_clip_to_session(
        self,
        session_name: str,
        clip_path: str,
        auto_create: bool = True,
        clip_metadata: dict | None = None,
    ) -> Session:
        """Add a clip to a named session, creating the session if needed."""
        session = self.get_session(session_name)
        if session is None:
            if auto_create:
                session = self.create_session(session_name)
            else:
                raise ValueError(f"Session '{session_name}' not found")
        session.add_clip(clip_path, clip_metadata)
        self._save()
        return session

    def auto_assign_clip(
        self,
        clip_path: str,
        grouping_window: float = DEFAULT_GROUPING_WINDOW_SECONDS,
    ) -> Session:
        """Auto-assign a clip to the most recent session, or create a new one.

        If the most recent session received a clip within `grouping_window` seconds,
        the new clip is added to it. Otherwise, a new session is created.
        """
        now = time.time()
        if self.sessions:
            latest = self.sessions[-1]
            if latest.clips:
                last_clip_time = latest.clips[-1].get("added_at", 0)
                if now - last_clip_time < grouping_window:
                    latest.add_clip(clip_path)
                    self._save()
                    return latest

        # Create a new auto-named session
        from datetime import datetime
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")
        session = self.create_session(f"Recording {ts}")
        session.add_clip(clip_path)
        self._save()
        return session

    def list_sessions(self) -> list[dict]:
        return [s.to_dict() for s in self.sessions]

    def delete_session(self, name: str) -> bool:
        for i, s in enumerate(self.sessions):
            if s.name == name:
                self.sessions.pop(i)
                self._save()
                log.info("Deleted session '%s'", name)
                return True
        return False

    def get_session_clips(self, session_name: str) -> list[str]:
        session = self.get_session(session_name)
        if session:
            return session.clip_paths
        return []
