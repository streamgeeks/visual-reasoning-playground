import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { CameraProfile } from "@/lib/storage";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

interface CameraCardProps {
  camera: CameraProfile;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
  onTest?: () => Promise<boolean>;
  index: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CameraCard({ camera, isActive, onPress, onDelete, onTest, index }: CameraCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  };

  const handleTest = async () => {
    if (!onTest || testing) return;
    setTesting(true);
    setTestResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const success = await onTest();
      setTestResult(success ? "success" : "error");
      Haptics.notificationAsync(
        success 
          ? Haptics.NotificationFeedbackType.Success 
          : Haptics.NotificationFeedbackType.Error
      );
    } catch {
      setTestResult("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  return (
    <Animated.View entering={FadeIn.delay(index * 50).duration(300)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isActive ? theme.primary : "transparent",
            borderWidth: isActive ? 2 : 0,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.content}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isActive ? theme.primary + "20" : theme.backgroundSecondary },
            ]}
          >
            <Feather
              name="video"
              size={24}
              color={isActive ? theme.primary : theme.textSecondary}
            />
          </View>

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.text }]}>{camera.name}</Text>
              {isActive ? (
                <View style={[styles.activeBadge, { backgroundColor: theme.success }]}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.ipAddress, { color: theme.textSecondary }]}>
              {camera.ipAddress}:{camera.httpPort}
            </Text>
          </View>

          <Pressable
            onPress={handleTest}
            disabled={testing}
            hitSlop={8}
            style={({ pressed }) => [
              styles.testButton,
              { 
                backgroundColor: testResult === "success" 
                  ? theme.success + "20" 
                  : testResult === "error" 
                  ? theme.error + "20" 
                  : theme.backgroundSecondary,
                opacity: pressed && !testing ? 0.7 : 1,
              },
            ]}
          >
            {testing ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Feather 
                name={testResult === "success" ? "check-circle" : testResult === "error" ? "x-circle" : "wifi"} 
                size={16} 
                color={testResult === "success" ? theme.success : testResult === "error" ? theme.error : theme.textSecondary} 
              />
            )}
          </Pressable>

          <Pressable
            onPress={handleDelete}
            hitSlop={12}
            style={({ pressed }) => [
              styles.deleteButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Feather name="trash-2" size={18} color={theme.error} />
          </Pressable>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  name: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  activeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  ipAddress: {
    fontSize: Typography.small.fontSize,
  },
  testButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    padding: Spacing.sm,
  },
});
