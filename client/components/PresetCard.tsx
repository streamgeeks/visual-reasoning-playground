import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { PTZPreset } from "@/lib/storage";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

interface PresetCardProps {
  preset: PTZPreset;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PresetCard({ preset, onPress, onDelete, index }: PresetCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  };

  return (
    <Animated.View entering={FadeIn.delay(index * 50).duration(300)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="crosshair" size={24} color={theme.primary} />
          </View>

          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.text }]}>{preset.name}</Text>
            <View style={styles.positionRow}>
              <Text style={[styles.positionText, { color: theme.textSecondary }]}>
                P: {preset.pan}
              </Text>
              <Text style={[styles.positionText, { color: theme.textSecondary }]}>
                T: {preset.tilt}
              </Text>
              <Text style={[styles.positionText, { color: theme.textSecondary }]}>
                Z: {preset.zoom}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleDelete}
            hitSlop={12}
            style={({ pressed }) => [
              styles.deleteButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Feather name="trash-2" size={18} color={theme.error} />
          </Pressable>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: 4,
  },
  positionRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  positionText: {
    fontSize: Typography.small.fontSize,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
});
