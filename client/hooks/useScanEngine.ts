import { useState, useRef, useCallback } from "react";
import * as Haptics from "expo-haptics";

import { CameraProfile } from "@/lib/storage";
import {
  sendHomeViscaCommand,
  savePresetToCamera,
  recallPresetFromCamera,
  fetchCameraFrame,
  sendPtzViscaCommand,
  sendZoomViscaCommand,
} from "@/lib/camera";
import {
  RoomScan,
  ScanPosition,
  ScanStatus,
  ScanGridConfig,
  ZoomRoundsConfig,
  PositionTiming,
  ScanTimingData,
  DEFAULT_GRID_CONFIG,
  DEFAULT_ZOOM_ROUNDS_CONFIG,
  createNewScan,
  updateScanPosition,
  saveRoomScan,
  setActiveScan,
  getScanProgress,
  getNextPendingPosition,
  allPositionsCaptured,
  allPositionsAnalyzed,
  calculateTimingAverages,
} from "@/lib/huntAndFind";
import { analyzeFullScan, runZoomRounds, CustomRanker } from "@/lib/scanAnalysis";

export interface ScanEngineState {
  scan: RoomScan | null;
  status: ScanStatus;
  currentPosition: ScanPosition | null;
  progress: {
    total: number;
    captured: number;
    analyzed: number;
    percentComplete: number;
  };
  zoomProgress: {
    currentObject: number;
    totalObjects: number;
    currentStep: number;
    totalSteps: number;
    currentObjectName: string | null;
    currentZoomLevel: "medium" | "tight" | "close" | null;
    stepDescription: string | null;
    centeringIteration?: number;
  };
  error: string | null;
  isMoving: boolean;
  isCapturing: boolean;
}

export interface ScanEngineConfig {
  settleDelayMs: number;
  captureDelayMs: number;
  movementTimeoutMs: number;
  autoSavePresets: boolean;
  speed: number;
  panMsPerDegree: number;
  tiltMsPerDegree: number;
}

const DEFAULT_ENGINE_CONFIG: ScanEngineConfig = {
  settleDelayMs: 800,
  captureDelayMs: 200,
  movementTimeoutMs: 5000,
  autoSavePresets: true,
  speed: 16,
  panMsPerDegree: 40,
  tiltMsPerDegree: 45,
};

export function useScanEngine(camera: CameraProfile | null) {
  const [state, setState] = useState<ScanEngineState>({
    scan: null,
    status: "idle",
    currentPosition: null,
    progress: { total: 0, captured: 0, analyzed: 0, percentComplete: 0 },
    zoomProgress: { currentObject: 0, totalObjects: 0, currentStep: 0, totalSteps: 0, currentObjectName: null, currentZoomLevel: null, stepDescription: null },
    error: null,
    isMoving: false,
    isCapturing: false,
  });

  const configRef = useRef<ScanEngineConfig>(DEFAULT_ENGINE_CONFIG);
  const abortRef = useRef(false);
  const pausedRef = useRef(false);
  const scanRef = useRef<RoomScan | null>(null);

  const updateState = useCallback((updates: Partial<ScanEngineState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const waitForResume = async (): Promise<boolean> => {
    while (pausedRef.current && !abortRef.current) {
      await delay(100);
    }
    return !abortRef.current;
  };

  const moveToHome = useCallback(async (): Promise<boolean> => {
    if (!camera) return false;
    
    updateState({ isMoving: true });
    
    try {
      const result = await sendHomeViscaCommand(camera);
      await delay(configRef.current.settleDelayMs);
      return result;
    } catch (err) {
      console.error("[ScanEngine] Home movement failed:", err);
      return false;
    } finally {
      updateState({ isMoving: false });
    }
  }, [camera, updateState]);

  const moveToPosition = useCallback(async (
    position: ScanPosition
  ): Promise<boolean> => {
    if (!camera) return false;
    
    updateState({ isMoving: true, currentPosition: position });
    
    try {
      const result = await recallPresetFromCamera(camera, position.presetSlot);
      
      if (!result) {
        console.log("[ScanEngine] Preset recall failed, position may not be saved yet");
      }
      
      await delay(configRef.current.settleDelayMs);
      return true;
    } catch (err) {
      console.error("[ScanEngine] Position movement failed:", err);
      return false;
    } finally {
      updateState({ isMoving: false });
    }
  }, [camera, updateState]);

  const moveToPositionFromHome = useCallback(async (
    position: ScanPosition
  ): Promise<boolean> => {
    if (!camera) return false;
    
    updateState({ isMoving: true, currentPosition: position });
    
    try {
      const config = configRef.current;
      const panDegrees = position.pan;
      const tiltDegrees = position.tilt;
      
      const panDuration = Math.abs(panDegrees) * config.panMsPerDegree;
      const tiltDuration = Math.abs(tiltDegrees) * config.tiltMsPerDegree;
      
      console.log(`[ScanEngine] Moving to pan=${panDegrees}° tilt=${tiltDegrees}° speed=${config.speed} panMs=${panDuration} tiltMs=${tiltDuration}`);
      
      if (panDegrees !== 0) {
        const panDirection = panDegrees > 0 ? "right" : "left";
        await sendPtzViscaCommand(camera, panDirection, config.speed, config.speed);
        await delay(panDuration);
        await sendPtzViscaCommand(camera, "stop", config.speed, config.speed);
        await delay(150);
      }
      
      if (tiltDegrees !== 0) {
        const tiltDirection = tiltDegrees > 0 ? "up" : "down";
        await sendPtzViscaCommand(camera, tiltDirection, config.speed, config.speed);
        await delay(tiltDuration);
        await sendPtzViscaCommand(camera, "stop", config.speed, config.speed);
        await delay(150);
      }
      
      await delay(config.settleDelayMs);
      return true;
    } catch (err) {
      console.error("[ScanEngine] Position movement failed:", err);
      return false;
    } finally {
      updateState({ isMoving: false });
    }
  }, [camera, updateState]);

  const moveToPositionDirect = useCallback(async (
    fromPosition: ScanPosition,
    toPosition: ScanPosition
  ): Promise<boolean> => {
    if (!camera) return false;
    
    updateState({ isMoving: true, currentPosition: toPosition });
    
    try {
      const config = configRef.current;
      const deltaPan = toPosition.pan - fromPosition.pan;
      const deltaTilt = toPosition.tilt - fromPosition.tilt;
      
      const panDuration = Math.abs(deltaPan) * config.panMsPerDegree;
      const tiltDuration = Math.abs(deltaTilt) * config.tiltMsPerDegree;
      
      console.log(`[ScanEngine] Direct move: deltaPan=${deltaPan}° deltaTilt=${deltaTilt}°`);
      
      if (deltaPan !== 0) {
        const panDirection = deltaPan > 0 ? "right" : "left";
        await sendPtzViscaCommand(camera, panDirection, config.speed, config.speed);
        await delay(panDuration);
        await sendPtzViscaCommand(camera, "stop", config.speed, config.speed);
        await delay(150);
      }
      
      if (deltaTilt !== 0) {
        const tiltDirection = deltaTilt > 0 ? "up" : "down";
        await sendPtzViscaCommand(camera, tiltDirection, config.speed, config.speed);
        await delay(tiltDuration);
        await sendPtzViscaCommand(camera, "stop", config.speed, config.speed);
        await delay(150);
      }
      
      await delay(config.settleDelayMs);
      return true;
    } catch (err) {
      console.error("[ScanEngine] Direct position movement failed:", err);
      return false;
    } finally {
      updateState({ isMoving: false });
    }
  }, [camera, updateState]);

  const zoomOut = useCallback(async (): Promise<boolean> => {
    if (!camera) return false;
    
    try {
      await sendZoomViscaCommand(camera, "out", 7);
      await delay(3000);
      await sendZoomViscaCommand(camera, "stop");
      await delay(500);
      return true;
    } catch (err) {
      console.error("[ScanEngine] Zoom out failed:", err);
      return false;
    }
  }, [camera]);

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!camera) return null;
    
    updateState({ isCapturing: true });
    
    try {
      await delay(configRef.current.captureDelayMs);
      const frame = await fetchCameraFrame(camera);
      return frame;
    } catch (err: any) {
      console.error("[ScanEngine] Frame capture failed:", err);
      throw new Error(err?.message || "Failed to capture frame from camera");
    } finally {
      updateState({ isCapturing: false });
    }
  }, [camera, updateState]);

  const savePositionAsPreset = useCallback(async (
    slot: number
  ): Promise<boolean> => {
    if (!camera) return false;
    
    try {
      const result = await savePresetToCamera(camera, slot);
      return result;
    } catch (err) {
      console.error("[ScanEngine] Preset save failed:", err);
      return false;
    }
  }, [camera]);

  const scanSinglePosition = useCallback(async (
    scan: RoomScan,
    positionIndex: number,
    isFirstPosition: boolean,
    previousPosition?: ScanPosition
  ): Promise<RoomScan> => {
    const position = scan.positions[positionIndex];
    const moveStartMs = Date.now();
    
    let updatedScan = updateScanPosition(scan, positionIndex, {
      status: "moving",
    });
    scanRef.current = updatedScan;
    updateState({ 
      scan: updatedScan, 
      currentPosition: position,
      progress: getScanProgress(updatedScan),
    });

    if (isFirstPosition) {
      if (!await moveToHome()) {
        throw new Error("Failed to move to home position");
      }
      console.log("[ScanEngine] Zooming out for wide coverage");
      await zoomOut();
      
      if (position.pan !== 0 || position.tilt !== 0) {
        console.log(`[ScanEngine] Moving to pan=${position.pan}, tilt=${position.tilt}`);
        if (!await moveToPositionFromHome(position)) {
          throw new Error("Failed to move to target position");
        }
      }
    } else if (previousPosition) {
      console.log(`[ScanEngine] Direct move from pos ${positionIndex - 1} to pos ${positionIndex}`);
      if (!await moveToPositionDirect(previousPosition, position)) {
        throw new Error("Failed to move directly to target position");
      }
    } else {
      if (!await moveToHome()) {
        throw new Error("Failed to move to home position");
      }
      if (position.pan !== 0 || position.tilt !== 0) {
        if (!await moveToPositionFromHome(position)) {
          throw new Error("Failed to move to target position");
        }
      }
    }

    if (configRef.current.autoSavePresets) {
      console.log(`[ScanEngine] Saving preset to slot ${position.presetSlot}`);
      await savePositionAsPreset(position.presetSlot);
      await delay(200);
    }

    const moveEndMs = Date.now();
    const captureStartMs = Date.now();

    updatedScan = updateScanPosition(updatedScan, positionIndex, {
      status: "capturing",
    });
    scanRef.current = updatedScan;
    updateState({ scan: updatedScan });

    const imageUri = await captureFrame();
    
    if (!imageUri) {
      throw new Error(`Failed to capture frame at position ${positionIndex}`);
    }

    const captureEndMs = Date.now();

    const positionTiming: PositionTiming = {
      positionIndex,
      moveStartMs,
      moveEndMs,
      captureStartMs,
      captureEndMs,
      moveDurationMs: moveEndMs - moveStartMs,
      captureDurationMs: captureEndMs - captureStartMs,
      totalDurationMs: captureEndMs - moveStartMs,
    };

    const updatedTiming: ScanTimingData | null = updatedScan.timing ? {
      ...updatedScan.timing,
      positionTimings: [...updatedScan.timing.positionTimings, positionTiming],
    } : null;

    updatedScan = {
      ...updateScanPosition(updatedScan, positionIndex, {
        status: "captured",
        imageUri,
        capturedAt: new Date().toISOString(),
      }),
      timing: updatedTiming,
    };
    scanRef.current = updatedScan;
    updateState({ 
      scan: updatedScan,
      progress: getScanProgress(updatedScan),
    });

    await saveRoomScan(updatedScan);
    await setActiveScan(updatedScan);

    return updatedScan;
  }, [moveToHome, moveToPositionFromHome, moveToPositionDirect, zoomOut, captureFrame, savePositionAsPreset, updateState]);

  const runScanLoop = useCallback(async (initialScan: RoomScan) => {
    let scan = initialScan;
    abortRef.current = false;
    pausedRef.current = false;
    
    const scanningPhaseStartMs = Date.now();
    
    if (scan.timing) {
      scan = {
        ...scan,
        timing: {
          ...scan.timing,
          scanningPhaseStartMs,
        },
      };
    }
    
    updateState({ 
      status: "scanning", 
      scan,
      error: null,
      progress: getScanProgress(scan),
    });
    
    scan = { ...scan, status: "scanning" };
    scanRef.current = scan;
    await saveRoomScan(scan);
    await setActiveScan(scan);

    try {
      console.log("[ScanEngine] Starting scan, going to home position");
      if (!await moveToHome()) {
        throw new Error("Failed to initialize at home position");
      }

      for (let i = 0; i < scan.positions.length; i++) {
        if (abortRef.current) {
          console.log("[ScanEngine] Scan aborted");
          break;
        }

        if (pausedRef.current) {
          updateState({ status: "paused" });
          scan = { ...scan, status: "paused" };
          scanRef.current = scan;
          await saveRoomScan(scan);
          
          const shouldContinue = await waitForResume();
          if (!shouldContinue) {
            console.log("[ScanEngine] Scan cancelled while paused");
            break;
          }
          
          updateState({ status: "scanning" });
          scan = { ...scan, status: "scanning" };
          scanRef.current = scan;
        }

        const position = scan.positions[i];
        if (position.status === "captured" || position.status === "analyzed") {
          console.log(`[ScanEngine] Position ${i} already captured, skipping`);
          continue;
        }

        console.log(`[ScanEngine] Scanning position ${i + 1}/${scan.positions.length}`);
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        const isFirstPosition = i === 0 || scan.positions.slice(0, i).every(
          p => p.status !== "captured" && p.status !== "analyzed"
        );
        
        const previousPosition = i > 0 ? scan.positions[i - 1] : undefined;
        const prevWasCaptured = previousPosition && 
          (previousPosition.status === "captured" || previousPosition.status === "analyzed");
        
        scan = await scanSinglePosition(
          scan, 
          i, 
          isFirstPosition,
          prevWasCaptured ? previousPosition : undefined
        );
        scan = { ...scan, currentPositionIndex: i + 1 };
        scanRef.current = scan;
      }

      if (!abortRef.current && allPositionsCaptured(scan)) {
        console.log("[ScanEngine] All positions captured successfully");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const scanningPhaseEndMs = Date.now();
        const scanningPhaseDurationMs = scan.timing?.scanningPhaseStartMs 
          ? scanningPhaseEndMs - scan.timing.scanningPhaseStartMs 
          : null;
        
        scan = { 
          ...scan, 
          status: "analyzing",
          currentPositionIndex: scan.positions.length,
          timing: scan.timing ? {
            ...scan.timing,
            scanningPhaseEndMs,
            scanningPhaseDurationMs,
          } : null,
        };
        scanRef.current = scan;
        updateState({ 
          status: "analyzing", 
          scan,
          progress: getScanProgress(scan),
        });
        await saveRoomScan(scan);
      }

    } catch (err: any) {
      console.error("[ScanEngine] Scan error:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      const errorMessage = err?.message || "Unknown error during scan";
      scan = { ...scan, status: "error", error: errorMessage };
      scanRef.current = scan;
      updateState({ 
        status: "error", 
        scan,
        error: errorMessage,
      });
      await saveRoomScan(scan);
    }

    return scanRef.current;
  }, [moveToHome, scanSinglePosition, updateState]);

  const startScan = useCallback(async (
    name: string,
    gridConfig: ScanGridConfig = DEFAULT_GRID_CONFIG,
    zoomRoundsConfig: ZoomRoundsConfig = DEFAULT_ZOOM_ROUNDS_CONFIG
  ): Promise<RoomScan | null> => {
    if (!camera) {
      updateState({ error: "No camera connected" });
      return null;
    }

    if (state.status === "scanning") {
      updateState({ error: "Scan already in progress" });
      return null;
    }

    const newScan = createNewScan(camera.id, name, gridConfig, zoomRoundsConfig);
    scanRef.current = newScan;
    
    return runScanLoop(newScan);
  }, [camera, state.status, runScanLoop, updateState]);

  const resumeScan = useCallback(async (
    existingScan: RoomScan
  ): Promise<RoomScan | null> => {
    if (!camera) {
      updateState({ error: "No camera connected" });
      return null;
    }

    if (state.status === "scanning") {
      updateState({ error: "Scan already in progress" });
      return null;
    }

    scanRef.current = existingScan;
    return runScanLoop(existingScan);
  }, [camera, state.status, runScanLoop, updateState]);

  const pauseScan = useCallback(() => {
    if (state.status === "scanning") {
      pausedRef.current = true;
      console.log("[ScanEngine] Scan paused");
    }
  }, [state.status]);

  const unpauseScan = useCallback(() => {
    if (state.status === "paused" || pausedRef.current) {
      pausedRef.current = false;
      console.log("[ScanEngine] Scan resumed");
    }
  }, [state.status]);

  const cancelScan = useCallback(async () => {
    abortRef.current = true;
    pausedRef.current = false;
    
    if (scanRef.current) {
      const cancelledScan = { 
        ...scanRef.current, 
        status: "paused" as ScanStatus,
      };
      await saveRoomScan(cancelledScan);
      await setActiveScan(null);
    }
    
    updateState({ 
      status: "idle",
      currentPosition: null,
      isMoving: false,
      isCapturing: false,
    });
    
    console.log("[ScanEngine] Scan cancelled");
  }, [updateState]);

  const resetEngine = useCallback(() => {
    abortRef.current = true;
    pausedRef.current = false;
    scanRef.current = null;
    
    setState({
      scan: null,
      status: "idle",
      currentPosition: null,
      progress: { total: 0, captured: 0, analyzed: 0, percentComplete: 0 },
    zoomProgress: { currentObject: 0, totalObjects: 0, currentStep: 0, totalSteps: 0, currentObjectName: null, currentZoomLevel: null, stepDescription: null, centeringIteration: 0 },
      error: null,
      isMoving: false,
      isCapturing: false,
    });
  }, []);

  const setConfig = useCallback((config: Partial<ScanEngineConfig>) => {
    configRef.current = { ...configRef.current, ...config };
  }, []);

  const startAnalysis = useCallback(async (
    apiKey: string,
    customRanker?: CustomRanker
  ): Promise<RoomScan | null> => {
    const currentScan = scanRef.current || state.scan;
    
    if (!currentScan) {
      updateState({ error: "No scan to analyze" });
      return null;
    }
    
    if (!allPositionsCaptured(currentScan)) {
      updateState({ error: "Scan not complete - some positions not captured" });
      return null;
    }
    
    if (allPositionsAnalyzed(currentScan)) {
      console.log("[ScanEngine] Scan already analyzed");
      return currentScan;
    }
    
    const analysisPhaseStartMs = Date.now();
    
    updateState({ status: "analyzing" });
    
    let scan: RoomScan = { 
      ...currentScan, 
      status: "analyzing" as ScanStatus,
      timing: currentScan.timing ? {
        ...currentScan.timing,
        analysisPhaseStartMs,
      } : null,
    };
    scanRef.current = scan;
    await saveRoomScan(scan);
    
    try {
      console.log("[ScanEngine] Starting AI analysis...");
      
      const analyzedScan = await analyzeFullScan(
        scan,
        apiKey,
        (positionIndex, total) => {
          updateState({
            progress: {
              total,
              captured: total,
              analyzed: positionIndex,
              percentComplete: 50 + Math.round((positionIndex / total) * 50),
            },
          });
        },
        customRanker
      );
      
      const analysisPhaseEndMs = Date.now();
      const analysisPhaseDurationMs = analysisPhaseStartMs 
        ? analysisPhaseEndMs - analysisPhaseStartMs 
        : null;
      
      const finalScan: RoomScan = {
        ...analyzedScan,
        timing: analyzedScan.timing ? calculateTimingAverages({
          ...analyzedScan.timing,
          analysisPhaseEndMs,
          analysisPhaseDurationMs,
        }) : null,
      };
      
      scanRef.current = finalScan;
      await saveRoomScan(finalScan);
      await setActiveScan(null);
      
      updateState({
        status: "completed",
        scan: finalScan,
        progress: {
          total: finalScan.positions.length,
          captured: finalScan.positions.length,
          analyzed: finalScan.positions.length,
          percentComplete: 100,
        },
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log(`[ScanEngine] Analysis complete. Found ${finalScan.objects.length} objects.`);
      
      return finalScan;
      
    } catch (err: any) {
      console.error("[ScanEngine] Analysis error:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      const errorMessage = err?.message || "Analysis failed";
      scan = { ...scan, status: "error", error: errorMessage };
      scanRef.current = scan;
      await saveRoomScan(scan);
      
      updateState({
        status: "error",
        scan,
        error: errorMessage,
      });
      
      return null;
    }
  }, [state.scan, updateState]);

  const startZoomRounds = useCallback(async (
    apiKey: string
  ): Promise<RoomScan | null> => {
    if (!camera) {
      updateState({ error: "No camera connected" });
      return null;
    }

    const currentScan = scanRef.current || state.scan;
    if (!currentScan || currentScan.objects.length === 0) {
      console.log("[ScanEngine] No objects to zoom into");
      return currentScan;
    }

    const zoomPhaseStartMs = Date.now();
    const topCount = currentScan.zoomRoundsConfig.topObjectCount;
    
    const stepsPerObject = 10;
    const totalSteps = topCount * stepsPerObject;
    
    updateState({ 
      status: "zooming",
      zoomProgress: { 
        currentObject: 0, 
        totalObjects: topCount, 
        currentStep: 0, 
        totalSteps,
        currentObjectName: null, 
        currentZoomLevel: null, 
        stepDescription: "Starting zoom rounds...",
        centeringIteration: 0 
      },
    });

    try {
      const zoomedScan = await runZoomRounds(
        currentScan,
        camera,
        apiKey,
        {
          onStepProgress: (objectIndex, totalObjects, step, objectName, description) => {
            updateState({
              zoomProgress: { 
                currentObject: objectIndex, 
                totalObjects, 
                currentStep: objectIndex * stepsPerObject + step,
                totalSteps,
                currentObjectName: objectName,
                currentZoomLevel: null,
                stepDescription: description,
                centeringIteration: 0,
              },
            });
          },
          onZoomLevel: (level, objectName) => {
            updateState({
              zoomProgress: { 
                ...state.zoomProgress,
                currentObjectName: objectName,
                currentZoomLevel: level,
              },
            });
          },
          onCentering: (objectName, iteration) => {
            updateState({
              zoomProgress: { 
                ...state.zoomProgress,
                currentObjectName: objectName,
                centeringIteration: iteration,
              },
            });
          },
          onObjectComplete: (objectName) => {
            console.log(`[ScanEngine] Zoom rounds complete for ${objectName}`);
          },
        }
      );

      const zoomPhaseEndMs = Date.now();
      const zoomPhaseDurationMs = zoomPhaseEndMs - zoomPhaseStartMs;
      const scanEndMs = Date.now();
      
      const finalTiming: ScanTimingData | null = zoomedScan.timing ? calculateTimingAverages({
        ...zoomedScan.timing,
        zoomPhaseStartMs,
        zoomPhaseEndMs,
        zoomPhaseDurationMs,
        scanEndMs,
        totalDurationMs: zoomedScan.timing.scanStartMs ? scanEndMs - zoomedScan.timing.scanStartMs : null,
      }) : null;

      const completedScan: RoomScan = {
        ...zoomedScan,
        status: "completed" as const,
        completedAt: new Date().toISOString(),
        timing: finalTiming,
      };

      scanRef.current = completedScan;
      await saveRoomScan(completedScan);

      updateState({
        scan: completedScan,
        status: "completed",
        zoomProgress: { 
          currentObject: topCount, 
          totalObjects: topCount, 
          currentStep: totalSteps, 
          totalSteps,
          currentObjectName: null, 
          currentZoomLevel: null, 
          stepDescription: "Complete",
          centeringIteration: 0 
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return completedScan;

    } catch (err: any) {
      console.error("[ScanEngine] Zoom rounds error:", err);
      updateState({ status: "error", error: err?.message || "Zoom rounds failed" });
      return null;
    }
  }, [camera, state.scan, state.zoomProgress, updateState]);

  const runFullScanWithAnalysis = useCallback(async (
    name: string,
    apiKey: string,
    gridConfig: ScanGridConfig = DEFAULT_GRID_CONFIG,
    zoomRoundsConfig: ZoomRoundsConfig = DEFAULT_ZOOM_ROUNDS_CONFIG,
    customRanker?: CustomRanker
  ): Promise<RoomScan | null> => {
    const scanResult = await startScan(name, gridConfig, zoomRoundsConfig);
    
    if (!scanResult || scanResult.status === "error") {
      return scanResult;
    }
    
    if (scanResult.status === "analyzing" || allPositionsCaptured(scanResult)) {
      const analyzedScan = await startAnalysis(apiKey, customRanker);
      
      if (analyzedScan && zoomRoundsConfig.enabled && zoomRoundsConfig.topObjectCount > 0) {
        return startZoomRounds(apiKey);
      }
      
      return analyzedScan;
    }
    
    return scanResult;
  }, [startScan, startAnalysis, startZoomRounds]);

  return {
    state,
    startScan,
    resumeScan,
    pauseScan,
    unpauseScan,
    cancelScan,
    resetEngine,
    setConfig,
    startAnalysis,
    runFullScanWithAnalysis,
    moveToHome,
    moveToPosition,
    moveToPositionFromHome,
    zoomOut,
    captureFrame,
    savePositionAsPreset,
  };
}
