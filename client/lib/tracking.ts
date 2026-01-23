export type TrackingModel = "person" | "ball" | "face" | "multi-object" | "custom";

export interface TrackingModelInfo {
  id: TrackingModel;
  name: string;
  description: string;
  icon: string;
  usesYolo: boolean;
}

export const TRACKING_MODELS: TrackingModelInfo[] = [
  {
    id: "person",
    name: "Person Tracker",
    description: "Optimized for tracking individual people. Best for interviews, presentations, and single-subject scenarios.",
    icon: "user",
    usesYolo: false,
  },
  {
    id: "ball",
    name: "Ball Tracker",
    description: "Specialized for tracking sports balls in motion. Ideal for basketball, soccer, tennis, and other ball sports.",
    icon: "circle",
    usesYolo: false,
  },
  {
    id: "face",
    name: "Face Tracker",
    description: "High-precision face detection and tracking. Perfect for close-up shots, video conferencing, and portrait framing.",
    icon: "smile",
    usesYolo: false,
  },
  {
    id: "multi-object",
    name: "Multi-Object",
    description: "General-purpose object detection. Best for complex scenes with multiple subjects.",
    icon: "grid",
    usesYolo: false,
  },
  {
    id: "custom",
    name: "Custom Object",
    description: "Track any object you describe! Type anything - people, objects, colors, even abstract concepts.",
    icon: "edit-3",
    usesYolo: false,
  },
];

export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
}

export interface PerformanceStats {
  fps: number;
  inferenceTime: number;
  latency: number;
  confidence: number;
  objectCount: number;
  bitrate: number;
  droppedFrames: number;
  modelName: string;
}

export function getModelInfo(modelId: TrackingModel): TrackingModelInfo {
  return TRACKING_MODELS.find((m) => m.id === modelId) || TRACKING_MODELS[0];
}

// Simulated stats for demo purposes
export function generateMockStats(modelId: TrackingModel, isTracking: boolean): PerformanceStats {
  const modelInfo = getModelInfo(modelId);
  
  if (!isTracking) {
    return {
      fps: 0,
      inferenceTime: 0,
      latency: 0,
      confidence: 0,
      objectCount: 0,
      bitrate: 0,
      droppedFrames: 0,
      modelName: modelInfo.name,
    };
  }
  
  return {
    fps: 25 + Math.random() * 10,
    inferenceTime: 15 + Math.random() * 20,
    latency: 180 + Math.random() * 80,
    confidence: 0.75 + Math.random() * 0.2,
    objectCount: Math.floor(1 + Math.random() * 4),
    bitrate: 3.5 + Math.random() * 1.5,
    droppedFrames: Math.floor(Math.random() * 3),
    modelName: modelInfo.name,
  };
}

// Simulated detection boxes for demo
export function generateMockDetections(modelId: TrackingModel): DetectionBox[] {
  const numDetections = Math.floor(1 + Math.random() * 3);
  const boxes: DetectionBox[] = [];
  
  for (let i = 0; i < numDetections; i++) {
    boxes.push({
      x: 0.2 + Math.random() * 0.4,
      y: 0.2 + Math.random() * 0.4,
      width: 0.15 + Math.random() * 0.2,
      height: 0.2 + Math.random() * 0.3,
      confidence: 0.7 + Math.random() * 0.25,
      label: modelId === "person" ? "person" : modelId === "face" ? "face" : modelId === "ball" ? "ball" : "object",
    });
  }
  
  return boxes;
}
