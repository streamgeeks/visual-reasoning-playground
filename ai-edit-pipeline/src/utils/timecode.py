"""SMPTE timecode utilities for the AI edit pipeline.

Supports conversion between frame numbers, seconds, and SMPTE HH:MM:SS:FF format.
Default framerate is 29.97 (NTSC drop-frame) but all functions accept a configurable fps.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


DEFAULT_FPS = 29.97


@dataclass(frozen=True)
class Timecode:
    """Immutable SMPTE timecode representation."""
    hours: int
    minutes: int
    seconds: int
    frames: int
    fps: float = DEFAULT_FPS

    @classmethod
    def from_frames(cls, total_frames: int, fps: float = DEFAULT_FPS) -> Timecode:
        """Create a Timecode from a total frame count."""
        fps_int = round(fps)
        f = total_frames % fps_int
        total_seconds = total_frames // fps_int
        s = total_seconds % 60
        total_minutes = total_seconds // 60
        m = total_minutes % 60
        h = total_minutes // 60
        return cls(hours=h, minutes=m, seconds=s, frames=f, fps=fps)

    @classmethod
    def from_seconds(cls, total_seconds: float, fps: float = DEFAULT_FPS) -> Timecode:
        """Create a Timecode from a duration in seconds."""
        total_frames = round(total_seconds * fps)
        return cls.from_frames(total_frames, fps)

    @classmethod
    def from_smpte(cls, smpte_str: str, fps: float = DEFAULT_FPS) -> Timecode:
        """Parse a SMPTE timecode string 'HH:MM:SS:FF' or 'HH:MM:SS;FF' (drop-frame).

        Also accepts 'HH:MM:SS' (frames default to 0).
        """
        # Normalize semicolons to colons
        normalized = smpte_str.replace(";", ":")
        parts = normalized.split(":")

        if len(parts) == 3:
            h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
            f = 0
        elif len(parts) == 4:
            h, m, s, f = int(parts[0]), int(parts[1]), int(parts[2]), int(parts[3])
        else:
            raise ValueError(f"Invalid SMPTE timecode format: '{smpte_str}'. Expected HH:MM:SS:FF or HH:MM:SS")

        return cls(hours=h, minutes=m, seconds=s, frames=f, fps=fps)

    def to_frames(self) -> int:
        """Convert to total frame count."""
        fps_int = round(self.fps)
        return (
            self.hours * 3600 * fps_int
            + self.minutes * 60 * fps_int
            + self.seconds * fps_int
            + self.frames
        )

    def to_seconds(self) -> float:
        """Convert to total seconds (float)."""
        return self.to_frames() / self.fps

    def to_smpte(self) -> str:
        """Format as SMPTE string 'HH:MM:SS:FF'."""
        return f"{self.hours:02d}:{self.minutes:02d}:{self.seconds:02d}:{self.frames:02d}"

    def __str__(self) -> str:
        return self.to_smpte()

    def __repr__(self) -> str:
        return f"Timecode({self.to_smpte()}, fps={self.fps})"

    def __add__(self, other: Timecode) -> Timecode:
        if not isinstance(other, Timecode):
            return NotImplemented
        return Timecode.from_frames(self.to_frames() + other.to_frames(), self.fps)

    def __sub__(self, other: Timecode) -> Timecode:
        if not isinstance(other, Timecode):
            return NotImplemented
        result_frames = self.to_frames() - other.to_frames()
        if result_frames < 0:
            raise ValueError("Timecode subtraction would result in negative timecode")
        return Timecode.from_frames(result_frames, self.fps)

    def __lt__(self, other: Timecode) -> bool:
        return self.to_frames() < other.to_frames()

    def __le__(self, other: Timecode) -> bool:
        return self.to_frames() <= other.to_frames()

    def __gt__(self, other: Timecode) -> bool:
        return self.to_frames() > other.to_frames()

    def __ge__(self, other: Timecode) -> bool:
        return self.to_frames() >= other.to_frames()

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Timecode):
            return NotImplemented
        return self.to_frames() == other.to_frames()

    def __hash__(self) -> int:
        return hash((self.to_frames(), round(self.fps)))


def seconds_to_smpte(total_seconds: float, fps: float = DEFAULT_FPS) -> str:
    """Convenience: convert seconds directly to SMPTE string."""
    return Timecode.from_seconds(total_seconds, fps).to_smpte()


def smpte_to_seconds(smpte_str: str, fps: float = DEFAULT_FPS) -> float:
    """Convenience: convert SMPTE string directly to seconds."""
    return Timecode.from_smpte(smpte_str, fps).to_seconds()


def frames_to_smpte(total_frames: int, fps: float = DEFAULT_FPS) -> str:
    """Convenience: convert frame count directly to SMPTE string."""
    return Timecode.from_frames(total_frames, fps).to_smpte()
