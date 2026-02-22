"""Full moment scoring pipeline.

Combines keyframe extraction and VLM scoring into a single operation
that takes a video file and returns a complete scored manifest.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from src.vision.moondream_client import MoondreamClient, MoondreamError
from src.vision.frame_extractor import extract_keyframes, FrameExtractionError, get_video_duration
from src.utils.logging_config import get_logger

log = get_logger("vision.moment_scorer")


class ScoredMoment:
    """A single scored moment from VLM analysis."""

    def __init__(
        self,
        timecode: str,
        seconds: float,
        score: float,
        reason: str,
        tags: list[str],
        image_path: str,
    ):
        self.timecode = timecode
        self.seconds = seconds
        self.score = score
        self.reason = reason
        self.tags = tags
        self.image_path = image_path

    def to_dict(self) -> dict:
        return {
            "timecode": self.timecode,
            "seconds": self.seconds,
            "score": self.score,
            "reason": self.reason,
            "tags": self.tags,
            "image_path": self.image_path,
        }


class ScoringResult:
    """Complete result of scoring a video clip."""

    def __init__(
        self,
        clip_path: str,
        moments: list[ScoredMoment],
        clip_duration: float,
        elapsed_seconds: float,
    ):
        self.clip_path = clip_path
        self.moments = moments
        self.clip_duration = clip_duration
        self.elapsed_seconds = elapsed_seconds

    @property
    def count(self) -> int:
        return len(self.moments)

    def above_threshold(self, threshold: float) -> list[ScoredMoment]:
        return [m for m in self.moments if m.score >= threshold]

    def top_n(self, n: int) -> list[ScoredMoment]:
        return sorted(self.moments, key=lambda m: m.score, reverse=True)[:n]

    def to_dict_list(self) -> list[dict]:
        return [m.to_dict() for m in self.moments]

    def to_summary(self) -> dict:
        scores = [m.score for m in self.moments]
        return {
            "clip_path": self.clip_path,
            "clip_duration": self.clip_duration,
            "total_moments": self.count,
            "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
            "max_score": max(scores) if scores else 0,
            "min_score": min(scores) if scores else 0,
            "above_5": len([s for s in scores if s >= 5]),
            "above_7": len([s for s in scores if s >= 7]),
            "elapsed_seconds": round(self.elapsed_seconds, 2),
        }


def score_video(
    clip_path: str | Path,
    client: MoondreamClient,
    interval_seconds: float = 5.0,
    scoring_prompt: str = "",
    max_frames: int = 200,
) -> ScoringResult:
    """Score all moments in a video clip.

    This is the main entry point for the scoring pipeline. It:
    1. Extracts keyframes at the given interval
    2. Sends each to the VLM for scoring
    3. Returns a complete ScoringResult

    Args:
        clip_path: Path to the video file.
        client: Initialized MoondreamClient.
        interval_seconds: Seconds between sampled frames.
        scoring_prompt: Custom scoring context. If empty, uses default broadcast prompt.
        max_frames: Maximum frames to extract.

    Returns:
        ScoringResult with all scored moments.
    """
    start = time.time()
    video = Path(clip_path)

    if not scoring_prompt:
        scoring_prompt = (
            "Score this frame 0-10 for highlight value in a broadcast production. "
            "10 = unmissable moment, 0 = nothing happening."
        )

    # Get video duration
    duration = get_video_duration(video)
    log.info("Scoring video: %s (%.1fs) at %.1fs interval", video.name, duration, interval_seconds)

    # Extract keyframes
    try:
        frames = extract_keyframes(clip_path, interval_seconds=interval_seconds, max_frames=max_frames)
    except FrameExtractionError as e:
        log.error("Frame extraction failed: %s", e)
        return ScoringResult(str(clip_path), [], duration, time.time() - start)

    # Score each frame
    moments: list[ScoredMoment] = []
    for i, frame in enumerate(frames):
        try:
            result = client.score_moment(frame["image_path"], scoring_prompt)
            moment = ScoredMoment(
                timecode=frame["timecode"],
                seconds=frame["seconds"],
                score=result["score"],
                reason=result["reason"],
                tags=result["tags"],
                image_path=frame["image_path"],
            )
            moments.append(moment)

            if (i + 1) % 10 == 0 or i == 0:
                log.info("  Scored %d/%d frames (latest: %.1f - %s)",
                         i + 1, len(frames), result["score"], result["reason"][:40])
        except MoondreamError as e:
            log.warning("  Frame %d scoring failed: %s", i, e)

    elapsed = time.time() - start
    scoring_result = ScoringResult(str(clip_path), moments, duration, elapsed)

    log.info(
        "Scoring complete: %d moments scored in %.1fs | avg=%.1f max=%.1f",
        scoring_result.count, elapsed,
        scoring_result.to_summary()["average_score"],
        scoring_result.to_summary()["max_score"],
    )
    return scoring_result
