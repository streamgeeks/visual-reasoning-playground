"""MCP-callable orchestration tools for the AI edit pipeline.

These tools coordinate between vision analysis and Resolve editing:
scoring moments, generating Edit Decision Lists, and managing sessions.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from mcp.server.fastmcp import FastMCP

from src.vision.moondream_client import MoondreamClient, MoondreamError
from src.vision.frame_extractor import extract_keyframes, FrameExtractionError
from src.utils.logging_config import get_logger
from src.utils.timecode import Timecode, seconds_to_smpte

log = get_logger("tools.orchestration")


def _get_vlm() -> MoondreamClient:
    """Get or create the shared MoondreamClient instance."""
    # Import from vision_tools to share the same singleton
    from src.tools.vision_tools import _get_vlm as get_vlm
    return get_vlm()


def register_orchestration_tools(mcp: FastMCP) -> None:
    """Register all orchestration MCP tools with the FastMCP server."""

    @mcp.tool()
    def get_scored_moments(
        clip_path: str,
        threshold: float = 5.0,
        context: str = "",
        sample_rate: float = 5.0,
    ) -> dict:
        """Score all moments in a clip and return those above a threshold, sorted descending.

        This combines keyframe extraction + VLM scoring into a single pipeline.

        Args:
            clip_path: Path to the video file.
            threshold: Minimum score (0-10) to include in results (default: 5.0).
            context: Scoring context (e.g., 'sports highlights focusing on goals').
            sample_rate: Seconds between sampled frames (default: 5).

        Returns:
            Dict with {moments: [{timecode, seconds, score, reason, tags, image_path}],
                       total_scored, above_threshold, clip_path}.
        """
        start = time.time()

        # Extract keyframes
        frames = extract_keyframes(clip_path, interval_seconds=sample_rate)
        client = _get_vlm()

        scoring_prompt = context if context else (
            "Score this frame 0-10 for highlight value in a broadcast production. "
            "10 = unmissable moment, 0 = nothing happening."
        )

        # Score each frame
        all_moments = []
        for i, frame in enumerate(frames):
            try:
                score_result = client.score_moment(frame["image_path"], scoring_prompt)
                all_moments.append({
                    "timecode": frame["timecode"],
                    "seconds": frame["seconds"],
                    "score": score_result["score"],
                    "reason": score_result["reason"],
                    "tags": score_result["tags"],
                    "image_path": frame["image_path"],
                })
            except MoondreamError as e:
                log.warning("Scoring failed for frame %d: %s", i, e)

        # Filter and sort
        above_threshold = [m for m in all_moments if m["score"] >= threshold]
        above_threshold.sort(key=lambda m: m["score"], reverse=True)

        elapsed = time.time() - start
        log.info(
            "MCP get_scored_moments: %d/%d above threshold %.1f (%.2fs)",
            len(above_threshold), len(all_moments), threshold, elapsed,
        )

        return {
            "moments": above_threshold,
            "total_scored": len(all_moments),
            "above_threshold": len(above_threshold),
            "clip_path": clip_path,
            "threshold": threshold,
            "latency_seconds": round(elapsed, 2),
        }

    @mcp.tool()
    def build_edl(
        moments: list[dict],
        target_seconds: float = 90.0,
        min_clip_seconds: float = 3.0,
        max_clips: int = 20,
        padding_seconds: float = 2.0,
    ) -> dict:
        """Generate a JSON Edit Decision List from scored moments and a target duration.

        Selects the highest-scoring segments with configurable rules (minimum clip
        length, maximum clip count, no overlapping segments).

        Args:
            moments: List of scored moments [{timecode, seconds, score, reason, ...}].
                     Must be from get_scored_moments or similar.
            target_seconds: Target total duration in seconds (default: 90).
            min_clip_seconds: Minimum duration for each clip segment (default: 3).
            max_clips: Maximum number of clips to include (default: 20).
            padding_seconds: Seconds of padding before/after each moment (default: 2).

        Returns:
            Dict with {edl: [{clip_index, in_tc, out_tc, in_seconds, out_seconds,
                              score, reason}],
                       total_duration, clip_count}.
        """
        start = time.time()

        # Sort by score descending
        sorted_moments = sorted(moments, key=lambda m: m.get("score", 0), reverse=True)

        edl = []
        total_duration = 0.0
        used_ranges: list[tuple[float, float]] = []

        for moment in sorted_moments:
            if len(edl) >= max_clips:
                break
            if total_duration >= target_seconds:
                break

            center = moment.get("seconds", 0)
            in_sec = max(0, center - padding_seconds)
            out_sec = center + padding_seconds + min_clip_seconds

            # Check for overlap with existing segments
            overlaps = False
            for existing_in, existing_out in used_ranges:
                if in_sec < existing_out and out_sec > existing_in:
                    overlaps = True
                    break

            if overlaps:
                continue

            clip_duration = out_sec - in_sec
            if total_duration + clip_duration > target_seconds * 1.1:
                # Would exceed target by more than 10%, try shorter
                remaining = target_seconds - total_duration
                if remaining < min_clip_seconds:
                    break
                out_sec = in_sec + remaining
                clip_duration = remaining

            edl.append({
                "clip_index": len(edl),
                "in_tc": seconds_to_smpte(in_sec),
                "out_tc": seconds_to_smpte(out_sec),
                "in_seconds": round(in_sec, 2),
                "out_seconds": round(out_sec, 2),
                "duration_seconds": round(clip_duration, 2),
                "score": moment.get("score", 0),
                "reason": moment.get("reason", ""),
            })
            used_ranges.append((in_sec, out_sec))
            total_duration += clip_duration

        # Sort EDL by timecode (chronological order for assembly)
        edl.sort(key=lambda e: e["in_seconds"])

        # Re-index after sort
        for i, entry in enumerate(edl):
            entry["clip_index"] = i

        elapsed = time.time() - start
        log.info(
            "MCP build_edl: %d clips, %.1fs total (target %.1fs) (%.2fs)",
            len(edl), total_duration, target_seconds, elapsed,
        )

        return {
            "edl": edl,
            "total_duration": round(total_duration, 2),
            "clip_count": len(edl),
            "target_seconds": target_seconds,
        }

    @mcp.tool()
    def validate_edl(edl: list[dict]) -> dict:
        """Validate an Edit Decision List for correctness.

        Checks for: valid timecodes, no overlapping segments, positive durations,
        and chronological ordering.

        Args:
            edl: List of EDL entries [{in_tc, out_tc, in_seconds, out_seconds, ...}].

        Returns:
            Dict with {valid: bool, errors: [str], warnings: [str]}.
        """
        errors = []
        warnings = []

        if not edl:
            errors.append("EDL is empty")
            return {"valid": False, "errors": errors, "warnings": warnings}

        prev_out = -1.0
        total_duration = 0.0

        for i, entry in enumerate(edl):
            in_sec = entry.get("in_seconds", 0)
            out_sec = entry.get("out_seconds", 0)
            duration = out_sec - in_sec

            # Check positive duration
            if duration <= 0:
                errors.append(f"Clip {i}: negative or zero duration ({in_sec} -> {out_sec})")

            # Check chronological order
            if in_sec < prev_out:
                warnings.append(f"Clip {i}: overlaps with previous clip (starts at {in_sec}, prev ends at {prev_out})")

            # Check timecode format
            if "in_tc" in entry:
                try:
                    Timecode.from_smpte(entry["in_tc"])
                except ValueError as e:
                    errors.append(f"Clip {i}: invalid in_tc '{entry['in_tc']}': {e}")

            if "out_tc" in entry:
                try:
                    Timecode.from_smpte(entry["out_tc"])
                except ValueError as e:
                    errors.append(f"Clip {i}: invalid out_tc '{entry['out_tc']}': {e}")

            prev_out = out_sec
            total_duration += max(0, duration)

        if total_duration > 600:
            warnings.append(f"Total EDL duration is {total_duration:.0f}s (>10 minutes)")

        valid = len(errors) == 0
        log.info("MCP validate_edl: valid=%s errors=%d warnings=%d", valid, len(errors), len(warnings))

        return {
            "valid": valid,
            "errors": errors,
            "warnings": warnings,
            "total_duration": round(total_duration, 2),
            "clip_count": len(edl),
        }
