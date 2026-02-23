# Testing Handoff — Where We Left Off

**Date:** February 2026
**Status:** All 4 phases coded and unit-tested. Zero live integration tests have been run.

## Current State

| What | Status |
|------|--------|
| Code | All 4 phases complete (28 MCP tools, ~5,600 lines) |
| Unit tests | 114/114 passing (all use mocks, no hardware) |
| Live Resolve test | **NOT DONE** |
| Live Moondream API test | **NOT DONE** |
| Claude Desktop MCP test | **NOT DONE** |
| FFmpeg verified | **NOT DONE** |
| macOS cross-platform test | **NOT DONE** |

## What Needs to Happen Next

### Step 1: Prerequisites Check

```bash
cd ai-edit-pipeline
.venv\Scripts\activate

# Verify Python
python --version  # need 3.10+

# Verify ffmpeg
ffmpeg -version   # install: winget install ffmpeg

# Verify Moondream API key
# Add to .env:  MOONDREAM_API_KEY=md_your_key_here
cp .env.example .env
# Edit .env with your real key
```

### Step 2: Test Resolve Connection

Open DaVinci Resolve Studio, then:
- Preferences > General > External Scripting Using > **Local**
- Have any project open

```bash
python -c "
from src.resolve_connection import connect_to_resolve
resolve = connect_to_resolve()
pm = resolve.GetProjectManager()
print('Connected! Current project:', pm.GetCurrentProject().GetName())
"
```

**If this fails:** Check `RESOLVE_SCRIPT_API` and `RESOLVE_SCRIPT_LIB` paths in `.env`. The connection module tries 3 strategies but the Resolve install path may be non-standard.

### Step 3: Test Resolve API End-to-End

```bash
python -c "
from src.resolve_api import ResolveAPI
api = ResolveAPI()
api.connect()
print('Version:', api.get_resolve_version())
print('Page:', api.get_current_page())
print('Projects:', api.get_project_list())

# Create a test project
api.create_project('AI_Edit_Test')
api.create_timeline('Test_Timeline')
print('Timeline created:', api.get_timeline_name())

# Clean up
api.save_project()
print('Done!')
"
```

### Step 4: Test Moondream API

```bash
python -c "
from src.vision.moondream_client import MoondreamClient
client = MoondreamClient()  # reads from .env
# You'll need a test image:
# result = client.query('path/to/test_frame.jpg', 'Describe this scene')
# print(result)
print('Client initialized, base_url:', client.base_url)
print('API key configured:', bool(client.api_key))
client.close()
"
```

### Step 5: Test FFmpeg Frame Extraction

```bash
python -c "
from src.vision.frame_extractor import check_ffmpeg, extract_keyframes
print('FFmpeg available:', check_ffmpeg())
# With a real video file:
# frames = extract_keyframes('path/to/test_video.mp4', interval_seconds=5)
# print(f'Extracted {len(frames)} frames')
"
```

### Step 6: Test MCP Server Startup

```bash
# This should print all 28 tools and then wait for stdio input:
python src/mcp_server.py
# Ctrl+C to stop
```

### Step 7: Test Claude Desktop Integration

1. Edit `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
    "mcpServers": {
        "ai-edit-pipeline": {
            "command": "C:\\Users\\hughr\\OneDrive\\Desktop\\visual-reasoning-playground\\ai-edit-pipeline\\.venv\\Scripts\\python.exe",
            "args": ["src/mcp_server.py"],
            "cwd": "C:\\Users\\hughr\\OneDrive\\Desktop\\visual-reasoning-playground\\ai-edit-pipeline"
        }
    }
}
```
2. Restart Claude Desktop
3. Ask Claude: "List my DaVinci Resolve projects"
4. Ask Claude: "Import a video file from [path] and create a timeline"

### Step 8: Full End-to-End Demo

With Resolve open, ffmpeg installed, Moondream key configured, and sample footage available:

Tell Claude:
> "Make a 60-second highlight reel from C:\path\to\footage.mp4 focusing on the best moments"

This should trigger `auto_edit` which runs the full pipeline.

## Known Issues / Likely Failure Points

1. **Resolve connection path**: The `fusionscript.dll` path is hardcoded to `C:\Program Files\Blackmagic Design\DaVinci Resolve\`. If Resolve is installed elsewhere, set `RESOLVE_SCRIPT_LIB` in `.env`.

2. **Resolve API version differences**: The `add_title_card` method uses a generator approach that may behave differently across Resolve versions. If it fails, title cards may need manual addition.

3. **Moondream rate limits**: The `batch_analyze_clip` and `get_scored_moments` tools send one API call per keyframe. A 60-second video at 5s intervals = 12 API calls. A 10-minute video = 120 calls. Watch for rate limiting.

4. **FFmpeg not on PATH**: Frame extraction will fail with a clear error message if ffmpeg isn't installed.

5. **MCP server tool count**: The server accesses `mcp._tool_manager._tools` for the count, which is an internal API. If the MCP SDK updates, this line may break (it's only used for logging, not functionality).

## File Inventory

```
ai-edit-pipeline/
├── src/
│   ├── mcp_server.py               # Entry point — 28 tools
│   ├── resolve_api.py              # THE Resolve interface (15 methods)
│   ├── resolve_connection.py       # Cross-platform connection (3 strategies)
│   ├── tools/
│   │   ├── resolve_tools.py        # 9 Resolve MCP tools
│   │   ├── vision_tools.py         # 4 Vision MCP tools
│   │   ├── orchestration_tools.py  # 3 Orchestration MCP tools
│   │   ├── pipeline_tools.py       # 5 Pipeline MCP tools (auto_edit, refine)
│   │   └── ingest_tools.py         # 7 Ingest MCP tools (watcher, sessions)
│   ├── vision/
│   │   ├── moondream_client.py     # Moondream cloud API client
│   │   ├── frame_extractor.py      # FFmpeg keyframe extraction
│   │   └── moment_scorer.py        # Full scoring pipeline
│   ├── edit_engine/
│   │   ├── edl_generator.py        # EDL data structures + generation
│   │   ├── resolve_assembler.py    # EDL -> Resolve timeline
│   │   └── refinement.py           # Conversational edit refinement
│   ├── ingest/
│   │   ├── file_watcher.py         # Directory polling monitor
│   │   ├── session_manager.py      # Named recording sessions
│   │   └── multi_camera.py         # Multi-cam timestamp grouping
│   └── utils/
│       ├── paths.py                # Cross-platform pathlib utilities
│       ├── timecode.py             # SMPTE timecode class
│       └── logging_config.py       # Structured logging
├── tests/                          # 114 tests, all CI-compatible
├── PHASE_1_COMPLETE.md
├── PHASE_2_COMPLETE.md
├── PHASE_3_COMPLETE.md
├── PHASE_4_COMPLETE.md
├── TESTING_HANDOFF.md              # THIS FILE
├── README.md                       # Setup guide
├── start_mcp.bat                   # Windows start script
├── start_mcp.sh                    # macOS start script
├── requirements.txt
├── pyproject.toml
└── .env.example
```

## Still To-Do (Not Code)

- [ ] Run all 8 testing steps above
- [ ] Record a demo video
- [ ] Write `demo/demo_script.md` (canned walkthrough for live demo)
- [ ] Write `demo/one_pager.md` (partnership pitch for Blackmagic Design)
- [ ] Obtain sample PTZ footage for `demo/sample_footage/`
- [ ] macOS cross-platform validation
- [ ] Troubleshooting FAQ based on real integration test results
