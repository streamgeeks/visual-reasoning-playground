import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface SceneDescriptionProps {
  description: string | null;
  isLoading: boolean;
  onCapture: () => void;
  error: string | null;
}

export function SceneDescription({
  description,
  isLoading,
  onCapture,
  error,
}: SceneDescriptionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onCapture}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.captureButton,
          {
            backgroundColor: isLoading ? theme.backgroundDefault : theme.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Feather name="eye" size={20} color="#FFFFFF" />
        )}
        <Text
          style={[
            styles.captureButtonText,
            { color: isLoading ? theme.textSecondary : "#FFFFFF" },
          ]}
        >
          {isLoading ? "Analyzing Scene..." : "Describe What I See"}
        </Text>
      </Pressable>

      {error ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.errorContainer, { backgroundColor: theme.error + "20" }]}
        >
          <Feather name="alert-circle" size={16} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </Animated.View>
      ) : null}

      {description ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.storyContainer, { backgroundColor: theme.backgroundRoot }]}
        >
          <View style={styles.storyHeader}>
            <View style={[styles.aiIcon, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="cpu" size={14} color={theme.primary} />
            </View>
            <Text style={[styles.storyLabel, { color: theme.textSecondary }]}>
              Scene Analysis
            </Text>
          </View>
          <ScrollView style={styles.storyScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.storyText, { color: theme.text }]}>
              {description}
            </Text>
          </ScrollView>
        </Animated.View>
      ) : !isLoading && !error ? (
        <View style={[styles.emptyState, { backgroundColor: theme.backgroundRoot }]}>
          <Feather name="image" size={32} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Tap the button above to have AI describe what's in view
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
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
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  storyContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    maxHeight: 200,
  },
  storyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  aiIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  storyLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  storyScroll: {
    maxHeight: 140,
  },
  storyText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 24,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
    maxWidth: 240,
  },
});
