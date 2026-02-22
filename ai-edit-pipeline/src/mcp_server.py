"""AI Edit Pipeline — MCP Server Entry Point.

This is the main process that Claude Desktop connects to.
It registers all tools (Resolve, Vision AI, Orchestration) as MCP-callable
functions and runs the FastMCP server over stdio transport.

Start with:
    python src/mcp_server.py

Or via the start scripts:
    Windows: start_mcp.bat
    macOS:   ./start_mcp.sh
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure the project root is on sys.path so src.* imports work
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load environment variables from .env if present
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

from mcp.server.fastmcp import FastMCP

from src.utils.logging_config import configure_logging
from src.tools.resolve_tools import register_resolve_tools
from src.tools.vision_tools import register_vision_tools
from src.tools.orchestration_tools import register_orchestration_tools
from src.tools.pipeline_tools import register_pipeline_tools
from src.tools.ingest_tools import register_ingest_tools

# Initialize logging
log_root = configure_logging()
log_root.info("AI Edit Pipeline MCP Server starting...")

# Create the FastMCP server instance
mcp = FastMCP(
    "ptzoptics-ai-edit",
    instructions=(
        "AI-Powered Video Editing Pipeline. "
        "Control DaVinci Resolve, analyze footage with Vision AI, "
        "and assemble edits via natural language."
    ),
)

# Register all tool groups
register_resolve_tools(mcp)
log_root.info("Registered Resolve tools")

register_vision_tools(mcp)
log_root.info("Registered Vision AI tools")

register_orchestration_tools(mcp)
log_root.info("Registered Orchestration tools")

register_pipeline_tools(mcp)
log_root.info("Registered Pipeline tools (end-to-end + refinement)")

register_ingest_tools(mcp)
log_root.info("Registered Ingest tools (file watcher + sessions + multi-camera)")

log_root.info("MCP server ready — all tools registered")


def main():
    """Run the MCP server (stdio transport for Claude Desktop)."""
    log_root.info("Starting MCP server on stdio transport...")
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
