import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ToolAIInfo, AI_TECHNOLOGIES, getAIBadgeInfo } from "@/lib/aiInfo";

const LEARN_MORE_LINKS = [
  { label: "Visual Reasoning", url: "https://visualreasoning.ai", icon: "eye" },
  { label: "PTZOptics", url: "https://ptzoptics.com", icon: "video" },
  { label: "Moondream AI", url: "https://moondream.ai", icon: "cloud" },
];

interface ToolInfoModalProps {
  visible: boolean;
  onClose: () => void;
  toolInfo: ToolAIInfo | null;
}

export function ToolInfoModal({ visible, onClose, toolInfo }: ToolInfoModalProps) {
  const { theme } = useTheme();

  if (!toolInfo) return null;

  const badgeInfo = getAIBadgeInfo(toolInfo.id);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.innerContainer}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={[styles.iconCircle, { backgroundColor: badgeInfo.color + "20" }]}>
                  <Feather name={badgeInfo.icon as any} size={24} color={badgeInfo.color} />
                </View>
                <View style={styles.titleText}>
                  <Text style={[styles.title, { color: theme.text }]}>{toolInfo.name}</Text>
                  <View style={[styles.badge, { backgroundColor: badgeInfo.color }]}>
                    <Text style={styles.badgeText}>{badgeInfo.label}</Text>
                    {toolInfo.isOnDevice && (
                      <>
                        <View style={styles.badgeDot} />
                        <Text style={styles.badgeText}>On-Device</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="x" size={20} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {toolInfo.description}
              </Text>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  <Feather name="cpu" size={14} color={theme.primary} /> Technologies Used
                </Text>
                {toolInfo.technologies.map((tech, index) => (
                  <View key={index} style={[styles.techItem, { backgroundColor: theme.backgroundSecondary }]}>
                    <View style={[styles.techDot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.techText, { color: theme.text }]}>{tech}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  <Feather name="settings" size={14} color={theme.primary} /> How It Works
                </Text>
                <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
                  {toolInfo.howItWorks}
                </Text>
              </View>

              <View style={[styles.eduCard, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30" }]}>
                <Feather name="book-open" size={18} color={theme.primary} />
                <Text style={[styles.eduText, { color: theme.text }]}>
                  {toolInfo.educationalNote}
                </Text>
              </View>

              {toolInfo.requiresApiKey && (
                <View style={[styles.apiKeyNote, { backgroundColor: theme.warning + "15", borderColor: theme.warning + "30" }]}>
                  <Feather name="key" size={16} color={theme.warning} />
                  <Text style={[styles.apiKeyText, { color: theme.text }]}>
                    Requires Moondream API key (add in Settings)
                  </Text>
                </View>
              )}

              <View style={[styles.linksSection, { borderTopColor: theme.backgroundSecondary }]}>
                <Text style={[styles.linksTitle, { color: theme.textSecondary }]}>
                  Learn More
                </Text>
                <View style={styles.linksRow}>
                  {LEARN_MORE_LINKS.map((link) => (
                    <Pressable
                      key={link.url}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Linking.openURL(link.url);
                      }}
                      style={({ pressed }) => [
                        styles.linkButton,
                        { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Feather name={link.icon as any} size={12} color={theme.primary} />
                      <Text style={[styles.linkText, { color: theme.primary }]}>{link.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "85%",
    paddingBottom: 40,
  },
  innerContainer: {
    maxHeight: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 6,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  description: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  sectionText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
  },
  techItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  techDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  techText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  eduCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  eduText: {
    flex: 1,
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
  },
  apiKeyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  apiKeyText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  linksSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  linksTitle: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.sm,
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  linkText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
});
