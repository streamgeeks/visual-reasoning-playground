import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Pressable, Switch, ScrollView } from "react-native";
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
          Add Moondream API key in Settings to enable scene narration
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Length selector */}
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

      {/* Story Mode controls */}
      <View style={[styles.storyModeSection, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.storyModeHeader}>
          <View style={styles.storyModeLabel}>
            <Feather name="book-open" size={16} color={theme.primary} />
            <Text style={[styles.storyModeTitle, { color: theme.text }]}>
              Story Mode
            </Text>
          </View>
          <Switch
            value={storyMode}
            onValueChange={toggleStoryMode}
            trackColor={{ false: theme.backgroundRoot, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Interval selector */}
        <View style={styles.intervalSection}>
          <Text style={[styles.intervalLabel, { color: theme.textSecondary }]}>
            Capture every:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.intervalOptions}
          >
            {INTERVAL_OPTIONS.map((option) => (
              <Pressable
                key={option.seconds}
                onPress={() => setSelectedInterval(option.seconds)}
                disabled={storyMode}
                style={[
                  styles.intervalOption,
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
                    styles.intervalOptionText,
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
          </ScrollView>
        </View>

        {storyMode ? (
          <View style={styles.storyStats}>
            <View style={[styles.statBadge, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="camera" size={12} color={theme.primary} />
              <Text style={[styles.statText, { color: theme.primary }]}>
                {captureCount} captures
              </Text>
            </View>
            <Text style={[styles.nextCapture, { color: theme.textSecondary }]}>
              Next in {selectedInterval}s
            </Text>
          </View>
        ) : null}
      </View>

      {/* Story display area */}
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {isLoading && displayedWords.length === 0 ? (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Observing scene...
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
            Tap the button below to describe the scene
          </Text>
        )}
      </View>

      {/* Capture button */}
      {!storyMode ? (
        <Pressable
          onPress={handleSingleCapture}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.captureButton,
            {
              backgroundColor: isLoading ? theme.backgroundDefault : theme.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather
            name={isLoading ? "loader" : "camera"}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.captureButtonText}>
            {isLoading ? "Analyzing..." : "Describe Scene"}
          </Text>
        </Pressable>
      ) : (
        <View style={[styles.liveIndicator, { backgroundColor: theme.success + "20" }]}>
          <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
          <Text style={[styles.liveText, { color: theme.success }]}>
            Recording Story
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.md,
  },
  lengthSelector: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  lengthOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  lengthOptionText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  storyModeSection: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  storyModeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storyModeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  storyModeTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  intervalSection: {
    gap: Spacing.sm,
  },
  intervalLabel: {
    fontSize: Typography.small.fontSize,
  },
  intervalOptions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  intervalOption: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  intervalOptionText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  storyStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  statText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  nextCapture: {
    fontSize: Typography.small.fontSize,
  },
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    minHeight: 140,
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  placeholderText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    fontStyle: "italic",
  },
  loadingText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
  },
  errorText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
  },
  storyText: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  word: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: "300",
    letterSpacing: 0.3,
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  captureButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
});
