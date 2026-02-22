"""Cross-platform path utilities for DaVinci Resolve scripting and pipeline temp files.

All file paths in this project MUST use pathlib.Path -- never hardcode separators.
"""

import os
import sys
import platform
import tempfile
from pathlib import Path


def get_platform() -> str:
    """Return normalized platform name: 'windows', 'macos', or 'linux'."""
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    return system


def resolve_script_api_path() -> Path:
    """Return the Resolve scripting API root directory for the current platform.

    Can be overridden via RESOLVE_SCRIPT_API environment variable.
    """
    env_override = os.environ.get("RESOLVE_SCRIPT_API")
    if env_override:
        return Path(env_override)

    plat = get_platform()
    if plat == "windows":
        programdata = os.environ.get("PROGRAMDATA", r"C:\ProgramData")
        return Path(programdata) / "Blackmagic Design" / "DaVinci Resolve" / "Support" / "Developer" / "Scripting"
    elif plat == "macos":
        return Path("/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
    else:
        return Path("/opt/resolve/Developer/Scripting")


def resolve_script_lib_path() -> Path:
    """Return the path to the Resolve fusion script library (DLL/SO).

    Can be overridden via RESOLVE_SCRIPT_LIB environment variable.
    """
    env_override = os.environ.get("RESOLVE_SCRIPT_LIB")
    if env_override:
        return Path(env_override)

    plat = get_platform()
    if plat == "windows":
        return Path(r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll")
    elif plat == "macos":
        return Path("/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
    else:
        return Path("/opt/resolve/libs/Fusion/fusionscript.so")


def resolve_modules_path() -> Path:
    """Return the path to the Resolve Python modules directory."""
    return resolve_script_api_path() / "Modules"


def ensure_resolve_on_path() -> bool:
    """Add the Resolve scripting modules directory to sys.path if not already present.

    Returns True if the path was found and added (or already present), False if
    the modules directory does not exist.
    """
    modules_dir = resolve_modules_path()
    modules_str = str(modules_dir)

    if not modules_dir.exists():
        return False

    if modules_str not in sys.path:
        sys.path.insert(0, modules_str)
    return True


def temp_frames_dir() -> Path:
    """Return the directory for temporary extracted frames.

    Can be overridden via TEMP_FRAMES_DIR environment variable.
    Defaults to a 'ai_edit_frames' subdirectory in the system temp.
    """
    env_override = os.environ.get("TEMP_FRAMES_DIR")
    if env_override:
        p = Path(env_override)
    else:
        p = Path(tempfile.gettempdir()) / "ai_edit_frames"

    p.mkdir(parents=True, exist_ok=True)
    return p


def pipeline_log_path() -> Path:
    """Return the path for the pipeline log file."""
    return Path(__file__).resolve().parent.parent.parent / "ai-edit-pipeline.log"


def normalize_video_path(path_str: str) -> Path:
    """Normalize a user-provided video path to a resolved absolute Path.

    Handles:
    - Forward/back slashes on any platform
    - Relative paths (resolved against cwd)
    - Home directory expansion (~)
    """
    p = Path(path_str).expanduser()
    if not p.is_absolute():
        p = Path.cwd() / p
    return p.resolve()
