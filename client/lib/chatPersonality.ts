export interface AppFeature {
  id: string;
  name: string;
  description: string;
  command: string;
  category: "vision" | "camera" | "detection" | "tracking" | "settings" | "fun";
  availableOn: ("native" | "ptz")[];
  requiresApiKey?: boolean;
  funFact?: string;
}

export const APP_FEATURES: AppFeature[] = [
  {
    id: "describe_scene",
    name: "Scene Description",
    description: "I can describe everything I see in detail",
    command: "What do you see?",
    category: "vision",
    availableOn: ["native", "ptz"],
    funFact: "I analyze the image using AI to give you a detailed breakdown!",
  },
  {
    id: "count_people",
    name: "People Counter",
    description: "Count how many people are in view",
    command: "How many people?",
    category: "vision",
    availableOn: ["native", "ptz"],
    funFact: "I use Apple's Vision framework - it works even offline!",
  },
  {
    id: "find_faces",
    name: "Face Finder",
    description: "Detect and highlight all visible faces",
    command: "Find all faces",
    category: "detection",
    availableOn: ["native", "ptz"],
  },
  {
    id: "detect_objects",
    name: "Object Detection",
    description: "Find and label all objects in the scene",
    command: "Show me all objects",
    category: "detection",
    availableOn: ["native", "ptz"],
    funFact: "I can detect 80+ different object types!",
  },
  {
    id: "i_spy",
    name: "I Spy Game",
    description: "Play I Spy - I'll find interesting objects for you to guess",
    command: "Let's play I spy",
    category: "fun",
    availableOn: ["native", "ptz"],
    funFact: "A fun way to explore what's around you!",
  },
  {
    id: "pan_camera",
    name: "Pan Control",
    description: "Rotate the camera left or right",
    command: "Pan left/right",
    category: "camera",
    availableOn: ["ptz"],
    funFact: "Try 'pan left slowly' or 'pan right a lot' for precise control!",
  },
  {
    id: "tilt_camera",
    name: "Tilt Control",
    description: "Tilt the camera up or down",
    command: "Tilt up/down",
    category: "camera",
    availableOn: ["ptz"],
  },
  {
    id: "zoom_camera",
    name: "Zoom Control",
    description: "Zoom in for close-ups or out for wide shots",
    command: "Zoom in/out",
    category: "camera",
    availableOn: ["ptz"],
    funFact: "Say 'zoom in a little' or 'zoom out a lot' to control how much!",
  },
  {
    id: "track_object",
    name: "Object Tracking",
    description: "I'll find something and automatically zoom in on it",
    command: "Zoom in on the [object]",
    category: "tracking",
    availableOn: ["ptz"],
    requiresApiKey: true,
    funFact: "I use AI to find the object, then track it as I zoom!",
  },
  {
    id: "go_home",
    name: "Home Position",
    description: "Return the camera to its home position",
    command: "Go home",
    category: "camera",
    availableOn: ["ptz"],
  },
  {
    id: "presets",
    name: "Camera Presets",
    description: "Save and recall camera positions",
    command: "Go to preset 1 / Save as preset 2",
    category: "camera",
    availableOn: ["ptz"],
    funFact: "Save your favorite views and jump back to them instantly!",
  },
  {
    id: "hunt_and_find",
    name: "Hunt & Find",
    description: "I remember where objects are from previous scans",
    command: "Find my [object]",
    category: "tracking",
    availableOn: ["ptz"],
    funFact:
      "First run a room scan in the Hunt & Find tab, then I can locate items for you!",
  },
  {
    id: "warmth",
    name: "Color Warmth",
    description: "Make the image warmer (orange) or cooler (blue)",
    command: "Make it warmer/cooler",
    category: "settings",
    availableOn: ["native"],
  },
  {
    id: "brightness",
    name: "Brightness",
    description: "Adjust how bright or dark the image appears",
    command: "Make it brighter/darker",
    category: "settings",
    availableOn: ["native"],
  },
];

export function getAvailableFeatures(isPtz: boolean): AppFeature[] {
  const mode = isPtz ? "ptz" : "native";
  return APP_FEATURES.filter((f) => f.availableOn.includes(mode));
}

export function getFeaturesByCategory(
  isPtz: boolean,
  category: AppFeature["category"],
): AppFeature[] {
  return getAvailableFeatures(isPtz).filter((f) => f.category === category);
}

export function getRandomFeatureSuggestion(
  isPtz: boolean,
  excludeIds: string[] = [],
): AppFeature | null {
  const available = getAvailableFeatures(isPtz).filter(
    (f) => !excludeIds.includes(f.id),
  );
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export type ResponseMood =
  | "excited"
  | "helpful"
  | "playful"
  | "casual"
  | "informative";

const RESPONSE_OPENERS: Record<ResponseMood, string[]> = {
  excited: ["Ooh!", "Nice!", "Sweet!", "Awesome!", "Cool!", "Yes!", "Alright!"],
  helpful: [
    "Got it!",
    "Sure thing!",
    "On it!",
    "You got it!",
    "No problem!",
    "Absolutely!",
  ],
  playful: [
    "Let's see here...",
    "Hmm, interesting!",
    "Ooh, let me look...",
    "Alright, checking...",
    "One sec...",
  ],
  casual: ["Okay,", "Alright,", "So,", "Well,", ""],
  informative: [
    "Here's what I found:",
    "I can see that",
    "Looking at this,",
    "From what I see,",
  ],
};

const RESPONSE_CLOSERS: Record<ResponseMood, string[]> = {
  excited: ["Pretty cool, right?", "Love it!", "How's that?", "There you go!"],
  helpful: [
    "Let me know if you need anything else!",
    "What else can I help with?",
    "Anything else?",
    "Happy to help!",
  ],
  playful: [
    "Want to try something else?",
    "What should we explore next?",
    "This is fun!",
    "What else should I look for?",
  ],
  casual: ["", "There you go.", "Done!"],
  informative: ["", "Hope that helps!"],
};

export function getRandomOpener(mood: ResponseMood): string {
  const openers = RESPONSE_OPENERS[mood];
  return openers[Math.floor(Math.random() * openers.length)];
}

export function getRandomCloser(mood: ResponseMood): string {
  const closers = RESPONSE_CLOSERS[mood];
  return closers[Math.floor(Math.random() * closers.length)];
}

export type ActionType = "default" | "repeatable" | "toggle";

export interface InlineAction {
  text: string;
  command: string;
  color: string;
  icon?: string;
  actionType?: ActionType;
  repeatDelay?: number;
  toggleOffCommand?: string;
  toggleState?: boolean;
}

export interface EnrichedResponse {
  message: string;
  inlineActions: InlineAction[];
  suggestedFollowUp?: string;
}

const ACTION_COLORS = {
  pan: "#007AFF",
  tilt: "#5856D6",
  zoom: "#34C759",
  home: "#FF9500",
  preset: "#AF52DE",
  detect: "#FF2D55",
  describe: "#5AC8FA",
  track: "#FF3B30",
  settings: "#8E8E93",
  brightness: "#FFCC00",
  warmth: "#FF9500",
  focus: "#5AC8FA",
};

export const REPEATABLE_COMMANDS: Record<
  string,
  { delay: number; category: string }
> = {
  "pan left": { delay: 150, category: "ptz" },
  "pan right": { delay: 150, category: "ptz" },
  "tilt up": { delay: 150, category: "ptz" },
  "tilt down": { delay: 150, category: "ptz" },
  "zoom in": { delay: 200, category: "ptz" },
  "zoom out": { delay: 200, category: "ptz" },
  "zoom in a little": { delay: 150, category: "ptz" },
  "zoom out a little": { delay: 150, category: "ptz" },
  "focus near": { delay: 200, category: "ptz" },
  "focus far": { delay: 200, category: "ptz" },
  "make it brighter": { delay: 100, category: "native" },
  "make it darker": { delay: 100, category: "native" },
  "make it warmer": { delay: 100, category: "native" },
  "make it cooler": { delay: 100, category: "native" },
  "brightness up": { delay: 100, category: "native" },
  "brightness down": { delay: 100, category: "native" },
};

export function isRepeatableCommand(command: string): boolean {
  return command.toLowerCase() in REPEATABLE_COMMANDS;
}

export function getRepeatDelay(command: string): number {
  return REPEATABLE_COMMANDS[command.toLowerCase()]?.delay || 200;
}

export interface ActionableWord {
  pattern: RegExp;
  command: string;
  color: string;
}

const PTZ_ACTIONABLE_WORDS: ActionableWord[] = [
  {
    pattern: /\b(pan left)\b/gi,
    command: "pan left",
    color: ACTION_COLORS.pan,
  },
  {
    pattern: /\b(pan right)\b/gi,
    command: "pan right",
    color: ACTION_COLORS.pan,
  },
  { pattern: /\b(tilt up)\b/gi, command: "tilt up", color: ACTION_COLORS.tilt },
  {
    pattern: /\b(tilt down)\b/gi,
    command: "tilt down",
    color: ACTION_COLORS.tilt,
  },
  { pattern: /\b(zoom in)\b/gi, command: "zoom in", color: ACTION_COLORS.zoom },
  {
    pattern: /\b(zoom out)\b/gi,
    command: "zoom out",
    color: ACTION_COLORS.zoom,
  },
  { pattern: /\b(go home)\b/gi, command: "go home", color: ACTION_COLORS.home },
  { pattern: /\b(preset \d+)\b/gi, command: "$0", color: ACTION_COLORS.preset },
  {
    pattern: /\b(find objects|detect objects|show objects)\b/gi,
    command: "show me all objects",
    color: ACTION_COLORS.detect,
  },
  {
    pattern: /\b(count people|find people)\b/gi,
    command: "count people",
    color: ACTION_COLORS.detect,
  },
  {
    pattern: /\b(find faces|detect faces)\b/gi,
    command: "find all faces",
    color: ACTION_COLORS.detect,
  },
];

const NATIVE_ACTIONABLE_WORDS: ActionableWord[] = [
  {
    pattern: /\b(find objects|detect objects|show objects)\b/gi,
    command: "show me all objects",
    color: ACTION_COLORS.detect,
  },
  {
    pattern: /\b(count people|find people)\b/gi,
    command: "count people",
    color: ACTION_COLORS.detect,
  },
  {
    pattern: /\b(find faces|detect faces)\b/gi,
    command: "find all faces",
    color: ACTION_COLORS.detect,
  },
  {
    pattern: /\b(make it warmer|warmer)\b/gi,
    command: "make it warmer",
    color: "#FF9500",
  },
  {
    pattern: /\b(make it cooler|cooler)\b/gi,
    command: "make it cooler",
    color: "#5AC8FA",
  },
  {
    pattern: /\b(make it brighter|brighter)\b/gi,
    command: "make it brighter",
    color: "#FFCC00",
  },
  {
    pattern: /\b(make it darker|darker)\b/gi,
    command: "make it darker",
    color: "#8E8E93",
  },
  {
    pattern: /\b(I spy|play I spy)\b/gi,
    command: "let's play I spy",
    color: ACTION_COLORS.detect,
  },
];

export function getActionableWords(isPtz: boolean): ActionableWord[] {
  return isPtz
    ? [...PTZ_ACTIONABLE_WORDS, ...NATIVE_ACTIONABLE_WORDS]
    : NATIVE_ACTIONABLE_WORDS;
}

export interface ParsedMessageSegment {
  type: "text" | "action" | "detection";
  content: string;
  command?: string;
  color?: string;
}

export function parseMessageForActions(
  message: string,
  isPtz: boolean,
  detectionLabels?: string[],
  detectionColors?: Map<string, string>,
): ParsedMessageSegment[] {
  const segments: ParsedMessageSegment[] = [];
  const actionableWords = getActionableWords(isPtz);

  interface MatchInfo {
    start: number;
    end: number;
    text: string;
    type: "action" | "detection";
    command?: string;
    color: string;
  }

  const allMatches: MatchInfo[] = [];

  for (const actionWord of actionableWords) {
    let match;
    const regex = new RegExp(actionWord.pattern.source, "gi");
    while ((match = regex.exec(message)) !== null) {
      const command =
        actionWord.command === "$0" ? match[0] : actionWord.command;
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        type: "action",
        command,
        color: actionWord.color,
      });
    }
  }

  if (detectionLabels && detectionLabels.length > 0) {
    const sortedLabels = [...detectionLabels].sort(
      (a, b) => b.length - a.length,
    );
    for (const label of sortedLabels) {
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b(${escapedLabel})\\b`, "gi");
      let match;
      while ((match = regex.exec(message)) !== null) {
        const overlaps = allMatches.some(
          (m) =>
            (match!.index >= m.start && match!.index < m.end) ||
            (match!.index + match![0].length > m.start &&
              match!.index + match![0].length <= m.end),
        );
        if (!overlaps) {
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            type: "detection",
            color: detectionColors?.get(label.toLowerCase()) || "#007AFF",
          });
        }
      }
    }
  }

  allMatches.sort((a, b) => a.start - b.start);

  let lastIndex = 0;
  for (const match of allMatches) {
    if (match.start > lastIndex) {
      segments.push({
        type: "text",
        content: message.slice(lastIndex, match.start),
      });
    }
    segments.push({
      type: match.type,
      content: match.text,
      command: match.command,
      color: match.color,
    });
    lastIndex = match.end;
  }

  if (lastIndex < message.length) {
    segments.push({
      type: "text",
      content: message.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: "text", content: message }];
}

export interface ResponseContext {
  isPtz: boolean;
  hasApiKey: boolean;
  recentActions: string[];
  detectionCount?: number;
  objectsFound?: string[];
  peopleCount?: number;
}

const MOVEMENT_RESPONSES: Record<string, Record<string, string[]>> = {
  pan: {
    left: ["Panning left", "Swinging left", "Looking left", "Turning left"],
    right: [
      "Panning right",
      "Swinging right",
      "Looking right",
      "Turning right",
    ],
  },
  tilt: {
    up: ["Looking up", "Tilting up", "Pointing up"],
    down: ["Looking down", "Tilting down", "Pointing down"],
  },
  zoom: {
    in: ["Zooming in", "Getting closer", "Moving in"],
    out: ["Zooming out", "Pulling back", "Going wider"],
  },
};

export function getMovementResponse(
  action: "pan" | "tilt" | "zoom",
  direction: string,
  amount?: "little" | "some" | "lot",
): EnrichedResponse {
  const responses = MOVEMENT_RESPONSES[action]?.[direction] || [
    `${action}ing ${direction}`,
  ];
  const base = responses[Math.floor(Math.random() * responses.length)];

  const amountSuffix =
    amount === "little" ? " a bit" : amount === "lot" ? " a lot" : "";
  const opener = Math.random() > 0.5 ? getRandomOpener("helpful") + " " : "";

  const message = `${opener}${base}${amountSuffix}!`;

  const oppositeDir =
    direction === "left"
      ? "right"
      : direction === "right"
        ? "left"
        : direction === "up"
          ? "down"
          : direction === "down"
            ? "up"
            : direction === "in"
              ? "out"
              : "in";

  const actionColor = ACTION_COLORS[action] || "#007AFF";
  const sameCmd = `${action} ${direction}`;
  const oppositeCmd = `${action} ${oppositeDir}`;

  const inlineActions: InlineAction[] = [
    {
      text: `${direction}`,
      command: sameCmd,
      color: actionColor,
      actionType: "repeatable",
      repeatDelay: getRepeatDelay(sameCmd),
    },
    {
      text: oppositeDir,
      command: oppositeCmd,
      color: actionColor,
      actionType: "repeatable",
      repeatDelay: getRepeatDelay(oppositeCmd),
    },
  ];

  if (action === "zoom") {
    inlineActions.push({
      text: "find objects",
      command: "show me all objects",
      color: ACTION_COLORS.detect,
    });
  }

  return { message, inlineActions };
}

export function getDetectionResponse(
  detectType: string,
  count: number,
  labels?: string[],
  isPtz: boolean = false,
): EnrichedResponse {
  const opener = getRandomOpener(count > 0 ? "excited" : "casual");
  let message: string;
  const inlineActions: InlineAction[] = [];

  if (count === 0) {
    const noResultResponses = [
      `${opener} I don't see any ${detectType} right now.`,
      `Hmm, no ${detectType} visible at the moment.`,
      `Can't spot any ${detectType} from here.`,
    ];
    message =
      noResultResponses[Math.floor(Math.random() * noResultResponses.length)];

    if (isPtz) {
      inlineActions.push(
        {
          text: "left",
          command: "pan left",
          color: ACTION_COLORS.pan,
          actionType: "repeatable",
          repeatDelay: 150,
        },
        {
          text: "right",
          command: "pan right",
          color: ACTION_COLORS.pan,
          actionType: "repeatable",
          repeatDelay: 150,
        },
        {
          text: "scan again",
          command: "show me all objects",
          color: ACTION_COLORS.detect,
        },
      );
    } else {
      inlineActions.push({
        text: "scan again",
        command: "show me all objects",
        color: ACTION_COLORS.detect,
      });
    }
    return {
      message,
      inlineActions,
      suggestedFollowUp: "Try moving the camera!",
    };
  }

  if (detectType === "people" || detectType === "faces") {
    const noun =
      detectType === "people"
        ? count === 1
          ? "person"
          : "people"
        : count === 1
          ? "face"
          : "faces";

    const responses = [
      `${opener} Found ${count} ${noun}!`,
      `I can see ${count} ${noun} in the frame!`,
      `${opener} ${count} ${noun} detected!`,
    ];
    message = responses[Math.floor(Math.random() * responses.length)];

    if (isPtz && count > 0) {
      inlineActions.push(
        {
          text: "zoom in",
          command: "zoom in",
          color: ACTION_COLORS.zoom,
          actionType: "repeatable",
          repeatDelay: 200,
        },
        {
          text: "track them",
          command: "zoom in on that person",
          color: ACTION_COLORS.track,
        },
      );
    }
    inlineActions.push({
      text: "scan again",
      command: "show me all objects",
      color: ACTION_COLORS.detect,
    });
  } else if (labels && labels.length > 0) {
    const uniqueLabels = [...new Set(labels)];
    const labelList = uniqueLabels.slice(0, 4).join(", ");
    const extra =
      uniqueLabels.length > 4 ? ` and ${uniqueLabels.length - 4} more` : "";

    message = `${opener} Found ${count} objects: ${labelList}${extra}!`;

    if (isPtz && uniqueLabels.length > 0) {
      const randomLabel =
        uniqueLabels[
          Math.floor(Math.random() * Math.min(3, uniqueLabels.length))
        ];
      inlineActions.push(
        {
          text: "zoom +",
          command: "zoom in",
          color: ACTION_COLORS.zoom,
          actionType: "repeatable",
          repeatDelay: 200,
        },
        {
          text: `track ${randomLabel}`,
          command: `zoom in on the ${randomLabel}`,
          color: ACTION_COLORS.track,
        },
      );
    }
    inlineActions.push({
      text: "scan again",
      command: "show me all objects",
      color: ACTION_COLORS.detect,
    });
  } else {
    message = `${opener} Found ${count} items!`;
    inlineActions.push({
      text: "scan again",
      command: "show me all objects",
      color: ACTION_COLORS.detect,
    });
  }

  return { message, inlineActions };
}

export function enhanceQuestionResponse(
  baseResponse: string,
  context: ResponseContext,
): EnrichedResponse {
  let message = baseResponse;
  const inlineActions: InlineAction[] = [];

  if (!baseResponse.includes("!") && !baseResponse.includes("?")) {
    const mood: ResponseMood =
      context.peopleCount && context.peopleCount > 0
        ? "excited"
        : "informative";
    const opener = Math.random() > 0.6 ? getRandomOpener(mood) + " " : "";
    message = `${opener}${baseResponse}`;
  }

  if (context.isPtz) {
    if (context.peopleCount && context.peopleCount > 0) {
      inlineActions.push({
        text: "track person",
        command: "zoom in on that person",
        color: ACTION_COLORS.track,
      });
    }
    inlineActions.push({
      text: "find objects",
      command: "show me all objects",
      color: ACTION_COLORS.detect,
    });
  } else {
    inlineActions.push(
      {
        text: "find objects",
        command: "show me all objects",
        color: ACTION_COLORS.detect,
      },
      {
        text: "count people",
        command: "count people",
        color: ACTION_COLORS.detect,
      },
    );
  }

  return { message, inlineActions };
}

export interface FeatureSuggestion {
  message: string;
  command: string;
  reason: string;
}

export function getContextualSuggestion(
  context: ResponseContext,
): FeatureSuggestion | null {
  const { isPtz, hasApiKey, recentActions, peopleCount, objectsFound } =
    context;

  if (
    peopleCount &&
    peopleCount > 0 &&
    isPtz &&
    hasApiKey &&
    !recentActions.includes("track")
  ) {
    return {
      message: "Want me to zoom in on someone?",
      command: "Zoom in on that person",
      reason: "people_detected",
    };
  }

  if (
    objectsFound &&
    objectsFound.length > 0 &&
    !recentActions.includes("describe")
  ) {
    const randomObject =
      objectsFound[Math.floor(Math.random() * objectsFound.length)];
    return {
      message: `Curious about the ${randomObject}?`,
      command: `Tell me about the ${randomObject}`,
      reason: "objects_found",
    };
  }

  const panCount = recentActions.filter((a) => a.includes("pan")).length;
  if (isPtz && panCount >= 3 && !recentActions.includes("preset")) {
    return {
      message: "Pro tip: Save this view as a preset!",
      command: "Save as preset 1",
      reason: "frequent_movement",
    };
  }

  if (recentActions.length < 2) {
    return {
      message: "Try discovering what's around!",
      command: "Show me all objects",
      reason: "getting_started",
    };
  }

  return null;
}

export function explainApp(isPtz: boolean, hasApiKey: boolean): string {
  const features = getAvailableFeatures(isPtz);
  const cameraType = isPtz ? "PTZ camera" : "device camera";

  let explanation = `I'm your visual AI assistant! I can see through your ${cameraType} and help you explore.\n\n`;
  explanation += "Here's what I can do:\n\n";

  const categories = [...new Set(features.map((f) => f.category))];
  for (const cat of categories) {
    const catFeatures = features.filter((f) => f.category === cat);
    const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
    explanation += `**${catName}**: ${catFeatures.map((f) => f.name).join(", ")}\n`;
  }

  if (!hasApiKey) {
    explanation +=
      "\n*Tip: Add a Moondream API key in Settings for even more features like object tracking and detailed descriptions!*";
  }

  return explanation;
}

export function getFeatureHelp(featureId: string): string | null {
  const feature = APP_FEATURES.find((f) => f.id === featureId);
  if (!feature) return null;

  let help = `**${feature.name}**\n${feature.description}\n\nTry saying: "${feature.command}"`;
  if (feature.funFact) {
    help += `\n\n*${feature.funFact}*`;
  }
  return help;
}

export class ConversationMemory {
  private recentActions: string[] = [];
  private lastDetections: string[] = [];
  private lastPeopleCount: number = 0;
  private messageCount: number = 0;
  private suggestedFeatures: Set<string> = new Set();

  recordAction(action: string): void {
    this.recentActions.unshift(action);
    if (this.recentActions.length > 10) {
      this.recentActions.pop();
    }
    this.messageCount++;
  }

  recordDetections(labels: string[]): void {
    this.lastDetections = labels;
  }

  recordPeopleCount(count: number): void {
    this.lastPeopleCount = count;
  }

  markFeatureSuggested(featureId: string): void {
    this.suggestedFeatures.add(featureId);
  }

  getContext(isPtz: boolean, hasApiKey: boolean): ResponseContext {
    return {
      isPtz,
      hasApiKey,
      recentActions: [...this.recentActions],
      objectsFound: [...this.lastDetections],
      peopleCount: this.lastPeopleCount,
      detectionCount: this.lastDetections.length,
    };
  }

  getRecentActions(): string[] {
    return [...this.recentActions];
  }

  shouldSuggestFeature(featureId: string): boolean {
    return !this.suggestedFeatures.has(featureId);
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  reset(): void {
    this.recentActions = [];
    this.lastDetections = [];
    this.lastPeopleCount = 0;
    this.messageCount = 0;
    this.suggestedFeatures.clear();
  }
}

export const conversationMemory = new ConversationMemory();

const HELP_PATTERNS = [
  /what can you do/i,
  /help me/i,
  /how do (i|you)/i,
  /what('s| is) this app/i,
  /show me (the )?features/i,
  /what are (your )?features/i,
  /capabilities/i,
  /teach me/i,
];

export function isHelpRequest(input: string): boolean {
  return HELP_PATTERNS.some((p) => p.test(input));
}

export function getHelpResponse(
  isPtz: boolean,
  hasApiKey: boolean,
): EnrichedResponse {
  const features = getAvailableFeatures(isPtz);
  const opener = getRandomOpener("helpful");

  let message = `${opener} I'd love to show you around! Here's what I can do:\n\n`;

  const visionFeatures = features.filter(
    (f) => f.category === "vision" || f.category === "detection",
  );
  const cameraFeatures = features.filter((f) => f.category === "camera");
  const funFeatures = features.filter((f) => f.category === "fun");

  const inlineActions: InlineAction[] = [];

  if (visionFeatures.length > 0) {
    message += `**See & Detect:** `;
    const cmds = visionFeatures.slice(0, 3);
    message += cmds.map((f) => f.command).join(", ") + "\n";
    inlineActions.push({
      text: "find objects",
      command: "show me all objects",
      color: ACTION_COLORS.detect,
    });
  }

  if (cameraFeatures.length > 0) {
    message += `**Camera Control:** `;
    message +=
      cameraFeatures
        .slice(0, 3)
        .map((f) => f.command)
        .join(", ") + "\n";
    inlineActions.push({
      text: "go home",
      command: "go home",
      color: ACTION_COLORS.home,
    });
  }

  if (funFeatures.length > 0) {
    message += `**Fun Stuff:** `;
    message += funFeatures.map((f) => f.command).join(", ") + "\n";
    inlineActions.push({
      text: "I spy!",
      command: "let's play I spy",
      color: "#FF2D55",
    });
  }

  message += `\nJust talk to me naturally!`;

  return { message, inlineActions };
}

export function getNativeCameraControls(): InlineAction[] {
  return [
    {
      text: "brighter",
      command: "make it brighter",
      color: ACTION_COLORS.brightness,
      actionType: "repeatable",
      repeatDelay: 100,
    },
    {
      text: "darker",
      command: "make it darker",
      color: "#8E8E93",
      actionType: "repeatable",
      repeatDelay: 100,
    },
    {
      text: "warmer",
      command: "make it warmer",
      color: ACTION_COLORS.warmth,
      actionType: "repeatable",
      repeatDelay: 100,
    },
    {
      text: "cooler",
      command: "make it cooler",
      color: "#5AC8FA",
      actionType: "repeatable",
      repeatDelay: 100,
    },
  ];
}

export function getPtzMovementControls(): InlineAction[] {
  return [
    {
      text: "left",
      command: "pan left",
      color: ACTION_COLORS.pan,
      actionType: "repeatable",
      repeatDelay: 150,
    },
    {
      text: "right",
      command: "pan right",
      color: ACTION_COLORS.pan,
      actionType: "repeatable",
      repeatDelay: 150,
    },
    {
      text: "up",
      command: "tilt up",
      color: ACTION_COLORS.tilt,
      actionType: "repeatable",
      repeatDelay: 150,
    },
    {
      text: "down",
      command: "tilt down",
      color: ACTION_COLORS.tilt,
      actionType: "repeatable",
      repeatDelay: 150,
    },
    {
      text: "zoom +",
      command: "zoom in",
      color: ACTION_COLORS.zoom,
      actionType: "repeatable",
      repeatDelay: 200,
    },
    {
      text: "zoom -",
      command: "zoom out",
      color: ACTION_COLORS.zoom,
      actionType: "repeatable",
      repeatDelay: 200,
    },
  ];
}

function shuffleAndPick<T>(array: T[], count: number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const WELCOME_MESSAGES_PTZ = [
  "Hey! I'm your PTZ camera buddy. Let's explore!",
  "Hi there! Ready to look around? Tap the controls!",
  "Welcome! I can move and see. What should we find?",
  "Hey! Tap controls to move, or ask me what I see!",
  "Ready to explore! Tap to move or ask me anything.",
];

const WELCOME_MESSAGES_NATIVE = [
  "Hey! I can see through your camera. Let's explore!",
  "Hi! Point me at something interesting!",
  "Ready to discover what's around you!",
  "Let's see what we can find! Tap to explore.",
  "Hey there! What should I look for?",
];

const PTZ_ACTION_POOL: InlineAction[] = [
  {
    text: "left",
    command: "pan left",
    color: ACTION_COLORS.pan,
    actionType: "repeatable",
    repeatDelay: 150,
  },
  {
    text: "right",
    command: "pan right",
    color: ACTION_COLORS.pan,
    actionType: "repeatable",
    repeatDelay: 150,
  },
  {
    text: "up",
    command: "tilt up",
    color: ACTION_COLORS.tilt,
    actionType: "repeatable",
    repeatDelay: 150,
  },
  {
    text: "down",
    command: "tilt down",
    color: ACTION_COLORS.tilt,
    actionType: "repeatable",
    repeatDelay: 150,
  },
  {
    text: "zoom +",
    command: "zoom in",
    color: ACTION_COLORS.zoom,
    actionType: "repeatable",
    repeatDelay: 200,
  },
  {
    text: "zoom -",
    command: "zoom out",
    color: ACTION_COLORS.zoom,
    actionType: "repeatable",
    repeatDelay: 200,
  },
  {
    text: "find objects",
    command: "show me all objects",
    color: ACTION_COLORS.detect,
  },
  { text: "go home", command: "go home", color: ACTION_COLORS.home },
  {
    text: "anyone there?",
    command: "is anyone there?",
    color: ACTION_COLORS.detect,
  },
  {
    text: "scan room",
    command: "scan the room",
    color: ACTION_COLORS.describe,
  },
  {
    text: "count people",
    command: "count people",
    color: ACTION_COLORS.detect,
  },
];

const NATIVE_ACTION_POOL: InlineAction[] = [
  {
    text: "find objects",
    command: "show me all objects",
    color: ACTION_COLORS.detect,
  },
  {
    text: "count people",
    command: "count people",
    color: ACTION_COLORS.detect,
  },
  {
    text: "find faces",
    command: "find all faces",
    color: ACTION_COLORS.detect,
  },
  { text: "I spy!", command: "let's play I spy", color: "#FF2D55" },
  {
    text: "what's here?",
    command: "what do you see?",
    color: ACTION_COLORS.describe,
  },
  {
    text: "describe it",
    command: "describe the scene",
    color: ACTION_COLORS.describe,
  },
  {
    text: "any animals?",
    command: "are there any animals?",
    color: ACTION_COLORS.detect,
  },
  {
    text: "any text?",
    command: "is there any text visible?",
    color: ACTION_COLORS.detect,
  },
  { text: "colors", command: "what colors do you see?", color: "#9b59b6" },
  {
    text: "something cool",
    command: "find something interesting",
    color: "#e67e22",
  },
];

export function getWelcomeMessage(
  isPtz: boolean,
  hasApiKey: boolean,
): EnrichedResponse {
  const messagePool = isPtz ? WELCOME_MESSAGES_PTZ : WELCOME_MESSAGES_NATIVE;
  const message = messagePool[Math.floor(Math.random() * messagePool.length)];

  const actionPool = isPtz ? PTZ_ACTION_POOL : NATIVE_ACTION_POOL;
  const inlineActions = shuffleAndPick(actionPool, 4);

  return { message, inlineActions };
}
