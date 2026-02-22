# AI-Powered Video Editing Pipeline

**Visual Reasoning AI + DaVinci Resolve + Claude MCP**

Point your PTZOptics cameras, press record, walk away — come back to a rough cut.

## Architecture

```
PTZOptics Cameras → Video Files → Visual Reasoning AI (VLM) → Claude (MCP) → DaVinci Resolve
```

| Layer | Technology |
|-------|-----------|
| Camera Input | PTZOptics PTZ cameras (RTSP/NDI/local recording) |
| Vision AI | Moondream VLM (cloud API, local-swappable) |
| LLM Orchestrator | Claude via MCP tools (Claude Desktop) |
| Glue Layer | Python MCP Server (this project) |
| Video Editor | DaVinci Resolve Studio — Python scripting API |

## Quick Start

### Prerequisites

- **Python 3.10+** — [python.org](https://python.org)
- **DaVinci Resolve Studio** — [blackmagicdesign.com](https://www.blackmagicdesign.com/products/davinciresolve)
- **FFmpeg** — `winget install ffmpeg` (Windows) or `brew install ffmpeg` (macOS)
- **Claude Desktop** — [claude.ai/download](https://claude.ai/download)

### Setup

1. **Clone and enter the project:**
   ```bash
   cd ai-edit-pipeline
   ```

2. **Create virtual environment and install dependencies:**
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Moondream API key
   ```

4. **Enable Resolve external scripting:**
   - Open DaVinci Resolve
   - Preferences > General > External Scripting Using > **Local**

5. **Configure Claude Desktop:**

   Add to your `claude_desktop_config.json`:

   **Windows** (`%APPDATA%\Claude\claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "ai-edit-pipeline": {
         "command": "python",
         "args": ["src/mcp_server.py"],
         "cwd": "C:\\path\\to\\ai-edit-pipeline"
       }
     }
   }
   ```

   **macOS** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "ai-edit-pipeline": {
         "command": "python3",
         "args": ["src/mcp_server.py"],
         "cwd": "/path/to/ai-edit-pipeline"
       }
     }
   }
   ```

6. **Start the MCP server:**
   ```bash
   # Windows:
   start_mcp.bat
   # macOS/Linux:
   ./start_mcp.sh
   ```

### Running Tests

```bash
# All tests (no Resolve required — uses mocks):
pytest

# With verbose output:
pytest -v

# Only integration tests (requires running Resolve):
pytest -m integration
```

## Project Structure

```
ai-edit-pipeline/
├── src/
│   ├── resolve_connection.py   # Cross-platform Resolve connection
│   ├── resolve_api.py          # Resolve abstraction layer (THE interface)
│   ├── mcp_server.py           # FastMCP server entry point
│   ├── tools/                  # MCP-callable tool modules
│   ├── vision/                 # VLM integration (Moondream)
│   ├── edit_engine/            # EDL generation, timeline assembly
│   ├── ingest/                 # File watching, session management
│   └── utils/                  # Paths, timecode, logging
├── tests/
│   ├── mocks/mock_resolve.py   # Full Resolve API mock for CI
│   ├── test_resolve_api.py     # Resolve abstraction tests
│   ├── test_resolve_connection.py
│   └── test_timecode.py
├── start_mcp.bat               # Windows one-command start
├── start_mcp.sh                # macOS one-command start
└── requirements.txt
```

## DaVinci Resolve Scripting Setup

### Windows

The Resolve Python modules are located at:
```
C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules
```

The pipeline auto-detects this path. If your install is non-standard, set:
```
RESOLVE_SCRIPT_API=C:\Your\Custom\Path\Scripting
RESOLVE_SCRIPT_LIB=C:\Your\Custom\Path\fusionscript.dll
```

### macOS

The Resolve Python modules are located at:
```
/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules
```

## Phase Status

- [x] **Phase 1** — DaVinci Resolve Python API foundation
- [ ] **Phase 2** — MCP Server build
- [ ] **Phase 3** — AI Edit Decision Loop
- [ ] **Phase 4** — PTZOptics Camera Integration

## Privacy

All video processing happens locally. The only external API call is to Moondream for VLM frame analysis. The `MOONDREAM_BASE_URL` is configurable to point to a local Moondream instance for fully offline operation.

---

*PTZOptics · Visual Reasoning AI*
