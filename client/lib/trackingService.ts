import { CameraProfile } from "./storage";
import { sendPtzCommand, PTZ_COMMANDS } from "./camera";
import { getApiUrl } from "./query-client";

export interface DetectionResult {
  found: boolean;
  x?: number; // normalized 0-1
  y?: number; // normalized 0-1
  confidence?: number;
  error?: string;
}

export interface TrackingState {
  isTracking: boolean;
  targetObject: string;
  lastDetection: DetectionResult | null;
  lastPtzCommand: string | null;
  errorCount: number;
}

export interface TrackingConfig {
  deadZone: number; // percentage of frame center to ignore (0-1)
  ptzSpeed: number; // 1-24 for PTZOptics
  updateInterval: number; // ms between tracking updates
  maxErrorsBeforeStop: number;
}

const DEFAULT_CONFIG: TrackingConfig = {
  deadZone: 0.15, // 15% dead zone in center
  ptzSpeed: 12, // medium speed
  updateInterval: 500, // 2 updates per second (limited by Moondream API)
  maxErrorsBeforeStop: 5,
};

// Map tracking model IDs to object descriptions for Moondream
export function getObjectDescription(modelId: string): string {
  switch (modelId) {
    case "person":
      return "person";
    case "ball":
      return "ball or sports ball";
    case "face":
      return "face or human face";
    case "multi":
      return "moving object or person";
    default:
      return "person";
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
  objectType: string,
  apiKey: string,
  config: TrackingConfig = DEFAULT_CONFIG
): Promise<{
  detection: DetectionResult;
  ptzCommand: string | null;
  direction: { pan: "left" | "right" | null; tilt: "up" | "down" | null };
}> {
  // Detect object
  const detection = await detectObject(imageBase64, objectType, apiKey);

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
    // Brief movement then stop (pulse mode for smoother tracking)
    setTimeout(() => {
      sendPtzCommand(camera, PTZ_COMMANDS.stop);
    }, 200);
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

  constructor(
    camera: CameraProfile,
    apiKey: string,
    targetObject: string,
    getFrame: () => Promise<string | null>,
    onStateChange: (state: TrackingState) => void,
    config: Partial<TrackingConfig> = {}
  ) {
    this.camera = camera;
    this.apiKey = apiKey;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.getFrameCallback = getFrame;
    this.onStateChange = onStateChange;
    this.state = {
      isTracking: false,
      targetObject,
      lastDetection: null,
      lastPtzCommand: null,
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
        const { detection, ptzCommand } = await executeTrackingStep(
          this.camera,
          base64Data,
          getObjectDescription(this.state.targetObject),
          this.apiKey,
          this.config
        );

        // Update state
        this.state = {
          ...this.state,
          lastDetection: detection,
          lastPtzCommand: ptzCommand,
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
