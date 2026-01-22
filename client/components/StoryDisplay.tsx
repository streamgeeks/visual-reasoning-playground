import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Pressable, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
} from "react-native-reanimated";

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
  onSaveToGallery?: (imageUri: string, description: string, length: ResponseLength) => void;
}

const LENGTH_OPTIONS: { key: ResponseLength; label: string }[] = [
  { key: "short", label: "Brief" },
  { key: "medium", label: "Normal" },
  { key: "long", label: "Detailed" },
];

const DISPLAY_DURATIONS: Record<ResponseLength, number> = {
  short: 12000,
  medium: 18000,
  long: 25000,
};

const HOLD_DURATION = 5000;

export function StoryDisplay({
  onCapture,
  hasApiKey,
  onSaveToGallery,
}: StoryDisplayProps) {
  const { theme } = useTheme();
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<ResponseLength>("short");
  const [continuousMode, setContinuousMode] = useState(false);
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
        if (onSaveToGallery) {
          onSaveToGallery(result.imageUri, result.description, selectedLength);
        }
      } else {
        setError("Could not analyze scene");
      }
    } catch (err) {
      setError("Failed to capture scene");
    } finally {
      setIsLoading(false);
    }
  }, [hasApiKey, onCapture, selectedLength, onSaveToGallery]);

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
    if (continuousMode && hasApiKey) {
      captureAndDescribe();

      const totalDuration = DISPLAY_DURATIONS[selectedLength] + HOLD_DURATION;
      intervalRef.current = setInterval(() => {
        captureAndDescribe();
      }, totalDuration);
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
  }, [continuousMode, hasApiKey, selectedLength]);

  const handleSingleCapture = () => {
    if (!isLoading) {
      captureAndDescribe();
    }
  };

  const toggleContinuousMode = () => {
    setContinuousMode((prev) => !prev);
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
      {/* Controls row */}
      <View style={styles.controlsRow}>
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

        {/* Continuous mode toggle */}
        <View style={styles.toggleContainer}>
          <Text style={[styles.toggleLabel, { color: theme.textSecondary }]}>
            Loop
          </Text>
          <Switch
            value={continuousMode}
            onValueChange={toggleContinuousMode}
            trackColor={{ false: theme.backgroundDefault, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
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
      {!continuousMode ? (
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
        <View style={[styles.liveIndicator, { backgroundColor: theme.error + "20" }]}>
          <View style={[styles.liveDot, { backgroundColor: theme.error }]} />
          <Text style={[styles.liveText, { color: theme.error }]}>
            Continuous Mode Active
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
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  lengthSelector: {
    flexDirection: "row",
    gap: Spacing.xs,
    flex: 1,
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
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  toggleLabel: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
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
