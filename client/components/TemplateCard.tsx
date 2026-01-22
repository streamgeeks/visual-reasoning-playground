import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { PresetTemplate } from "@/lib/presetTemplates";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

interface TemplateCardProps {
  template: PresetTemplate;
  onPress: () => void;
  index: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TEMPLATE_ICONS: Record<string, string> = {
  basketball: "target",
  interview: "users",
  classroom: "book-open",
  stage: "video",
};

export function TemplateCard({ template, onPress, index }: TemplateCardProps) {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
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
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
          <Feather
            name={(TEMPLATE_ICONS[template.type] || "grid") as any}
            size={28}
            color={theme.primary}
          />
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]}>{template.name}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {template.presetNames.length} presets
          </Text>
          <Text
            style={[styles.presetList, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {template.presetNames.join(", ")}
          </Text>
        </View>

        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  iconContainer: {
    width: 56,
    height: 56,
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
    marginBottom: 2,
  },
  description: {
    fontSize: Typography.small.fontSize,
    marginBottom: 2,
  },
  presetList: {
    fontSize: Typography.caption.fontSize,
  },
});
