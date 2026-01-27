import React from "react";
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

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface LicenseCardProps {
  name: string;
  version?: string;
  license: string;
  description: string;
  url?: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
}

function LicenseCard({ name, version, license, description, url, icon, iconColor }: LicenseCardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + "20" }]}>
          <Feather name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{name}</Text>
          {version && (
            <Text style={[styles.cardVersion, { color: theme.textSecondary }]}>{version}</Text>
          )}
        </View>
        <View style={[styles.licenseBadge, { backgroundColor: theme.primary + "20" }]}>
          <Text style={[styles.licenseBadgeText, { color: theme.primary }]}>{license}</Text>
        </View>
      </View>
      <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
        {description}
      </Text>
      {url && (
        <Pressable
          onPress={() => Linking.openURL(url)}
          style={({ pressed }) => [
            styles.linkButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="external-link" size={14} color={theme.primary} />
          <Text style={[styles.linkText, { color: theme.primary }]}>View Source</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function PrivacyLicensesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.sectionHeader}>
          <Feather name="shield" size={20} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Privacy Statement</Text>
        </View>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          This app processes images and video for object detection and scene analysis. Here's how your data is handled:
        </Text>
        
        <View style={styles.privacyItem}>
          <Feather name="smartphone" size={16} color={theme.success} />
          <View style={styles.privacyItemContent}>
            <Text style={[styles.privacyItemTitle, { color: theme.text }]}>On-Device Processing</Text>
            <Text style={[styles.privacyItemText, { color: theme.textSecondary }]}>
              YOLO object detection and Apple Vision run entirely on your device. No images are sent to external servers.
            </Text>
          </View>
        </View>
        
        <View style={styles.privacyItem}>
          <Feather name="cloud" size={16} color={theme.accent} />
          <View style={styles.privacyItemContent}>
            <Text style={[styles.privacyItemTitle, { color: theme.text }]}>Cloud AI (Optional)</Text>
            <Text style={[styles.privacyItemText, { color: theme.textSecondary }]}>
              When using Moondream AI features, images are sent to Moondream's servers for processing. This requires your own API key and is subject to Moondream's privacy policy.
            </Text>
          </View>
        </View>
        
        <View style={styles.privacyItem}>
          <Feather name="database" size={16} color={theme.warning} />
          <View style={styles.privacyItemContent}>
            <Text style={[styles.privacyItemTitle, { color: theme.text }]}>Local Storage</Text>
            <Text style={[styles.privacyItemText, { color: theme.textSecondary }]}>
              Camera profiles, settings, and captured images are stored locally on your device. No account or cloud sync required.
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        AI MODELS & LICENSES
      </Text>

      <LicenseCard
        name="YOLOv8"
        version="Nano (v8n)"
        license="AGPL-3.0"
        description="Real-time object detection model trained on COCO dataset (80 classes). Runs entirely on-device using Core ML for fast, private inference. Created by Ultralytics."
        url="https://github.com/ultralytics/ultralytics"
        icon="zap"
        iconColor="#FF6B6B"
      />

      <LicenseCard
        name="Moondream"
        version="moondream2"
        license="Apache 2.0"
        description="Lightweight vision-language model for image understanding and object detection. Open-source and commercially usable. Provides natural language scene descriptions."
        url="https://github.com/vikhyat/moondream"
        icon="moon"
        iconColor="#9B59B6"
      />

      <LicenseCard
        name="Apple Vision Framework"
        license="Proprietary"
        description="Built-in iOS framework for face detection, human body detection, and object tracking. Runs on-device using Apple's Neural Engine. No additional license required for iOS apps."
        url="https://developer.apple.com/documentation/vision"
        icon="eye"
        iconColor="#007AFF"
      />

      <LicenseCard
        name="Apple Core ML"
        license="Proprietary"
        description="Apple's machine learning framework that powers on-device inference for YOLO and other models. Optimized for Apple Silicon with hardware acceleration."
        url="https://developer.apple.com/documentation/coreml"
        icon="cpu"
        iconColor="#34C759"
      />

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        DATASET
      </Text>

      <LicenseCard
        name="COCO Dataset"
        version="2017"
        license="CC BY 4.0"
        description="Common Objects in Context - a large-scale object detection dataset with 80 object categories. YOLOv8 is trained on this dataset. Free to use with attribution."
        url="https://cocodataset.org"
        icon="database"
        iconColor="#E67E22"
      />

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        OPEN SOURCE NOTICE
      </Text>

      <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          This application incorporates open-source software. We are grateful to the developers and communities who make their work freely available.
        </Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
          YOLO (You Only Look Once) is licensed under AGPL-3.0 by Ultralytics. For commercial use without AGPL obligations, an Ultralytics Enterprise License is available.
        </Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
          Moondream is licensed under Apache 2.0, allowing free commercial and personal use with attribution.
        </Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
          Apple Vision and Core ML are proprietary frameworks included with iOS. Their use is governed by the Apple Developer Program License Agreement.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Last updated: January 2025
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
  },
  privacyItem: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  privacyItemContent: {
    flex: 1,
  },
  privacyItemTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: 4,
  },
  privacyItemText: {
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  cardVersion: {
    fontSize: Typography.caption.fontSize,
  },
  licenseBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  licenseBadgeText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  linkText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.caption.fontSize,
  },
});
