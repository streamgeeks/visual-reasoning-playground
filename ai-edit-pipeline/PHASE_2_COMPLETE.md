# Phase 2 Complete — MCP Server Build

**Completed:** February 2026
**Tests:** 74 passing (cumulative with Phase 1)
**MCP Tools:** 16 registered

## What Was Built

### `src/mcp_server.py` (75 lines)
FastMCP server entry point. Loads `.env`, registers all tool groups, runs on stdio transport for Claude Desktop.

### `src/tools/resolve_tools.py` (145 lines)
9 MCP-callable Resolve tools. Each wraps a `resolve_api.py` method with logging and timing.

### `src/tools/vision_tools.py` (155 lines)
4 MCP-callable VLM tools:
- `analyze_frame` — single-frame VLM query
- `score_moment` — score a frame 0-10 for highlight value
- `extract_keyframes_from_video` — ffmpeg frame extraction
- `batch_analyze_clip` — extract + analyze all frames in one call

### `src/tools/orchestration_tools.py` (230 lines)
3 MCP-callable orchestration tools:
- `get_scored_moments` — score a clip and filter by threshold
- `build_edl` — generate Edit Decision List from scored moments
- `validate_edl` — check EDL for errors (timecodes, overlaps, durations)

### `src/vision/moondream_client.py` (200 lines)
Python Moondream API client using `httpx`. Supports:
- `query(image_path, prompt)` — general VLM query
- `detect(image_path, object_name)` — object detection with bounding boxes
- `score_moment(image_path, context)` — structured scoring with JSON parse
- `MOONDREAM_BASE_URL` configurable for local instance swap

### `src/vision/frame_extractor.py` (140 lines)
FFmpeg-based keyframe extraction. Returns manifest: `[{timecode, seconds, image_path, frame_index}]`

### Claude Desktop Config
Example in README for both Windows and macOS `claude_desktop_config.json`.

### Start Scripts
- `start_mcp.bat` (Windows) — creates venv if needed, installs deps, starts server
- `start_mcp.sh` (macOS) — same

## Deviations From Scope
- **Moondream cloud API** instead of on-device VLM (per project decision). Base URL is configurable so local Moondream can be swapped in later.

## What's NOT Tested Yet
- **MCP tools via Claude Desktop**: Tools are registered and load correctly, but no end-to-end test through Claude Desktop has been performed.
- **Moondream API calls**: Client is built and tested for encoding/parsing, but no live API call has been made (requires API key in `.env`).
- **FFmpeg extraction**: Code is written but ffmpeg may not be installed on the dev machine.
