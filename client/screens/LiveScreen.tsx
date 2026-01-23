import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  Platform,
  Linking,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
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
import * as ImageManipulator from "expo-image-manipulator";

import { useTheme } from "@/hooks/useTheme";
import { StatsOverlay } from "@/components/StatsOverlay";
import { PTZJoystick } from "@/components/PTZJoystick";
import { DetectionOverlay } from "@/components/DetectionOverlay";
import { ModelSelector, StreamMode } from "@/components/ModelSelector";
import { OptimizedSnapshotStream } from "@/components/OptimizedSnapshotStream";
import { StoryDisplay, ResponseLength, CaptureResult } from "@/components/StoryDisplay";
import {
  StoryCapture,
  startNewStory,
  endActiveStory,
  addCaptureToActiveStory,
} from "@/lib/gallery";
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
  saveSettings,
  AppSettings,
  TrackingSettings,
  DEFAULT_TRACKING_SETTINGS,
} from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import {
  TrackingController,
  TrackingState,
  BoundingBox,
  getObjectDescription,
} from "@/lib/trackingService";
import { sendPtzCommand, PTZ_COMMANDS, testCameraConnection, fetchCameraFrame } from "@/lib/camera";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIDEO_ASPECT_RATIO = 16 / 9;
const VIDEO_WIDTH = SCREEN_WIDTH;
const VIDEO_HEIGHT = VIDEO_WIDTH / VIDEO_ASPECT_RATIO;

export default function LiveScreen({ navigation }: any) {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [camera, setCamera] = useState<CameraProfile | null>(null);
  const [selectedModel, setSelectedModel] = useState<TrackingModel>("person");
  const [customObject, setCustomObject] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>(() =>
    generateMockStats("person", false)
  );
  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [ptzPosition, setPtzPosition] = useState({ pan: 0, tilt: 0 });
  
  // PTZ camera connection state
  const [ptzConnected, setPtzConnected] = useState(false);
  const [ptzFrame, setPtzFrame] = useState<string | null>(null);
  const [ptzMjpegUrl, setPtzMjpegUrl] = useState<string | null>(null);
  const [ptzFps, setPtzFps] = useState(0);
  const [ptzStreamMode, setPtzStreamMode] = useState<StreamMode>("snapshot");
  const ptzFrameCountRef = useRef(0);
  const ptzFpsStartTimeRef = useRef(0);

  // Tool navigation state (null = show list, string = show that tool)
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
  // Settings state
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [showTrackingSettings, setShowTrackingSettings] = useState(false);
  const [localTrackingSettings, setLocalTrackingSettings] = useState<TrackingSettings>(DEFAULT_TRACKING_SETTINGS);

  // Auto-tracking state
  const [autoTrackingState, setAutoTrackingState] = useState<TrackingState | null>(null);
  const trackingControllerRef = useRef<TrackingController | null>(null);
  const latestFrameRef = useRef<string | null>(null);

  const pulseOpacity = useSharedValue(0.3);

  useFocusEffect(
    useCallback(() => {
      loadCameraAndSettings();
    }, [])
  );

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
      setAppSettings(settings);
      setLocalTrackingSettings(settings.tracking || DEFAULT_TRACKING_SETTINGS);
    } catch (error) {
      console.error("Error loading camera:", error);
    }
  };

  const handleUpdateTrackingSetting = useCallback(async (key: keyof TrackingSettings, value: number | boolean) => {
    const newSettings = { ...localTrackingSettings, [key]: value };
    setLocalTrackingSettings(newSettings);
    await saveSettings({ tracking: newSettings });
    if (appSettings) {
      setAppSettings({ ...appSettings, tracking: newSettings });
    }
    // Update the tracking controller if tracking is active
    if (trackingControllerRef.current && isTracking) {
      trackingControllerRef.current.updateConfig({
        ptzSpeed: newSettings.ptzSpeed,
        pulseDuration: newSettings.pulseDuration,
        deadZone: newSettings.deadZone,
        continuousMode: newSettings.continuousMode,
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [localTrackingSettings, appSettings, isTracking]);

  useEffect(() => {
    if (!isTracking) {
      setDetections([]);
      setStats(generateMockStats(selectedModel, false));
      return;
    }

    // Only use mock detections when NOT connected to PTZ camera
    // Real tracking uses the TrackingController with Moondream AI
    if (ptzConnected) {
      // Real tracking mode - don't generate mock detections
      setDetections([]);
      return;
    }

    // Demo mode with phone camera - use mock detections
    const interval = setInterval(() => {
      setStats(generateMockStats(selectedModel, true));
      setDetections(generateMockDetections(selectedModel));
    }, 500);

    return () => clearInterval(interval);
  }, [isTracking, selectedModel, ptzConnected]);

  // Cleanup tracking controller on unmount
  useEffect(() => {
    return () => {
      if (trackingControllerRef.current) {
        trackingControllerRef.current.stop();
        trackingControllerRef.current = null;
      }
    };
  }, []);

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
    // Update the tracking controller if tracking is active
    if (trackingControllerRef.current && isTracking) {
      trackingControllerRef.current.updateModel(model, model === "custom" ? customObject : undefined);
    }
  }, [isTracking, customObject]);

  const handleCustomObjectChange = useCallback((text: string) => {
    setCustomObject(text);
    // Update the tracking controller if tracking custom model
    if (trackingControllerRef.current && isTracking && selectedModel === "custom") {
      trackingControllerRef.current.updateModel("custom", text);
    }
  }, [isTracking, selectedModel]);

  const handleToggleTracking = useCallback(() => {
    if (isTracking) {
      // Stop tracking
      trackingControllerRef.current?.stop();
      trackingControllerRef.current = null;
      setIsTracking(false);
      setAutoTrackingState(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      // Start tracking
      if (!camera || !ptzConnected) {
        console.log("Cannot start tracking: no PTZ camera connected");
        return;
      }
      
      if (!appSettings?.moondreamApiKey) {
        Alert.alert(
          "API Key Required",
          "Please add your Moondream API key in Settings to enable object tracking."
        );
        return;
      }
      
      // Create tracking controller
      // For custom mode, require an object description
      if (selectedModel === "custom" && !customObject.trim()) {
        Alert.alert("Custom Object Required", "Please enter an object description to track.");
        return;
      }
      
      const trackingSettings = appSettings?.tracking || { ptzSpeed: 24, pulseDuration: 0, deadZone: 0.15, continuousMode: true };
      const controller = new TrackingController(
        camera,
        appSettings?.moondreamApiKey || "",
        selectedModel,
        async () => latestFrameRef.current,
        (state) => setAutoTrackingState(state),
        { 
          updateInterval: selectedModel === "custom" ? 600 : 300,
          ptzSpeed: trackingSettings.ptzSpeed,
          pulseDuration: trackingSettings.pulseDuration,
          deadZone: trackingSettings.deadZone,
          continuousMode: trackingSettings.continuousMode,
        },
        selectedModel === "custom" ? customObject.trim() : undefined
      );
      
      trackingControllerRef.current = controller;
      controller.start();
      setIsTracking(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isTracking, camera, ptzConnected, appSettings, selectedModel, customObject]);

  const lastPtzCommand = useRef<string | null>(null);
  const lastPtzSpeed = useRef<number>(0);

  const handlePTZMove = useCallback(async (pan: number, tilt: number, speed: number) => {
    setPtzPosition({ pan, tilt });
    
    if (!camera) return;
    
    // Determine command based on joystick position
    let command: string | null = null;
    
    // Deadzone threshold - don't send commands for tiny movements
    const threshold = 15;
    
    if (pan === 0 && tilt === 0 && speed === 0) {
      // Joystick released - stop movement
      command = PTZ_COMMANDS.stop;
    } else if (Math.abs(pan) > threshold || Math.abs(tilt) > threshold) {
      // Determine direction based on pan/tilt values
      const goingLeft = pan < -threshold;
      const goingRight = pan > threshold;
      const goingUp = tilt > threshold;
      const goingDown = tilt < -threshold;
      
      if (goingUp && goingLeft) command = PTZ_COMMANDS.upleft;
      else if (goingUp && goingRight) command = PTZ_COMMANDS.upright;
      else if (goingDown && goingLeft) command = PTZ_COMMANDS.downleft;
      else if (goingDown && goingRight) command = PTZ_COMMANDS.downright;
      else if (goingUp) command = PTZ_COMMANDS.up;
      else if (goingDown) command = PTZ_COMMANDS.down;
      else if (goingLeft) command = PTZ_COMMANDS.left;
      else if (goingRight) command = PTZ_COMMANDS.right;
    }
    
    // Send if command changed OR speed changed significantly (by 3 or more)
    const speedChanged = Math.abs(speed - lastPtzSpeed.current) >= 3;
    if (command && (command !== lastPtzCommand.current || speedChanged)) {
      lastPtzCommand.current = command;
      lastPtzSpeed.current = speed;
      await sendPtzCommand(camera, command, speed > 0 ? speed : undefined);
    }
  }, [camera]);

  const handleZoom = useCallback(async (zoom: number) => {
    const prevZoom = currentZoom;
    setCurrentZoom(zoom);
    
    if (!camera) return;
    
    if (zoom > prevZoom) {
      await sendPtzCommand(camera, PTZ_COMMANDS.zoomIn);
      // Brief zoom pulse then stop
      setTimeout(() => sendPtzCommand(camera, PTZ_COMMANDS.zoomStop), 200);
    } else if (zoom < prevZoom) {
      await sendPtzCommand(camera, PTZ_COMMANDS.zoomOut);
      setTimeout(() => sendPtzCommand(camera, PTZ_COMMANDS.zoomStop), 200);
    }
  }, [camera, currentZoom]);

  const handleQuickAction = useCallback(async (action: "home" | "center" | "wide") => {
    if (!camera) return;
    
    switch (action) {
      case "home":
        setPtzPosition({ pan: 0, tilt: 0 });
        setCurrentZoom(0);
        await sendPtzCommand(camera, PTZ_COMMANDS.home);
        break;
      case "center":
        setPtzPosition({ pan: 0, tilt: 0 });
        await sendPtzCommand(camera, PTZ_COMMANDS.stop);
        break;
      case "wide":
        setCurrentZoom(0);
        // Zoom out fully
        await sendPtzCommand(camera, PTZ_COMMANDS.zoomOut);
        setTimeout(() => sendPtzCommand(camera, PTZ_COMMANDS.zoomStop), 2000);
        break;
    }
  }, [camera]);

  const handleShowModelInfo = useCallback(() => {
    navigation.navigate("ModelInfo");
  }, [navigation]);

  const toggleStats = useCallback(() => {
    setShowStats((prev) => !prev);
    Haptics.selectionAsync();
  }, []);

  const toggleCameraType = useCallback(() => {
    setCameraType((prev) => (prev === "back" ? "front" : "back"));
    Haptics.selectionAsync();
  }, []);

  const handlePtzConnected = useCallback((connected: boolean, mjpegUrl?: string) => {
    setPtzConnected(connected);
    if (connected && mjpegUrl) {
      setPtzMjpegUrl(mjpegUrl);
    }
    if (!connected) {
      setPtzFrame(null);
      setPtzMjpegUrl(null);
      setPtzFps(0);
      ptzFrameCountRef.current = 0;
      ptzFpsStartTimeRef.current = 0;
    }
  }, []);

  const handlePtzFrameUpdate = useCallback((frameUri: string) => {
    setPtzFrame(frameUri);
    latestFrameRef.current = frameUri; // Store for tracking
    
    ptzFrameCountRef.current++;
    const now = Date.now();
    if (ptzFpsStartTimeRef.current === 0) {
      ptzFpsStartTimeRef.current = now;
    }
    
    const elapsed = (now - ptzFpsStartTimeRef.current) / 1000;
    if (elapsed >= 1) {
      const fps = Math.round(ptzFrameCountRef.current / elapsed);
      setPtzFps(fps);
      ptzFrameCountRef.current = 0;
      ptzFpsStartTimeRef.current = now;
    }
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

  const openTool = useCallback((tool: string) => {
    setActiveTool(tool);
    Haptics.selectionAsync();
  }, []);

  const closeTool = useCallback(() => {
    setActiveTool(null);
    Haptics.selectionAsync();
  }, []);

  const getPromptForLength = (length: ResponseLength): string => {
    switch (length) {
      case "short":
        return "Describe what you see in one sentence. Be literal and specific about objects, people, and actions.";
      case "medium":
        return "Describe what you see in 2-3 sentences. List the objects, people, colors, and actions visible in the image.";
      case "long":
        return "Describe everything you see in detail. List all objects, people, text, colors, positions, and actions. Be thorough and literal.";
    }
  };

  const handleStoryCaptureAndDescribe = useCallback(async (length: ResponseLength): Promise<CaptureResult | null> => {
    try {
      if (!appSettings?.moondreamApiKey) {
        return null;
      }

      if (!cameraRef.current) {
        return null;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        skipProcessing: true,
      });

      if (!photo?.uri) {
        return null;
      }

      // Resize and compress the image to reduce payload size
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 512 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated?.base64) {
        return null;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/describe-scene", apiUrl).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: manipulated.base64,
          apiKey: appSettings.moondreamApiKey,
          prompt: getPromptForLength(length),
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        description: data.description || "",
        imageUri: manipulated.uri,
      };
    } catch (error) {
      return null;
    }
  }, [appSettings]);

  const handleStoryModeStart = useCallback(async (intervalSeconds: number) => {
    await startNewStory(intervalSeconds);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleStoryModeEnd = useCallback(async () => {
    await endActiveStory();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const handleCaptureToStory = useCallback(async (imageUri: string, description: string, length: ResponseLength) => {
    const capture: StoryCapture = {
      id: Date.now().toString(),
      imageUri,
      description,
      capturedAt: new Date().toISOString(),
      length,
    };
    await addCaptureToActiveStory(capture);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.permissionContainer, { paddingTop: headerHeight }]}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="video" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            Loading Camera...
          </Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;

    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.permissionContainer, { paddingTop: headerHeight }]}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="video-off" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
            Visual Reasoning Playground needs camera access to display the live video feed and enable AI analysis.
          </Text>

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
              <Text style={[styles.permissionHint, { color: theme.textSecondary }]}>
                Camera permission was denied. Please enable it in Settings.
              </Text>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Video Area */}
      <View style={{ paddingTop: headerHeight }}>
        <View style={[styles.videoContainer, { backgroundColor: "#000" }]}>
          {ptzConnected && camera ? (
            <OptimizedSnapshotStream
              camera={camera}
              targetFps={8}
              style={styles.camera}
              onFpsUpdate={(stats) => {
                setPtzFps(stats.fps);
              }}
              onFrameUpdate={handlePtzFrameUpdate}
              onError={(err) => console.log("Stream error:", err)}
            />
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              zoom={currentZoom / 100}
            />
          )}

          <View style={styles.overlayContainer} pointerEvents="box-none">
            {/* Deadzone indicator - shows target area for tracking */}
            {(isTracking || showTrackingSettings) ? (
              <View 
                style={[
                  styles.deadzoneIndicator,
                  {
                    width: `${localTrackingSettings.deadZone * 200}%`,
                    height: `${localTrackingSettings.deadZone * 200}%`,
                    borderColor: autoTrackingState?.inDeadzone ? theme.success : theme.primary,
                  }
                ]} 
                pointerEvents="none"
              />
            ) : null}

            {/* Center crosshair */}
            <View style={styles.centerCrosshair} pointerEvents="none">
              <View style={[styles.crosshairLineH, { backgroundColor: theme.primary }]} />
              <View style={[styles.crosshairLineV, { backgroundColor: theme.primary }]} />
              <View style={[styles.crosshairCenter, { borderColor: theme.primary }]} />
            </View>

            {/* Tracking indicator */}
            {isTracking ? (
              <Animated.View style={[styles.recordingIndicator, pulseStyle]}>
                <View style={[
                  styles.recordingDot, 
                  { backgroundColor: autoTrackingState?.lastDetection?.found 
                      ? (autoTrackingState.inDeadzone ? theme.success : theme.warning)
                      : theme.error }
                ]} />
                <Text style={styles.recordingText}>
                  {autoTrackingState?.lastDetection?.found 
                    ? (autoTrackingState.inDeadzone 
                        ? "LOCKED" 
                        : `TRACKING ${(autoTrackingState.lastDirection?.pan || autoTrackingState.lastDirection?.tilt) 
                            ? [autoTrackingState.lastDirection?.pan, autoTrackingState.lastDirection?.tilt].filter(Boolean).join(" ").toUpperCase()
                            : ""}`)
                    : "SEARCHING..."}
                </Text>
              </Animated.View>
            ) : null}

            {/* Detection bounding box */}
            {isTracking && autoTrackingState?.lastDetection?.found && 
             autoTrackingState.lastDetection.box ? (
              <View 
                style={[
                  styles.detectionBox, 
                  { 
                    left: autoTrackingState.lastDetection.box.x_min * VIDEO_WIDTH,
                    top: autoTrackingState.lastDetection.box.y_min * VIDEO_HEIGHT,
                    width: (autoTrackingState.lastDetection.box.x_max - autoTrackingState.lastDetection.box.x_min) * VIDEO_WIDTH,
                    height: (autoTrackingState.lastDetection.box.y_max - autoTrackingState.lastDetection.box.y_min) * VIDEO_HEIGHT,
                    borderColor: autoTrackingState.inDeadzone ? theme.success : theme.warning,
                  }
                ]} 
              >
                <View style={[styles.detectionLabel, { backgroundColor: autoTrackingState.inDeadzone ? theme.success : theme.warning }]}>
                  <Text style={styles.detectionLabelText}>
                    {getObjectDescription(selectedModel).toUpperCase()}
                    {autoTrackingState.lastDetection.confidence 
                      ? ` ${Math.round(autoTrackingState.lastDetection.confidence * 100)}%` 
                      : ""}
                  </Text>
                </View>
              </View>
            ) : null}
            
            {/* Deadzone indicator */}
            {isTracking ? (
              <View style={[styles.deadzoneIndicator, { borderColor: theme.primary + "40" }]} pointerEvents="none" />
            ) : null}

            {/* Detection boxes */}
            {isTracking && !autoTrackingState?.lastDetection?.found ? (
              <DetectionOverlay
                detections={detections}
                containerWidth={VIDEO_WIDTH}
                containerHeight={VIDEO_HEIGHT}
              />
            ) : null}

            {/* Camera info */}
            <View style={styles.cameraInfoOverlay} pointerEvents="none">
              <Text style={styles.cameraInfoText}>
                {ptzConnected ? camera?.name : `Phone Camera (${cameraType})`}
              </Text>
              {ptzConnected ? (
                <Text style={[styles.cameraInfoText, { color: "#00D9FF" }]}>
                  {ptzFps} FPS
                </Text>
              ) : (
                <Text style={styles.cameraInfoText}>
                  P:{ptzPosition.pan} T:{ptzPosition.tilt} Z:{currentZoom}
                </Text>
              )}
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
                  cameraName={ptzConnected ? camera?.name : "Phone Camera"}
                  cameraFps={ptzFps}
                  cameraConnected={ptzConnected}
                  streamMode={ptzConnected ? ptzStreamMode : undefined}
                />
              </Animated.View>
            ) : null}

            {/* Video controls */}
            <View style={styles.videoControls}>
              <Pressable
                onPress={toggleStats}
                style={({ pressed }) => [
                  styles.videoButton,
                  {
                    backgroundColor: showStats ? theme.primary : "rgba(0,0,0,0.5)",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="activity" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={toggleCameraType}
                style={({ pressed }) => [
                  styles.videoButton,
                  { backgroundColor: "rgba(0,0,0,0.5)", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="refresh-cw" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Tools Area */}
      <View style={[styles.toolsArea, { paddingBottom: tabBarHeight }]}>
        {activeTool === null ? (
          /* Tool List View */
          <View style={styles.toolList}>
            <Pressable
              onPress={() => openTool("describe")}
              style={({ pressed }) => [
                styles.toolRow,
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.toolRowLeft}>
                <Feather name="eye" size={18} color={theme.primary} />
                <Text style={[styles.toolRowTitle, { color: theme.text }]}>
                  Describe Scene
                </Text>
                <View style={[styles.toolBadge, { backgroundColor: theme.primary + "20" }]}>
                  <Text style={[styles.toolBadgeText, { color: theme.primary }]}>AI</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => openTool("tracking")}
              style={({ pressed }) => [
                styles.toolRow,
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.toolRowLeft}>
                <Feather name="target" size={18} color={theme.primary} />
                <Text style={[styles.toolRowTitle, { color: theme.text }]}>
                  Object Tracking
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => openTool("ptz")}
              style={({ pressed }) => [
                styles.toolRow,
                { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.toolRowLeft}>
                <Feather name="move" size={18} color={theme.primary} />
                <Text style={[styles.toolRowTitle, { color: theme.text }]}>
                  Camera Controls
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        ) : (
          /* Expanded Tool View */
          <View style={styles.toolExpanded}>
            <Pressable
              onPress={closeTool}
              style={[styles.toolBackRow, { borderBottomColor: theme.backgroundDefault }]}
            >
              <Feather name="chevron-left" size={18} color={theme.primary} />
              <Text style={[styles.toolBackText, { color: theme.primary }]}>Back</Text>
            </Pressable>

            <ScrollView
              style={styles.toolContent}
              contentContainerStyle={styles.toolContentInner}
              showsVerticalScrollIndicator={false}
            >
              {activeTool === "describe" ? (
                <StoryDisplay
                  onCapture={handleStoryCaptureAndDescribe}
                  hasApiKey={Boolean(appSettings?.moondreamApiKey)}
                  onStoryModeStart={handleStoryModeStart}
                  onStoryModeEnd={handleStoryModeEnd}
                  onCaptureToStory={handleCaptureToStory}
                />
              ) : activeTool === "tracking" ? (
                <View>
                  <ModelSelector
                    selectedModel={selectedModel}
                    isTracking={isTracking}
                    onModelChange={handleModelChange}
                    onToggleTracking={handleToggleTracking}
                    onShowInfo={handleShowModelInfo}
                    camera={camera}
                    onCameraConnected={handlePtzConnected}
                    onFrameUpdate={handlePtzFrameUpdate}
                    onStreamModeChange={setPtzStreamMode}
                    customObject={customObject}
                    onCustomObjectChange={handleCustomObjectChange}
                  />
                  
                  <Pressable
                    onPress={() => setShowTrackingSettings(!showTrackingSettings)}
                    style={[styles.settingsToggle, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="sliders" size={16} color={theme.primary} />
                    <Text style={[styles.settingsToggleText, { color: theme.text }]}>
                      Tracking Settings
                    </Text>
                    <Feather 
                      name={showTrackingSettings ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={theme.textSecondary} 
                    />
                  </Pressable>
                  
                  {showTrackingSettings ? (
                    <View style={[styles.trackingSettingsPanel, { backgroundColor: theme.backgroundDefault }]}>
                      <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: theme.text }]}>Mode</Text>
                        <View style={styles.modeButtons}>
                          <Pressable
                            onPress={() => handleUpdateTrackingSetting("continuousMode", true)}
                            style={[
                              styles.modeButton,
                              { 
                                backgroundColor: localTrackingSettings.continuousMode ? theme.primary : theme.backgroundSecondary,
                              },
                            ]}
                          >
                            <Text style={[styles.modeButtonText, { color: localTrackingSettings.continuousMode ? "#FFF" : theme.textSecondary }]}>
                              Continuous
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleUpdateTrackingSetting("continuousMode", false)}
                            style={[
                              styles.modeButton,
                              { 
                                backgroundColor: !localTrackingSettings.continuousMode ? theme.primary : theme.backgroundSecondary,
                              },
                            ]}
                          >
                            <Text style={[styles.modeButtonText, { color: !localTrackingSettings.continuousMode ? "#FFF" : theme.textSecondary }]}>
                              Pulse
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      
                      <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: theme.text }]}>Speed: {localTrackingSettings.ptzSpeed}</Text>
                        <View style={styles.speedButtons}>
                          {[12, 18, 24].map((speed) => (
                            <Pressable
                              key={speed}
                              onPress={() => handleUpdateTrackingSetting("ptzSpeed", speed)}
                              style={[
                                styles.speedButton,
                                { 
                                  backgroundColor: localTrackingSettings.ptzSpeed === speed ? theme.primary : theme.backgroundSecondary,
                                },
                              ]}
                            >
                              <Text style={[styles.speedButtonText, { color: localTrackingSettings.ptzSpeed === speed ? "#FFF" : theme.textSecondary }]}>
                                {speed === 12 ? "Slow" : speed === 18 ? "Med" : "Fast"}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      
                      <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: theme.text }]}>Dead Zone: {Math.round(localTrackingSettings.deadZone * 100)}%</Text>
                        <View style={styles.speedButtons}>
                          {[0.1, 0.15, 0.25].map((dz) => (
                            <Pressable
                              key={dz}
                              onPress={() => handleUpdateTrackingSetting("deadZone", dz)}
                              style={[
                                styles.speedButton,
                                { 
                                  backgroundColor: localTrackingSettings.deadZone === dz ? theme.success : theme.backgroundSecondary,
                                },
                              ]}
                            >
                              <Text style={[styles.speedButtonText, { color: localTrackingSettings.deadZone === dz ? "#FFF" : theme.textSecondary }]}>
                                {dz === 0.1 ? "Small" : dz === 0.15 ? "Med" : "Large"}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : activeTool === "ptz" ? (
                <View>
                  {/* Camera Connection for PTZ */}
                  {!ptzConnected && camera ? (
                    <Pressable
                      onPress={async () => {
                        const result = await testCameraConnection(camera);
                        if (result.success) {
                          handlePtzConnected(true);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          // Start frame capture loop
                          const captureFrames = async () => {
                            while (true) {
                              const frame = await fetchCameraFrame(camera);
                              if (frame) {
                                handlePtzFrameUpdate(frame);
                              }
                              await new Promise(r => setTimeout(r, 150));
                            }
                          };
                          captureFrames();
                        } else {
                          Alert.alert("Connection Failed", result.error || "Could not connect to camera");
                        }
                      }}
                      style={[styles.connectButton, { backgroundColor: theme.primary }]}
                    >
                      <Feather name="video" size={18} color="#FFF" />
                      <Text style={styles.connectButtonText}>Connect to {camera.name}</Text>
                    </Pressable>
                  ) : !camera ? (
                    <View style={[styles.noCameraMessage, { backgroundColor: theme.backgroundSecondary }]}>
                      <Feather name="alert-circle" size={20} color={theme.warning} />
                      <Text style={[styles.noCameraText, { color: theme.textSecondary }]}>
                        No camera configured. Add one in Settings.
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.connectedBadge, { backgroundColor: theme.success + "20" }]}>
                      <View style={[styles.connectedDot, { backgroundColor: theme.success }]} />
                      <Text style={[styles.connectedText, { color: theme.success }]}>
                        Connected to {camera.name}
                      </Text>
                    </View>
                  )}
                  
                  <PTZJoystick
                    onMove={handlePTZMove}
                    onZoom={handleZoom}
                    onQuickAction={handleQuickAction}
                    currentZoom={currentZoom}
                  />
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}
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
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
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
  deadzoneIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    opacity: 0.6,
  },
  detectionMarker: {
    position: "absolute",
    width: 40,
    height: 40,
    borderWidth: 3,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  detectionBox: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "solid",
    backgroundColor: "transparent",
  },
  detectionLabel: {
    position: "absolute",
    top: -20,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detectionLabelText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "700",
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
    color: "rgba(255,255,255,0.7)",
    fontSize: Typography.caption.fontSize,
    fontFamily: Platform.select({ ios: "ui-monospace", default: "monospace" }),
  },
  statsContainer: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },
  videoControls: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  videoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  toolsArea: {
    flex: 1,
  },
  toolList: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  toolRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  toolRowTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  toolBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  toolBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  toolExpanded: {
    flex: 1,
  },
  toolBackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  toolBackText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  toolContent: {
    flex: 1,
  },
  toolContentInner: {
    padding: Spacing.md,
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
    fontSize: Typography.h4.fontSize,
    fontWeight: Typography.h4.fontWeight,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  permissionText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: Spacing.xl,
  },
  permissionHint: {
    fontSize: Typography.small.fontSize,
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
  describeContainer: {
    gap: Spacing.md,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  noCameraMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  noCameraText: {
    flex: 1,
    fontSize: Typography.small.fontSize,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    alignSelf: "flex-start",
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectedText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  settingsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  settingsToggleText: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  trackingSettingsPanel: {
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.lg,
  },
  settingRow: {
    gap: Spacing.sm,
  },
  settingLabel: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  modeButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  modeButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  speedButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  speedButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  speedButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
});
