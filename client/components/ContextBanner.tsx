import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";
import { TrackingState } from "@/lib/trackingService";

interface ContextBannerProps {
  trackingState: TrackingState | null;
  isTracking: boolean;
  cameraName: string;
  fps: number;
  ptzConnected: boolean;
}

export function ContextBanner({
  trackingState,
  isTracking,
  cameraName,
  fps,
  ptzConnected,
}: ContextBannerProps) {
  const { theme } = useTheme();

  const getTrackingStatus = () => {
    if (!isTracking) {
      return { text: "READY", color: theme.textSecondary, icon: "circle" as const };
    }
    if (!trackingState?.lastDetection?.found) {
      return { text: "SEARCHING", color: theme.warning, icon: "search" as const };
    }
    if (trackingState.inDeadzone) {
      return { text: "LOCKED", color: theme.success, icon: "check-circle" as const };
    }
    return { text: "TRACKING", color: theme.primary, icon: "crosshair" as const };
  };

  const status = getTrackingStatus();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault + "E6" }]}>
      <View style={styles.section}>
        <Feather name={status.icon} size={12} color={status.color} />
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.text}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.textSecondary + "40" }]} />

      <View style={styles.section}>
        <Feather
          name={ptzConnected ? "video" : "smartphone"}
          size={12}
          color={theme.textSecondary}
        />
        <Text
          style={[styles.cameraText, { color: theme.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {cameraName}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.textSecondary + "40" }]} />

      <View style={styles.section}>
        <Feather name="activity" size={12} color={theme.textSecondary} />
        <Text style={[styles.fpsText, { color: theme.text }]}>
          {fps > 0 ? `${fps} FPS` : "-- FPS"}
        </Text>
      </View>
    </View>
  );
}

const BANNER_HEIGHT = 40;

const styles = StyleSheet.create({
  container: {
    height: BANNER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  divider: {
    width: 1,
    height: 20,
    marginHorizontal: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  cameraText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
    flex: 1,
  },
  fpsText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
});
