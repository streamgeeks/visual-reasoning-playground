import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface ToolSectionProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}

export function ToolSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  badge,
}: ToolSectionProps) {
  const { theme } = useTheme();
  const rotation = useSharedValue(isExpanded ? 1 : 0);

  React.useEffect(() => {
    rotation.value = withTiming(isExpanded ? 1 : 0, { duration: 200 });
  }, [isExpanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.header,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
            <Feather name={icon} size={18} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={20} color={theme.textSecondary} />
        </Animated.View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.content}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    padding: Spacing.md,
    paddingTop: 0,
  },
});
