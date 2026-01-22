import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Colors, Fonts, Typography } from "@/constants/theme";

interface StatRowProps {
  label: string;
  value: string;
  color?: string;
}

export function StatRow({ label, value, color }: StatRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={[styles.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontFamily: Platform.select({
      ios: Fonts.mono,
      default: "monospace",
    }),
    fontSize: Typography.mono.fontSize,
    lineHeight: Typography.mono.lineHeight,
    color: "rgba(255, 255, 255, 0.7)",
  },
  value: {
    fontFamily: Platform.select({
      ios: Fonts.mono,
      default: "monospace",
    }),
    fontSize: Typography.mono.fontSize,
    lineHeight: Typography.mono.lineHeight,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
