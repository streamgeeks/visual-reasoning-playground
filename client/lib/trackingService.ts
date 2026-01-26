import { CameraProfile } from "./storage";
import { sendPtzViscaCommand, PtzDirection } from "./camera";
import { TrackingModel, getModelInfo, VisionRequestType, getYoloLabel, TrackingModelInfo, TrackingMode, TrackingBackendStatus, TrackingStatusInfo } from "./tracking";
import { detectObject as moondreamDetect } from "./moondream";
import * as VisionTracking from "vision-tracking";
import * as ImageManipulator from "expo-image-manipulator";
import { 
  checkNativeDetectionStatus, 
  detectAllObjects,
  detectObjectsMatching,
  NativeDetectionResult,
  NativeDetectionStatus,
} from "./nativeDetection";

export type { NativeDetectionStatus };

let cachedYoloStatus: NativeDetectionStatus | null = null;

export async function getYoloStatus(): Promise<NativeDetectionStatus> {
  if (!cachedYoloStatus) {
    cachedYoloStatus = await checkNativeDetectionStatus();
  }
  return cachedYoloStatus;
}

export function clearYoloStatusCache(): void {
  cachedYoloStatus = null;
}

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
  statusInfo: TrackingStatusInfo;
}

export interface TrackingConfig {
  deadZone: number;
  ptzSpeed: number;
  pulseDuration: number;
  updateInterval: number;
  maxErrorsBeforeStop: number;
  continuousMode: boolean;
  trackingMode: TrackingMode;
}

const DEFAULT_CONFIG: TrackingConfig = {
  deadZone: 0.15,
  ptzSpeed: 2,
  pulseDuration: 0,
  updateInterval: 500,
  maxErrorsBeforeStop: 5,
  continuousMode: true,
  trackingMode: "detection-only",
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

export function usesYoloBackend(modelId: string): boolean {
  const info = getModelInfo(modelId as TrackingModel);
  return info?.usesYolo ?? false;
}

export function usesVisionBackend(modelId: string): boolean {
  const info = getModelInfo(modelId as TrackingModel);
  return (info?.usesVision ?? false) && VisionTracking.isVisionAvailable;
}

export function getVisionRequestType(modelId: string): VisionRequestType {
  const info = getModelInfo(modelId as TrackingModel);
  return info?.visionRequest ?? null;
}

export async function detectWithYolo(
  imageBase64: string,
  modelType: string,
  apiKey?: string
): Promise<DetectionResult> {
  const modelInfo = getModelInfo(modelType as TrackingModel);
  
  try {
    const status = await getYoloStatus();
    
    if (status.yoloLoaded) {
      const yoloLabel = getYoloLabel(modelType as TrackingModel);
      
      let detections: NativeDetectionResult[];
      if (yoloLabel) {
        detections = await detectObjectsMatching(imageBase64, yoloLabel, 5);
      } else {
        detections = await detectAllObjects(imageBase64);
      }

      if (detections.length > 0) {
        const best = detections.reduce((a, b) => 
          a.confidence > b.confidence ? a : b
        );

        const centerX = best.boundingBox.x + best.boundingBox.width / 2;
        const centerY = best.boundingBox.y + best.boundingBox.height / 2;

        return {
          found: true,
          x: centerX,
          y: centerY,
          confidence: best.confidence,
          box: {
            x_min: best.boundingBox.x,
            y_min: best.boundingBox.y,
            x_max: best.boundingBox.x + best.boundingBox.width,
            y_max: best.boundingBox.y + best.boundingBox.height,
          },
        };
      }
    }
    
    // YOLO not loaded or no detections - try fallbacks
    return await detectWithFallback(imageBase64, modelInfo, apiKey);
    
  } catch (error) {
    console.error("[detectWithYolo] Error:", error);
    // Try fallback on error
    return await detectWithFallback(imageBase64, modelInfo, apiKey);
  }
}

async function detectWithFallback(
  imageBase64: string,
  modelInfo: TrackingModelInfo,
  apiKey?: string
): Promise<DetectionResult> {
  // Try Vision framework fallback first (faster, on-device)
  if (modelInfo.fallbackVision && VisionTracking.isVisionAvailable) {
    console.log(`[Fallback] Using Vision (${modelInfo.fallbackVision}) for ${modelInfo.id}`);
    const result = await detectWithVision(imageBase64, modelInfo.fallbackVision);
    if (result.found) {
      return result;
    }
  }
  
  // Try Moondream fallback (cloud-based)
  if (modelInfo.fallbackMoondream && apiKey) {
    console.log(`[Fallback] Using Moondream for ${modelInfo.id}: "${modelInfo.fallbackMoondream}"`);
    const result = await moondreamDetect(imageBase64, apiKey, modelInfo.fallbackMoondream);
    return {
      found: result.found,
      x: result.x,
      y: result.y,
      confidence: result.confidence,
      box: result.box,
      error: result.error,
    };
  }
  
  return { 
    found: false, 
    error: "YOLO model not loaded and no fallback available" 
  };
}

async function cropDetection(
  imageBase64: string,
  detection: VisionTracking.DetectionResult,
  frameWidth: number = 1920,
  frameHeight: number = 1080
): Promise<string> {
  const dataUri = `data:image/jpeg;base64,${imageBase64}`;
  
  const originX = Math.round(detection.x * frameWidth);
  const originY = Math.round(detection.y * frameHeight);
  const width = Math.round(detection.width * frameWidth);
  const height = Math.round(detection.height * frameHeight);
  
  const result = await ImageManipulator.manipulateAsync(
    dataUri,
    [{
      crop: {
        originX,
        originY,
        width: Math.max(1, width),
        height: Math.max(1, height),
      },
    }],
    { base64: true, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  return result.base64 || "";
}

const IDENTITY_SIMILARITY_THRESHOLD = 0.7;

export async function detectWithVision(
  imageBase64: string,
  visionRequestType: VisionRequestType,
  targetEmbedding?: number[]
): Promise<DetectionResult> {
  if (!VisionTracking.isVisionAvailable || !visionRequestType) {
    return { found: false, error: "Vision framework not available" };
  }

  try {
    let detections: VisionTracking.DetectionResult[] = [];

    switch (visionRequestType) {
      case "human":
        detections = await VisionTracking.detectHumans(imageBase64);
        break;
      case "face":
        detections = await VisionTracking.detectFaces(imageBase64);
        break;
      case "animal":
        detections = await VisionTracking.detectAnimals(imageBase64);
        break;
    }

    if (detections.length === 0) {
      return { found: false };
    }

    let best: VisionTracking.DetectionResult;

    if (targetEmbedding && targetEmbedding.length > 0) {
      const similarities = await Promise.all(
        detections.map(async (detection) => {
          try {
            const cropBase64 = await cropDetection(imageBase64, detection);
            const embedding = await VisionTracking.generateFeaturePrint(cropBase64);
            const similarity = await VisionTracking.calculateSimilarity(targetEmbedding, embedding);
            return { detection, similarity };
          } catch (error) {
            console.error("Failed to generate embedding for detection:", error);
            return { detection, similarity: 0 };
          }
        })
      );

      const matches = similarities.filter(s => s.similarity >= IDENTITY_SIMILARITY_THRESHOLD);
      
      if (matches.length === 0) {
        console.log("[detectWithVision] No identity match found above threshold");
        return { found: false };
      }

      best = matches.reduce((a, b) => 
        a.similarity > b.similarity ? a : b
      ).detection;
      
      console.log(`[detectWithVision] Identity match found, similarity: ${matches[0].similarity.toFixed(3)}`);
    } else {
      best = detections.reduce((a, b) => 
        a.confidence > b.confidence ? a : b
      );
    }

    const centerX = best.x + best.width / 2;
    const centerY = best.y + best.height / 2;

    return {
      found: true,
      x: centerX,
      y: centerY,
      confidence: best.confidence,
      box: {
        x_min: best.x,
        y_min: best.y,
        x_max: best.x + best.width,
        y_max: best.y + best.height,
      },
    };
  } catch (error) {
    console.error("Vision detection error:", error);
    return { 
      found: false, 
      error: error instanceof Error ? error.message : "Vision detection failed" 
    };
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

  // Debug logging for deadzone calculations
  const inDeadzoneX = Math.abs(deltaX) <= deadZone;
  const inDeadzoneY = Math.abs(deltaY) <= deadZone;
  console.log(`[PTZDirection] pos=(${(x * 100).toFixed(1)}%, ${(y * 100).toFixed(1)}%) delta=(${(deltaX * 100).toFixed(1)}%, ${(deltaY * 100).toFixed(1)}%) deadzone=${(deadZone * 100).toFixed(0)}% inDZ=(X:${inDeadzoneX}, Y:${inDeadzoneY}) => pan=${pan || 'null'} tilt=${tilt || 'null'}`);

  return { pan, tilt };
}

// Get PTZ direction based on pan/tilt
export function getPtzDirectionFromPanTilt(
  pan: "left" | "right" | null,
  tilt: "up" | "down" | null
): PtzDirection | null {
  if (pan && tilt) {
    if (pan === "left" && tilt === "up") return "upleft";
    if (pan === "right" && tilt === "up") return "upright";
    if (pan === "left" && tilt === "down") return "downleft";
    if (pan === "right" && tilt === "down") return "downright";
  } else if (pan) {
    return pan;
  } else if (tilt) {
    return tilt;
  }

  return null;
}

export async function detectObject(
  imageBase64: string,
  objectType: string,
  apiKey: string
): Promise<DetectionResult> {
  const result = await moondreamDetect(imageBase64, apiKey, objectType);
  return {
    found: result.found,
    x: result.x,
    y: result.y,
    confidence: result.confidence,
    box: result.box,
    error: result.error,
  };
}

export async function executeTrackingStep(
  camera: CameraProfile,
  imageBase64: string,
  modelId: string,
  apiKey: string,
  config: TrackingConfig = DEFAULT_CONFIG,
  customObject?: string
): Promise<{
  detection: DetectionResult;
  ptzDirection: PtzDirection | null;
  direction: { pan: "left" | "right" | null; tilt: "up" | "down" | null };
}> {
  let detection: DetectionResult;
  
  if (usesVisionBackend(modelId)) {
    const visionType = getVisionRequestType(modelId);
    detection = await detectWithVision(imageBase64, visionType);
  } else if (usesYoloBackend(modelId)) {
    detection = await detectWithYolo(imageBase64, modelId, apiKey);
  } else {
    const objectDescription = getObjectDescription(modelId, customObject);
    detection = await detectObject(imageBase64, objectDescription, apiKey);
  }

  if (!detection.found || detection.x === undefined || detection.y === undefined) {
    await sendPtzViscaCommand(camera, "stop", config.ptzSpeed, config.ptzSpeed);
    return { detection, ptzDirection: "stop", direction: { pan: null, tilt: null } };
  }

  const direction = calculatePtzDirection(detection.x, detection.y, config.deadZone);
  const ptzDirection = getPtzDirectionFromPanTilt(direction.pan, direction.tilt);

  if (ptzDirection) {
    console.log(`[Tracking] Sending VISCA: ${ptzDirection} @ speed ${config.ptzSpeed}`);
    await sendPtzViscaCommand(camera, ptzDirection, config.ptzSpeed, config.ptzSpeed);
    if (!config.continuousMode && config.pulseDuration > 0) {
      setTimeout(() => {
        sendPtzViscaCommand(camera, "stop", config.ptzSpeed, config.ptzSpeed);
      }, config.pulseDuration);
    }
  } else {
    await sendPtzViscaCommand(camera, "stop", config.ptzSpeed, config.ptzSpeed);
  }

  return { detection, ptzDirection, direction };
}

// Vision tracking update interval (faster since no API calls)
const VISION_UPDATE_INTERVAL = 150; // ms

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

  private visionTrackingId: string | null = null;
  private lastBoundingBox: BoundingBox | null = null;
  private consecutiveLostFrames: number = 0;
  private readonly LOST_FRAME_THRESHOLD = 3;
  private readonly TRACKING_CONFIDENCE_THRESHOLD = 0.3;

  private targetEmbedding: number[] | null = null;

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
      statusInfo: {
        backend: "idle",
        lastDetectionMs: 0,
        trackingFrameCount: 0,
        reacquisitionCount: 0,
        mode: this.config.trackingMode,
      },
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.state = {
      ...this.state,
      isTracking: true,
      errorCount: 0,
      statusInfo: {
        ...this.state.statusInfo,
        backend: "idle",
        trackingFrameCount: 0,
        reacquisitionCount: 0,
        mode: this.config.trackingMode,
      },
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

    this.clearVisionTracking();
    sendPtzViscaCommand(this.camera, "stop", this.config.ptzSpeed, this.config.ptzSpeed);

    this.state = {
      ...this.state,
      isTracking: false,
      statusInfo: {
        ...this.state.statusInfo,
        backend: "idle",
      },
    };
    this.onStateChange(this.state);
  }

  updateModel(modelId: string, customObject?: string): void {
    this.clearVisionTracking();
    this.modelId = modelId;
    this.customObject = customObject;
    this.state = {
      ...this.state,
      targetObject: customObject || getObjectDescription(modelId),
    };
    this.onStateChange(this.state);
    console.log(`Tracking model updated to: ${modelId}${customObject ? ` (${customObject})` : ''}`);
  }

  updateConfig(config: Partial<TrackingConfig>): void {
    const modeChanged = config.trackingMode && config.trackingMode !== this.config.trackingMode;
    this.config = { ...this.config, ...config };
    
    if (modeChanged) {
      this.clearVisionTracking();
      this.state.statusInfo.mode = this.config.trackingMode;
      this.state.statusInfo.trackingFrameCount = 0;
      console.log(`Tracking mode changed to: ${this.config.trackingMode}`);
    }
    
    console.log(`Tracking config updated:`, this.config);
  }

  getConfig(): TrackingConfig {
    return { ...this.config };
  }

  setTargetIdentity(embedding: number[]): void {
    this.targetEmbedding = embedding;
    console.log("[TrackingController] Target identity set, embedding length:", embedding.length);
  }

  clearTargetIdentity(): void {
    this.targetEmbedding = null;
    console.log("[TrackingController] Target identity cleared");
  }

  private async runTrackingLoop(): Promise<void> {
    const useVision = usesVisionBackend(this.modelId);
    const useYolo = usesYoloBackend(this.modelId);
    const useHybridMode = this.config.trackingMode === "hybrid-vision" && useYolo;
    
    const updateInterval = (useVision || useHybridMode) ? VISION_UPDATE_INTERVAL : this.config.updateInterval;

    console.log(`[TrackingLoop] Starting - mode: ${this.config.trackingMode}, useYolo: ${useYolo}, useVision: ${useVision}, hybrid: ${useHybridMode}, interval: ${updateInterval}ms`);

    while (this.isRunning) {
      try {
        const frame = await this.getFrameCallback();

        if (!frame) {
          this.state.errorCount++;
          if (this.state.errorCount >= this.config.maxErrorsBeforeStop) {
            console.warn("Too many frame capture errors, stopping tracking");
            this.stop();
            return;
          }
          await this.sleep(updateInterval);
          continue;
        }

        const base64Data = frame.includes(",") ? frame.split(",")[1] : frame;

        let detection: DetectionResult;
        let ptzDirection: PtzDirection | null;
        let direction: { pan: "left" | "right" | null; tilt: "up" | "down" | null };

        if (useVision) {
          this.updateStatus("vision-detecting");
          ({ detection, ptzDirection, direction } = await this.runVisionTrackingStep(base64Data));
        } else if (useHybridMode) {
          ({ detection, ptzDirection, direction } = await this.runYoloHybridTrackingStep(base64Data));
        } else {
          if (useYolo) {
            this.updateStatus("yolo-detecting");
          } else {
            this.updateStatus("moondream-detecting");
          }
          const startTime = Date.now();
          ({ detection, ptzDirection, direction } = await executeTrackingStep(
            this.camera,
            base64Data,
            this.modelId,
            this.apiKey,
            this.config,
            this.customObject
          ));
          this.state.statusInfo.lastDetectionMs = Date.now() - startTime;
        }

        const inDeadzone = detection.found && direction.pan === null && direction.tilt === null;

        this.state = {
          ...this.state,
          lastDetection: detection,
          lastPtzCommand: ptzDirection,
          lastDirection: direction,
          inDeadzone,
          errorCount: detection.error ? this.state.errorCount + 1 : 0,
        };
        this.onStateChange(this.state);

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

      await this.sleep(updateInterval);
    }
  }

  private async runVisionTrackingStep(base64Data: string): Promise<{
    detection: DetectionResult;
    ptzDirection: PtzDirection | null;
    direction: { pan: "left" | "right" | null; tilt: "up" | "down" | null };
  }> {
    let detection: DetectionResult = { found: false };

    if (this.visionTrackingId) {
      const trackResult = await VisionTracking.updateTracking(this.visionTrackingId, base64Data);

      if (trackResult && !trackResult.isLost && trackResult.confidence >= this.TRACKING_CONFIDENCE_THRESHOLD) {
        this.consecutiveLostFrames = 0;
        const centerX = trackResult.x + trackResult.width / 2;
        const centerY = trackResult.y + trackResult.height / 2;

        detection = {
          found: true,
          x: centerX,
          y: centerY,
          confidence: trackResult.confidence,
          box: {
            x_min: trackResult.x,
            y_min: trackResult.y,
            x_max: trackResult.x + trackResult.width,
            y_max: trackResult.y + trackResult.height,
          },
        };
        this.lastBoundingBox = detection.box!;
      } else {
        this.consecutiveLostFrames++;

        if (this.consecutiveLostFrames >= this.LOST_FRAME_THRESHOLD) {
          this.clearVisionTracking();
        }
      }
    }

    if (!this.visionTrackingId) {
      const visionType = getVisionRequestType(this.modelId);
      detection = await detectWithVision(base64Data, visionType, this.targetEmbedding || undefined);

      if (detection.found && detection.box) {
        const box = detection.box;
        const width = box.x_max - box.x_min;
        const height = box.y_max - box.y_min;

        this.visionTrackingId = VisionTracking.startTracking(box.x_min, box.y_min, width, height);
        this.lastBoundingBox = box;
        this.consecutiveLostFrames = 0;
      }
    }

    if (!detection.found || detection.x === undefined || detection.y === undefined) {
      await sendPtzViscaCommand(this.camera, "stop", this.config.ptzSpeed, this.config.ptzSpeed);
      return { detection, ptzDirection: "stop", direction: { pan: null, tilt: null } };
    }

    const direction = calculatePtzDirection(detection.x, detection.y, this.config.deadZone);
    const ptzDirection = getPtzDirectionFromPanTilt(direction.pan, direction.tilt);

    if (ptzDirection) {
      const offsetX = Math.abs(detection.x! - 0.5);
      const offsetY = Math.abs(detection.y! - 0.5);
      const maxOffset = Math.max(offsetX, offsetY);
      
      const minSpeed = 1;
      const normalizedOffset = Math.min(1, maxOffset / 0.4);
      const scaledSpeed = Math.max(minSpeed, Math.min(this.config.ptzSpeed, Math.round(minSpeed + normalizedOffset * (this.config.ptzSpeed - minSpeed))));
      const pulseDuration = Math.max(20, Math.min(50, Math.round(20 + normalizedOffset * 30)));
      
      console.log(`[VisionTracking] Pulse: ${ptzDirection} @ speed ${scaledSpeed} for ${pulseDuration}ms (offset=${(maxOffset * 100).toFixed(1)}%)`);
      await sendPtzViscaCommand(this.camera, ptzDirection, scaledSpeed, scaledSpeed);
      await this.sleep(pulseDuration);
      await sendPtzViscaCommand(this.camera, "stop", scaledSpeed, scaledSpeed);
    }

    return { detection, ptzDirection: ptzDirection || "stop", direction };
  }

  private async runYoloHybridTrackingStep(base64Data: string): Promise<{
    detection: DetectionResult;
    ptzDirection: PtzDirection | null;
    direction: { pan: "left" | "right" | null; tilt: "up" | "down" | null };
  }> {
    let detection: DetectionResult = { found: false };
    const startTime = Date.now();

    if (this.visionTrackingId) {
      this.updateStatus("vision-tracking");
      const trackResult = await VisionTracking.updateTracking(this.visionTrackingId, base64Data);

      if (trackResult && !trackResult.isLost && trackResult.confidence >= this.TRACKING_CONFIDENCE_THRESHOLD) {
        this.consecutiveLostFrames = 0;
        const centerX = trackResult.x + trackResult.width / 2;
        const centerY = trackResult.y + trackResult.height / 2;

        detection = {
          found: true,
          x: centerX,
          y: centerY,
          confidence: trackResult.confidence,
          box: {
            x_min: trackResult.x,
            y_min: trackResult.y,
            x_max: trackResult.x + trackResult.width,
            y_max: trackResult.y + trackResult.height,
          },
        };
        this.lastBoundingBox = detection.box!;
        this.state.statusInfo.trackingFrameCount++;
        this.state.statusInfo.lastDetectionMs = Date.now() - startTime;
      } else {
        this.consecutiveLostFrames++;
        if (this.consecutiveLostFrames >= this.LOST_FRAME_THRESHOLD) {
          this.clearVisionTracking();
          this.updateStatus("reacquiring");
          this.state.statusInfo.reacquisitionCount++;
        }
      }
    }

    if (!this.visionTrackingId) {
      this.updateStatus("yolo-detecting");
      detection = await detectWithYolo(base64Data, this.modelId, this.apiKey);
      this.state.statusInfo.lastDetectionMs = Date.now() - startTime;
      this.state.statusInfo.trackingFrameCount = 0;

      if (detection.found && detection.box) {
        const box = detection.box;
        const width = box.x_max - box.x_min;
        const height = box.y_max - box.y_min;

        this.visionTrackingId = VisionTracking.startTracking(box.x_min, box.y_min, width, height);
        this.lastBoundingBox = box;
        this.consecutiveLostFrames = 0;
        console.log(`[YoloHybrid] Started Vision tracker from YOLO detection`);
      }
    }

    if (!detection.found || detection.x === undefined || detection.y === undefined) {
      await sendPtzViscaCommand(this.camera, "stop", this.config.ptzSpeed, this.config.ptzSpeed);
      return { detection, ptzDirection: "stop", direction: { pan: null, tilt: null } };
    }

    const direction = calculatePtzDirection(detection.x, detection.y, this.config.deadZone);
    const ptzDirection = getPtzDirectionFromPanTilt(direction.pan, direction.tilt);

    if (ptzDirection) {
      const offsetX = Math.abs(detection.x! - 0.5);
      const offsetY = Math.abs(detection.y! - 0.5);
      const maxOffset = Math.max(offsetX, offsetY);
      
      const minSpeed = 1;
      const normalizedOffset = Math.min(1, maxOffset / 0.4);
      const scaledSpeed = Math.max(minSpeed, Math.min(this.config.ptzSpeed, Math.round(minSpeed + normalizedOffset * (this.config.ptzSpeed - minSpeed))));
      const pulseDuration = Math.max(20, Math.min(50, Math.round(20 + normalizedOffset * 30)));
      
      console.log(`[YoloHybrid] Pulse: ${ptzDirection} @ speed ${scaledSpeed} for ${pulseDuration}ms`);
      await sendPtzViscaCommand(this.camera, ptzDirection, scaledSpeed, scaledSpeed);
      await this.sleep(pulseDuration);
      await sendPtzViscaCommand(this.camera, "stop", scaledSpeed, scaledSpeed);
    }

    return { detection, ptzDirection: ptzDirection || "stop", direction };
  }

  private updateStatus(backend: TrackingBackendStatus): void {
    this.state.statusInfo.backend = backend;
  }

  private clearVisionTracking(): void {
    if (this.visionTrackingId) {
      VisionTracking.stopTracking(this.visionTrackingId);
      this.visionTrackingId = null;
    }
    this.lastBoundingBox = null;
    this.consecutiveLostFrames = 0;
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
