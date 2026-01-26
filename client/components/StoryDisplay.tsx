import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Pressable, Switch, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export type ResponseLength = "short" | "medium" | "long";
export type DescriptionSource = "apple" | "moondream";

export interface CaptureResult {
  description: string;
  imageUri: string;
  source: DescriptionSource;
}

export type DescriptionMode = "auto" | "vision" | "moondream";

interface StoryDisplayProps {
  onCapture: (length: ResponseLength, forceVision?: boolean) => Promise<CaptureResult | null>;
  hasApiKey: boolean;
  onStoryModeStart?: (intervalSeconds: number) => void;
  onStoryModeEnd?: () => void;
  onCaptureToStory?: (imageUri: string, description: string, length: ResponseLength) => void;
  onSetupApiKey?: () => void;
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
  onSetupApiKey,
}: StoryDisplayProps) {
  const { theme } = useTheme();
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<ResponseLength>("short");
  const [storyMode, setStoryMode] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(30);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastSource, setLastSource] = useState<DescriptionSource | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [useVisionOnly, setUseVisionOnly] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const captureAndDescribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await onCapture(selectedLength, useVisionOnly);
      if (result) {
        setLastSource(result.source);
        animateWords(result.description);
        if (storyMode && onCaptureToStory) {
          onCaptureToStory(result.imageUri, result.description, selectedLength);
          setCaptureCount((prev) => prev + 1);
        }
        if (result.source === "apple" && !hasApiKey) {
          setTimeout(() => setShowUpgradePrompt(true), 2000);
        }
      } else {
        setError("Could not analyze scene");
      }
    } catch (err) {
      setError("Failed to capture scene");
    } finally {
      setIsLoading(false);
    }
  }, [onCapture, selectedLength, storyMode, onCaptureToStory, hasApiKey, useVisionOnly]);

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
              { backgroundColor: isLoading ? theme.backgroundDefault : "#10B981" },
            ]}
          >
            <Feather name="eye" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.captureBtnText}>
              {isLoading ? "..." : "Describe"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Mode toggle - only show when API key exists */}
      {hasApiKey && (
        <View style={[styles.modeRow, { backgroundColor: theme.backgroundDefault }]}>
          <Text style={[styles.modeLabel, { color: theme.textSecondary }]}>Mode:</Text>
          <Pressable
            onPress={() => setUseVisionOnly(false)}
            style={[
              styles.modeOption,
              {
                backgroundColor: !useVisionOnly ? theme.accent : "transparent",
                borderColor: theme.accent,
              },
            ]}
          >
            <Text style={[styles.modeOptionText, { color: !useVisionOnly ? "#FFFFFF" : theme.accent }]}>
              🧠 Enhanced
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setUseVisionOnly(true)}
            style={[
              styles.modeOption,
              {
                backgroundColor: useVisionOnly ? theme.primary : "transparent",
                borderColor: theme.primary,
              },
            ]}
          >
            <Text style={[styles.modeOptionText, { color: useVisionOnly ? "#FFFFFF" : theme.primary }]}>
              ⚡ Instant
            </Text>
          </Pressable>
        </View>
      )}

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
        {lastSource && displayedWords.length > 0 && (
          <View style={styles.sourceIndicator}>
            <Text
              style={[
                styles.sourceText,
                {
                  color: lastSource === "moondream" ? theme.accent : theme.primary,
                },
              ]}
            >
              {lastSource === "moondream" ? "🧠 Enhanced" : "⚡ Instant"}
            </Text>
          </View>
        )}
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
            Tap Describe to analyze scene
          </Text>
        )}
      </View>

      {/* Upgrade prompt */}
      {showUpgradePrompt && !hasApiKey && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.upgradePrompt, { backgroundColor: theme.accent + "15", borderColor: theme.accent + "30" }]}
        >
          <View style={styles.upgradeHeader}>
            <Feather name="zap" size={14} color={theme.accent} />
            <Text style={[styles.upgradeTitle, { color: theme.text }]}>
              Want more detailed descriptions?
            </Text>
            <Pressable onPress={() => setShowUpgradePrompt(false)} hitSlop={8}>
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>
          <Text style={[styles.upgradeDescription, { color: theme.textSecondary }]}>
            Add a Moondream API key for rich, natural language scene descriptions.
          </Text>
          <View style={styles.upgradeButtons}>
            {onSetupApiKey && (
              <Pressable
                onPress={onSetupApiKey}
                style={[styles.upgradeBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={styles.upgradeBtnText}>Add API Key</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => Linking.openURL("https://moondream.ai")}
              style={[styles.learnMoreBtn, { backgroundColor: theme.backgroundDefault }]}
            >
              <Text style={[styles.learnMoreText, { color: theme.textSecondary }]}>Learn More</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
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
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.sm,
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
  sourceIndicator: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: "600",
  },
  upgradePrompt: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  upgradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upgradeTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  upgradeDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  upgradeButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  upgradeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xs,
  },
  upgradeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  learnMoreBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xs,
  },
  learnMoreText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  modeOption: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  modeOptionText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
