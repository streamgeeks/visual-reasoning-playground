import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Text, Platform, ActivityIndicator, Image, Linking, TextInput, Modal, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { TrackingModel, TRACKING_MODELS, getModelInfo, TrackingMode, TrackingStatusInfo } from "@/lib/tracking";
import { getYoloStatus, NativeDetectionStatus, TrackingState } from "@/lib/trackingService";
import { 
  CameraProfile, 
  SavedCustomObject, 
  getCustomObjects, 
  saveCustomObject, 
  deleteCustomObject,
  incrementCustomObjectUsage,
} from "@/lib/storage";
import {
  testCameraConnection,
  fetchCameraFrame,
  clearActiveConfig,
  sendPtzViscaCommand,
  PtzDirection,
} from "@/lib/camera";

// RTSP commented out - using snapshot mode only for simplicity
// import {
//   checkBackendHealth,
//   connectCameraRtsp,
//   disconnectCameraRtsp,
//   fetchRtspFrame,
// } from "@/lib/rtspBackend";
// import { isNativeRtspAvailable } from "@/components/CameraStream";

export type StreamMode = "snapshot";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface CameraConnectionStatus {
  connected: boolean;
  fps: number;
  frameCount: number;
  mode: StreamMode;
}

interface ModelSelectorProps {
  selectedModel: TrackingModel;
  isTracking: boolean;
  onModelChange: (model: TrackingModel) => void;
  onToggleTracking: () => void;
  onShowInfo: () => void;
  camera?: CameraProfile | null;
  isConnected?: boolean;
  onCameraConnected?: (connected: boolean, mjpegUrl?: string) => void;
  onFrameUpdate?: (frameUri: string) => void;
  onStreamModeChange?: (mode: StreamMode) => void;
  onMjpegFallback?: () => void;
  customObject?: string;
  onCustomObjectChange?: (text: string) => void;
  trackingMode?: TrackingMode;
  onTrackingModeChange?: (mode: TrackingMode) => void;
  trackingState?: TrackingState | null;
}

export function ModelSelector({
  selectedModel,
  isTracking,
  onModelChange,
  onToggleTracking,
  onShowInfo,
  camera,
  isConnected: parentConnected,
  onCameraConnected,
  onFrameUpdate,
  onStreamModeChange,
  onMjpegFallback,
  customObject = "",
  onCustomObjectChange,
  trackingMode = "detection-only",
  onTrackingModeChange,
  trackingState,
}: ModelSelectorProps) {
  const { theme, isDark } = useTheme();
  const modelInfo = getModelInfo(selectedModel);
  
  const [cameraConnected, setCameraConnected] = useState(parentConnected ?? false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraConnectionStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [streamMode, setStreamMode] = useState<StreamMode>("snapshot");
  const [savedObjects, setSavedObjects] = useState<SavedCustomObject[]>([]);
  const [showSavedObjects, setShowSavedObjects] = useState(false);
  const [yoloStatus, setYoloStatus] = useState<NativeDetectionStatus | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);
  const fpsStartTimeRef = useRef(0);
  const fpsCountRef = useRef(0);

  useEffect(() => {
    onStreamModeChange?.(streamMode);
  }, [streamMode, onStreamModeChange]);

  useEffect(() => {
    getCustomObjects().then(setSavedObjects);
  }, []);

  useEffect(() => {
    if (Platform.OS === "ios") {
      getYoloStatus().then(setYoloStatus);
    }
  }, []);

  const handleSaveCustomObject = useCallback(async () => {
    if (!customObject.trim()) return;
    const name = customObject.trim().slice(0, 20);
    const saved = await saveCustomObject(name, customObject.trim());
    setSavedObjects((prev) => {
      const filtered = prev.filter((o) => o.id !== saved.id);
      return [saved, ...filtered].slice(0, 20);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [customObject]);

  const handleSelectSavedObject = useCallback(async (obj: SavedCustomObject) => {
    onCustomObjectChange?.(obj.description);
    await incrementCustomObjectUsage(obj.id);
    setShowSavedObjects(false);
    Haptics.selectionAsync();
  }, [onCustomObjectChange]);

  const handleDeleteSavedObject = useCallback(async (id: string) => {
    await deleteCustomObject(id);
    setSavedObjects((prev) => prev.filter((o) => o.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) {
        if (typeof frameIntervalRef.current === 'object' && 'stop' in frameIntervalRef.current) {
          (frameIntervalRef.current as any).stop();
        } else {
          clearInterval(frameIntervalRef.current);
        }
      }
    };
  }, []);

  const hasAutoConnectedRef = useRef(false);

  const startFrameCapture = useCallback((cam: CameraProfile) => {
    if (frameIntervalRef.current) {
      if (typeof frameIntervalRef.current === 'object' && 'stop' in frameIntervalRef.current) {
        (frameIntervalRef.current as any).stop();
      } else {
        clearInterval(frameIntervalRef.current);
      }
    }
    
    frameCountRef.current = 0;
    fpsStartTimeRef.current = Date.now();
    fpsCountRef.current = 0;
    
    let isRunning = true;
    let consecutiveFailures = 0;
    
    const captureLoop = async () => {
      while (isRunning) {
        const frameStart = Date.now();
        try {
          const frame = await fetchCameraFrame(cam);
          
          if (frame) {
            consecutiveFailures = 0;
            frameCountRef.current++;
            fpsCountRef.current++;
            setPreviewFrame(frame);
            onFrameUpdate?.(frame);
            
            const elapsed = (Date.now() - fpsStartTimeRef.current) / 1000;
            if (elapsed >= 1) {
              const fps = Math.round(fpsCountRef.current / elapsed);
              setCameraStatus({
                connected: true,
                fps,
                frameCount: frameCountRef.current,
                mode: "snapshot",
              });
              fpsStartTimeRef.current = Date.now();
              fpsCountRef.current = 0;
            }
            
            const frameTime = Date.now() - frameStart;
            const targetDelay = 300;
            const delay = Math.max(16, targetDelay - frameTime);
            await new Promise(r => setTimeout(r, delay));
          } else {
            consecutiveFailures++;
            if (consecutiveFailures >= 10) {
              setCameraConnected(false);
              onCameraConnected?.(false);
              setConnectionError("Lost connection to camera");
              isRunning = false;
              break;
            }
            await new Promise(r => setTimeout(r, 100));
          }
        } catch (error) {
          consecutiveFailures++;
          if (consecutiveFailures >= 10) {
            isRunning = false;
            break;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }
    };
    
    captureLoop();
    
    frameIntervalRef.current = {
      stop: () => { isRunning = false; }
    } as any;
  }, [onCameraConnected, onFrameUpdate]);

  useEffect(() => {
    if (parentConnected && camera && !cameraConnected && !hasAutoConnectedRef.current) {
      hasAutoConnectedRef.current = true;
      setCameraConnected(true);
      startFrameCapture(camera);
    }
  }, [parentConnected, camera, cameraConnected, startFrameCapture]);

  const handleConnect = useCallback(async () => {
    if (!camera) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const result = await testCameraConnection(camera);
      if (result.success) {
        setCameraConnected(true);
        setStreamMode("snapshot");
        onCameraConnected?.(true);
        startFrameCapture(camera);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setConnectionError(result.error || "Cannot reach camera. Check IP address and network.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error: any) {
      setConnectionError(error.message || "Failed to connect");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsConnecting(false);
    }
  }, [camera, onCameraConnected, startFrameCapture]);

  const handleDisconnect = useCallback(() => {
    if (frameIntervalRef.current) {
      if (typeof frameIntervalRef.current === 'object' && 'stop' in frameIntervalRef.current) {
        (frameIntervalRef.current as any).stop();
      } else {
        clearInterval(frameIntervalRef.current);
      }
      frameIntervalRef.current = null;
    }
    
    clearActiveConfig();
    setCameraConnected(false);
    setCameraStatus(null);
    setPreviewFrame(null);
    setStreamMode("snapshot");
    onCameraConnected?.(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onCameraConnected]);

  const handleToggleTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleTracking();
  };

  const ptzMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ptzActiveDirectionRef = useRef<PtzDirection | null>(null);

  const handlePtzStart = useCallback(async (direction: PtzDirection) => {
    if (!camera) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (ptzMoveTimeoutRef.current) {
      clearTimeout(ptzMoveTimeoutRef.current);
      ptzMoveTimeoutRef.current = null;
    }
    
    ptzActiveDirectionRef.current = direction;
    await sendPtzViscaCommand(camera, direction, 8, 8);
  }, [camera]);

  const handlePtzStop = useCallback(async () => {
    if (!camera) return;
    
    if (ptzMoveTimeoutRef.current) {
      clearTimeout(ptzMoveTimeoutRef.current);
      ptzMoveTimeoutRef.current = null;
    }
    
    if (ptzActiveDirectionRef.current) {
      ptzActiveDirectionRef.current = null;
      await sendPtzViscaCommand(camera, "stop", 8, 8);
    }
  }, [camera]);

  const handlePtzNudge = useCallback(async (direction: PtzDirection) => {
    if (!camera) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (ptzMoveTimeoutRef.current) {
      clearTimeout(ptzMoveTimeoutRef.current);
    }
    
    await sendPtzViscaCommand(camera, direction, 8, 8);
    
    ptzMoveTimeoutRef.current = setTimeout(async () => {
      await sendPtzViscaCommand(camera, "stop", 8, 8);
      ptzMoveTimeoutRef.current = null;
    }, 150);
  }, [camera]);

  return (
    <View style={styles.outerContainer}>
      {/* Tracking Model Section */}
      <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Tracking Model</Text>
          <Pressable
            onPress={onShowInfo}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="info" size={20} color={theme.primary} />
          </Pressable>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowModelPicker(true);
            }}
            disabled={isTracking}
            style={({ pressed }) => [
              styles.modelPickerButton,
              { 
                backgroundColor: theme.backgroundSecondary,
                opacity: isTracking ? 0.6 : (pressed ? 0.8 : 1),
              },
            ]}
          >
            <View style={[styles.modelPickerIcon, { backgroundColor: theme.primary + "20" }]}>
              <Feather name={modelInfo.icon as any} size={20} color={theme.primary} />
            </View>
            <View style={styles.modelPickerInfo}>
              <Text style={[styles.modelPickerName, { color: theme.text }]}>
                {modelInfo.name}
              </Text>
              <Text style={[styles.modelPickerDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                {modelInfo.usesYolo ? "YOLO Detection" : modelInfo.usesVision ? "Vision Framework" : "Cloud AI"}
              </Text>
            </View>
            {modelInfo.usesYolo && yoloStatus && !yoloStatus.yoloLoaded ? (
              <View style={[styles.backendBadge, { backgroundColor: theme.warning + "20" }]}>
                <Feather name="alert-circle" size={8} color={theme.warning} style={{ marginRight: 2 }} />
                <Text style={[styles.backendBadgeText, { color: theme.warning }]}>
                  Fallback
                </Text>
              </View>
            ) : (
              <View style={[
                styles.backendBadge, 
                { 
                  backgroundColor: modelInfo.usesYolo 
                    ? theme.success + "20" 
                    : modelInfo.usesVision 
                      ? theme.primary + "20" 
                      : theme.warning + "20" 
                }
              ]}>
                <Text style={[
                  styles.backendBadgeText, 
                  { 
                    color: modelInfo.usesYolo 
                      ? theme.success 
                      : modelInfo.usesVision 
                        ? theme.primary 
                        : theme.warning 
                  }
                ]}>
                  {modelInfo.usesYolo ? "YOLO" : modelInfo.usesVision ? "Vision" : "Cloud"}
                </Text>
              </View>
            )}
            <Feather name="chevron-down" size={18} color={theme.textSecondary} style={{ marginLeft: Spacing.xs }} />
          </Pressable>

          {modelInfo.usesYolo && (
            <View style={styles.trackingModeSection}>
              <Text style={[styles.trackingModeLabel, { color: theme.textSecondary }]}>
                Tracking Mode:
              </Text>
              <View style={[styles.trackingModeSelector, { backgroundColor: theme.backgroundSecondary }]}>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    onTrackingModeChange?.("detection-only");
                  }}
                  disabled={isTracking}
                  style={[
                    styles.trackingModeOption,
                    trackingMode === "detection-only" && { backgroundColor: theme.primary },
                    isTracking && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[
                    styles.trackingModeText,
                    { color: trackingMode === "detection-only" ? "#FFF" : theme.textSecondary },
                  ]}>
                    YOLO Only
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    onTrackingModeChange?.("hybrid-vision");
                  }}
                  disabled={isTracking}
                  style={[
                    styles.trackingModeOption,
                    trackingMode === "hybrid-vision" && { backgroundColor: theme.success },
                    isTracking && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[
                    styles.trackingModeText,
                    { color: trackingMode === "hybrid-vision" ? "#FFF" : theme.textSecondary },
                  ]}>
                    YOLO + Vision
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {isTracking && trackingState?.statusInfo && (
            <View style={[styles.liveStatusContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.liveStatusRow}>
                <View style={[styles.liveStatusDot, { 
                  backgroundColor: trackingState.statusInfo.backend === "vision-tracking" 
                    ? theme.success 
                    : trackingState.statusInfo.backend === "yolo-detecting"
                    ? theme.warning
                    : trackingState.statusInfo.backend === "reacquiring"
                    ? theme.error
                    : theme.primary 
                }]} />
                <Text style={[styles.liveStatusText, { color: theme.text }]}>
                  {trackingState.statusInfo.backend === "vision-tracking" && "Vision Tracking"}
                  {trackingState.statusInfo.backend === "yolo-detecting" && "YOLO Detecting"}
                  {trackingState.statusInfo.backend === "vision-detecting" && "Vision Detecting"}
                  {trackingState.statusInfo.backend === "moondream-detecting" && "Cloud API"}
                  {trackingState.statusInfo.backend === "reacquiring" && "Re-acquiring..."}
                  {trackingState.statusInfo.backend === "idle" && "Idle"}
                </Text>
                <Text style={[styles.liveStatusTime, { color: theme.textSecondary }]}>
                  {trackingState.statusInfo.lastDetectionMs}ms
                </Text>
              </View>
              {trackingState.statusInfo.mode === "hybrid-vision" && (
                <View style={styles.liveStatusStats}>
                  <Text style={[styles.liveStatItem, { color: theme.textSecondary }]}>
                    Tracked: {trackingState.statusInfo.trackingFrameCount} frames
                  </Text>
                  <Text style={[styles.liveStatItem, { color: theme.textSecondary }]}>
                    Re-acquired: {trackingState.statusInfo.reacquisitionCount}x
                  </Text>
                </View>
              )}
            </View>
          )}

          {selectedModel === "custom" ? (
            <View style={styles.customObjectSection}>
              <View style={styles.customInputRow}>
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.primary,
                      flex: 1,
                    },
                  ]}
                  placeholder="Describe object to track..."
                  placeholderTextColor={theme.textSecondary}
                  value={customObject}
                  onChangeText={onCustomObjectChange}
                  editable={!isTracking}
                  returnKeyType="done"
                />
                {customObject.trim() && !isTracking ? (
                  <Pressable
                    onPress={handleSaveCustomObject}
                    style={({ pressed }) => [
                      styles.saveObjectButton,
                      { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Feather name="bookmark" size={14} color="#FFF" />
                  </Pressable>
                ) : null}
                {savedObjects.length > 0 ? (
                  <Pressable
                    onPress={() => setShowSavedObjects(!showSavedObjects)}
                    style={({ pressed }) => [
                      styles.savedObjectsToggle,
                      { 
                        backgroundColor: showSavedObjects ? theme.primary : theme.backgroundSecondary,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Feather 
                      name="list" 
                      size={14} 
                      color={showSavedObjects ? "#FFF" : theme.text} 
                    />
                  </Pressable>
                ) : null}
              </View>
              
              {showSavedObjects && savedObjects.length > 0 ? (
                <View style={[styles.savedObjectsList, { backgroundColor: theme.backgroundSecondary }]}>
                  {savedObjects.slice(0, 8).map((obj) => (
                    <View key={obj.id} style={styles.savedObjectItem}>
                      <Pressable
                        onPress={() => handleSelectSavedObject(obj)}
                        style={({ pressed }) => [
                          styles.savedObjectButton,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text 
                          style={[styles.savedObjectText, { color: theme.text }]} 
                          numberOfLines={1}
                        >
                          {obj.name}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteSavedObject(obj.id)}
                        hitSlop={8}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0.6 })}
                      >
                        <Feather name="x" size={12} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={handleToggleTracking}
            disabled={!cameraConnected && Boolean(camera)}
            style={({ pressed }) => [
              styles.trackButton,
              {
                backgroundColor: isTracking ? theme.error : theme.success,
                opacity: (!cameraConnected && camera) ? 0.5 : (pressed ? 0.85 : 1),
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Feather
              name={isTracking ? "stop-circle" : "play-circle"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.trackButtonText}>{isTracking ? "Stop" : "Track"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Camera Connection Section */}
      <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Camera Source</Text>
          {cameraConnected && cameraStatus ? (
            <View style={[styles.statusBadge, { backgroundColor: theme.success + "20" }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.statusText, { color: theme.success }]}>
                {cameraStatus.fps} FPS
              </Text>
            </View>
          ) : cameraConnected ? (
            <View style={[styles.statusBadge, { backgroundColor: theme.success + "20" }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.statusText, { color: theme.success }]}>Live</Text>
            </View>
          ) : null}
        </View>
        
        {!camera ? (
          <View style={[styles.noCamera, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="video-off" size={24} color={theme.textSecondary} />
            <Text style={[styles.noCameraText, { color: theme.textSecondary }]}>
              No camera configured
            </Text>
            <Text style={[styles.noCameraHint, { color: theme.textSecondary }]}>
              Add a PTZ camera in Settings
            </Text>
          </View>
        ) : showPermissionPrompt ? (
          <View style={[styles.permissionPrompt, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.permissionHeader}>
              <Feather name="wifi" size={24} color={theme.primary} />
              <Text style={[styles.permissionTitle, { color: theme.text }]}>
                Local Network Access
              </Text>
            </View>
            <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
              This app needs permission to access your local network to connect to the camera.
            </Text>
            <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
              When prompted, tap "Allow" to enable the connection.
            </Text>
            <View style={styles.permissionButtons}>
              <Pressable
                onPress={() => setShowPermissionPrompt(false)}
                style={({ pressed }) => [
                  styles.permissionCancelButton,
                  { borderColor: theme.textSecondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.permissionCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowPermissionPrompt(false);
                  handleConnect();
                }}
                disabled={isConnecting}
                style={({ pressed }) => [
                  styles.permissionAllowButton,
                  { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.permissionAllowText}>Connect Now</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : cameraConnected ? (
          <View style={styles.connectedSection}>
            <View style={styles.connectedInfo}>
              {previewFrame ? (
                <Image 
                  source={{ uri: previewFrame }} 
                  style={styles.previewThumbnail}
                  resizeMode="cover"
                />
              ) : null}
              <View style={[styles.cameraInfo, { backgroundColor: theme.backgroundSecondary, flex: 1 }]}>
                <View style={styles.cameraDetails}>
                  <Text style={[styles.cameraName, { color: theme.text }]}>{camera.name}</Text>
                  <Text style={[styles.cameraIp, { color: theme.textSecondary }]}>
                    {camera.ipAddress}:{camera.rtspPort}
                  </Text>
                </View>
                {cameraStatus ? (
                  <View style={styles.statsRow}>
                    <Text style={[styles.statItem, { color: theme.primary }]}>
                      {cameraStatus.fps} FPS
                    </Text>
                    <Text style={[styles.statItem, { color: theme.textSecondary }]}>
                      {cameraStatus.frameCount} frames
                    </Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={handleDisconnect}
                style={({ pressed }) => [
                  styles.disconnectButton,
                  { backgroundColor: theme.error, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather name="power" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
            
            <View style={styles.ptzMiniControls}>
              <Text style={[styles.ptzMiniLabel, { color: theme.textSecondary }]}>Hold to move:</Text>
              <View style={styles.ptzMiniPad}>
                <Pressable
                  onPressIn={() => handlePtzStart("up")}
                  onPressOut={handlePtzStop}
                  style={({ pressed }) => [
                    styles.ptzMiniButton,
                    { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="chevron-up" size={16} color={theme.text} />
                </Pressable>
                <View style={styles.ptzMiniRow}>
                  <Pressable
                    onPressIn={() => handlePtzStart("left")}
                    onPressOut={handlePtzStop}
                    style={({ pressed }) => [
                      styles.ptzMiniButton,
                      { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                    ]}
                  >
                    <Feather name="chevron-left" size={16} color={theme.text} />
                  </Pressable>
                  <View style={[styles.ptzMiniButton, { backgroundColor: "transparent" }]} />
                  <Pressable
                    onPressIn={() => handlePtzStart("right")}
                    onPressOut={handlePtzStop}
                    style={({ pressed }) => [
                      styles.ptzMiniButton,
                      { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                    ]}
                  >
                    <Feather name="chevron-right" size={16} color={theme.text} />
                  </Pressable>
                </View>
                <Pressable
                  onPressIn={() => handlePtzStart("down")}
                  onPressOut={handlePtzStop}
                  style={({ pressed }) => [
                    styles.ptzMiniButton,
                    { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="chevron-down" size={16} color={theme.text} />
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.connectSection}>
            <View style={[styles.cameraInfo, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.cameraDetails}>
                <Text style={[styles.cameraName, { color: theme.text }]}>{camera.name}</Text>
                <Text style={[styles.cameraIp, { color: theme.textSecondary }]}>
                  {camera.ipAddress}:{camera.rtspPort}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleConnect}
              disabled={isConnecting}
              style={({ pressed }) => [
                styles.connectButton,
                { 
                  backgroundColor: theme.primary,
                  opacity: isConnecting ? 0.5 : (pressed ? 0.8 : 1),
                },
              ]}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="wifi" size={16} color="#FFFFFF" />
                  <Text style={styles.connectButtonText}>Connect</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
        
        {connectionError ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: theme.error }]}>{connectionError}</Text>
            <Text style={[styles.errorHint, { color: theme.textSecondary }]}>
              {Platform.OS === "ios" 
                ? "Go to Settings > Privacy & Security > Local Network and make sure Expo Go is enabled."
                : "Make sure your phone and camera are on the same WiFi network."}
            </Text>
            {Platform.OS === "ios" ? (
              <Pressable
                onPress={async () => {
                  try {
                    await Linking.openSettings();
                  } catch (e) {
                    console.log("Could not open settings");
                  }
                }}
                style={({ pressed }) => [
                  styles.openSettingsButton,
                  { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="settings" size={14} color={theme.primary} />
                <Text style={[styles.openSettingsText, { color: theme.primary }]}>Open Settings</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <Modal
        visible={showModelPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModelPicker(false)}
      >
        <Pressable 
          style={styles.modalBackdrop} 
          onPress={() => setShowModelPicker(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Tracking Model</Text>
              <Pressable
                onPress={() => setShowModelPicker(false)}
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            
            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.sectionHeader, { color: theme.primary }]}>
                <Feather name="eye" size={12} /> Vision Framework
              </Text>
              <Text style={[styles.sectionSubheader, { color: theme.textSecondary }]}>
                Native iOS detection - fast, works offline
              </Text>
              {TRACKING_MODELS.filter(m => m.usesVision).map((model) => (
                <Pressable
                  key={model.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onModelChange(model.id);
                    setShowModelPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.modelRow,
                    { 
                      backgroundColor: selectedModel === model.id 
                        ? theme.primary + "15" 
                        : pressed 
                          ? theme.backgroundSecondary 
                          : "transparent",
                      borderColor: selectedModel === model.id ? theme.primary : "transparent",
                    },
                  ]}
                >
                  <View style={[styles.modelRowIcon, { backgroundColor: theme.primary + "20" }]}>
                    <Feather name={model.icon as any} size={20} color={theme.primary} />
                  </View>
                  <View style={styles.modelRowInfo}>
                    <Text style={[styles.modelRowName, { color: theme.text }]}>{model.name}</Text>
                    <Text style={[styles.modelRowDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {model.description}
                    </Text>
                  </View>
                  {selectedModel === model.id && (
                    <Feather name="check-circle" size={20} color={theme.primary} />
                  )}
                </Pressable>
              ))}

              <Text style={[styles.sectionHeader, { color: theme.success, marginTop: Spacing.lg }]}>
                <Feather name="zap" size={12} /> YOLO Detection
              </Text>
              <Text style={[styles.sectionSubheader, { color: theme.textSecondary }]}>
                On-device AI - 80 object classes at 30+ FPS
              </Text>
              {TRACKING_MODELS.filter(m => m.usesYolo).map((model) => (
                <Pressable
                  key={model.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onModelChange(model.id);
                    setShowModelPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.modelRow,
                    { 
                      backgroundColor: selectedModel === model.id 
                        ? theme.success + "15" 
                        : pressed 
                          ? theme.backgroundSecondary 
                          : "transparent",
                      borderColor: selectedModel === model.id ? theme.success : "transparent",
                    },
                  ]}
                >
                  <View style={[styles.modelRowIcon, { backgroundColor: theme.success + "20" }]}>
                    <Feather name={model.icon as any} size={20} color={theme.success} />
                  </View>
                  <View style={styles.modelRowInfo}>
                    <Text style={[styles.modelRowName, { color: theme.text }]}>{model.name}</Text>
                    <Text style={[styles.modelRowDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {model.description}
                    </Text>
                  </View>
                  {selectedModel === model.id && (
                    <Feather name="check-circle" size={20} color={theme.success} />
                  )}
                </Pressable>
              ))}

              <Text style={[styles.sectionHeader, { color: theme.warning, marginTop: Spacing.lg }]}>
                <Feather name="cloud" size={12} /> Cloud AI
              </Text>
              <Text style={[styles.sectionSubheader, { color: theme.textSecondary }]}>
                Moondream API - track anything you describe
              </Text>
              {TRACKING_MODELS.filter(m => !m.usesYolo && !m.usesVision).map((model) => (
                <Pressable
                  key={model.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onModelChange(model.id);
                    setShowModelPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.modelRow,
                    { 
                      backgroundColor: selectedModel === model.id 
                        ? theme.warning + "15" 
                        : pressed 
                          ? theme.backgroundSecondary 
                          : "transparent",
                      borderColor: selectedModel === model.id ? theme.warning : "transparent",
                    },
                  ]}
                >
                  <View style={[styles.modelRowIcon, { backgroundColor: theme.warning + "20" }]}>
                    <Feather name={model.icon as any} size={20} color={theme.warning} />
                  </View>
                  <View style={styles.modelRowInfo}>
                    <Text style={[styles.modelRowName, { color: theme.text }]}>{model.name}</Text>
                    <Text style={[styles.modelRowDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                      {model.description}
                    </Text>
                  </View>
                  {selectedModel === model.id && (
                    <Feather name="check-circle" size={20} color={theme.warning} />
                  )}
                </Pressable>
              ))}
              
              <View style={{ height: Spacing["2xl"] }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    gap: Spacing.md,
  },
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modeText: {
    fontSize: 9,
    fontWeight: "500",
    opacity: 0.8,
  },
  noCamera: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  noCameraText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  noCameraHint: {
    fontSize: Typography.small.fontSize,
  },
  permissionPrompt: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  permissionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  permissionText: {
    fontSize: Typography.small.fontSize,
    lineHeight: 18,
  },
  permissionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  permissionCancelButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  permissionCancelText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  permissionAllowButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  permissionAllowText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  connectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  previewThumbnail: {
    width: 60,
    height: 40,
    borderRadius: BorderRadius.xs,
    backgroundColor: "#000",
  },
  connectSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cameraInfo: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  cameraDetails: {
    gap: 2,
  },
  cameraName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  cameraIp: {
    fontSize: Typography.small.fontSize,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  statItem: {
    fontSize: 11,
    fontWeight: "500",
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 90,
    justifyContent: "center",
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  disconnectButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.small.fontSize,
  },
  errorHint: {
    fontSize: Typography.caption.fontSize,
    lineHeight: 16,
  },
  openSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
  },
  openSettingsText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  controls: {
    gap: Spacing.sm,
  },
  modelPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  modelPicker: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  modelOption: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  modelNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  modelName: {
    fontSize: Typography.small.fontSize,
  },
  backendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  backendBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  customInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: Typography.body.fontSize,
  },
  customObjectSection: {
    gap: Spacing.xs,
  },
  customInputRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  saveObjectButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  savedObjectsToggle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  savedObjectsList: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    gap: 2,
  },
  savedObjectItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  savedObjectButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
  },
  savedObjectText: {
    fontSize: 12,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  trackButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  connectedSection: {
    gap: Spacing.sm,
  },
  streamModeSelector: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  streamModeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  streamModeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  connectButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  connectButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 70,
    justifyContent: "center",
  },
  connectButtonSmallText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  ptzMiniControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
  },
  ptzMiniLabel: {
    fontSize: 11,
  },
  ptzMiniPad: {
    alignItems: "center",
  },
  ptzMiniRow: {
    flexDirection: "row",
  },
  ptzMiniButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  trackingModeSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  trackingModeLabel: {
    fontSize: Typography.small.fontSize,
  },
  trackingModeSelector: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 3,
  },
  trackingModeOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  trackingModeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  liveStatusContainer: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  liveStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveStatusText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    flex: 1,
  },
  liveStatusTime: {
    fontSize: 11,
    fontWeight: "500",
  },
  liveStatusStats: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: 2,
  },
  liveStatItem: {
    fontSize: 10,
  },
  modelPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  modelPickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modelPickerInfo: {
    flex: 1,
  },
  modelPickerName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  modelPickerDesc: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "700",
  },
  modalScroll: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    fontSize: Typography.body.fontSize,
    fontWeight: "700",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionSubheader: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.sm,
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1.5,
  },
  modelRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  modelRowInfo: {
    flex: 1,
  },
  modelRowName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  modelRowDesc: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
    lineHeight: 16,
  },
});
