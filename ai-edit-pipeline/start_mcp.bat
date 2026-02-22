@echo off
REM AI Edit Pipeline — MCP Server Start Script (Windows)
REM Starts the MCP server that Claude Desktop connects to.

echo ========================================
echo  AI Edit Pipeline — MCP Server
echo  PTZOptics + DaVinci Resolve + Claude
echo ========================================
echo.

REM Check Python version
python --version 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python not found. Install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    echo Activated virtual environment.
) else (
    echo No .venv found. Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Check for .env file
if not exist ".env" (
    echo WARNING: No .env file found. Copy .env.example to .env and configure your API keys.
    echo.
)

REM Start the MCP server
echo Starting MCP server...
echo.
python src\mcp_server.py
