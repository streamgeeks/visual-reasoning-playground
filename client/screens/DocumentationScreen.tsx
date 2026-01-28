import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface GuideCardProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  steps?: string[];
  expandable?: boolean;
}

function GuideCard({
  icon,
  iconColor,
  title,
  description,
  steps,
  expandable = true,
}: GuideCardProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    if (expandable && steps && steps.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpanded(!expanded);
    }
  };

  return (
    <Pressable
      onPress={toggleExpand}
      style={[styles.guideCard, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.guideHeader}>
        <View
          style={[
            styles.guideIconContainer,
            { backgroundColor: iconColor + "15" },
          ]}
        >
          <Feather name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.guideContent}>
          <Text style={[styles.guideTitle, { color: theme.text }]}>
            {title}
          </Text>
          <Text
            style={[styles.guideDescription, { color: theme.textSecondary }]}
          >
            {description}
          </Text>
        </View>
        {expandable && steps && steps.length > 0 && (
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        )}
      </View>
      {expanded && steps && (
        <View
          style={[
            styles.stepsContainer,
            { borderTopColor: theme.backgroundSecondary },
          ]}
        >
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <Text style={[styles.stepNumberText, { color: theme.primary }]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const QUICK_START_GUIDES: GuideCardProps[] = [
  {
    icon: "message-circle",
    iconColor: "#007AFF",
    title: "AI Chat",
    description: "Have a conversation with AI about what the camera sees",
    steps: [
      "Open the Live tab and select 'Chat' from the tools",
      "Point your camera at something interesting",
      "Type a question like 'What do you see?' or tap a suggested prompt",
      "The AI will analyze the image and respond",
      "Try follow-up questions like 'How many people?' or 'Find the red object'",
    ],
  },
  {
    icon: "grid",
    iconColor: "#34C759",
    title: "Detect All Objects",
    description: "Find and label all objects in view using YOLO or Cloud AI",
    steps: [
      "Open the Live tab and select 'Detect All'",
      "Choose detection mode: YOLO (fast, on-device) or Cloud AI (smarter)",
      "Tap 'Detect' to scan the current frame",
      "Objects appear with colored labels and bounding boxes",
      "Enable 'Auto' for continuous detection",
    ],
  },
  {
    icon: "users",
    iconColor: "#FF9500",
    title: "People Counter",
    description: "Count and track people in real-time",
    steps: [
      "Open the Live tab and select 'People Counter'",
      "Choose on-device (Vision) or cloud detection",
      "Tap 'Start Counting' to begin",
      "View current count, peak count, and detection confidence",
      "Adjust scan interval for performance vs accuracy",
    ],
  },
  {
    icon: "camera",
    iconColor: "#AF52DE",
    title: "AI Photographer",
    description: "Automatically capture photos when triggers are detected",
    steps: [
      "Open the Live tab and select 'AI Photographer'",
      "Select triggers: wave, smile, thumbs up, or custom phrases",
      "Tap 'Start Watching' to begin monitoring",
      "The AI captures a photo when it detects your trigger",
      "Photos are saved to your gallery",
    ],
  },
  {
    icon: "search",
    iconColor: "#FF2D55",
    title: "Hunt & Find (PTZ)",
    description: "Scan a room with PTZ camera to catalog all objects",
    steps: [
      "Connect a PTZOptics camera in Settings",
      "Open the Live tab and select 'Hunt & Find'",
      "Choose a scan pattern and detection mode",
      "The camera automatically pans to scan the room",
      "Review detected objects and zoom to items of interest",
    ],
  },
  {
    icon: "video",
    iconColor: "#5AC8FA",
    title: "PTZ Camera Controls",
    description: "Control pan, tilt, zoom on compatible cameras",
    steps: [
      "Add your PTZOptics camera in Settings with its IP address",
      "Tap 'Connect' to establish connection",
      "Use the joystick or voice commands to control the camera",
      "Save presets for quick position recall",
      "Use tracking mode to follow detected objects",
    ],
  },
];

export default function DocumentationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const handleEmailPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("mailto:sales@ptzoptics.com");
  };

  const handleWebsitePress = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.heroSection,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <Feather name="book-open" size={32} color={theme.primary} />
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Documentation
        </Text>
        <Text style={[styles.heroDescription, { color: theme.textSecondary }]}>
          Learn how to use Visual Reasoning's AI-powered tools
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Quick Start Guides
      </Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Tap any guide to see step-by-step instructions
      </Text>

      {QUICK_START_GUIDES.map((guide, index) => (
        <GuideCard key={index} {...guide} />
      ))}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Tips & Best Practices
      </Text>

      <View
        style={[styles.tipCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.tipHeader}>
          <Feather name="zap" size={18} color={theme.warning} />
          <Text style={[styles.tipTitle, { color: theme.text }]}>
            Performance
          </Text>
        </View>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          On-device detection (YOLO, Vision) is faster and works offline. Cloud
          AI (Moondream) is smarter and can understand custom descriptions but
          requires internet.
        </Text>
      </View>

      <View
        style={[styles.tipCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.tipHeader}>
          <Feather name="shield" size={18} color={theme.success} />
          <Text style={[styles.tipTitle, { color: theme.text }]}>Privacy</Text>
        </View>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          On-device AI never sends images to external servers. Cloud features
          only transmit images when you explicitly use Moondream-powered tools.
        </Text>
      </View>

      <View
        style={[styles.tipCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.tipHeader}>
          <Feather name="wifi" size={18} color={theme.accent} />
          <Text style={[styles.tipTitle, { color: theme.text }]}>
            PTZ Cameras
          </Text>
        </View>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          For PTZ features, your camera must be on the same network as your
          device. PTZOptics cameras work best with VISCA-over-IP protocol on
          port 5678.
        </Text>
      </View>

      <View
        style={[
          styles.supportSection,
          {
            backgroundColor: theme.warning + "10",
            borderColor: theme.warning + "30",
          },
        ]}
      >
        <View style={styles.supportHeader}>
          <Feather name="info" size={24} color={theme.warning} />
          <Text style={[styles.supportTitle, { color: theme.text }]}>
            Support Information
          </Text>
        </View>

        <Text style={[styles.supportText, { color: theme.textSecondary }]}>
          Visual Reasoning - AI Camera is provided free of charge by
          VisualReasoning.ai and therefore does not include technical support.
        </Text>

        <Text style={[styles.supportText, { color: theme.textSecondary }]}>
          This app is designed as an educational tool to demonstrate the
          capabilities of on-device and cloud AI for computer vision
          applications.
        </Text>

        <View
          style={[
            styles.supportDivider,
            { backgroundColor: theme.warning + "30" },
          ]}
        />

        <Text style={[styles.supportSubtitle, { color: theme.text }]}>
          Have a Project Inquiry?
        </Text>
        <Text style={[styles.supportText, { color: theme.textSecondary }]}>
          If you're interested in consulting on a future project or have
          questions about PTZOptics compatible cameras, please contact:
        </Text>

        <Pressable
          onPress={handleEmailPress}
          style={({ pressed }) => [
            styles.emailButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="mail" size={18} color="#FFF" />
          <Text style={styles.emailButtonText}>sales@ptzoptics.com</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.linksSection,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <Text style={[styles.linksSectionTitle, { color: theme.text }]}>
          Resources
        </Text>

        <Pressable
          onPress={() => handleWebsitePress("https://visualreasoning.ai")}
          style={({ pressed }) => [
            styles.linkRow,
            {
              borderBottomColor: theme.backgroundSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="globe" size={18} color={theme.primary} />
          <Text style={[styles.linkText, { color: theme.text }]}>
            VisualReasoning.ai
          </Text>
          <Feather name="external-link" size={16} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => handleWebsitePress("https://ptzoptics.com")}
          style={({ pressed }) => [
            styles.linkRow,
            {
              borderBottomColor: theme.backgroundSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="camera" size={18} color={theme.success} />
          <Text style={[styles.linkText, { color: theme.text }]}>
            PTZOptics Cameras
          </Text>
          <Feather name="external-link" size={16} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => handleWebsitePress("https://moondream.ai")}
          style={({ pressed }) => [
            styles.linkRow,
            { borderBottomColor: "transparent", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="cloud" size={18} color={theme.accent} />
          <Text style={[styles.linkText, { color: theme.text }]}>
            Moondream AI
          </Text>
          <Feather name="external-link" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  heroSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: "700",
  },
  heroDescription: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "700",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.small.fontSize,
    paddingHorizontal: Spacing.xs,
    marginTop: -Spacing.sm,
  },
  guideCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  guideIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  guideDescription: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  stepsContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "600",
  },
  stepText: {
    flex: 1,
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
  },
  tipCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tipTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  tipText: {
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
  },
  supportSection: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  supportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  supportTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "700",
  },
  supportSubtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  supportText: {
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  supportDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  emailButtonText: {
    color: "#FFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  linksSection: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  linksSectionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  linkText: {
    flex: 1,
    fontSize: Typography.body.fontSize,
  },
});
