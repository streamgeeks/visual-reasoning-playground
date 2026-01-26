export type TrackingModel = 
  | "person" | "ball" | "face" | "multi-object" | "custom"
  | "car" | "dog" | "cat" | "bird" | "sports-ball"
  | "motorcycle" | "truck" | "horse" | "cow" | "bottle" 
  | "chair" | "laptop" | "cell-phone" | "backpack" | "umbrella";

export type VisionRequestType = "human" | "face" | "animal" | null;

/**
 * Tracking mode determines how objects are tracked frame-to-frame
 * - "detection-only": Re-detect with primary backend every frame (YOLO/Vision/Moondream)
 * - "hybrid-vision": Detect with YOLO, then track with Vision's VNTrackObjectRequest (faster)
 */
export type TrackingMode = "detection-only" | "hybrid-vision";

/**
 * Real-time status of what the tracking system is doing
 */
export type TrackingBackendStatus = 
  | "idle"
  | "yolo-detecting"      // Running YOLO detection
  | "vision-detecting"    // Running Vision framework detection
  | "vision-tracking"     // Using VNTrackObjectRequest (fast frame tracking)
  | "moondream-detecting" // Calling Moondream cloud API
  | "reacquiring";        // Lost track, re-detecting

export interface TrackingStatusInfo {
  backend: TrackingBackendStatus;
  lastDetectionMs: number;    // Time for last detection/tracking operation
  trackingFrameCount: number; // Frames tracked without re-detection (hybrid mode)
  reacquisitionCount: number; // Times we lost and re-acquired target
  mode: TrackingMode;
}

export interface TrackingModelInfo {
  id: TrackingModel;
  name: string;
  description: string;
  icon: string;
  usesYolo: boolean;
  usesVision: boolean;
  visionRequest: VisionRequestType;
  yoloLabel?: string;
  fallbackVision?: VisionRequestType;
  fallbackMoondream?: string;
}

export const TRACKING_MODELS: TrackingModelInfo[] = [
  {
    id: "person",
    name: "Person Tracker",
    description: "Optimized for tracking individual people using iOS Vision. Fast, native, works offline.",
    icon: "user",
    usesYolo: false,
    usesVision: true,
    visionRequest: "human",
    yoloLabel: "person",
  },
  {
    id: "face",
    name: "Face Tracker",
    description: "High-precision face detection using iOS Vision. Native, fast, perfect for portraits.",
    icon: "smile",
    usesYolo: false,
    usesVision: true,
    visionRequest: "face",
  },
  {
    id: "car",
    name: "Car Tracker",
    description: "Track vehicles using on-device YOLO. Falls back to AI cloud if YOLO unavailable.",
    icon: "truck",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "car",
    fallbackMoondream: "car or vehicle",
  },
  {
    id: "dog",
    name: "Dog Tracker",
    description: "Track dogs using on-device YOLO. Falls back to Vision animal detection.",
    icon: "heart",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "dog",
    fallbackVision: "animal",
    fallbackMoondream: "dog",
  },
  {
    id: "cat",
    name: "Cat Tracker",
    description: "Track cats using on-device YOLO. Falls back to Vision animal detection.",
    icon: "gitlab",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "cat",
    fallbackVision: "animal",
    fallbackMoondream: "cat",
  },
  {
    id: "sports-ball",
    name: "Sports Ball",
    description: "Track sports balls using on-device YOLO. Falls back to AI cloud.",
    icon: "circle",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "sports ball",
    fallbackMoondream: "ball or sports ball",
  },
  {
    id: "bird",
    name: "Bird Tracker",
    description: "Track birds using on-device YOLO. Falls back to Vision animal detection.",
    icon: "twitter",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "bird",
    fallbackVision: "animal",
    fallbackMoondream: "bird",
  },
  {
    id: "motorcycle",
    name: "Motorcycle",
    description: "Track motorcycles and scooters using on-device YOLO.",
    icon: "zap",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "motorcycle",
    fallbackMoondream: "motorcycle or scooter",
  },
  {
    id: "truck",
    name: "Truck/Bus",
    description: "Track large vehicles - trucks, buses, vans using on-device YOLO.",
    icon: "package",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "truck",
    fallbackMoondream: "truck or bus or van",
  },
  {
    id: "horse",
    name: "Horse",
    description: "Track horses using on-device YOLO. Great for equestrian events.",
    icon: "anchor",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "horse",
    fallbackVision: "animal",
    fallbackMoondream: "horse",
  },
  {
    id: "cow",
    name: "Cow/Cattle",
    description: "Track cattle using on-device YOLO. Great for farm monitoring.",
    icon: "slack",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "cow",
    fallbackVision: "animal",
    fallbackMoondream: "cow or cattle",
  },
  {
    id: "bottle",
    name: "Bottle",
    description: "Track bottles using on-device YOLO.",
    icon: "droplet",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "bottle",
    fallbackMoondream: "bottle",
  },
  {
    id: "chair",
    name: "Chair",
    description: "Track chairs using on-device YOLO. Useful for room monitoring.",
    icon: "square",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "chair",
    fallbackMoondream: "chair",
  },
  {
    id: "laptop",
    name: "Laptop/TV",
    description: "Track laptops and TVs using on-device YOLO.",
    icon: "monitor",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "laptop",
    fallbackMoondream: "laptop or computer screen",
  },
  {
    id: "cell-phone",
    name: "Cell Phone",
    description: "Track cell phones using on-device YOLO.",
    icon: "smartphone",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "cell phone",
    fallbackMoondream: "cell phone or mobile phone",
  },
  {
    id: "backpack",
    name: "Backpack",
    description: "Track backpacks and bags using on-device YOLO.",
    icon: "briefcase",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "backpack",
    fallbackMoondream: "backpack or bag",
  },
  {
    id: "umbrella",
    name: "Umbrella",
    description: "Track umbrellas using on-device YOLO.",
    icon: "cloud-rain",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "umbrella",
    fallbackMoondream: "umbrella",
  },
  {
    id: "ball",
    name: "Ball (Moondream)",
    description: "Specialized for tracking balls using Moondream AI cloud detection.",
    icon: "target",
    usesYolo: false,
    usesVision: false,
    visionRequest: null,
  },
  {
    id: "multi-object",
    name: "Multi-Object",
    description: "General-purpose object detection using Moondream AI.",
    icon: "grid",
    usesYolo: false,
    usesVision: false,
    visionRequest: null,
  },
  {
    id: "custom",
    name: "Custom Object",
    description: "Track any object you describe! Uses Moondream AI for flexible detection.",
    icon: "edit-3",
    usesYolo: false,
    usesVision: false,
    visionRequest: null,
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

export function getYoloLabel(modelId: TrackingModel): string | undefined {
  const info = getModelInfo(modelId);
  return info?.yoloLabel;
}

export function getYoloModels(): TrackingModelInfo[] {
  return TRACKING_MODELS.filter((m) => m.usesYolo);
}

export function getVisionModels(): TrackingModelInfo[] {
  return TRACKING_MODELS.filter((m) => m.usesVision);
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
