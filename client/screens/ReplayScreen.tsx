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
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { getSettings, saveSettings } from "@/lib/storage";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIDEO_ASPECT_RATIO = 16 / 9;
const VIDEO_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const VIDEO_HEIGHT = VIDEO_WIDTH / VIDEO_ASPECT_RATIO;
const SCRUBBER_WIDTH = VIDEO_WIDTH - Spacing.lg * 2;

const DURATION_OPTIONS = [10, 15, 20, 30, 60];

export default function ReplayScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const [bufferDuration, setBufferDuration] = useState(30);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasBuffer, setHasBuffer] = useState(false);

  const playheadPosition = useSharedValue(0);

  useEffect(() => {
    loadSettings();
    // Simulate buffer availability after a delay
    const timer = setTimeout(() => setHasBuffer(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setBufferDuration(settings.replayBufferDuration);
    setIsRecording(true); // Auto-start recording
  };

  const handleDurationChange = async (duration: number) => {
    setBufferDuration(duration);
    await saveSettings({ replayBufferDuration: duration });
    Haptics.selectionAsync();
  };

  const handleToggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    setCurrentTime((prev) => {
      const newTime = Math.max(0, Math.min(bufferDuration, prev + seconds));
      playheadPosition.value = withTiming((newTime / bufferDuration) * SCRUBBER_WIDTH);
      return newTime;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [bufferDuration]);

  const handleSaveToPhotos = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // In real app, this would save the buffer to photos
    console.log("Saving buffer to photos...");
  }, []);

  const updateTime = useCallback((position: number) => {
    const time = Math.round((position / SCRUBBER_WIDTH) * bufferDuration);
    setCurrentTime(Math.max(0, Math.min(bufferDuration, time)));
  }, [bufferDuration]);

  const scrubGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newPosition = Math.max(0, Math.min(SCRUBBER_WIDTH, event.x));
      playheadPosition.value = newPosition;
      runOnJS(updateTime)(newPosition);
    });

  const playheadStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playheadPosition.value }],
  }));

  // Playback simulation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= bufferDuration) {
          setIsPlaying(false);
          return prev;
        }
        const newTime = prev + 1;
        playheadPosition.value = withTiming((newTime / bufferDuration) * SCRUBBER_WIDTH, {
          duration: 1000,
        });
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, bufferDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!hasBuffer) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={{ flex: 1, paddingTop: headerHeight }}>
          <EmptyState
            image={require("../../assets/images/empty-replay.png")}
            title="No Footage Yet"
            description="Start recording to capture footage in the replay buffer"
            action={
              <Pressable
                onPress={handleToggleRecording}
                style={({ pressed }) => [
                  styles.recordButton,
                  {
                    backgroundColor: isRecording ? theme.error : theme.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather
                  name={isRecording ? "stop-circle" : "circle"}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.recordButtonText}>
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Text>
              </Pressable>
            }
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        {/* Video Preview */}
        <View style={[styles.videoContainer, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.videoPreview}>
            {/* Simulated video frames */}
            <View style={styles.frameGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.frame,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                />
              ))}
            </View>

            {/* Time overlay */}
            <View style={styles.timeOverlay}>
              <Text style={[styles.timeText, { color: "#FFFFFF" }]}>
                {formatTime(currentTime)} / {formatTime(bufferDuration)}
              </Text>
            </View>

            {/* Recording indicator */}
            {isRecording ? (
              <View style={styles.recordingBadge}>
                <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
                <Text style={styles.recordingLabel}>REC</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Scrubber */}
        <View style={styles.scrubberContainer}>
          <GestureDetector gesture={scrubGesture}>
            <View style={[styles.scrubberTrack, { backgroundColor: theme.backgroundDefault }]}>
              {/* Progress fill */}
              <Animated.View
                style={[
                  styles.scrubberFill,
                  { backgroundColor: theme.primary + "40" },
                  { width: playheadPosition },
                ]}
              />

              {/* Frame markers */}
              <View style={styles.frameMarkers}>
                {Array.from({ length: Math.min(10, bufferDuration / 3) }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.frameMarker, { backgroundColor: theme.textSecondary }]}
                  />
                ))}
              </View>

              {/* Playhead */}
              <Animated.View style={[styles.playhead, playheadStyle]}>
                <View style={[styles.playheadHandle, { backgroundColor: theme.primary }]} />
              </Animated.View>
            </View>
          </GestureDetector>

          {/* Time labels */}
          <View style={styles.timeLabels}>
            <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>
              {formatTime(0)}
            </Text>
            <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>
              {formatTime(bufferDuration)}
            </Text>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.playbackControls}>
          <Pressable
            onPress={() => handleSkip(-10)}
            style={({ pressed }) => [
              styles.skipButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="rotate-ccw" size={20} color={theme.text} />
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>10s</Text>
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            style={({ pressed }) => [
              styles.playButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={32} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => handleSkip(10)}
            style={({ pressed }) => [
              styles.skipButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="rotate-cw" size={20} color={theme.text} />
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>10s</Text>
          </Pressable>
        </View>

        {/* Buffer Duration Selector */}
        <View style={styles.durationSection}>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Buffer Duration
          </ThemedText>
          <View style={styles.durationOptions}>
            {DURATION_OPTIONS.map((duration) => (
              <Pressable
                key={duration}
                onPress={() => handleDurationChange(duration)}
                style={[
                  styles.durationOption,
                  {
                    backgroundColor:
                      bufferDuration === duration
                        ? theme.primary
                        : theme.backgroundDefault,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.durationText,
                    {
                      color:
                        bufferDuration === duration ? "#FFFFFF" : theme.text,
                    },
                  ]}
                >
                  {duration}s
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSaveToPhotos}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="download" size={20} color={theme.primary} />
          <Text style={[styles.saveButtonText, { color: theme.primary }]}>
            Save to Photos
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  videoContainer: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  videoPreview: {
    flex: 1,
    backgroundColor: "#0A0E14",
  },
  frameGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  frame: {
    width: "33.33%",
    height: "50%",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  timeOverlay: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  timeText: {
    fontSize: Typography.small.fontSize,
    fontFamily: Platform.select({ ios: "ui-monospace", default: "monospace" }),
  },
  recordingBadge: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingLabel: {
    color: "#FFFFFF",
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  scrubberContainer: {
    marginBottom: Spacing.xl,
  },
  scrubberTrack: {
    height: 44,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    justifyContent: "center",
  },
  scrubberFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  frameMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  frameMarker: {
    width: 2,
    height: 16,
    borderRadius: 1,
    opacity: 0.3,
  },
  playhead: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    justifyContent: "center",
  },
  playheadHandle: {
    width: 4,
    height: "100%",
    borderRadius: 2,
  },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  timeLabel: {
    fontSize: Typography.caption.fontSize,
    fontFamily: Platform.select({ ios: "ui-monospace", default: "monospace" }),
  },
  playbackControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xl,
    marginBottom: Spacing["2xl"],
  },
  skipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  skipText: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.medium,
  },
  durationSection: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  durationOptions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  durationOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  durationText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  saveButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
});
