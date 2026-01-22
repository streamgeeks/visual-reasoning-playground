import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TRACKING_MODELS } from "@/lib/tracking";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

export default function ModelInfoScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Available Models
      </ThemedText>

      {TRACKING_MODELS.map((model) => (
        <View
          key={model.id}
          style={[styles.modelCard, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={[styles.modelIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name={model.icon as any} size={24} color={theme.primary} />
          </View>
          <View style={styles.modelInfo}>
            <ThemedText type="h4" style={styles.modelName}>
              {model.name}
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.modelDescription, { color: theme.textSecondary }]}
            >
              {model.description}
            </ThemedText>
          </View>
        </View>
      ))}

      <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        About Visual Reasoning
      </ThemedText>

      <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 24 }}>
          Visual Reasoning combines computer vision models with AI inference to understand
          and track objects in real-time. These models run locally on your device for fast,
          private processing.
        </ThemedText>
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.infoRow}>
          <Feather name="zap" size={20} color={theme.primary} />
          <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.md }}>
            CoreML optimization for Apple Silicon
          </ThemedText>
        </View>
        <View style={styles.infoRow}>
          <Feather name="lock" size={20} color={theme.primary} />
          <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.md }}>
            100% on-device - no cloud required
          </ThemedText>
        </View>
        <View style={styles.infoRow}>
          <Feather name="cpu" size={20} color={theme.primary} />
          <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.md }}>
            YOLOv8 architecture for speed
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
  },
  modelCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  modelIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    marginBottom: Spacing.xs,
  },
  modelDescription: {
    lineHeight: 20,
  },
  infoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
});
