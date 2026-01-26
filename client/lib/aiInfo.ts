export type AIBackend = "vision" | "yolo" | "moondream" | "hybrid" | "custom";

export interface AITechnology {
  name: string;
  type: "on-device" | "cloud";
  description: string;
  icon: string;
  color: string;
}

export interface ToolAIInfo {
  id: string;
  name: string;
  description: string;
  primaryAI: AIBackend;
  technologies: string[];
  howItWorks: string;
  educationalNote: string;
  requiresApiKey: boolean;
  isOnDevice: boolean;
}

export const AI_TECHNOLOGIES: Record<string, AITechnology> = {
  vision: {
    name: "Apple Vision",
    type: "on-device",
    description: "iOS native computer vision framework. Runs entirely on your device using the Neural Engine.",
    icon: "eye",
    color: "#007AFF",
  },
  yolo: {
    name: "YOLOv8n",
    type: "on-device",
    description: "You Only Look Once - real-time object detection model trained on 80 common objects.",
    icon: "zap",
    color: "#34C759",
  },
  moondream: {
    name: "Moondream",
    type: "cloud",
    description: "Visual language model that understands images and answers questions in natural language.",
    icon: "cloud",
    color: "#FF9500",
  },
  coreml: {
    name: "CoreML",
    type: "on-device",
    description: "Apple's machine learning framework that runs models efficiently on iPhone hardware.",
    icon: "cpu",
    color: "#5856D6",
  },
};

export const TOOL_AI_INFO: Record<string, ToolAIInfo> = {
  describe: {
    id: "describe",
    name: "Describe Scene",
    description: "Get an AI-powered description of what the camera sees.",
    primaryAI: "hybrid",
    technologies: ["Apple Vision (VNClassifyImageRequest)", "Moondream VLM (optional)"],
    howItWorks: "Uses iOS Vision framework to classify scenes instantly on-device. When Moondream API key is added, provides richer natural language descriptions via cloud.",
    educationalNote: "On-device AI is faster and works offline. Cloud AI provides more detailed, conversational descriptions.",
    requiresApiKey: false,
    isOnDevice: true,
  },
  chat: {
    id: "chat",
    name: "Camera Chat",
    description: "Have a conversation about what the camera sees.",
    primaryAI: "hybrid",
    technologies: ["Apple Vision (detection & counting)", "Moondream VLM (detailed Q&A)"],
    howItWorks: "Processes your questions to determine if they need counting (Vision) or detailed understanding (Moondream). Can also control PTZ camera via voice.",
    educationalNote: "Vision handles 'how many' questions instantly. Complex questions like 'what is happening' use the cloud model.",
    requiresApiKey: false,
    isOnDevice: true,
  },
  photographer: {
    id: "photographer",
    name: "AI Photographer",
    description: "Automatically captures photos when specific things happen.",
    primaryAI: "moondream",
    technologies: ["Moondream VLM (scene understanding)", "Custom trigger logic"],
    howItWorks: "Continuously analyzes camera frames using Moondream to detect your specified triggers (e.g., 'person smiling', 'dog jumping').",
    educationalNote: "This requires cloud AI because it needs to understand complex, custom descriptions that pre-trained models can't handle.",
    requiresApiKey: true,
    isOnDevice: false,
  },
  huntfind: {
    id: "huntfind",
    name: "Hunt & Find",
    description: "Automatically moves PTZ camera to center on detected objects.",
    primaryAI: "hybrid",
    technologies: ["Apple Vision (VNTrackObjectRequest)", "Moondream (object location)", "PTZ VISCA control"],
    howItWorks: "First detects the object using Vision or Moondream, then uses Vision's tracking to follow it frame-by-frame while sending PTZ commands to keep it centered.",
    educationalNote: "Combines detection (finding the object) with tracking (following it smoothly) - two different AI tasks working together.",
    requiresApiKey: false,
    isOnDevice: true,
  },
  peoplecounter: {
    id: "peoplecounter",
    name: "People Counter",
    description: "Counts the number of people visible in the camera view.",
    primaryAI: "vision",
    technologies: ["Apple Vision (VNDetectHumanRectanglesRequest)"],
    howItWorks: "Uses iOS Vision framework's human body detector to find and count all people in each frame. Runs entirely on-device.",
    educationalNote: "This is pure on-device AI - no internet needed. Apple's Vision framework is optimized to run at 30fps on iPhone's Neural Engine.",
    requiresApiKey: false,
    isOnDevice: true,
  },
  detectall: {
    id: "detectall",
    name: "Detect All Objects",
    description: "Finds and labels all recognizable objects in the scene.",
    primaryAI: "yolo",
    technologies: ["YOLOv8n (80 COCO classes)", "CoreML Neural Engine"],
    howItWorks: "Runs YOLOv8 nano model on-device to detect 80 common object types (people, cars, animals, furniture, etc.) with bounding boxes and confidence scores.",
    educationalNote: "YOLO means 'You Only Look Once' - it processes the entire image in one pass, making it very fast. The 'n' in YOLOv8n means 'nano' - optimized for mobile.",
    requiresApiKey: false,
    isOnDevice: true,
  },
  colormatcher: {
    id: "colormatcher",
    name: "Color Matcher",
    description: "Analyzes and matches colors in the camera view.",
    primaryAI: "custom",
    technologies: ["Custom color extraction algorithm", "HSL color space analysis"],
    howItWorks: "Samples pixels from the camera frame and converts them to HSL color space to identify dominant colors and find matches.",
    educationalNote: "Not all 'AI' is neural networks! This uses traditional computer vision algorithms for precise color analysis.",
    requiresApiKey: false,
    isOnDevice: true,
  },
  tracking: {
    id: "tracking",
    name: "Object Tracking",
    description: "Follows a selected object and moves the PTZ camera to keep it centered.",
    primaryAI: "hybrid",
    technologies: [
      "Apple Vision (person/face detection)",
      "YOLOv8n (object detection)",
      "VNTrackObjectRequest (frame tracking)",
      "Moondream (custom objects)",
    ],
    howItWorks: "Detection varies by target: Vision for people/faces, YOLO for common objects, Moondream for custom descriptions. All use Vision's tracker for smooth frame-to-frame following.",
    educationalNote: "This showcases 'hybrid AI' - choosing the best model for each task. Fast on-device detection, with cloud fallback for unusual objects.",
    requiresApiKey: false,
    isOnDevice: true,
  },
  ptz: {
    id: "ptz",
    name: "PTZ Controls",
    description: "Manual pan, tilt, and zoom control of the camera.",
    primaryAI: "custom",
    technologies: ["VISCA protocol", "No AI - direct hardware control"],
    howItWorks: "Sends VISCA commands over IP to control PTZ camera movement. This is pure hardware control, no AI involved.",
    educationalNote: "Not everything needs AI! Sometimes direct control is best. This tool shows the baseline that AI tools build upon.",
    requiresApiKey: false,
    isOnDevice: true,
  },
};

export function getToolAIInfo(toolId: string): ToolAIInfo | undefined {
  return TOOL_AI_INFO[toolId];
}

export function getAIBadgeInfo(toolId: string): { label: string; color: string; icon: string } {
  const info = TOOL_AI_INFO[toolId];
  if (!info) return { label: "Unknown", color: "#888", icon: "help-circle" };

  switch (info.primaryAI) {
    case "vision":
      return { label: "Vision", color: "#007AFF", icon: "eye" };
    case "yolo":
      return { label: "YOLO", color: "#34C759", icon: "zap" };
    case "moondream":
      return { label: "Cloud", color: "#FF9500", icon: "cloud" };
    case "hybrid":
      return { label: "Hybrid", color: "#5856D6", icon: "layers" };
    case "custom":
      return { label: "Custom", color: "#888", icon: "tool" };
    default:
      return { label: "AI", color: "#888", icon: "cpu" };
  }
}

export const ONBOARDING_SLIDES = [
  {
    id: "welcome",
    title: "Welcome to Visual Reasoning",
    subtitle: "Learn how AI sees the world",
    description: "This app demonstrates different AI technologies for computer vision - from on-device models to cloud APIs.",
    icon: "eye",
  },
  {
    id: "on-device",
    title: "On-Device AI",
    subtitle: "Fast, private, works offline",
    description: "Apple Vision and YOLOv8 run entirely on your iPhone's Neural Engine. Your images never leave your device.",
    icon: "smartphone",
    examples: ["People Counter", "Detect All", "Object Tracking"],
  },
  {
    id: "cloud-ai",
    title: "Cloud AI",
    subtitle: "Powerful understanding",
    description: "Moondream is a Visual Language Model that can understand complex scenes and answer questions in natural language.",
    icon: "cloud",
    examples: ["AI Photographer", "Detailed Descriptions"],
  },
  {
    id: "hybrid",
    title: "Hybrid Approach",
    subtitle: "Best of both worlds",
    description: "Many tools combine on-device speed with cloud intelligence - fast for simple tasks, powerful for complex ones.",
    icon: "layers",
    examples: ["Camera Chat", "Hunt & Find"],
  },
  {
    id: "explore",
    title: "Tap to Learn More",
    subtitle: "Every tool has an info button",
    description: "Tap the ℹ️ icon on any tool to learn exactly which AI technologies power it and how they work.",
    icon: "info",
  },
];
