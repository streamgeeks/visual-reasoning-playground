import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { CameraChat, ChatDetection } from "@/components/CameraChat";
import { DetectionBoxOverlay } from "@/components/DetectionOverlay";
import {
  VisionCamera,
  VisionCameraRef,
  useVisionCameraPermission,
  useVisionCameraDevice,
} from "@/components/VisionCamera";
import {
  CameraProfile,
  getCameraProfiles,
  getCurrentCameraId,
  getSettings,
  AppSettings,
} from "@/lib/storage";
import { testCameraConnection, fetchCameraFrame } from "@/lib/camera";
import { Spacing } from "@/constants/theme";

export function ChatScreen({ navigation }: any) {
  const { theme } = useTheme();
  const cameraRef = useRef<VisionCameraRef>(null);
  const device = useVisionCameraDevice("back");

  const { granted: hasPermission, requestPermission } =
    useVisionCameraPermission();
  const [camera, setCamera] = useState<CameraProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [ptzConnected, setPtzConnected] = useState(false);
  const [ptzFrame, setPtzFrame] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const latestFrameRef = useRef<string | null>(null);

  const [chatDetections, setChatDetections] = useState<ChatDetection[]>([]);
  const [visibleChatLabels, setVisibleChatLabels] = useState<Set<string>>(
    new Set(),
  );

  const ptzPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadCameraAndSettings();
      setIsCameraActive(true);

      if (!hasPermission) {
        requestPermission();
      }

      return () => {
        setIsCameraActive(false);
        if (ptzPollingRef.current) {
          clearInterval(ptzPollingRef.current);
          ptzPollingRef.current = null;
        }
      };
    }, [hasPermission]),
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
      } else if (cameras.length > 0) {
        setCamera(cameras[0]);
      }

      setAppSettings(settings);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const startPtzPolling = useCallback((cam: CameraProfile) => {
    if (ptzPollingRef.current) {
      clearInterval(ptzPollingRef.current);
    }

    const fetchFrame = async () => {
      try {
        const frame = await fetchCameraFrame(cam);
        if (frame) {
          setPtzFrame(frame);
          latestFrameRef.current = frame;
        }
      } catch (err) {
        console.log("[ChatScreen] PTZ frame error:", err);
      }
    };

    fetchFrame();
    ptzPollingRef.current = setInterval(fetchFrame, 500);
  }, []);

  const handleConnectPtz = useCallback(async () => {
    if (!camera) return;

    const result = await testCameraConnection(camera);
    if (result.success) {
      setPtzConnected(true);
      startPtzPolling(camera);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert(
        "Connection Failed",
        result.error || "Could not connect to camera",
      );
    }
  }, [camera, startPtzPolling]);

  const captureFrameForAI = useCallback(async (): Promise<string | null> => {
    if (ptzConnected && latestFrameRef.current) {
      return latestFrameRef.current;
    }

    if (!cameraRef.current) {
      return null;
    }

    try {
      const frameUri = await cameraRef.current.captureFrame();
      if (!frameUri) return null;

      const manipulated = await ImageManipulator.manipulateAsync(
        frameUri,
        [{ resize: { width: 512 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      if (!manipulated?.base64) return null;

      return `data:image/jpeg;base64,${manipulated.base64}`;
    } catch (err) {
      console.log("[ChatScreen] captureFrameForAI Error:", err);
      return null;
    }
  }, [ptzConnected]);

  const handleShowDetections = useCallback(
    (detections: ChatDetection[], detectType: string) => {
      const colors = [
        "#007AFF",
        "#34C759",
        "#FF9500",
        "#FF3B30",
        "#9b59b6",
        "#1abc9c",
        "#e67e22",
        "#3498db",
        "#AF52DE",
        "#5AC8FA",
        "#FF2D55",
        "#64D2FF",
      ];
      const coloredDetections = detections.map((d, i) => ({
        ...d,
        color: colors[i % colors.length],
      }));
      setChatDetections(coloredDetections);
      setVisibleChatLabels(
        new Set(detections.map((d) => d.label.toLowerCase())),
      );
    },
    [],
  );

  const handleToggleDetection = useCallback((label: string) => {
    setVisibleChatLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (!hasPermission) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <Feather name="camera-off" size={48} color={theme.textSecondary} />
        <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
          Camera permission required for AI chat
        </Text>
        <Pressable
          onPress={requestPermission}
          style={[styles.permissionButton, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.cameraPreviewContainer}>
        {ptzConnected && ptzFrame ? (
          <View style={styles.cameraPreview}>
            <View style={styles.previewImageContainer}>
              <View
                style={[
                  styles.previewPlaceholder,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="video" size={24} color={theme.primary} />
                <Text style={[styles.previewLabel, { color: theme.text }]}>
                  PTZ Camera
                </Text>
              </View>
            </View>
            {chatDetections
              .filter((d) => visibleChatLabels.has(d.label.toLowerCase()))
              .map((detection, index) => (
                <DetectionBoxOverlay
                  key={`chat-detection-${index}`}
                  box={{
                    x_min: detection.box.x,
                    y_min: detection.box.y,
                    x_max: detection.box.x + detection.box.width,
                    y_max: detection.box.y + detection.box.height,
                  }}
                  containerWidth={120}
                  containerHeight={90}
                  color={detection.color}
                  label={detection.label}
                />
              ))}
          </View>
        ) : (
          <View style={styles.cameraPreview}>
            <VisionCamera
              ref={cameraRef}
              style={styles.camera}
              position="back"
              isActive={isCameraActive && !ptzConnected}
            />
            {chatDetections
              .filter((d) => visibleChatLabels.has(d.label.toLowerCase()))
              .map((detection, index) => (
                <DetectionBoxOverlay
                  key={`chat-detection-${index}`}
                  box={{
                    x_min: detection.box.x,
                    y_min: detection.box.y,
                    x_max: detection.box.x + detection.box.width,
                    y_max: detection.box.y + detection.box.height,
                  }}
                  containerWidth={120}
                  containerHeight={90}
                  color={detection.color}
                  label={detection.label}
                />
              ))}
          </View>
        )}
      </View>

      <View style={styles.chatContainer}>
        <CameraChat
          camera={camera}
          apiKey={appSettings?.moondreamApiKey || ""}
          isConnected={true}
          getFrame={captureFrameForAI}
          ptzConnected={ptzConnected}
          onConnectPtz={camera ? handleConnectPtz : undefined}
          onShowDetections={handleShowDetections}
          onAdjustCamera={(setting, direction) => {
            console.log(`[Chat] Camera ${setting} ${direction}`);
          }}
          detections={chatDetections}
          visibleLabels={visibleChatLabels}
          onToggleDetection={handleToggleDetection}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  permissionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cameraPreviewContainer: {
    padding: Spacing.md,
    alignItems: "center",
  },
  cameraPreview: {
    width: 120,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  previewImageContainer: {
    flex: 1,
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  chatContainer: {
    flex: 1,
  },
});
