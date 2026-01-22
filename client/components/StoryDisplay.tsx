import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import Animated, {
  FadeIn,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export type ResponseLength = "short" | "medium" | "long";

interface StoryDisplayProps {
  onCapture: (length: ResponseLength) => Promise<string | null>;
  hasApiKey: boolean;
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
}: StoryDisplayProps) {
  const { theme } = useTheme();
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<ResponseLength>("short");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const captureAndDescribe = useCallback(async () => {
    if (!hasApiKey) {
      setError("Add Moondream API key in Settings");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const description = await onCapture(selectedLength);
      if (description) {
        animateWords(description);
      } else {
        setError("Could not analyze scene");
      }
    } catch (err) {
      setError("Failed to capture scene");
    } finally {
      setIsLoading(false);
    }
  }, [hasApiKey, onCapture, selectedLength]);

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
    if (hasApiKey && !isActiveRef.current) {
      isActiveRef.current = true;
      captureAndDescribe();

      const totalDuration = DISPLAY_DURATIONS[selectedLength] + HOLD_DURATION;
      intervalRef.current = setInterval(() => {
        captureAndDescribe();
      }, totalDuration);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wordIntervalRef.current) {
        clearInterval(wordIntervalRef.current);
      }
    };
  }, [hasApiKey, captureAndDescribe, selectedLength]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (hasApiKey && isActiveRef.current) {
      const totalDuration = DISPLAY_DURATIONS[selectedLength] + HOLD_DURATION;
      intervalRef.current = setInterval(() => {
        captureAndDescribe();
      }, totalDuration);
    }
  }, [selectedLength, hasApiKey, captureAndDescribe]);

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
        ) : (
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
        )}
      </View>
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
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  lengthOptionText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
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
});
