"""Tests for resolve_connection.py -- cross-platform Resolve module loading."""

import sys
from unittest.mock import MagicMock, patch

import pytest

from src.resolve_connection import (
    ResolveConnectionError,
    connect_to_resolve,
    get_resolve_module,
    is_resolve_available,
)


class TestGetResolveModule:
    """Tests for the module discovery logic."""

    def test_returns_none_when_no_resolve_installed(self):
        """When no Resolve is installed, get_resolve_module returns None."""
        with patch("src.resolve_connection._try_import_dvr_script", return_value=None), \
             patch("src.resolve_connection.ensure_resolve_on_path", return_value=False), \
             patch("src.resolve_connection._try_dynamic_load", return_value=None):
            assert get_resolve_module() is None

    def test_returns_module_on_direct_import(self):
        """Strategy 1: module found via direct import."""
        mock_module = MagicMock()
        with patch("src.resolve_connection._try_import_dvr_script", return_value=mock_module):
            result = get_resolve_module()
            assert result is mock_module

    def test_returns_module_after_path_injection(self):
        """Strategy 2: module found after injecting path."""
        mock_module = MagicMock()
        call_count = 0

        def import_side_effect():
            nonlocal call_count
            call_count += 1
            return mock_module if call_count > 1 else None

        with patch("src.resolve_connection._try_import_dvr_script", side_effect=import_side_effect), \
             patch("src.resolve_connection.ensure_resolve_on_path", return_value=True):
            result = get_resolve_module()
            assert result is mock_module

    def test_returns_module_via_dynamic_load(self):
        """Strategy 3: module loaded dynamically from DLL/SO."""
        mock_module = MagicMock()
        with patch("src.resolve_connection._try_import_dvr_script", return_value=None), \
             patch("src.resolve_connection.ensure_resolve_on_path", return_value=False), \
             patch("src.resolve_connection._try_dynamic_load", return_value=mock_module):
            result = get_resolve_module()
            assert result is mock_module


class TestConnectToResolve:
    """Tests for the connect_to_resolve function."""

    def test_raises_when_no_module(self):
        """Should raise ResolveConnectionError when module is not found."""
        with patch("src.resolve_connection.get_resolve_module", return_value=None):
            with pytest.raises(ResolveConnectionError, match="scripting module not found"):
                connect_to_resolve()

    def test_raises_when_resolve_not_running(self):
        """Should raise when module loads but Resolve is not running."""
        mock_module = MagicMock()
        mock_module.scriptapp.return_value = None

        with patch("src.resolve_connection.get_resolve_module", return_value=mock_module):
            with pytest.raises(ResolveConnectionError, match="not running"):
                connect_to_resolve()

    def test_connects_via_scriptapp(self):
        """Should connect via scriptapp('Resolve') when available."""
        mock_resolve = MagicMock()
        mock_module = MagicMock()
        mock_module.scriptapp.return_value = mock_resolve

        with patch("src.resolve_connection.get_resolve_module", return_value=mock_module):
            result = connect_to_resolve()
            assert result is mock_resolve
            mock_module.scriptapp.assert_called_once_with("Resolve")

    def test_connects_via_get_resolve(self):
        """Should fall back to GetResolve() if scriptapp is not available."""
        mock_resolve = MagicMock()
        mock_module = MagicMock(spec=[])  # empty spec = no scriptapp
        mock_module.GetResolve = MagicMock(return_value=mock_resolve)

        with patch("src.resolve_connection.get_resolve_module", return_value=mock_module):
            result = connect_to_resolve()
            assert result is mock_resolve


class TestIsResolveAvailable:

    def test_available_when_module_found(self):
        with patch("src.resolve_connection.get_resolve_module", return_value=MagicMock()):
            assert is_resolve_available() is True

    def test_not_available_when_module_missing(self):
        with patch("src.resolve_connection.get_resolve_module", return_value=None):
            assert is_resolve_available() is False
