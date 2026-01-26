import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { useScanEngine } from "@/hooks/useScanEngine";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { CameraProfile } from "@/lib/storage";
import {
  RoomScan,
  DetectedObject,
  ObjectImage,
  ScanPosition,
  ScanPattern,
  ZoomRoundsConfig,
  getRoomScans,
  deleteRoomScan,
  saveRoomScan,
  CATEGORY_INFO,
  ObjectCategory,
  getObjectsByImportance,
  findObjectsByName,
  SCAN_PATTERNS,
  DEFAULT_ZOOM_ROUNDS_CONFIG,
  toggleObjectStarred,
  estimateScanTime,
} from "@/lib/huntAndFind";
import { 
  recallPresetFromCamera, 
  testCameraConnection,
  sendZoomViscaCommand,
  savePresetToCamera,
  fetchCameraFrame,
  sendHomeViscaCommand,
} from "@/lib/camera";
import { StreamMode } from "@/components/ModelSelector";
import { enhanceStarredObject, DetectionMode, isYOLOAvailable, YOLO_CLASSES } from "@/lib/scanAnalysis";
import { useLocalLLM } from "@/lib/localLLM";
import { centerObjectWithVision, CenteringProgress } from "@/lib/visionCentering";
import { isVisionAvailable } from "vision-tracking";

type ViewMode = "home" | "scanning" | "analyzing" | "zooming" | "results" | "history";

interface HuntAndFindProps {
  camera: CameraProfile | null;
  cameras: CameraProfile[];
  apiKey: string;
  hasApiKey: boolean;
  isConnected: boolean;
  streamMode: StreamMode;
  onCameraSelect?: (camera: CameraProfile) => void;
  onConnect: (connected: boolean) => void;
  onStreamModeChange: (mode: StreamMode) => void;
}

export function HuntAndFind({ 
  camera, 
  cameras, 
  apiKey, 
  hasApiKey, 
  isConnected,
  streamMode,
  onCameraSelect,
  onConnect,
  onStreamModeChange,
}: HuntAndFindProps) {
  const { theme } = useTheme();
  const scanEngine = useScanEngine(camera);
  const localLLM = useLocalLLM();
  
  const [viewMode, setViewMode] = useState<ViewMode>("home");

  const [previousScans, setPreviousScans] = useState<RoomScan[]>([]);
  const [selectedScan, setSelectedScan] = useState<RoomScan | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  const [recallingPresetSlot, setRecallingPresetSlot] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<ScanPattern>(SCAN_PATTERNS[1]);
  const [showPatternSelector, setShowPatternSelector] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<{ uri: string; index: number } | null>(null);
  const [isCreatingZoomPresets, setIsCreatingZoomPresets] = useState(false);
  const [zoomRoundsCount, setZoomRoundsCount] = useState(5);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isGoingHome, setIsGoingHome] = useState(false);
  const [isCentering, setIsCentering] = useState(false);
  const [centeringProgress, setCenteringProgress] = useState<CenteringProgress | null>(null);
  const [renamingScan, setRenamingScan] = useState<RoomScan | null>(null);
  const [renameText, setRenameText] = useState("");
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("moondream");
  const [yoloAvailable, setYoloAvailable] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPreviousScans();
    checkYOLOAvailability();
  }, []);

  const checkYOLOAvailability = async () => {
    const available = await isYOLOAvailable();
    setYoloAvailable(available);
    console.log("[HuntAndFind] YOLO available:", available);
  };

  useEffect(() => {
    if (scanEngine.state.status === "scanning") {
      setViewMode("scanning");
    } else if (scanEngine.state.status === "analyzing") {
      setViewMode("analyzing");
    } else if (scanEngine.state.status === "zooming") {
      setViewMode("zooming");
    } else if (scanEngine.state.status === "completed" && scanEngine.state.scan) {
      setSelectedScan(scanEngine.state.scan);
      setViewMode("results");
      loadPreviousScans();
    } else if (scanEngine.state.status === "error") {
      Alert.alert("Scan Error", scanEngine.state.error || "Unknown error occurred");
    }
  }, [scanEngine.state.status, scanEngine.state.scan]);

  useEffect(() => {
    const isActive = ["scanning", "analyzing", "zooming"].includes(scanEngine.state.status);
    
    if (isActive && !timerRef.current) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (!isActive && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scanEngine.state.status]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDuration = (ms: number | null): string => {
    if (!ms) return "--";
    const seconds = Math.round(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const loadPreviousScans = async () => {
    const scans = await getRoomScans();
    setPreviousScans(scans);
  };

  const handleStartScan = async () => {
    if (!camera) {
      Alert.alert("No Camera", "Please connect a PTZ camera first.");
      return;
    }
    if (detectionMode === "moondream" && !hasApiKey) {
      Alert.alert("API Key Required", "Please add your Moondream API key in Settings, or use YOLO mode.");
      return;
    }
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const modeLabel = detectionMode === "yolo" ? "YOLO" : "";
    const name = `${modeLabel ? modeLabel + " " : ""}Scan ${now.toLocaleDateString()} ${timeStr}`;
    
    scanEngine.setConfig({
      speed: selectedPattern.speed,
      panMsPerDegree: selectedPattern.panMsPerDegree,
      tiltMsPerDegree: selectedPattern.tiltMsPerDegree,
    });

    const zoomRoundsConfig: ZoomRoundsConfig = {
      ...DEFAULT_ZOOM_ROUNDS_CONFIG,
      topObjectCount: zoomRoundsCount,
    };
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    await scanEngine.runFullScanWithAnalysis(name, apiKey, selectedPattern.gridConfig, zoomRoundsConfig, localLLM.rankObjects, detectionMode);
  };

  const handleCancelScan = () => {
    Alert.alert(
      "Cancel Scan",
      "Are you sure you want to cancel? Progress will be saved.",
      [
        { text: "Continue Scanning", style: "cancel" },
        { 
          text: "Cancel", 
          style: "destructive",
          onPress: () => {
            scanEngine.cancelScan();
            setViewMode("home");
          }
        },
      ]
    );
  };

  const handlePauseScan = () => {
    if (scanEngine.state.status === "paused") {
      scanEngine.unpauseScan();
    } else {
      scanEngine.pauseScan();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSelectScan = (scan: RoomScan) => {
    setSelectedScan(scan);
    setViewMode("results");
    Haptics.selectionAsync();
  };

  const handleScanActions = (scan: RoomScan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      scan.name,
      undefined,
      [
        {
          text: "Rename",
          onPress: () => {
            setRenamingScan(scan);
            setRenameText(scan.name);
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDeleteScan(scan),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const confirmDeleteScan = (scan: RoomScan) => {
    Alert.alert(
      "Delete Scan",
      `Delete "${scan.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteRoomScan(scan.id);
            setPreviousScans(prev => prev.filter(s => s.id !== scan.id));
            if (selectedScan?.id === scan.id) {
              setSelectedScan(null);
              setViewMode("home");
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleRenameScan = async () => {
    if (!renamingScan || !renameText.trim()) return;
    
    const updatedScan = { ...renamingScan, name: renameText.trim() };
    await saveRoomScan(updatedScan);
    
    setPreviousScans(prev => prev.map(s => s.id === updatedScan.id ? updatedScan : s));
    if (selectedScan?.id === updatedScan.id) {
      setSelectedScan(updatedScan);
    }
    
    setRenamingScan(null);
    setRenameText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleFindObject = async (object: DetectedObject) => {
    if (!camera) return;
    
    setRecallingPresetSlot(object.presetSlot);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await recallPresetFromCamera(camera, object.presetSlot);
      setSelectedObject(null);
    } catch (err) {
      console.error("Failed to recall preset:", err);
      Alert.alert("Error", "Failed to move camera to object location.");
    } finally {
      setRecallingPresetSlot(null);
    }
  };

  const handleConnect = async () => {
    if (!camera) return;
    setIsConnecting(true);
    
    try {
      const result = await testCameraConnection(camera);
      if (result.success) {
        onConnect(true);
        onStreamModeChange("snapshot");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Connection Failed", result.error || "Could not connect to camera");
      }
    } catch (err) {
      Alert.alert("Connection Failed", "Could not connect to camera");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onConnect(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleGoHome = async () => {
    if (!camera || isGoingHome) return;
    setIsGoingHome(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await sendHomeViscaCommand(camera);
    } catch (err) {
      console.error("Failed to go home:", err);
    } finally {
      setIsGoingHome(false);
    }
  };

  const handleFindAndCenter = async (object: DetectedObject) => {
    if (!camera || !isConnected || isCentering) return;
    
    setIsCentering(true);
    setCenteringProgress(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const boundingBox = object.boundingBox || null;
      
      const result = await centerObjectWithVision(
        camera,
        object.presetSlot,
        boundingBox,
        (progress) => {
          setCenteringProgress(progress);
        },
        {},
        object.name,
        apiKey
      );
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        console.log("Centering completed:", result.error || "Object centered as best as possible");
      }
    } catch (err) {
      console.error("Centering failed:", err);
    } finally {
      setIsCentering(false);
      setCenteringProgress(null);
    }
  };

  const handleCameraChange = (selectedCamera: CameraProfile) => {
    setShowCameraSelector(false);
    onConnect(false);
    onCameraSelect?.(selectedCamera);
    Haptics.selectionAsync();
  };

  const getObjectPositionImage = (object: DetectedObject): string | null => {
    if (!selectedScan) return null;
    const position = selectedScan.positions.find(p => p.id === object.positionId);
    return position?.imageUri || null;
  };

  const handleToggleStar = async (object: DetectedObject) => {
    if (!selectedScan) return;
    
    const updatedScan = toggleObjectStarred(selectedScan, object.id);
    await saveRoomScan(updatedScan);
    setSelectedScan(updatedScan);
    
    const updatedObject = updatedScan.objects.find(o => o.id === object.id);
    if (updatedObject) {
      setSelectedObject(updatedObject);
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEnhanceObject = async (object: DetectedObject) => {
    if (!camera || !selectedScan || isEnhancing) return;
    
    setIsEnhancing(true);
    setEnhanceProgress("Starting enhancement...");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const updatedScan = await enhanceStarredObject(
        camera,
        apiKey,
        selectedScan,
        object,
        {
          onProgress: (msg) => setEnhanceProgress(msg),
          onZoomLevel: (level) => setEnhanceProgress(`Capturing ${level}...`),
        }
      );
      
      await saveRoomScan(updatedScan);
      setSelectedScan(updatedScan);
      
      const updatedObject = updatedScan.objects.find(o => o.id === object.id);
      if (updatedObject) {
        setSelectedObject(updatedObject);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Enhancement failed:", err);
      Alert.alert("Error", "Failed to enhance object");
    } finally {
      setIsEnhancing(false);
      setEnhanceProgress("");
    }
  };

  const handleZoomLevelRecall = async (object: DetectedObject, level: "wide" | "medium" | "close") => {
    if (!camera) return;
    
    const targetImage = object.images?.find(img => img.zoomLevel === level);
    const targetSlot = targetImage?.presetSlot || object.presetSlot;
    setRecallingPresetSlot(targetSlot);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (targetImage) {
        await recallPresetFromCamera(camera, targetImage.presetSlot);
      } else {
        await recallPresetFromCamera(camera, object.presetSlot);
        if (level === "medium") {
          await sendZoomViscaCommand(camera, "in", 5);
          await new Promise(r => setTimeout(r, 1500));
          await sendZoomViscaCommand(camera, "stop");
        } else if (level === "close") {
          await sendZoomViscaCommand(camera, "in", 7);
          await new Promise(r => setTimeout(r, 3000));
          await sendZoomViscaCommand(camera, "stop");
        }
      }
    } catch (err) {
      console.error("Failed to recall zoom preset:", err);
      Alert.alert("Error", "Failed to move camera.");
    } finally {
      setRecallingPresetSlot(null);
    }
  };

  const handleCreateZoomPresets = async (object: DetectedObject) => {
    if (!camera || !selectedScan) return;
    
    setIsCreatingZoomPresets(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const baseSlot = object.presetSlot;
      const mediumSlot = baseSlot + 50;
      const closeSlot = baseSlot + 100;
      
      await recallPresetFromCamera(camera, baseSlot);
      await new Promise(r => setTimeout(r, 2000));
      
      const wideFrame = await fetchCameraFrame(camera);
      
      await sendZoomViscaCommand(camera, "in", 5);
      await new Promise(r => setTimeout(r, 1500));
      await sendZoomViscaCommand(camera, "stop");
      await new Promise(r => setTimeout(r, 500));
      await savePresetToCamera(camera, mediumSlot);
      const mediumImage = await fetchCameraFrame(camera);
      
      await sendZoomViscaCommand(camera, "in", 7);
      await new Promise(r => setTimeout(r, 2000));
      await sendZoomViscaCommand(camera, "stop");
      await new Promise(r => setTimeout(r, 500));
      await savePresetToCamera(camera, closeSlot);
      const closeImage = await fetchCameraFrame(camera);

      const now = new Date().toISOString();
      const newImages: ObjectImage[] = [
        { presetSlot: baseSlot, imageUri: wideFrame || "", zoomLevel: "wide", capturedAt: now },
        { presetSlot: mediumSlot, imageUri: mediumImage || "", zoomLevel: "medium", capturedAt: now },
        { presetSlot: closeSlot, imageUri: closeImage || "", zoomLevel: "close", capturedAt: now },
      ];
      
      const updatedObject: DetectedObject = {
        ...object,
        images: newImages,
        zoomRoundCompleted: true,
      };
      
      const updatedScan: RoomScan = {
        ...selectedScan,
        objects: selectedScan.objects.map(o => 
          o.id === object.id ? updatedObject : o
        ),
      };
      
      await saveRoomScan(updatedScan);
      setSelectedScan(updatedScan);
      setSelectedObject(updatedObject);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Zoom presets created! You can now quickly jump to Wide, Medium, or Close-up views.");
      
    } catch (err) {
      console.error("Failed to create zoom presets:", err);
      Alert.alert("Error", "Failed to create zoom presets.");
    } finally {
      setIsCreatingZoomPresets(false);
    }
  };

  const getFilteredObjects = useCallback(() => {
    if (!selectedScan) return [];
    
    if (searchQuery.trim()) {
      return findObjectsByName(selectedScan, searchQuery);
    }
    
    return getObjectsByImportance(selectedScan, 1);
  }, [selectedScan, searchQuery]);

  const renderPositionGrid = () => {
    const scan = scanEngine.state.scan;
    if (!scan) return null;
    
    const positions = scan.positions;
    const columns = scan.gridConfig.columns;
    
    return (
      <View style={styles.positionGrid}>
        {positions.map((pos, index) => {
          const isActive = scanEngine.state.currentPosition?.id === pos.id;
          const isCaptured = pos.status === "captured" || pos.status === "analyzed";
          const isAnalyzed = pos.status === "analyzed";
          
          return (
            <View
              key={pos.id}
              style={[
                styles.positionCell,
                { 
                  width: `${100 / columns - 2}%`,
                  backgroundColor: isActive 
                    ? theme.primary 
                    : isCaptured 
                      ? theme.success + "40"
                      : theme.backgroundDefault,
                  borderColor: isActive ? theme.primary : theme.backgroundSecondary,
                },
              ]}
            >
              {pos.imageUri ? (
                <Image
                  source={{ uri: pos.imageUri }}
                  style={styles.positionImage}
                  contentFit="cover"
                />
              ) : (
                <Feather 
                  name={isActive ? "radio" : "square"} 
                  size={16} 
                  color={isActive ? "#fff" : theme.textSecondary} 
                />
              )}
              {isAnalyzed && (
                <View style={[styles.positionBadge, { backgroundColor: theme.success }]}>
                  <Feather name="check" size={8} color="#fff" />
                </View>
              )}
              <Text style={[
                styles.positionLabel, 
                { color: isActive ? "#fff" : theme.textSecondary }
              ]}>
                {index + 1}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderObjectCard = ({ item }: { item: DetectedObject }) => {
    const categoryInfo = CATEGORY_INFO[item.category];
    
    return (
      <Pressable
        onPress={() => setSelectedObject(item)}
        style={({ pressed }) => [
          styles.objectCard,
          { 
            backgroundColor: theme.backgroundDefault,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.objectIcon, { backgroundColor: categoryInfo.color + "20" }]}>
          <Feather name={categoryInfo.icon as any} size={18} color={categoryInfo.color} />
        </View>
        <View style={styles.objectInfo}>
          <Text style={[styles.objectName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.objectCategory, { color: theme.textSecondary }]}>
            {categoryInfo.label}
          </Text>
        </View>
        {item.starred && (
          <Feather name="star" size={14} color={theme.warning} />
        )}
        <View style={[styles.importanceBadge, { 
          backgroundColor: (item.images?.length || 0) > 0 
            ? theme.success + "20" 
            : theme.textSecondary + "20"
        }]}>
          <Feather 
            name="image" 
            size={10} 
            color={(item.images?.length || 0) > 0 ? theme.success : theme.textSecondary} 
            style={{ marginRight: 2 }}
          />
          <Text style={[styles.importanceText, { 
            color: (item.images?.length || 0) > 0 
              ? theme.success 
              : theme.textSecondary 
          }]}>
            {(item.images?.length || 0) + 1}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={theme.textSecondary} />
      </Pressable>
    );
  };

  const renderScanCard = ({ item }: { item: RoomScan }) => (
    <Pressable
      onPress={() => handleSelectScan(item)}
      onLongPress={() => handleScanActions(item)}
      style={({ pressed }) => [
        styles.scanCard,
        { 
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.scanCardContent}>
        {item.positions[0]?.imageUri ? (
          <Image
            source={{ uri: item.positions[0].imageUri }}
            style={styles.scanThumbnail}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.scanThumbnailPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="grid" size={20} color={theme.textSecondary} />
          </View>
        )}
        <View style={styles.scanInfo}>
          <Text style={[styles.scanName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.scanMeta, { color: theme.textSecondary }]}>
            {item.objects.length} objects • {item.positions.length} positions
            {item.timing?.totalDurationMs ? ` • ${formatDuration(item.timing.totalDurationMs)}` : ""}
          </Text>
          <View style={[
            styles.scanStatusBadge, 
            { backgroundColor: item.status === "completed" ? theme.success + "20" : theme.warning + "20" }
          ]}>
            <Text style={[
              styles.scanStatusText, 
              { color: item.status === "completed" ? theme.success : theme.warning }
            ]}>
              {item.status === "completed" ? "Complete" : item.status}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (viewMode === "scanning" || viewMode === "analyzing" || viewMode === "zooming") {
    const progress = scanEngine.state.progress;
    const zoomProgress = scanEngine.state.zoomProgress;
    const isAnalyzing = viewMode === "analyzing";
    const isZooming = viewMode === "zooming";
    
    const getProgressTitle = () => {
      if (isZooming) return "Zoom Rounds...";
      if (isAnalyzing) return "Analyzing Objects...";
      return "Scanning Room...";
    };

    const getProgressSubtitle = () => {
      if (isZooming) {
        if (zoomProgress.stepDescription) {
          const objectText = zoomProgress.currentObjectName 
            ? `${zoomProgress.currentObjectName}: ` 
            : "";
          const iterText = zoomProgress.centeringIteration && zoomProgress.centeringIteration > 0 
            ? ` (iter ${zoomProgress.centeringIteration})` 
            : "";
          return `${objectText}${zoomProgress.stepDescription}${iterText}`;
        }
        return `Object ${zoomProgress.currentObject + 1} of ${zoomProgress.totalObjects}`;
      }
      if (isAnalyzing) {
        return `Processing position ${progress.analyzed + 1} of ${progress.total}`;
      }
      return `Position ${progress.captured} of ${progress.total}`;
    };

    const getProgressPercent = () => {
      if (isZooming) {
        return zoomProgress.totalSteps > 0 
          ? Math.round((zoomProgress.currentStep / zoomProgress.totalSteps) * 100) 
          : 0;
      }
      return progress.percentComplete;
    };
    
    return (
      <View style={styles.container}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: theme.text }]}>
            {getProgressTitle()}
          </Text>
          <Text style={[styles.progressSubtitle, { color: theme.textSecondary }]}>
            {getProgressSubtitle()}
          </Text>
        </View>

        <View style={[styles.progressBarContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Animated.View 
            style={[
              styles.progressBar, 
              { 
                backgroundColor: isZooming ? theme.warning : theme.primary,
                width: `${getProgressPercent()}%`,
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressPercent, { color: isZooming ? theme.warning : theme.primary }]}>
          {getProgressPercent()}%
        </Text>

        {!isAnalyzing && !isZooming && renderPositionGrid()}

        {scanEngine.state.isMoving && (
          <Animated.View entering={FadeIn} style={styles.statusRow}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              Moving camera...
            </Text>
          </Animated.View>
        )}

        {scanEngine.state.isCapturing && (
          <Animated.View entering={FadeIn} style={styles.statusRow}>
            <Feather name="camera" size={16} color={theme.success} />
            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
              Capturing frame...
            </Text>
          </Animated.View>
        )}

        <View style={[styles.elapsedTimeContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="clock" size={16} color={theme.textSecondary} />
          <Text style={[styles.elapsedTimeText, { color: theme.text }]}>
            {formatTime(elapsedTime)}
          </Text>
          <Text style={[styles.elapsedTimeLabel, { color: theme.textSecondary }]}>
            elapsed
          </Text>
        </View>

        <View style={styles.scanControls}>
          {!isAnalyzing && (
            <Pressable
              onPress={handlePauseScan}
              style={[styles.controlButton, { backgroundColor: theme.backgroundDefault }]}
            >
              <Feather 
                name={scanEngine.state.status === "paused" ? "play" : "pause"} 
                size={20} 
                color={theme.text} 
              />
            </Pressable>
          )}
          <Pressable
            onPress={handleCancelScan}
            style={[styles.controlButton, { backgroundColor: theme.error + "20" }]}
          >
            <Feather name="x" size={20} color={theme.error} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (viewMode === "results" && selectedScan) {
    const filteredObjects = getFilteredObjects();
    
    return (
      <View style={styles.container}>
        <View style={styles.resultsHeader}>
          <Pressable onPress={() => setViewMode("home")} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={theme.primary} />
          </Pressable>
          <View style={styles.resultsHeaderText}>
            <Text style={[styles.resultsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedScan.name}
            </Text>
            <Text style={[styles.resultsSubtitle, { color: theme.textSecondary }]}>
              {selectedScan.objects.length} objects found
            </Text>
          </View>
        </View>

        {selectedScan.summary && (
          <View style={[styles.summaryBox, { backgroundColor: theme.primary + "10" }]}>
            <Feather name="info" size={14} color={theme.primary} />
            <Text style={[styles.summaryText, { color: theme.text }]}>
              {selectedScan.summary}
            </Text>
          </View>
        )}

        {selectedScan.timing && (
          <View style={[styles.timingStatsContainer, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.timingStatsRow}>
              <View style={styles.timingStat}>
                <Text style={[styles.timingStatValue, { color: theme.text }]}>
                  {formatDuration(selectedScan.timing.totalDurationMs)}
                </Text>
                <Text style={[styles.timingStatLabel, { color: theme.textSecondary }]}>
                  Total Time
                </Text>
              </View>
              <View style={styles.timingStat}>
                <Text style={[styles.timingStatValue, { color: theme.text }]}>
                  {formatDuration(selectedScan.timing.scanningPhaseDurationMs)}
                </Text>
                <Text style={[styles.timingStatLabel, { color: theme.textSecondary }]}>
                  Scanning
                </Text>
              </View>
              <View style={styles.timingStat}>
                <Text style={[styles.timingStatValue, { color: theme.text }]}>
                  {formatDuration(selectedScan.timing.analysisPhaseDurationMs)}
                </Text>
                <Text style={[styles.timingStatLabel, { color: theme.textSecondary }]}>
                  Analysis
                </Text>
              </View>
              {selectedScan.timing.zoomPhaseDurationMs && (
                <View style={styles.timingStat}>
                  <Text style={[styles.timingStatValue, { color: theme.text }]}>
                    {formatDuration(selectedScan.timing.zoomPhaseDurationMs)}
                  </Text>
                  <Text style={[styles.timingStatLabel, { color: theme.textSecondary }]}>
                    Zoom
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.gallerySection}>
          <View style={styles.galleryGrid}>
            {selectedScan.positions.map((pos, index) => (
              <Pressable
                key={pos.id}
                onPress={async () => {
                  if (camera && isConnected && pos.imageUri) {
                    setRecallingPresetSlot(pos.presetSlot);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    try {
                      await recallPresetFromCamera(camera, pos.presetSlot);
                    } catch (err) {
                      console.error("Failed to recall preset:", err);
                    } finally {
                      setRecallingPresetSlot(null);
                    }
                  }
                }}
                onLongPress={() => {
                  if (pos.imageUri) {
                    setSelectedGalleryImage({ uri: pos.imageUri, index });
                  }
                }}
                style={[
                  styles.galleryCell,
                  { 
                    backgroundColor: theme.backgroundSecondary,
                    opacity: recallingPresetSlot === pos.presetSlot ? 0.5 : 1,
                  },
                ]}
              >
                {pos.imageUri ? (
                  <Image
                    source={{ uri: pos.imageUri }}
                    style={styles.galleryCellImage}
                    contentFit="cover"
                  />
                ) : (
                  <Feather name="image" size={16} color={theme.textSecondary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

{selectedObject ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.objectDetailPanel}>
            <View style={styles.detailPanelHeader}>
              <Pressable 
                onPress={() => setSelectedObject(null)} 
                style={styles.detailBackButton}
              >
                <Feather name="arrow-left" size={20} color={theme.primary} />
                <Text style={[styles.detailBackText, { color: theme.primary }]}>Objects</Text>
              </Pressable>
              <Pressable
                onPress={() => handleToggleStar(selectedObject)}
                style={[
                  styles.detailStarButton,
                  { backgroundColor: selectedObject.starred ? theme.warning + "20" : theme.backgroundSecondary },
                ]}
              >
                <Feather 
                  name="star" 
                  size={18} 
                  color={selectedObject.starred ? theme.warning : theme.textSecondary} 
                />
              </Pressable>
            </View>

            <View style={[styles.detailInfoRow, { backgroundColor: theme.backgroundDefault }]}>
              <View style={[
                styles.detailIcon, 
                { backgroundColor: CATEGORY_INFO[selectedObject.category].color + "20" }
              ]}>
                <Feather 
                  name={CATEGORY_INFO[selectedObject.category].icon as any} 
                  size={18} 
                  color={CATEGORY_INFO[selectedObject.category].color} 
                />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={[styles.detailName, { color: theme.text }]} numberOfLines={1}>
                  {selectedObject.name}
                </Text>
                <Text style={[styles.detailMeta, { color: theme.textSecondary }]}>
                  {CATEGORY_INFO[selectedObject.category].label} • {selectedObject.relativeLocation.replace("-", " ")} • Preset #{selectedObject.presetSlot}
                </Text>
              </View>
              <View style={[styles.detailImportance, { 
                backgroundColor: selectedObject.importance >= 8 
                  ? theme.error + "20" 
                  : selectedObject.importance >= 5 
                    ? theme.warning + "20" 
                    : theme.textSecondary + "20"
              }]}>
                <Text style={[styles.detailImportanceText, { 
                  color: selectedObject.importance >= 8 
                    ? theme.error 
                    : selectedObject.importance >= 5 
                      ? theme.warning 
                      : theme.textSecondary 
                }]}>
                  {selectedObject.importance}
                </Text>
              </View>
            </View>

            {selectedObject.importanceReason && (
              <Text style={[styles.detailReason, { color: theme.textSecondary }]}>
                {selectedObject.importanceReason}
              </Text>
            )}

            <Text style={[styles.zoomLabel, { color: theme.text }]}>
              Tap to move camera:
            </Text>
            
            <View style={styles.objectImagesGrid}>
              {(selectedObject.images && selectedObject.images.length > 0 
                ? selectedObject.images 
                : [{ 
                    presetSlot: selectedObject.presetSlot, 
                    imageUri: getObjectPositionImage(selectedObject) || "",
                    zoomLevel: "wide" as const,
                    capturedAt: selectedObject.detectedAt,
                  }]
              ).map((img, index) => (
                <Pressable
                  key={`${img.presetSlot}-${index}`}
                  onPress={async () => {
                    if (camera && isConnected) {
                      setRecallingPresetSlot(img.presetSlot);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      try {
                        await recallPresetFromCamera(camera, img.presetSlot);
                      } catch (err) {
                        console.error("Failed to recall preset:", err);
                      } finally {
                        setRecallingPresetSlot(null);
                      }
                    }
                  }}
                  disabled={recallingPresetSlot !== null || !camera || !isConnected}
                  style={[
                    styles.objectImageGridCell,
                    { 
                      backgroundColor: theme.backgroundSecondary,
                      opacity: recallingPresetSlot === img.presetSlot ? 0.5 : 1,
                    },
                  ]}
                >
                  {img.imageUri ? (
                    <Image
                      source={{ uri: img.imageUri }}
                      style={styles.objectImageGridImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.objectImageGridPlaceholder}>
                      <Feather name="image" size={20} color={theme.textSecondary} />
                    </View>
                  )}
                  <View style={[
                    styles.objectImageGridLabel, 
                    { 
                      backgroundColor: img.zoomLevel === "wide" 
                        ? theme.success 
                        : img.zoomLevel === "medium" 
                          ? theme.primary 
                          : img.zoomLevel === "tight"
                            ? "#9B59B6"
                            : theme.warning 
                    }
                  ]}>
                    <Text style={styles.objectImageGridLabelText}>
                      {img.zoomLevel.charAt(0).toUpperCase() + img.zoomLevel.slice(1)}
                    </Text>
                    <Text style={styles.objectImageGridPreset}>#{img.presetSlot}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {(!selectedObject.images || selectedObject.images.length <= 1) && !selectedObject.zoomRoundCompleted && (
              <View style={[styles.noZoomImagesNote, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="info" size={14} color={theme.textSecondary} />
                <Text style={[styles.noZoomImagesText, { color: theme.textSecondary }]}>
                  Zoom images will be captured during Zoom Rounds
                </Text>
              </View>
            )}

            {isVisionAvailable && (
              <View style={styles.actionButtonsRow}>
                {isCentering ? (
                  <View style={[styles.centeringButton, { backgroundColor: theme.backgroundSecondary }]}>
                    <ActivityIndicator 
                      size="small" 
                      color={centeringProgress?.backend === "moondream" ? theme.primary : theme.success} 
                    />
                    <View style={styles.centeringProgressContainer}>
                      <Text style={[styles.centeringProgressText, { color: theme.text }]}>
                        {centeringProgress?.message || "Centering..."}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {centeringProgress?.backend && (
                          <Text style={[styles.centeringProgressDetail, { 
                            color: centeringProgress.backend === "moondream" ? theme.primary : theme.success,
                            fontWeight: "600",
                          }]}>
                            {centeringProgress.backend === "moondream" ? "AI" : 
                             centeringProgress.backend === "coreml" ? "Vision" : "Tracking"}
                          </Text>
                        )}
                        {centeringProgress && (
                          <Text style={[styles.centeringProgressDetail, { color: theme.textSecondary }]}>
                            {centeringProgress.iteration}/{centeringProgress.maxIterations}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleFindAndCenter(selectedObject)}
                    disabled={!camera || !isConnected || recallingPresetSlot !== null}
                    style={[
                      styles.centeringButton,
                      { 
                        backgroundColor: theme.success,
                        opacity: !camera || !isConnected || recallingPresetSlot !== null ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Feather name="crosshair" size={16} color="#fff" />
                    <Text style={[styles.centeringButtonText, { color: "#fff" }]}>
                      Find & Center
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {isEnhancing ? (
              <View style={[styles.enhanceButton, { backgroundColor: theme.backgroundSecondary }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.enhanceButtonText, { color: theme.textSecondary }]}>
                  {enhanceProgress || "Enhancing..."}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => handleEnhanceObject(selectedObject)}
                disabled={!camera || !isConnected || isCentering}
                style={[
                  styles.enhanceButton,
                  { 
                    backgroundColor: theme.primary,
                    opacity: !camera || !isConnected || isCentering ? 0.5 : 1,
                  },
                ]}
              >
                <Feather name="zap" size={16} color="#fff" />
                <Text style={[styles.enhanceButtonText, { color: "#fff" }]}>
                  {selectedObject.zoomRoundCompleted ? "Re-enhance" : "Enhance Now"}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        ) : (
          <>
            <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="search" size={16} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search objects..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Feather name="x" size={16} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.objectList}>
              {filteredObjects.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchQuery ? "No objects match your search" : "No objects detected"}
                </Text>
              ) : (
                filteredObjects.map(item => (
                  <View key={item.id}>
                    {renderObjectCard({ item })}
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <Modal
          visible={selectedGalleryImage !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedGalleryImage(null)}
        >
          <Pressable 
            style={styles.galleryModalOverlay}
            onPress={() => setSelectedGalleryImage(null)}
          >
            {selectedGalleryImage && (
              <View style={styles.galleryModalContent}>
                <Image
                  source={{ uri: selectedGalleryImage.uri }}
                  style={styles.galleryModalImage}
                  contentFit="contain"
                />
                <View style={[styles.galleryModalInfo, { backgroundColor: theme.backgroundDefault }]}>
                  <Text style={[styles.galleryModalTitle, { color: theme.text }]}>
                    Position {selectedGalleryImage.index + 1}
                  </Text>
                  <Pressable
                    onPress={() => setSelectedGalleryImage(null)}
                    style={[styles.galleryModalClose, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <Feather name="x" size={20} color={theme.text} />
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.connectionCard, { backgroundColor: theme.backgroundDefault }]}>
        {cameras.length > 1 && (
          <View style={styles.cameraSelectorRow}>
            <Pressable
              onPress={() => setShowCameraSelector(!showCameraSelector)}
              style={[styles.cameraSelector, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="video" size={16} color={theme.primary} />
              <Text style={[styles.cameraSelectorText, { color: theme.text }]} numberOfLines={1}>
                {camera?.name || "Select Camera"}
              </Text>
              <Feather 
                name={showCameraSelector ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={theme.textSecondary} 
              />
            </Pressable>
          </View>
        )}

        {showCameraSelector && (
          <View style={[styles.cameraList, { backgroundColor: theme.backgroundSecondary }]}>
            {cameras.map((cam) => (
              <Pressable
                key={cam.id}
                onPress={() => handleCameraChange(cam)}
                style={[
                  styles.cameraOption,
                  cam.id === camera?.id && { backgroundColor: theme.primary + "20" },
                ]}
              >
                <View style={styles.cameraOptionInfo}>
                  <Text style={[styles.cameraOptionName, { color: theme.text }]}>
                    {cam.name}
                  </Text>
                  <Text style={[styles.cameraOptionAddress, { color: theme.textSecondary }]}>
                    {cam.ipAddress}
                  </Text>
                </View>
                {cam.id === camera?.id && (
                  <Feather name="check" size={16} color={theme.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {camera && !isConnected ? (
          <View style={styles.connectionSection}>
            <Text style={[styles.connectionLabel, { color: theme.text }]}>
              {camera.name}
            </Text>
            <Text style={[styles.connectionSubLabel, { color: theme.textSecondary }]}>
              {camera.ipAddress}:{camera.rtspPort}
            </Text>
            <Pressable
              onPress={handleConnect}
              disabled={isConnecting}
              style={[styles.connectionButton, { backgroundColor: theme.primary }]}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="wifi" size={16} color="#FFF" />
                  <Text style={styles.connectionButtonText}>Connect</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : camera && isConnected ? (
          <View style={styles.connectedSection}>
            <View style={[styles.connectedBadge, { backgroundColor: theme.success + "20" }]}>
              <View style={[styles.connectedDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.connectedText, { color: theme.success }]}>
                {camera.name}
              </Text>
            </View>
            <Pressable
              onPress={handleGoHome}
              disabled={isGoingHome}
              style={[styles.homeButton, { backgroundColor: theme.primary }]}
            >
              {isGoingHome ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="home" size={14} color="#FFF" />
              )}
            </Pressable>
            <Pressable
              onPress={handleDisconnect}
              style={[styles.disconnectButton, { backgroundColor: theme.error }]}
            >
              <Feather name="power" size={14} color="#FFF" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.noCameraMessage, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="alert-circle" size={20} color={theme.warning} />
            <Text style={[styles.noCameraText, { color: theme.textSecondary }]}>
              No camera configured. Add one in Settings.
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.startCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.startIcon, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="target" size={28} color={theme.primary} />
        </View>
        <Text style={[styles.startTitle, { color: theme.text }]}>
          Hunt & Find
        </Text>
        <Text style={[styles.startDescription, { color: theme.textSecondary }]}>
          Scan your room to catalog objects and create quick-access presets
        </Text>
        
        <View style={styles.patternSelectorContainer}>
          <Text style={[styles.patternLabel, { color: theme.textSecondary }]}>
            Scan Pattern:
          </Text>
          <Pressable
            onPress={() => setShowPatternSelector(!showPatternSelector)}
            style={[styles.patternSelector, { backgroundColor: theme.backgroundSecondary }]}
          >
            <View style={styles.patternSelectorContent}>
              <Feather name="grid" size={16} color={theme.primary} />
              <Text style={[styles.patternSelectorText, { color: theme.text }]} numberOfLines={1}>
                {selectedPattern.name}
              </Text>
            </View>
            <Feather 
              name={showPatternSelector ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={theme.textSecondary} 
            />
          </Pressable>
        </View>

        {showPatternSelector && (
          <View style={[styles.patternList, { backgroundColor: theme.backgroundSecondary }]}>
            {SCAN_PATTERNS.map((pattern) => (
              <Pressable
                key={pattern.id}
                onPress={() => {
                  setSelectedPattern(pattern);
                  setShowPatternSelector(false);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.patternOption,
                  pattern.id === selectedPattern.id && { backgroundColor: theme.primary + "20" },
                ]}
              >
                <View style={styles.patternOptionInfo}>
                  <Text style={[styles.patternOptionName, { color: theme.text }]}>
                    {pattern.name}
                  </Text>
                  <Text style={[styles.patternOptionDesc, { color: theme.textSecondary }]}>
                    {pattern.description}
                  </Text>
                </View>
                {pattern.id === selectedPattern.id && (
                  <Feather name="check" size={16} color={theme.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.detectionModeContainer}>
          <Text style={[styles.detectionModeLabel, { color: theme.textSecondary }]}>
            Detection Mode:
          </Text>
          <View style={styles.detectionModeButtons}>
            <Pressable
              onPress={() => {
                setDetectionMode("moondream");
                Haptics.selectionAsync();
              }}
              style={[
                styles.detectionModeButton,
                { 
                  backgroundColor: detectionMode === "moondream" ? theme.primary : theme.backgroundSecondary,
                  borderTopLeftRadius: BorderRadius.sm,
                  borderBottomLeftRadius: BorderRadius.sm,
                },
              ]}
            >
              <Feather 
                name="cloud" 
                size={14} 
                color={detectionMode === "moondream" ? "#fff" : theme.textSecondary} 
              />
              <Text style={[
                styles.detectionModeButtonText,
                { color: detectionMode === "moondream" ? "#fff" : theme.textSecondary },
              ]}>
                Moondream
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (yoloAvailable) {
                  setDetectionMode("yolo");
                  Haptics.selectionAsync();
                } else {
                  Alert.alert(
                    "YOLO Not Available",
                    "YOLO detection requires iOS with the CoreML model loaded. Make sure you're running on a physical device."
                  );
                }
              }}
              style={[
                styles.detectionModeButton,
                { 
                  backgroundColor: detectionMode === "yolo" ? theme.success : theme.backgroundSecondary,
                  borderTopRightRadius: BorderRadius.sm,
                  borderBottomRightRadius: BorderRadius.sm,
                  opacity: yoloAvailable ? 1 : 0.5,
                },
              ]}
            >
              <Feather 
                name="smartphone" 
                size={14} 
                color={detectionMode === "yolo" ? "#fff" : theme.textSecondary} 
              />
              <Text style={[
                styles.detectionModeButtonText,
                { color: detectionMode === "yolo" ? "#fff" : theme.textSecondary },
              ]}>
                YOLO
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.detectionModeHint, { color: theme.textSecondary }]}>
            {detectionMode === "moondream" 
              ? "Cloud AI - understands natural language, finds any object" 
              : `On-device - fast, no API key needed (${YOLO_CLASSES.length} object types)`}
          </Text>
        </View>

        <View style={styles.zoomRoundsContainer}>
          <View style={styles.zoomRoundsHeader}>
            <Text style={[styles.zoomRoundsLabel, { color: theme.textSecondary }]}>
              Zoom Rounds:
            </Text>
            <Text style={[styles.zoomRoundsValue, { color: theme.primary }]}>
              Top {zoomRoundsCount} objects
            </Text>
          </View>
          <View style={styles.zoomRoundsStepper}>
            <Pressable
              onPress={() => {
                setZoomRoundsCount(Math.max(0, zoomRoundsCount - 1));
                Haptics.selectionAsync();
              }}
              style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <View style={styles.stepperValues}>
              {[0, 3, 5, 10, 15].map(val => (
                <Pressable
                  key={val}
                  onPress={() => {
                    setZoomRoundsCount(val);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.stepperValueButton,
                    { backgroundColor: zoomRoundsCount === val ? theme.primary : theme.backgroundSecondary },
                  ]}
                >
                  <Text style={[
                    styles.stepperValueText,
                    { color: zoomRoundsCount === val ? "#fff" : theme.textSecondary },
                  ]}>
                    {val === 0 ? "Off" : val}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => {
                setZoomRoundsCount(Math.min(20, zoomRoundsCount + 1));
                Haptics.selectionAsync();
              }}
              style={[styles.stepperButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
          <Text style={[styles.zoomRoundsHint, { color: theme.textSecondary }]}>
            Auto-zooms into top objects for close-up images
          </Text>
        </View>

        <View style={[styles.timeEstimateContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="clock" size={14} color={theme.textSecondary} />
          <Text style={[styles.timeEstimateText, { color: theme.textSecondary }]}>
            Estimated time: {estimateScanTime(selectedPattern, zoomRoundsCount).formatted}
          </Text>
        </View>

        <View style={[styles.llmStatusBadge, { backgroundColor: theme.success + "15" }]}>
          <Feather name="zap" size={14} color={theme.success} />
          <Text style={[styles.llmStatusText, { color: theme.success }]}>
            Smart Ranking Active
          </Text>
        </View>
        
        <Pressable
          onPress={handleStartScan}
          disabled={!camera || !isConnected || (detectionMode === "moondream" && !hasApiKey)}
          style={[
            styles.startButton,
            { 
              backgroundColor: detectionMode === "yolo" ? theme.success : theme.primary,
              opacity: !camera || !isConnected || (detectionMode === "moondream" && !hasApiKey) ? 0.5 : 1,
            },
          ]}
        >
          <Feather name="play" size={18} color="#fff" />
          <Text style={styles.startButtonText}>
            Start {detectionMode === "yolo" ? "YOLO " : ""}Room Scan
          </Text>
        </Pressable>
        
        {!camera && (
          <Text style={[styles.warningText, { color: theme.warning }]}>
            No camera configured
          </Text>
        )}
        {camera && !isConnected && (
          <Text style={[styles.warningText, { color: theme.warning }]}>
            Connect to camera above to start scanning
          </Text>
        )}
        {camera && isConnected && detectionMode === "moondream" && !hasApiKey && (
          <Text style={[styles.warningText, { color: theme.warning }]}>
            Add Moondream API key in Settings, or switch to YOLO mode
          </Text>
        )}
      </View>

      {previousScans.length > 0 && (
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Previous Scans
          </Text>
          <Text style={[styles.historyHint, { color: theme.textSecondary }]}>
            Long press to rename or delete
          </Text>
          <View style={styles.scanList}>
            {previousScans.map(item => (
              <View key={item.id}>
                {renderScanCard({ item })}
              </View>
            ))}
          </View>
        </View>
      )}

      <Modal
        visible={renamingScan !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenamingScan(null)}
      >
        <Pressable 
          style={styles.renameModalOverlay}
          onPress={() => setRenamingScan(null)}
        >
          <Pressable 
            style={[styles.renameModalContent, { backgroundColor: theme.backgroundDefault }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.renameModalTitle, { color: theme.text }]}>
              Rename Scan
            </Text>
            <TextInput
              style={[styles.renameInput, { 
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              }]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter scan name"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.renameModalButtons}>
              <Pressable
                onPress={() => setRenamingScan(null)}
                style={[styles.renameModalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Text style={[styles.renameModalButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRenameScan}
                style={[styles.renameModalButton, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.renameModalButtonText, { color: "#FFF" }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  connectionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  cameraSelectorRow: {
    marginBottom: Spacing.sm,
  },
  cameraSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  cameraSelectorText: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  cameraList: {
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  cameraOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
  },
  cameraOptionInfo: {
    flex: 1,
  },
  cameraOptionName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  cameraOptionAddress: {
    fontSize: Typography.small.fontSize,
  },
  connectionSection: {
    alignItems: "center",
  },
  connectionLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: 2,
  },
  connectionSubLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.sm,
  },
  connectionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  connectionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    minWidth: 100,
  },
  connectionButtonText: {
    color: "#FFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  connectedSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    flex: 1,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectedText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  homeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  disconnectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.xs,
  },
  noCameraMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  noCameraText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  startCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  startIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  startTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  startDescription: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  patternSelectorContainer: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  patternLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.xs,
  },
  patternSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  patternSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  patternSelectorText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  patternList: {
    width: "100%",
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  patternOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
  },
  patternOptionInfo: {
    flex: 1,
  },
  patternOptionName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  patternOptionDesc: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  detectionModeContainer: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  detectionModeLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.xs,
  },
  detectionModeButtons: {
    flexDirection: "row",
    width: "100%",
  },
  detectionModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  detectionModeButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  detectionModeHint: {
    fontSize: Typography.small.fontSize,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    width: "100%",
    height: 48,
    borderRadius: BorderRadius.sm,
  },
  startButtonText: {
    color: "#fff",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  warningText: {
    fontSize: Typography.small.fontSize,
    marginTop: Spacing.sm,
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  scanList: {
    gap: Spacing.sm,
  },
  scanCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  scanCardContent: {
    flexDirection: "row",
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  scanThumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  scanThumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  scanInfo: {
    flex: 1,
    justifyContent: "center",
  },
  scanName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  scanMeta: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  scanStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  scanStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  progressHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  progressTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  progressSubtitle: {
    fontSize: Typography.body.fontSize,
    marginTop: 4,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  positionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  positionCell: {
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  positionImage: {
    ...StyleSheet.absoluteFillObject,
  },
  positionBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  positionLabel: {
    fontSize: 10,
    fontWeight: "600",
    position: "absolute",
    bottom: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: Typography.body.fontSize,
  },
  elapsedTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    alignSelf: "center",
  },
  elapsedTimeText: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  elapsedTimeLabel: {
    fontSize: Typography.small.fontSize,
  },
  timingStatsContainer: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  timingStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  timingStat: {
    alignItems: "center",
  },
  timingStatValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  timingStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  scanControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  resultsHeaderText: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  resultsSubtitle: {
    fontSize: Typography.small.fontSize,
  },
  summaryBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  summaryText: {
    flex: 1,
    fontSize: Typography.small.fontSize,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body.fontSize,
  },
  objectList: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  objectDetailPanel: {
    flex: 1,
  },
  detailPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  detailBackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  detailBackText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  detailStarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  detailInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  detailTextContainer: {
    flex: 1,
  },
  detailName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  detailMeta: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  detailImportance: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  detailImportanceText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  detailReason: {
    fontSize: Typography.small.fontSize,
    fontStyle: "italic",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  objectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  objectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  objectInfo: {
    flex: 1,
  },
  objectName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  objectCategory: {
    fontSize: Typography.small.fontSize,
  },
  importanceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  importanceText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.xl,
    fontSize: Typography.body.fontSize,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  objectModal: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  objectModalHeader: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  objectModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  objectModalInfo: {
    flex: 1,
    justifyContent: "center",
  },
  starButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  objectModalName: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  objectModalCategory: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  objectModalReason: {
    fontSize: Typography.small.fontSize,
    fontStyle: "italic",
    marginBottom: Spacing.md,
  },
  objectModalMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: Typography.small.fontSize,
  },
  findButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.sm,
  },
  findButtonText: {
    color: "#fff",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  actionButtonsRow: {
    marginTop: Spacing.md,
  },
  centeringButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  centeringButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  centeringProgressContainer: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  centeringProgressText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  centeringProgressDetail: {
    fontSize: Typography.small.fontSize,
  },
  enhanceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 44,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  enhanceButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  gallerySection: {
    marginBottom: Spacing.md,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  galleryCell: {
    width: "32%",
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryCellImage: {
    width: "100%",
    height: "100%",
  },
  galleryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryModalContent: {
    width: "100%",
    maxHeight: "80%",
  },
  galleryModalImage: {
    width: "100%",
    height: 300,
  },
  galleryModalInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  galleryModalTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  galleryModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  objectImageContainer: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  objectImage: {
    width: "100%",
    height: "100%",
  },
  objectImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  objectImageLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    flex: 1,
  },
  objectModalContent: {
    padding: Spacing.lg,
  },
  zoomLabel: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  zoomButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  zoomButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
  zoomButtonText: {
    color: "#fff",
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  createPresetsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 40,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  createPresetsText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  presetsCreatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  presetsCreatedText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  closeModalButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  objectImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  objectImageGridCell: {
    width: "47%",
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    position: "relative",
  },
  objectImageGridImage: {
    width: "100%",
    height: "100%",
  },
  objectImageGridPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  objectImageGridLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  objectImageGridLabelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  objectImageGridPreset: {
    color: "#fff",
    fontSize: 9,
    opacity: 0.8,
  },
  noZoomImagesNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  noZoomImagesText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  zoomRoundsContainer: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  zoomRoundsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  zoomRoundsLabel: {
    fontSize: Typography.small.fontSize,
  },
  zoomRoundsValue: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  zoomRoundsStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValues: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  stepperValueButton: {
    flex: 1,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValueText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  zoomRoundsHint: {
    fontSize: 10,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  timeEstimateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timeEstimateText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  llmStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  llmStatusText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  historyHint: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.sm,
  },
  renameModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  renameModalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  renameModalTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  renameInput: {
    height: 44,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.md,
  },
  renameModalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  renameModalButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  renameModalButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
});
