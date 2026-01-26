import { CameraProfile } from "./storage";
import { 
  sendPtzViscaCommand, 
  fetchCameraFrame,
  recallPresetFromCamera,
  PTZ_COMMANDS,
  sendPtzCommand,
} from "./camera";
import { BoundingBox } from "./trackingService";
import { detectObject as moondreamDetect } from "./moondream";
import * as VisionTracking from "vision-tracking";

export interface CenteringConfig {
  deadZone: number;
  innerDeadZone: number;
  maxIterations: number;
  settleTimeMs: number;
  frameDelayMs: number;
  ptzNudgeDurationMs: number;
  ptzNudgeMinDurationMs: number;
  settleAfterNudgeMs: number;
  ptzSpeed: number;
  ptzMinSpeed: number;
  ptzFineTuneSpeed: number;
  confidenceThreshold: number;
  consecutiveCenteredRequired: number;
}

const DEFAULT_CENTERING_CONFIG: CenteringConfig = {
  deadZone: 0.12,
  innerDeadZone: 0.04,
  maxIterations: 35,
  settleTimeMs: 600,
  frameDelayMs: 100,
  ptzNudgeDurationMs: 150,
  ptzNudgeMinDurationMs: 40,
  settleAfterNudgeMs: 250,
  ptzSpeed: 6,
  ptzMinSpeed: 2,
  ptzFineTuneSpeed: 1,
  confidenceThreshold: 0.3,
  consecutiveCenteredRequired: 2,
};

export interface CenteringProgress {
  status: "moving" | "detecting" | "ai-detecting" | "tracking" | "nudging" | "centered" | "lost" | "error";
  iteration: number;
  maxIterations: number;
  offsetX?: number;
  offsetY?: number;
  confidence?: number;
  message?: string;
  /** Indicates which detection backend is active */
  backend?: "moondream" | "coreml" | "tracking";
}

export type CenteringProgressCallback = (progress: CenteringProgress) => void;

export interface CenteringResult {
  success: boolean;
  iterations: number;
  finalOffset?: { x: number; y: number };
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculatePtzDirection(
  offsetX: number,
  offsetY: number,
  innerDeadZone: number
): { pan: "left" | "right" | null; tilt: "up" | "down" | null } {
  let pan: "left" | "right" | null = null;
  let tilt: "up" | "down" | null = null;

  if (Math.abs(offsetX) > innerDeadZone) {
    pan = offsetX > 0 ? "right" : "left";
  }

  if (Math.abs(offsetY) > innerDeadZone) {
    tilt = offsetY > 0 ? "down" : "up";
  }

  return { pan, tilt };
}

function calculateScaledNudge(
  offsetX: number,
  offsetY: number,
  cfg: CenteringConfig
): { speed: number; durationMs: number; isFineTuning: boolean } {
  const maxOffset = Math.max(Math.abs(offsetX), Math.abs(offsetY));
  
  const isInOuterDeadZone = maxOffset <= cfg.deadZone;
  const isFineTuning = isInOuterDeadZone && maxOffset > cfg.innerDeadZone;
  
  if (isFineTuning) {
    return { 
      speed: cfg.ptzFineTuneSpeed, 
      durationMs: cfg.ptzNudgeMinDurationMs,
      isFineTuning: true,
    };
  }
  
  const normalizedOffset = Math.min(1, (maxOffset - cfg.deadZone) / (0.4 - cfg.deadZone));
  
  const speed = Math.round(
    cfg.ptzMinSpeed + normalizedOffset * (cfg.ptzSpeed - cfg.ptzMinSpeed)
  );
  const durationMs = Math.round(
    cfg.ptzNudgeMinDurationMs + normalizedOffset * (cfg.ptzNudgeDurationMs - cfg.ptzNudgeMinDurationMs)
  );
  
  return { 
    speed: Math.max(cfg.ptzMinSpeed, speed), 
    durationMs: Math.max(cfg.ptzNudgeMinDurationMs, durationMs),
    isFineTuning: false,
  };
}

async function sendPtzNudge(
  camera: CameraProfile,
  pan: "left" | "right" | null,
  tilt: "up" | "down" | null,
  speed: number,
  durationMs: number
): Promise<void> {
  if (!pan && !tilt) return;

  let direction: "up" | "down" | "left" | "right" | "upleft" | "upright" | "downleft" | "downright";
  
  if (pan && tilt) {
    if (pan === "left" && tilt === "up") direction = "upleft";
    else if (pan === "right" && tilt === "up") direction = "upright";
    else if (pan === "left" && tilt === "down") direction = "downleft";
    else direction = "downright";
  } else if (pan) {
    direction = pan;
  } else {
    direction = tilt!;
  }

  console.log(`[Centering] Nudge: ${direction} @ speed ${speed} for ${durationMs}ms`);
  await sendPtzViscaCommand(camera, direction, speed, speed);
  await sleep(durationMs);
  await sendPtzCommand(camera, PTZ_COMMANDS.stop);
}

export async function centerObjectWithVision(
  camera: CameraProfile,
  presetSlot: number,
  boundingBox: BoundingBox | null,
  onProgress?: CenteringProgressCallback,
  config: Partial<CenteringConfig> = {},
  objectName?: string,
  apiKey?: string
): Promise<CenteringResult> {
  const cfg = { ...DEFAULT_CENTERING_CONFIG, ...config };
  
  if (!VisionTracking.isVisionAvailable) {
    console.log("[Centering] Vision framework not available");
    return { success: false, iterations: 0, error: "Vision framework not available" };
  }

  console.log(`[Centering] Starting - preset=${presetSlot}, objectName=${objectName || "none"}, hasBoundingBox=${!!boundingBox}`);

  onProgress?.({ 
    status: "moving", 
    iteration: 0, 
    maxIterations: cfg.maxIterations,
    message: "Moving to preset...",
    backend: undefined,
  });

  try {
    await recallPresetFromCamera(camera, presetSlot);
    await sleep(cfg.settleTimeMs);
  } catch (err) {
    console.error("[Centering] Failed to recall preset:", err);
    return { 
      success: false, 
      iterations: 0, 
      error: `Failed to recall preset: ${err instanceof Error ? err.message : "Unknown error"}` 
    };
  }

  let trackingId: string | null = null;
  let consecutiveCentered = 0;
  let lastOffset = { x: 0, y: 0 };
  let currentBoundingBox = boundingBox;

  if (objectName && apiKey) {
    console.log(`[Centering] Using Moondream to detect: "${objectName}"`);
    onProgress?.({ 
      status: "ai-detecting", 
      iteration: 0, 
      maxIterations: cfg.maxIterations,
      message: `Finding "${objectName}"...`,
      backend: "moondream",
    });

    const frame = await fetchCameraFrame(camera);
    if (frame) {
      const base64Data = frame.includes(",") ? frame.split(",")[1] : frame;
      const detection = await moondreamDetect(base64Data, apiKey, objectName);
      
      if (detection.found && detection.box) {
        console.log(`[Centering] Moondream found object at (${(detection.x! * 100).toFixed(1)}%, ${(detection.y! * 100).toFixed(1)}%) conf=${detection.confidence?.toFixed(2)}`);
        currentBoundingBox = detection.box;
      } else {
        console.log(`[Centering] Moondream did not find "${objectName}", falling back to stored box or human detection`);
      }
    }
  }

  try {
    for (let iteration = 0; iteration < cfg.maxIterations; iteration++) {
      const statusMsg = trackingId 
        ? `Tracking... (conf=${((lastOffset.x !== 0 || lastOffset.y !== 0) ? "active" : "init")})`
        : "Detecting with Vision...";
      
      onProgress?.({ 
        status: trackingId ? "tracking" : "detecting", 
        iteration, 
        maxIterations: cfg.maxIterations,
        message: statusMsg,
        backend: trackingId ? "tracking" : "coreml",
      });

      const frame = await fetchCameraFrame(camera);
      if (!frame) {
        console.log(`[Centering] Frame capture failed at iteration ${iteration}`);
        continue;
      }

      const base64Data = frame.includes(",") ? frame.split(",")[1] : frame;
      let objectBox: { x: number; y: number; width: number; height: number; confidence: number } | null = null;

      if (trackingId) {
        const trackResult = await VisionTracking.updateTracking(trackingId, base64Data);
        
        if (trackResult && !trackResult.isLost && trackResult.confidence >= cfg.confidenceThreshold) {
          objectBox = trackResult;
          console.log(`[Centering] Tracking update: pos=(${(trackResult.x * 100).toFixed(1)}%, ${(trackResult.y * 100).toFixed(1)}%) conf=${trackResult.confidence.toFixed(2)}`);
        } else {
          console.log(`[Centering] Tracking lost - isLost=${trackResult?.isLost}, conf=${trackResult?.confidence?.toFixed(2) || "N/A"}`);
          VisionTracking.stopTracking(trackingId);
          trackingId = null;
          
          onProgress?.({ 
            status: "lost", 
            iteration, 
            maxIterations: cfg.maxIterations,
            message: "Tracking lost, re-detecting...",
            backend: "coreml",
          });

          if (objectName && apiKey) {
            console.log(`[Centering] Attempting Moondream re-detection for "${objectName}"`);
            onProgress?.({ 
              status: "ai-detecting", 
              iteration, 
              maxIterations: cfg.maxIterations,
              message: `Re-finding "${objectName}"...`,
              backend: "moondream",
            });
            
            const redetection = await moondreamDetect(base64Data, apiKey, objectName);
            if (redetection.found && redetection.box) {
              console.log(`[Centering] Moondream re-detected object`);
              currentBoundingBox = redetection.box;
            }
          }
        }
      }

      if (!trackingId) {
        if (currentBoundingBox) {
          const width = currentBoundingBox.x_max - currentBoundingBox.x_min;
          const height = currentBoundingBox.y_max - currentBoundingBox.y_min;
          
          console.log(`[Centering] Starting Core ML tracking at box: (${(currentBoundingBox.x_min * 100).toFixed(1)}%, ${(currentBoundingBox.y_min * 100).toFixed(1)}%) ${(width * 100).toFixed(1)}x${(height * 100).toFixed(1)}%`);
          
          trackingId = VisionTracking.startTracking(
            currentBoundingBox.x_min,
            currentBoundingBox.y_min,
            width,
            height
          );
          
          if (trackingId) {
            console.log(`[Centering] Core ML tracking started with ID: ${trackingId}`);
            objectBox = {
              x: currentBoundingBox.x_min,
              y: currentBoundingBox.y_min,
              width,
              height,
              confidence: 1.0,
            };
          } else {
            console.log(`[Centering] Failed to start Core ML tracking`);
          }
        } else {
          console.log(`[Centering] No bounding box, falling back to human detection`);
          const humans = await VisionTracking.detectHumans(base64Data);
          console.log(`[Centering] Human detection found ${humans.length} humans`);
          
          if (humans.length > 0) {
            const best = humans.reduce((a, b) => a.confidence > b.confidence ? a : b);
            console.log(`[Centering] Best human: pos=(${(best.x * 100).toFixed(1)}%, ${(best.y * 100).toFixed(1)}%) conf=${best.confidence.toFixed(2)}`);
            
            trackingId = VisionTracking.startTracking(best.x, best.y, best.width, best.height);
            
            if (trackingId) {
              console.log(`[Centering] Started tracking human with ID: ${trackingId}`);
              objectBox = best;
            }
          }
        }
      }

      if (!objectBox) {
        console.log(`[Centering] No object detected at iteration ${iteration}`);
        consecutiveCentered = 0;
        await sleep(cfg.frameDelayMs);
        continue;
      }

      const centerX = objectBox.x + objectBox.width / 2;
      const centerY = objectBox.y + objectBox.height / 2;
      
      const offsetX = centerX - 0.5;
      const offsetY = centerY - 0.5;
      lastOffset = { x: offsetX, y: offsetY };

      const { pan, tilt } = calculatePtzDirection(offsetX, offsetY, cfg.innerDeadZone);

      if (!pan && !tilt) {
        consecutiveCentered++;
        console.log(`[Centering] Object centered! (${consecutiveCentered}/${cfg.consecutiveCenteredRequired})`);
        
        onProgress?.({ 
          status: "centered", 
          iteration, 
          maxIterations: cfg.maxIterations,
          offsetX,
          offsetY,
          confidence: objectBox.confidence,
          message: `Centered (${consecutiveCentered}/${cfg.consecutiveCenteredRequired})`,
          backend: "tracking",
        });

        if (consecutiveCentered >= cfg.consecutiveCenteredRequired) {
          if (trackingId) {
            VisionTracking.stopTracking(trackingId);
          }
          console.log(`[Centering] SUCCESS - completed in ${iteration + 1} iterations`);
          return { 
            success: true, 
            iterations: iteration + 1,
            finalOffset: lastOffset
          };
        }
      } else {
        consecutiveCentered = 0;
        
        const scaled = calculateScaledNudge(offsetX, offsetY, cfg);
        
        onProgress?.({ 
          status: "nudging", 
          iteration, 
          maxIterations: cfg.maxIterations,
          offsetX,
          offsetY,
          confidence: objectBox.confidence,
          message: scaled.isFineTuning 
            ? `Fine-tuning: ${pan || ""} ${tilt || ""} (speed=1)`.trim()
            : `Adjusting: ${pan || ""} ${tilt || ""} (speed=${scaled.speed})`.trim(),
          backend: "tracking",
        });

        await sendPtzNudge(camera, pan, tilt, scaled.speed, scaled.durationMs);
        await sleep(scaled.isFineTuning ? cfg.settleAfterNudgeMs / 2 : cfg.settleAfterNudgeMs);
        await sleep(cfg.frameDelayMs);
      }
    }

    if (trackingId) {
      VisionTracking.stopTracking(trackingId);
    }

    console.log(`[Centering] FAILED - max iterations reached, final offset=(${(lastOffset.x * 100).toFixed(1)}%, ${(lastOffset.y * 100).toFixed(1)}%)`);
    return { 
      success: false, 
      iterations: cfg.maxIterations,
      finalOffset: lastOffset,
      error: "Max iterations reached without centering"
    };

  } catch (err) {
    console.error("[Centering] Error during centering:", err);
    if (trackingId) {
      VisionTracking.stopTracking(trackingId);
    }
    
    return { 
      success: false, 
      iterations: 0,
      error: err instanceof Error ? err.message : "Unknown error during centering"
    };
  }
}

export async function quickCenterWithVision(
  camera: CameraProfile,
  presetSlot: number,
  onProgress?: CenteringProgressCallback,
  objectName?: string,
  apiKey?: string
): Promise<CenteringResult> {
  return centerObjectWithVision(camera, presetSlot, null, onProgress, {
    maxIterations: 10,
    settleTimeMs: 1000,
    consecutiveCenteredRequired: 2,
  }, objectName, apiKey);
}
