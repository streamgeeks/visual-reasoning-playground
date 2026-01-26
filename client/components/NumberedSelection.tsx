import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";

interface NumberedSelectionProps {
  detections: { id: string; box: { x_min: number; y_min: number; x_max: number; y_max: number } }[];
  onSelectPerson: (detection: { id: string; box: { x_min: number; y_min: number; x_max: number; y_max: number } }) => void;
  frameWidth: number;
  frameHeight: number;
  visible: boolean;
}

export function NumberedSelection({ detections, onSelectPerson, frameWidth, frameHeight, visible }: NumberedSelectionProps) {
  const { theme } = useTheme();
  
  if (!visible || detections.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {detections.map((detection, index) => {
        const centerX = ((detection.box.x_min + detection.box.x_max) / 2) * frameWidth;
        const centerY = ((detection.box.y_min + detection.box.y_max) / 2) * frameHeight;
        
        return (
          <Animated.View
            key={detection.id}
            entering={FadeIn.duration(300)}
            style={[
              styles.bubble,
              {
                left: centerX - 20,
                top: centerY - 20,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelectPerson(detection);
              }}
              style={[styles.bubbleInner, { borderColor: theme.primary }]}
            >
              <Text style={[styles.bubbleText, { color: theme.primary }]}>{index + 1}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    width: 40,
    height: 40,
  },
  bubbleInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderWidth: 2,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
