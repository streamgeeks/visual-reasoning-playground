"""Shared pytest fixtures for the AI edit pipeline test suite.

Provides a mock Resolve environment so tests run without DaVinci Resolve installed.
Integration tests that require a running Resolve instance are marked with
@pytest.mark.integration and skipped by default.
"""

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.mocks.mock_resolve import MockResolve, create_mock_resolve


@pytest.fixture
def mock_resolve() -> MockResolve:
    """Provide a fresh mock Resolve instance."""
    return create_mock_resolve()


@pytest.fixture
def mock_resolve_api(mock_resolve):
    """Provide a ResolveAPI instance connected to a mock Resolve.

    Patches the connection module so connect_to_resolve() returns the mock.
    """
    from src.resolve_api import ResolveAPI

    api = ResolveAPI()

    with patch("src.resolve_api.connect_to_resolve", return_value=mock_resolve):
        api.connect()

    # Ensure media storage is wired to the current project's pool
    project = mock_resolve.GetProjectManager().GetCurrentProject()
    if project is None:
        project = mock_resolve.GetProjectManager().CreateProject("TestProject")
        api._project = project
        api._media_pool = project.GetMediaPool()

    mock_resolve._media_storage = None  # reset so it picks up current project

    return api


@pytest.fixture
def temp_video_file():
    """Create a temporary file that simulates a video file for import tests."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        f.write(b"\x00" * 1024)  # minimal content
        path = Path(f.name)
    yield path
    try:
        path.unlink()
    except FileNotFoundError:
        pass


@pytest.fixture
def temp_dir():
    """Provide a temporary directory that is cleaned up after the test."""
    d = Path(tempfile.mkdtemp(prefix="ai_edit_test_"))
    yield d
    import shutil
    shutil.rmtree(d, ignore_errors=True)
