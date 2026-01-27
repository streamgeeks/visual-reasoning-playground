import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useVisionCameraPermission } from "@/components/VisionCamera";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import {
  CameraProfile,
  ColorStylePreset,
  CameraImageSettings,
  getCameraProfiles,
} from "@/lib/storage";
import {
  getColorStylePresets,
  BUILT_IN_PRESETS,
  mergeWithDefaults,
} from "@/lib/colorStyles";
import {
  applyCameraImageSettings,
  resetCameraImageSettings,
  setCameraBrightness,
  setCameraSaturation,
  setCameraContrast,
  setCameraSharpness,
  setCameraColorTemperature,
  setCameraRedGain,
  setCameraBlueGain,
  testCameraConnection,
} from "@/lib/camera";
import {
  isColorAnalysisAvailable,
  analyzeImage,
  ColorProfile,
} from "color-analysis";
import * as CameraControls from "camera-controls";

interface ColorMatcherProps {
  camera: CameraProfile | null;
  isConnected: boolean;
  getFrame: () => Promise<string | null>;
  onCameraChange?: (camera: CameraProfile) => void;
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const PRESET_ICONS: Record<string, FeatherIconName> = {
  circle: "circle",
  sun: "sun",
  cloud: "cloud",
  home: "home",
  sunrise: "sunrise",
  zap: "zap",
  user: "user",
  moon: "moon",
  briefcase: "briefcase",
  mic: "mic",
  film: "film",
};

const PTZ_SETTING_RANGES = {
  brightness: { min: 0, max: 14, step: 1 },
  saturation: { min: 0, max: 14, step: 1 },
  contrast: { min: 0, max: 14, step: 1 },
  sharpness: { min: 0, max: 14, step: 1 },
  colorTemperature: { min: 0, max: 37, step: 1 },
  redGain: { min: 0, max: 255, step: 5 },
  blueGain: { min: 0, max: 255, step: 5 },
};

const NATIVE_SETTING_RANGES = {
  exposure: { min: -2, max: 2, step: 0.5 },
  colorTemperature: { min: 2500, max: 7500, step: 500 },
};

export function ColorMatcher({
  camera,
  isConnected,
  getFrame,
  onCameraChange,
}: ColorMatcherProps) {
  const { theme } = useTheme();
  const { granted: permissionGranted } = useVisionCameraPermission();

  const [allCameras, setAllCameras] = useState<CameraProfile[]>([]);
  const [activeCamera, setActiveCamera] = useState<CameraProfile | null>(
    camera,
  );
  const [connectingCameraId, setConnectingCameraId] = useState<string | null>(
    null,
  );
  const [connectedCameraIds, setConnectedCameraIds] = useState<Set<string>>(
    new Set(),
  );

  const [presets, setPresets] = useState<ColorStylePreset[]>(BUILT_IN_PRESETS);
  const [selectedPreset, setSelectedPreset] = useState<ColorStylePreset | null>(
    null,
  );
  const [isApplying, setIsApplying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<ColorProfile | null>(
    null,
  );
  const [applyingControl, setApplyingControl] = useState<string | null>(null);

  const [ptzSettings, setPtzSettings] = useState<CameraImageSettings>({
    whiteBalanceMode: "auto",
    colorTemperature: 21,
    redGain: 128,
    blueGain: 128,
    brightness: 7,
    saturation: 7,
    contrast: 7,
    sharpness: 7,
    hue: 7,
  });

  const [nativeSettings, setNativeSettings] = useState({
    exposure: 0,
    colorTemperature: 5500,
  });

  const isPtzConnected =
    (isConnected && activeCamera) ||
    (activeCamera && connectedCameraIds.has(activeCamera.id));
  const isNativeCameraAvailable =
    permissionGranted && CameraControls.isAvailable();
  const canApply = isPtzConnected || isNativeCameraAvailable;

  useEffect(() => {
    loadPresets();
    loadCameras();
  }, []);

  useEffect(() => {
    if (camera) {
      setActiveCamera(camera);
      if (isConnected) {
        setConnectedCameraIds((prev) => new Set([...prev, camera.id]));
      }
    }
  }, [camera, isConnected]);

  const loadPresets = async () => {
    const allPresets = await getColorStylePresets();
    setPresets(allPresets);
  };

  const loadCameras = async () => {
    const cameras = await getCameraProfiles();
    setAllCameras(cameras);
  };

  const handleSwitchCamera = useCallback(
    async (cam: CameraProfile) => {
      if (connectingCameraId) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (connectedCameraIds.has(cam.id)) {
        setActiveCamera(cam);
        onCameraChange?.(cam);
        return;
      }

      setConnectingCameraId(cam.id);
      try {
        const result = await testCameraConnection(cam);
        if (result.success) {
          setConnectedCameraIds((prev) => new Set([...prev, cam.id]));
          setActiveCamera(cam);
          onCameraChange?.(cam);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert(
            "Connection Failed",
            result.error || "Could not connect to camera",
          );
        }
      } catch (err) {
        Alert.alert("Connection Failed", "Could not connect to camera");
      } finally {
        setConnectingCameraId(null);
      }
    },
    [connectingCameraId, connectedCameraIds, onCameraChange],
  );

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

  const mapColorTempToKelvin = (ptzValue: number): number =>
    2500 + ptzValue * 148.6;
  const mapBrightnessToExposure = (ptzValue: number): number =>
    ((ptzValue - 7) / 7) * 2;

  const handleSelectPreset = useCallback(
    async (preset: ColorStylePreset) => {
      if (!canApply || isApplying) return;

      setSelectedPreset(preset);
      setIsApplying(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const fullSettings = mergeWithDefaults(preset.settings);

        if (isPtzConnected && camera) {
          const result = await applyCameraImageSettings(camera, fullSettings);
          if (result.success) {
            setPtzSettings(fullSettings);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            setPtzSettings(fullSettings);
            console.log(
              "[ColorMatcher] Partial apply:",
              result.applied,
              "Failed:",
              result.failed,
            );
          }
        } else if (isNativeCameraAvailable) {
          const kelvin = mapColorTempToKelvin(fullSettings.colorTemperature);
          await CameraControls.setWhiteBalanceTemperature(kelvin);

          const exposure = mapBrightnessToExposure(fullSettings.brightness);
          await CameraControls.setExposureCompensation(exposure);

          setNativeSettings({
            exposure,
            colorTemperature: kelvin,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (err: any) {
        console.error("[ColorMatcher] Apply error:", err);
      } finally {
        setIsApplying(false);
      }
    },
    [canApply, isApplying, isPtzConnected, camera, isNativeCameraAvailable],
  );

  const adjustPtzSetting = useCallback(
    async (
      setting: keyof typeof PTZ_SETTING_RANGES,
      direction: "up" | "down",
    ) => {
      if (!isPtzConnected || !camera || applyingControl) return;

      const range = PTZ_SETTING_RANGES[setting];
      const currentValue = ptzSettings[setting] as number;
      const newValue =
        direction === "up"
          ? Math.min(currentValue + range.step, range.max)
          : Math.max(currentValue - range.step, range.min);

      if (newValue === currentValue) return;

      setApplyingControl(setting);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        let success = false;

        switch (setting) {
          case "brightness":
            success = await setCameraBrightness(camera, newValue);
            break;
          case "saturation":
            success = await setCameraSaturation(camera, newValue);
            break;
          case "contrast":
            success = await setCameraContrast(camera, newValue);
            break;
          case "sharpness":
            success = await setCameraSharpness(camera, newValue);
            break;
          case "colorTemperature":
            success = await setCameraColorTemperature(camera, newValue);
            break;
          case "redGain":
            success = await setCameraRedGain(camera, newValue);
            break;
          case "blueGain":
            success = await setCameraBlueGain(camera, newValue);
            break;
        }

        if (success) {
          setPtzSettings((prev) => ({ ...prev, [setting]: newValue }));
        }
      } catch (err) {
        console.error(`[ColorMatcher] Error adjusting ${setting}:`, err);
      } finally {
        setApplyingControl(null);
      }
    },
    [isPtzConnected, camera, ptzSettings, applyingControl],
  );

  const adjustNativeSetting = useCallback(
    async (
      setting: keyof typeof NATIVE_SETTING_RANGES,
      direction: "up" | "down",
    ) => {
      if (!isNativeCameraAvailable || applyingControl) return;

      const range = NATIVE_SETTING_RANGES[setting];
      const currentValue = nativeSettings[setting];
      const newValue =
        direction === "up"
          ? Math.min(currentValue + range.step, range.max)
          : Math.max(currentValue - range.step, range.min);

      if (newValue === currentValue) return;

      setApplyingControl(setting);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        if (setting === "exposure") {
          await CameraControls.setExposureCompensation(newValue);
        } else if (setting === "colorTemperature") {
          await CameraControls.setWhiteBalanceTemperature(newValue);
        }
        setNativeSettings((prev) => ({ ...prev, [setting]: newValue }));
      } catch (err) {
        console.error(`[ColorMatcher] Error adjusting ${setting}:`, err);
      } finally {
        setApplyingControl(null);
      }
    },
    [isNativeCameraAvailable, nativeSettings, applyingControl],
  );

  const handleResetToDefault = useCallback(async () => {
    if (!canApply || isApplying) return;

    setIsApplying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (isPtzConnected && camera) {
        await resetCameraImageSettings(camera);
        setPtzSettings({
          whiteBalanceMode: "auto",
          colorTemperature: 21,
          redGain: 128,
          blueGain: 128,
          brightness: 7,
          saturation: 7,
          contrast: 7,
          sharpness: 7,
          hue: 7,
        });
      } else if (isNativeCameraAvailable) {
        await CameraControls.resetToAuto();
        setNativeSettings({ exposure: 0, colorTemperature: 5500 });
      }

      const neutralPreset = presets.find((p) => p.id === "neutral");
      setSelectedPreset(neutralPreset || null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("[ColorMatcher] Reset error:", err);
    } finally {
      setIsApplying(false);
    }
  }, [
    canApply,
    isApplying,
    isPtzConnected,
    camera,
    isNativeCameraAvailable,
    presets,
  ]);

  const renderPresetCard = (preset: ColorStylePreset) => {
    const isSelected = selectedPreset?.id === preset.id;
    const iconName = PRESET_ICONS[preset.icon] || "sliders";
    const hasThumbnail = preset.thumbnailImage !== undefined;

    if (hasThumbnail) {
      return (
        <Pressable
          key={preset.id}
          onPress={() => handleSelectPreset(preset)}
          disabled={isApplying}
          style={[
            styles.presetCardWithImage,
            {
              borderColor: isSelected ? theme.primary : "transparent",
              borderWidth: isSelected ? 2 : 0,
              opacity: isApplying && !isSelected ? 0.5 : 1,
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
          {isSelected && (
            <View
              style={[styles.selectedBadge, { backgroundColor: theme.primary }]}
            >
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
        disabled={isApplying}
        style={[
          styles.presetCard,
          {
            backgroundColor: isSelected
              ? theme.primary + "20"
              : theme.backgroundSecondary,
            borderColor: isSelected ? theme.primary : "transparent",
            borderWidth: isSelected ? 2 : 0,
            opacity: isApplying && !isSelected ? 0.5 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.presetIconContainer,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <Feather
            name={iconName}
            size={20}
            color={isSelected ? theme.primary : theme.textSecondary}
          />
        </View>
        <Text
          style={[
            styles.presetName,
            { color: isSelected ? theme.primary : theme.text },
          ]}
          numberOfLines={1}
        >
          {preset.name}
        </Text>
        {isSelected && (
          <View
            style={[styles.selectedBadge, { backgroundColor: theme.primary }]}
          >
            <Feather name="check" size={10} color="#FFF" />
          </View>
        )}
      </Pressable>
    );
  };

  const renderPtzControl = (
    label: string,
    setting: keyof typeof PTZ_SETTING_RANGES,
    icon: FeatherIconName,
  ) => {
    const value = ptzSettings[setting] as number;
    const range = PTZ_SETTING_RANGES[setting];
    const isAdjusting = applyingControl === setting;

    return (
      <View key={setting} style={styles.adjustmentRow}>
        <View style={styles.adjustmentLabelContainer}>
          <Feather name={icon} size={14} color={theme.textSecondary} />
          <Text style={[styles.adjustmentLabel, { color: theme.text }]}>
            {label}
          </Text>
        </View>

        <View style={styles.adjustmentControls}>
          <Pressable
            onPress={() => adjustPtzSetting(setting, "down")}
            disabled={isAdjusting || value <= range.min}
            style={[
              styles.adjustButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: value <= range.min ? 0.3 : 1,
              },
            ]}
          >
            <Feather name="minus" size={16} color={theme.primary} />
          </Pressable>

          <View style={styles.adjustmentValueContainer}>
            {isAdjusting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.adjustmentValue, { color: theme.text }]}>
                {value}
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => adjustPtzSetting(setting, "up")}
            disabled={isAdjusting || value >= range.max}
            style={[
              styles.adjustButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: value >= range.max ? 0.3 : 1,
              },
            ]}
          >
            <Feather name="plus" size={16} color={theme.primary} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderNativeControl = (
    label: string,
    setting: keyof typeof NATIVE_SETTING_RANGES,
    icon: FeatherIconName,
    formatValue: (v: number) => string,
  ) => {
    const value = nativeSettings[setting];
    const range = NATIVE_SETTING_RANGES[setting];
    const isAdjusting = applyingControl === setting;

    return (
      <View key={setting} style={styles.adjustmentRow}>
        <View style={styles.adjustmentLabelContainer}>
          <Feather name={icon} size={14} color={theme.textSecondary} />
          <Text style={[styles.adjustmentLabel, { color: theme.text }]}>
            {label}
          </Text>
        </View>

        <View style={styles.adjustmentControls}>
          <Pressable
            onPress={() => adjustNativeSetting(setting, "down")}
            disabled={isAdjusting || value <= range.min}
            style={[
              styles.adjustButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: value <= range.min ? 0.3 : 1,
              },
            ]}
          >
            <Feather name="minus" size={16} color={theme.primary} />
          </Pressable>

          <View style={styles.adjustmentValueContainer}>
            {isAdjusting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.adjustmentValue, { color: theme.text }]}>
                {formatValue(value)}
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => adjustNativeSetting(setting, "up")}
            disabled={isAdjusting || value >= range.max}
            style={[
              styles.adjustButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: value >= range.max ? 0.3 : 1,
              },
            ]}
          >
            <Feather name="plus" size={16} color={theme.primary} />
          </Pressable>
        </View>
      </View>
    );
  };

  if (!canApply) {
    return (
      <View
        style={[
          styles.notConnected,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name="wifi-off" size={32} color={theme.textSecondary} />
        <Text style={[styles.notConnectedText, { color: theme.textSecondary }]}>
          Connect to a PTZ camera or enable device camera to adjust color
          settings
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Select Style
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Tap to apply instantly
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {presets.map(renderPresetCard)}
        </ScrollView>

        {isApplying && (
          <View style={styles.applyingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.applyingText, { color: theme.textSecondary }]}>
              Applying...
            </Text>
          </View>
        )}
      </View>

      {isColorAnalysisAvailable && (
        <View
          style={[
            styles.section,
            styles.cardSection,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <View style={styles.analysisHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
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
                  <Text style={styles.analyzeButtonText}>
                    {currentProfile ? "Re-analyze" : "Analyze"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {currentProfile && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.profileDisplay}
            >
              <View style={styles.profileRow}>
                <View style={styles.profileItem}>
                  <Text
                    style={[
                      styles.profileLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Brightness
                  </Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {(currentProfile.brightness * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.profileItem}>
                  <Text
                    style={[
                      styles.profileLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Saturation
                  </Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {(currentProfile.saturation * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.profileItem}>
                  <Text
                    style={[
                      styles.profileLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Temperature
                  </Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {currentProfile.temperature > 1
                      ? "Cool"
                      : currentProfile.temperature < 0.8
                        ? "Warm"
                        : "Neutral"}
                  </Text>
                </View>
              </View>
              <View style={styles.colorSwatch}>
                <View
                  style={[
                    styles.swatchColor,
                    {
                      backgroundColor: `rgb(${Math.round(currentProfile.red * 255)}, ${Math.round(currentProfile.green * 255)}, ${Math.round(currentProfile.blue * 255)})`,
                    },
                  ]}
                />
                <Text
                  style={[styles.swatchLabel, { color: theme.textSecondary }]}
                >
                  Average Color
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      <View
        style={[
          styles.section,
          styles.cardSection,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Fine Tune
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          {isPtzConnected
            ? "Adjust PTZ camera settings"
            : "Adjust device camera settings"}
        </Text>

        <View style={styles.adjustmentsList}>
          {isPtzConnected ? (
            <>
              {renderPtzControl("Brightness", "brightness", "sun")}
              {renderPtzControl("Saturation", "saturation", "droplet")}
              {renderPtzControl("Contrast", "contrast", "sliders")}
              {renderPtzControl("Sharpness", "sharpness", "aperture")}
              {renderPtzControl(
                "Color Temp",
                "colorTemperature",
                "thermometer",
              )}
              {renderPtzControl("Red Gain", "redGain", "circle")}
              {renderPtzControl("Blue Gain", "blueGain", "circle")}
            </>
          ) : (
            <>
              {renderNativeControl("Exposure", "exposure", "sun", (v) =>
                v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1),
              )}
              {renderNativeControl(
                "Color Temp",
                "colorTemperature",
                "thermometer",
                (v) => `${v}K`,
              )}
            </>
          )}
        </View>
      </View>

      <Pressable
        onPress={handleResetToDefault}
        disabled={isApplying}
        style={[
          styles.resetButton,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name="refresh-cw" size={16} color={theme.textSecondary} />
        <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>
          Reset to Defaults
        </Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  cardSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
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
    marginTop: 2,
    marginBottom: Spacing.sm,
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
  selectedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  applyingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  applyingText: {
    fontSize: Typography.small.fontSize,
  },
  analysisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  analyzeButtonText: {
    color: "#FFF",
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
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
  adjustmentsList: {
    gap: Spacing.md,
  },
  adjustmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adjustmentLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  adjustmentLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  adjustmentControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  adjustmentValueContainer: {
    width: 50,
    alignItems: "center",
  },
  adjustmentValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    textAlign: "center",
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
