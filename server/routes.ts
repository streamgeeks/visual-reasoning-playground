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

interface DetectionResult {
  found: boolean;
  x?: number; // normalized 0-1, center of detected object
  y?: number; // normalized 0-1, center of detected object
  confidence?: number;
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
  
  // Use Moondream's point capability to locate object
  const prompt = `Point to the ${objectType} in this image. If you can see a ${objectType}, respond with ONLY the coordinates in format "x,y" where x and y are numbers from 0 to 1 representing the position. If no ${objectType} is visible, respond with "not found".`;
  
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
      const errorText = await response.text();
      console.error(`Moondream detection error: ${response.status} - ${errorText}`);
      return { found: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const answer = (data.answer || "").toLowerCase().trim();
    console.log(`Moondream detection response: ${answer}`);
    
    // Parse the response
    if (answer.includes("not found") || answer.includes("cannot") || answer.includes("don't see") || answer.includes("no ")) {
      return { found: false };
    }
    
    // Try to extract coordinates from response
    // Format could be "0.5,0.5" or "x: 0.5, y: 0.5" or similar
    const coordMatch = answer.match(/(\d+\.?\d*)\s*[,\s]\s*(\d+\.?\d*)/);
    if (coordMatch) {
      const x = parseFloat(coordMatch[1]);
      const y = parseFloat(coordMatch[2]);
      
      // Validate coordinates are in 0-1 range
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        return { found: true, x, y, confidence: 0.8 };
      }
      
      // If values are larger, they might be pixel coordinates - normalize them
      // Assume 640x480 or similar aspect ratio
      if (x > 1 || y > 1) {
        const normalizedX = Math.min(1, x / 100);
        const normalizedY = Math.min(1, y / 100);
        return { found: true, x: normalizedX, y: normalizedY, confidence: 0.6 };
      }
    }
    
    // If we got some response but couldn't parse coords, assume object was found in center
    if (answer.length > 0 && !answer.includes("not") && !answer.includes("no")) {
      return { found: true, x: 0.5, y: 0.5, confidence: 0.4 };
    }
    
    return { found: false };
  } catch (error) {
    console.error("Detection error:", error);
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
