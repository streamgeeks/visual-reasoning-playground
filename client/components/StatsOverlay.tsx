import React from "react";
import { View, StyleSheet } from "react-native";
import { StatRow } from "@/components/StatRow";
import { PerformanceStats } from "@/lib/tracking";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface StatsOverlayProps {
  stats: PerformanceStats;
  cameraName?: string;
}

export function StatsOverlay({ stats, cameraName }: StatsOverlayProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {cameraName ? <StatRow label="Camera" value={cameraName} /> : null}
      <StatRow label="Model" value={stats.modelName} />
      <StatRow label="FPS" value={stats.fps.toFixed(1)} />
      <StatRow label="Inference" value={`${stats.inferenceTime.toFixed(0)}ms`} />
      <StatRow label="Confidence" value={stats.confidence.toFixed(2)} />
      <StatRow label="Latency" value={`${stats.latency.toFixed(0)}ms`} />
      <StatRow label="Objects" value={stats.objectCount.toString()} />
      <StatRow label="Bitrate" value={`${stats.bitrate.toFixed(1)} Mbps`} />
      {stats.droppedFrames > 0 ? (
        <StatRow
          label="Dropped"
          value={stats.droppedFrames.toString()}
          color={Colors.dark.error}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: BorderRadius.xs,
    gap: 2,
  },
});
