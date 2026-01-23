import { CameraProfile } from "./storage";
import { sendPtzCommand, PTZ_COMMANDS } from "./camera";
import { getApiUrl } from "./query-client";
import { TrackingModel, getModelInfo } from "./tracking";

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface DetectionResult {
  found: boolean;
  x?: number; // normalized 0-1
  y?: number; // normalized 0-1
  confidence?: number;
  box?: BoundingBox; // bounding box (normalized 0-1)
  error?: string;
}

export interface TrackingState {
  isTracking: boolean;
  targetObject: string;
  lastDetection: DetectionResult | null;
  lastPtzCommand: string | null;
  lastDirection: { pan: "left" | "right" | null; tilt: "up" | "down" | null } | null;
  inDeadzone: boolean;
  errorCount: number;
}

export interface TrackingConfig {
  deadZone: number; // percentage of frame center to ignore (0-1)
  ptzSpeed: number; // 1-24 for PTZOptics
  pulseDuration: number; // ms to move before stopping
  updateInterval: number; // ms between tracking updates
  maxErrorsBeforeStop: number;
}

const DEFAULT_CONFIG: TrackingConfig = {
  deadZone: 0.15, // 15% dead zone in center
  ptzSpeed: 18, // higher speed for faster response
  pulseDuration: 400, // 400ms movement pulse (was 200ms)
  updateInterval: 500, // 2 updates per second (limited by Moondream API)
  maxErrorsBeforeStop: 5,
};

// Map tracking model IDs to object descriptions for Moondream (custom mode only)
export function getObjectDescription(modelId: string, customObject?: string): string {
  if (modelId === "custom" && customObject) {
    return customObject;
  }
  switch (modelId) {
    case "person":
      return "person";
    case "ball":
      return "ball or sports ball";
    case "face":
      return "face or human face";
    case "multi-object":
      return "moving object or person";
    default:
      return modelId;
  }
}

// Check if model uses YOLO (local) or Moondream (API)
export function usesYoloBackend(modelId: string): boolean {
  const info = getModelInfo(modelId as TrackingModel);
  return info?.usesYolo ?? false;
}

// Detect objects using YOLO backend (local, no API key needed)
export async function detectWithYolo(
  imageBase64: string,
  modelType: string
): Promise<DetectionResult> {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(new URL("/api/yolo/detect", apiUrl).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imageBase64,
        model_type: modelType,
      }),
    });

    if (!response.ok) {
      return { found: false, error: `YOLO API error: ${response.status}` };
    }

    const result = await response.json();
    return {
      found: result.found,
      x: result.x,
      y: result.y,
      confidence: result.confidence,
      box: result.box,
      error: result.error,
    };
  } catch (error: any) {
    console.error("YOLO detection error:", error);
    return { found: false, error: error.message };
  }
}

// Calculate PTZ direction based on object position
export function calculatePtzDirection(
  x: number,
  y: number,
  deadZone: number
): { pan: "left" | "right" | null; tilt: "up" | "down" | null } {
  // Object position is 0-1, center is 0.5
  const centerX = 0.5;
  const centerY = 0.5;

  const deltaX = x - centerX;
  const deltaY = y - centerY;

  let pan: "left" | "right" | null = null;
  let tilt: "up" | "down" | null = null;

  // Only move if outside dead zone
  if (Math.abs(deltaX) > deadZone) {
    pan = deltaX > 0 ? "right" : "left";
  }

  if (Math.abs(deltaY) > deadZone) {
    tilt = deltaY > 0 ? "down" : "up";
  }

  return { pan, tilt };
}

// Get PTZ command string based on direction
export function getPtzCommandForDirection(
  pan: "left" | "right" | null,
  tilt: "up" | "down" | null
): string | null {
  if (pan && tilt) {
    // Diagonal movement
    if (pan === "left" && tilt === "up") return PTZ_COMMANDS.upleft;
    if (pan === "right" && tilt === "up") return PTZ_COMMANDS.upright;
    if (pan === "left" && tilt === "down") return PTZ_COMMANDS.downleft;
    if (pan === "right" && tilt === "down") return PTZ_COMMANDS.downright;
  } else if (pan) {
    return pan === "left" ? PTZ_COMMANDS.left : PTZ_COMMANDS.right;
  } else if (tilt) {
    return tilt === "up" ? PTZ_COMMANDS.up : PTZ_COMMANDS.down;
  }

  return null;
}

// Detect object in image using Moondream API
export async function detectObject(
  imageBase64: string,
  objectType: string,
  apiKey: string
): Promise<DetectionResult> {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(new URL("/api/detect-object", apiUrl).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageBase64,
        apiKey,
        object: objectType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        found: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    console.error("Detection request failed:", error);
    return {
      found: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// Execute tracking step: detect object and send PTZ command
export async function executeTrackingStep(
  camera: CameraProfile,
  imageBase64: string,
  modelId: string,
  apiKey: string,
  config: TrackingConfig = DEFAULT_CONFIG,
  customObject?: string
): Promise<{
  detection: DetectionResult;
  ptzCommand: string | null;
  direction: { pan: "left" | "right" | null; tilt: "up" | "down" | null };
}> {
  // Choose detection backend based on model
  let detection: DetectionResult;
  
  if (usesYoloBackend(modelId)) {
    // Use YOLO backend (local, no API key)
    detection = await detectWithYolo(imageBase64, modelId);
  } else {
    // Use Moondream API for custom objects
    const objectDescription = getObjectDescription(modelId, customObject);
    detection = await detectObject(imageBase64, objectDescription, apiKey);
  }

  if (!detection.found || detection.x === undefined || detection.y === undefined) {
    // Object not found - stop PTZ movement
    await sendPtzCommand(camera, PTZ_COMMANDS.stop);
    return { detection, ptzCommand: PTZ_COMMANDS.stop, direction: { pan: null, tilt: null } };
  }

  // Calculate direction
  const direction = calculatePtzDirection(detection.x, detection.y, config.deadZone);

  // Get and send PTZ command
  const ptzCommand = getPtzCommandForDirection(direction.pan, direction.tilt);

  if (ptzCommand) {
    await sendPtzCommand(camera, ptzCommand);
    // Movement pulse - longer duration = more movement per detection
    setTimeout(() => {
      sendPtzCommand(camera, PTZ_COMMANDS.stop);
    }, config.pulseDuration);
  }

  return { detection, ptzCommand, direction };
}

// Create a tracking controller class for managing continuous tracking
export class TrackingController {
  private camera: CameraProfile;
  private apiKey: string;
  private config: TrackingConfig;
  private isRunning: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private getFrameCallback: () => Promise<string | null>;
  private onStateChange: (state: TrackingState) => void;
  private state: TrackingState;
  private modelId: string;
  private customObject?: string;

  constructor(
    camera: CameraProfile,
    apiKey: string,
    modelId: string,
    getFrame: () => Promise<string | null>,
    onStateChange: (state: TrackingState) => void,
    config: Partial<TrackingConfig> = {},
    customObject?: string
  ) {
    this.camera = camera;
    this.apiKey = apiKey;
    this.modelId = modelId;
    this.customObject = customObject;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.getFrameCallback = getFrame;
    this.onStateChange = onStateChange;
    this.state = {
      isTracking: false,
      targetObject: customObject || getObjectDescription(modelId),
      lastDetection: null,
      lastPtzCommand: null,
      lastDirection: null,
      inDeadzone: false,
      errorCount: 0,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.state = {
      ...this.state,
      isTracking: true,
      errorCount: 0,
    };
    this.onStateChange(this.state);

    this.runTrackingLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop PTZ movement
    sendPtzCommand(this.camera, PTZ_COMMANDS.stop);

    this.state = {
      ...this.state,
      isTracking: false,
    };
    this.onStateChange(this.state);
  }

  private async runTrackingLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Get current frame
        const frame = await this.getFrameCallback();

        if (!frame) {
          this.state.errorCount++;
          if (this.state.errorCount >= this.config.maxErrorsBeforeStop) {
            console.warn("Too many frame capture errors, stopping tracking");
            this.stop();
            return;
          }
          await this.sleep(this.config.updateInterval);
          continue;
        }

        // Strip data URI prefix if present
        const base64Data = frame.includes(",") ? frame.split(",")[1] : frame;

        // Execute tracking step
        const { detection, ptzCommand, direction } = await executeTrackingStep(
          this.camera,
          base64Data,
          this.modelId,
          this.apiKey,
          this.config,
          this.customObject
        );

        // Check if in deadzone (no movement needed)
        const inDeadzone = detection.found && direction.pan === null && direction.tilt === null;

        // Update state
        this.state = {
          ...this.state,
          lastDetection: detection,
          lastPtzCommand: ptzCommand,
          lastDirection: direction,
          inDeadzone,
          errorCount: detection.error ? this.state.errorCount + 1 : 0,
        };
        this.onStateChange(this.state);

        // Check error threshold
        if (this.state.errorCount >= this.config.maxErrorsBeforeStop) {
          console.warn("Too many detection errors, stopping tracking");
          this.stop();
          return;
        }
      } catch (error) {
        console.error("Tracking loop error:", error);
        this.state.errorCount++;
        this.onStateChange(this.state);

        if (this.state.errorCount >= this.config.maxErrorsBeforeStop) {
          this.stop();
          return;
        }
      }

      await this.sleep(this.config.updateInterval);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  updateTargetObject(objectType: string): void {
    this.state = {
      ...this.state,
      targetObject: objectType,
    };
    this.onStateChange(this.state);
  }

  getState(): TrackingState {
    return { ...this.state };
  }
}
