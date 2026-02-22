"""Structured logging configuration for the AI edit pipeline.

All MCP tool calls, Resolve API calls, and VLM calls are logged with
timestamps, tool names, arguments, results, and durations.
"""

import logging
import os
import sys
from pathlib import Path

from src.utils.paths import pipeline_log_path


_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-24s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def configure_logging(level: str | None = None) -> logging.Logger:
    """Configure the pipeline-wide logging system.

    Args:
        level: Log level string (DEBUG, INFO, WARNING, ERROR). Defaults to
               the LOG_LEVEL environment variable, or INFO.

    Returns:
        The root pipeline logger.
    """
    global _configured
    if _configured:
        return logging.getLogger("ai_edit_pipeline")

    log_level_str = level or os.environ.get("LOG_LEVEL", "INFO")
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)

    logger = logging.getLogger("ai_edit_pipeline")
    logger.setLevel(log_level)
    logger.handlers.clear()

    # Console handler (stderr)
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))
    logger.addHandler(console_handler)

    # File handler
    try:
        log_file = pipeline_log_path()
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(str(log_file), encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)  # always capture full detail to file
        file_handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))
        logger.addHandler(file_handler)
    except (OSError, PermissionError) as exc:
        logger.warning("Could not create log file: %s", exc)

    _configured = True
    return logger


def get_logger(name: str) -> logging.Logger:
    """Get a child logger under the pipeline namespace.

    Usage:
        log = get_logger("resolve_api")
        log.info("Connected to DaVinci Resolve")
    """
    configure_logging()
    return logging.getLogger(f"ai_edit_pipeline.{name}")
