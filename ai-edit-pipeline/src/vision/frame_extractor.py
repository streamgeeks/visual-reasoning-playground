"""Keyframe extraction from video files via ffmpeg.

Extracts one frame every N seconds from a video file, saves as JPEG to a temp
directory, and returns a manifest mapping timecodes to image paths.

Requires ffmpeg to be installed and available on PATH.
"""

from __future__ import annotations

import json
import subprocess
import shutil
from pathlib import Path
from typing import Optional

from src.utils.logging_config import get_logger
from src.utils.paths import temp_frames_dir, normalize_video_path
from src.utils.timecode import seconds_to_smpte

log = get_logger("frame_extractor")


class FrameExtractionError(Exception):
    """Raised when frame extraction fails."""


def check_ffmpeg() -> bool:
    """Check if ffmpeg is available on the system PATH."""
    return shutil.which("ffmpeg") is not None


def get_video_duration(video_path: Path) -> float:
    """Get the duration of a video file in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                str(video_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            log.warning("ffprobe failed for %s: %s", video_path.name, result.stderr[:200])
            return 0.0

        data = json.loads(result.stdout)
        duration = float(data.get("format", {}).get("duration", 0))
        return duration
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as e:
        log.warning("Could not get video duration: %s", e)
        return 0.0


def extract_keyframes(
    video_path: str | Path,
    interval_seconds: float = 5.0,
    output_dir: str | Path | None = None,
    max_frames: int = 500,
    quality: int = 2,
) -> list[dict]:
    """Extract keyframes from a video file at regular intervals.

    Args:
        video_path: Path to the input video file.
        interval_seconds: Extract one frame every N seconds (default: 5).
        output_dir: Directory for extracted frames. Defaults to system temp.
        max_frames: Maximum number of frames to extract (safety limit).
        quality: JPEG quality 1-31 (lower = better, 2 is high quality).

    Returns:
        List of dicts: [{timecode, seconds, image_path, frame_index}, ...]

    Raises:
        FrameExtractionError: If ffmpeg is not found or extraction fails.
    """
    if not check_ffmpeg():
        raise FrameExtractionError(
            "ffmpeg not found on PATH. Install ffmpeg:\n"
            "  Windows: winget install ffmpeg\n"
            "  macOS: brew install ffmpeg"
        )

    video = normalize_video_path(str(video_path))
    if not video.exists():
        raise FrameExtractionError(f"Video file not found: {video}")

    # Set up output directory
    if output_dir:
        out_dir = Path(output_dir)
    else:
        out_dir = temp_frames_dir() / video.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    # Get video duration for frame count estimation
    duration = get_video_duration(video)
    estimated_frames = int(duration / interval_seconds) + 1 if duration > 0 else max_frames
    actual_max = min(estimated_frames, max_frames)

    log.info(
        "Extracting keyframes: video=%s interval=%.1fs duration=%.1fs est_frames=%d",
        video.name, interval_seconds, duration, actual_max,
    )

    # Run ffmpeg to extract frames
    output_pattern = str(out_dir / "frame_%06d.jpg")

    cmd = [
        "ffmpeg",
        "-i", str(video),
        "-vf", f"fps=1/{interval_seconds}",
        "-q:v", str(quality),
        "-frames:v", str(actual_max),
        "-y",  # overwrite existing
        output_pattern,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute max
        )

        if result.returncode != 0:
            raise FrameExtractionError(
                f"ffmpeg extraction failed (code {result.returncode}): {result.stderr[:300]}"
            )
    except subprocess.TimeoutExpired:
        raise FrameExtractionError("ffmpeg extraction timed out (5 min limit)")
    except FileNotFoundError:
        raise FrameExtractionError("ffmpeg executable not found")

    # Build manifest from extracted files
    manifest = []
    frame_files = sorted(out_dir.glob("frame_*.jpg"))

    for idx, frame_path in enumerate(frame_files):
        seconds = idx * interval_seconds
        manifest.append({
            "frame_index": idx,
            "seconds": round(seconds, 2),
            "timecode": seconds_to_smpte(seconds),
            "image_path": str(frame_path),
        })

    log.info("Extracted %d keyframes to %s", len(manifest), out_dir)
    return manifest


def cleanup_frames(output_dir: str | Path) -> None:
    """Remove extracted frame files from a directory."""
    d = Path(output_dir)
    if d.exists():
        shutil.rmtree(d, ignore_errors=True)
        log.info("Cleaned up frames directory: %s", d)
