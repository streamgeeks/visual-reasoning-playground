#!/bin/bash
# AI Edit Pipeline — MCP Server Start Script (macOS / Linux)
# Starts the MCP server that Claude Desktop connects to.

echo "========================================"
echo " AI Edit Pipeline — MCP Server"
echo " PTZOptics + DaVinci Resolve + Claude"
echo "========================================"
echo ""

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Install Python 3.10+."
    exit 1
fi

PYTHON=python3

# Activate virtual environment if it exists
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    echo "Activated virtual environment."
else
    echo "No .venv found. Creating virtual environment..."
    $PYTHON -m venv .venv
    source .venv/bin/activate
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "WARNING: No .env file found. Copy .env.example to .env and configure your API keys."
    echo ""
fi

# Start the MCP server
echo "Starting MCP server..."
echo ""
python src/mcp_server.py
