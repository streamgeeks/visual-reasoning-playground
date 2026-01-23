from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import asyncio
import json
import base64
import os
from dotenv import load_dotenv
from services.camera_manager import CameraManager

load_dotenv()

app = FastAPI(
    title="Visual Reasoning RTSP Backend",
    description="RTSP streaming service for PTZ camera control",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

camera_manager = CameraManager()

class CameraConnect(BaseModel):
    cameraId: str
    ip: str
    username: str = "admin"
    password: str = ""
    streamPath: str = "/1"

class CameraDisconnect(BaseModel):
    cameraId: str

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "activeCameras": camera_manager.get_active_count(),
        "uptime": camera_manager.get_uptime()
    }

@app.post("/api/cameras/connect")
async def connect_camera(data: CameraConnect):
    try:
        if data.password:
            rtsp_url = f"rtsp://{data.username}:{data.password}@{data.ip}:554{data.streamPath}"
        else:
            rtsp_url = f"rtsp://{data.ip}:554{data.streamPath}"
        
        success = await camera_manager.connect_camera(data.cameraId, rtsp_url)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to connect to camera")
        
        return {
            "success": True,
            "cameraId": data.cameraId,
            "message": "Camera connected successfully"
        }
    except Exception as e:
        print(f"Connection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cameras/disconnect")
async def disconnect_camera(data: CameraDisconnect):
    try:
        await camera_manager.disconnect_camera(data.cameraId)
        return {
            "success": True,
            "message": "Camera disconnected"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cameras")
async def list_cameras():
    return camera_manager.get_all_cameras()

@app.get("/api/cameras/{camera_id}/status")
async def get_camera_status(camera_id: str):
    status = camera_manager.get_camera_status(camera_id)
    if not status:
        raise HTTPException(status_code=404, detail="Camera not found")
    return status

@app.get("/api/cameras/{camera_id}/frame")
async def get_frame(camera_id: str):
    try:
        frame = await camera_manager.capture_frame(camera_id)
        if frame is None:
            raise HTTPException(status_code=404, detail="No frame available")
        
        return Response(content=frame, media_type="image/jpeg")
    except Exception as e:
        print(f"Frame capture error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket client connected")
    
    camera_id = None
    stream_task = None
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            action = message.get("action")
            
            if action == "subscribe":
                camera_id = message.get("cameraId")
                fps = message.get("fps", 15)
                
                print(f"Client subscribed to camera {camera_id} at {fps} FPS")
                
                if stream_task:
                    stream_task.cancel()
                
                async def stream_frames():
                    interval = 1.0 / fps
                    
                    while True:
                        try:
                            frame = await camera_manager.capture_frame(camera_id)
                            
                            if frame:
                                frame_b64 = base64.b64encode(frame).decode('utf-8')
                                
                                await websocket.send_json({
                                    "type": "frame",
                                    "cameraId": camera_id,
                                    "data": frame_b64,
                                    "timestamp": asyncio.get_event_loop().time()
                                })
                            
                            await asyncio.sleep(interval)
                            
                        except asyncio.CancelledError:
                            break
                        except Exception as e:
                            print(f"Frame streaming error: {e}")
                            await asyncio.sleep(1)
                
                stream_task = asyncio.create_task(stream_frames())
                
            elif action == "unsubscribe":
                if stream_task:
                    stream_task.cancel()
                    stream_task = None
                camera_id = None
                print("Client unsubscribed")
                
            elif action == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if stream_task:
            stream_task.cancel()

@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down, disconnecting all cameras...")
    await camera_manager.disconnect_all()

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("RTSP_PORT", 8082))
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
