/**
 * Direct Moondream API client - bypasses server proxy
 * Allows the app to work without running the Express backend
 */

const MOONDREAM_API_BASE = "https://api.moondream.ai/v1";

export interface MoondreamDetectionResult {
  found: boolean;
  x?: number; // normalized 0-1, center of detected object
  y?: number; // normalized 0-1, center of detected object
  confidence?: number;
  box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
  error?: string;
}

/**
 * Describe a scene using Moondream's query endpoint
 */
export async function describeScene(
  imageBase64: string,
  apiKey: string,
  prompt: string = "Describe this scene in detail. What do you see?"
): Promise<{ description: string; error?: string }> {
  try {
    const response = await fetch(`${MOONDREAM_API_BASE}/query`, {
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
      console.error(`Moondream API error: ${response.status} - ${errorText}`);
      return {
        description: "",
        error: `API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      description: data.answer || data.caption || data.result || "Unable to describe the scene.",
    };
  } catch (error) {
    console.error("Moondream describe error:", error);
    return {
      description: "",
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Detect an object using Moondream's detect endpoint
 */
export async function detectObject(
  imageBase64: string,
  apiKey: string,
  objectType: string
): Promise<MoondreamDetectionResult> {
  try {
    // Try the detect endpoint first
    const response = await fetch(`${MOONDREAM_API_BASE}/detect`, {
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
      console.log(`Moondream detect endpoint returned ${response.status}, trying query fallback`);
      // Fallback to query endpoint
      return await detectObjectWithQuery(imageBase64, apiKey, objectType);
    }

    const data = await response.json();
    const objects = data.objects || [];

    if (objects.length === 0) {
      return { found: false };
    }

    // Get the first (usually highest confidence) detection
    const detection = objects[0];
    const box = detection.bounding_box || detection.bbox || detection;

    // Extract bounding box coordinates (normalized 0-1)
    const x_min = box.x_min ?? box.xmin ?? box.x1 ?? box.left ?? 0;
    const y_min = box.y_min ?? box.ymin ?? box.y1 ?? box.top ?? 0;
    const x_max = box.x_max ?? box.xmax ?? box.x2 ?? box.right ?? 1;
    const y_max = box.y_max ?? box.ymax ?? box.y2 ?? box.bottom ?? 1;

    // Calculate center point
    const centerX = (x_min + x_max) / 2;
    const centerY = (y_min + y_max) / 2;

    const confidence = detection.confidence ?? detection.score ?? 0.8;

    return {
      found: true,
      x: centerX,
      y: centerY,
      confidence,
      box: { x_min, y_min, x_max, y_max },
    };
  } catch (error) {
    console.error("Moondream detection error:", error);
    return {
      found: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Fallback detection using the query endpoint with coordinate parsing
 */
async function detectObjectWithQuery(
  imageBase64: string,
  apiKey: string,
  objectType: string
): Promise<MoondreamDetectionResult> {
  const prompt = `Locate the ${objectType} in this image. If visible, respond with the bounding box coordinates in format: "x_min,y_min,x_max,y_max" where values are between 0 and 1. If not visible, say "not found".`;

  try {
    const response = await fetch(`${MOONDREAM_API_BASE}/query`, {
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
     return {
       found: false,
       error: error instanceof Error ? error.message : "Network error",
     };
   }
}

/**
 * Detect all people in an image with sequential IDs and bounding boxes
 * Uses Moondream's query endpoint with a custom prompt
 */
export async function detectNumberedPeople(
  imageBase64: string,
  apiKey: string
): Promise<{ id: string; box: { x_min: number; y_min: number; x_max: number; y_max: number } }[]> {
  const prompt = `Detect all people in this image. For each person, assign a sequential ID starting from 1. Return the results in this exact format:
Person 1: x1,y1,x2,y2
Person 2: x1,y1,x2,y2
...
Where coordinates are normalized 0-1 values (x_min,y_min,x_max,y_max). If no people are detected, respond with "No people detected".`;

  try {
    const response = await fetch(`${MOONDREAM_API_BASE}/query`, {
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
      console.error(`Moondream API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const answer = (data.answer || data.caption || data.result || "").trim();

    if (answer.toLowerCase().includes("no people detected")) {
      return [];
    }

    const results: { id: string; box: { x_min: number; y_min: number; x_max: number; y_max: number } }[] = [];

    // Parse each line: "Person N: x1,y1,x2,y2"
    const lines = answer.split("\n").filter((line: string) => line.trim());

    for (const line of lines) {
      const match = line.match(/Person\s+(\d+)\s*:\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)/i);

      if (match) {
        const personId = match[1];
        const x_min = parseFloat(match[2]);
        const y_min = parseFloat(match[3]);
        const x_max = parseFloat(match[4]);
        const y_max = parseFloat(match[5]);

        // Validate coordinates are in valid range
        if (x_min >= 0 && x_max <= 1 && y_min >= 0 && y_max <= 1 && x_min < x_max && y_min < y_max) {
          results.push({
            id: `Person ${personId}`,
            box: { x_min, y_min, x_max, y_max },
          });
        } else {
          console.warn(`Invalid coordinates for Person ${personId}: ${x_min},${y_min},${x_max},${y_max}`);
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Moondream numbered detection error:", error);
    return [];
  }
}
