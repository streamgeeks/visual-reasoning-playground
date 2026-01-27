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
  benefitsFromApiKey: boolean;
  isOnDevice: boolean;
}

export const AI_TECHNOLOGIES: Record<string, AITechnology> = {
  vision: {
    name: "Apple Vision",
    type: "on-device",
    description:
      "iOS native computer vision framework. Runs entirely on your device using the Neural Engine.",
    icon: "eye",
    color: "#007AFF",
  },
  yolo: {
    name: "YOLOv8n",
    type: "on-device",
    description:
      "You Only Look Once - real-time object detection model trained on 80 common objects.",
    icon: "zap",
    color: "#34C759",
  },
  moondream: {
    name: "Moondream",
    type: "cloud",
    description:
      "Visual language model that understands images and answers questions in natural language.",
    icon: "cloud",
    color: "#FF9500",
  },
  coreml: {
    name: "CoreML",
    type: "on-device",
    description:
      "Apple's machine learning framework that runs models efficiently on iPhone hardware.",
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
    technologies: [
      "Apple Vision (VNClassifyImageRequest) - quick tags",
      "YOLOv8n - object detection context",
      "Moondream VLM - natural language (optional)",
    ],
    howItWorks:
      "Three-tier system: (1) Vision provides instant scene tags, (2) YOLO adds object counts for structured data, (3) Moondream generates narrative descriptions when API key is available. Vision context is injected into Moondream prompts to ground responses.",
    educationalNote:
      "This demonstrates tiered AI: start fast and free (Vision), add detail on-device (YOLO), only hit the cloud when you need natural language. Each tier builds on the previous.",
    requiresApiKey: false,
    benefitsFromApiKey: true,
    isOnDevice: true,
  },
  chat: {
    id: "chat",
    name: "Camera Chat",
    description: "Have a conversation about what the camera sees.",
    primaryAI: "hybrid",
    technologies: [
      "Local intent parsing (regex)",
      "Apple Vision (counting, gestures, faces)",
      "YOLOv8n (object detection)",
      "Moondream VLM (complex reasoning)",
    ],
    howItWorks:
      "Smart routing: Questions are parsed locally first. 'How many people?' routes to Vision. 'Is there a ball?' routes to YOLO. Complex queries like 'What is the person holding?' go to Moondream. Vision findings are injected as context into cloud queries to prevent hallucinations.",
    educationalNote:
      "This is an 'orchestrator' pattern - the system picks the cheapest, fastest AI that can answer your question. Only 10-20% of queries actually need cloud AI.",
    requiresApiKey: false,
    benefitsFromApiKey: true,
    isOnDevice: true,
  },
  photographer: {
    id: "photographer",
    name: "AI Photographer",
    description: "Automatically captures photos when specific things happen.",
    primaryAI: "hybrid",
    technologies: [
      "Apple Vision (VNDetectHandPoseRequest) - gestures",
      "Apple Vision (VNDetectFaceLandmarksRequest) - smile",
      "Moondream VLM (custom triggers only)",
    ],
    howItWorks:
      "Preset triggers (wave, smile, thumbs up, peace, pointing) run on-device using Vision's hand pose and face landmark detection at 30fps - no API key needed. Custom natural language triggers (e.g., 'person wearing red hat') use Moondream cloud API.",
    educationalNote:
      "This is now a hybrid system! Standard gestures detect instantly on-device. Custom triggers still need cloud AI for flexibility. Watch the smartphone/cloud icons on each trigger.",
    requiresApiKey: false,
    benefitsFromApiKey: true,
    isOnDevice: true,
  },
  huntfind: {
    id: "huntfind",
    name: "Hunt & Find",
    description:
      "Automatically moves PTZ camera to center on detected objects.",
    primaryAI: "hybrid",
    technologies: [
      "Moondream VLM (object discovery)",
      "Apple Vision (VNTrackObjectRequest)",
      "PTZ VISCA control loop",
    ],
    howItWorks:
      "Three-phase system: (1) Moondream scans the room to find and locate arbitrary objects, (2) Vision's tracker takes over for smooth 30fps frame-to-frame following, (3) A proportional control loop sends PTZ commands to keep the object centered. If tracking is lost, Moondream re-acquires.",
    educationalNote:
      "Cloud AI finds things (slow but flexible), on-device AI tracks them (fast and smooth). This hybrid approach gives you the best of both: you can find 'the blue coffee mug' but track it at real-time speed.",
    requiresApiKey: false,
    benefitsFromApiKey: true,
    isOnDevice: true,
  },
  peoplecounter: {
    id: "peoplecounter",
    name: "People Counter",
    description: "Counts the number of people visible in the camera view.",
    primaryAI: "vision",
    technologies: ["Apple Vision (VNDetectHumanRectanglesRequest)"],
    howItWorks:
      "Uses iOS Vision framework's human body detector to find and count all people in each frame. Runs entirely on-device.",
    educationalNote:
      "This is pure on-device AI - no internet needed. Apple's Vision framework is optimized to run at 30fps on iPhone's Neural Engine.",
    requiresApiKey: false,
    benefitsFromApiKey: false,
    isOnDevice: true,
  },
  detectall: {
    id: "detectall",
    name: "Detect All Objects",
    description: "Finds and labels all recognizable objects in the scene.",
    primaryAI: "yolo",
    technologies: ["YOLOv8n (80 COCO classes)", "CoreML Neural Engine"],
    howItWorks:
      "Runs YOLOv8 nano model on-device to detect 80 common object types (people, cars, animals, furniture, etc.) with bounding boxes and confidence scores.",
    educationalNote:
      "YOLO means 'You Only Look Once' - it processes the entire image in one pass, making it very fast. The 'n' in YOLOv8n means 'nano' - optimized for mobile.",
    requiresApiKey: false,
    benefitsFromApiKey: false,
    isOnDevice: true,
  },
  colormatcher: {
    id: "colormatcher",
    name: "Color Matcher",
    description: "Analyzes and matches colors in the camera view.",
    primaryAI: "custom",
    technologies: [
      "Custom color extraction algorithm",
      "HSL color space analysis",
    ],
    howItWorks:
      "Samples pixels from the camera frame and converts them to HSL color space to identify dominant colors and find matches.",
    educationalNote:
      "Not all 'AI' is neural networks! This uses traditional computer vision algorithms for precise color analysis.",
    requiresApiKey: false,
    benefitsFromApiKey: false,
    isOnDevice: true,
  },
  tracking: {
    id: "tracking",
    name: "Object Tracking",
    description:
      "Follows a selected object and moves the PTZ camera to keep it centered.",
    primaryAI: "hybrid",
    technologies: [
      "Apple Vision (people, faces, animals)",
      "YOLOv8n (80 COCO object classes)",
      "VNTrackObjectRequest (frame-to-frame)",
      "Moondream (custom object fallback)",
    ],
    howItWorks:
      "Tiered detection: People/faces → Vision (best-in-class). Common objects (cars, balls, furniture) → YOLO (80 classes). Custom descriptions ('red mug') → Moondream. Once detected, ALL objects use Vision's VNTrackObjectRequest for smooth 30fps tracking regardless of how they were found.",
    educationalNote:
      "Key insight: Detection and tracking are separate problems. Use the best detector for each object type, but always use Vision's fast tracker. This avoids calling slow cloud APIs every frame.",
    requiresApiKey: false,
    benefitsFromApiKey: true,
    isOnDevice: true,
  },
  ptz: {
    id: "ptz",
    name: "PTZ Controls",
    description: "Manual pan, tilt, and zoom control of the camera.",
    primaryAI: "custom",
    technologies: ["VISCA protocol", "No AI - direct hardware control"],
    howItWorks:
      "Sends VISCA commands over IP to control PTZ camera movement. This is pure hardware control, no AI involved.",
    educationalNote:
      "Not everything needs AI! Sometimes direct control is best. This tool shows the baseline that AI tools build upon.",
    requiresApiKey: false,
    benefitsFromApiKey: false,
    isOnDevice: true,
  },
};

export function getToolAIInfo(toolId: string): ToolAIInfo | undefined {
  return TOOL_AI_INFO[toolId];
}

export function getAIBadgeInfo(toolId: string): {
  label: string;
  color: string;
  icon: string;
  benefitsFromApiKey: boolean;
} {
  const info = TOOL_AI_INFO[toolId];
  if (!info)
    return {
      label: "Unknown",
      color: "#888",
      icon: "help-circle",
      benefitsFromApiKey: false,
    };

  const benefitsFromApiKey = info.benefitsFromApiKey;

  switch (info.primaryAI) {
    case "vision":
      return {
        label: "Vision",
        color: "#007AFF",
        icon: "eye",
        benefitsFromApiKey,
      };
    case "yolo":
      return {
        label: "YOLO",
        color: "#34C759",
        icon: "zap",
        benefitsFromApiKey,
      };
    case "moondream":
      return {
        label: "Cloud",
        color: "#FF9500",
        icon: "cloud",
        benefitsFromApiKey,
      };
    case "hybrid":
      return {
        label: "Hybrid",
        color: "#5856D6",
        icon: "layers",
        benefitsFromApiKey,
      };
    case "custom":
      return {
        label: "Custom",
        color: "#888",
        icon: "tool",
        benefitsFromApiKey,
      };
    default:
      return { label: "AI", color: "#888", icon: "cpu", benefitsFromApiKey };
  }
}

export interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  image?: any; // require() image source
  examples?: string[];
  link?: {
    text: string;
    url: string;
  };
  toolCategories?: {
    label: string;
    tools: string[];
    color: string;
  }[];
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "ptzoptics",
    title: "Works with PTZOptics",
    subtitle: "AI-Powered Camera Control",
    description:
      "AI-powered robotics and much more. Connect your PTZOptics camera to unlock intelligent tracking, automation, and color matching.",
    icon: "video",
    image: require("@/assets/images/ptzoptics-camera.png"),
  },
  {
    id: "welcome",
    title: "Welcome to Visual Reasoning",
    subtitle: "Learn how AI sees the world",
    description:
      "This app demonstrates different AI technologies for computer vision - showing when to use on-device models vs cloud APIs.",
    icon: "eye",
  },
  {
    id: "on-device",
    title: "On-Device AI",
    subtitle: "Fast, private, works offline",
    description:
      "Apple Vision excels at people and faces. YOLOv8 detects 80 common objects. Both run on your iPhone's Neural Engine at 30fps - your images never leave your device.",
    icon: "smartphone",
    examples: ["People Counter", "Detect All", "Color Matcher"],
  },
  {
    id: "cloud-ai",
    title: "Cloud AI",
    subtitle: "Flexible understanding",
    description:
      "Moondream understands custom descriptions like 'person in red shirt' that pre-trained models can't handle. Use it when on-device models aren't enough.",
    icon: "cloud",
    examples: ["Custom Triggers", "Custom Object Search"],
  },
  {
    id: "hybrid",
    title: "Smart Routing",
    subtitle: "Use the cheapest AI that works",
    description:
      "Tools like Chat parse your question locally, then route to Vision (counting), YOLO (objects), or Moondream (complex queries). Most questions never need cloud AI.",
    icon: "layers",
    examples: ["Camera Chat", "Hunt & Find", "Object Tracking"],
  },
  {
    id: "api-key",
    title: "Moondream API Key",
    subtitle: "Optional - unlock cloud features",
    description:
      "Most tools work fully on-device without an API key. A free Moondream key unlocks advanced features like custom object search and natural language descriptions.",
    icon: "key",
    toolCategories: [
      {
        label: "Works fully on-device",
        tools: [
          "People Counter",
          "Detect All",
          "Color Matcher",
          "PTZ Controls",
          "Preset Triggers",
        ],
        color: "#34C759",
      },
      {
        label: "Enhanced with API key",
        tools: [
          "Chat",
          "Describe",
          "AI Photographer",
          "Tracking",
          "Hunt & Find",
        ],
        color: "#FF9500",
      },
    ],
    link: {
      text: "Get free API key →",
      url: "https://console.moondream.ai/",
    },
  },
  {
    id: "explore",
    title: "Tap to Learn More",
    subtitle: "Every tool has an info button",
    description:
      "Tap the ℹ️ icon on any tool to see exactly which AI powers it and why that choice was made.",
    icon: "info",
  },
];
