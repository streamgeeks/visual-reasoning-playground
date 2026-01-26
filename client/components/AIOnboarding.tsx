import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight, 
  SlideOutLeft,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { ONBOARDING_SLIDES } from "@/lib/aiInfo";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AIOnboardingProps {
  visible: boolean;
  onComplete: () => void;
}

export function AIOnboarding({ visible, onComplete }: AIOnboardingProps) {
  const { theme } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const progressWidth = useSharedValue(0);

  const slide = ONBOARDING_SLIDES[currentSlide];
  const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${((currentSlide + 1) / ONBOARDING_SLIDES.length) * 100}%`,
  }));

  const getIconColor = (slideId: string) => {
    switch (slideId) {
      case "on-device": return "#34C759";
      case "cloud-ai": return "#FF9500";
      case "hybrid": return "#5856D6";
      default: return theme.primary;
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: theme.backgroundSecondary }]}>
            <Animated.View 
              style={[styles.progressFill, { backgroundColor: theme.primary }, progressStyle]} 
            />
          </View>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.slideContainer}>
          <Animated.View 
            key={currentSlide}
            entering={SlideInRight.duration(300)}
            exiting={SlideOutLeft.duration(300)}
            style={styles.slide}
          >
            <View style={[styles.iconContainer, { backgroundColor: getIconColor(slide.id) + "20" }]}>
              <Feather name={slide.icon as any} size={48} color={getIconColor(slide.id)} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
            <Text style={[styles.subtitle, { color: theme.primary }]}>{slide.subtitle}</Text>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {slide.description}
            </Text>

            {slide.examples && (
              <View style={styles.examplesContainer}>
                <Text style={[styles.examplesLabel, { color: theme.textSecondary }]}>
                  Examples:
                </Text>
                <View style={styles.examplesList}>
                  {slide.examples.map((example, index) => (
                    <View 
                      key={index} 
                      style={[styles.exampleChip, { backgroundColor: getIconColor(slide.id) + "20" }]}
                    >
                      <Text style={[styles.exampleText, { color: getIconColor(slide.id) }]}>
                        {example}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {ONBOARDING_SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentSlide ? theme.primary : theme.backgroundSecondary,
                    width: index === currentSlide ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide ? "Get Started" : "Next"}
            </Text>
            <Feather 
              name={isLastSlide ? "check" : "arrow-right"} 
              size={18} 
              color="#FFF" 
            />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  skipButton: {
    padding: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  slideContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  slide: {
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  examplesContainer: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  examplesLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.sm,
  },
  examplesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  exampleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  exampleText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  nextButtonText: {
    color: "#FFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
});
