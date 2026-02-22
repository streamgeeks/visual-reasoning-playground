"""Cross-platform DaVinci Resolve connection manager.

Handles the platform-specific complexity of finding and loading the Resolve
scripting modules. This module is the ONLY place that imports
DaVinciResolveScript directly. All other code uses resolve_api.py.

Supports:
    - Windows 10/11 (primary)
    - macOS 13 Ventura+ (secondary)
    - Linux (best-effort)

Connection strategies (tried in order):
    1. Import DaVinciResolveScript from sys.path (if env vars are set correctly)
    2. Inject the modules path into sys.path and retry import
    3. Dynamic load of fusionscript.dll/.so via importlib
"""

from __future__ import annotations

import importlib
import importlib.util
import sys
from typing import Any, Optional

from src.utils.logging_config import get_logger
from src.utils.paths import (
    ensure_resolve_on_path,
    get_platform,
    resolve_modules_path,
    resolve_script_lib_path,
)

log = get_logger("resolve_connection")


class ResolveConnectionError(Exception):
    """Raised when unable to connect to a running DaVinci Resolve instance."""


def _try_import_dvr_script() -> Any:
    """Attempt to import DaVinciResolveScript via standard Python import."""
    try:
        import DaVinciResolveScript as dvr_script  # type: ignore[import-not-found]
        return dvr_script
    except ImportError:
        return None


def _try_dynamic_load() -> Any:
    """Attempt to dynamically load fusionscript from the known library path.

    This is the fallback strategy when the environment variables aren't set
    and the standard import fails. Works on Windows with the .dll path.
    """
    lib_path = resolve_script_lib_path()
    if not lib_path.exists():
        log.debug("Fusion script library not found at %s", lib_path)
        return None

    try:
        spec = importlib.util.spec_from_file_location("fusionscript", str(lib_path))
        if spec is None or spec.loader is None:
            return None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except (OSError, ImportError, AttributeError) as e:
        log.debug("Dynamic load of fusionscript failed: %s", e)
        return None


def get_resolve_module() -> Any:
    """Find and return the Resolve scripting module.

    Tries multiple strategies in order:
        1. Direct import (works if PYTHONPATH includes Resolve modules)
        2. Inject modules path and retry import
        3. Dynamic load of fusionscript library

    Returns:
        The loaded scripting module, or None if not available.
    """
    # Strategy 1: direct import
    dvr = _try_import_dvr_script()
    if dvr is not None:
        log.debug("Resolve module found via direct import")
        return dvr

    # Strategy 2: inject path, retry
    if ensure_resolve_on_path():
        dvr = _try_import_dvr_script()
        if dvr is not None:
            log.debug("Resolve module found after path injection (%s)", resolve_modules_path())
            return dvr

    # Strategy 3: dynamic load
    bmd = _try_dynamic_load()
    if bmd is not None:
        log.debug("Resolve module loaded dynamically from %s", resolve_script_lib_path())
        return bmd

    log.warning("Could not find DaVinci Resolve scripting module on this system")
    return None


def connect_to_resolve() -> Any:
    """Connect to a running DaVinci Resolve instance.

    DaVinci Resolve must be running with external scripting enabled:
        Preferences > General > External Scripting Using > Local

    Returns:
        The Resolve application object.

    Raises:
        ResolveConnectionError: If Resolve is not running or the scripting
            module cannot be loaded.
    """
    module = get_resolve_module()

    if module is None:
        raise ResolveConnectionError(
            "DaVinci Resolve scripting module not found. "
            "Ensure Resolve Studio is installed and the scripting API "
            "paths are configured. See README.md for setup instructions."
        )

    # Try the standard DaVinciResolveScript approach first
    if hasattr(module, "scriptapp"):
        resolve = module.scriptapp("Resolve")
    elif hasattr(module, "GetResolve"):
        resolve = module.GetResolve()
    else:
        raise ResolveConnectionError(
            "Loaded Resolve module does not have scriptapp() or GetResolve(). "
            f"Module type: {type(module)}, attrs: {dir(module)[:10]}"
        )

    if resolve is None:
        raise ResolveConnectionError(
            "DaVinci Resolve is not running, or external scripting is not enabled. "
            "Open Resolve and check: Preferences > General > External Scripting Using > Local"
        )

    log.info("Connected to DaVinci Resolve on %s", get_platform())
    return resolve


def is_resolve_available() -> bool:
    """Check if DaVinci Resolve scripting module is available (not necessarily running).

    Useful for tests that need to know if integration tests can run.
    """
    return get_resolve_module() is not None
