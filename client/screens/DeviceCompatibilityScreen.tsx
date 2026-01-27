import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

// Device compatibility tiers
type CompatibilityTier = "full" | "good" | "basic" | "unsupported";

interface DeviceInfo {
  name: string;
  chip: string;
  neuralEngine: string;
  tier: CompatibilityTier;
  notes?: string;
}

interface FeatureRequirement {
  name: string;
  icon: string;
  minIOS: string;
  minChip: string;
  runsOnDevice: boolean;
  description: string;
}

// AI Features and their requirements
const AI_FEATURES: FeatureRequirement[] = [
  {
    name: "Face Detection",
    icon: "smile",
    minIOS: "11+",
    minChip: "A9+",
    runsOnDevice: true,
    description: "Detects faces in camera view",
  },
  {
    name: "Person Detection",
    icon: "users",
    minIOS: "12+",
    minChip: "A10+",
    runsOnDevice: true,
    description: "Finds and tracks people",
  },
  {
    name: "Animal Detection",
    icon: "github",
    minIOS: "13+",
    minChip: "A11+",
    runsOnDevice: true,
    description: "Detects cats and dogs",
  },
  {
    name: "Scene Classification",
    icon: "image",
    minIOS: "13+",
    minChip: "A11+",
    runsOnDevice: true,
    description: "Identifies scene types",
  },
  {
    name: "Body Pose Detection",
    icon: "user",
    minIOS: "14+",
    minChip: "A12+",
    runsOnDevice: true,
    description: "17 body keypoints",
  },
  {
    name: "Hand Gestures",
    icon: "hand",
    minIOS: "14+",
    minChip: "A12+",
    runsOnDevice: true,
    description: "Wave, thumbs up, peace, pointing",
  },
  {
    name: "Visual Re-ID",
    icon: "search",
    minIOS: "13+",
    minChip: "A11+",
    runsOnDevice: true,
    description: "Identity-locked person tracking",
  },
  {
    name: "YOLOv8 Detection",
    icon: "zap",
    minIOS: "14+",
    minChip: "A12+",
    runsOnDevice: true,
    description: "80 object classes at 30+ FPS",
  },
  {
    name: "MobileCLIP Search",
    icon: "search",
    minIOS: "16+",
    minChip: "A14+",
    runsOnDevice: true,
    description: "Open vocabulary object search",
  },
  {
    name: "Moondream AI",
    icon: "cloud",
    minIOS: "Any",
    minChip: "Any",
    runsOnDevice: false,
    description: "Custom objects via cloud API",
  },
];

// Device database
const DEVICE_DATABASE: DeviceInfo[] = [
  // Full Support (A14+)
  { name: "iPhone 15 Pro Max", chip: "A17 Pro", neuralEngine: "35 TOPS", tier: "full", notes: "Best performance, ProRes" },
  { name: "iPhone 15 Pro", chip: "A17 Pro", neuralEngine: "35 TOPS", tier: "full" },
  { name: "iPhone 15 Plus", chip: "A16", neuralEngine: "17 TOPS", tier: "full" },
  { name: "iPhone 15", chip: "A16", neuralEngine: "17 TOPS", tier: "full" },
  { name: "iPhone 14 Pro Max", chip: "A16", neuralEngine: "17 TOPS", tier: "full" },
  { name: "iPhone 14 Pro", chip: "A16", neuralEngine: "17 TOPS", tier: "full" },
  { name: "iPhone 14 Plus", chip: "A15", neuralEngine: "15.8 TOPS", tier: "full" },
  { name: "iPhone 14", chip: "A15", neuralEngine: "15.8 TOPS", tier: "full" },
  { name: "iPhone 13 Pro Max", chip: "A15", neuralEngine: "15.8 TOPS", tier: "full" },
  { name: "iPhone 13 Pro", chip: "A15", neuralEngine: "15.8 TOPS", tier: "full" },
  { name: "iPhone 13", chip: "A15", neuralEngine: "15.8 TOPS", tier: "full" },
  { name: "iPhone 13 Mini", chip: "A15", neuralEngine: "15.8 TOPS", tier: "full" },
  { name: "iPhone 12 Pro Max", chip: "A14", neuralEngine: "11 TOPS", tier: "full" },
  { name: "iPhone 12 Pro", chip: "A14", neuralEngine: "11 TOPS", tier: "full" },
  { name: "iPhone 12", chip: "A14", neuralEngine: "11 TOPS", tier: "full" },
  { name: "iPhone 12 Mini", chip: "A14", neuralEngine: "11 TOPS", tier: "full" },
  { name: "iPhone SE (3rd gen)", chip: "A15", neuralEngine: "15.8 TOPS", tier: "full", notes: "Budget flagship chip" },
  
  // Good Support (A12-A13)
  { name: "iPhone 11 Pro Max", chip: "A13", neuralEngine: "8 TOPS", tier: "good", notes: "YOLO may be slower" },
  { name: "iPhone 11 Pro", chip: "A13", neuralEngine: "8 TOPS", tier: "good" },
  { name: "iPhone 11", chip: "A13", neuralEngine: "8 TOPS", tier: "good" },
  { name: "iPhone SE (2nd gen)", chip: "A13", neuralEngine: "8 TOPS", tier: "good" },
  { name: "iPhone XS Max", chip: "A12", neuralEngine: "5 TOPS", tier: "good", notes: "First Neural Engine" },
  { name: "iPhone XS", chip: "A12", neuralEngine: "5 TOPS", tier: "good" },
  { name: "iPhone XR", chip: "A12", neuralEngine: "5 TOPS", tier: "good" },
  
  // Basic Support (A11)
  { name: "iPhone X", chip: "A11", neuralEngine: "None", tier: "basic", notes: "CPU/GPU only" },
  { name: "iPhone 8 Plus", chip: "A11", neuralEngine: "None", tier: "basic" },
  { name: "iPhone 8", chip: "A11", neuralEngine: "None", tier: "basic" },
  
  // Not Supported
  { name: "iPhone 7 and older", chip: "A10 or older", neuralEngine: "None", tier: "unsupported", notes: "iOS version limit" },
];

const TIER_INFO: Record<CompatibilityTier, { label: string; color: string; icon: string; description: string }> = {
  full: {
    label: "Full Support",
    color: "#34C759",
    icon: "check-circle",
    description: "All features run at maximum performance with Neural Engine acceleration",
  },
  good: {
    label: "Good Support",
    color: "#FF9500",
    icon: "alert-circle",
    description: "Most features work well, some advanced AI may be slower",
  },
  basic: {
    label: "Basic Support",
    color: "#FF3B30",
    icon: "alert-triangle",
    description: "On-device AI is slow, cloud fallback recommended",
  },
  unsupported: {
    label: "Not Supported",
    color: "#8E8E93",
    icon: "x-circle",
    description: "Device does not meet minimum requirements",
  },
};

export default function DeviceCompatibilityScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  
  const [expandedTier, setExpandedTier] = useState<CompatibilityTier | null>("full");
  const [currentDevice, setCurrentDevice] = useState<{ name: string; tier: CompatibilityTier } | null>(null);
  
  useEffect(() => {
    detectCurrentDevice();
  }, []);
  
  const detectCurrentDevice = async () => {
    if (Platform.OS === "ios") {
      const platformConstants = Platform.constants as any;
      const systemVersion = platformConstants?.osVersion || Platform.Version;
      const iosVersion = typeof systemVersion === 'string' ? parseFloat(systemVersion) : systemVersion;
      
      let detectedTier: CompatibilityTier = "good";
      let deviceName = "Your iPhone";
      
      if (iosVersion >= 17) {
        detectedTier = "full";
        deviceName = "iPhone (iOS 17+)";
      } else if (iosVersion >= 15) {
        detectedTier = "full";
        deviceName = "iPhone (iOS 15-16)";
      } else if (iosVersion >= 13) {
        detectedTier = "good";
        deviceName = "iPhone (iOS 13-14)";
      } else {
        detectedTier = "basic";
        deviceName = "iPhone (Older iOS)";
      }
      
      setCurrentDevice({ name: deviceName, tier: detectedTier });
    }
  };
  
  const toggleTier = (tier: CompatibilityTier) => {
    setExpandedTier(expandedTier === tier ? null : tier);
  };
  
  const devicesByTier = (tier: CompatibilityTier) => 
    DEVICE_DATABASE.filter(d => d.tier === tier);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Device Banner */}
        {currentDevice && (
          <View style={[
            styles.currentDeviceBanner,
            { 
              backgroundColor: TIER_INFO[currentDevice.tier].color + "15",
              borderColor: TIER_INFO[currentDevice.tier].color + "40",
            }
          ]}>
            <Feather 
              name={TIER_INFO[currentDevice.tier].icon as any} 
              size={24} 
              color={TIER_INFO[currentDevice.tier].color} 
            />
            <View style={styles.currentDeviceInfo}>
              <Text style={[styles.currentDeviceLabel, { color: theme.textSecondary }]}>
                Your Device
              </Text>
              <Text style={[styles.currentDeviceName, { color: theme.text }]}>
                {currentDevice.name}
              </Text>
              <Text style={[styles.currentDeviceTier, { color: TIER_INFO[currentDevice.tier].color }]}>
                {TIER_INFO[currentDevice.tier].label}
              </Text>
            </View>
          </View>
        )}

        {/* Intro */}
        <View style={[styles.introSection, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.introHeader}>
            <View style={[styles.introIcon, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="cpu" size={24} color={theme.primary} />
            </View>
            <View style={styles.introText}>
              <Text style={[styles.introTitle, { color: theme.text }]}>
                AI-Powered Features
              </Text>
              <Text style={[styles.introSubtitle, { color: theme.textSecondary }]}>
                Device requirements for on-device AI
              </Text>
            </View>
          </View>
          <Text style={[styles.introBody, { color: theme.textSecondary }]}>
            This app uses Apple's Neural Engine for real-time AI processing. Newer devices with faster Neural Engines provide smoother performance. Cloud-based features (Moondream) work on all devices.
          </Text>
        </View>

        {/* Quick Summary */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Compatibility Tiers
        </ThemedText>
        
        {(["full", "good", "basic", "unsupported"] as CompatibilityTier[]).map((tier) => {
          const info = TIER_INFO[tier];
          const devices = devicesByTier(tier);
          const isExpanded = expandedTier === tier;
          
          return (
            <View key={tier} style={[styles.tierSection, { backgroundColor: theme.backgroundDefault }]}>
              <Pressable
                onPress={() => toggleTier(tier)}
                style={({ pressed }) => [
                  styles.tierHeader,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <View style={[styles.tierIcon, { backgroundColor: info.color + "20" }]}>
                  <Feather name={info.icon as any} size={20} color={info.color} />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierLabel, { color: theme.text }]}>{info.label}</Text>
                  <Text style={[styles.tierCount, { color: theme.textSecondary }]}>
                    {devices.length} device{devices.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Feather 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={theme.textSecondary} 
                />
              </Pressable>
              
              {isExpanded && (
                <View style={styles.tierContent}>
                  <Text style={[styles.tierDescription, { color: theme.textSecondary }]}>
                    {info.description}
                  </Text>
                  
                  <View style={[styles.deviceList, { borderTopColor: theme.backgroundSecondary }]}>
                    {devices.map((device, idx) => (
                      <View 
                        key={device.name}
                        style={[
                          styles.deviceRow,
                          idx < devices.length - 1 && { borderBottomColor: theme.backgroundSecondary, borderBottomWidth: 1 }
                        ]}
                      >
                        <View style={styles.deviceMain}>
                          <Text style={[styles.deviceName, { color: theme.text }]}>
                            {device.name}
                          </Text>
                          <Text style={[styles.deviceChip, { color: theme.textSecondary }]}>
                            {device.chip} {device.neuralEngine !== "None" ? `• ${device.neuralEngine}` : ""}
                          </Text>
                        </View>
                        {device.notes && (
                          <Text style={[styles.deviceNotes, { color: info.color }]}>
                            {device.notes}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Feature Requirements */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Feature Requirements
        </ThemedText>
        
        <View style={[styles.featureSection, { backgroundColor: theme.backgroundDefault }]}>
          {AI_FEATURES.map((feature, idx) => (
            <View 
              key={feature.name}
              style={[
                styles.featureRow,
                idx < AI_FEATURES.length - 1 && { borderBottomColor: theme.backgroundSecondary, borderBottomWidth: 1 }
              ]}
            >
              <View style={[
                styles.featureIcon, 
                { backgroundColor: feature.runsOnDevice ? theme.success + "20" : "#FF9500" + "20" }
              ]}>
                <Feather 
                  name={feature.icon as any} 
                  size={16} 
                  color={feature.runsOnDevice ? theme.success : "#FF9500"} 
                />
              </View>
              <View style={styles.featureInfo}>
                <View style={styles.featureHeader}>
                  <Text style={[styles.featureName, { color: theme.text }]}>
                    {feature.name}
                  </Text>
                  <View style={[
                    styles.featureBadge, 
                    { backgroundColor: feature.runsOnDevice ? theme.success + "20" : "#FF9500" + "20" }
                  ]}>
                    <Text style={[
                      styles.featureBadgeText, 
                      { color: feature.runsOnDevice ? theme.success : "#FF9500" }
                    ]}>
                      {feature.runsOnDevice ? "On-Device" : "Cloud"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
                  {feature.description}
                </Text>
                <View style={styles.featureReqs}>
                  <Text style={[styles.featureReq, { color: theme.textSecondary }]}>
                    iOS {feature.minIOS}
                  </Text>
                  <Text style={[styles.featureReqDot, { color: theme.textSecondary }]}>•</Text>
                  <Text style={[styles.featureReq, { color: theme.textSecondary }]}>
                    {feature.minChip}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Moondream Fallback */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Cloud Fallback
        </ThemedText>
        
        <View style={[styles.fallbackSection, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.fallbackIcon, { backgroundColor: "#FF9500" + "20" }]}>
            <Feather name="cloud" size={24} color="#FF9500" />
          </View>
          <Text style={[styles.fallbackTitle, { color: theme.text }]}>
            Moondream Works Everywhere
          </Text>
          <Text style={[styles.fallbackDesc, { color: theme.textSecondary }]}>
            Even if your device doesn't support fast on-device AI, Moondream's cloud API can handle:
          </Text>
          <View style={styles.fallbackFeatures}>
            {[
              "Custom object detection",
              "Scene descriptions",
              "Identity-based tracking",
              "Natural language queries",
            ].map((feature, idx) => (
              <View key={idx} style={styles.fallbackFeatureRow}>
                <Feather name="check" size={14} color={theme.success} />
                <Text style={[styles.fallbackFeatureText, { color: theme.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.fallbackNote, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="info" size={14} color={theme.textSecondary} />
            <Text style={[styles.fallbackNoteText, { color: theme.textSecondary }]}>
              Cloud features require internet and may have 200-800ms latency vs 10-50ms for on-device AI.
            </Text>
          </View>
        </View>

        {/* Performance Tips */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Performance Tips
        </ThemedText>
        
        <View style={[styles.tipsSection, { backgroundColor: theme.backgroundDefault }]}>
          {[
            { icon: "battery-charging", tip: "Close background apps to free up Neural Engine" },
            { icon: "thermometer", tip: "Avoid prolonged use if device feels warm" },
            { icon: "wifi", tip: "Use Wi-Fi for cloud features when possible" },
            { icon: "settings", tip: "Lower stream quality for faster AI processing" },
          ].map((item, idx) => (
            <View 
              key={idx} 
              style={[
                styles.tipRow,
                idx < 3 && { borderBottomColor: theme.backgroundSecondary, borderBottomWidth: 1 }
              ]}
            >
              <Feather name={item.icon as any} size={18} color={theme.primary} />
              <Text style={[styles.tipText, { color: theme.text }]}>{item.tip}</Text>
            </View>
          ))}
        </View>

        {/* Recommendation */}
        <View style={[styles.recommendSection, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30" }]}>
          <View style={styles.recommendHeader}>
            <Feather name="award" size={20} color={theme.primary} />
            <Text style={[styles.recommendTitle, { color: theme.primary }]}>
              Recommended Devices
            </Text>
          </View>
          <Text style={[styles.recommendText, { color: theme.text }]}>
            For the best experience with all AI features running smoothly:
          </Text>
          <Text style={[styles.recommendDevices, { color: theme.textSecondary }]}>
            iPhone 12 or newer • iPhone SE (3rd gen) • Any device with A14+ chip
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  currentDeviceBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  currentDeviceInfo: {
    flex: 1,
  },
  currentDeviceLabel: {
    fontSize: Typography.caption.fontSize,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  currentDeviceName: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
    marginTop: 2,
  },
  currentDeviceTier: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    marginTop: 2,
  },
  introSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  introText: {
    flex: 1,
  },
  introTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  introSubtitle: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  introBody: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
  },
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
  },
  tierSection: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  tierCount: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  tierContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  tierDescription: {
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  deviceList: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  deviceMain: {
    flex: 1,
  },
  deviceName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  deviceChip: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  deviceNotes: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
  },
  featureSection: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  featureInfo: {
    flex: 1,
  },
  featureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  featureBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  featureDesc: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  featureReqs: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  featureReq: {
    fontSize: Typography.caption.fontSize,
  },
  featureReqDot: {
    fontSize: Typography.caption.fontSize,
  },
  fallbackSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  fallbackIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  fallbackTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  fallbackDesc: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  fallbackFeatures: {
    alignSelf: "stretch",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fallbackFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fallbackFeatureText: {
    fontSize: Typography.body.fontSize,
  },
  fallbackNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignSelf: "stretch",
  },
  fallbackNoteText: {
    flex: 1,
    fontSize: Typography.small.fontSize,
    lineHeight: 18,
  },
  tipsSection: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: Typography.body.fontSize,
  },
  recommendSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  recommendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  recommendTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  recommendText: {
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  recommendDevices: {
    fontSize: Typography.small.fontSize,
    fontStyle: "italic",
  },
});
