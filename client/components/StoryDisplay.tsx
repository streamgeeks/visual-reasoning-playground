import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface StoryDisplayProps {
  isActive: boolean;
  onToggle: () => void;
  onCapture: () => Promise<string | null>;
  hasApiKey: boolean;
}

const DISPLAY_DURATION = 15000;
const HOLD_DURATION = 5000;

export function StoryDisplay({
  isActive,
  onToggle,
  onCapture,
  hasApiKey,
}: StoryDisplayProps) {
  const { theme } = useTheme();
  const [currentText, setCurrentText] = useState<string>("");
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (isActive) {
      pulseOpacity.value = withSequence(
        withTiming(1, { duration: 500 }),
        withDelay(500, withTiming(0.5, { duration: 500 }))
      );
    }
  }, [isActive]);

  const captureAndDescribe = async () => {
    if (!hasApiKey) {
      setError("Add Moondream API key in Settings");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDisplayedWords([]);

    try {
      const description = await onCapture();
      if (description) {
        setCurrentText(description);
        animateWords(description);
      }
    } catch (err) {
      setError("Failed to capture scene");
    } finally {
      setIsLoading(false);
    }
  };

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
    if (isActive && hasApiKey) {
      captureAndDescribe();

      intervalRef.current = setInterval(() => {
        captureAndDescribe();
      }, DISPLAY_DURATION + HOLD_DURATION);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (wordIntervalRef.current) {
          clearInterval(wordIntervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wordIntervalRef.current) {
        clearInterval(wordIntervalRef.current);
      }
      setDisplayedWords([]);
      setCurrentText("");
    }
  }, [isActive, hasApiKey]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Story Display Area */}
      {isActive ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[styles.storyArea, { backgroundColor: theme.backgroundDefault }]}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Animated.View style={[styles.loadingDot, pulseStyle, { backgroundColor: theme.primary }]} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Analyzing scene...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={20} color={theme.error} />
              <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            </View>
          ) : (
            <View style={styles.textContainer}>
              <View style={styles.storyHeader}>
                <View style={[styles.aiIndicator, { backgroundColor: theme.primary + "20" }]}>
                  <Feather name="eye" size={12} color={theme.primary} />
                </View>
                <Text style={[styles.storyLabel, { color: theme.textSecondary }]}>
                  Scene Narration
                </Text>
              </View>
              <Text style={[styles.storyText, { color: theme.text }]}>
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
            </View>
          )}
        </Animated.View>
      ) : null}

      {/* Toggle Button */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.toggleButton,
          {
            backgroundColor: isActive ? theme.primary : theme.backgroundDefault,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather
          name={isActive ? "pause-circle" : "play-circle"}
          size={22}
          color={isActive ? "#FFFFFF" : theme.primary}
        />
        <Text
          style={[
            styles.toggleText,
            { color: isActive ? "#FFFFFF" : theme.text },
          ]}
        >
          {isActive ? "Stop Story Mode" : "Start Story Mode"}
        </Text>
        {isActive ? (
          <View style={[styles.liveBadge, { backgroundColor: theme.error }]}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : null}
      </Pressable>

      {!hasApiKey ? (
        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
          Add your Moondream API key in Settings to enable story mode
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  storyArea: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    minHeight: 120,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    minHeight: 80,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  loadingText: {
    fontSize: Typography.small.fontSize,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  errorText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  textContainer: {
    flex: 1,
  },
  storyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  aiIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  storyLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  storyText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 26,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  word: {
    fontSize: Typography.body.fontSize,
    lineHeight: 26,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  toggleText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  liveBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.xs,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
  },
});
