import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Animated, { 
  FadeIn, 
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  cancelAnimation,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { detectHumans, isVisionAvailable, DetectionResult } from "vision-tracking";
import { detectNumberedPeople } from "@/lib/moondream";

interface PeopleCounterProps {
  getFrame: () => Promise<string | null>;
  isConnected: boolean;
  apiKey?: string;
}

interface CountHistory {
  count: number;
  timestamp: number;
}

export function PeopleCounter({ getFrame, isConnected, apiKey }: PeopleCounterProps) {
  const { theme } = useTheme();
  
  const [isActive, setIsActive] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);
  const [peakCount, setPeakCount] = useState(0);
  const [totalDetections, setTotalDetections] = useState(0);
  const [lastDetections, setLastDetections] = useState<DetectionResult[]>([]);
  const [countHistory, setCountHistory] = useState<CountHistory[]>([]);
  const [intervalMs, setIntervalMs] = useState(1000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const [detectionMode, setDetectionMode] = useState<"on-device" | "cloud">(
    isVisionAvailable ? "on-device" : "cloud"
  );
  
  const activeRef = useRef(false);
  const frameCountRef = useRef(0);
  const fpsStartTimeRef = useRef(0);
  
  const canUseOnDevice = isVisionAvailable;
  const canUseCloud = Boolean(apiKey);
  const canStart = canUseOnDevice || canUseCloud;
  
  const countScale = useSharedValue(1);
  const dotPulse = useSharedValue(1);
  
  const countAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }));
  
  const dotPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotPulse.value }],
    opacity: 0.5 + dotPulse.value * 0.5,
  }));
  
  React.useEffect(() => {
    if (isActive) {
      dotPulse.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(dotPulse);
      dotPulse.value = 1;
    }
  }, [isActive]);

  const animateCount = useCallback(() => {
    countScale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
  }, [countScale]);

  const processFrame = useCallback(async () => {
    if (!activeRef.current) return;
    
    try {
      setIsProcessing(true);
      const frame = await getFrame();
      
      if (!frame || !activeRef.current) {
        setIsProcessing(false);
        return;
      }
      
      let detections: DetectionResult[] = [];
      
      if (detectionMode === "on-device" && canUseOnDevice) {
        detections = await detectHumans(frame);
      } else if (detectionMode === "cloud" && apiKey) {
        const base64Data = frame.includes(",") ? frame.split(",")[1] : frame;
        const cloudResults = await detectNumberedPeople(base64Data, apiKey);
        detections = cloudResults.map((p) => ({
          label: p.id,
          confidence: 0.8,
          x: p.box.x_min,
          y: p.box.y_min,
          width: p.box.x_max - p.box.x_min,
          height: p.box.y_max - p.box.y_min,
        }));
      }
      
      if (!activeRef.current) {
        setIsProcessing(false);
        return;
      }
      
      const count = detections.length;
      
      setCurrentCount(prev => {
        if (count !== prev) {
          animateCount();
          Haptics.selectionAsync();
        }
        return count;
      });
      
      setPeakCount(prev => Math.max(prev, count));
      setTotalDetections(prev => prev + count);
      setLastDetections(detections);
      
      setCountHistory(prev => {
        const newHistory = [...prev, { count, timestamp: Date.now() }];
        return newHistory.slice(-60);
      });
      
      frameCountRef.current++;
      const now = Date.now();
      if (now - fpsStartTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        fpsStartTimeRef.current = now;
      }
      
    } catch (error) {
      console.error("[PeopleCounter] Detection error:", error);
    } finally {
      setIsProcessing(false);
      
      if (activeRef.current) {
        setTimeout(processFrame, intervalMs);
      }
    }
  }, [getFrame, intervalMs, animateCount, detectionMode, canUseOnDevice, apiKey]);

  const startCounting = useCallback(() => {
    if (!canStart) {
      return;
    }
    
    activeRef.current = true;
    setIsActive(true);
    setSessionStartTime(Date.now());
    setCurrentCount(0);
    setPeakCount(0);
    setTotalDetections(0);
    setCountHistory([]);
    frameCountRef.current = 0;
    fpsStartTimeRef.current = Date.now();
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    processFrame();
  }, [processFrame, canStart]);

  const stopCounting = useCallback(() => {
    activeRef.current = false;
    setIsActive(false);
    setIsProcessing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const resetStats = useCallback(() => {
    setPeakCount(0);
    setTotalDetections(0);
    setCountHistory([]);
    setSessionStartTime(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const getSessionDuration = () => {
    if (!sessionStartTime) return "0:00";
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getAverageCount = () => {
    if (countHistory.length === 0) return 0;
    const sum = countHistory.reduce((acc, h) => acc + h.count, 0);
    return (sum / countHistory.length).toFixed(1);
  };

  const renderSparkline = () => {
    if (countHistory.length < 2) return null;
    
    const maxCount = Math.max(...countHistory.map(h => h.count), 1);
    const barWidth = 4;
    const barGap = 2;
    const height = 40;
    
    return (
      <View style={[styles.sparkline, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={styles.sparklineBars}>
          {countHistory.slice(-20).map((h, i) => {
            const barHeight = (h.count / maxCount) * height;
            return (
              <View
                key={i}
                style={[
                  styles.sparklineBar,
                  {
                    width: barWidth,
                    height: Math.max(barHeight, 2),
                    backgroundColor: h.count > 0 ? theme.primary : theme.backgroundDefault,
                    marginLeft: i > 0 ? barGap : 0,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  if (!canStart) {
    return (
      <View style={[styles.unavailableContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="alert-circle" size={24} color={theme.warning} />
        <Text style={[styles.unavailableText, { color: theme.textSecondary }]}>
          People Counter requires iOS Vision framework or Moondream API key
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Count Display */}
      <View style={[styles.countCard, { backgroundColor: theme.backgroundSecondary }]}>
        <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
          People Detected
        </Text>
        
        <Animated.View style={countAnimatedStyle}>
          <Text style={[styles.countNumber, { color: theme.primary }]}>
            {currentCount}
          </Text>
        </Animated.View>
        
        {isActive && (
          <Animated.View 
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.processingIndicator, { backgroundColor: theme.success + "20" }]}
          >
            <Animated.View style={[styles.processingDot, { backgroundColor: theme.success }, dotPulseStyle]} />
            <Text style={[styles.processingText, { color: theme.success }]}>
              {isProcessing ? "Analyzing..." : "Live"} ({fps} fps)
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="trending-up" size={16} color={theme.warning} />
          <Text style={[styles.statValue, { color: theme.text }]}>{peakCount}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Peak</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="bar-chart-2" size={16} color={theme.primary} />
          <Text style={[styles.statValue, { color: theme.text }]}>{getAverageCount()}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Average</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="clock" size={16} color={theme.success} />
          <Text style={[styles.statValue, { color: theme.text }]}>{getSessionDuration()}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Duration</Text>
        </View>
      </View>

      {/* Sparkline History */}
      {countHistory.length > 1 && (
        <View style={styles.sparklineSection}>
          <Text style={[styles.sparklineLabel, { color: theme.textSecondary }]}>
            Recent History
          </Text>
          {renderSparkline()}
        </View>
      )}

      {/* Detection Info */}
      {lastDetections.length > 0 && (
        <View style={[styles.detectionInfo, { backgroundColor: theme.backgroundSecondary }]}>
          <Text style={[styles.detectionTitle, { color: theme.text }]}>
            Detection Details
          </Text>
          {lastDetections.map((d, i) => (
            <View key={i} style={styles.detectionRow}>
              <Feather name="user" size={14} color={theme.primary} />
              <Text style={[styles.detectionText, { color: theme.textSecondary }]}>
                Person {i + 1}: {Math.round(d.confidence * 100)}% confidence
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Detection Mode Toggle */}
      {(canUseOnDevice || canUseCloud) && (
        <View style={styles.modeSection}>
          <Text style={[styles.modeLabel, { color: theme.text }]}>
            Detection Mode
          </Text>
          <View style={styles.modeButtons}>
            <Pressable
              onPress={() => {
                if (canUseOnDevice && !isActive) {
                  setDetectionMode("on-device");
                  Haptics.selectionAsync();
                }
              }}
              disabled={!canUseOnDevice || isActive}
              style={[
                styles.modeButton,
                {
                  backgroundColor: detectionMode === "on-device" ? theme.success : theme.backgroundSecondary,
                  opacity: !canUseOnDevice || isActive ? 0.5 : 1,
                },
              ]}
            >
              <Feather 
                name="smartphone" 
                size={14} 
                color={detectionMode === "on-device" ? "#FFF" : theme.textSecondary} 
              />
              <Text style={[
                styles.modeButtonText,
                { color: detectionMode === "on-device" ? "#FFF" : theme.textSecondary },
              ]}>
                On-Device
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (canUseCloud && !isActive) {
                  setDetectionMode("cloud");
                  Haptics.selectionAsync();
                }
              }}
              disabled={!canUseCloud || isActive}
              style={[
                styles.modeButton,
                {
                  backgroundColor: detectionMode === "cloud" ? theme.accent : theme.backgroundSecondary,
                  opacity: !canUseCloud || isActive ? 0.5 : 1,
                },
              ]}
            >
              <Feather 
                name="cloud" 
                size={14} 
                color={detectionMode === "cloud" ? "#FFF" : theme.textSecondary} 
              />
              <Text style={[
                styles.modeButtonText,
                { color: detectionMode === "cloud" ? "#FFF" : theme.textSecondary },
              ]}>
                Cloud AI
              </Text>
            </Pressable>
          </View>
          {!canUseOnDevice && (
            <Text style={[styles.modeHint, { color: theme.textSecondary }]}>
              On-device requires iOS Vision framework
            </Text>
          )}
          {!canUseCloud && (
            <Text style={[styles.modeHint, { color: theme.textSecondary }]}>
              Cloud AI requires Moondream API key
            </Text>
          )}
        </View>
      )}

      {/* Interval Selector */}
      <View style={styles.intervalSection}>
        <Text style={[styles.intervalLabel, { color: theme.text }]}>
          Scan Interval
        </Text>
        <View style={styles.intervalButtons}>
          {[
            { ms: 500, label: "Fast" },
            { ms: 1000, label: "Normal" },
            { ms: 2000, label: "Slow" },
          ].map(({ ms, label }) => (
            <Pressable
              key={ms}
              onPress={() => {
                setIntervalMs(ms);
                Haptics.selectionAsync();
              }}
              disabled={isActive}
              style={[
                styles.intervalButton,
                {
                  backgroundColor: intervalMs === ms ? theme.primary : theme.backgroundSecondary,
                  opacity: isActive ? 0.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.intervalButtonText,
                  { color: intervalMs === ms ? "#FFF" : theme.textSecondary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!isActive ? (
          <Pressable
            onPress={startCounting}
            disabled={!isConnected}
            style={[
              styles.startButton,
              { 
                backgroundColor: theme.primary,
                opacity: isConnected ? 1 : 0.5,
              },
            ]}
          >
            <Feather name="play" size={20} color="#FFF" />
            <Text style={styles.startButtonText}>Start Counting</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={stopCounting}
            style={[styles.stopButton, { backgroundColor: theme.error }]}
          >
            <Feather name="square" size={20} color="#FFF" />
            <Text style={styles.stopButtonText}>Stop</Text>
          </Pressable>
        )}
        
        {!isActive && (peakCount > 0 || totalDetections > 0) && (
          <Pressable
            onPress={resetStats}
            style={[styles.resetButton, { backgroundColor: theme.backgroundSecondary }]}
          >
            <Feather name="refresh-cw" size={16} color={theme.textSecondary} />
            <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>
              Reset
            </Text>
          </Pressable>
        )}
      </View>

      {/* Connection Warning */}
      {!isConnected && (
        <View style={[styles.warningBanner, { backgroundColor: theme.warning + "20" }]}>
          <Feather name="alert-triangle" size={16} color={theme.warning} />
          <Text style={[styles.warningText, { color: theme.warning }]}>
            Camera access required. Grant permission or connect a PTZ camera.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.md,
  },
  unavailableContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  unavailableText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
  },
  countCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  countLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.xs,
  },
  countNumber: {
    fontSize: 72,
    fontWeight: "700",
    lineHeight: 80,
  },
  processingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  processingText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: Typography.small.fontSize,
  },
  sparklineSection: {
    gap: Spacing.xs,
  },
  sparklineLabel: {
    fontSize: Typography.small.fontSize,
  },
  sparkline: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    height: 56,
    justifyContent: "flex-end",
  },
  sparklineBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 40,
  },
  sparklineBar: {
    borderRadius: 2,
  },
  detectionInfo: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  detectionTitle: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  detectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  detectionText: {
    fontSize: Typography.small.fontSize,
  },
  modeSection: {
    gap: Spacing.xs,
  },
  modeLabel: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
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
  modeHint: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
  },
  intervalSection: {
    gap: Spacing.xs,
  },
  intervalLabel: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  intervalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  intervalButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  startButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  startButtonText: {
    color: "#FFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  stopButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  stopButtonText: {
    color: "#FFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  resetButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  warningText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
});
