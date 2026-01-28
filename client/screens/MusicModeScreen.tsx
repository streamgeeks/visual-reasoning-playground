import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { useTheme } from "@/hooks/useTheme";
import { useMusicMode, MusicModeState } from "@/hooks/useMusicMode";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { SettingsRow } from "@/components/SettingsRow";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { PTZPreset, getCurrentCameraId, getCameraProfiles } from "@/lib/storage";
import { ViscaConfig } from "@/lib/visca";

const STATE_LABELS: Record<MusicModeState, string> = {
  idle: "Ready to listen",
  listening: "Listening for music...",
  detected: "Song detected!",
  executing: "Moving camera...",
  error: "Something went wrong",
};

const STATE_ICONS: Record<MusicModeState, keyof typeof Feather.glyphMap> = {
  idle: "mic",
  listening: "radio",
  detected: "music",
  executing: "video",
  error: "alert-circle",
};

export default function MusicModeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [viscaConfig, setViscaConfig] = useState<ViscaConfig | undefined>();
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  const {
    state,
    isListening,
    currentSong,
    audioLevel,
    settings,
    availablePresets,
    startListening,
    stopListening,
    startContinuousMode,
    stopContinuousMode,
    executePresetForSong,
    learnSongPreset,
    dismissSuggestion,
    updateSettings,
  } = useMusicMode({
    viscaConfig,
    onSongDetected: (song) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onPresetExecuted: (preset, song) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: (error) => {
      Alert.alert("Music Mode Error", error);
    },
  });

  useEffect(() => {
    loadViscaConfig();
  }, []);

  const loadViscaConfig = async () => {
    const cameraId = await getCurrentCameraId();
    if (!cameraId) return;

    const profiles = await getCameraProfiles();
    const profile = profiles.find((p) => p.id === cameraId);
    if (profile) {
      setViscaConfig({
        ipAddress: profile.ipAddress,
        port: profile.viscaPort ?? 1259,
      });
    }
  };

  const handleMainButtonPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isListening) {
      if (settings.continuousListening) {
        stopContinuousMode();
      } else {
        stopListening();
      }
    } else {
      if (settings.continuousListening) {
        await startContinuousMode();
      } else {
        await startListening();
      }
    }
  }, [isListening, settings.continuousListening]);

  const handlePresetSelect = useCallback(
    async (preset: PTZPreset) => {
      setShowPresetPicker(false);
      if (currentSong) {
        await learnSongPreset(currentSong, preset.id);
        await executePresetForSong(preset.id);
      }
    },
    [currentSong]
  );

  const handleUseSuggested = useCallback(async () => {
    if (currentSong?.suggestedPreset) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await executePresetForSong(currentSong.suggestedPreset.id);
    }
  }, [currentSong]);

  const renderAudioVisualizer = () => {
    const normalizedLevel = Math.min(1, audioLevel * 10);
    const barCount = 12;

    return (
      <View style={styles.visualizer}>
        {Array.from({ length: barCount }).map((_, i) => {
          const barHeight = Math.random() * normalizedLevel * 40 + 4;
          return (
            <View
              key={i}
              style={[
                styles.visualizerBar,
                {
                  height: isListening ? barHeight : 4,
                  backgroundColor: isListening ? theme.primary : theme.textSecondary,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const renderSongCard = () => {
    if (!currentSong) return null;

    return (
      <View style={[styles.songCard, { backgroundColor: theme.backgroundDefault }]}>
        {currentSong.artworkUrl && (
          <Image
            source={{ uri: currentSong.artworkUrl }}
            style={styles.artwork}
            contentFit="cover"
          />
        )}
        <View style={styles.songInfo}>
          <ThemedText type="h4" numberOfLines={1}>
            {currentSong.title}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }} numberOfLines={1}>
            {currentSong.artist}
          </ThemedText>
          {currentSong.mapping && (
            <View style={styles.mappingBadge}>
              <Feather name="check-circle" size={12} color={theme.success} />
              <ThemedText type="small" style={{ color: theme.success, marginLeft: 4 }}>
                Learned preset: {currentSong.suggestedPreset?.name ?? "Unknown"}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSuggestionActions = () => {
    if (!currentSong || state !== "detected") return null;

    return (
      <View style={styles.suggestionActions}>
        {currentSong.suggestedPreset ? (
          <>
            <Button onPress={handleUseSuggested} style={{ flex: 1 }}>
              Use "{currentSong.suggestedPreset.name}"
            </Button>
            <Pressable
              onPress={() => setShowPresetPicker(true)}
              style={[styles.secondaryAction, { borderColor: theme.border }]}
            >
              <ThemedText type="body" style={{ color: theme.primary }}>
                Different preset
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <Button onPress={() => setShowPresetPicker(true)} style={{ flex: 1 }}>
              Choose Preset
            </Button>
          </>
        )}
        <Pressable onPress={dismissSuggestion} style={styles.dismissAction}>
          <Feather name="x" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>
    );
  };

  const renderPresetPicker = () => {
    if (!showPresetPicker) return null;

    return (
      <View style={[styles.presetPicker, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.presetPickerHeader}>
          <ThemedText type="h4">Choose Preset for This Song</ThemedText>
          <Pressable onPress={() => setShowPresetPicker(false)}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>
        <ScrollView style={styles.presetList}>
          {availablePresets.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => handlePresetSelect(preset)}
              style={({ pressed }) => [
                styles.presetItem,
                { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
              ]}
            >
              <Feather name="target" size={20} color={theme.primary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md, flex: 1 }}>
                {preset.name}
              </ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSettings = () => (
    <View style={styles.settingsSection}>
      <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        MUSIC MODE SETTINGS
      </ThemedText>

      <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
        <SettingsRow
          label="Continuous Listening"
          description="Keep listening after detecting a song"
          right={
            <Switch
              value={settings.continuousListening}
              onValueChange={(value) => updateSettings({ continuousListening: value })}
              trackColor={{ true: theme.primary, false: theme.backgroundSecondary }}
            />
          }
        />

        <SettingsRow
          label="Auto-execute Known Songs"
          description="Automatically use learned presets"
          right={
            <Switch
              value={settings.autoExecuteKnownSongs}
              onValueChange={(value) => updateSettings({ autoExecuteKnownSongs: value })}
              trackColor={{ true: theme.primary, false: theme.backgroundSecondary }}
            />
          }
        />

        <SettingsRow
          label="Suggest Presets"
          description="Show suggestions for unlearned songs"
          right={
            <Switch
              value={settings.suggestPresets}
              onValueChange={(value) => updateSettings({ suggestPresets: value })}
              trackColor={{ true: theme.primary, false: theme.backgroundSecondary }}
            />
          }
        />
      </View>

      <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        BATTERY OPTIMIZATION
      </ThemedText>

      <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
        {(["aggressive", "balanced", "performance"] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => updateSettings({ batteryOptimization: mode })}
            style={styles.batteryOption}
          >
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ textTransform: "capitalize" }}>
                {mode}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {mode === "aggressive" && "Best battery life, slower detection"}
                {mode === "balanced" && "Good balance of speed and battery"}
                {mode === "performance" && "Fastest detection, higher battery use"}
              </ThemedText>
            </View>
            <View
              style={[
                styles.radioButton,
                {
                  borderColor: settings.batteryOptimization === mode ? theme.primary : theme.border,
                },
              ]}
            >
              {settings.batteryOptimization === mode && (
                <View style={[styles.radioButtonInner, { backgroundColor: theme.primary }]} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: headerHeight }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainSection}>
          <View style={[styles.statusCircle, { borderColor: theme.primary }]}>
            <Feather
              name={STATE_ICONS[state]}
              size={48}
              color={isListening ? theme.primary : theme.textSecondary}
            />
          </View>

          <ThemedText type="h3" style={styles.statusText}>
            {STATE_LABELS[state]}
          </ThemedText>

          {renderAudioVisualizer()}

          {renderSongCard()}
          {renderSuggestionActions()}

          <Pressable
            onPress={handleMainButtonPress}
            style={({ pressed }) => [
              styles.mainButton,
              {
                backgroundColor: isListening ? theme.error : theme.primary,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Feather
              name={isListening ? "square" : "play"}
              size={24}
              color="#FFFFFF"
              style={{ marginRight: Spacing.sm }}
            />
            <ThemedText type="button" style={{ color: "#FFFFFF" }}>
              {isListening ? "Stop Listening" : "Start Listening"}
            </ThemedText>
          </Pressable>
        </View>

        {renderSettings()}
      </ScrollView>

      {renderPresetPicker()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  mainSection: {
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  statusCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  statusText: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  visualizer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 44,
    gap: 4,
    marginBottom: Spacing.xl,
  },
  visualizerBar: {
    width: 6,
    borderRadius: 3,
  },
  songCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    width: "100%",
    ...Shadows.small,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
  },
  songInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "center",
  },
  mappingBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  suggestionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    width: "100%",
  },
  secondaryAction: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  dismissAction: {
    padding: Spacing.sm,
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    ...Shadows.medium,
  },
  settingsSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  settingsCard: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  batteryOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  presetPicker: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "60%",
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    ...Shadows.large,
  },
  presetPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  presetList: {
    padding: Spacing.md,
  },
  presetItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
