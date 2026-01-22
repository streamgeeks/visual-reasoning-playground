import React from "react";
import { View, StyleSheet, Pressable, Text, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { TrackingModel, TRACKING_MODELS, getModelInfo } from "@/lib/tracking";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface ModelSelectorProps {
  selectedModel: TrackingModel;
  isTracking: boolean;
  onModelChange: (model: TrackingModel) => void;
  onToggleTracking: () => void;
  onShowInfo: () => void;
}

export function ModelSelector({
  selectedModel,
  isTracking,
  onModelChange,
  onToggleTracking,
  onShowInfo,
}: ModelSelectorProps) {
  const { theme, isDark } = useTheme();
  const modelInfo = getModelInfo(selectedModel);

  const handleToggleTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleTracking();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Tracking Model</Text>
        <Pressable
          onPress={onShowInfo}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Feather name="info" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.controls}>
        <View style={[styles.modelPicker, { backgroundColor: theme.backgroundSecondary }]}>
          {TRACKING_MODELS.map((model) => (
            <Pressable
              key={model.id}
              onPress={() => {
                Haptics.selectionAsync();
                onModelChange(model.id);
              }}
              style={[
                styles.modelOption,
                selectedModel === model.id && {
                  backgroundColor: theme.primary,
                },
              ]}
            >
              <Feather
                name={model.icon as any}
                size={16}
                color={selectedModel === model.id ? "#FFFFFF" : theme.textSecondary}
              />
            </Pressable>
          ))}
        </View>

        <Text style={[styles.modelName, { color: theme.textSecondary }]}>
          {modelInfo.name}
        </Text>

        <Pressable
          onPress={handleToggleTracking}
          style={({ pressed }) => [
            styles.trackButton,
            {
              backgroundColor: isTracking ? theme.error : theme.success,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Feather
            name={isTracking ? "stop-circle" : "play-circle"}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.trackButtonText}>{isTracking ? "Stop" : "Track"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  modelPicker: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  modelOption: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  modelName: {
    flex: 1,
    fontSize: Typography.small.fontSize,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  trackButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
});
