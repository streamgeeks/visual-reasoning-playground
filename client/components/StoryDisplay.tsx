import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Pressable, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export type ResponseLength = "short" | "medium" | "long";

export interface CaptureResult {
  description: string;
  imageUri: string;
}

interface StoryDisplayProps {
  onCapture: (length: ResponseLength) => Promise<CaptureResult | null>;
  hasApiKey: boolean;
  onStoryModeStart?: (intervalSeconds: number) => void;
  onStoryModeEnd?: () => void;
  onCaptureToStory?: (imageUri: string, description: string, length: ResponseLength) => void;
}

const LENGTH_OPTIONS: { key: ResponseLength; label: string }[] = [
  { key: "short", label: "Brief" },
  { key: "medium", label: "Normal" },
  { key: "long", label: "Detailed" },
];

const INTERVAL_OPTIONS: { seconds: number; label: string }[] = [
  { seconds: 20, label: "20s" },
  { seconds: 30, label: "30s" },
  { seconds: 60, label: "1m" },
  { seconds: 120, label: "2m" },
  { seconds: 300, label: "5m" },
];

const DISPLAY_DURATIONS: Record<ResponseLength, number> = {
  short: 12000,
  medium: 18000,
  long: 25000,
};

export function StoryDisplay({
  onCapture,
  hasApiKey,
  onStoryModeStart,
  onStoryModeEnd,
  onCaptureToStory,
}: StoryDisplayProps) {
  const { theme } = useTheme();
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<ResponseLength>("short");
  const [storyMode, setStoryMode] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(30);
  const [captureCount, setCaptureCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const captureAndDescribe = useCallback(async () => {
    if (!hasApiKey) {
      setError("Add Moondream API key in Settings");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await onCapture(selectedLength);
      if (result) {
        animateWords(result.description);
        if (storyMode && onCaptureToStory) {
          onCaptureToStory(result.imageUri, result.description, selectedLength);
          setCaptureCount((prev) => prev + 1);
        }
      } else {
        setError("Could not analyze scene");
      }
    } catch (err) {
      setError("Failed to capture scene");
    } finally {
      setIsLoading(false);
    }
  }, [hasApiKey, onCapture, selectedLength, storyMode, onCaptureToStory]);

  const animateWords = (text: string) => {
    const words = text.split(" ");
    const displayDuration = DISPLAY_DURATIONS[selectedLength];
    const wordDelay = Math.max(displayDuration / words.length, 300);
    let wordIndex = 0;

    if (wordIntervalRef.current) {
      clearInterval(wordIntervalRef.current);
    }

    setDisplayedWords([]);

    wordIntervalRef.current = setInterval(() => {
      if (wordIndex < words.length) {
        setDisplayedWords((prev) => [...prev, words[wordIndex]]);
        wordIndex++;
      } else {
        if (wordIntervalRef.current) {
          clearInterval(wordIntervalRef.current);
        }
      }
    }, wordDelay);
  };

  useEffect(() => {
    if (storyMode && hasApiKey) {
      captureAndDescribe();

      intervalRef.current = setInterval(() => {
        captureAndDescribe();
      }, selectedInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wordIntervalRef.current) {
        clearInterval(wordIntervalRef.current);
      }
    };
  }, [storyMode, hasApiKey, selectedInterval]);

  const handleSingleCapture = () => {
    if (!isLoading) {
      captureAndDescribe();
    }
  };

  const toggleStoryMode = () => {
    if (!storyMode) {
      setCaptureCount(0);
      if (onStoryModeStart) {
        onStoryModeStart(selectedInterval);
      }
    } else {
      if (onStoryModeEnd) {
        onStoryModeEnd();
      }
    }
    setStoryMode((prev) => !prev);
  };

  if (!hasApiKey) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
          Add Moondream API key in Settings
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Compact controls row */}
      <View style={styles.controlsRow}>
        {/* Length selector - inline */}
        <View style={styles.lengthSelector}>
          {LENGTH_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setSelectedLength(option.key)}
              style={[
                styles.lengthOption,
                {
                  backgroundColor:
                    selectedLength === option.key
                      ? theme.primary
                      : theme.backgroundDefault,
                },
              ]}
            >
              <Text
                style={[
                  styles.lengthOptionText,
                  {
                    color:
                      selectedLength === option.key ? "#FFFFFF" : theme.textSecondary,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Capture button inline */}
        {!storyMode ? (
          <Pressable
            onPress={handleSingleCapture}
            disabled={isLoading}
            style={[
              styles.captureBtn,
              { backgroundColor: isLoading ? theme.backgroundDefault : theme.primary },
            ]}
          >
            <Text style={styles.captureBtnText}>
              {isLoading ? "..." : "Describe"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Story Mode - compact */}
      <View style={[styles.storyRow, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.storyLeft}>
          <Feather name="book-open" size={14} color={theme.primary} />
          <Text style={[styles.storyLabel, { color: theme.text }]}>Story</Text>
          <Switch
            value={storyMode}
            onValueChange={toggleStoryMode}
            trackColor={{ false: theme.backgroundRoot, true: theme.primary }}
            thumbColor="#FFFFFF"
            style={styles.switch}
          />
        </View>
        
        <View style={styles.intervalRow}>
          {INTERVAL_OPTIONS.map((option) => (
            <Pressable
              key={option.seconds}
              onPress={() => setSelectedInterval(option.seconds)}
              disabled={storyMode}
              style={[
                styles.intervalChip,
                {
                  backgroundColor:
                    selectedInterval === option.seconds
                      ? theme.primary
                      : theme.backgroundRoot,
                  opacity: storyMode ? 0.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.intervalText,
                  {
                    color:
                      selectedInterval === option.seconds
                        ? "#FFFFFF"
                        : theme.textSecondary,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Recording indicator */}
      {storyMode ? (
        <View style={[styles.recordingRow, { backgroundColor: theme.success + "15" }]}>
          <View style={[styles.recordDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.recordText, { color: theme.success }]}>
            Recording
          </Text>
          <Text style={[styles.captureCountText, { color: theme.success }]}>
            {captureCount} captures
          </Text>
        </View>
      ) : null}

      {/* Description display - compact */}
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {isLoading && displayedWords.length === 0 ? (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Observing...
            </Text>
          </View>
        ) : error && displayedWords.length === 0 ? (
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        ) : displayedWords.length > 0 ? (
          <Text style={styles.storyText}>
            {displayedWords.map((word, index) => (
              <Animated.Text
                key={`${word}-${index}`}
                entering={FadeIn.duration(400)}
                style={[styles.word, { color: "#FFFFFF" }]}
              >
                {word}{" "}
              </Animated.Text>
            ))}
          </Text>
        ) : (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Tap camera to describe
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  lengthSelector: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  lengthOption: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  lengthOptionText: {
    fontSize: 11,
    fontWeight: "600",
  },
  captureBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  storyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
  },
  storyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storyLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  intervalRow: {
    flexDirection: "row",
    gap: 4,
  },
  intervalChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
  },
  intervalText: {
    fontSize: 10,
    fontWeight: "500",
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  recordDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recordText: {
    fontSize: 12,
    fontWeight: "600",
  },
  captureCountText: {
    fontSize: 12,
    marginLeft: "auto",
  },
  container: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    justifyContent: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  placeholderText: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
  loadingText: {
    fontSize: 13,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },
  storyText: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  word: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "300",
  },
});
