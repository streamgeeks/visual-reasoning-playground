import { CameraProfile } from "@/lib/storage";
import {
  sendPtzViscaCommand,
  sendZoomViscaCommand,
  sendHomeViscaCommand,
  sendFocusViscaCommand,
  setAutoFocus,
  triggerOnePushAutoFocus,
  recallPresetFromCamera,
  savePresetToCamera,
  fetchCameraFrame,
} from "@/lib/camera";
import { RoomScan, DetectedObject, getRoomScans } from "@/lib/huntAndFind";
import { describeScene, detectObject } from "@/lib/moondream";
import * as VisionTracking from "vision-tracking";
import {
  generateVisionDescription,
  analyzeScene,
  buildMoondreamContext,
} from "@/lib/visionDescription";
import {
  calculatePtzDirection,
  getPtzDirectionFromPanTilt,
} from "@/lib/trackingService";

let activeTrackingCancelled = false;
let activeTrackingInProgress = false;

let lastExecutedCommand: CommandIntent | null = null;
let lastCommandDirection: { pan?: string; tilt?: string; zoom?: string } = {};

export function cancelActiveTracking(): void {
  activeTrackingCancelled = true;
  console.log("[CameraAI] Tracking cancellation requested");
}

export function isTrackingActive(): boolean {
  return activeTrackingInProgress;
}

export function getLastCommand(): CommandIntent | null {
  return lastExecutedCommand;
}

function storeLastCommand(command: CommandIntent): void {
  lastExecutedCommand = { ...command };
  if (command.action === "pan" && command.direction) {
    lastCommandDirection.pan = command.direction;
  } else if (command.action === "tilt" && command.direction) {
    lastCommandDirection.tilt = command.direction;
  } else if (command.action === "zoom" && command.direction) {
    lastCommandDirection.zoom = command.direction;
  }
}

export type IntentType = "question" | "command" | "search" | "track" | "unknown";

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  raw: string;
  details: QuestionIntent | CommandIntent | SearchIntent | TrackIntent | null;
  needsAIClassification?: boolean;
}

export interface QuestionIntent {
  question: string;
}

export interface CommandIntent {
  action: "pan" | "tilt" | "zoom" | "move" | "stop" | "home" | "preset" | "save_preset" | "focus" | "autofocus";
  direction?: "left" | "right" | "up" | "down" | "in" | "out" | "near" | "far";
  speed?: number;
  amount?: "little" | "some" | "lot";
  presetNumber?: number;
  enabled?: boolean;
}

export interface SearchIntent {
  objectName: string;
  fuzzy: boolean;
}

export interface TrackIntent {
  objectName: string;
  zoomLevel: "medium" | "tight" | "close";
}

export interface FollowUpOption {
  label: string;
  command: string;
  amount: "little" | "lot";
}

export interface AIResponse {
  message: string;
  action?: "moved_camera" | "captured_image" | "found_object" | "tracking_started" | "none";
  imageUri?: string;
  object?: DetectedObject;
  source?: "vision" | "moondream";
  followUpOptions?: FollowUpOption[];
  isActiveProcess?: boolean;
  processType?: "tracking" | "centering";
}

export type VisionQuestionType = "count_people" | "count_faces" | "count_animals" | "anyone_there" | "describe" | "activity" | "gestures" | null;

const QUESTION_PATTERNS = [
  /^what('s| is| are)/i,
  /^where('s| is| are)/i,
  /^who('s| is| are)/i,
  /^how many/i,
  /^is there/i,
  /^are there/i,
  /^can you see/i,
  /^do you see/i,
  /^describe/i,
  /^tell me about/i,
  /\?$/,
];

const SEARCH_PATTERNS = [
  /^(find|show|locate|where('s| is| are)?)\s+(my\s+)?(.+)/i,
  /^go to\s+(the\s+)?(.+)/i,
  /^take me to\s+(the\s+)?(.+)/i,
  /^look at\s+(the\s+)?(.+)/i,
];

const TRACK_PATTERNS: Array<{ pattern: RegExp; zoomLevel: TrackIntent["zoomLevel"] }> = [
  { pattern: /^zoom\s+(in\s+)?(on|into|to)\s+(the\s+)?(.+)/i, zoomLevel: "tight" },
  { pattern: /^focus\s+(on|in\s+on)\s+(the\s+)?(.+)/i, zoomLevel: "tight" },
  { pattern: /^(track|follow)\s+(the\s+)?(.+)/i, zoomLevel: "medium" },
  { pattern: /^center\s+(on\s+)?(the\s+)?(.+)/i, zoomLevel: "medium" },
  { pattern: /^get\s+closer\s+to\s+(the\s+)?(.+)/i, zoomLevel: "tight" },
  { pattern: /^zoom\s+in\s+on\s+that\s+(.+)/i, zoomLevel: "tight" },
  { pattern: /^close\s*up\s+(on\s+)?(the\s+)?(.+)/i, zoomLevel: "close" },
];

const COMMAND_PATTERNS: Array<{ pattern: RegExp; action: CommandIntent["action"]; direction?: CommandIntent["direction"] }> = [
  { pattern: /pan(\s+(the\s+)?(camera|it|view))?\s*(to\s+(the\s+)?)?left/i, action: "pan", direction: "left" },
  { pattern: /pan(\s+(the\s+)?(camera|it|view))?\s*(to\s+(the\s+)?)?right/i, action: "pan", direction: "right" },
  { pattern: /(go|move|turn|swing|rotate)(\s+(the\s+)?(camera|it|view))?\s*(to\s+(the\s+)?)?left/i, action: "pan", direction: "left" },
  { pattern: /(go|move|turn|swing|rotate)(\s+(the\s+)?(camera|it|view))?\s*(to\s+(the\s+)?)?right/i, action: "pan", direction: "right" },
  { pattern: /left(\s+a\s+(little|bit|lot))?$/i, action: "pan", direction: "left" },
  { pattern: /right(\s+a\s+(little|bit|lot))?$/i, action: "pan", direction: "right" },
  { pattern: /tilt(\s+(the\s+)?(camera|it|view))?\s*(up|upward)/i, action: "tilt", direction: "up" },
  { pattern: /tilt(\s+(the\s+)?(camera|it|view))?\s*(down|downward)/i, action: "tilt", direction: "down" },
  { pattern: /(go|move|look|point)(\s+(the\s+)?(camera|it|view))?\s*up/i, action: "tilt", direction: "up" },
  { pattern: /(go|move|look|point)(\s+(the\s+)?(camera|it|view))?\s*down/i, action: "tilt", direction: "down" },
  { pattern: /^up(\s+a\s+(little|bit|lot))?$/i, action: "tilt", direction: "up" },
  { pattern: /^down(\s+a\s+(little|bit|lot))?$/i, action: "tilt", direction: "down" },
  { pattern: /zoom(\s+(the\s+)?(camera|it|view))?\s*(in|closer)/i, action: "zoom", direction: "in" },
  { pattern: /zoom(\s+(the\s+)?(camera|it|view))?\s*(out|back|wider)/i, action: "zoom", direction: "out" },
  { pattern: /^zoom\s+out/i, action: "zoom", direction: "out" },
  { pattern: /^zoom\s+in/i, action: "zoom", direction: "in" },
  { pattern: /can\s+you\s+zoom\s*in/i, action: "zoom", direction: "in" },
  { pattern: /can\s+you\s+zoom\s*out/i, action: "zoom", direction: "out" },
  { pattern: /please\s+zoom\s*in/i, action: "zoom", direction: "in" },
  { pattern: /please\s+zoom\s*out/i, action: "zoom", direction: "out" },
  { pattern: /zoom\s*in\s*,?\s*please/i, action: "zoom", direction: "in" },
  { pattern: /zoom\s*out\s*,?\s*please/i, action: "zoom", direction: "out" },
  { pattern: /(get\s+)?closer/i, action: "zoom", direction: "in" },
  { pattern: /(pull|zoom)\s*(back|out|away)/i, action: "zoom", direction: "out" },
  { pattern: /wider(\s+view)?/i, action: "zoom", direction: "out" },
  { pattern: /stop(\s+(the\s+)?(camera|it|movement))?/i, action: "stop" },
  { pattern: /(go\s+)?home/i, action: "home" },
  { pattern: /(go\s+to\s+)?preset\s*(\d+)/i, action: "preset" },
  { pattern: /recall\s*(preset\s*)?(\d+)/i, action: "preset" },
  { pattern: /save\s+(this\s+)?(as\s+)?preset\s*(\d+)/i, action: "save_preset" },
  { pattern: /save\s+(to\s+)?preset\s*(\d+)/i, action: "save_preset" },
  { pattern: /store\s+(this\s+)?(as\s+)?preset\s*(\d+)/i, action: "save_preset" },
  { pattern: /remember\s+this\s+(as\s+)?preset\s*(\d+)/i, action: "save_preset" },
  { pattern: /focus\s*(near|closer|in)/i, action: "focus", direction: "near" },
  { pattern: /focus\s*(far|farther|out|away)/i, action: "focus", direction: "far" },
  { pattern: /(auto\s*)?focus(\s+on)?(\s+this)?$/i, action: "autofocus" },
  { pattern: /refocus/i, action: "autofocus" },
  { pattern: /(turn\s+)?(on|enable)\s*auto\s*focus/i, action: "autofocus" },
  { pattern: /(turn\s+)?(off|disable)\s*auto\s*focus/i, action: "focus", direction: "near" },
];

const MEMORY_PATTERNS: Array<{ pattern: RegExp; type: "repeat" | "more" | "less" | "opposite" }> = [
  { pattern: /^(do\s+(that|it)\s+)?again$/i, type: "repeat" },
  { pattern: /^repeat(\s+(that|last|it))?$/i, type: "repeat" },
  { pattern: /^(a\s+)?(little\s+|bit\s+)?more$/i, type: "more" },
  { pattern: /^keep\s+going$/i, type: "more" },
  { pattern: /^continue$/i, type: "more" },
  { pattern: /^(a\s+)?(little\s+|bit\s+)?less$/i, type: "less" },
  { pattern: /^go\s+back$/i, type: "opposite" },
  { pattern: /^(undo|reverse)(\s+(that|it))?$/i, type: "opposite" },
  { pattern: /^other\s+way$/i, type: "opposite" },
];

const AMOUNT_PATTERNS: Array<{ pattern: RegExp; amount: CommandIntent["amount"] }> = [
  { pattern: /(a\s+)?(little|bit|slightly|tiny)/i, amount: "little" },
  { pattern: /(a\s+)?lot|much|far|way/i, amount: "lot" },
];

const SPEED_PATTERNS: Array<{ pattern: RegExp; speed: number }> = [
  { pattern: /slow(ly)?/i, speed: 4 },
  { pattern: /fast|quick(ly)?/i, speed: 18 },
  { pattern: /very\s+slow/i, speed: 2 },
  { pattern: /very\s+fast/i, speed: 22 },
];

const VISION_QUESTION_PATTERNS: Array<{ pattern: RegExp; type: VisionQuestionType }> = [
  { pattern: /how many (people|persons|humans)/i, type: "count_people" },
  { pattern: /how many faces/i, type: "count_faces" },
  { pattern: /how many (animals|pets|dogs|cats)/i, type: "count_animals" },
  { pattern: /(is|are) (there )?(anyone|anybody|someone|people)/i, type: "anyone_there" },
  { pattern: /(is|are) there (a )?(person|human)/i, type: "anyone_there" },
  { pattern: /what('s| is) (going on|happening)/i, type: "activity" },
  { pattern: /(any|what) (activity|action|movement)/i, type: "activity" },
  { pattern: /(anyone|is someone) (waving|pointing|jumping)/i, type: "gestures" },
  { pattern: /what gestures/i, type: "gestures" },
  { pattern: /^describe/i, type: "describe" },
  { pattern: /what do you see/i, type: "describe" },
];

const VISION_TARGET_PATTERNS: Array<{ pattern: RegExp; target: "person" | "face" | "animal" }> = [
  { pattern: /(on|at|to) (the |that )?(person|human|guy|man|woman)/i, target: "person" },
  { pattern: /(on|at|to) (the |that )?(face|head)/i, target: "face" },
  { pattern: /(on|at|to) (the |that )?(animal|dog|cat|pet)/i, target: "animal" },
];

function getVisionQuestionType(question: string): VisionQuestionType {
  for (const { pattern, type } of VISION_QUESTION_PATTERNS) {
    if (pattern.test(question)) {
      return type;
    }
  }
  return null;
}

function getVisionTarget(input: string): "person" | "face" | "animal" | null {
  for (const { pattern, target } of VISION_TARGET_PATTERNS) {
    if (pattern.test(input)) {
      return target;
    }
  }
  return null;
}

function handleMemoryCommand(memoryType: "repeat" | "more" | "less" | "opposite"): ParsedIntent | null {
  if (!lastExecutedCommand) {
    return null;
  }
  
  const cmd = { ...lastExecutedCommand };
  
  switch (memoryType) {
    case "repeat":
      return {
        type: "command",
        confidence: 0.95,
        raw: "repeat",
        details: cmd,
      };
      
    case "more":
      if (cmd.amount === "little") cmd.amount = "some";
      else if (cmd.amount === "some") cmd.amount = "lot";
      return {
        type: "command",
        confidence: 0.95,
        raw: "more",
        details: cmd,
      };
      
    case "less":
      cmd.amount = "little";
      return {
        type: "command",
        confidence: 0.95,
        raw: "less",
        details: cmd,
      };
      
    case "opposite":
      if (cmd.direction === "left") cmd.direction = "right";
      else if (cmd.direction === "right") cmd.direction = "left";
      else if (cmd.direction === "up") cmd.direction = "down";
      else if (cmd.direction === "down") cmd.direction = "up";
      else if (cmd.direction === "in") cmd.direction = "out";
      else if (cmd.direction === "out") cmd.direction = "in";
      else if (cmd.direction === "near") cmd.direction = "far";
      else if (cmd.direction === "far") cmd.direction = "near";
      cmd.amount = "some";
      return {
        type: "command",
        confidence: 0.95,
        raw: "opposite",
        details: cmd,
      };
  }
  
  return null;
}

export function parseIntent(input: string): ParsedIntent {
  const trimmed = input.trim();
  console.log(`[ParseIntent] Input: "${trimmed}"`);
  
  for (const { pattern, type } of MEMORY_PATTERNS) {
    if (pattern.test(trimmed)) {
      const memoryResult = handleMemoryCommand(type);
      if (memoryResult) {
        return memoryResult;
      }
      return {
        type: "unknown",
        confidence: 0.3,
        raw: trimmed,
        details: null,
      };
    }
  }
  
  for (const { pattern, action, direction } of COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      console.log(`[ParseIntent] Matched COMMAND pattern: ${pattern} → action=${action}, direction=${direction}`);
      let speed = 10;
      let amount: CommandIntent["amount"] = "some";
      let presetNumber: number | undefined;
      
      for (const { pattern: sp, speed: s } of SPEED_PATTERNS) {
        if (sp.test(trimmed)) {
          speed = s;
          break;
        }
      }
      
      for (const { pattern: ap, amount: a } of AMOUNT_PATTERNS) {
        if (ap.test(trimmed)) {
          amount = a;
          break;
        }
      }
      
      if (action === "preset") {
        const match = trimmed.match(/(?:preset\s*|recall\s*(?:preset\s*)?)(\d+)/i);
        if (match) {
          presetNumber = parseInt(match[1], 10);
        }
      }
      
      if (action === "save_preset") {
        const match = trimmed.match(/preset\s*(\d+)/i);
        if (match) {
          presetNumber = parseInt(match[1], 10);
        }
      }
      
      return {
        type: "command",
        confidence: 0.9,
        raw: trimmed,
        details: { action, direction, speed, amount, presetNumber },
      };
    }
  }
  
  for (const { pattern, zoomLevel } of TRACK_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const objectName = match[match.length - 1]?.trim();
      if (objectName && objectName.length > 1 && !["in", "on", "the", "that"].includes(objectName.toLowerCase())) {
        return {
          type: "track",
          confidence: 0.9,
          raw: trimmed,
          details: { objectName, zoomLevel } as TrackIntent,
        };
      }
    }
  }

  for (const pattern of SEARCH_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const objectName = match[match.length - 1]?.trim();
      if (objectName && objectName.length > 1) {
        return {
          type: "search",
          confidence: 0.85,
          raw: trimmed,
          details: { objectName, fuzzy: true },
        };
      }
    }
  }
  
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        type: "question",
        confidence: 0.9,
        raw: trimmed,
        details: { question: trimmed },
      };
    }
  }
  
  if (trimmed.length > 10 && !trimmed.includes(" ")) {
    return {
      type: "search",
      confidence: 0.5,
      raw: trimmed,
      details: { objectName: trimmed, fuzzy: true },
    };
  }
  
  const looksLikeCommand = /\b(pan|tilt|zoom|move|turn|go|look|point|swing|rotate|stop|home|preset|left|right|up|down|in|out|closer|wider|back)\b/i.test(trimmed);
  
  if (looksLikeCommand) {
    console.log(`[ParseIntent] No pattern match but looks like command, needs AI classification`);
    return {
      type: "unknown",
      confidence: 0.3,
      raw: trimmed,
      details: null,
      needsAIClassification: true,
    };
  }
  
  console.log(`[ParseIntent] Defaulting to QUESTION type`);
  return {
    type: "question",
    confidence: 0.7,
    raw: trimmed,
    details: { question: trimmed },
  };
}

const INTENT_CLASSIFICATION_PROMPT = `You are a camera control assistant. Classify this user request into one category:

User said: "{INPUT}"

Categories:
1. COMMAND - User wants to move/control the camera (pan, tilt, zoom, go home, recall preset, save preset)
2. QUESTION - User is asking about what they see in the image
3. SEARCH - User wants to find/locate a specific object

Reply with ONLY one line in this exact format:
TYPE: [COMMAND/QUESTION/SEARCH] | ACTION: [details]

Examples:
- "pan the camera right" → TYPE: COMMAND | ACTION: pan right
- "move it to the left slowly" → TYPE: COMMAND | ACTION: pan left slow
- "what do you see" → TYPE: QUESTION | ACTION: describe
- "find my phone" → TYPE: SEARCH | ACTION: phone
- "zoom in on that" → TYPE: COMMAND | ACTION: zoom in
- "tilt up a little" → TYPE: COMMAND | ACTION: tilt up small
- "go to preset 3" → TYPE: COMMAND | ACTION: preset 3
- "go home" → TYPE: COMMAND | ACTION: home
- "save this as preset 5" → TYPE: COMMAND | ACTION: save preset 5`;

interface AIClassificationResult {
  type: IntentType;
  action?: string;
  direction?: string;
  speed?: string;
  target?: string;
}

async function classifyIntentWithAI(
  input: string,
  apiKey: string
): Promise<ParsedIntent> {
  try {
    const prompt = INTENT_CLASSIFICATION_PROMPT.replace("{INPUT}", input);
    
    const response = await fetch("https://api.moondream.ai/v1/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Moondream-Auth": apiKey,
      },
      body: JSON.stringify({
        image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        question: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("[AIClassifier] API error:", response.status);
      return createFallbackIntent(input);
    }

    const data = await response.json();
    const answer = data.answer || "";
    
    console.log("[AIClassifier] Response:", answer);
    
    return parseAIClassification(input, answer);
  } catch (err) {
    console.error("[AIClassifier] Failed:", err);
    return createFallbackIntent(input);
  }
}

function parseAIClassification(input: string, response: string): ParsedIntent {
  const typeMatch = response.match(/TYPE:\s*(COMMAND|QUESTION|SEARCH)/i);
  const actionMatch = response.match(/ACTION:\s*(.+)/i);
  
  if (!typeMatch) {
    return createFallbackIntent(input);
  }
  
  const classifiedType = typeMatch[1].toUpperCase();
  const actionDetails = actionMatch?.[1]?.trim().toLowerCase() || "";
  
  if (classifiedType === "COMMAND") {
    const command = parseCommandFromAI(actionDetails);
    if (command) {
      return {
        type: "command",
        confidence: 0.85,
        raw: input,
        details: command,
      };
    }
  }
  
  if (classifiedType === "SEARCH") {
    const target = actionDetails || input.replace(/^(find|show|locate|where('s| is)?)\s*/i, "").trim();
    return {
      type: "search",
      confidence: 0.85,
      raw: input,
      details: { objectName: target, fuzzy: true },
    };
  }
  
  return {
    type: "question",
    confidence: 0.85,
    raw: input,
    details: { question: input },
  };
}

function parseCommandFromAI(actionDetails: string): CommandIntent | null {
  let action: CommandIntent["action"] | null = null;
  let direction: CommandIntent["direction"] | undefined;
  let speed: number = 10;
  let amount: CommandIntent["amount"] = "some";
  let presetNumber: number | undefined;
  
  if (/pan\s*(left|right)/i.test(actionDetails)) {
    action = "pan";
    direction = /left/i.test(actionDetails) ? "left" : "right";
  } else if (/tilt\s*(up|down)/i.test(actionDetails)) {
    action = "tilt";
    direction = /up/i.test(actionDetails) ? "up" : "down";
  } else if (/zoom\s*(in|out)/i.test(actionDetails)) {
    action = "zoom";
    direction = /in/i.test(actionDetails) ? "in" : "out";
  } else if (/left/i.test(actionDetails)) {
    action = "pan";
    direction = "left";
  } else if (/right/i.test(actionDetails)) {
    action = "pan";
    direction = "right";
  } else if (/up/i.test(actionDetails)) {
    action = "tilt";
    direction = "up";
  } else if (/down/i.test(actionDetails)) {
    action = "tilt";
    direction = "down";
  } else if (/stop/i.test(actionDetails)) {
    action = "stop";
  } else if (/home/i.test(actionDetails)) {
    action = "home";
  } else if (/save\s*preset\s*(\d+)/i.test(actionDetails)) {
    action = "save_preset";
    const match = actionDetails.match(/(\d+)/);
    if (match) presetNumber = parseInt(match[1], 10);
  } else if (/preset\s*(\d+)/i.test(actionDetails)) {
    action = "preset";
    const match = actionDetails.match(/(\d+)/);
    if (match) presetNumber = parseInt(match[1], 10);
  }
  
  if (!action) return null;
  
  if (/slow/i.test(actionDetails)) {
    speed = 4;
    amount = "little";
  } else if (/fast|quick/i.test(actionDetails)) {
    speed = 18;
    amount = "lot";
  } else if (/small|little|bit/i.test(actionDetails)) {
    amount = "little";
  } else if (/lot|much|far/i.test(actionDetails)) {
    amount = "lot";
  }
  
  return { action, direction, speed, amount, presetNumber };
}

function createFallbackIntent(input: string): ParsedIntent {
  return {
    type: "question",
    confidence: 0.5,
    raw: input,
    details: { question: input },
  };
}

export async function executeCommand(
  camera: CameraProfile,
  command: CommandIntent
): Promise<AIResponse> {
  const durationByAmount: Record<string, number> = {
    little: 300,
    some: 800,
    lot: 2000,
  };
  
  const duration = durationByAmount[command.amount || "some"];
  const speed = command.speed || 10;
  
  const shouldStoreCommand = ["pan", "tilt", "zoom", "focus"].includes(command.action);
  if (shouldStoreCommand) {
    storeLastCommand(command);
  }
  
  try {
    switch (command.action) {
      case "pan":
        if (command.direction === "left" || command.direction === "right") {
          await sendPtzViscaCommand(camera, command.direction, speed, speed);
          await new Promise(r => setTimeout(r, duration));
          await sendPtzViscaCommand(camera, "stop", 0, 0);
          return { 
            message: `Panned ${command.direction}`, 
            action: "moved_camera",
            followUpOptions: [
              { label: "A little more", command: `pan ${command.direction} a little`, amount: "little" },
              { label: "A lot more", command: `pan ${command.direction} a lot`, amount: "lot" },
            ],
          };
        }
        break;
        
      case "tilt":
        if (command.direction === "up" || command.direction === "down") {
          await sendPtzViscaCommand(camera, command.direction, speed, speed);
          await new Promise(r => setTimeout(r, duration));
          await sendPtzViscaCommand(camera, "stop", 0, 0);
          return { 
            message: `Tilted ${command.direction}. Want more?`, 
            action: "moved_camera",
            followUpOptions: [
              { label: "A little more", command: `tilt ${command.direction} a little`, amount: "little" },
              { label: "A lot more", command: `tilt ${command.direction} a lot`, amount: "lot" },
            ],
          };
        }
        break;
        
      case "zoom":
        if (command.direction === "in" || command.direction === "out") {
          await sendZoomViscaCommand(camera, command.direction, speed);
          await new Promise(r => setTimeout(r, duration));
          await sendZoomViscaCommand(camera, "stop");
          return { 
            message: `Zoomed ${command.direction}. Want more?`, 
            action: "moved_camera",
            followUpOptions: [
              { label: "A little more", command: `zoom ${command.direction} a little`, amount: "little" },
              { label: "A lot more", command: `zoom ${command.direction} a lot`, amount: "lot" },
            ],
          };
        }
        break;
        
      case "stop":
        await sendPtzViscaCommand(camera, "stop", 0, 0);
        await sendZoomViscaCommand(camera, "stop");
        return { message: "Stopped all movement", action: "moved_camera" };
        
      case "home":
        await sendHomeViscaCommand(camera);
        return { message: "Moving to home position", action: "moved_camera" };
        
      case "preset":
        if (command.presetNumber !== undefined) {
          await recallPresetFromCamera(camera, command.presetNumber);
          return { message: `Recalled preset ${command.presetNumber}`, action: "moved_camera" };
        }
        break;
        
      case "save_preset":
        if (command.presetNumber !== undefined) {
          await savePresetToCamera(camera, command.presetNumber);
          return { message: `Saved current position as preset ${command.presetNumber}`, action: "moved_camera" };
        }
        break;
        
      case "focus":
        if (command.direction === "near" || command.direction === "far") {
          await sendFocusViscaCommand(camera, command.direction, speed > 10 ? 5 : 3);
          await new Promise(r => setTimeout(r, duration));
          await sendFocusViscaCommand(camera, "stop");
          return { 
            message: `Focused ${command.direction === "near" ? "closer" : "farther"}`, 
            action: "moved_camera",
            followUpOptions: [
              { label: "A little more", command: `focus ${command.direction} a little`, amount: "little" },
              { label: "A lot more", command: `focus ${command.direction} a lot`, amount: "lot" },
            ],
          };
        }
        break;
        
      case "autofocus":
        await triggerOnePushAutoFocus(camera);
        return { message: "Auto-focusing...", action: "moved_camera" };
    }
    
    return { message: "Command not understood", action: "none" };
  } catch (err) {
    console.error("[CameraAI] Command execution failed:", err);
    return { message: "Failed to execute camera command", action: "none" };
  }
}

async function answerWithVision(
  imageBase64: string,
  questionType: VisionQuestionType,
  frame: string
): Promise<AIResponse | null> {
  if (!VisionTracking.isVisionAvailable) return null;

  try {
    const analysis = await analyzeScene(imageBase64);

    switch (questionType) {
      case "count_people":
        const peopleCount = analysis.humanCount;
        if (peopleCount === 0) {
          return { message: "I don't see anyone in the frame right now.", action: "captured_image", imageUri: frame, source: "vision" };
        }
        return { message: `I can see ${peopleCount} ${peopleCount === 1 ? "person" : "people"} in the frame.`, action: "captured_image", imageUri: frame, source: "vision" };

      case "count_faces":
        const faceCount = analysis.faces.length;
        if (faceCount === 0) {
          return { message: "I don't see any faces clearly visible right now.", action: "captured_image", imageUri: frame, source: "vision" };
        }
        return { message: `I can see ${faceCount} ${faceCount === 1 ? "face" : "faces"} in the frame.`, action: "captured_image", imageUri: frame, source: "vision" };

      case "count_animals":
        const animalCount = analysis.animals.length;
        if (animalCount === 0) {
          return { message: "I don't see any animals in the frame.", action: "captured_image", imageUri: frame, source: "vision" };
        }
        const animalTypes = [...new Set(analysis.animals.map(a => a.label))].join(", ");
        return { message: `I can see ${animalCount} ${animalCount === 1 ? "animal" : "animals"}: ${animalTypes}.`, action: "captured_image", imageUri: frame, source: "vision" };

      case "anyone_there":
        if (analysis.humanCount === 0) {
          return { message: "No, I don't see anyone in the frame right now.", action: "captured_image", imageUri: frame, source: "vision" };
        }
        return { message: `Yes! I can see ${analysis.humanCount} ${analysis.humanCount === 1 ? "person" : "people"} in the frame.`, action: "captured_image", imageUri: frame, source: "vision" };

      case "activity":
        const activities: string[] = [];
        if (analysis.jumpingCount > 0) activities.push(`${analysis.jumpingCount} jumping`);
        if (analysis.runningCount > 0) activities.push(`${analysis.runningCount} running`);
        if (analysis.armsRaisedCount > 0) activities.push(`${analysis.armsRaisedCount} with arms raised`);
        if (analysis.pointingCount > 0) activities.push(`${analysis.pointingCount} pointing`);
        
        if (activities.length === 0) {
          return { message: `${analysis.activityLevel.charAt(0).toUpperCase() + analysis.activityLevel.slice(1)} activity level. ${analysis.humanCount > 0 ? `${analysis.humanCount} people visible but no specific actions detected.` : "No people visible."}`, action: "captured_image", imageUri: frame, source: "vision" };
        }
        return { message: `I can see: ${activities.join(", ")}. Activity level is ${analysis.activityLevel}.`, action: "captured_image", imageUri: frame, source: "vision" };

      case "gestures":
        const gestures: string[] = [];
        if (analysis.pointingCount > 0) gestures.push(`${analysis.pointingCount} pointing`);
        if (analysis.thumbsUpCount > 0) gestures.push(`${analysis.thumbsUpCount} thumbs up`);
        if (analysis.peaceSignCount > 0) gestures.push(`${analysis.peaceSignCount} peace signs`);
        if (analysis.wavingCount > 0) gestures.push(`${analysis.wavingCount} waving`);
        
        if (gestures.length === 0) {
          return { message: "I don't detect any specific hand gestures right now.", action: "captured_image", imageUri: frame, source: "vision" };
        }
        return { message: `I can see: ${gestures.join(", ")}.`, action: "captured_image", imageUri: frame, source: "vision" };

      case "describe":
        const description = generateVisionDescription(imageBase64);
        return { message: (await description).natural, action: "captured_image", imageUri: frame, source: "vision" };

      default:
        return null;
    }
  } catch (err) {
    console.error("[CameraAI] Vision answering failed:", err);
    return null;
  }
}

export async function answerQuestion(
  camera: CameraProfile,
  apiKey: string,
  question: string
): Promise<AIResponse> {
  try {
    const frame = await fetchCameraFrame(camera);
    if (!frame) {
      return { message: "I couldn't capture an image from the camera right now.", action: "none" };
    }
    
    let imageBase64 = frame;
    if (imageBase64.startsWith("data:")) {
      imageBase64 = imageBase64.split(",")[1];
    }

    const visionQuestionType = getVisionQuestionType(question);
    
    if (visionQuestionType && VisionTracking.isVisionAvailable) {
      const visionAnswer = await answerWithVision(imageBase64, visionQuestionType, frame);
      if (visionAnswer) {
        if (!apiKey) {
          return visionAnswer;
        }
        if (visionQuestionType === "count_people" || visionQuestionType === "count_faces" || 
            visionQuestionType === "count_animals" || visionQuestionType === "anyone_there") {
          return visionAnswer;
        }
      }
    }

    if (!apiKey) {
      if (VisionTracking.isVisionAvailable) {
        const visionResult = await generateVisionDescription(imageBase64);
        return {
          message: visionResult.natural,
          action: "captured_image",
          imageUri: frame,
          source: "vision",
        };
      }
      return { message: "I need a Moondream API key to answer detailed questions. You can add one in Settings.", action: "none" };
    }
    
    const prompt = question.endsWith("?") ? question : `${question}?`;
    
    const analysis = VisionTracking.isVisionAvailable ? await analyzeScene(imageBase64) : null;
    const context = analysis ? buildMoondreamContext(analysis) : "";
    const enhancedPrompt = context ? `${prompt}\n\nContext: ${context}` : prompt;
    
    const result = await describeScene(imageBase64, apiKey, enhancedPrompt);
    
    if (result.error) {
      if (VisionTracking.isVisionAvailable) {
        const visionResult = await generateVisionDescription(imageBase64);
        return {
          message: visionResult.natural,
          action: "captured_image",
          imageUri: frame,
          source: "vision",
        };
      }
      return {
        message: `I had trouble analyzing the image: ${result.error}`,
        action: "none",
      };
    }
    
    return {
      message: result.description || "I couldn't determine an answer from what I see.",
      action: "captured_image",
      imageUri: frame,
      source: "moondream",
    };
  } catch (err) {
    console.error("[CameraAI] Question answering failed:", err);
    return { message: "I had trouble analyzing the image.", action: "none" };
  }
}

export async function searchForObject(
  camera: CameraProfile,
  objectName: string
): Promise<AIResponse> {
  try {
    const scans = await getRoomScans();
    
    if (scans.length === 0) {
      return {
        message: `I don't have any room scans yet. Run a Hunt & Find scan first, then I can help you find "${objectName}".`,
        action: "none",
      };
    }
    
    const searchTerms = objectName.toLowerCase().split(/\s+/);
    let bestMatch: { object: DetectedObject; scan: RoomScan; score: number } | null = null;
    
    for (const scan of scans) {
      for (const obj of scan.objects) {
        const objNameLower = obj.name.toLowerCase();
        let score = 0;
        
        if (objNameLower === objectName.toLowerCase()) {
          score = 100;
        } else if (objNameLower.includes(objectName.toLowerCase())) {
          score = 80;
        } else {
          for (const term of searchTerms) {
            if (objNameLower.includes(term)) {
              score += 30;
            }
            if (obj.category.toLowerCase().includes(term)) {
              score += 20;
            }
          }
        }
        
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { object: obj, scan, score };
        }
      }
    }
    
    if (!bestMatch) {
      const allObjects = scans.flatMap(s => s.objects.map(o => o.name)).slice(0, 10);
      return {
        message: `I couldn't find "${objectName}" in my scans. I know about: ${allObjects.join(", ")}. Would you like me to look for something else?`,
        action: "none",
      };
    }
    
    await recallPresetFromCamera(camera, bestMatch.object.presetSlot);
    
    const locationDesc = bestMatch.object.relativeLocation.replace(/-/g, " ");
    
    return {
      message: `Found "${bestMatch.object.name}"! It's in the ${locationDesc} area. Moving camera there now.`,
      action: "found_object",
      object: bestMatch.object,
    };
  } catch (err) {
    console.error("[CameraAI] Object search failed:", err);
    return { message: "I had trouble searching for that object.", action: "none" };
  }
}

const TRACKING_CONFIG = {
  deadZone: 0.12,
  innerDeadZone: 0.04,
  maxIterations: 20,
  centeredConfirmations: 1,      // Was 2 - trust first detection
  moveDurationMs: 80,            // Was 120
  settleDurationMs: 80,          // Was 250 - camera settles fast
  zoomStepDurationMs: 150,       // Was 300 - zoom faster
  zoomSettleMs: 50,              // Was 150 (hardcoded) - minimal settle
  ptzSpeed: 14,                  // Was 6 - move faster
  ptzMinSpeed: 6,                // Was 2 - even min is faster
  ptzFineTuneSpeed: 3,           // Was 1 - fine tune faster too
};

const ZOOM_TARGETS: Record<TrackIntent["zoomLevel"], number> = {
  medium: 0.35,
  tight: 0.50,
  close: 0.70,
};

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function trackAndZoomToObject(
  camera: CameraProfile,
  apiKey: string,
  objectName: string,
  zoomLevel: TrackIntent["zoomLevel"],
  getFrame?: () => Promise<string | null>
): Promise<AIResponse> {
  console.log(`[TrackZoom] Starting track & zoom for "${objectName}" to ${zoomLevel}`);
  
  activeTrackingCancelled = false;
  activeTrackingInProgress = true;
  
  try {
    const captureFrame = async (): Promise<string | null> => {
      if (activeTrackingCancelled) return null;
      if (getFrame) {
        return getFrame();
      }
      return fetchCameraFrame(camera);
    };

    const frame = await captureFrame();
    if (!frame) {
      activeTrackingInProgress = false;
      if (activeTrackingCancelled) {
        return { message: "Tracking cancelled.", action: "none" };
      }
      return { message: "I couldn't capture an image from the camera.", action: "none" };
    }

    let imageBase64 = frame;
    if (imageBase64.startsWith("data:")) {
      imageBase64 = imageBase64.split(",")[1];
    }

    console.log(`[TrackZoom] Detecting "${objectName}" with Moondream...`);
    const detection = await detectObject(imageBase64, apiKey, objectName);

    if (!detection.found || !detection.box) {
      return { 
        message: `I couldn't find "${objectName}" in the current view. Try panning the camera or describing what you're looking for differently.`, 
        action: "none",
        imageUri: frame,
      };
    }

    const box = detection.box;
    const boxCenterX = (box.x_min + box.x_max) / 2;
    const boxCenterY = (box.y_min + box.y_max) / 2;
    console.log(`[TrackZoom] Found "${objectName}" at box: x=${box.x_min.toFixed(3)}-${box.x_max.toFixed(3)} y=${box.y_min.toFixed(3)}-${box.y_max.toFixed(3)} center=(${(boxCenterX * 100).toFixed(1)}%, ${(boxCenterY * 100).toFixed(1)}%)`);

    let trackingId: string | null = null;
    console.log(`[TrackZoom] VisionTracking.isVisionAvailable = ${VisionTracking.isVisionAvailable}`);
    
    if (VisionTracking.isVisionAvailable) {
      const width = box.x_max - box.x_min;
      const height = box.y_max - box.y_min;
      trackingId = VisionTracking.startTracking(box.x_min, box.y_min, width, height);
      console.log(`[TrackZoom] Started Vision tracking with ID: ${trackingId}`);
    } else {
      console.log(`[TrackZoom] Vision not available, will use Moondream for centering`);
    }

    if (activeTrackingCancelled) {
      activeTrackingInProgress = false;
      return { message: "Tracking cancelled.", action: "none" };
    }

    const centerResult = await centerOnObject(camera, apiKey, objectName, detection.box, captureFrame, trackingId);
    
    if (activeTrackingCancelled) {
      if (trackingId) VisionTracking.stopTracking(trackingId);
      activeTrackingInProgress = false;
      return { message: "Tracking cancelled.", action: "none" };
    }
    
    if (!centerResult.success) {
      if (trackingId) VisionTracking.stopTracking(trackingId);
      activeTrackingInProgress = false;
      return { 
        message: `I found "${objectName}" but had trouble centering on it. The camera may have moved.`, 
        action: "moved_camera",
        imageUri: centerResult.frame || frame,
      };
    }

    console.log(`[TrackZoom] Centered on "${objectName}", now zooming to ${zoomLevel}...`);
    
    const targetHeight = ZOOM_TARGETS[zoomLevel];
    const zoomResult = await zoomToTarget(camera, apiKey, objectName, targetHeight, captureFrame, trackingId, centerResult.box);

    if (trackingId) VisionTracking.stopTracking(trackingId);
    activeTrackingInProgress = false;

    if (activeTrackingCancelled) {
      return { message: "Tracking cancelled.", action: "none" };
    }

    const finalFrame = await captureFrame();
    
    return {
      message: `Zoomed in on "${objectName}". ${zoomResult.success ? `Got a nice ${zoomLevel} shot!` : "Reached maximum zoom."}`,
      action: "moved_camera",
      imageUri: finalFrame || frame,
    };

  } catch (err) {
    activeTrackingInProgress = false;
    console.error("[TrackZoom] Error:", err);
    return { message: `I had trouble tracking "${objectName}".`, action: "none" };
  }
}

interface CenterResult {
  success: boolean;
  box?: { x_min: number; y_min: number; x_max: number; y_max: number };
  frame?: string;
}

async function centerOnObject(
  camera: CameraProfile,
  apiKey: string,
  objectName: string,
  initialBox: { x_min: number; y_min: number; x_max: number; y_max: number },
  captureFrame: () => Promise<string | null>,
  initialTrackingId: string | null
): Promise<CenterResult> {
  let iterations = 0;
  let centeredCount = 0;
  let lastBox = initialBox;
  let lastFrame: string | undefined;
  let trackingId = initialTrackingId;

  console.log(`[CenterObject] Starting centering for "${objectName}" trackingId=${trackingId} visionAvailable=${VisionTracking.isVisionAvailable}`);

  while (iterations < TRACKING_CONFIG.maxIterations) {
    iterations++;

    const frame = await captureFrame();
    if (!frame) {
      await delay(100);
      continue;
    }
    lastFrame = frame;

    let imageBase64 = frame;
    if (imageBase64.startsWith("data:")) {
      imageBase64 = imageBase64.split(",")[1];
    }

    let currentBox = lastBox;
    let trackingSource = "stale";
    
    if (trackingId && VisionTracking.isVisionAvailable) {
      const trackResult = await VisionTracking.updateTracking(trackingId, imageBase64);
      console.log(`[CenterObject] Iter ${iterations}: Vision tracking result:`, trackResult ? `conf=${trackResult.confidence?.toFixed(2)} lost=${trackResult.isLost} x=${trackResult.x?.toFixed(3)} y=${trackResult.y?.toFixed(3)}` : "NULL");
      
      if (trackResult && !trackResult.isLost && trackResult.confidence > 0.3) {
        currentBox = {
          x_min: trackResult.x,
          y_min: trackResult.y,
          x_max: trackResult.x + trackResult.width,
          y_max: trackResult.y + trackResult.height,
        };
        lastBox = currentBox;
        trackingSource = "vision";
      } else {
        console.log(`[CenterObject] Vision tracking lost/low confidence, falling back to Moondream`);
        const detection = await detectObject(imageBase64, apiKey, objectName);
        if (detection.found && detection.box) {
          currentBox = detection.box;
          lastBox = currentBox;
          trackingSource = "moondream-fallback";
          
          if (trackingId) {
            VisionTracking.stopTracking(trackingId);
            const width = currentBox.x_max - currentBox.x_min;
            const height = currentBox.y_max - currentBox.y_min;
            trackingId = VisionTracking.startTracking(currentBox.x_min, currentBox.y_min, width, height);
            console.log(`[CenterObject] Restarted Vision tracking with new box`);
          }
        } else {
          console.log(`[CenterObject] Moondream fallback also failed`);
          if (iterations > 3) break;
          await delay(100);
          continue;
        }
      }
    } else {
      const detection = await detectObject(imageBase64, apiKey, objectName);
      console.log(`[CenterObject] Iter ${iterations}: Moondream detection:`, detection.found ? `found at x=${detection.box?.x_min?.toFixed(3)}-${detection.box?.x_max?.toFixed(3)}` : "NOT FOUND");
      
      if (detection.found && detection.box) {
        currentBox = detection.box;
        lastBox = currentBox;
        trackingSource = "moondream";
      } else {
        console.log(`[CenterObject] Lost object on iteration ${iterations}`);
        if (iterations > 3) break;
        await delay(100);
        continue;
      }
    }

    const centerX = (currentBox.x_min + currentBox.x_max) / 2;
    const centerY = (currentBox.y_min + currentBox.y_max) / 2;
    const offsetX = Math.abs(centerX - 0.5);
    const offsetY = Math.abs(centerY - 0.5);
    const maxOffset = Math.max(offsetX, offsetY);
    
    console.log(`[CenterObject] Iter ${iterations}: source=${trackingSource} center=(${(centerX * 100).toFixed(1)}%, ${(centerY * 100).toFixed(1)}%) offset=(${(offsetX * 100).toFixed(1)}%, ${(offsetY * 100).toFixed(1)}%)`);
    
    const direction = calculatePtzDirection(centerX, centerY, TRACKING_CONFIG.innerDeadZone);
    console.log(`[CenterObject] Iter ${iterations}: direction pan=${direction.pan || 'null'} tilt=${direction.tilt || 'null'} innerDeadzone=${(TRACKING_CONFIG.innerDeadZone * 100).toFixed(0)}%`);

    if (direction.pan === null && direction.tilt === null) {
      centeredCount++;
      console.log(`[CenterObject] In inner deadzone (${centeredCount}/${TRACKING_CONFIG.centeredConfirmations})`);
      
      if (centeredCount >= TRACKING_CONFIG.centeredConfirmations) {
        console.log(`[CenterObject] SUCCESS: Centered in ${iterations} iterations`);
        return { success: true, box: lastBox, frame: lastFrame };
      }
      await delay(30);
      continue;
    }

    centeredCount = 0;
    const ptzDirection = getPtzDirectionFromPanTilt(direction.pan, direction.tilt);
    const isFineTuning = maxOffset <= TRACKING_CONFIG.deadZone && maxOffset > TRACKING_CONFIG.innerDeadZone;
    console.log(`[CenterObject] Iter ${iterations}: PTZ direction=${ptzDirection || 'NONE'} fineTune=${isFineTuning}`);

    if (ptzDirection) {
      let scaledSpeed: number;
      let moveTime: number;
      
      if (isFineTuning) {
        scaledSpeed = TRACKING_CONFIG.ptzFineTuneSpeed;
        moveTime = 40;
      } else {
        const normalizedOffset = Math.min(1, (maxOffset - TRACKING_CONFIG.deadZone) / (0.4 - TRACKING_CONFIG.deadZone));
        scaledSpeed = Math.round(
          TRACKING_CONFIG.ptzMinSpeed + normalizedOffset * (TRACKING_CONFIG.ptzSpeed - TRACKING_CONFIG.ptzMinSpeed)
        );
        moveTime = Math.max(40, Math.min(150, Math.round(40 + normalizedOffset * 110)));
      }
      
      console.log(`[CenterObject] Sending VISCA: ${ptzDirection} @ speed ${scaledSpeed} for ${moveTime}ms ${isFineTuning ? '(fine-tuning)' : ''}`);
      const moveResult = await sendPtzViscaCommand(camera, ptzDirection, scaledSpeed, scaledSpeed);
      console.log(`[CenterObject] PTZ move result: ${moveResult ? 'OK' : 'FAILED'}`);
      
      await delay(moveTime);
      
      const stopResult = await sendPtzViscaCommand(camera, "stop", scaledSpeed, scaledSpeed);
      console.log(`[CenterObject] PTZ stop result: ${stopResult ? 'OK' : 'FAILED'}`);
      
      await delay(TRACKING_CONFIG.settleDurationMs);
    } else {
      console.log(`[CenterObject] No PTZ direction generated`);
    }
  }

  console.log(`[CenterObject] Max iterations reached`);
  return { success: lastBox !== initialBox, box: lastBox, frame: lastFrame };
}

interface ZoomResult {
  success: boolean;
  box?: { x_min: number; y_min: number; x_max: number; y_max: number };
}

async function zoomToTarget(
  camera: CameraProfile,
  apiKey: string,
  objectName: string,
  targetHeight: number,
  captureFrame: () => Promise<string | null>,
  trackingId: string | null,
  initialBox?: { x_min: number; y_min: number; x_max: number; y_max: number }
): Promise<ZoomResult> {
  const maxZoomSteps = 10;
  let lastBox = initialBox;

  for (let step = 0; step < maxZoomSteps; step++) {
    await sendZoomViscaCommand(camera, "in", 5);
    await delay(TRACKING_CONFIG.zoomStepDurationMs);
    await sendZoomViscaCommand(camera, "stop");
    await delay(TRACKING_CONFIG.zoomSettleMs);

    const centerResult = await centerOnObject(camera, apiKey, objectName, lastBox!, captureFrame, trackingId);
    
    if (!centerResult.success || !centerResult.box) {
      console.log(`[ZoomTarget] Lost object during zoom step ${step + 1}`);
      if (step === 0) return { success: false };
      break;
    }

    lastBox = centerResult.box;
    const currentHeight = lastBox.y_max - lastBox.y_min;
    console.log(`[ZoomTarget] Step ${step + 1}: box height ${(currentHeight * 100).toFixed(1)}% (target: ${(targetHeight * 100).toFixed(0)}%)`);

    if (currentHeight >= targetHeight) {
      console.log(`[ZoomTarget] Target reached at step ${step + 1}`);
      return { success: true, box: lastBox };
    }
  }

  return { success: false, box: lastBox };
}

export async function processUserInput(
  input: string,
  camera: CameraProfile | null,
  apiKey: string
): Promise<AIResponse> {
  if (!camera) {
    return { message: "No camera is connected. Please connect a camera first.", action: "none" };
  }
  
  const intent = parseIntent(input);
  console.log("[CameraAI] Parsed intent:", intent.type, intent.details);
  
  switch (intent.type) {
    case "command":
      return executeCommand(camera, intent.details as CommandIntent);
      
    case "question":
      return answerQuestion(camera, apiKey, (intent.details as QuestionIntent).question);
      
    case "search":
      return searchForObject(camera, (intent.details as SearchIntent).objectName);
      
    default:
      return answerQuestion(camera, apiKey, input);
  }
}

export async function answerQuestionWithFrame(
  apiKey: string,
  question: string,
  getFrame: () => Promise<string | null>
): Promise<AIResponse> {
  try {
    const frame = await getFrame();
    if (!frame) {
      return { message: "I couldn't capture an image right now.", action: "none" };
    }
    
    let imageBase64 = frame;
    if (imageBase64.startsWith("data:")) {
      imageBase64 = imageBase64.split(",")[1];
    }

    const visionQuestionType = getVisionQuestionType(question);
    
    if (visionQuestionType && VisionTracking.isVisionAvailable) {
      const visionAnswer = await answerWithVision(imageBase64, visionQuestionType, frame);
      if (visionAnswer) {
        if (!apiKey) {
          return visionAnswer;
        }
        if (visionQuestionType === "count_people" || visionQuestionType === "count_faces" || 
            visionQuestionType === "count_animals" || visionQuestionType === "anyone_there") {
          return visionAnswer;
        }
      }
    }

    if (!apiKey) {
      if (VisionTracking.isVisionAvailable) {
        const visionResult = await generateVisionDescription(imageBase64);
        return {
          message: visionResult.natural,
          action: "captured_image",
          imageUri: frame,
          source: "vision",
        };
      }
      return { message: "I need a Moondream API key to answer detailed questions. You can add one in Settings.", action: "none" };
    }
    
    const prompt = question.endsWith("?") ? question : `${question}?`;
    
    const analysis = VisionTracking.isVisionAvailable ? await analyzeScene(imageBase64) : null;
    const context = analysis ? buildMoondreamContext(analysis) : "";
    const enhancedPrompt = context ? `${prompt}\n\nContext: ${context}` : prompt;
    
    const result = await describeScene(imageBase64, apiKey, enhancedPrompt);
    
    if (result.error) {
      if (VisionTracking.isVisionAvailable) {
        const visionResult = await generateVisionDescription(imageBase64);
        return {
          message: visionResult.natural,
          action: "captured_image",
          imageUri: frame,
          source: "vision",
        };
      }
      return {
        message: `I had trouble analyzing the image: ${result.error}`,
        action: "none",
      };
    }
    
    return {
      message: result.description || "I couldn't determine an answer from what I see.",
      action: "captured_image",
      imageUri: frame,
      source: "moondream",
    };
  } catch (err) {
    console.error("[CameraAI] Question answering failed:", err);
    return { message: "I had trouble analyzing the image.", action: "none" };
  }
}

export async function processUserInputWithFrame(
  input: string,
  camera: CameraProfile | null,
  apiKey: string,
  getFrame?: () => Promise<string | null>
): Promise<AIResponse> {
  let intent = parseIntent(input);
  console.log("[CameraAI] Parsed intent:", intent.type, intent.details, "confidence:", intent.confidence);
  
  if (intent.needsAIClassification && apiKey) {
    console.log("[CameraAI] Low confidence, using AI classification...");
    intent = await classifyIntentWithAI(input, apiKey);
    console.log("[CameraAI] AI classified as:", intent.type, intent.details);
  }
  
  switch (intent.type) {
    case "command":
      if (!camera) {
        return { message: "I can't move the camera - no PTZ camera is connected. Connect to a PTZ camera first.", action: "none" };
      }
      return executeCommand(camera, intent.details as CommandIntent);
      
    case "question":
      if (getFrame) {
        return answerQuestionWithFrame(apiKey, (intent.details as QuestionIntent).question, getFrame);
      }
      if (!camera) {
        return { message: "I can't see anything - no camera source available.", action: "none" };
      }
      return answerQuestion(camera, apiKey, (intent.details as QuestionIntent).question);
      
    case "search":
      if (!camera) {
        return { message: "I can't search without a PTZ camera connected.", action: "none" };
      }
      return searchForObject(camera, (intent.details as SearchIntent).objectName);
      
    case "track":
      if (!camera) {
        return { message: "I can't track objects without a PTZ camera connected.", action: "none" };
      }
      if (!apiKey) {
        return { message: "I need a Moondream API key to detect and track objects. Add one in Settings.", action: "none" };
      }
      const trackIntent = intent.details as TrackIntent;
      return trackAndZoomToObject(camera, apiKey, trackIntent.objectName, trackIntent.zoomLevel, getFrame);
      
    case "unknown":
      if (apiKey && camera) {
        return { message: "I'm not sure what you want me to do. Try saying something like 'pan left', 'zoom in', or 'what do you see?'", action: "none" };
      }
      if (getFrame) {
        return answerQuestionWithFrame(apiKey, input, getFrame);
      }
      return { message: "I'm not sure what you want me to do. Try a specific command like 'pan left' or a question like 'what do you see?'", action: "none" };
      
    default:
      if (getFrame) {
        return answerQuestionWithFrame(apiKey, input, getFrame);
      }
      if (!camera) {
        return { message: "I can't see anything - no camera source available.", action: "none" };
      }
      return answerQuestion(camera, apiKey, input);
  }
}

export function getSuggestedPrompts(): string[] {
  return [
    "What do you see?",
    "Is anyone in the room?",
    "Zoom into the guitar",
    "Focus on that person",
    "Pan left slowly",
    "Find my phone",
    "Where is the door?",
    "How many chairs are there?",
    "Describe the room",
    "Track the plant",
  ];
}
