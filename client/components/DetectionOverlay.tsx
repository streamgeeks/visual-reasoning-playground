import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { DetectionBox } from "@/lib/tracking";
import { Colors } from "@/constants/theme";

interface DetectionOverlayProps {
  detections: DetectionBox[];
  containerWidth: number;
  containerHeight: number;
}

interface DetectionBoxOverlayProps {
  box: { x_min: number; y_min: number; x_max: number; y_max: number };
  containerWidth: number;
  containerHeight: number;
  color?: string;
  isLocked?: boolean;
}

const CORNER_SIZE = 12;
const CORNER_THICKNESS = 2;

export function DetectionBoxOverlay({
  box,
  containerWidth,
  containerHeight,
  color = Colors.dark.warning,
  isLocked = false,
}: DetectionBoxOverlayProps) {
  const left = box.x_min * containerWidth;
  const top = box.y_min * containerHeight;
  const width = (box.x_max - box.x_min) * containerWidth;
  const height = (box.y_max - box.y_min) * containerHeight;
  const activeColor = isLocked ? Colors.dark.success : color;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={[styles.boxContainer, { left, top, width, height }]}
      pointerEvents="none"
    >
      <View style={[styles.lineH, { top: 0, left: 0, backgroundColor: activeColor }]} />
      <View style={[styles.lineV, { top: 0, left: 0, backgroundColor: activeColor }]} />
      
      <View style={[styles.lineH, { top: 0, right: 0, backgroundColor: activeColor }]} />
      <View style={[styles.lineV, { top: 0, right: 0, backgroundColor: activeColor }]} />
      
      <View style={[styles.lineH, { bottom: 0, left: 0, backgroundColor: activeColor }]} />
      <View style={[styles.lineV, { bottom: 0, left: 0, backgroundColor: activeColor }]} />
      
      <View style={[styles.lineH, { bottom: 0, right: 0, backgroundColor: activeColor }]} />
      <View style={[styles.lineV, { bottom: 0, right: 0, backgroundColor: activeColor }]} />
      
      {isLocked && (
        <View style={styles.centerMarker}>
          <View style={[styles.centerDot, { backgroundColor: activeColor }]} />
        </View>
      )}
    </Animated.View>
  );
}

export function DetectionOverlay({
  detections,
  containerWidth,
  containerHeight,
}: DetectionOverlayProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      {detections.map((detection, index) => {
        const box = {
          x_min: detection.x,
          y_min: detection.y,
          x_max: detection.x + detection.width,
          y_max: detection.y + detection.height,
        };

        return (
          <DetectionBoxOverlay
            key={`detection-${index}`}
            box={box}
            containerWidth={containerWidth}
            containerHeight={containerHeight}
            color={Colors.dark.primary}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  boxContainer: {
    position: "absolute",
  },
  lineH: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_THICKNESS,
  },
  lineV: {
    position: "absolute",
    width: CORNER_THICKNESS,
    height: CORNER_SIZE,
  },
  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -4,
    marginLeft: -4,
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
