import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography, Colors } from "@/constants/theme";
import {
  checkNativeDetectionStatus,
  detectAllObjects,
  NativeDetectionResult,
  NativeDetectionStatus,
} from "@/lib/nativeDetection";
import { detectInterestingObjects } from "@/lib/moondream";

interface DetectAllProps {
  isConnected: boolean;
  getFrame: () => Promise<string | null>;
  onDetectionsChange?: (detections: LabeledDetection[]) => void;
  apiKey?: string;
}

export type { LabeledDetection };

interface LabeledDetection extends NativeDetectionResult {
  color: string;
}

const DETECTION_COLORS = [
  Colors.dark.primary,
  Colors.dark.success,
  Colors.dark.warning,
  Colors.dark.error,
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#3498db",
];

function getColorForLabel(label: string, index: number): string {
  const hash = label
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DETECTION_COLORS[(hash + index) % DETECTION_COLORS.length];
}

export function DetectAll({
  isConnected,
  getFrame,
  onDetectionsChange,
  apiKey,
}: DetectAllProps) {
  const { theme } = useTheme();

  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<LabeledDetection[]>([]);
  const [yoloStatus, setYoloStatus] = useState<NativeDetectionStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [autoDetect, setAutoDetect] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState<number>(0);
  const [detectionMode, setDetectionMode] = useState<"on-device" | "cloud">(
    "on-device",
  );

  const autoDetectRef = useRef(autoDetect);
  const detectingRef = useRef(false);

  const scanPulse = useSharedValue(1);

  const scanPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanPulse.value }],
  }));

  React.useEffect(() => {
    if (isDetecting) {
      scanPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 300 }),
          withTiming(0.95, { duration: 300 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(scanPulse);
      scanPulse.value = withTiming(1, { duration: 150 });
    }
  }, [isDetecting]);

  const canUseOnDevice = yoloStatus?.yoloLoaded ?? false;
  const canUseCloud = Boolean(apiKey);
  const canDetect = canUseOnDevice || canUseCloud;

  useEffect(() => {
    autoDetectRef.current = autoDetect;
  }, [autoDetect]);

  useEffect(() => {
    checkNativeDetectionStatus().then((status) => {
      setYoloStatus(status);
      if (!status?.yoloLoaded && apiKey) {
        setDetectionMode("cloud");
      }
    });
  }, [apiKey]);

  const runDetection = useCallback(async () => {
    if (!isConnected || detectingRef.current || !canDetect) return;

    detectingRef.current = true;
    setIsDetecting(true);
    setError(null);

    const startTime = Date.now();

    try {
      const frame = await getFrame();
      if (!frame) {
        setError("Failed to capture frame");
        return;
      }

      const base64 = frame.replace(/^data:image\/\w+;base64,/, "");
      let labeled: LabeledDetection[] = [];

      if (detectionMode === "on-device" && canUseOnDevice) {
        const results = await detectAllObjects(base64);
        labeled = results.map((d, i) => ({
          ...d,
          color: getColorForLabel(d.label, i),
        }));
      } else if (detectionMode === "cloud" && apiKey) {
        const cloudResults = await detectInterestingObjects(base64, apiKey, 15);
        labeled = cloudResults.map((obj, i) => ({
          label: obj.name,
          confidence: 0.8,
          boundingBox: {
            x: obj.box.x_min,
            y: obj.box.y_min,
            width: obj.box.x_max - obj.box.x_min,
            height: obj.box.y_max - obj.box.y_min,
          },
          color: getColorForLabel(obj.name, i),
        }));
      }

      setDetections(labeled);
      setLastDetectionTime(Date.now() - startTime);
      onDetectionsChange?.(labeled);

      if (labeled.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detection failed");
      setDetections([]);
      onDetectionsChange?.([]);
    } finally {
      setIsDetecting(false);
      detectingRef.current = false;
    }
  }, [isConnected, getFrame, detectionMode, canUseOnDevice, apiKey, canDetect]);

  useEffect(() => {
    if (!autoDetect || !isConnected) return;

    const interval = setInterval(() => {
      if (autoDetectRef.current && !detectingRef.current) {
        runDetection();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [autoDetect, isConnected, runDetection]);

  const groupedDetections = detections.reduce(
    (acc, d) => {
      acc[d.label] = (acc[d.label] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const sortedLabels = Object.entries(groupedDetections).sort(
    (a, b) => b[1] - a[1],
  );

  if (!canDetect) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <View style={styles.statusContainer}>
          <Feather name="alert-circle" size={48} color={theme.warning} />
          <Text style={[styles.statusTitle, { color: theme.text }]}>
            No Detection Available
          </Text>
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            On-device YOLO model not loaded and no Moondream API key configured.
            Add API key in Settings or rebuild with YOLO model.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
    >
      <View style={styles.controls}>
        <Animated.View style={isDetecting ? scanPulseStyle : undefined}>
          <Pressable
            onPress={runDetection}
            disabled={isDetecting || !isConnected}
            style={({ pressed }) => [
              styles.detectButton,
              {
                backgroundColor: isDetecting ? theme.success : theme.primary,
                opacity: !isConnected ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {isDetecting ? (
              <>
                <Feather name="loader" size={18} color="#FFF" />
                <Text style={styles.detectButtonText}>Scanning...</Text>
              </>
            ) : (
              <>
                <Feather name="zap" size={18} color="#FFF" />
                <Text style={styles.detectButtonText}>Detect Now</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        <Pressable
          onPress={() => {
            setAutoDetect(!autoDetect);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          disabled={!isConnected}
          style={({ pressed }) => [
            styles.autoButton,
            {
              backgroundColor: autoDetect
                ? theme.success
                : theme.backgroundDefault,
              borderColor: autoDetect ? theme.success : theme.textSecondary,
              opacity: !isConnected ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather
            name={autoDetect ? "pause" : "play"}
            size={16}
            color={autoDetect ? "#FFF" : theme.text}
          />
          <Text
            style={[
              styles.autoButtonText,
              { color: autoDetect ? "#FFF" : theme.text },
            ]}
          >
            {autoDetect ? "Auto ON" : "Auto"}
          </Text>
        </Pressable>
      </View>

      {(canUseOnDevice || canUseCloud) && (
        <View style={styles.modeSection}>
          <View style={styles.modeButtons}>
            <Pressable
              onPress={() => {
                if (canUseOnDevice) {
                  setDetectionMode("on-device");
                  Haptics.selectionAsync();
                }
              }}
              disabled={!canUseOnDevice}
              style={[
                styles.modeButton,
                {
                  backgroundColor:
                    detectionMode === "on-device"
                      ? theme.success
                      : theme.backgroundDefault,
                  opacity: canUseOnDevice ? 1 : 0.5,
                },
              ]}
            >
              <Feather
                name="smartphone"
                size={14}
                color={
                  detectionMode === "on-device" ? "#FFF" : theme.textSecondary
                }
              />
              <Text
                style={[
                  styles.modeButtonText,
                  {
                    color:
                      detectionMode === "on-device"
                        ? "#FFF"
                        : theme.textSecondary,
                  },
                ]}
              >
                YOLO
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (canUseCloud) {
                  setDetectionMode("cloud");
                  Haptics.selectionAsync();
                }
              }}
              disabled={!canUseCloud}
              style={[
                styles.modeButton,
                {
                  backgroundColor:
                    detectionMode === "cloud"
                      ? theme.accent
                      : theme.backgroundDefault,
                  opacity: canUseCloud ? 1 : 0.5,
                },
              ]}
            >
              <Feather
                name="cloud"
                size={14}
                color={detectionMode === "cloud" ? "#FFF" : theme.textSecondary}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  {
                    color:
                      detectionMode === "cloud" ? "#FFF" : theme.textSecondary,
                  },
                ]}
              >
                Cloud AI
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {lastDetectionTime > 0 && (
        <View style={styles.statsRow}>
          <Text style={[styles.statsText, { color: theme.textSecondary }]}>
            {detections.length} objects • {lastDetectionTime}ms
          </Text>
        </View>
      )}

      {error && (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: theme.error + "20" },
          ]}
        >
          <Feather name="alert-triangle" size={16} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.resultsScroll}
        showsVerticalScrollIndicator={false}
      >
        {sortedLabels.length > 0 ? (
          <View style={styles.labelGrid}>
            {sortedLabels.map(([label, count]) => {
              const detection = detections.find((d) => d.label === label);
              const color = detection?.color || theme.primary;

              return (
                <Animated.View
                  key={label}
                  entering={FadeIn.duration(200)}
                  style={[
                    styles.labelCard,
                    {
                      backgroundColor: color + "15",
                      borderColor: color + "40",
                    },
                  ]}
                >
                  <View style={[styles.labelDot, { backgroundColor: color }]} />
                  <Text
                    style={[styles.labelName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <View style={[styles.countBadge, { backgroundColor: color }]}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        ) : !isDetecting && detections.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="box" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {isConnected
                ? "Tap 'Detect Now' to scan for objects"
                : "Grant camera permission to start"}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          {detectionMode === "on-device"
            ? "YOLOv8n • 80 COCO Classes • On-Device"
            : "Moondream AI • Cloud Detection"}
        </Text>
      </View>
    </View>
  );
}

export function DetectAllOverlay({
  detections,
  containerWidth,
  containerHeight,
}: {
  detections: LabeledDetection[];
  containerWidth: number;
  containerHeight: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {detections.map((detection, index) => {
        const { boundingBox, label, confidence, color } = detection;
        const left = boundingBox.x * containerWidth;
        const top = boundingBox.y * containerHeight;
        const width = boundingBox.width * containerWidth;
        const height = boundingBox.height * containerHeight;

        return (
          <Animated.View
            key={`${label}-${index}`}
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={[
              styles.detectionBox,
              { left, top, width, height, borderColor: color },
            ]}
          >
            <View
              style={[
                styles.labelTag,
                { backgroundColor: color, minWidth: 60, maxWidth: 120 },
              ]}
            >
              <Text
                style={styles.labelTagText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {label} {(confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  controls: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  detectButtonText: {
    color: "#FFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  autoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  autoButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  modeSection: {
    marginBottom: Spacing.sm,
  },
  modeButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  modeButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  statsRow: {
    marginBottom: Spacing.sm,
  },
  statsText: {
    fontSize: Typography.small.fontSize,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  resultsScroll: {
    flex: 1,
  },
  labelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  labelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelName: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  countText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
  },
  footer: {
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  footerText: {
    fontSize: Typography.caption.fontSize,
  },
  statusContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  statusTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  statusText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    lineHeight: 22,
  },
  detectionBox: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 4,
  },
  labelTag: {
    position: "absolute",
    top: -20,
    left: -1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelTagText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },
});
