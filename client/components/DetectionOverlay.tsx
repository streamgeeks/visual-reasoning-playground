import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { DetectionBox } from "@/lib/tracking";
import { Colors, Typography, BorderRadius } from "@/constants/theme";

interface DetectionOverlayProps {
  detections: DetectionBox[];
  containerWidth: number;
  containerHeight: number;
}

const DETECTION_COLORS: Record<string, string> = {
  person: Colors.dark.primary,
  face: Colors.dark.success,
  ball: Colors.dark.warning,
  object: Colors.dark.accent,
};

export function DetectionOverlay({
  detections,
  containerWidth,
  containerHeight,
}: DetectionOverlayProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      {detections.map((detection, index) => {
        const left = detection.x * containerWidth;
        const top = detection.y * containerHeight;
        const width = detection.width * containerWidth;
        const height = detection.height * containerHeight;
        const color = DETECTION_COLORS[detection.label] || Colors.dark.primary;

        return (
          <Animated.View
            key={`detection-${index}`}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[
              styles.detectionBox,
              {
                left,
                top,
                width,
                height,
                borderColor: color,
              },
            ]}
          >
            <View style={[styles.labelContainer, { backgroundColor: color }]}>
              <Text style={styles.labelText}>
                {detection.label} {(detection.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  detectionBox: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: BorderRadius.xs,
  },
  labelContainer: {
    position: "absolute",
    top: -20,
    left: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
});
