import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text } from "react-native";
import Animated, {
  FadeIn,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface StoryDisplayProps {
  onCapture: () => Promise<string | null>;
  hasApiKey: boolean;
}

const DISPLAY_DURATION = 15000;
const HOLD_DURATION = 5000;

export function StoryDisplay({
  onCapture,
  hasApiKey,
}: StoryDisplayProps) {
  const { theme } = useTheme();
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const description = await onCapture();
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
  }, [hasApiKey, onCapture]);

  const animateWords = (text: string) => {
    const words = text.split(" ");
    const wordDelay = DISPLAY_DURATION / words.length;
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

      intervalRef.current = setInterval(() => {
        captureAndDescribe();
      }, DISPLAY_DURATION + HOLD_DURATION);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wordIntervalRef.current) {
        clearInterval(wordIntervalRef.current);
      }
    };
  }, [hasApiKey, captureAndDescribe]);

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
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {isLoading && displayedWords.length === 0 ? (
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Analyzing scene...
        </Text>
      ) : error && displayedWords.length === 0 ? (
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
      ) : (
        <Text style={[styles.storyText, { color: "#FFFFFF" }]}>
          {displayedWords.map((word, index) => (
            <Animated.Text
              key={`${word}-${index}`}
              entering={FadeIn.duration(200)}
              style={styles.word}
            >
              {word}{" "}
            </Animated.Text>
          ))}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    minHeight: 80,
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
    fontStyle: "italic",
  },
  loadingText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
  },
  errorText: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
  },
  storyText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 26,
  },
  word: {
    fontSize: Typography.body.fontSize,
    lineHeight: 26,
  },
});
