import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { rtspManager } from "./services/rtspManager";

interface DescribeSceneRequest {
  image: string; // base64 encoded image
  apiKey: string;
  prompt?: string;
}

interface DetectObjectRequest {
  image: string; // base64 encoded image
  apiKey: string;
  object: string; // what to detect: "person", "ball", "face", etc.
}

interface YoloDetectRequest {
  image: string; // base64 encoded image
  model_type: string; // person, ball, face, multi-object
}

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

interface DetectionResult {
  found: boolean;
  x?: number; // normalized 0-1, center of detected object
  y?: number; // normalized 0-1, center of detected object
  confidence?: number;
  box?: BoundingBox; // bounding box coordinates (normalized 0-1)
  error?: string;
}

interface CameraConnectRequest {
  cameraId: string;
  ip: string;
  username?: string;
  password?: string;
  streamPath?: string;
}

async function detectObjectWithMoondream(
  imageBase64: string,
  apiKey: string,
  objectType: string
): Promise<DetectionResult> {
  console.log(`Detecting object: ${objectType}, Image size: ${imageBase64.length} chars`);
  
  try {
    // Use Moondream's detect endpoint for bounding boxes
    const response = await fetch("https://api.moondream.ai/v1/detect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Moondream-Auth": apiKey,
      },
      body: JSON.stringify({
        image_url: `data:image/jpeg;base64,${imageBase64}`,
        object: objectType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Moondream detect error: ${response.status} - ${errorText}`);
      
      // Fallback to query endpoint if detect not available
      return await detectObjectWithQuery(imageBase64, apiKey, objectType);
    }

    const data = await response.json();
    console.log(`Moondream detect response:`, JSON.stringify(data).slice(0, 300));
    
    // Parse detection results - Moondream returns objects array with bounding boxes
    const objects = data.objects || [];
    
    if (objects.length === 0) {
      return { found: false };
    }
    
    // Get the first (usually highest confidence) detection
    const detection = objects[0];
    const box = detection.bounding_box || detection.bbox || detection;
    
    // Extract bounding box coordinates (normalized 0-1)
    let x_min = box.x_min ?? box.xmin ?? box.x1 ?? box.left ?? 0;
    let y_min = box.y_min ?? box.ymin ?? box.y1 ?? box.top ?? 0;
    let x_max = box.x_max ?? box.xmax ?? box.x2 ?? box.right ?? 1;
    let y_max = box.y_max ?? box.ymax ?? box.y2 ?? box.bottom ?? 1;
    
    // Calculate center point
    const centerX = (x_min + x_max) / 2;
    const centerY = (y_min + y_max) / 2;
    
    const confidence = detection.confidence ?? detection.score ?? 0.8;
    
    console.log(`Detection found: center=(${centerX.toFixed(2)}, ${centerY.toFixed(2)}), box=(${x_min.toFixed(2)},${y_min.toFixed(2)})-(${x_max.toFixed(2)},${y_max.toFixed(2)})`);
    
    return {
      found: true,
      x: centerX,
      y: centerY,
      confidence,
      box: { x_min, y_min, x_max, y_max },
    };
  } catch (error) {
    console.error("Detection error:", error);
    return { found: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Fallback to query endpoint if detect endpoint not available
async function detectObjectWithQuery(
  imageBase64: string,
  apiKey: string,
  objectType: string
): Promise<DetectionResult> {
  console.log(`Fallback to query endpoint for: ${objectType}`);
  
  const prompt = `Locate the ${objectType} in this image. If visible, respond with the bounding box coordinates in format: "x_min,y_min,x_max,y_max" where values are between 0 and 1. If not visible, say "not found".`;
  
  try {
    const response = await fetch("https://api.moondream.ai/v1/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Moondream-Auth": apiKey,
      },
      body: JSON.stringify({
        image_url: `data:image/jpeg;base64,${imageBase64}`,
        question: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return { found: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const answer = (data.answer || "").toLowerCase().trim();
    console.log(`Moondream query response: ${answer}`);
    
    if (answer.includes("not found") || answer.includes("cannot") || answer.includes("don't see")) {
      return { found: false };
    }
    
    // Try to extract 4 coordinates for bounding box
    const boxMatch = answer.match(/(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)/);
    if (boxMatch) {
      const x_min = parseFloat(boxMatch[1]);
      const y_min = parseFloat(boxMatch[2]);
      const x_max = parseFloat(boxMatch[3]);
      const y_max = parseFloat(boxMatch[4]);
      
      if (x_min >= 0 && x_max <= 1 && y_min >= 0 && y_max <= 1) {
        const centerX = (x_min + x_max) / 2;
        const centerY = (y_min + y_max) / 2;
        return {
          found: true,
          x: centerX,
          y: centerY,
          confidence: 0.7,
          box: { x_min, y_min, x_max, y_max },
        };
      }
    }
    
    // Try to extract 2 coordinates (center point)
    const coordMatch = answer.match(/(\d+\.?\d*)\s*,\s*(\d+\.?\d*)/);
    if (coordMatch) {
      const x = parseFloat(coordMatch[1]);
      const y = parseFloat(coordMatch[2]);
      
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        // Create approximate bounding box around center
        const boxSize = 0.15;
        return {
          found: true,
          x,
          y,
          confidence: 0.6,
          box: {
            x_min: Math.max(0, x - boxSize),
            y_min: Math.max(0, y - boxSize),
            x_max: Math.min(1, x + boxSize),
            y_max: Math.min(1, y + boxSize),
          },
        };
      }
    }
    
    return { found: false };
  } catch (error) {
    return { found: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function describeSceeneWithMoondream(
  imageBase64: string,
  apiKey: string,
  prompt: string = "Describe this scene in detail. What do you see?"
): Promise<string> {
  // Log image size for debugging
  console.log(`Image base64 length: ${imageBase64.length} characters`);
  
  // Use the query endpoint for scene description
  const response = await fetch("https://api.moondream.ai/v1/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Moondream-Auth": apiKey,
    },
    body: JSON.stringify({
      image_url: `data:image/jpeg;base64,${imageBase64}`,
      question: prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Moondream response status: ${response.status}`);
    console.error(`Moondream response body: ${errorText}`);
    throw new Error(`Moondream API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Moondream response:", JSON.stringify(data).slice(0, 200));
  return data.answer || data.caption || data.result || "Unable to describe the scene.";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Moondream object detection endpoint for tracking
  // YOLO detection endpoint - proxies to Python backend
  app.post("/api/yolo/detect", async (req: Request, res: Response) => {
    try {
      const { image, model_type } = req.body as YoloDetectRequest;

      if (!image) {
        return res.status(400).json({ found: false, error: "Image is required" });
      }

      // Proxy to Python RTSP backend
      const pythonResponse = await fetch("http://localhost:8082/api/yolo/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, model_type: model_type || "person" }),
      });

      if (!pythonResponse.ok) {
        const errorText = await pythonResponse.text();
        console.error("YOLO backend error:", errorText);
        return res.status(500).json({ found: false, error: "YOLO detection failed" });
      }

      const result = await pythonResponse.json();
      return res.json(result);
    } catch (error: any) {
      console.error("YOLO detection error:", error);
      return res.status(500).json({ found: false, error: error.message });
    }
  });

  app.post("/api/detect-object", async (req: Request, res: Response) => {
    try {
      const { image, apiKey, object } = req.body as DetectObjectRequest;

      if (!image) {
        return res.status(400).json({ error: "Image is required" });
      }

      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      if (!object) {
        return res.status(400).json({ error: "Object type is required" });
      }

      const result = await detectObjectWithMoondream(image, apiKey, object);
      res.json(result);
    } catch (error) {
      console.error("Error detecting object:", error);
      const message = error instanceof Error ? error.message : "Failed to detect object";
      res.status(500).json({ found: false, error: message });
    }
  });

  // Moondream scene description endpoint
  app.post("/api/describe-scene", async (req: Request, res: Response) => {
    try {
      const { image, apiKey, prompt } = req.body as DescribeSceneRequest;

      if (!image) {
        return res.status(400).json({ error: "Image is required" });
      }

      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      const description = await describeSceeneWithMoondream(
        image,
        apiKey,
        prompt
      );

      res.json({ description });
    } catch (error) {
      console.error("Error describing scene:", error);
      const message =
        error instanceof Error ? error.message : "Failed to describe scene";
      res.status(500).json({ error: message });
    }
  });

  // RTSP Camera Routes
  app.get("/api/rtsp/status", (_req: Request, res: Response) => {
    res.json(rtspManager.getStatus());
  });

  app.post("/api/cameras/connect", async (req: Request, res: Response) => {
    try {
      const { cameraId, ip, username, password, streamPath } = req.body as CameraConnectRequest;

      if (!cameraId || !ip) {
        return res.status(400).json({ error: "Missing required fields: cameraId, ip" });
      }

      const result = await rtspManager.connectCamera(
        cameraId,
        ip,
        username || "admin",
        password || "",
        streamPath || "/1"
      );

      res.json(result);
    } catch (error) {
      console.error("Camera connection error:", error);
      const message = error instanceof Error ? error.message : "Failed to connect";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/cameras/disconnect", async (req: Request, res: Response) => {
    try {
      const { cameraId } = req.body;

      if (!cameraId) {
        return res.status(400).json({ error: "Missing cameraId" });
      }

      const result = await rtspManager.disconnectCamera(cameraId);
      res.json(result);
    } catch (error) {
      console.error("Camera disconnection error:", error);
      const message = error instanceof Error ? error.message : "Failed to disconnect";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/cameras/:cameraId/status", async (req: Request, res: Response) => {
    try {
      const cameraId = req.params.cameraId as string;
      const status = await rtspManager.getCameraStatus(cameraId);

      if (!status) {
        return res.status(404).json({ error: "Camera not found" });
      }

      res.json(status);
    } catch (error) {
      console.error("Status error:", error);
      const message = error instanceof Error ? error.message : "Failed to get status";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/cameras/:cameraId/frame", async (req: Request, res: Response) => {
    try {
      const cameraId = req.params.cameraId as string;
      const frame = await rtspManager.getFrame(cameraId);

      if (!frame) {
        return res.status(404).json({ error: "No frame available" });
      }

      res.set("Content-Type", "image/jpeg");
      res.send(frame);
    } catch (error) {
      console.error("Frame error:", error);
      const message = error instanceof Error ? error.message : "Failed to get frame";
      res.status(500).json({ error: message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
