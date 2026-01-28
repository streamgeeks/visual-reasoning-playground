import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import {
  SecuritySettings,
  getSecuritySettings,
  saveSecuritySettings,
  DEFAULT_SECURITY_SETTINGS,
} from "@/lib/storage";
import {
  getBiometricCapabilities,
  getBiometricDisplayName,
  canEnableBiometricProtection,
  authenticateWithBiometrics,
  BiometricType,
} from "@/lib/biometricAuth";
import { CloudActivityIndicator } from "@/components/CloudActivityIndicator";

interface SecurityItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SecurityToggleItem({
  icon,
  iconColor,
  title,
  description,
  value,
  onValueChange,
  disabled,
}: SecurityItemProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.settingItem, { backgroundColor: theme.backgroundDefault, opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + "20" }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: iconColor + "80" }}
        thumbColor={value ? iconColor : theme.textSecondary}
      />
    </View>
  );
}

interface StatusCardProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  status: string;
  statusColor: string;
}

function StatusCard({ icon, iconColor, title, status, statusColor }: StatusCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.statusCard, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.statusIconContainer, { backgroundColor: iconColor + "20" }]}>
        <Feather name={icon} size={24} color={iconColor} />
      </View>
      <Text style={[styles.statusTitle, { color: theme.text }]}>{title}</Text>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
      </View>
    </View>
  );
}

export default function SecurityDashboardScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const [securitySettings, capabilities] = await Promise.all([
      getSecuritySettings(),
      getBiometricCapabilities(),
    ]);
    setSettings(securitySettings);
    setBiometricType(capabilities.biometricType);
    setBiometricAvailable(capabilities.isAvailable);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const updateSetting = async <K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSecuritySettings({ [key]: value });
  };

  const handlePrivacyModeToggle = async (enabled: boolean) => {
    if (enabled) {
      Alert.alert(
        "Enable Privacy Mode",
        "This will disable ALL cloud AI features. Only on-device processing (YOLO + Apple Vision) will be available.\n\nMoondream features will be unavailable until you disable Privacy Mode.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Enable",
            style: "destructive",
            onPress: () => updateSetting("privacyModeEnabled", true),
          },
        ]
      );
    } else {
      updateSetting("privacyModeEnabled", false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      const { canEnable, reason } = await canEnableBiometricProtection();
      if (!canEnable) {
        Alert.alert("Cannot Enable", reason || "Biometric authentication is not available");
        return;
      }

      const result = await authenticateWithBiometrics(
        `Authenticate to enable ${getBiometricDisplayName(biometricType)} protection`
      );

      if (result.success) {
        updateSetting("biometricProtectionEnabled", true);
      } else if (result.error && result.error !== "Authentication cancelled") {
        Alert.alert("Authentication Failed", result.error);
      }
    } else {
      const result = await authenticateWithBiometrics(
        `Authenticate to disable ${getBiometricDisplayName(biometricType)} protection`
      );

      if (result.success) {
        updateSetting("biometricProtectionEnabled", false);
      }
    }
  };

  const securityScore = (() => {
    let score = 0;
    if (settings.privacyModeEnabled) score += 40;
    if (settings.biometricProtectionEnabled) score += 30;
    if (settings.autoClearCapturesEnabled) score += 20;
    if (settings.showCloudIndicator) score += 10;
    return score;
  })();

  const getScoreColor = () => {
    if (securityScore >= 80) return theme.success;
    if (securityScore >= 50) return theme.warning;
    return theme.error;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroSection, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
          <Text style={[styles.scoreNumber, { color: getScoreColor() }]}>{securityScore}</Text>
          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Security</Text>
        </View>
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          {securityScore >= 80
            ? "Maximum Protection"
            : securityScore >= 50
            ? "Good Protection"
            : "Basic Protection"}
        </Text>
        <Text style={[styles.heroDescription, { color: theme.textSecondary }]}>
          {settings.privacyModeEnabled
            ? "All AI processing runs on-device. No data leaves your device."
            : "Cloud AI is enabled for enhanced features. Your data is encrypted in transit."}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <StatusCard
          icon={settings.privacyModeEnabled ? "shield" : "cloud"}
          iconColor={settings.privacyModeEnabled ? theme.success : theme.accent}
          title="AI Processing"
          status={settings.privacyModeEnabled ? "Local Only" : "Cloud Enabled"}
          statusColor={settings.privacyModeEnabled ? theme.success : theme.accent}
        />
        <StatusCard
          icon="key"
          iconColor={theme.primary}
          title="API Keys"
          status="Keychain"
          statusColor={theme.success}
        />
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        PRIVACY CONTROLS
      </Text>

      <SecurityToggleItem
        icon="shield"
        iconColor={theme.success}
        title="Privacy Mode"
        description="Disable all cloud AI. Only use on-device YOLO and Apple Vision."
        value={settings.privacyModeEnabled}
        onValueChange={handlePrivacyModeToggle}
      />

      <SecurityToggleItem
        icon={biometricType === "facial" ? "eye" : "lock"}
        iconColor={theme.primary}
        title={`${getBiometricDisplayName(biometricType)} Protection`}
        description={`Require ${getBiometricDisplayName(biometricType)} to access API keys and camera credentials.`}
        value={settings.biometricProtectionEnabled}
        onValueChange={handleBiometricToggle}
        disabled={!biometricAvailable}
      />

      <SecurityToggleItem
        icon="trash-2"
        iconColor={theme.warning}
        title="Auto-Clear Captures"
        description="Automatically delete captured frames after AI processing."
        value={settings.autoClearCapturesEnabled}
        onValueChange={(v) => updateSetting("autoClearCapturesEnabled", v)}
      />

      <SecurityToggleItem
        icon="activity"
        iconColor={theme.accent}
        title="Cloud Activity Indicator"
        description="Show visual indicator when images are sent to cloud services."
        value={settings.showCloudIndicator}
        onValueChange={(v) => updateSetting("showCloudIndicator", v)}
      />

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        CURRENT STATUS
      </Text>

      <CloudActivityIndicator showStats />

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        DATA FLOW
      </Text>

      <View style={[styles.dataFlowCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.dataFlowRow}>
          <View style={[styles.dataFlowNode, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="camera" size={20} color={theme.primary} />
            <Text style={[styles.dataFlowNodeLabel, { color: theme.text }]}>Camera</Text>
          </View>
          <Feather name="arrow-right" size={16} color={theme.textSecondary} />
          <View style={[styles.dataFlowNode, { backgroundColor: theme.success + "20" }]}>
            <Feather name="smartphone" size={20} color={theme.success} />
            <Text style={[styles.dataFlowNodeLabel, { color: theme.text }]}>Device</Text>
          </View>
          {!settings.privacyModeEnabled && (
            <>
              <Feather name="arrow-right" size={16} color={theme.textSecondary} />
              <View style={[styles.dataFlowNode, { backgroundColor: theme.accent + "20" }]}>
                <Feather name="cloud" size={20} color={theme.accent} />
                <Text style={[styles.dataFlowNodeLabel, { color: theme.text }]}>Cloud</Text>
              </View>
            </>
          )}
        </View>
        <Text style={[styles.dataFlowDescription, { color: theme.textSecondary }]}>
          {settings.privacyModeEnabled
            ? "Camera frames stay on your device. YOLO and Apple Vision process locally."
            : "Frames may be sent to Moondream for enhanced AI features (encrypted)."}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        SECURITY DETAILS
      </Text>

      <View style={[styles.detailsCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.detailRow}>
          <Feather name="check-circle" size={16} color={theme.success} />
          <Text style={[styles.detailText, { color: theme.text }]}>
            API keys stored in iOS Keychain (hardware-encrypted)
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="check-circle" size={16} color={theme.success} />
          <Text style={[styles.detailText, { color: theme.text }]}>
            Camera credentials protected by Secure Enclave
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="check-circle" size={16} color={theme.success} />
          <Text style={[styles.detailText, { color: theme.text }]}>
            All network traffic encrypted with TLS 1.3
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="check-circle" size={16} color={theme.success} />
          <Text style={[styles.detailText, { color: theme.text }]}>
            No analytics, telemetry, or tracking
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="check-circle" size={16} color={theme.success} />
          <Text style={[styles.detailText, { color: theme.text }]}>
            YOLO + Vision run entirely on-device (Neural Engine)
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => updateSetting("lastSecurityAudit", new Date().toISOString())}
        style={({ pressed }) => [
          styles.auditButton,
          { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Feather name="check-square" size={18} color="#fff" />
        <Text style={styles.auditButtonText}>Mark Security Audit Complete</Text>
      </Pressable>

      {settings.lastSecurityAudit && (
        <Text style={[styles.auditDate, { color: theme.textSecondary }]}>
          Last audit: {new Date(settings.lastSecurityAudit).toLocaleDateString()}
        </Text>
      )}
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
  loadingText: {
    textAlign: "center",
    marginTop: 100,
  },
  heroSection: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: "700",
  },
  scoreLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  heroDescription: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statusCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statusTitle: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  statusText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: Typography.small.fontSize,
    lineHeight: 18,
  },
  dataFlowCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  dataFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  dataFlowNode: {
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minWidth: 70,
  },
  dataFlowNodeLabel: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
    marginTop: 4,
  },
  dataFlowDescription: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
    lineHeight: 20,
  },
  detailsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  auditButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  auditButtonText: {
    color: "#fff",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  auditDate: {
    fontSize: Typography.caption.fontSize,
    textAlign: "center",
  },
});
