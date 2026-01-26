import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCameraPermissions } from "expo-camera";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { CameraProfile, ColorStylePreset, CameraImageSettings } from "@/lib/storage";
import { 
  getColorStylePresets, 
  BUILT_IN_PRESETS,
  mergeWithDefaults,
} from "@/lib/colorStyles";
import { applyCameraImageSettings, resetCameraImageSettings } from "@/lib/camera";
import { isColorAnalysisAvailable, analyzeImage, ColorProfile } from "color-analysis";
import * as CameraControls from "camera-controls";

interface ColorMatcherProps {
  camera: CameraProfile | null;
  isConnected: boolean;
  getFrame: () => Promise<string | null>;
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const PRESET_ICONS: Record<string, FeatherIconName> = {
  "circle": "circle",
  "sun": "sun",
  "cloud": "cloud",
  "home": "home",
  "sunrise": "sunrise",
  "zap": "zap",
  "user": "user",
  "moon": "moon",
  "briefcase": "briefcase",
  "mic": "mic",
  "film": "film",
};

function mapColorTempToKelvin(ptzValue: number): number {
  return 2500 + (ptzValue * 148.6);
}

function mapBrightnessToExposure(ptzValue: number): number {
  return ((ptzValue - 7) / 7) * 2;
}

export function ColorMatcher({ camera, isConnected, getFrame }: ColorMatcherProps) {
  const { theme } = useTheme();
  const [permission] = useCameraPermissions();
  
  const [presets, setPresets] = useState<ColorStylePreset[]>(BUILT_IN_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState<ColorStylePreset | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<ColorProfile | null>(null);
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  
  const isPtzConnected = isConnected && camera;
  const isNativeCameraAvailable = permission?.granted && CameraControls.isAvailable();
  const canApply = isPtzConnected || isNativeCameraAvailable;

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    const allPresets = await getColorStylePresets();
    setPresets(allPresets);
  };

  const analyzeCurrentFrame = useCallback(async () => {
    if (!isColorAnalysisAvailable) {
      Alert.alert("Not Available", "Color analysis requires iOS");
      return;
    }

    setIsAnalyzing(true);
    try {
      const frame = await getFrame();
      if (frame) {
        const profile = await analyzeImage(frame);
        setCurrentProfile(profile);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("[ColorMatcher] Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [getFrame]);

  const handleSelectPreset = (preset: ColorStylePreset) => {
    setSelectedPreset(preset);
    Haptics.selectionAsync();
  };

  const handleApplyPreset = async () => {
    if (!selectedPreset || !canApply) return;

    setIsApplying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const fullSettings = mergeWithDefaults(selectedPreset.settings);
      
      if (isPtzConnected && camera) {
        const result = await applyCameraImageSettings(camera, fullSettings);

        if (result.success) {
          setLastApplied(selectedPreset.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert(
            "Partial Success",
            `Applied: ${result.applied.join(", ")}\nFailed: ${result.failed.join(", ")}`
          );
        }
      } else if (isNativeCameraAvailable) {
        const kelvin = mapColorTempToKelvin(fullSettings.colorTemperature);
        await CameraControls.setWhiteBalanceTemperature(kelvin);
        
        const exposure = mapBrightnessToExposure(fullSettings.brightness);
        await CameraControls.setExposureCompensation(exposure);
        
        setLastApplied(selectedPreset.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Applied", `${selectedPreset.name} applied to native camera`);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to apply preset");
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!canApply) return;

    Alert.alert(
      "Reset Settings",
      "Reset all color settings to defaults?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setIsApplying(true);
            try {
              if (isPtzConnected && camera) {
                await resetCameraImageSettings(camera);
              } else if (isNativeCameraAvailable) {
                await CameraControls.resetToAuto();
              }
              setSelectedPreset(presets.find(p => p.id === "neutral") || null);
              setLastApplied("neutral");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to reset");
            } finally {
              setIsApplying(false);
            }
          },
        },
      ]
    );
  };

  const renderPresetCard = (preset: ColorStylePreset) => {
    const isSelected = selectedPreset?.id === preset.id;
    const isApplied = lastApplied === preset.id;
    const iconName = PRESET_ICONS[preset.icon] || "sliders";
    const hasThumbnail = preset.thumbnailImage !== undefined;

    if (hasThumbnail) {
      return (
        <Pressable
          key={preset.id}
          onPress={() => handleSelectPreset(preset)}
          style={[
            styles.presetCardWithImage,
            {
              borderColor: isSelected ? theme.primary : "transparent",
              borderWidth: isSelected ? 2 : 0,
            },
          ]}
        >
          <ImageBackground
            source={preset.thumbnailImage}
            style={styles.presetImageBg}
            imageStyle={{ borderRadius: BorderRadius.md }}
          >
            <View style={styles.presetImageOverlay}>
              <Text 
                style={[styles.presetNameOnImage, { color: "#FFF" }]}
                numberOfLines={2}
              >
                {preset.name}
              </Text>
            </View>
          </ImageBackground>
          {isApplied && (
            <View style={[styles.appliedBadge, { backgroundColor: theme.success }]}>
              <Feather name="check" size={10} color="#FFF" />
            </View>
          )}
        </Pressable>
      );
    }

    return (
      <Pressable
        key={preset.id}
        onPress={() => handleSelectPreset(preset)}
        style={[
          styles.presetCard,
          {
            backgroundColor: isSelected ? theme.primary + "20" : theme.backgroundSecondary,
            borderColor: isSelected ? theme.primary : "transparent",
            borderWidth: isSelected ? 2 : 0,
          },
        ]}
      >
        <View style={[styles.presetIconContainer, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name={iconName} size={20} color={isSelected ? theme.primary : theme.textSecondary} />
        </View>
        <Text 
          style={[styles.presetName, { color: isSelected ? theme.primary : theme.text }]}
          numberOfLines={1}
        >
          {preset.name}
        </Text>
        {isApplied && (
          <View style={[styles.appliedBadge, { backgroundColor: theme.success }]}>
            <Feather name="check" size={10} color="#FFF" />
          </View>
        )}
      </Pressable>
    );
  };

  const renderSettingPreview = (label: string, value: number | string | undefined, max?: number) => {
    if (value === undefined) return null;
    
    const numValue = typeof value === "number" ? value : 0;
    const percentage = max ? (numValue / max) * 100 : 0;

    return (
      <View style={styles.settingRow}>
        <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>{label}</Text>
        {max ? (
          <View style={styles.settingBarContainer}>
            <View style={[styles.settingBarBg, { backgroundColor: theme.backgroundSecondary }]}>
              <View 
                style={[
                  styles.settingBarFill, 
                  { backgroundColor: theme.primary, width: `${percentage}%` }
                ]} 
              />
            </View>
            <Text style={[styles.settingValue, { color: theme.text }]}>{value}</Text>
          </View>
        ) : (
          <Text style={[styles.settingValue, { color: theme.text }]}>{value}</Text>
        )}
      </View>
    );
  };

  if (!canApply) {
    return (
      <View style={[styles.notConnected, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="wifi-off" size={32} color={theme.textSecondary} />
        <Text style={[styles.notConnectedText, { color: theme.textSecondary }]}>
          Connect to a PTZ camera or enable native camera to adjust color settings
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Color Presets
      </Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Tap a style to select, then apply to camera
      </Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsRow}
      >
        {presets.map(renderPresetCard)}
      </ScrollView>

      {selectedPreset && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          style={[styles.selectedCard, { backgroundColor: theme.backgroundSecondary }]}
        >
          <View style={styles.selectedHeader}>
            <View>
              <Text style={[styles.selectedName, { color: theme.text }]}>
                {selectedPreset.name}
              </Text>
              <Text style={[styles.selectedDescription, { color: theme.textSecondary }]}>
                {selectedPreset.description}
              </Text>
            </View>
            {selectedPreset.isBuiltIn && (
              <View style={[styles.builtInBadge, { backgroundColor: theme.primary + "20" }]}>
                <Text style={[styles.builtInText, { color: theme.primary }]}>Built-in</Text>
              </View>
            )}
          </View>

          <View style={styles.settingsPreview}>
            {renderSettingPreview("White Balance", selectedPreset.settings.whiteBalanceMode)}
            {renderSettingPreview("Brightness", selectedPreset.settings.brightness, 14)}
            {renderSettingPreview("Saturation", selectedPreset.settings.saturation, 14)}
            {renderSettingPreview("Contrast", selectedPreset.settings.contrast, 14)}
            {renderSettingPreview("Sharpness", selectedPreset.settings.sharpness, 14)}
            {selectedPreset.settings.colorTemperature !== undefined && (
              renderSettingPreview("Color Temp", selectedPreset.settings.colorTemperature, 37)
            )}
          </View>

          <Pressable
            onPress={handleApplyPreset}
            disabled={isApplying}
            style={[
              styles.applyButton,
              { backgroundColor: theme.primary, opacity: isApplying ? 0.7 : 1 },
            ]}
          >
            {isApplying ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Feather name="check" size={18} color="#FFF" />
                <Text style={styles.applyButtonText}>Apply to Camera</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}

      {isColorAnalysisAvailable && (
        <View style={[styles.analysisSection, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.analysisHeader}>
            <Text style={[styles.analysisSectionTitle, { color: theme.text }]}>
              Scene Analysis
            </Text>
            <Pressable
              onPress={analyzeCurrentFrame}
              disabled={isAnalyzing}
              style={[styles.analyzeButton, { backgroundColor: theme.primary }]}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="eye" size={14} color="#FFF" />
                  <Text style={styles.analyzeButtonText}>Analyze</Text>
                </>
              )}
            </Pressable>
          </View>

          {currentProfile && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.profileDisplay}>
              <View style={styles.profileRow}>
                <View style={styles.profileItem}>
                  <Text style={[styles.profileLabel, { color: theme.textSecondary }]}>Brightness</Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {(currentProfile.brightness * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.profileItem}>
                  <Text style={[styles.profileLabel, { color: theme.textSecondary }]}>Saturation</Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {(currentProfile.saturation * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.profileItem}>
                  <Text style={[styles.profileLabel, { color: theme.textSecondary }]}>Temperature</Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {currentProfile.temperature > 1 ? "Cool" : currentProfile.temperature < 0.8 ? "Warm" : "Neutral"}
                  </Text>
                </View>
              </View>
              <View style={styles.colorSwatch}>
                <View 
                  style={[
                    styles.swatchColor, 
                    { 
                      backgroundColor: `rgb(${Math.round(currentProfile.red * 255)}, ${Math.round(currentProfile.green * 255)}, ${Math.round(currentProfile.blue * 255)})` 
                    }
                  ]} 
                />
                <Text style={[styles.swatchLabel, { color: theme.textSecondary }]}>
                  Avg Color
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      <Pressable
        onPress={handleResetToDefault}
        style={[styles.resetButton, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Feather name="refresh-cw" size={16} color={theme.textSecondary} />
        <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>
          Reset to Defaults
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.md,
  },
  notConnected: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  notConnectedText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  sectionSubtitle: {
    fontSize: Typography.small.fontSize,
    marginTop: -Spacing.xs,
  },
  presetsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  presetCard: {
    width: 90,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.xs,
    position: "relative",
  },
  presetCardWithImage: {
    width: 100,
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  presetImageBg: {
    flex: 1,
    justifyContent: "flex-end",
  },
  presetImageOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: Spacing.xs,
  },
  presetNameOnImage: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  presetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  presetName: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
    textAlign: "center",
  },
  appliedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  selectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  selectedName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  selectedDescription: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  builtInBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  builtInText: {
    fontSize: 10,
    fontWeight: "600",
  },
  settingsPreview: {
    gap: Spacing.xs,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLabel: {
    fontSize: Typography.small.fontSize,
    width: 90,
  },
  settingBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  settingBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  settingValue: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
    width: 40,
    textAlign: "right",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  applyButtonText: {
    color: "#FFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  analysisSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  analysisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  analysisSectionTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  analyzeButtonText: {
    color: "#FFF",
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  profileDisplay: {
    gap: Spacing.sm,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileItem: {
    alignItems: "center",
  },
  profileLabel: {
    fontSize: 10,
  },
  profileValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  colorSwatch: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  swatchColor: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  swatchLabel: {
    fontSize: Typography.small.fontSize,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  resetButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
});
