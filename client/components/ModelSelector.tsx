import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Text, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { TrackingModel, TRACKING_MODELS, getModelInfo } from "@/lib/tracking";
import { CameraProfile } from "@/lib/storage";
import {
  connectCamera,
  disconnectCamera,
  getCameraStatus,
  checkRtspBackendHealth,
  CameraStatus,
} from "@/lib/rtsp";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface ModelSelectorProps {
  selectedModel: TrackingModel;
  isTracking: boolean;
  onModelChange: (model: TrackingModel) => void;
  onToggleTracking: () => void;
  onShowInfo: () => void;
  camera?: CameraProfile | null;
  onCameraConnected?: (connected: boolean) => void;
}

export function ModelSelector({
  selectedModel,
  isTracking,
  onModelChange,
  onToggleTracking,
  onShowInfo,
  camera,
  onCameraConnected,
}: ModelSelectorProps) {
  const { theme, isDark } = useTheme();
  const modelInfo = getModelInfo(selectedModel);
  
  const [rtspAvailable, setRtspAvailable] = useState<boolean | null>(null);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    checkRtspBackendHealth().then(setRtspAvailable);
  }, []);

  useEffect(() => {
    if (!cameraConnected || !camera) return;
    
    const interval = setInterval(async () => {
      const status = await getCameraStatus(camera.id);
      if (status) {
        setCameraStatus(status);
        if (!status.connected) {
          setCameraConnected(false);
          onCameraConnected?.(false);
        }
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [cameraConnected, camera]);

  const handleConnect = useCallback(async () => {
    if (!camera) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      await connectCamera(camera);
      setCameraConnected(true);
      onCameraConnected?.(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setConnectionError(error.message || "Failed to connect");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsConnecting(false);
    }
  }, [camera, onCameraConnected]);

  const handleDisconnect = useCallback(async () => {
    if (!camera) return;
    
    await disconnectCamera(camera.id);
    setCameraConnected(false);
    setCameraStatus(null);
    onCameraConnected?.(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [camera, onCameraConnected]);

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
          {cameraConnected ? (
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
        ) : rtspAvailable === false ? (
          <View style={[styles.noCamera, { backgroundColor: theme.warning + "10" }]}>
            <Feather name="alert-triangle" size={24} color={theme.warning} />
            <Text style={[styles.noCameraText, { color: theme.warning }]}>
              RTSP backend not available
            </Text>
            <Text style={[styles.noCameraHint, { color: theme.textSecondary }]}>
              Start the Python RTSP server
            </Text>
          </View>
        ) : cameraConnected ? (
          <View style={styles.connectedInfo}>
            <View style={[styles.cameraInfo, { backgroundColor: theme.backgroundSecondary }]}>
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
              onPress={handleConnect}
              disabled={isConnecting}
              style={({ pressed }) => [
                styles.connectButton,
                { 
                  backgroundColor: theme.primary,
                  opacity: isConnecting ? 0.7 : pressed ? 0.8 : 1,
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
          <Text style={[styles.errorText, { color: theme.error }]}>{connectionError}</Text>
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
  connectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
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
  errorText: {
    fontSize: Typography.small.fontSize,
    marginTop: Spacing.sm,
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
