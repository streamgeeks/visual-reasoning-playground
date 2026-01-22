import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

interface DescribeSceneRequest {
  image: string; // base64 encoded image
  apiKey: string;
  prompt?: string;
}

async function describeSceeneWithMoondream(
  imageBase64: string,
  apiKey: string,
  prompt: string = "Describe this scene in detail. What do you see?"
): Promise<string> {
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
    throw new Error(`Moondream API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.answer || data.result || "Unable to describe the scene.";
}

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}
