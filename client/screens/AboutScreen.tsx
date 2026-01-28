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
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface PrincipleCardProps {
  number: string;
  title: string;
  description: string;
  detail?: string;
}

function PrincipleCard({
  number,
  title,
  description,
  detail,
}: PrincipleCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.principleCard,
        { backgroundColor: theme.backgroundDefault },
      ]}
    >
      <View style={styles.principleHeader}>
        <View style={[styles.numberBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.numberText}>{number}</Text>
        </View>
        <Text style={[styles.principleTitle, { color: theme.text }]}>
          {title}
        </Text>
      </View>
      <Text
        style={[styles.principleDescription, { color: theme.textSecondary }]}
      >
        {description}
      </Text>
      {detail && (
        <Text style={[styles.principleDetail, { color: theme.textSecondary }]}>
          {detail}
        </Text>
      )}
    </View>
  );
}

const PRINCIPLES: PrincipleCardProps[] = [
  {
    number: "01",
    title: "Purpose First, Tech Second",
    description:
      "Visual Reasoning exists to solve concrete problems: better coaching, safer factories, smarter classrooms, clearer broadcasts. It does not exist to ship features in search of a use case.",
    detail:
      'Every capability we build starts with a real human need. We ask "What outcome matters?" before asking "What technology enables it?"',
  },
  {
    number: "02",
    title: "Augment People, Don't Erase Them",
    description:
      "Cameras, robotics, and AI should act as expert assistants—the tireless camera operator, analyst, or safety spotter. Human teams finish with more creative energy, make better decisions, and get more done.",
    detail:
      "The aim is not fewer jobs. It's better jobs. More time for the work that matters.",
  },
  {
    number: "03",
    title: "Responsible by Design",
    description:
      "Privacy, security, and data ownership are not bolt-ons. They are design constraints from day one.",
    detail:
      "We prioritize on-prem and hybrid deployments, minimal data sharing, and transparent data flows—especially in healthcare, enterprise, and public spaces. If it can be processed locally, it should be.",
  },
  {
    number: "04",
    title: "Open APIs, Shared Building Blocks",
    description:
      "Any developer should be able to take a PTZOptics camera, pull images or telemetry through standard APIs, and plug in their preferred AI models.",
    detail:
      "MoonDream, LayerJot, Detect-IT, MPact Sports—these are not competitors. They are partners. You could be the next game-changing startup formed in a garage.",
  },
  {
    number: "05",
    title: "Security Is a Shared Duty",
    description:
      "Camera vendors, AI providers, integrators, and customers must share responsibility for patching, monitoring, and hardening systems.",
    detail:
      "We commit to lifetime firmware and security updates for our cameras and expect partners to match that standard.",
  },
  {
    number: "06",
    title: "Education Before Monetization",
    description:
      "Visual Reasoning only becomes powerful when people understand its power.",
    detail:
      "We will lead with free tools, documentation, books, and courses that teach how to build and govern these workflows—long before we optimize for revenue.",
  },
  {
    number: "07",
    title: "No Fake AI",
    description:
      "If it's a rules engine, we'll call it that. If it's statistics, we'll say so.",
    detail:
      'We will not slap the AI label on every feature. When we say "AI," we mean reasoning systems that genuinely analyze, generalize, and improve outcomes—not marketing buzzwords.',
  },
  {
    number: "08",
    title: "Everyday Wins Matter",
    description:
      "We celebrate the mundane victories: the production needing one fewer box, the factory avoiding a stoppage, the coach who saves three hours in the edit suite, the school that can finally cover every game.",
    detail:
      "Visual Reasoning earns its place by making thousands of small, human tasks easier.",
  },
  {
    number: "09",
    title: "Ecosystem Over Empires",
    description:
      "PTZOptics doesn't want to, cannot, and will not build every app, vertical solution, or analytics engine.",
    detail:
      "Our role is to ship great cameras, responsible firmware, and enabling software—then get out of the way so that you, the specialists in your field, can shine.",
  },
  {
    number: "10",
    title: "A Movement, Not a Monopoly",
    description:
      "Visual Reasoning will only deserve its name if many companies, communities, and creators shape it together.",
    detail:
      "Sports analytics platforms, industrial AI startups, open-source vision researchers, AV integrators, broadcasters, and educators. Our job is to help convene that movement, not to own every piece of it.",
  },
];

export default function AboutScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const handleLinkPress = (url: string) => {
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
        <View
          style={[
            styles.logoContainer,
            { backgroundColor: theme.primary + "15" },
          ]}
        >
          <Feather name="eye" size={40} color={theme.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          Visual Reasoning
        </Text>
        <Text style={[styles.heroSubtitle, { color: theme.primary }]}>
          A Movement, Not a Monopoly
        </Text>
        <Text style={[styles.heroDescription, { color: theme.textSecondary }]}>
          Ten principles for turning video from passive recording into
          actionable intelligence. We commit to these principles, and we invite
          others to adopt, challenge, and improve them.
        </Text>
      </View>

      <View
        style={[
          styles.creatorSection,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <Text style={[styles.creatorLabel, { color: theme.textSecondary }]}>
          Created by
        </Text>
        <Pressable
          onPress={() => handleLinkPress("https://streamgeeks.com")}
          style={({ pressed }) => [
            styles.creatorButton,
            {
              backgroundColor: theme.accent + "15",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="video" size={20} color={theme.accent} />
          <Text style={[styles.creatorName, { color: theme.text }]}>
            StreamGeeks
          </Text>
          <Feather name="external-link" size={16} color={theme.accent} />
        </Pressable>
        <Text style={[styles.companyText, { color: theme.textSecondary }]}>
          StreamGeeks is a registered trademark of Haverford Systems, Inc.
        </Text>
        <Text style={[styles.companySubtext, { color: theme.textSecondary }]}>
          An Employee Owned Company
        </Text>
      </View>

      <Text style={[styles.sectionHeader, { color: theme.text }]}>
        Our Principles
      </Text>

      {PRINCIPLES.map((principle) => (
        <PrincipleCard key={principle.number} {...principle} />
      ))}

      <View
        style={[
          styles.linksSection,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <Text style={[styles.linksSectionTitle, { color: theme.text }]}>
          Learn More
        </Text>

        <Pressable
          onPress={() => handleLinkPress("https://visualreasoning.ai")}
          style={({ pressed }) => [
            styles.linkRow,
            {
              borderBottomColor: theme.backgroundSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View
            style={[styles.linkIcon, { backgroundColor: theme.primary + "15" }]}
          >
            <Feather name="globe" size={18} color={theme.primary} />
          </View>
          <View style={styles.linkContent}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>
              Visual Reasoning
            </Text>
            <Text style={[styles.linkUrl, { color: theme.textSecondary }]}>
              visualreasoning.ai
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => handleLinkPress("https://streamgeeks.com")}
          style={({ pressed }) => [
            styles.linkRow,
            {
              borderBottomColor: theme.backgroundSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View
            style={[styles.linkIcon, { backgroundColor: theme.accent + "15" }]}
          >
            <Feather name="video" size={18} color={theme.accent} />
          </View>
          <View style={styles.linkContent}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>
              StreamGeeks
            </Text>
            <Text style={[styles.linkUrl, { color: theme.textSecondary }]}>
              streamgeeks.com
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => handleLinkPress("https://ptzoptics.com")}
          style={({ pressed }) => [
            styles.linkRow,
            {
              borderBottomColor: theme.backgroundSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View
            style={[styles.linkIcon, { backgroundColor: theme.success + "15" }]}
          >
            <Feather name="camera" size={18} color={theme.success} />
          </View>
          <View style={styles.linkContent}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>
              PTZOptics
            </Text>
            <Text style={[styles.linkUrl, { color: theme.textSecondary }]}>
              ptzoptics.com
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          onPress={() => handleLinkPress("https://visualreasoning.ai/privacy")}
          style={({ pressed }) => [
            styles.linkRow,
            { borderBottomColor: "transparent", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View
            style={[styles.linkIcon, { backgroundColor: theme.warning + "15" }]}
          >
            <Feather name="shield" size={18} color={theme.warning} />
          </View>
          <View style={styles.linkContent}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>
              Privacy Policy
            </Text>
            <Text style={[styles.linkUrl, { color: theme.textSecondary }]}>
              visualreasoning.ai/privacy
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.footerSection}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Visual Reasoning - AI Camera v1.0.0
        </Text>
        <Text style={[styles.footerCopyright, { color: theme.textSecondary }]}>
          © {new Date().getFullYear()} Haverford Systems, Inc.
        </Text>
        <Text style={[styles.footerCopyright, { color: theme.textSecondary }]}>
          All rights reserved.
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
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  heroSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  heroDescription: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
    textAlign: "center",
  },
  creatorSection: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  creatorLabel: {
    fontSize: Typography.small.fontSize,
  },
  creatorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  creatorName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  companyText: {
    fontSize: Typography.small.fontSize,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  companySubtext: {
    fontSize: Typography.small.fontSize,
    fontStyle: "italic",
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "700",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  principleCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  principleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  principleTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    flex: 1,
  },
  principleDescription: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  principleDetail: {
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
    fontStyle: "italic",
  },
  linksSection: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginTop: Spacing.md,
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
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  linkUrl: {
    fontSize: Typography.small.fontSize,
  },
  footerSection: {
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 4,
  },
  footerText: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
  },
  footerCopyright: {
    fontSize: 11,
    textAlign: "center",
  },
});
