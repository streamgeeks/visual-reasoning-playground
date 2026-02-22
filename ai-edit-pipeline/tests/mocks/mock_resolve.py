"""Full mock of the DaVinci Resolve scripting API object hierarchy.

This enables pytest to run without DaVinci Resolve installed. The mock
simulates the entire object graph: Resolve > ProjectManager > Project >
MediaPool > Folder > MediaPoolItem > Timeline > TimelineItem.

Usage in conftest.py:
    from tests.mocks.mock_resolve import create_mock_resolve
    resolve = create_mock_resolve()
"""

from __future__ import annotations

import uuid
from typing import Any, Optional


class MockMediaPoolItem:
    """Simulates a MediaPoolItem (clip) in the Resolve media pool."""

    def __init__(self, name: str, file_path: str = "", frames: int = 900):
        self._name = name
        self._media_id = f"mid_{uuid.uuid4().hex[:8]}"
        self._file_path = file_path
        self._frames = frames
        self._properties = {
            "File Path": file_path,
            "Frames": frames,
            "Clip Name": name,
            "Resolution": "1920x1080",
            "FPS": "29.97",
        }

    def GetName(self) -> str:
        return self._name

    def GetMediaId(self) -> str:
        return self._media_id

    def GetClipProperty(self, key: str = "") -> Any:
        if key:
            return self._properties.get(key, "")
        return dict(self._properties)

    def SetClipProperty(self, key: str, value: Any) -> bool:
        self._properties[key] = value
        return True


class MockTimelineItem:
    """Simulates a TimelineItem on a Resolve timeline."""

    def __init__(self, media_pool_item: MockMediaPoolItem, start_frame: int = 0, end_frame: int = 0):
        self._clip = media_pool_item
        self._start = start_frame
        self._end = end_frame or media_pool_item._frames

    def GetMediaPoolItem(self) -> MockMediaPoolItem:
        return self._clip

    def GetName(self) -> str:
        return self._clip.GetName()

    def GetStart(self) -> int:
        return self._start

    def GetEnd(self) -> int:
        return self._end

    def GetDuration(self) -> int:
        return self._end - self._start


class MockTimeline:
    """Simulates a Resolve Timeline."""

    def __init__(self, name: str, fps: float = 29.97):
        self._name = name
        self._fps = fps
        self._items: list[MockTimelineItem] = []
        self._start_frame = 0
        self._settings = {
            "timelineFrameRate": str(fps),
            "timelineResolutionWidth": "1920",
            "timelineResolutionHeight": "1080",
        }

    def GetName(self) -> str:
        return self._name

    def GetStartFrame(self) -> int:
        return self._start_frame

    def GetEndFrame(self) -> int:
        total = self._start_frame
        for item in self._items:
            total += item.GetDuration()
        return total

    def GetSetting(self, key: str = "") -> Any:
        if key:
            return self._settings.get(key, "")
        return dict(self._settings)

    def SetSetting(self, key: str, value: str) -> bool:
        self._settings[key] = value
        return True

    def GetItemListInTrack(self, track_type: str, track_index: int) -> list:
        if track_type == "video" and track_index == 1:
            return list(self._items)
        return []

    def GetTrackCount(self, track_type: str) -> int:
        return 1

    def _add_item(self, item: MockTimelineItem) -> None:
        self._items.append(item)


class MockFolder:
    """Simulates a MediaPool Folder."""

    def __init__(self, name: str = "Master"):
        self._name = name
        self._clips: list[MockMediaPoolItem] = []
        self._subfolders: list[MockFolder] = []

    def GetName(self) -> str:
        return self._name

    def GetClipList(self) -> list[MockMediaPoolItem]:
        return list(self._clips)

    def GetSubFolderList(self) -> list[MockFolder]:
        return list(self._subfolders)

    def _add_clip(self, clip: MockMediaPoolItem) -> None:
        self._clips.append(clip)


class MockMediaPool:
    """Simulates the Resolve MediaPool."""

    def __init__(self) -> None:
        self._root_folder = MockFolder("Master")
        self._timelines: list[MockTimeline] = []
        self._current_timeline: MockTimeline | None = None

    def GetRootFolder(self) -> MockFolder:
        return self._root_folder

    def AddSubFolder(self, parent: MockFolder, name: str) -> MockFolder:
        folder = MockFolder(name)
        parent._subfolders.append(folder)
        return folder

    def CreateEmptyTimeline(self, name: str) -> MockTimeline | None:
        tl = MockTimeline(name)
        self._timelines.append(tl)
        self._current_timeline = tl
        return tl

    def AppendToTimeline(self, clip_infos: list[dict]) -> list[MockTimelineItem]:
        if self._current_timeline is None:
            return []
        items = []
        for info in clip_infos:
            clip = info.get("mediaPoolItem")
            if clip is None:
                # Generator / title card
                media_type = info.get("mediaType")
                if media_type == 1:
                    gen_clip = MockMediaPoolItem(
                        name=info.get("generatorName", "Title"),
                        frames=info.get("duration", 150),
                    )
                    clip = gen_clip
                else:
                    continue

            start = info.get("startFrame", 0)
            end = info.get("endFrame", clip._frames if isinstance(clip, MockMediaPoolItem) else 900)
            item = MockTimelineItem(clip, start, end)
            self._current_timeline._add_item(item)
            items.append(item)
        return items

    def RefreshFolders(self) -> bool:
        return True


class MockMediaStorage:
    """Simulates the Resolve MediaStorage."""

    def __init__(self, media_pool: MockMediaPool) -> None:
        self._media_pool = media_pool

    def GetMountedVolumeList(self) -> list[str]:
        return ["C:\\", "D:\\"]

    def GetSubFolderList(self, path: str) -> list[str]:
        return []

    def AddItemListToMediaPool(self, *paths: str) -> list[MockMediaPoolItem]:
        clips = []
        for path in paths:
            name = path.split("\\")[-1].split("/")[-1]
            clip = MockMediaPoolItem(name=name, file_path=path, frames=900)
            self._media_pool._root_folder._add_clip(clip)
            clips.append(clip)
        return clips


class MockProject:
    """Simulates a Resolve Project."""

    def __init__(self, name: str) -> None:
        self._name = name
        self._media_pool = MockMediaPool()
        self._current_timeline: MockTimeline | None = None
        self._render_settings: dict = {}
        self._render_jobs: list[str] = []
        self._rendering = False

    def GetName(self) -> str:
        return self._name

    def GetMediaPool(self) -> MockMediaPool:
        return self._media_pool

    def GetTimelineCount(self) -> int:
        return len(self._media_pool._timelines)

    def GetTimelineByIndex(self, idx: int) -> MockTimeline | None:
        if 1 <= idx <= len(self._media_pool._timelines):
            return self._media_pool._timelines[idx - 1]
        return None

    def GetCurrentTimeline(self) -> MockTimeline | None:
        return self._current_timeline or (
            self._media_pool._timelines[-1] if self._media_pool._timelines else None
        )

    def SetCurrentTimeline(self, timeline: MockTimeline) -> bool:
        self._current_timeline = timeline
        self._media_pool._current_timeline = timeline
        return True

    def SetRenderSettings(self, settings: dict) -> bool:
        self._render_settings.update(settings)
        return True

    def SetCurrentRenderFormatAndCodec(self, fmt: str, codec: str) -> bool:
        self._render_settings["format"] = fmt
        self._render_settings["codec"] = codec
        return True

    def AddRenderJob(self) -> str:
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        self._render_jobs.append(job_id)
        return job_id

    def StartRendering(self, *args: Any) -> bool:
        self._rendering = False  # Immediately "complete" in mock
        return True

    def IsRenderingInProgress(self) -> bool:
        return False  # Mock renders instantly

    def GetRenderJobStatus(self, job_id: str) -> dict:
        return {"JobStatus": "Complete", "CompletionPercentage": 100}

    def GetVersion(self) -> list[int]:
        return [19, 1, 2]


class MockProjectManager:
    """Simulates the Resolve ProjectManager."""

    def __init__(self) -> None:
        self._projects: dict[str, MockProject] = {}
        self._current_project: MockProject | None = None

    def CreateProject(self, name: str) -> MockProject | None:
        if name in self._projects:
            return None
        project = MockProject(name)
        self._projects[name] = project
        self._current_project = project
        return project

    def LoadProject(self, name: str) -> MockProject | None:
        project = self._projects.get(name)
        if project:
            self._current_project = project
        return project

    def SaveProject(self) -> bool:
        return self._current_project is not None

    def GetCurrentProject(self) -> MockProject | None:
        return self._current_project

    def GetProjectListInCurrentFolder(self) -> list[str]:
        return list(self._projects.keys())

    def DeleteProject(self, name: str) -> bool:
        if name in self._projects:
            del self._projects[name]
            return True
        return False


class MockResolve:
    """Top-level mock of the DaVinci Resolve application object."""

    def __init__(self) -> None:
        self._project_manager = MockProjectManager()
        self._media_storage: MockMediaStorage | None = None
        self._current_page = "edit"

    def GetProjectManager(self) -> MockProjectManager:
        return self._project_manager

    def GetMediaStorage(self) -> MockMediaStorage:
        if self._media_storage is None:
            project = self._project_manager.GetCurrentProject()
            if project:
                self._media_storage = MockMediaStorage(project.GetMediaPool())
            else:
                self._media_storage = MockMediaStorage(MockMediaPool())
        return self._media_storage

    def OpenPage(self, page: str) -> bool:
        valid = {"media", "cut", "edit", "fusion", "color", "fairlight", "deliver"}
        if page in valid:
            self._current_page = page
            return True
        return False

    def GetCurrentPage(self) -> str:
        return self._current_page

    def GetVersion(self) -> list[int]:
        return [19, 1, 2]

    def Fusion(self) -> None:
        return None


def create_mock_resolve() -> MockResolve:
    """Create a fresh MockResolve instance for testing."""
    return MockResolve()
