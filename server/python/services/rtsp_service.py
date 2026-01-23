import cv2
import threading
import time
import asyncio
from typing import Optional

class RTSPService:
    def __init__(self, rtsp_url: str):
        self.rtsp_url = rtsp_url
        self.cap: Optional[cv2.VideoCapture] = None
        self.current_frame: Optional[bytes] = None
        self.last_frame_time: Optional[float] = None
        self.frame_count = 0
        self.start_time: Optional[float] = None
        self.is_active = False
        self.lock = threading.Lock()
        self.capture_thread: Optional[threading.Thread] = None
        self.should_stop = False
        
    async def start(self) -> bool:
        print(f"Connecting to RTSP stream: {self.rtsp_url}")
        
        self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
        
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        if not self.cap.isOpened():
            raise Exception("Failed to open RTSP stream. Check camera IP/credentials.")
        
        self.is_active = True
        self.start_time = time.time()
        self.should_stop = False
        
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.capture_thread.start()
        
        timeout = time.time() + 5
        while self.current_frame is None and time.time() < timeout:
            await asyncio.sleep(0.1)
        
        if self.current_frame is None:
            raise Exception("No frames received from camera")
        
        print("RTSP stream connected successfully")
        return True
        
    def _capture_loop(self):
        consecutive_failures = 0
        
        while not self.should_stop:
            try:
                ret, frame = self.cap.read()
                
                if not ret:
                    consecutive_failures += 1
                    if consecutive_failures > 10:
                        print("Too many consecutive failures, stopping stream")
                        self.is_active = False
                        break
                    time.sleep(0.1)
                    continue
                
                consecutive_failures = 0
                
                height, width = frame.shape[:2]
                if width > 1920 or height > 1080:
                    scale = min(1920/width, 1080/height)
                    new_width = int(width * scale)
                    new_height = int(height * scale)
                    frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)
                
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
                _, jpeg_buffer = cv2.imencode('.jpg', frame, encode_param)
                jpeg_bytes = jpeg_buffer.tobytes()
                
                with self.lock:
                    self.current_frame = jpeg_bytes
                    self.last_frame_time = time.time()
                    self.frame_count += 1
                
            except Exception as e:
                print(f"Capture error: {e}")
                time.sleep(0.5)
        
        print("Capture loop ended")
    
    async def get_frame(self) -> Optional[bytes]:
        with self.lock:
            return self.current_frame
    
    def get_frame_rate(self) -> float:
        if not self.start_time or self.frame_count == 0:
            return 0
        
        elapsed = time.time() - self.start_time
        if elapsed > 0:
            return round(self.frame_count / elapsed, 1)
        return 0
    
    def get_last_frame_time(self) -> Optional[float]:
        return self.last_frame_time
    
    def is_connected(self) -> bool:
        if not self.is_active:
            return False
        
        if self.last_frame_time:
            return (time.time() - self.last_frame_time) < 3.0
        
        return False
    
    async def stop(self):
        print("Stopping RTSP service...")
        
        self.should_stop = True
        self.is_active = False
        
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=2.0)
        
        if self.cap:
            self.cap.release()
            self.cap = None
        
        print("RTSP service stopped")
