"""Edit Decision List (EDL) generator for the AI edit pipeline.

Takes scored moments from VLM analysis and produces a structured EDL
that the Resolve assembler can execute. Supports configurable rules
for clip selection, duration targeting, and overlap avoidance.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.utils.logging_config import get_logger
from src.utils.timecode import seconds_to_smpte, Timecode

log = get_logger("edit_engine.edl")


class EDLEntry:
    """A single entry in an Edit Decision List."""

    def __init__(
        self,
        clip_path: str,
        in_seconds: float,
        out_seconds: float,
        score: float = 0.0,
        reason: str = "",
        tags: list[str] | None = None,
    ):
        self.clip_path = clip_path
        self.in_seconds = round(in_seconds, 3)
        self.out_seconds = round(out_seconds, 3)
        self.score = score
        self.reason = reason
        self.tags = tags or []

    @property
    def duration(self) -> float:
        return round(self.out_seconds - self.in_seconds, 3)

    @property
    def in_tc(self) -> str:
        return seconds_to_smpte(self.in_seconds)

    @property
    def out_tc(self) -> str:
        return seconds_to_smpte(self.out_seconds)

    def to_dict(self) -> dict:
        return {
            "clip_path": self.clip_path,
            "in_tc": self.in_tc,
            "out_tc": self.out_tc,
            "in_seconds": self.in_seconds,
            "out_seconds": self.out_seconds,
            "duration_seconds": self.duration,
            "score": self.score,
            "reason": self.reason,
            "tags": self.tags,
        }


class EDL:
    """An Edit Decision List — ordered sequence of clip segments."""

    def __init__(self, entries: list[EDLEntry] | None = None):
        self.entries: list[EDLEntry] = entries or []

    @property
    def total_duration(self) -> float:
        return round(sum(e.duration for e in self.entries), 3)

    @property
    def clip_count(self) -> int:
        return len(self.entries)

    @property
    def average_score(self) -> float:
        if not self.entries:
            return 0.0
        return round(sum(e.score for e in self.entries) / len(self.entries), 2)

    def add(self, entry: EDLEntry) -> None:
        self.entries.append(entry)

    def remove_weakest(self, count: int = 1) -> list[EDLEntry]:
        """Remove the N lowest-scoring entries. Returns the removed entries."""
        if count >= len(self.entries):
            removed = list(self.entries)
            self.entries.clear()
            return removed
        by_score = sorted(range(len(self.entries)), key=lambda i: self.entries[i].score)
        removed = []
        for idx in by_score[:count]:
            removed.append(self.entries[idx])
        self.entries = [e for i, e in enumerate(self.entries) if i not in set(by_score[:count])]
        return removed

    def trim_to_duration(self, target_seconds: float) -> None:
        """Remove lowest-scoring clips until total duration is at or below target."""
        while self.total_duration > target_seconds and len(self.entries) > 1:
            self.remove_weakest(1)

    def sort_chronological(self) -> None:
        """Sort entries by in_seconds (timeline order)."""
        self.entries.sort(key=lambda e: e.in_seconds)

    def to_dict_list(self) -> list[dict]:
        return [e.to_dict() for e in self.entries]

    def to_json(self, indent: int = 2) -> str:
        data = {
            "edl": self.to_dict_list(),
            "total_duration": self.total_duration,
            "clip_count": self.clip_count,
            "average_score": self.average_score,
        }
        return json.dumps(data, indent=indent)

    def save(self, path: str | Path) -> None:
        """Save EDL to a JSON file."""
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(self.to_json(), encoding="utf-8")
        log.info("Saved EDL to %s (%d clips, %.1fs)", p, self.clip_count, self.total_duration)

    @classmethod
    def load(cls, path: str | Path) -> EDL:
        """Load EDL from a JSON file."""
        p = Path(path)
        data = json.loads(p.read_text(encoding="utf-8"))
        entries = []
        for item in data.get("edl", []):
            entries.append(EDLEntry(
                clip_path=item.get("clip_path", ""),
                in_seconds=item.get("in_seconds", 0),
                out_seconds=item.get("out_seconds", 0),
                score=item.get("score", 0),
                reason=item.get("reason", ""),
                tags=item.get("tags", []),
            ))
        return cls(entries)


def generate_edl(
    scored_moments: list[dict],
    clip_path: str,
    target_seconds: float = 90.0,
    min_clip_seconds: float = 3.0,
    max_clips: int = 20,
    padding_seconds: float = 2.0,
    clip_duration_seconds: float | None = None,
) -> EDL:
    """Generate an EDL from scored moments.

    Args:
        scored_moments: List of [{seconds, score, reason, tags, ...}] from VLM scoring.
        clip_path: Source video file path (all moments are from this clip).
        target_seconds: Target total edit duration.
        min_clip_seconds: Minimum duration per clip segment.
        max_clips: Maximum number of clips in the EDL.
        padding_seconds: Seconds of padding before/after each moment center.
        clip_duration_seconds: Total source clip duration (for clamping out-points).

    Returns:
        A populated EDL object sorted chronologically.
    """
    # Sort moments by score descending for greedy selection
    sorted_moments = sorted(scored_moments, key=lambda m: m.get("score", 0), reverse=True)

    edl = EDL()
    used_ranges: list[tuple[float, float]] = []
    total = 0.0

    for moment in sorted_moments:
        if edl.clip_count >= max_clips:
            break
        if total >= target_seconds:
            break

        center = moment.get("seconds", 0)
        in_sec = max(0, center - padding_seconds)
        out_sec = center + padding_seconds + min_clip_seconds

        # Clamp to source clip duration if known
        if clip_duration_seconds and out_sec > clip_duration_seconds:
            out_sec = clip_duration_seconds

        # Check overlap with already-selected segments
        overlaps = any(in_sec < ex_out and out_sec > ex_in for ex_in, ex_out in used_ranges)
        if overlaps:
            continue

        clip_dur = out_sec - in_sec
        if clip_dur < min_clip_seconds:
            continue

        # Check if adding this would exceed target by too much
        if total + clip_dur > target_seconds * 1.15:
            remaining = target_seconds - total
            if remaining < min_clip_seconds:
                break
            out_sec = in_sec + remaining
            clip_dur = remaining

        entry = EDLEntry(
            clip_path=clip_path,
            in_seconds=in_sec,
            out_seconds=out_sec,
            score=moment.get("score", 0),
            reason=moment.get("reason", ""),
            tags=moment.get("tags", []),
        )
        edl.add(entry)
        used_ranges.append((in_sec, out_sec))
        total += clip_dur

    edl.sort_chronological()

    log.info(
        "Generated EDL: %d clips, %.1fs total (target %.1fs), avg score %.1f",
        edl.clip_count, edl.total_duration, target_seconds, edl.average_score,
    )
    return edl
