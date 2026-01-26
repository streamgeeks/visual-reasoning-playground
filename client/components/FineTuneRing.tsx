import React, { useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { PtzDirection } from "@/lib/camera";

interface FineTuneRingProps {
  size: number;
  innerRadius: number;
  onFineTune: (direction: PtzDirection) => void;
  disabled?: boolean;
}

type Direction = "up" | "down" | "left" | "right" | "upleft" | "upright" | "downleft" | "downright";

const DIRECTIONS: Direction[] = [
  "up",
  "upright", 
  "right",
  "downright",
  "down",
  "downleft",
  "left",
  "upleft",
];

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);

  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    "M", outerStart.x, outerStart.y,
    "A", outerR, outerR, 0, largeArc, 1, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerR, innerR, 0, largeArc, 0, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
}

export function FineTuneRing({ size, innerRadius, onFineTune, disabled = false }: FineTuneRingProps) {
  const { theme } = useTheme();
  
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 2;
  const segmentAngle = 360 / 8;
  const gapAngle = 3;

  const handlePress = useCallback((direction: Direction) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFineTune(direction);
  }, [onFineTune, disabled]);

  const segments = DIRECTIONS.map((direction, index) => {
    const startAngle = index * segmentAngle + gapAngle / 2;
    const endAngle = (index + 1) * segmentAngle - gapAngle / 2;
    const pathD = describeArc(cx, cy, innerRadius, outerRadius, startAngle, endAngle);

    return (
      <Path
        key={direction}
        d={pathD}
        fill={theme.backgroundSecondary}
        stroke={theme.textSecondary}
        strokeWidth={1}
        opacity={disabled ? 0.3 : 0.7}
        onPress={() => handlePress(direction)}
      />
    );
  });

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="box-none">
      <Svg width={size} height={size} style={styles.svg}>
        <G>{segments}</G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    position: "absolute",
  },
});
