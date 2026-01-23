import time
import asyncio
from typing import Dict, Optional, Any
from .rtsp_service import RTSPService

class CameraManager:
    def __init__(self):
        self.cameras: Dict[str, RTSPService] = {}
        self.start_time = time.time()
        
    async def connect_camera(self, camera_id: str, rtsp_url: str) -> bool:
        if camera_id in self.cameras:
            await self.disconnect_camera(camera_id)
        
        service = RTSPService(rtsp_url)
        
        try:
            await service.start()
            self.cameras[camera_id] = service
            print(f"Camera {camera_id} connected")
            return True
        except Exception as e:
            print(f"Failed to connect camera {camera_id}: {e}")
            raise e
    
    async def disconnect_camera(self, camera_id: str) -> bool:
        if camera_id not in self.cameras:
            return False
        
        service = self.cameras[camera_id]
        await service.stop()
        del self.cameras[camera_id]
        print(f"Camera {camera_id} disconnected")
        return True
    
    async def disconnect_all(self):
        camera_ids = list(self.cameras.keys())
        for camera_id in camera_ids:
            await self.disconnect_camera(camera_id)
    
    async def capture_frame(self, camera_id: str) -> Optional[bytes]:
        if camera_id not in self.cameras:
            return None
        
        service = self.cameras[camera_id]
        return await service.get_frame()
    
    def get_camera_status(self, camera_id: str) -> Optional[Dict[str, Any]]:
        if camera_id not in self.cameras:
            return None
        
        service = self.cameras[camera_id]
        
        return {
            "cameraId": camera_id,
            "connected": service.is_connected(),
            "fps": service.get_frame_rate(),
            "lastFrameTime": service.get_last_frame_time(),
            "frameCount": service.frame_count
        }
    
    def get_active_count(self) -> int:
        return len(self.cameras)
    
    def get_uptime(self) -> float:
        return round(time.time() - self.start_time, 1)
    
    def get_all_cameras(self) -> Dict[str, Dict[str, Any]]:
        result = {}
        for camera_id in self.cameras:
            status = self.get_camera_status(camera_id)
            if status:
                result[camera_id] = status
        return result
