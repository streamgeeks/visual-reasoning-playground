import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface ToolHeaderProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
  onBack: () => void;
  onInfoPress?: () => void;
}

export function ToolHeader({
  title,
  icon,
  iconColor,
  badge,
  badgeColor,
  onBack,
  onInfoPress,
}: ToolHeaderProps) {
  const { theme } = useTheme();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const handleInfo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onInfoPress?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderBottomColor: theme.backgroundDefault,
        },
      ]}
    >
      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [
          styles.backButton,
          { opacity: pressed ? 0.6 : 1 },
        ]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="chevron-left" size={28} color={theme.primary} />
      </Pressable>

      <View style={styles.titleContainer}>
        <Feather
          name={icon}
          size={20}
          color={iconColor || theme.primary}
          style={styles.titleIcon}
        />
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        {badge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: (badgeColor || theme.primary) + "20" },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: badgeColor || theme.primary },
              ]}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>

      {onInfoPress ? (
        <Pressable
          onPress={handleInfo}
          style={({ pressed }) => [
            styles.infoButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="info" size={18} color={theme.textSecondary} />
        </Pressable>
      ) : (
        <View style={styles.rightSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  titleIcon: {
    marginRight: 2,
  },
  title: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  rightSpacer: {
    width: 36,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
