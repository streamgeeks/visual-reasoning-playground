export type TrackingModel = 
  | "person" | "ball" | "face" | "multi-object" | "custom"
  | "car" | "dog" | "cat" | "bird" | "sports-ball"
  | "motorcycle" | "truck" | "horse" | "cow" | "bottle" 
  | "chair" | "laptop" | "cell-phone" | "backpack" | "umbrella"
  | "bicycle" | "bus" | "train" | "boat" | "airplane"
  | "sheep" | "elephant" | "bear" | "zebra" | "giraffe"
  | "bench" | "couch" | "bed" | "dining-table" | "toilet"
  | "tv" | "microwave" | "oven" | "toaster" | "refrigerator"
  | "book" | "clock" | "vase" | "scissors" | "teddy-bear"
  | "banana" | "apple" | "orange" | "pizza" | "cake"
  | "tennis-racket" | "skateboard" | "surfboard" | "frisbee" | "kite"
  | "handbag" | "suitcase" | "tie" | "potted-plant" | "sink"
  | "basketball" | "football" | "soccer-ball" | "volleyball" | "baseball"
  | "baseball-bat" | "baseball-glove" | "snowboard" | "skis" | "golf-ball";

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
    id: "bicycle",
    name: "Bicycle",
    description: "Track bicycles using on-device YOLO.",
    icon: "circle",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "bicycle",
    fallbackMoondream: "bicycle",
  },
  {
    id: "bus",
    name: "Bus",
    description: "Track buses using on-device YOLO.",
    icon: "truck",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "bus",
    fallbackMoondream: "bus",
  },
  {
    id: "train",
    name: "Train",
    description: "Track trains using on-device YOLO.",
    icon: "navigation",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "train",
    fallbackMoondream: "train",
  },
  {
    id: "boat",
    name: "Boat",
    description: "Track boats using on-device YOLO.",
    icon: "anchor",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "boat",
    fallbackMoondream: "boat",
  },
  {
    id: "airplane",
    name: "Airplane",
    description: "Track airplanes using on-device YOLO.",
    icon: "send",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "aeroplane",
    fallbackMoondream: "airplane",
  },
  {
    id: "sheep",
    name: "Sheep",
    description: "Track sheep using on-device YOLO.",
    icon: "cloud",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "sheep",
    fallbackVision: "animal",
    fallbackMoondream: "sheep",
  },
  {
    id: "elephant",
    name: "Elephant",
    description: "Track elephants using on-device YOLO.",
    icon: "maximize",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "elephant",
    fallbackVision: "animal",
    fallbackMoondream: "elephant",
  },
  {
    id: "bear",
    name: "Bear",
    description: "Track bears using on-device YOLO.",
    icon: "shield",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "bear",
    fallbackVision: "animal",
    fallbackMoondream: "bear",
  },
  {
    id: "zebra",
    name: "Zebra",
    description: "Track zebras using on-device YOLO.",
    icon: "align-justify",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "zebra",
    fallbackVision: "animal",
    fallbackMoondream: "zebra",
  },
  {
    id: "giraffe",
    name: "Giraffe",
    description: "Track giraffes using on-device YOLO.",
    icon: "trending-up",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "giraffe",
    fallbackVision: "animal",
    fallbackMoondream: "giraffe",
  },
  {
    id: "bench",
    name: "Bench",
    description: "Track benches using on-device YOLO.",
    icon: "minus",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "bench",
    fallbackMoondream: "bench",
  },
  {
    id: "couch",
    name: "Couch/Sofa",
    description: "Track couches and sofas using on-device YOLO.",
    icon: "sidebar",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "couch",
    fallbackMoondream: "couch or sofa",
  },
  {
    id: "bed",
    name: "Bed",
    description: "Track beds using on-device YOLO.",
    icon: "moon",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "bed",
    fallbackMoondream: "bed",
  },
  {
    id: "dining-table",
    name: "Dining Table",
    description: "Track dining tables using on-device YOLO.",
    icon: "layout",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "dining table",
    fallbackMoondream: "dining table",
  },
  {
    id: "toilet",
    name: "Toilet",
    description: "Track toilets using on-device YOLO.",
    icon: "droplet",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "toilet",
    fallbackMoondream: "toilet",
  },
  {
    id: "tv",
    name: "TV/Monitor",
    description: "Track TVs and monitors using on-device YOLO.",
    icon: "tv",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "tv",
    fallbackMoondream: "tv or television or monitor",
  },
  {
    id: "microwave",
    name: "Microwave",
    description: "Track microwaves using on-device YOLO.",
    icon: "box",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "microwave",
    fallbackMoondream: "microwave",
  },
  {
    id: "oven",
    name: "Oven",
    description: "Track ovens using on-device YOLO.",
    icon: "thermometer",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "oven",
    fallbackMoondream: "oven",
  },
  {
    id: "toaster",
    name: "Toaster",
    description: "Track toasters using on-device YOLO.",
    icon: "layers",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "toaster",
    fallbackMoondream: "toaster",
  },
  {
    id: "refrigerator",
    name: "Refrigerator",
    description: "Track refrigerators using on-device YOLO.",
    icon: "hard-drive",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "refrigerator",
    fallbackMoondream: "refrigerator or fridge",
  },
  {
    id: "book",
    name: "Book",
    description: "Track books using on-device YOLO.",
    icon: "book",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "book",
    fallbackMoondream: "book",
  },
  {
    id: "clock",
    name: "Clock",
    description: "Track clocks using on-device YOLO.",
    icon: "clock",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "clock",
    fallbackMoondream: "clock",
  },
  {
    id: "vase",
    name: "Vase",
    description: "Track vases using on-device YOLO.",
    icon: "coffee",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "vase",
    fallbackMoondream: "vase",
  },
  {
    id: "scissors",
    name: "Scissors",
    description: "Track scissors using on-device YOLO.",
    icon: "scissors",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "scissors",
    fallbackMoondream: "scissors",
  },
  {
    id: "teddy-bear",
    name: "Teddy Bear",
    description: "Track teddy bears and plush toys using on-device YOLO.",
    icon: "heart",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "teddy bear",
    fallbackMoondream: "teddy bear or plush toy",
  },
  {
    id: "banana",
    name: "Banana",
    description: "Track bananas using on-device YOLO.",
    icon: "moon",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "banana",
    fallbackMoondream: "banana",
  },
  {
    id: "apple",
    name: "Apple",
    description: "Track apples using on-device YOLO.",
    icon: "disc",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "apple",
    fallbackMoondream: "apple",
  },
  {
    id: "orange",
    name: "Orange",
    description: "Track oranges using on-device YOLO.",
    icon: "sun",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "orange",
    fallbackMoondream: "orange",
  },
  {
    id: "pizza",
    name: "Pizza",
    description: "Track pizza using on-device YOLO.",
    icon: "pie-chart",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "pizza",
    fallbackMoondream: "pizza",
  },
  {
    id: "cake",
    name: "Cake",
    description: "Track cakes using on-device YOLO.",
    icon: "gift",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "cake",
    fallbackMoondream: "cake",
  },
  {
    id: "tennis-racket",
    name: "Tennis Racket",
    description: "Track tennis rackets using on-device YOLO.",
    icon: "activity",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "tennis racket",
    fallbackMoondream: "tennis racket",
  },
  {
    id: "skateboard",
    name: "Skateboard",
    description: "Track skateboards using on-device YOLO.",
    icon: "minus",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "skateboard",
    fallbackMoondream: "skateboard",
  },
  {
    id: "surfboard",
    name: "Surfboard",
    description: "Track surfboards using on-device YOLO.",
    icon: "wind",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "surfboard",
    fallbackMoondream: "surfboard",
  },
  {
    id: "frisbee",
    name: "Frisbee",
    description: "Track frisbees using on-device YOLO.",
    icon: "disc",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "frisbee",
    fallbackMoondream: "frisbee",
  },
  {
    id: "kite",
    name: "Kite",
    description: "Track kites using on-device YOLO.",
    icon: "wind",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "kite",
    fallbackMoondream: "kite",
  },
  {
    id: "handbag",
    name: "Handbag",
    description: "Track handbags and purses using on-device YOLO.",
    icon: "shopping-bag",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "handbag",
    fallbackMoondream: "handbag or purse",
  },
  {
    id: "suitcase",
    name: "Suitcase",
    description: "Track suitcases and luggage using on-device YOLO.",
    icon: "briefcase",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "suitcase",
    fallbackMoondream: "suitcase or luggage",
  },
  {
    id: "tie",
    name: "Tie",
    description: "Track ties using on-device YOLO.",
    icon: "bookmark",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "tie",
    fallbackMoondream: "tie or necktie",
  },
  {
    id: "potted-plant",
    name: "Potted Plant",
    description: "Track potted plants using on-device YOLO.",
    icon: "feather",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "potted plant",
    fallbackMoondream: "potted plant",
  },
  {
    id: "sink",
    name: "Sink",
    description: "Track sinks using on-device YOLO.",
    icon: "droplet",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "sink",
    fallbackMoondream: "sink",
  },
  {
    id: "basketball",
    name: "Basketball",
    description: "Track basketballs using on-device YOLO.",
    icon: "circle",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "sports ball",
    fallbackMoondream: "basketball",
  },
  {
    id: "football",
    name: "Football",
    description: "Track footballs (American) using on-device YOLO.",
    icon: "hexagon",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "sports ball",
    fallbackMoondream: "american football",
  },
  {
    id: "soccer-ball",
    name: "Soccer Ball",
    description: "Track soccer balls using on-device YOLO.",
    icon: "circle",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "sports ball",
    fallbackMoondream: "soccer ball",
  },
  {
    id: "volleyball",
    name: "Volleyball",
    description: "Track volleyballs using on-device YOLO.",
    icon: "circle",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "sports ball",
    fallbackMoondream: "volleyball",
  },
  {
    id: "baseball",
    name: "Baseball",
    description: "Track baseballs using on-device YOLO.",
    icon: "circle",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "sports ball",
    fallbackMoondream: "baseball",
  },
  {
    id: "baseball-bat",
    name: "Baseball Bat",
    description: "Track baseball bats using on-device YOLO.",
    icon: "minus",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "baseball bat",
    fallbackMoondream: "baseball bat",
  },
  {
    id: "baseball-glove",
    name: "Baseball Glove",
    description: "Track baseball gloves using on-device YOLO.",
    icon: "hand",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "baseball glove",
    fallbackMoondream: "baseball glove or mitt",
  },
  {
    id: "snowboard",
    name: "Snowboard",
    description: "Track snowboards using on-device YOLO.",
    icon: "wind",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "snowboard",
    fallbackMoondream: "snowboard",
  },
  {
    id: "skis",
    name: "Skis",
    description: "Track skis using on-device YOLO.",
    icon: "slash",
    usesYolo: true,
    usesVision: false,
    visionRequest: null,
    yoloLabel: "skis",
    fallbackMoondream: "skis",
  },
  {
    id: "golf-ball",
    name: "Golf Ball",
    description: "Track golf balls using Moondream AI (too small for YOLO).",
    icon: "circle",
    usesYolo: false,
    usesVision: false,
    visionRequest: null,
    fallbackMoondream: "golf ball",
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
