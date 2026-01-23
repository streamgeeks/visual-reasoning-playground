from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import json
import base64
import os
import sys
import io
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from services.camera_manager import CameraManager

app = FastAPI(title="RTSP Service")

# YOLO model loading (lazy load on first use)
yolo_model = None
yolo_backend = None  # "ultralytics" or "torch_hub"

def get_yolo_model():
    global yolo_model, yolo_backend
    if yolo_model is None:
        # Try ultralytics first
        try:
            from ultralytics import YOLO
            yolo_model = YOLO("yolov8n.pt")
            yolo_backend = "ultralytics"
            print("YOLOv8 model loaded (ultralytics)", flush=True)
            return yolo_model
        except Exception as e:
            print(f"Ultralytics not available: {e}", file=sys.stderr, flush=True)
        
        # Fallback to torch hub YOLOv5
        try:
            import torch
            yolo_model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
            yolo_model.eval()
            yolo_backend = "torch_hub"
            print("YOLOv5 model loaded (torch hub)", flush=True)
            return yolo_model
        except Exception as e:
            print(f"Torch hub YOLO not available: {e}", file=sys.stderr, flush=True)
            
        return None
    return yolo_model

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

class YoloDetectRequest(BaseModel):
    image: str  # base64 encoded image
    model_type: str = "person"  # person, ball, face, multi-object

class DetectionResult(BaseModel):
    found: bool
    x: Optional[float] = None
    y: Optional[float] = None
    confidence: Optional[float] = None
    box: Optional[dict] = None
    label: Optional[str] = None
    all_detections: List[dict] = []
    error: Optional[str] = None

# YOLO class mappings for each model type
YOLO_CLASS_FILTERS = {
    "person": [0],  # COCO class 0 = person
    "face": [0],    # Use person detection, face is in bounding box upper portion
    "ball": [32, 37],  # sports ball (32), tennis racket area approximation
    "multi-object": None,  # All classes
}

COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
]

def process_ultralytics_results(results, img_width, img_height, model_type, class_filter):
    """Process results from ultralytics YOLO."""
    all_detections = []
    best_detection = None
    best_confidence = 0
    
    for result in results:
        if result.boxes is None:
            continue
            
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            
            if class_filter is not None and cls_id not in class_filter:
                continue
            
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            x1_norm = x1 / img_width
            y1_norm = y1 / img_height
            x2_norm = x2 / img_width
            y2_norm = y2 / img_height
            
            center_x = (x1_norm + x2_norm) / 2
            center_y = (y1_norm + y2_norm) / 2
            
            if model_type == "face" and cls_id == 0:
                face_height = (y2_norm - y1_norm) * 0.25
                center_y = y1_norm + face_height / 2
                y2_norm = y1_norm + face_height
            
            label = COCO_CLASSES[cls_id] if cls_id < len(COCO_CLASSES) else f"class_{cls_id}"
            
            detection = {
                "x": center_x, "y": center_y, "confidence": conf, "label": label,
                "box": {"x_min": x1_norm, "y_min": y1_norm, "x_max": x2_norm, "y_max": y2_norm}
            }
            all_detections.append(detection)
            
            if conf > best_confidence:
                best_confidence = conf
                best_detection = detection
    
    return best_detection, all_detections

def process_torch_hub_results(results, img_width, img_height, model_type, class_filter):
    """Process results from torch hub YOLOv5."""
    all_detections = []
    best_detection = None
    best_confidence = 0
    
    df = results.pandas().xyxy[0]
    
    for _, row in df.iterrows():
        cls_id = int(row['class'])
        conf = float(row['confidence'])
        
        if class_filter is not None and cls_id not in class_filter:
            continue
        
        x1_norm = row['xmin'] / img_width
        y1_norm = row['ymin'] / img_height
        x2_norm = row['xmax'] / img_width
        y2_norm = row['ymax'] / img_height
        
        center_x = (x1_norm + x2_norm) / 2
        center_y = (y1_norm + y2_norm) / 2
        
        if model_type == "face" and cls_id == 0:
            face_height = (y2_norm - y1_norm) * 0.25
            center_y = y1_norm + face_height / 2
            y2_norm = y1_norm + face_height
        
        label = row['name'] if 'name' in row else (COCO_CLASSES[cls_id] if cls_id < len(COCO_CLASSES) else f"class_{cls_id}")
        
        detection = {
            "x": center_x, "y": center_y, "confidence": conf, "label": label,
            "box": {"x_min": x1_norm, "y_min": y1_norm, "x_max": x2_norm, "y_max": y2_norm}
        }
        all_detections.append(detection)
        
        if conf > best_confidence:
            best_confidence = conf
            best_detection = detection
    
    return best_detection, all_detections

@app.post("/api/yolo/detect")
async def yolo_detect(request: YoloDetectRequest) -> DetectionResult:
    """Run YOLO detection on an image."""
    try:
        model = get_yolo_model()
        if model is None:
            return DetectionResult(found=False, error="YOLO model not available")
        
        image_data = base64.b64decode(request.image)
        image = Image.open(io.BytesIO(image_data))
        img_width, img_height = image.size
        
        class_filter = YOLO_CLASS_FILTERS.get(request.model_type)
        
        if yolo_backend == "ultralytics":
            results = model(image, verbose=False)
            if not results or len(results) == 0:
                return DetectionResult(found=False)
            best_detection, all_detections = process_ultralytics_results(
                results, img_width, img_height, request.model_type, class_filter
            )
        else:
            # Torch hub YOLOv5
            results = model(image)
            best_detection, all_detections = process_torch_hub_results(
                results, img_width, img_height, request.model_type, class_filter
            )
        
        if best_detection:
            return DetectionResult(
                found=True,
                x=best_detection["x"],
                y=best_detection["y"],
                confidence=best_detection["confidence"],
                box=best_detection["box"],
                label=best_detection["label"],
                all_detections=all_detections,
            )
        
        return DetectionResult(found=False)
        
    except Exception as e:
        print(f"YOLO detection error: {e}", file=sys.stderr, flush=True)
        return DetectionResult(found=False, error=str(e))

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "activeCameras": camera_manager.get_active_count()
    }

@app.post("/api/cameras/connect")
async def connect_camera(data: CameraConnect):
    try:
        if data.password:
            rtsp_url = f"rtsp://{data.username}:{data.password}@{data.ip}:554{data.streamPath}"
        else:
            rtsp_url = f"rtsp://{data.ip}:554{data.streamPath}"
        
        await camera_manager.connect_camera(data.cameraId, rtsp_url)
        
        return {
            "success": True,
            "cameraId": data.cameraId,
            "message": "Camera connected successfully"
        }
    except Exception as e:
        print(f"Connection error: {e}", file=sys.stderr, flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cameras/disconnect")
async def disconnect_camera(data: CameraDisconnect):
    try:
        await camera_manager.disconnect_camera(data.cameraId)
        return {"success": True, "message": "Camera disconnected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        print(f"Frame error: {e}", file=sys.stderr, flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
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
                            print(f"Stream error: {e}", file=sys.stderr)
                            await asyncio.sleep(1)
                
                stream_task = asyncio.create_task(stream_frames())
                
            elif action == "unsubscribe":
                if stream_task:
                    stream_task.cancel()
                    stream_task = None
                camera_id = None
                
            elif action == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}", file=sys.stderr)
    finally:
        if stream_task:
            stream_task.cancel()

@app.on_event("shutdown")
async def shutdown_event():
    await camera_manager.disconnect_all()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("RTSP_PORT", 8082))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
