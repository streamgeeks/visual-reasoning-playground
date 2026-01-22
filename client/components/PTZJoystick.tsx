import React, { useState, useCallback } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

interface PTZJoystickProps {
  onMove: (pan: number, tilt: number) => void;
  onZoom: (zoom: number) => void;
  onQuickAction: (action: "home" | "center" | "wide") => void;
  currentZoom: number;
}

const JOYSTICK_SIZE = 160;
const HANDLE_SIZE = 56;
const MAX_OFFSET = (JOYSTICK_SIZE - HANDLE_SIZE) / 2;

export function PTZJoystick({ onMove, onZoom, onQuickAction, currentZoom }: PTZJoystickProps) {
  const { theme, isDark } = useTheme();
  const [isDragging, setIsDragging] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const handleScale = useSharedValue(1);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePanUpdate = useCallback(
    (x: number, y: number) => {
      const panValue = Math.round((x / MAX_OFFSET) * 100);
      const tiltValue = Math.round((-y / MAX_OFFSET) * 100);
      onMove(panValue, tiltValue);
    },
    [onMove]
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      handleScale.value = withSpring(1.1, { damping: 15 });
      runOnJS(setIsDragging)(true);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      const x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, event.translationX));
      const y = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, event.translationY));
      translateX.value = x;
      translateY.value = y;
      runOnJS(handlePanUpdate)(x, y);
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { damping: 15 });
      translateY.value = withSpring(0, { damping: 15 });
      handleScale.value = withSpring(1, { damping: 15 });
      runOnJS(setIsDragging)(false);
      runOnJS(onMove)(0, 0);
    });

  const handleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: handleScale.value },
    ],
  }));

  const handleZoomIn = useCallback(() => {
    triggerHaptic();
    onZoom(Math.min(100, currentZoom + 10));
  }, [currentZoom, onZoom, triggerHaptic]);

  const handleZoomOut = useCallback(() => {
    triggerHaptic();
    onZoom(Math.max(0, currentZoom - 10));
  }, [currentZoom, onZoom, triggerHaptic]);

  const handleQuickAction = useCallback(
    (action: "home" | "center" | "wide") => {
      triggerHaptic();
      onQuickAction(action);
    },
    [onQuickAction, triggerHaptic]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceOverlay }]}>
      <View style={styles.controlsRow}>
        {/* Joystick */}
        <View style={styles.joystickContainer}>
          <View style={[styles.joystickTrack, { borderColor: theme.textSecondary }]}>
            {/* Crosshair lines */}
            <View style={[styles.crosshairH, { backgroundColor: theme.textSecondary }]} />
            <View style={[styles.crosshairV, { backgroundColor: theme.textSecondary }]} />
            
            {/* Handle */}
            <GestureDetector gesture={panGesture}>
              <Animated.View
                style={[
                  styles.joystickHandle,
                  { backgroundColor: theme.primary },
                  handleAnimatedStyle,
                ]}
              />
            </GestureDetector>
          </View>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomContainer}>
          <Text style={[styles.zoomLabel, { color: theme.textSecondary }]}>Zoom</Text>
          
          <Pressable
            onPress={handleZoomIn}
            style={({ pressed }) => [
              styles.zoomButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="plus" size={24} color={theme.primary} />
          </Pressable>

          <View style={styles.zoomTrack}>
            <View
              style={[
                styles.zoomFill,
                { backgroundColor: theme.primary, height: `${currentZoom}%` },
              ]}
            />
          </View>

          <Pressable
            onPress={handleZoomOut}
            style={({ pressed }) => [
              styles.zoomButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="minus" size={24} color={theme.primary} />
          </Pressable>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          onPress={() => handleQuickAction("home")}
          style={({ pressed }) => [
            styles.quickButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="home" size={14} color={theme.text} />
          <Text style={[styles.quickButtonText, { color: theme.text }]}>Home</Text>
        </Pressable>

        <Pressable
          onPress={() => handleQuickAction("center")}
          style={({ pressed }) => [
            styles.quickButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="crosshair" size={14} color={theme.text} />
          <Text style={[styles.quickButtonText, { color: theme.text }]}>Center</Text>
        </Pressable>

        <Pressable
          onPress={() => handleQuickAction("wide")}
          style={({ pressed }) => [
            styles.quickButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="maximize-2" size={14} color={theme.text} />
          <Text style={[styles.quickButtonText, { color: theme.text }]}>Wide</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  joystickContainer: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
  },
  joystickTrack: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    borderRadius: JOYSTICK_SIZE / 2,
    borderWidth: 2,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  crosshairH: {
    position: "absolute",
    width: JOYSTICK_SIZE - 20,
    height: 1,
    opacity: 0.3,
  },
  crosshairV: {
    position: "absolute",
    width: 1,
    height: JOYSTICK_SIZE - 20,
    opacity: 0.3,
  },
  joystickHandle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    ...Shadows.small,
  },
  zoomContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  zoomLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomTrack: {
    width: 8,
    height: 80,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  zoomFill: {
    width: "100%",
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  quickButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  quickButtonText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
  },
});
