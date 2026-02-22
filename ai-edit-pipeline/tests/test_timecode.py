"""Tests for the Timecode utility class."""

import pytest

from src.utils.timecode import Timecode, seconds_to_smpte, smpte_to_seconds, frames_to_smpte


class TestTimecodeCreation:

    def test_from_smpte_full(self):
        tc = Timecode.from_smpte("01:23:45:10", fps=30)
        assert tc.hours == 1
        assert tc.minutes == 23
        assert tc.seconds == 45
        assert tc.frames == 10

    def test_from_smpte_no_frames(self):
        tc = Timecode.from_smpte("00:05:30", fps=30)
        assert tc.hours == 0
        assert tc.minutes == 5
        assert tc.seconds == 30
        assert tc.frames == 0

    def test_from_smpte_semicolon_drop_frame(self):
        tc = Timecode.from_smpte("01:00:00;15", fps=29.97)
        assert tc.hours == 1
        assert tc.frames == 15

    def test_from_smpte_invalid(self):
        with pytest.raises(ValueError, match="Invalid SMPTE"):
            Timecode.from_smpte("12:34")

    def test_from_frames(self):
        tc = Timecode.from_frames(5400, fps=30)
        assert tc.hours == 0
        assert tc.minutes == 3
        assert tc.seconds == 0
        assert tc.frames == 0

    def test_from_seconds(self):
        tc = Timecode.from_seconds(90.0, fps=30)
        assert tc.to_smpte() == "00:01:30:00"


class TestTimecodeConversion:

    def test_to_frames(self):
        tc = Timecode(hours=0, minutes=1, seconds=0, frames=0, fps=30)
        assert tc.to_frames() == 1800

    def test_to_seconds(self):
        tc = Timecode(hours=0, minutes=1, seconds=30, frames=0, fps=30)
        assert tc.to_seconds() == 90.0

    def test_to_smpte(self):
        tc = Timecode(hours=1, minutes=2, seconds=3, frames=4, fps=30)
        assert tc.to_smpte() == "01:02:03:04"

    def test_roundtrip_frames(self):
        original_frames = 12345
        tc = Timecode.from_frames(original_frames, fps=30)
        assert tc.to_frames() == original_frames

    def test_roundtrip_smpte(self):
        original = "00:15:30:12"
        tc = Timecode.from_smpte(original, fps=30)
        assert tc.to_smpte() == original


class TestTimecodeArithmetic:

    def test_add(self):
        a = Timecode.from_seconds(60, fps=30)
        b = Timecode.from_seconds(30, fps=30)
        result = a + b
        assert result.to_seconds() == 90.0

    def test_subtract(self):
        a = Timecode.from_seconds(90, fps=30)
        b = Timecode.from_seconds(30, fps=30)
        result = a - b
        assert result.to_seconds() == 60.0

    def test_subtract_negative_raises(self):
        a = Timecode.from_seconds(10, fps=30)
        b = Timecode.from_seconds(20, fps=30)
        with pytest.raises(ValueError, match="negative"):
            a - b

    def test_comparison(self):
        a = Timecode.from_seconds(30, fps=30)
        b = Timecode.from_seconds(60, fps=30)
        assert a < b
        assert a <= b
        assert b > a
        assert b >= a
        assert a != b

    def test_equality(self):
        a = Timecode.from_smpte("00:01:00:00", fps=30)
        b = Timecode.from_frames(1800, fps=30)
        assert a == b
        assert hash(a) == hash(b)


class TestConvenienceFunctions:

    def test_seconds_to_smpte(self):
        assert seconds_to_smpte(90.0, fps=30) == "00:01:30:00"

    def test_smpte_to_seconds(self):
        assert smpte_to_seconds("00:01:30:00", fps=30) == 90.0

    def test_frames_to_smpte(self):
        assert frames_to_smpte(2700, fps=30) == "00:01:30:00"
