import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";

interface TappableWordProps {
  word: string;
  isInteractive: boolean;
  isRevealed: boolean;
  onPress: () => void;
  isVisible?: boolean;
  color?: string;
}

export function TappableWord({
  word,
  isInteractive,
  isRevealed,
  onPress,
  isVisible = true,
  color,
}: TappableWordProps) {
  const { theme } = useTheme();
  
  const opacityAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const textColor = isInteractive ? (color || theme.textSecondary) : theme.text;

  return (
    <Animated.Text
      style={[styles.word, { color: textColor, opacity: opacityAnim }]}
      onPress={isInteractive ? handlePress : undefined}
    >
      {word}{" "}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  word: {
    fontSize: 16,
    lineHeight: 24,
  },
});
