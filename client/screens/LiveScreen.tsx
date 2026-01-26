import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  Platform,
  Linking,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
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
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";

import { useTheme } from "@/hooks/useTheme";
import { StatsOverlay } from "@/components/StatsOverlay";
import { PTZJoystick } from "@/components/PTZJoystick";
import { DetectionOverlay, DetectionBoxOverlay } from "@/components/DetectionOverlay";
import { AIPhotographer, PhotoCapture, DetectionResult } from "@/components/AIPhotographer";
import { HuntAndFind } from "@/components/HuntAndFind";
import { PeopleCounter } from "@/components/PeopleCounter";
import { ColorMatcher } from "@/components/ColorMatcher";
import { DetectAll, DetectAllOverlay, LabeledDetection } from "@/components/DetectAll";
import { ToolHeader } from "@/components/ToolHeader";
import { ModelSelector, StreamMode } from "@/components/ModelSelector";
import { CameraStream } from "@/components/CameraStream";
import { StoryDisplay, ResponseLength, CaptureResult } from "@/components/StoryDisplay";
import { CameraChat } from "@/components/CameraChat";
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
import { describeScene, detectNumberedPeople } from "@/lib/moondream";
import { NumberedSelection } from "@/components/NumberedSelection";
import { ContextBanner } from "@/components/ContextBanner";
import { PersonManager } from "@/components/PersonManager";
import {
  generateVisionDescription,
  analyzeScene,
  buildMoondreamContext,
  type DescriptionSource,
} from "@/lib/visionDescription";
import * as VisionTracking from "vision-tracking";
import {
  TrackingController,
  TrackingState,
  BoundingBox,
  getObjectDescription,
} from "@/lib/trackingService";
import { 
  sendPtzCommand, 
  PTZ_COMMANDS, 
  testCameraConnection, 
  fetchCameraFrame,
  sendPtzViscaCommand,
  sendZoomViscaCommand,
  sendHomeViscaCommand,
  sendFineTuneMove,
  PtzDirection,
} from "@/lib/camera";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { getAIBadgeInfo, getToolAIInfo, ToolAIInfo } from "@/lib/aiInfo";
import { ToolInfoModal } from "@/components/ToolInfoModal";

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
  const [allCameras, setAllCameras] = useState<CameraProfile[]>([]);
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
  
  // AI Photographer detection
  const [aiDetection, setAiDetection] = useState<DetectionResult | null>(null);
  const [aiFlashEffect, setAiFlashEffect] = useState(false);
  const aiDetectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detectAllDetections, setDetectAllDetections] = useState<LabeledDetection[]>([]);

  const [toolInfoModalVisible, setToolInfoModalVisible] = useState(false);
  const [selectedToolInfo, setSelectedToolInfo] = useState<ToolAIInfo | null>(null);

  // Person selection mode state
  const [selectPersonMode, setSelectPersonMode] = useState(false);
  const [numberedDetections, setNumberedDetections] = useState<{id: string, box: {x_min: number, y_min: number, x_max: number, y_max: number}}[]>([]);
  const [selectedEmbedding, setSelectedEmbedding] = useState<number[] | null>(null);

  const pulseOpacity = useSharedValue(0.3);

  const videoScale = useSharedValue(1);
  const videoTranslateX = useSharedValue(0);
  const videoTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = videoScale.value;
    })
    .onUpdate((event) => {
      const newScale = Math.min(Math.max(savedScale.value * event.scale, 1), 4);
      videoScale.value = newScale;
    })
    .onEnd(() => {
      if (videoScale.value < 1.1) {
        videoScale.value = withSpring(1);
        videoTranslateX.value = withSpring(0);
        videoTranslateY.value = withSpring(0);
      }
      savedScale.value = videoScale.value;
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = videoTranslateX.value;
      savedTranslateY.value = videoTranslateY.value;
    })
    .onUpdate((event) => {
      if (videoScale.value > 1) {
        const maxTranslate = (videoScale.value - 1) * VIDEO_WIDTH / 2;
        const maxTranslateY = (videoScale.value - 1) * VIDEO_HEIGHT / 2;
        videoTranslateX.value = Math.min(Math.max(savedTranslateX.value + event.translationX, -maxTranslate), maxTranslate);
        videoTranslateY.value = Math.min(Math.max(savedTranslateY.value + event.translationY, -maxTranslateY), maxTranslateY);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (videoScale.value > 1) {
        videoScale.value = withSpring(1);
        videoTranslateX.value = withSpring(0);
        videoTranslateY.value = withSpring(0);
      } else {
        videoScale.value = withSpring(2);
      }
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(panGesture, doubleTapGesture)
  );

  const videoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: videoTranslateX.value },
      { translateY: videoTranslateY.value },
      { scale: videoScale.value },
    ],
  }));

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

      setAllCameras(cameras);
      
      if (currentId) {
        const currentCamera = cameras.find((c) => c.id === currentId);
        if (currentCamera) {
          setCamera(currentCamera);
        }
      } else if (cameras.length > 0) {
        setCamera(cameras[0]);
      }

      setShowStats(settings.showStatsByDefault);
      setAppSettings(settings);
      setLocalTrackingSettings(settings.tracking || DEFAULT_TRACKING_SETTINGS);
    } catch (error) {
      console.error("Error loading camera:", error);
    }
  };

  const handleUpdateTrackingSetting = useCallback(async (key: keyof TrackingSettings, value: number | boolean | string) => {
    const newSettings = { ...localTrackingSettings, [key]: value };
    setLocalTrackingSettings(newSettings);
    await saveSettings({ tracking: newSettings });
    if (appSettings) {
      setAppSettings({ ...appSettings, tracking: newSettings });
    }
    if (trackingControllerRef.current && isTracking) {
      trackingControllerRef.current.updateConfig({
        ptzSpeed: newSettings.ptzSpeed,
        pulseDuration: newSettings.pulseDuration,
        deadZone: newSettings.deadZone,
        continuousMode: newSettings.continuousMode,
        trackingMode: newSettings.trackingMode,
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

  const startTrackingWithCamera = useCallback((cam: CameraProfile) => {
    // Helper to start tracking once camera is connected
    if (!appSettings?.moondreamApiKey) {
      Alert.alert(
        "API Key Required",
        "Please add your Moondream API key in Settings to enable object tracking."
      );
      return;
    }
    
    if (selectedModel === "custom" && !customObject.trim()) {
      Alert.alert("Custom Object Required", "Please enter an object description to track.");
      return;
    }
    
    const trackingSettings = appSettings?.tracking || { ptzSpeed: 12, pulseDuration: 0, deadZone: 0.15, continuousMode: true, trackingMode: "detection-only" as const };
    const controller = new TrackingController(
      cam,
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
        trackingMode: trackingSettings.trackingMode || "detection-only",
      },
      selectedModel === "custom" ? customObject.trim() : undefined
    );
    
    trackingControllerRef.current = controller;
    controller.start();
    setIsTracking(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [appSettings, selectedModel, customObject]);

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

  const handleToggleTracking = useCallback(async () => {
    if (isTracking) {
      // Stop tracking
      trackingControllerRef.current?.stop();
      trackingControllerRef.current = null;
      setIsTracking(false);
      setAutoTrackingState(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      // Start tracking
      if (!camera) {
        Alert.alert("No Camera", "Please select a camera in Settings first.");
        return;
      }
      
      if (!appSettings?.moondreamApiKey) {
        Alert.alert(
          "API Key Required",
          "Please add your Moondream API key in Settings to enable object tracking."
        );
        return;
      }
      
      if (selectedModel === "custom" && !customObject.trim()) {
        Alert.alert("Custom Object Required", "Please enter an object description to track.");
        return;
      }
      
      // Auto-connect if not connected
      if (!ptzConnected) {
        console.log("[Tracking] Auto-connecting to camera for tracking...");
        try {
          const result = await testCameraConnection(camera);
          if (result.success) {
            handlePtzConnected(true);
            setPtzStreamMode("snapshot");
            // Start frame capture - we need frames for tracking
            // The connection will trigger frame updates via ModelSelector's useEffect
            // Give it a moment to start receiving frames
            setTimeout(() => {
              startTrackingWithCamera(camera);
            }, 500);
          } else {
            Alert.alert("Connection Failed", result.error || "Could not connect to camera");
          }
        } catch (err: any) {
          Alert.alert("Connection Error", err.message || "Failed to connect to camera");
        }
        return;
      }
      
      // Already connected, start tracking immediately
      startTrackingWithCamera(camera);
    }
  }, [isTracking, camera, ptzConnected, appSettings, selectedModel, customObject, handlePtzConnected, startTrackingWithCamera]);

  const lastPtzDirection = useRef<PtzDirection | null>(null);
  const lastPtzSpeed = useRef<number>(0);

  const handlePTZMove = useCallback(async (pan: number, tilt: number, speed: number) => {
    setPtzPosition({ pan, tilt });
    
    if (!camera) {
      console.log("[PTZ] No camera configured");
      return;
    }
    
    let direction: PtzDirection = "stop";
    const threshold = 15;
    
    if (pan === 0 && tilt === 0 && speed === 0) {
      direction = "stop";
    } else if (Math.abs(pan) > threshold || Math.abs(tilt) > threshold) {
      const goingLeft = pan < -threshold;
      const goingRight = pan > threshold;
      const goingUp = tilt > threshold;
      const goingDown = tilt < -threshold;
      
      if (goingUp && goingLeft) direction = "upleft";
      else if (goingUp && goingRight) direction = "upright";
      else if (goingDown && goingLeft) direction = "downleft";
      else if (goingDown && goingRight) direction = "downright";
      else if (goingUp) direction = "up";
      else if (goingDown) direction = "down";
      else if (goingLeft) direction = "left";
      else if (goingRight) direction = "right";
    }
    
    const speedChanged = Math.abs(speed - lastPtzSpeed.current) >= 2;
    if (direction !== lastPtzDirection.current || speedChanged) {
      lastPtzDirection.current = direction;
      lastPtzSpeed.current = speed;
      console.log(`[PTZ] Sending VISCA: ${direction} @ speed ${speed} to ${camera.ipAddress}:${camera.viscaPort || 1259}`);
      const result = await sendPtzViscaCommand(camera, direction, speed, speed);
      console.log(`[PTZ] VISCA result: ${result ? "OK" : "FAILED"}`);
    }
  }, [camera]);

  const handleFineTune = useCallback(async (direction: PtzDirection) => {
    if (!camera) return;
    console.log(`[PTZ] Fine-tune: ${direction}`);
    await sendFineTuneMove(camera, direction, 150);
  }, [camera]);

  const handleZoom = useCallback(async (zoom: number) => {
    const prevZoom = currentZoom;
    setCurrentZoom(zoom);
    
    if (!camera) return;
    
    if (zoom > prevZoom) {
      await sendZoomViscaCommand(camera, "in", 7);
      setTimeout(() => sendZoomViscaCommand(camera, "stop"), 150);
    } else if (zoom < prevZoom) {
      await sendZoomViscaCommand(camera, "out", 7);
      setTimeout(() => sendZoomViscaCommand(camera, "stop"), 150);
    }
  }, [camera, currentZoom]);

  const handleQuickAction = useCallback(async (action: "home" | "center" | "wide") => {
    if (!camera) return;
    
    switch (action) {
      case "home":
        setPtzPosition({ pan: 0, tilt: 0 });
        setCurrentZoom(0);
        await sendHomeViscaCommand(camera);
        break;
      case "center":
        setPtzPosition({ pan: 0, tilt: 0 });
        await sendPtzViscaCommand(camera, "stop");
        break;
      case "wide":
        setCurrentZoom(0);
        await sendZoomViscaCommand(camera, "out", 7);
        setTimeout(() => sendZoomViscaCommand(camera, "stop"), 2000);
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

  const handlePtzFrameUpdate = useCallback((frameUri: string) => {
    setPtzFrame(frameUri);
    latestFrameRef.current = frameUri;
    
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

  const handleSelectPerson = useCallback(async (detection: {id: string, box: {x_min: number, y_min: number, x_max: number, y_max: number}}) => {
    try {
      let base64Data: string | null = null;
      
      if (ptzConnected && latestFrameRef.current) {
        const frame = latestFrameRef.current;
        base64Data = frame.includes(",") ? frame.split(",")[1] : frame;
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
        if (!photo || !photo.base64) return;
        base64Data = photo.base64;
      }
      
      if (!base64Data) return;

      const frameWidth = Dimensions.get("window").width;
      const frameHeight = VIDEO_HEIGHT;
      
      const cropped = await ImageManipulator.manipulateAsync(
        `data:image/jpeg;base64,${base64Data}`,
        [{
          crop: {
            originX: detection.box.x_min * frameWidth,
            originY: detection.box.y_min * frameHeight,
            width: (detection.box.x_max - detection.box.x_min) * frameWidth,
            height: (detection.box.y_max - detection.box.y_min) * frameHeight,
          },
        }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG }
      );

      if (!cropped.base64) return;

      const embedding = await VisionTracking.generateFeaturePrint(cropped.base64);
      setSelectedEmbedding(embedding);
      
      if (trackingControllerRef.current) {
        trackingControllerRef.current.setTargetIdentity(embedding);
      }
      
      setSelectPersonMode(false);
      setNumberedDetections([]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Person Locked", 
        `Now tracking ${detection.id}. Start "Object Tracking" to follow this specific person.`
      );
    } catch (error) {
      console.error("Failed to select person:", error);
      Alert.alert("Error", "Failed to select person");
    }
  }, [ptzConnected]);

  const triggerNumberedDetection = useCallback(async () => {
    try {
      let base64Data: string | null = null;
      
      if (ptzConnected && latestFrameRef.current) {
        const frame = latestFrameRef.current;
        base64Data = frame.includes(",") ? frame.split(",")[1] : frame;
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
        if (!photo || !photo.base64) return;
        base64Data = photo.base64;
      }
      
      if (!base64Data) return;

      const apiKey = appSettings?.moondreamApiKey;
      if (!apiKey) {
        Alert.alert("API Key Required", "Please set Moondream API key in settings");
        return;
      }

      const detections = await detectNumberedPeople(base64Data, apiKey);
      setNumberedDetections(detections);
      
      if (detections.length === 0) {
        Alert.alert("No People Found", "No people were detected in the current frame");
        setSelectPersonMode(false);
      }
    } catch (error) {
      console.error("Failed to detect numbered people:", error);
      setSelectPersonMode(false);
    }
  }, [ptzConnected, appSettings?.moondreamApiKey]);

  const captureFrameForAI = useCallback(async (): Promise<string | null> => {
    if (ptzConnected && latestFrameRef.current) {
      return latestFrameRef.current;
    }
    
    if (!cameraRef.current) {
      return null;
    }
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        skipProcessing: true,
      });
      
      if (!photo?.uri) return null;
      
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 512 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      
      if (!manipulated?.base64) return null;
      
      return `data:image/jpeg;base64,${manipulated.base64}`;
    } catch (err) {
      console.log("[captureFrameForAI] Error:", err);
      return null;
    }
  }, [ptzConnected]);

  const handleOpenSettings = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.error("Could not open settings:", error);
      }
    }
  }, []);

  const handleSetupApiKey = useCallback(() => {
    navigation.navigate("SettingsTab");
    Haptics.selectionAsync();
  }, [navigation]);

  const openTool = useCallback((tool: string) => {
    if (tool !== "detectall") {
      setDetectAllDetections([]);
    }
    setActiveTool(tool);
    Haptics.selectionAsync();
  }, []);

  const closeTool = useCallback(() => {
    setDetectAllDetections([]);
    setActiveTool(null);
    Haptics.selectionAsync();
  }, []);

  const showToolInfo = useCallback((toolId: string) => {
    const info = getToolAIInfo(toolId);
    if (info) {
      setSelectedToolInfo(info);
      setToolInfoModalVisible(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const handleStoryCaptureAndDescribe = useCallback(async (length: ResponseLength, forceVision?: boolean): Promise<CaptureResult | null> => {
    try {
      let base64Data: string | null = null;
      let imageUri: string = "";

      if (ptzConnected && latestFrameRef.current) {
        const frame = latestFrameRef.current;
        base64Data = frame.includes(",") ? frame.split(",")[1] : frame;
        imageUri = frame;
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          skipProcessing: true,
        });

        if (!photo?.uri) {
          console.log("Failed to capture photo");
          return null;
        }

        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 512 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (!manipulated?.base64) {
          console.log("Failed to process image");
          return null;
        }

        base64Data = manipulated.base64;
        imageUri = manipulated.uri;
      } else {
        console.log("No camera source available");
        return null;
      }

      const hasMoondream = Boolean(appSettings?.moondreamApiKey) && !forceVision;
      let description: string;
      let source: DescriptionSource;

      if (hasMoondream) {
        const analysis = VisionTracking.isVisionAvailable
          ? await analyzeScene(base64Data)
          : null;
        const context = analysis ? buildMoondreamContext(analysis) : "";
        
        const prompt = context
          ? `${getPromptForLength(length)}\n\nContext from detection: ${context}`
          : getPromptForLength(length);

        const result = await describeScene(
          base64Data,
          appSettings!.moondreamApiKey,
          prompt
        );

        if (result.error) {
          console.error("Moondream API error:", result.error);
          if (VisionTracking.isVisionAvailable) {
            const visionResult = await generateVisionDescription(base64Data);
            description = visionResult.natural;
            source = "apple";
          } else {
            return null;
          }
        } else {
          description = result.description;
          source = "moondream";
        }
      } else if (VisionTracking.isVisionAvailable) {
        const visionResult = await generateVisionDescription(base64Data);
        description = visionResult.natural;
        source = "apple";
      } else {
        console.log("No description service available");
        return null;
      }

      return {
        description,
        imageUri,
        source,
      };
    } catch (error) {
      console.error("Scene capture error:", error);
      return null;
    }
  }, [appSettings, ptzConnected]);

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
      {/* Video Section - 45% */}
      <View style={styles.videoSection}>
        <View style={{ paddingTop: headerHeight }}>
          <GestureDetector gesture={composedGesture}>
          <View style={[styles.videoContainer, { backgroundColor: "#000", overflow: "hidden" }]}>
            <Animated.View style={[styles.zoomableContent, videoAnimatedStyle]}>
              {ptzConnected && camera ? (
                <CameraStream
                  camera={camera}
                  streamMode={ptzStreamMode}
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

            {/* Detection bounding box - clean corner markers */}
            {isTracking && autoTrackingState?.lastDetection?.found && 
             autoTrackingState.lastDetection.box ? (
              <DetectionBoxOverlay
                box={autoTrackingState.lastDetection.box}
                containerWidth={VIDEO_WIDTH}
                containerHeight={VIDEO_HEIGHT}
                isLocked={autoTrackingState.inDeadzone}
              />
            ) : null}
            
            {/* Detection info badge - bottom of video */}
            {isTracking && autoTrackingState?.lastDetection?.found ? (
              <View style={styles.detectionInfoContainer} pointerEvents="none">
                <Animated.View 
                  entering={FadeIn.duration(150)}
                  exiting={FadeOut.duration(150)}
                  style={[
                    styles.detectionInfoBadge, 
                    { backgroundColor: autoTrackingState.inDeadzone ? theme.success : theme.warning }
                  ]}
                >
                  <Text style={styles.detectionInfoText}>
                    {getObjectDescription(selectedModel).toUpperCase()}
                    {autoTrackingState.lastDetection.confidence 
                      ? ` ${Math.round(autoTrackingState.lastDetection.confidence * 100)}%` 
                      : ""}
                  </Text>
                </Animated.View>
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

            {/* Numbered person selection overlay */}
            <NumberedSelection
              detections={numberedDetections}
              onSelectPerson={handleSelectPerson}
              frameWidth={VIDEO_WIDTH}
              frameHeight={VIDEO_HEIGHT}
              visible={selectPersonMode}
            />

            {/* Camera info */}
            <View style={styles.cameraInfoOverlay} pointerEvents="none">
              <Text style={styles.cameraInfoText}>
                {ptzConnected ? camera?.name : `Phone Camera (${cameraType})`}
              </Text>
              {!ptzConnected && (
                <Text style={styles.cameraInfoText}>
                  P:{ptzPosition.pan} T:{ptzPosition.tilt} Z:{currentZoom}
                </Text>
              )}
            </View>

            {/* Camera switch button */}
            {camera && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPtzConnected(!ptzConnected);
                }}
                style={({ pressed }) => [
                  styles.cameraSwitchButton,
                  { 
                    backgroundColor: ptzConnected ? theme.primary : theme.backgroundSecondary,
                    opacity: pressed ? 0.7 : 0.9,
                  }
                ]}
              >
                <Feather 
                  name={ptzConnected ? "video" : "smartphone"} 
                  size={16} 
                  color={ptzConnected ? "#FFF" : theme.text} 
                />
                <Text style={[
                  styles.cameraSwitchText, 
                  { color: ptzConnected ? "#FFF" : theme.text }
                ]}>
                  {ptzConnected ? "PTZ" : "Phone"}
                </Text>
              </Pressable>
            )}

            {aiDetection?.box && (
              <DetectionBoxOverlay
                box={aiDetection.box}
                containerWidth={VIDEO_WIDTH}
                containerHeight={VIDEO_HEIGHT}
                isLocked={false}
                color={theme.success}
              />
            )}

            {activeTool === "detectall" && detectAllDetections.length > 0 && (
              <DetectAllOverlay
                detections={detectAllDetections}
                containerWidth={VIDEO_WIDTH}
                containerHeight={VIDEO_HEIGHT}
              />
            )}

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
          </View>
            </Animated.View>

            {/* AI Photographer flash effect - fixed position */}
            {aiFlashEffect && (
              <Animated.View
                entering={FadeIn.duration(100)}
                exiting={FadeOut.duration(200)}
                style={[styles.aiFlashOverlay, { borderColor: theme.success }]}
                pointerEvents="none"
              />
            )}

            {/* AI Photographer notification badge - fixed position */}
            {aiDetection && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(500)}
                style={styles.aiDetectionOverlay}
                pointerEvents="none"
              >
                <View style={[styles.aiDetectionBadge, { backgroundColor: theme.success }]}>
                  <Feather name="camera" size={14} color="#fff" />
                  <Text style={styles.aiDetectionText}>{aiDetection.triggerName}</Text>
                </View>
              </Animated.View>
            )}

            {/* Video controls - outside zoom area */}
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
        </GestureDetector>
        </View>
      </View>

      <ContextBanner
        trackingState={autoTrackingState}
        isTracking={isTracking}
        cameraName={ptzConnected ? (camera?.name || "PTZ Camera") : `Phone (${cameraType})`}
        fps={ptzFps}
        ptzConnected={ptzConnected}
      />

      {/* Sheet Area */}
      <View style={[styles.sheetArea, { paddingBottom: tabBarHeight }]}>
        {activeTool === null ? (
          <KeyboardAwareScrollViewCompat
            style={styles.toolListScroll}
            contentContainerStyle={styles.toolList}
            showsVerticalScrollIndicator={false}
          >
{[
              { id: "describe", icon: "eye" as const, title: "Describe Scene" },
              { id: "chat", icon: "message-circle" as const, title: "Chat" },
              { id: "photographer", icon: "camera" as const, title: "AI Photographer" },
              { id: "huntfind", icon: "search" as const, title: "Hunt & Find" },
              { id: "peoplecounter", icon: "users" as const, title: "People Counter" },
              { id: "detectall", icon: "grid" as const, title: "Detect All Objects" },
              { id: "colormatcher", icon: "sliders" as const, title: "Color Matcher" },
              { id: "tracking", icon: "target" as const, title: "Object Tracking" },
              { id: "ptz", icon: "move" as const, title: "Camera Controls" },
            ].map((tool) => {
              const badge = getAIBadgeInfo(tool.id);
              const hasApiKey = Boolean(appSettings?.moondreamApiKey);
              const showApiKeyHint = badge.benefitsFromApiKey && !hasApiKey;
              return (
                <Pressable
                  key={tool.id}
                  onPress={() => openTool(tool.id)}
                  style={({ pressed }) => [
                    styles.toolRow,
                    { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={styles.toolRowLeft}>
                    <Feather name={tool.icon} size={18} color={badge.color} />
                    <Text style={[styles.toolRowTitle, { color: theme.text }]}>
                      {tool.title}
                    </Text>
                    <View style={[styles.toolBadge, { backgroundColor: badge.color + "20" }]}>
                      <Text style={[styles.toolBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    {showApiKeyHint && (
                      <View style={[styles.apiKeyHintBadge, { backgroundColor: "#FF9500" + "20" }]}>
                        <Feather name="key" size={10} color="#FF9500" />
                        <Text style={styles.apiKeyHintText}>+API</Text>
                      </View>
                    )}
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                </Pressable>
              );
            })}
          </KeyboardAwareScrollViewCompat>
        ) : (
          /* Expanded Tool View */
          <View style={styles.toolExpanded}>
            {(() => {
              const toolId = activeTool || "";
              const badge = getAIBadgeInfo(toolId);
              const toolTitles: Record<string, string> = {
                describe: "Describe Scene",
                chat: "Chat",
                photographer: "AI Photographer",
                huntfind: "Hunt & Find",
                peoplecounter: "People Counter",
                detectall: "Detect All Objects",
                colormatcher: "Color Matcher",
                tracking: "Object Tracking",
                ptz: "Camera Controls",
              };
              const toolIcons: Record<string, keyof typeof Feather.glyphMap> = {
                describe: "message-square",
                chat: "message-circle",
                photographer: "aperture",
                huntfind: "search",
                peoplecounter: "users",
                detectall: "grid",
                colormatcher: "sliders",
                tracking: "target",
                ptz: "move",
              };
              return (
                <ToolHeader
                  title={toolTitles[toolId] || "Tool"}
                  icon={toolIcons[toolId] || "tool"}
                  iconColor={badge.color}
                  badge={badge.label}
                  badgeColor={badge.color}
                  onBack={closeTool}
                  onInfoPress={() => showToolInfo(toolId)}
                />
              );
            })()}

            <KeyboardAwareScrollViewCompat
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
                  onSetupApiKey={handleSetupApiKey}
                />
              ) : activeTool === "chat" ? (
                <CameraChat
                  camera={camera}
                  apiKey={appSettings?.moondreamApiKey || ""}
                  isConnected={true}
                  getFrame={captureFrameForAI}
                  ptzConnected={ptzConnected}
                  onConnectPtz={camera ? async () => {
                    const result = await testCameraConnection(camera);
                    if (result.success) {
                      handlePtzConnected(true);
                      setPtzStreamMode("snapshot");
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } else {
                      Alert.alert("Connection Failed", result.error || "Could not connect to camera");
                    }
                  } : undefined}
                />
              ) : activeTool === "photographer" ? (
                <AIPhotographer
                  hasApiKey={Boolean(appSettings?.moondreamApiKey)}
                  apiKey={appSettings?.moondreamApiKey || ""}
                  getFrame={captureFrameForAI}
                  onCapture={(photo) => {
                    console.log("[AIPhotographer] Captured:", photo.trigger);
                  }}
                  onDetection={(result) => {
                    if (aiDetectionTimeoutRef.current) {
                      clearTimeout(aiDetectionTimeoutRef.current);
                    }
                    setAiDetection(result);
                    if (!result.box) {
                      setAiFlashEffect(true);
                      setTimeout(() => setAiFlashEffect(false), 300);
                    }
                    aiDetectionTimeoutRef.current = setTimeout(() => {
                      setAiDetection(null);
                    }, 2500);
                  }}
                />
              ) : activeTool === "tracking" ? (
                <View>
                  <PersonManager
                    onSelectPerson={(person) => {
                      if (person && trackingControllerRef.current) {
                        trackingControllerRef.current.setTargetIdentity(person.embedding);
                        setSelectedEmbedding(person.embedding);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } else if (trackingControllerRef.current) {
                        trackingControllerRef.current.clearTargetIdentity();
                        setSelectedEmbedding(null);
                      }
                    }}
                  />
                  
                  <ModelSelector
                    selectedModel={selectedModel}
                    isTracking={isTracking}
                    onModelChange={handleModelChange}
                    onToggleTracking={handleToggleTracking}
                    onShowInfo={handleShowModelInfo}
                    camera={camera}
                    isConnected={ptzConnected}
                    onCameraConnected={handlePtzConnected}
                    onFrameUpdate={handlePtzFrameUpdate}
                    onStreamModeChange={setPtzStreamMode}
                    customObject={customObject}
                    onCustomObjectChange={handleCustomObjectChange}
                    trackingMode={localTrackingSettings.trackingMode}
                    onTrackingModeChange={(mode) => handleUpdateTrackingSetting("trackingMode", mode)}
                    trackingState={autoTrackingState}
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
                          {[2, 4, 8].map((speed) => (
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
                                {speed === 2 ? "Slow" : speed === 4 ? "Med" : "Fast"}
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
              ) : activeTool === "huntfind" ? (
                <HuntAndFind
                  camera={camera}
                  cameras={allCameras}
                  apiKey={appSettings?.moondreamApiKey || ""}
                  hasApiKey={Boolean(appSettings?.moondreamApiKey)}
                  isConnected={ptzConnected}
                  streamMode={ptzStreamMode}
                  onCameraSelect={setCamera}
                  onConnect={handlePtzConnected}
                  onStreamModeChange={setPtzStreamMode}
                />
              ) : activeTool === "peoplecounter" ? (
                <PeopleCounter
                  getFrame={captureFrameForAI}
                  isConnected={ptzConnected || (permission?.granted ?? false)}
                />
              ) : activeTool === "detectall" ? (
                <DetectAll
                  isConnected={ptzConnected || (permission?.granted ?? false)}
                  getFrame={captureFrameForAI}
                  onDetectionsChange={setDetectAllDetections}
                />
              ) : activeTool === "colormatcher" ? (
                <ColorMatcher
                  camera={camera}
                  isConnected={ptzConnected}
                  getFrame={captureFrameForAI}
                />
              ) : activeTool === "ptz" ? (
                <View>
                  {!ptzConnected && camera ? (
                    <View style={styles.ptzConnectSection}>
                      <Text style={[styles.ptzConnectLabel, { color: theme.text }]}>
                        {camera.name}
                      </Text>
                      <Text style={[styles.ptzConnectSubLabel, { color: theme.textSecondary }]}>
                        {camera.ipAddress}:{camera.rtspPort}
                      </Text>
                      <Pressable
                        onPress={async () => {
                          const result = await testCameraConnection(camera);
                          if (result.success) {
                            handlePtzConnected(true);
                            setPtzStreamMode("snapshot");
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          } else {
                            Alert.alert("Connection Failed", result.error || "Could not connect to camera");
                          }
                        }}
                        style={[styles.ptzConnectButton, { backgroundColor: theme.primary }]}
                      >
                        <Feather name="wifi" size={16} color="#FFF" />
                        <Text style={styles.ptzConnectButtonText}>Connect</Text>
                      </Pressable>
                    </View>
                  ) : !camera ? (
                    <View style={[styles.noCameraMessage, { backgroundColor: theme.backgroundSecondary }]}>
                      <Feather name="alert-circle" size={20} color={theme.warning} />
                      <Text style={[styles.noCameraText, { color: theme.textSecondary }]}>
                        No camera configured. Add one in Settings.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.ptzConnectedSection}>
                      <View style={[styles.connectedBadge, { backgroundColor: theme.success + "20" }]}>
                        <View style={[styles.connectedDot, { backgroundColor: theme.success }]} />
                        <Text style={[styles.connectedText, { color: theme.success }]}>
                          {camera.name}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          handlePtzConnected(false);
                          setPtzStreamMode("snapshot");
                        }}
                        style={[styles.ptzDisconnectButton, { backgroundColor: theme.error }]}
                      >
                        <Feather name="power" size={14} color="#FFF" />
                      </Pressable>
                    </View>
                  )}
                  
                  <PTZJoystick
                    onMove={handlePTZMove}
                    onZoom={handleZoom}
                    onQuickAction={handleQuickAction}
                    onFineTune={handleFineTune}
                    currentZoom={currentZoom}
                  />
                </View>
              ) : null}
            </KeyboardAwareScrollViewCompat>
          </View>
        )}
      </View>

      <ToolInfoModal
        visible={toolInfoModalVisible}
        onClose={() => setToolInfoModalVisible(false)}
        toolInfo={selectedToolInfo}
      />
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
  detectionInfoContainer: {
    position: "absolute",
    bottom: Spacing.md,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  detectionInfoBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  detectionInfoText: {
    color: "#000",
    fontSize: 11,
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
  cameraSwitchButton: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  cameraSwitchText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
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
  videoSection: {
    backgroundColor: "#000",
  },
  sheetArea: {
    flex: 1,
  },
  toolsArea: {
    flex: 1,
  },
  toolListScroll: {
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
  apiKeyHintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  apiKeyHintText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FF9500",
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
  ptzConnectSection: {
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  ptzConnectLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: 2,
  },
  ptzConnectSubLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.md,
  },
  ptzConnectButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ptzConnectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  ptzConnectButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  ptzConnectedSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  ptzDisconnectButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  aiDetectionOverlay: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
  },
  aiDetectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  aiDetectionText: {
    color: "#fff",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  aiFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderRadius: BorderRadius.md,
  },
  zoomableContent: {
    width: "100%",
    height: "100%",
  },
});
