import React from "react";
import { View, StyleSheet } from "react-native";
import { StatRow } from "@/components/StatRow";
import { PerformanceStats } from "@/lib/tracking";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface StatsOverlayProps {
  stats: PerformanceStats;
  cameraName?: string;
  cameraFps?: number;
  cameraConnected?: boolean;
  streamMode?: "rtsp" | "snapshot" | "mjpeg";
}

export function StatsOverlay({ stats, cameraName, cameraFps, cameraConnected, streamMode }: StatsOverlayProps) {
  const { theme } = useTheme();
  
  const displayFps = cameraConnected && cameraFps !== undefined ? cameraFps : stats.fps;
  
  const getModeLabel = () => {
    if (!streamMode) return "N/A";
    switch (streamMode) {
      case "rtsp": return "RTSP (High FPS)";
      case "mjpeg": return "MJPEG";
      case "snapshot": return "Snapshot (Low FPS)";
    }
  };
  
  const getModeColor = () => {
    if (streamMode === "rtsp") return Colors.dark.success;
    if (streamMode === "snapshot") return Colors.dark.warning;
    return Colors.dark.primary;
  };

  return (
    <View style={styles.container}>
      {cameraName ? <StatRow label="Camera" value={cameraName} /> : null}
      {cameraConnected ? (
        <StatRow label="Status" value="LIVE" color={Colors.dark.success} />
      ) : null}
      {cameraConnected && streamMode ? (
        <StatRow label="Mode" value={getModeLabel()} color={getModeColor()} />
      ) : null}
      <StatRow label="Model" value={stats.modelName} />
      <StatRow label="Stream FPS" value={displayFps.toFixed(1)} color={cameraConnected ? getModeColor() : undefined} />
      <StatRow label="Inference" value={`${stats.inferenceTime.toFixed(0)}ms`} />
      <StatRow label="Confidence" value={stats.confidence.toFixed(2)} />
      <StatRow label="Latency" value={`${stats.latency.toFixed(0)}ms`} />
      <StatRow label="Objects" value={stats.objectCount.toString()} />
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
