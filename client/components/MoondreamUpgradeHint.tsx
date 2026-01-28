import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import {
  shouldShowUpgradeHint,
  getRemainingFreeCalls,
  getFreeTierLimit,
} from "@/lib/bundledApiKey";

const HINT_DISMISSED_KEY = "moondream_hint_dismissed";
const HINT_DISMISS_DURATION_24_HOURS = 24 * 60 * 60 * 1000;

interface MoondreamUpgradeHintProps {
  variant?: "compact" | "full";
  context?: string;
  onSetupPress?: () => void;
  userApiKey?: string;
}

export function MoondreamUpgradeHint({
  variant = "compact",
  context,
  onSetupPress,
  userApiKey,
}: MoondreamUpgradeHintProps) {
  const { theme } = useTheme();
  const [shouldShow, setShouldShow] = useState(false);
  const [remainingCalls, setRemainingCalls] = useState(0);

  useEffect(() => {
    checkShouldShow();
  }, [userApiKey]);

  const checkShouldShow = async () => {
    try {
      const dismissedAt = await AsyncStorage.getItem(HINT_DISMISSED_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < HINT_DISMISS_DURATION_24_HOURS) {
          setShouldShow(false);
          return;
        }
      }

      const needsUpgrade = await shouldShowUpgradeHint(userApiKey);
      const remaining = await getRemainingFreeCalls();
      setRemainingCalls(remaining);
      setShouldShow(needsUpgrade);
    } catch {
      setShouldShow(false);
    }
  };

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(HINT_DISMISSED_KEY, Date.now().toString());
    } catch {}
  };

  const handleSetup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onSetupPress) {
      onSetupPress();
    }
  };

  const handleLearnMore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("https://moondream.ai");
  };

  if (!shouldShow) return null;

  if (variant === "compact") {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={[
          styles.compactContainer,
          {
            backgroundColor: theme.accent + "15",
            borderColor: theme.accent + "30",
          },
        ]}
      >
        <Feather name="zap" size={14} color={theme.accent} />
        <Text style={[styles.compactText, { color: theme.text }]}>
          <Text style={{ fontWeight: "600" }}>Free tier used!</Text> Add your
          own Moondream API key to continue using cloud AI
        </Text>
        <Pressable onPress={handleDismiss} hitSlop={8}>
          <Feather name="x" size={14} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.fullContainer,
        {
          backgroundColor: theme.accent + "10",
          borderColor: theme.accent + "25",
        },
      ]}
    >
      <View style={styles.fullHeader}>
        <View
          style={[styles.iconBadge, { backgroundColor: theme.accent + "20" }]}
        >
          <Feather name="cloud" size={18} color={theme.accent} />
        </View>
        <View style={styles.fullContent}>
          <Text style={[styles.fullTitle, { color: theme.text }]}>
            Get better results with Moondream
          </Text>
          <Text
            style={[styles.fullDescription, { color: theme.textSecondary }]}
          >
            {context ||
              "On-device detection is fast but limited to common objects. Moondream AI can understand custom descriptions and provide richer scene analysis."}
          </Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          style={[
            styles.dismissButton,
            { backgroundColor: theme.backgroundSecondary },
          ]}
          hitSlop={8}
        >
          <Feather name="x" size={14} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.fullActions}>
        {onSetupPress && (
          <Pressable
            onPress={handleSetup}
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          >
            <Feather name="key" size={14} color="#FFF" />
            <Text style={styles.primaryButtonText}>Add API Key</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleLearnMore}
          style={[styles.secondaryButton, { borderColor: theme.accent + "50" }]}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>
            Learn More
          </Text>
        </Pressable>
      </View>

      <View
        style={[styles.benefitsList, { borderTopColor: theme.accent + "20" }]}
      >
        <View style={styles.benefitItem}>
          <Feather name="check" size={12} color={theme.success} />
          <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
            Find any object by description
          </Text>
        </View>
        <View style={styles.benefitItem}>
          <Feather name="check" size={12} color={theme.success} />
          <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
            Natural language scene descriptions
          </Text>
        </View>
        <View style={styles.benefitItem}>
          <Feather name="check" size={12} color={theme.success} />
          <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
            Free tier available
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  compactText: {
    flex: 1,
    fontSize: Typography.small.fontSize,
  },
  fullContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  fullHeader: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  fullContent: {
    flex: 1,
    gap: 4,
  },
  fullTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  fullDescription: {
    fontSize: Typography.small.fontSize,
    lineHeight: 18,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  fullActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  benefitsList: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: 6,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  benefitText: {
    fontSize: Typography.small.fontSize,
  },
});
