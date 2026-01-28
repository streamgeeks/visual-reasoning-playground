import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useCloudActivity, formatDataSize } from "@/lib/cloudActivityContext";
import { getSecuritySettings } from "@/lib/storage";
import { BorderRadius, Typography } from "@/constants/theme";

interface CloudActivityIndicatorProps {
  showStats?: boolean;
  compact?: boolean;
}

export function CloudActivityIndicator({ showStats = false, compact = false }: CloudActivityIndicatorProps) {
  const { theme } = useTheme();
  const { isActive, currentActivity, stats } = useCloudActivity();
  const [showIndicator, setShowIndicator] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    getSecuritySettings().then((settings) => {
      setShowIndicator(settings.showCloudIndicator);
    });
  }, []);

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, pulseAnim]);

  if (!showIndicator && !isActive) {
    return null;
  }

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: isActive ? theme.warning + "20" : theme.success + "20" }]}>
        <Animated.View style={{ opacity: isActive ? pulseAnim : 1 }}>
          <Feather
            name={isActive ? "upload-cloud" : "shield"}
            size={14}
            color={isActive ? theme.warning : theme.success}
          />
        </Animated.View>
        <Text style={[styles.compactText, { color: isActive ? theme.warning : theme.success }]}>
          {isActive ? "Cloud" : "Local"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.statusRow}>
        <Animated.View style={[styles.iconContainer, { backgroundColor: (isActive ? theme.warning : theme.success) + "20", opacity: isActive ? pulseAnim : 1 }]}>
          <Feather
            name={isActive ? "upload-cloud" : "shield"}
            size={18}
            color={isActive ? theme.warning : theme.success}
          />
        </Animated.View>
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: theme.text }]}>
            {isActive ? "Sending to Cloud" : "Processing Locally"}
          </Text>
          {isActive && currentActivity?.description && (
            <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
              {currentActivity.description}
            </Text>
          )}
          {!isActive && (
            <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
              All AI runs on-device
            </Text>
          )}
        </View>
      </View>

      {showStats && (
        <View style={[styles.statsContainer, { borderTopColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalRequests}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Requests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatDataSize(stats.totalDataSentBytes)}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Data Sent</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function PrivacyModeIndicator() {
  const { theme } = useTheme();
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    getSecuritySettings().then((settings) => {
      setPrivacyMode(settings.privacyModeEnabled);
    });
  }, []);

  if (!privacyMode) {
    return null;
  }

  return (
    <View style={[styles.privacyBadge, { backgroundColor: theme.success + "20" }]}>
      <Feather name="shield" size={12} color={theme.success} />
      <Text style={[styles.privacyText, { color: theme.success }]}>Privacy Mode</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  descriptionText: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  statValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  compactText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  privacyText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
});
