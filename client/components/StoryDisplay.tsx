import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Pressable, Switch, Linking, ScrollView, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { TappableWord } from "./TappableWord";
import { InterestingObject } from "@/lib/moondream";

export type ResponseLength = "short" | "medium" | "long";
export type DescriptionSource = "apple" | "moondream";

export interface CaptureResult {
  description: string;
  imageUri: string;
  source: DescriptionSource;
}

export interface DetectedObject extends InterestingObject {
  revealed: boolean;
}

export type DescriptionMode = "auto" | "vision" | "moondream";

export interface RevealedObject extends InterestingObject {
  color: string;
}

interface StoryDisplayProps {
  onCapture: (length: ResponseLength, forceVision?: boolean) => Promise<CaptureResult | null>;
  hasApiKey: boolean;
  onStoryModeStart?: (intervalSeconds: number) => void;
  onStoryModeEnd?: () => void;
  onCaptureToStory?: (imageUri: string, description: string, length: ResponseLength) => void;
  onSetupApiKey?: () => void;
  detectedObjects?: InterestingObject[];
  onObjectRevealed?: (object: InterestingObject | null) => void;
  onObjectsRevealed?: (objects: RevealedObject[]) => void;
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

const STREAMING_DELAY_MS = 40;
const MAX_SELECTIONS = 5;

const OBJECT_COLORS = [
  "#6B8E9F",
  "#9F8B6B",
  "#8B6B9F",
  "#6B9F7A",
  "#9F6B7A",
];

const SKIP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "need", "dare", "ought", "used",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into",
  "through", "during", "before", "after", "above", "below", "between",
  "under", "over", "out", "off", "up", "down", "and", "but", "or", "nor",
  "so", "yet", "both", "either", "neither", "not", "only", "own", "same",
  "than", "too", "very", "just", "also", "now", "here", "there", "when",
  "where", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "no", "any", "many", "much",
  "dark", "light", "bright", "dim", "large", "small", "big", "little",
  "tall", "short", "long", "wide", "narrow", "thick", "thin", "heavy",
  "old", "new", "young", "good", "bad", "great", "high", "low", "left",
  "right", "top", "bottom", "front", "back", "near", "far", "close",
  "open", "closed", "full", "empty", "hot", "cold", "warm", "cool",
  "soft", "hard", "wet", "dry", "clean", "dirty", "fast", "slow",
  "white", "black", "red", "blue", "green", "yellow", "brown", "gray",
  "grey", "orange", "pink", "purple", "golden", "silver", "wooden",
  "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
  "what", "which", "who", "whom", "whose", "image", "picture", "photo",
  "scene", "view", "background", "foreground", "area", "space", "side",
  "part", "piece", "bit", "lot", "way", "thing", "something", "nothing",
  "one", "two", "three", "four", "five", "several", "many", "few",
]);

function getSignificantWord(objectName: string): string | null {
  const words = objectName.toLowerCase().split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i].replace(/[^a-z]/g, "");
    if (word.length >= 3 && !SKIP_WORDS.has(word)) {
      return word;
    }
  }
  return null;
}

export function StoryDisplay({
  onCapture,
  hasApiKey,
  onStoryModeStart,
  onStoryModeEnd,
  onCaptureToStory,
  onSetupApiKey,
  detectedObjects = [],
  onObjectRevealed,
  onObjectsRevealed,
}: StoryDisplayProps) {
  const { theme, isDark } = useTheme();
  const [descriptionText, setDescriptionText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<ResponseLength>("short");
  const [storyMode, setStoryMode] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(30);
  const [captureCount, setCaptureCount] = useState(0);
  const [lastSource, setLastSource] = useState<DescriptionSource | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [useVisionOnly, setUseVisionOnly] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [visibleWordCount, setVisibleWordCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamingRef = useRef<NodeJS.Timeout | null>(null);
  const loadingDotAnim = useRef(new Animated.Value(0)).current;

  const objectColorMap = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    objectColorMap.current.clear();
    detectedObjects.forEach((_, index) => {
      objectColorMap.current.set(index, OBJECT_COLORS[index % OBJECT_COLORS.length]);
    });
  }, [detectedObjects]);

  const getObjectColor = useCallback((objectIndex: number): string => {
    return objectColorMap.current.get(objectIndex) || OBJECT_COLORS[0];
  }, []);

  useEffect(() => {
    if (isLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(loadingDotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(loadingDotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLoading]);

  const findMatchingObject = useCallback((word: string): { object: InterestingObject; index: number } | null => {
    if (!word) return null;
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!cleanWord || cleanWord.length < 3 || SKIP_WORDS.has(cleanWord)) return null;
    
    for (let i = 0; i < detectedObjects.length; i++) {
      const obj = detectedObjects[i];
      if (!obj?.name) continue;
      
      const significantWord = getSignificantWord(obj.name);
      if (significantWord && (cleanWord === significantWord || 
          (cleanWord.length >= 4 && significantWord.includes(cleanWord)) ||
          (cleanWord.length >= 4 && cleanWord.includes(significantWord)))) {
        return { object: obj, index: i };
      }
    }
    return null;
  }, [detectedObjects]);

  const notifyRevealedObjects = useCallback((indices: Set<number>) => {
    const revealed: RevealedObject[] = [];
    indices.forEach(index => {
      const obj = detectedObjects[index];
      if (obj) {
        revealed.push({
          ...obj,
          color: getObjectColor(index),
        });
      }
    });
    
    onObjectsRevealed?.(revealed);
    
    if (onObjectRevealed) {
      if (revealed.length > 0) {
        onObjectRevealed(revealed[revealed.length - 1]);
      } else {
        onObjectRevealed(null);
      }
    }
  }, [detectedObjects, getObjectColor, onObjectRevealed, onObjectsRevealed]);

  const handleWordTap = useCallback((objectIndex: number) => {
    setRevealedIndices(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(objectIndex)) {
        newSet.delete(objectIndex);
      } else {
        if (newSet.size >= MAX_SELECTIONS) {
          const firstItem = newSet.values().next().value;
          if (firstItem !== undefined) {
            newSet.delete(firstItem);
          }
        }
        newSet.add(objectIndex);
      }
      
      setTimeout(() => notifyRevealedObjects(newSet), 0);
      return newSet;
    });
  }, [notifyRevealedObjects]);

  const handleChipTap = useCallback((objectIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleWordTap(objectIndex);
  }, [handleWordTap]);

  useEffect(() => {
    setRevealedIndices(new Set());
    notifyRevealedObjects(new Set());
  }, [detectedObjects]);

  const startStreamingEffect = useCallback((text: string) => {
    const words = text.split(" ");
    setVisibleWordCount(0);
    setIsStreaming(true);
    
    if (streamingRef.current) {
      clearInterval(streamingRef.current);
    }

    let count = 0;
    streamingRef.current = setInterval(() => {
      count++;
      setVisibleWordCount(count);
      if (count >= words.length) {
        if (streamingRef.current) {
          clearInterval(streamingRef.current);
          streamingRef.current = null;
        }
        setIsStreaming(false);
      }
    }, STREAMING_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (streamingRef.current) {
        clearInterval(streamingRef.current);
      }
    };
  }, []);

  const captureAndDescribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await onCapture(selectedLength, useVisionOnly);
      if (result) {
        setLastSource(result.source);
        setDescriptionText(result.description);
        startStreamingEffect(result.description);
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
  }, [onCapture, selectedLength, storyMode, onCaptureToStory, hasApiKey, useVisionOnly, startStreamingEffect]);

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
    };
  }, [storyMode, hasApiKey, selectedInterval]);

  const handleSingleCapture = () => {
    if (!isLoading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      captureAndDescribe();
    }
  };

  const toggleStoryMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const words = descriptionText.split(" ");
  const cardBg = isDark ? theme.backgroundDefault : theme.backgroundRoot;
  const shadowStyle = isDark ? {} : styles.cardShadow;

  return (
    <View style={styles.wrapper}>
      <View style={styles.controlsRow}>
        <View style={styles.lengthSelector}>
          {LENGTH_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedLength(option.key);
              }}
              style={[
                styles.lengthOption,
                {
                  backgroundColor:
                    selectedLength === option.key
                      ? theme.primary
                      : isDark ? theme.backgroundDefault : theme.backgroundRoot,
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

      {hasApiKey && (
        <View style={[styles.modeRow, { backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot }]}>
          <Text style={[styles.modeLabel, { color: theme.textSecondary }]}>Mode:</Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setUseVisionOnly(false);
            }}
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
            onPress={() => {
              Haptics.selectionAsync();
              setUseVisionOnly(true);
            }}
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

      <View style={[styles.storyRow, { backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot }]}>
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
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedInterval(option.seconds);
              }}
              disabled={storyMode}
              style={[
                styles.intervalChip,
                {
                  backgroundColor:
                    selectedInterval === option.seconds
                      ? theme.primary
                      : isDark ? theme.backgroundRoot : theme.backgroundDefault,
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

      <View style={[styles.container, { backgroundColor: cardBg }, shadowStyle]}>
        {lastSource && descriptionText && (
          <View style={styles.sourceIndicator}>
            <View style={[
              styles.sourceBadge,
              { backgroundColor: (lastSource === "moondream" ? theme.accent : theme.primary) + "20" }
            ]}>
              <Text
                style={[
                  styles.sourceText,
                  { color: lastSource === "moondream" ? theme.accent : theme.primary },
                ]}
              >
                {lastSource === "moondream" ? "🧠 Enhanced" : "⚡ Instant"}
              </Text>
            </View>
          </View>
        )}
        
        {isLoading && !descriptionText ? (
          <View style={styles.loadingContainer}>
            <Animated.View 
              style={[
                styles.loadingDot, 
                { 
                  backgroundColor: theme.primary,
                  opacity: loadingDotAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [{
                    scale: loadingDotAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    }),
                  }],
                }
              ]} 
            />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Observing...
            </Text>
          </View>
        ) : error && !descriptionText ? (
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        ) : descriptionText ? (
          <Text style={styles.storyText}>
            {words.map((word, index) => {
              const match = findMatchingObject(word);
              const isVisible = index < visibleWordCount;
              const isRevealed = match ? revealedIndices.has(match.index) : false;
              const wordColor = match ? getObjectColor(match.index) : undefined;
              
              return (
                <TappableWord
                  key={`${index}-${word}`}
                  word={word}
                  isInteractive={!!match}
                  isRevealed={isRevealed}
                  onPress={() => match && handleWordTap(match.index)}
                  isVisible={isVisible}
                  color={match ? wordColor : undefined}
                />
              );
            })}
          </Text>
        ) : (
          <View style={styles.placeholderContainer}>
            <Feather name="eye" size={24} color={theme.textSecondary + "60"} />
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
              Tap Describe to analyze scene
            </Text>
          </View>
        )}
        
        {descriptionText && detectedObjects.length > 0 && revealedIndices.size === 0 && !isStreaming && (
          <View style={[styles.tapHint, { backgroundColor: theme.accent + "10" }]}>
            <Feather name="mouse-pointer" size={12} color={theme.accent} />
            <Text style={[styles.tapHintText, { color: theme.accent }]}>
              Tap colored words to locate objects
            </Text>
          </View>
        )}
      </View>

      {descriptionText && detectedObjects.length > 0 && (
        <View style={styles.chipsSection}>
          <View style={styles.chipsHeader}>
            <Feather name="target" size={12} color={theme.textSecondary} />
            <Text style={[styles.chipsTitle, { color: theme.textSecondary }]}>
              Detected Objects
            </Text>
            <Text style={[styles.chipsCount, { color: theme.textSecondary }]}>
              {revealedIndices.size}/{MAX_SELECTIONS}
            </Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {detectedObjects.map((obj, index) => {
              const isRevealed = revealedIndices.has(index);
              const chipColor = getObjectColor(index);
              return (
                <Pressable
                  key={`${obj.name}-${index}`}
                  onPress={() => handleChipTap(index)}
                  style={[
                    styles.objectChip,
                    {
                      backgroundColor: isRevealed 
                        ? chipColor + "20" 
                        : isDark ? theme.backgroundDefault : theme.backgroundRoot,
                      borderColor: isRevealed ? chipColor : theme.textSecondary + "30",
                    },
                  ]}
                >
                  <View style={[
                    styles.chipDot,
                    { backgroundColor: chipColor }
                  ]} />
                  <Text style={[
                    styles.chipText,
                    { color: isRevealed ? chipColor : theme.text }
                  ]}>
                    {obj.name}
                  </Text>
                  {isRevealed && (
                    <Feather name="check" size={12} color={chipColor} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {showUpgradePrompt && !hasApiKey && (
        <View
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
        </View>
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
    minHeight: 120,
    justifyContent: "center",
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  placeholderContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  placeholderText: {
    fontSize: 13,
    textAlign: "center",
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
  sourceIndicator: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: "600",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  tapHintText: {
    fontSize: 11,
    fontWeight: "500",
  },
  chipsSection: {
    gap: Spacing.xs,
  },
  chipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  chipsTitle: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  chipsCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  objectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
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
