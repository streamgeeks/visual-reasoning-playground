import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, Text, Platform, ActivityIndicator, Image, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { TrackingModel, TRACKING_MODELS, getModelInfo } from "@/lib/tracking";
import { CameraProfile } from "@/lib/storage";
import {
  testCameraConnection,
  fetchCameraFrame,
  clearActiveConfig,
  getMjpegUrl,
} from "@/lib/camera";
import {
  checkBackendHealth,
  connectCameraRtsp,
  disconnectCameraRtsp,
  fetchRtspFrame,
  StreamMode,
} from "@/lib/rtspBackend";

export type { StreamMode };
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
  onCameraConnected?: (connected: boolean, mjpegUrl?: string) => void;
  onFrameUpdate?: (frameUri: string) => void;
  onStreamModeChange?: (mode: StreamMode) => void;
  onMjpegFallback?: () => void;
}

export function ModelSelector({
  selectedModel,
  isTracking,
  onModelChange,
  onToggleTracking,
  onShowInfo,
  camera,
  onCameraConnected,
  onFrameUpdate,
  onStreamModeChange,
  onMjpegFallback,
}: ModelSelectorProps) {
  const { theme, isDark } = useTheme();
  const modelInfo = getModelInfo(selectedModel);
  
  const [cameraConnected, setCameraConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraConnectionStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [mjpegUrl, setMjpegUrl] = useState<string | null>(null);
  const [useMjpeg, setUseMjpeg] = useState(false);
  const [streamMode, setStreamMode] = useState<StreamMode>("snapshot");
  const [backendAvailable, setBackendAvailable] = useState(false);
  
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);
  const fpsStartTimeRef = useRef(0);
  const fpsCountRef = useRef(0);
  const mjpegFpsRef = useRef(0);
  const lastMjpegLoadRef = useRef(0);

  // Notify parent when stream mode changes
  useEffect(() => {
    onStreamModeChange?.(streamMode);
  }, [streamMode, onStreamModeChange]);

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

  const startFrameCapture = useCallback((cam: CameraProfile, mode: StreamMode) => {
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
          // Use RTSP backend or direct snapshot based on mode
          const frame = mode === "rtsp" 
            ? await fetchRtspFrame(cam.id)
            : await fetchCameraFrame(cam);
          
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
                mode,
              });
              fpsStartTimeRef.current = Date.now();
              fpsCountRef.current = 0;
            }
            
            // Yield to UI thread - target ~2-5 FPS for snapshot mode to avoid overwhelming
            const frameTime = Date.now() - frameStart;
            const targetDelay = mode === "rtsp" ? 33 : 300; // 30 FPS for RTSP, ~3 FPS for snapshot
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

  // Handle MJPEG fallback to snapshot - called when MJPEGStream fails
  const handleMjpegFallback = useCallback(() => {
    if (cameraConnected && camera) {
      console.log("MJPEG failed, switching to snapshot mode");
      setUseMjpeg(false);
      setMjpegUrl(null);
      setStreamMode("snapshot");
      startFrameCapture(camera, "snapshot");
      onMjpegFallback?.();
    }
  }, [cameraConnected, camera, startFrameCapture, onMjpegFallback]);

  const handleConnect = useCallback(async () => {
    if (!camera) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Step 1: Check if RTSP backend is available (high FPS)
      const backendStatus = await checkBackendHealth();
      setBackendAvailable(backendStatus.available);
      
      if (backendStatus.available) {
        // Try RTSP backend first (20-30 FPS)
        console.log("RTSP backend available, connecting via RTSP...");
        const rtspResult = await connectCameraRtsp(camera);
        
        if (rtspResult.success) {
          setCameraConnected(true);
          setStreamMode("rtsp");
          onCameraConnected?.(true);
          startFrameCapture(camera, "rtsp");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
        console.log("RTSP connection failed, falling back to snapshot...");
      }
      
      // Step 2: Use snapshot mode for reliable streaming
      const result = await testCameraConnection(camera);
      if (result.success) {
        setCameraConnected(true);
        setStreamMode("snapshot");
        onCameraConnected?.(true);
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

  const handleDisconnect = useCallback(async () => {
    if (frameIntervalRef.current) {
      if (typeof frameIntervalRef.current === 'object' && 'stop' in frameIntervalRef.current) {
        (frameIntervalRef.current as any).stop();
      } else {
        clearInterval(frameIntervalRef.current);
      }
      frameIntervalRef.current = null;
    }
    
    // Disconnect from RTSP backend if it was used
    if (streamMode === "rtsp" && camera) {
      await disconnectCameraRtsp(camera.id);
    }
    
    clearActiveConfig();
    setCameraConnected(false);
    setCameraStatus(null);
    setPreviewFrame(null);
    setMjpegUrl(null);
    setUseMjpeg(false);
    setStreamMode("snapshot");
    onCameraConnected?.(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onCameraConnected, streamMode, camera]);

  const handleToggleTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleTracking();
  };

  return (
    <View style={styles.outerContainer}>
      {/* Camera Connection Section */}
      <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Camera Source</Text>
          {cameraConnected && cameraStatus ? (
            <View style={[styles.statusBadge, { 
              backgroundColor: streamMode === "rtsp" ? theme.success + "20" : theme.warning + "20" 
            }]}>
              <View style={[styles.statusDot, { 
                backgroundColor: streamMode === "rtsp" ? theme.success : theme.warning 
              }]} />
              <Text style={[styles.statusText, { 
                color: streamMode === "rtsp" ? theme.success : theme.warning 
              }]}>
                {cameraStatus.fps} FPS
              </Text>
              <Text style={[styles.modeText, { 
                color: streamMode === "rtsp" ? theme.success : theme.warning 
              }]}>
                {streamMode === "rtsp" ? "RTSP" : streamMode === "mjpeg" ? "MJPEG" : "Snapshot"}
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
              onPress={() => setShowPermissionPrompt(true)}
              style={({ pressed }) => [
                styles.connectButton,
                { 
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="wifi" size={16} color="#FFFFFF" />
              <Text style={styles.connectButtonText}>Connect</Text>
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
          <View style={[styles.modelPicker, { backgroundColor: theme.backgroundSecondary }]}>
            {TRACKING_MODELS.map((model) => (
              <Pressable
                key={model.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  onModelChange(model.id);
                }}
                style={[
                  styles.modelOption,
                  selectedModel === model.id && {
                    backgroundColor: theme.primary,
                  },
                ]}
              >
                <Feather
                  name={model.icon as any}
                  size={16}
                  color={selectedModel === model.id ? "#FFFFFF" : theme.textSecondary}
                />
              </Pressable>
            ))}
          </View>

          <Text style={[styles.modelName, { color: theme.textSecondary }]}>
            {modelInfo.name}
          </Text>

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
  modelName: {
    flex: 1,
    fontSize: Typography.small.fontSize,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  trackButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
});
