import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { StatsOverlay } from "@/components/StatsOverlay";
import { PTZJoystick } from "@/components/PTZJoystick";
import { DetectionOverlay } from "@/components/DetectionOverlay";
import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import {
  TrackingModel,
  PerformanceStats,
  DetectionBox,
  generateMockStats,
  generateMockDetections,
} from "@/lib/tracking";
import {
  CameraProfile,
  getCameraProfiles,
  getCurrentCameraId,
  getSettings,
} from "@/lib/storage";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIDEO_ASPECT_RATIO = 16 / 9;
const VIDEO_WIDTH = SCREEN_WIDTH;
const VIDEO_HEIGHT = VIDEO_WIDTH / VIDEO_ASPECT_RATIO;

export default function LiveScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [camera, setCamera] = useState<CameraProfile | null>(null);
  const [selectedModel, setSelectedModel] = useState<TrackingModel>("person");
  const [isTracking, setIsTracking] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [stats, setStats] = useState<PerformanceStats>(() =>
    generateMockStats("person", false)
  );
  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [ptzPosition, setPtzPosition] = useState({ pan: 0, tilt: 0 });

  const pulseOpacity = useSharedValue(0.3);

  // Load camera and settings
  useEffect(() => {
    loadCameraAndSettings();
  }, []);

  const loadCameraAndSettings = async () => {
    try {
      const [cameras, currentId, settings] = await Promise.all([
        getCameraProfiles(),
        getCurrentCameraId(),
        getSettings(),
      ]);

      if (currentId) {
        const currentCamera = cameras.find((c) => c.id === currentId);
        if (currentCamera) {
          setCamera(currentCamera);
        }
      }

      setShowStats(settings.showStatsByDefault);
    } catch (error) {
      console.error("Error loading camera:", error);
    }
  };

  // Simulate tracking updates
  useEffect(() => {
    if (!isTracking) {
      setDetections([]);
      setStats(generateMockStats(selectedModel, false));
      return;
    }

    const interval = setInterval(() => {
      setStats(generateMockStats(selectedModel, true));
      setDetections(generateMockDetections(selectedModel));
    }, 500);

    return () => clearInterval(interval);
  }, [isTracking, selectedModel]);

  // Pulse animation for recording indicator
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.8, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handleModelChange = useCallback((model: TrackingModel) => {
    setSelectedModel(model);
    setStats(generateMockStats(model, isTracking));
  }, [isTracking]);

  const handleToggleTracking = useCallback(() => {
    setIsTracking((prev) => !prev);
    Haptics.notificationAsync(
      isTracking
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    );
  }, [isTracking]);

  const handlePTZMove = useCallback((pan: number, tilt: number) => {
    setPtzPosition({ pan, tilt });
  }, []);

  const handleZoom = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  const handleQuickAction = useCallback((action: "home" | "center" | "wide") => {
    switch (action) {
      case "home":
        setPtzPosition({ pan: 0, tilt: 0 });
        setCurrentZoom(0);
        break;
      case "center":
        setPtzPosition({ pan: 0, tilt: 0 });
        break;
      case "wide":
        setCurrentZoom(0);
        break;
    }
  }, []);

  const handleShowModelInfo = useCallback(() => {
    navigation.navigate("ModelInfo");
  }, [navigation]);

  const toggleStats = useCallback(() => {
    setShowStats((prev) => !prev);
    Haptics.selectionAsync();
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
    Haptics.selectionAsync();
  }, []);

  const toggleCameraType = useCallback(() => {
    setCameraType((prev) => (prev === "back" ? "front" : "back"));
    Haptics.selectionAsync();
  }, []);

  const handleOpenSettings = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.error("Could not open settings:", error);
      }
    }
  }, []);

  // Permission loading state
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.permissionContainer, { paddingTop: headerHeight }]}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="video" size={48} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.permissionTitle}>
            Loading Camera...
          </ThemedText>
        </View>
      </View>
    );
  }

  // Permission denied state
  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;

    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.permissionContainer, { paddingTop: headerHeight }]}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="video-off" size={48} color={theme.primary} />
          </View>
          <ThemedText type="h4" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText type="body" style={[styles.permissionText, { color: theme.textSecondary }]}>
            Visual Reasoning Playground needs camera access to display the live video feed and enable AI tracking.
          </ThemedText>

          {canAskAgain ? (
            <Pressable
              onPress={requestPermission}
              style={({ pressed }) => [
                styles.permissionButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.permissionButtonText}>Enable Camera</Text>
            </Pressable>
          ) : (
            <>
              <ThemedText type="small" style={[styles.permissionHint, { color: theme.textSecondary }]}>
                Camera permission was denied. Please enable it in Settings.
              </ThemedText>
              {Platform.OS !== "web" ? (
                <Pressable
                  onPress={handleOpenSettings}
                  style={({ pressed }) => [
                    styles.permissionButton,
                    { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Feather name="settings" size={20} color="#FFFFFF" />
                  <Text style={styles.permissionButtonText}>Open Settings</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    );
  }

  // Camera view with overlays
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Camera area with padding for header */}
      <View style={{ paddingTop: headerHeight }}>
        <View style={[styles.videoContainer, { backgroundColor: "#000" }]}>
          <CameraView
            style={styles.camera}
            facing={cameraType}
            zoom={currentZoom / 100}
          >
            {/* Center crosshair */}
            <View style={styles.centerCrosshair}>
              <View style={[styles.crosshairLineH, { backgroundColor: theme.primary }]} />
              <View style={[styles.crosshairLineV, { backgroundColor: theme.primary }]} />
              <View style={[styles.crosshairCenter, { borderColor: theme.primary }]} />
            </View>

            {/* Recording/Tracking indicator */}
            {isTracking ? (
              <Animated.View style={[styles.recordingIndicator, pulseStyle]}>
                <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
                <Text style={styles.recordingText}>TRACKING</Text>
              </Animated.View>
            ) : null}

            {/* Detection boxes overlay */}
            {isTracking ? (
              <DetectionOverlay
                detections={detections}
                containerWidth={VIDEO_WIDTH}
                containerHeight={VIDEO_HEIGHT}
              />
            ) : null}

            {/* Camera info overlay */}
            <View style={styles.cameraInfoOverlay}>
              <Text style={[styles.cameraInfoText, { color: "rgba(255,255,255,0.7)" }]}>
                {camera ? camera.name : `Phone Camera (${cameraType})`}
              </Text>
              <Text style={[styles.cameraInfoText, { color: "rgba(255,255,255,0.7)" }]}>
                P:{ptzPosition.pan} T:{ptzPosition.tilt} Z:{currentZoom}
              </Text>
            </View>

            {/* Stats overlay */}
            {showStats ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.statsContainer}
              >
                <StatsOverlay
                  stats={stats}
                  cameraName={camera?.name || "Phone Camera"}
                />
              </Animated.View>
            ) : null}

            {/* Camera flip button */}
            <Pressable
              onPress={toggleCameraType}
              style={({ pressed }) => [
                styles.flipButton,
                { backgroundColor: "rgba(0,0,0,0.5)", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="refresh-cw" size={20} color="#FFFFFF" />
            </Pressable>
          </CameraView>
        </View>
      </View>

      {/* Controls area */}
      <View
        style={[
          styles.controlsArea,
          { paddingBottom: tabBarHeight + Spacing.lg },
        ]}
      >
        {/* Model selector */}
        <View style={styles.modelSelectorContainer}>
          <ModelSelector
            selectedModel={selectedModel}
            isTracking={isTracking}
            onModelChange={handleModelChange}
            onToggleTracking={handleToggleTracking}
            onShowInfo={handleShowModelInfo}
          />
        </View>

        {/* PTZ Joystick */}
        {showControls ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.joystickContainer}
          >
            <PTZJoystick
              onMove={handlePTZMove}
              onZoom={handleZoom}
              onQuickAction={handleQuickAction}
              currentZoom={currentZoom}
            />
          </Animated.View>
        ) : null}
      </View>

      {/* Toggle buttons */}
      <View style={[styles.toggleButtons, { top: headerHeight + VIDEO_HEIGHT + Spacing.sm }]}>
        <Pressable
          onPress={toggleStats}
          style={({ pressed }) => [
            styles.toggleButton,
            {
              backgroundColor: showStats ? theme.primary : theme.backgroundDefault,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather
            name="activity"
            size={18}
            color={showStats ? "#FFFFFF" : theme.textSecondary}
          />
        </Pressable>

        <Pressable
          onPress={toggleControls}
          style={({ pressed }) => [
            styles.toggleButton,
            {
              backgroundColor: showControls ? theme.primary : theme.backgroundDefault,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather
            name="move"
            size={18}
            color={showControls ? "#FFFFFF" : theme.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  centerCrosshair: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    justifyContent: "center",
    alignItems: "center",
  },
  crosshairLineH: {
    position: "absolute",
    width: 40,
    height: 1,
    opacity: 0.5,
  },
  crosshairLineV: {
    position: "absolute",
    width: 1,
    height: 40,
    opacity: 0.5,
  },
  crosshairCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  recordingIndicator: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    color: "#FFFFFF",
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
    letterSpacing: 1,
  },
  cameraInfoOverlay: {
    position: "absolute",
    bottom: Spacing.md,
    left: Spacing.md,
    gap: 2,
  },
  cameraInfoText: {
    fontSize: Typography.caption.fontSize,
    fontFamily: Platform.select({ ios: "ui-monospace", default: "monospace" }),
  },
  statsContainer: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },
  flipButton: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  modelSelectorContainer: {
    marginBottom: Spacing.lg,
  },
  joystickContainer: {
    alignItems: "center",
  },
  toggleButtons: {
    position: "absolute",
    right: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.small,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  permissionText: {
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: Spacing.xl,
  },
  permissionHint: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
});
