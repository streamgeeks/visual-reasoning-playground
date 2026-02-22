"""Conversational edit refinement engine.

After an initial AI-generated cut, this module handles follow-up commands
like "make it 30 seconds shorter", "remove the weakest clip", or
"add a title card at the start". It modifies the EDL and re-executes
against Resolve.
"""

from __future__ import annotations

from src.edit_engine.edl_generator import EDL, EDLEntry
from src.utils.logging_config import get_logger

log = get_logger("edit_engine.refinement")


def shorten_edit(edl: EDL, reduce_seconds: float) -> EDL:
    """Shorten the edit by removing the lowest-scoring clips.

    Removes clips starting from the weakest until the total duration
    is reduced by approximately `reduce_seconds`.

    Args:
        edl: The current EDL.
        reduce_seconds: How many seconds to cut.

    Returns:
        The modified EDL (same object, mutated).
    """
    target = edl.total_duration - reduce_seconds
    if target <= 0:
        log.warning("Cannot shorten by %.1fs — that would remove everything", reduce_seconds)
        return edl

    original_count = edl.clip_count
    original_duration = edl.total_duration
    edl.trim_to_duration(target)

    log.info(
        "Shortened edit: %.1fs -> %.1fs (removed %d clips)",
        original_duration, edl.total_duration, original_count - edl.clip_count,
    )
    return edl


def lengthen_edit(edl: EDL, available_moments: list[dict], add_seconds: float, clip_path: str) -> EDL:
    """Lengthen the edit by adding the next best unused moments.

    Args:
        edl: The current EDL.
        available_moments: All scored moments (including those not in the EDL).
        add_seconds: How many seconds to add.
        clip_path: Source clip path for new entries.

    Returns:
        The modified EDL with additional clips.
    """
    # Find moments not already used in EDL
    used_times = set(round(e.in_seconds, 1) for e in edl.entries)
    unused = [m for m in available_moments if round(m.get("seconds", 0), 1) not in used_times]
    unused.sort(key=lambda m: m.get("score", 0), reverse=True)

    added = 0.0
    for moment in unused:
        if added >= add_seconds:
            break
        center = moment.get("seconds", 0)
        in_sec = max(0, center - 2.0)
        out_sec = center + 5.0

        # Check overlap
        overlaps = any(in_sec < e.out_seconds and out_sec > e.in_seconds for e in edl.entries)
        if overlaps:
            continue

        entry = EDLEntry(
            clip_path=clip_path,
            in_seconds=in_sec,
            out_seconds=out_sec,
            score=moment.get("score", 0),
            reason=moment.get("reason", ""),
            tags=moment.get("tags", []),
        )
        edl.add(entry)
        added += entry.duration

    edl.sort_chronological()
    log.info("Lengthened edit by %.1fs (added %.1fs actual)", add_seconds, added)
    return edl


def remove_weakest_clips(edl: EDL, count: int = 1) -> list[dict]:
    """Remove the N weakest clips from the EDL.

    Args:
        edl: The current EDL.
        count: Number of clips to remove.

    Returns:
        List of removed clip dicts for reporting.
    """
    removed = edl.remove_weakest(count)
    removed_dicts = [e.to_dict() for e in removed]
    log.info("Removed %d weakest clip(s): %s",
             len(removed), ", ".join(e.reason[:30] for e in removed))
    return removed_dicts


def add_title(edl: EDL, text: str, position: str = "start", duration_seconds: float = 5.0) -> dict:
    """Add a title card entry to the EDL.

    Args:
        edl: The current EDL.
        text: Title text.
        position: 'start' or 'end'.
        duration_seconds: Title duration.

    Returns:
        Dict describing the added title.
    """
    if position == "start":
        # Insert at time 0, shift everything else
        # In practice, the assembler handles title positioning
        in_sec = 0.0
    else:
        in_sec = edl.total_duration if edl.entries else 0.0

    entry = EDLEntry(
        clip_path="__title__",
        in_seconds=in_sec,
        out_seconds=in_sec + duration_seconds,
        score=10.0,  # titles always kept
        reason=f"Title: {text}",
        tags=["title"],
    )

    if position == "start":
        edl.entries.insert(0, entry)
    else:
        edl.entries.append(entry)

    log.info("Added title card '%s' at %s (%.1fs)", text[:40], position, duration_seconds)
    return entry.to_dict()


def replace_clip(edl: EDL, clip_index: int, new_moment: dict, clip_path: str) -> dict | None:
    """Replace a specific clip in the EDL with a different moment.

    Args:
        edl: The current EDL.
        clip_index: Index of the clip to replace (0-based).
        new_moment: Scored moment dict to replace it with.
        clip_path: Source clip path.

    Returns:
        Dict of the new entry, or None if index is out of range.
    """
    if clip_index < 0 or clip_index >= len(edl.entries):
        log.warning("Cannot replace clip %d: index out of range (EDL has %d clips)", clip_index, len(edl.entries))
        return None

    center = new_moment.get("seconds", 0)
    new_entry = EDLEntry(
        clip_path=clip_path,
        in_seconds=max(0, center - 2.0),
        out_seconds=center + 5.0,
        score=new_moment.get("score", 0),
        reason=new_moment.get("reason", ""),
        tags=new_moment.get("tags", []),
    )

    old = edl.entries[clip_index]
    edl.entries[clip_index] = new_entry
    log.info("Replaced clip %d (was: '%s' score=%.1f) with '%s' score=%.1f",
             clip_index, old.reason[:30], old.score, new_entry.reason[:30], new_entry.score)
    return new_entry.to_dict()
