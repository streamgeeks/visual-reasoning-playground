import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { StatsOverlay } from "@/components/StatsOverlay";
import { PTZJoystick } from "@/components/PTZJoystick";
import { DetectionOverlay } from "@/components/DetectionOverlay";
import { ModelSelector } from "@/components/ModelSelector";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import {
  TrackingModel,
  PerformanceStats,
  DetectionBox,
  generateMockStats,
  generateMockDetections,
  getModelInfo,
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

  const scanlineOffset = useSharedValue(0);
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

  // Scanline animation
  useEffect(() => {
    scanlineOffset.value = withRepeat(
      withTiming(VIDEO_HEIGHT, { duration: 2000 }),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withTiming(0.6, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const scanlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanlineOffset.value }],
  }));

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

  const handleConnectCamera = useCallback(() => {
    navigation.navigate("SettingsTab");
  }, [navigation]);

  // No camera view - use phone camera placeholder
  const renderCameraView = () => (
    <View style={[styles.videoContainer, { backgroundColor: theme.backgroundDefault }]}>
      {/* Simulated video feed background */}
      <View style={styles.videoFeed}>
        {/* Grid pattern */}
        <View style={styles.gridPattern}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { backgroundColor: theme.primary + "20" },
                i % 3 === 0 ? styles.gridLineV : null,
                i < 3 ? styles.gridLineH : null,
              ]}
            />
          ))}
        </View>

        {/* Center crosshair */}
        <View style={styles.centerCrosshair}>
          <View style={[styles.crosshairLineH, { backgroundColor: theme.primary }]} />
          <View style={[styles.crosshairLineV, { backgroundColor: theme.primary }]} />
          <View style={[styles.crosshairCenter, { borderColor: theme.primary }]} />
        </View>

        {/* Scanline effect when tracking */}
        {isTracking ? (
          <Animated.View
            style={[
              styles.scanline,
              { backgroundColor: theme.primary + "40" },
              scanlineStyle,
            ]}
          />
        ) : null}

        {/* Recording indicator */}
        {isTracking ? (
          <Animated.View style={[styles.recordingIndicator, pulseStyle]}>
            <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
            <Text style={styles.recordingText}>TRACKING</Text>
          </Animated.View>
        ) : null}

        {/* Detection boxes */}
        {isTracking ? (
          <DetectionOverlay
            detections={detections}
            containerWidth={VIDEO_WIDTH}
            containerHeight={VIDEO_HEIGHT}
          />
        ) : null}

        {/* Camera info overlay */}
        <View style={styles.cameraInfoOverlay}>
          <Text style={[styles.cameraInfoText, { color: theme.textSecondary }]}>
            {camera ? camera.name : "Phone Camera (Demo)"}
          </Text>
          <Text style={[styles.cameraInfoText, { color: theme.textSecondary }]}>
            P:{ptzPosition.pan} T:{ptzPosition.tilt} Z:{currentZoom}
          </Text>
        </View>
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
            cameraName={camera?.name || "Demo Mode"}
          />
        </Animated.View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Video area with padding for header */}
      <View style={{ paddingTop: headerHeight }}>
        {renderCameraView()}
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
  videoFeed: {
    flex: 1,
    backgroundColor: "#0A0E14",
  },
  gridPattern: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridLine: {
    width: "33.33%",
    height: "33.33%",
    borderWidth: 0.5,
    borderColor: "rgba(0, 217, 255, 0.1)",
  },
  gridLineV: {},
  gridLineH: {},
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
  scanline: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
  },
  recordingIndicator: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
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
});
