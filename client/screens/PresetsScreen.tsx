import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Text,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { PresetCard } from "@/components/PresetCard";
import { TemplateCard } from "@/components/TemplateCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import {
  PTZPreset,
  getPresets,
  savePreset,
  deletePreset,
  getCurrentCameraId,
  generateId,
} from "@/lib/storage";
import { PRESET_TEMPLATES, createPresetsFromTemplate } from "@/lib/presetTemplates";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

type ViewMode = "presets" | "templates";

export default function PresetsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const [presets, setPresets] = useState<PTZPreset[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("presets");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setIsLoading(true);
      const [allPresets, cameraId] = await Promise.all([
        getPresets(),
        getCurrentCameraId(),
      ]);
      setCurrentCameraId(cameraId);
      
      // Filter presets for current camera or show all if no camera selected
      const filteredPresets = cameraId
        ? allPresets.filter((p) => p.cameraId === cameraId)
        : allPresets;
      
      setPresets(filteredPresets);
    } catch (error) {
      console.error("Error loading presets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetPress = useCallback((preset: PTZPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In real app, this would recall the camera position
    console.log("Recalling preset:", preset.name);
  }, []);

  const handleDeletePreset = useCallback(async (preset: PTZPreset) => {
    await deletePreset(preset.id);
    setPresets((prev) => prev.filter((p) => p.id !== preset.id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleAddPreset = useCallback(async () => {
    if (!newPresetName.trim()) return;

    const preset: PTZPreset = {
      id: generateId(),
      cameraId: currentCameraId || "demo",
      name: newPresetName.trim(),
      pan: Math.floor(Math.random() * 100 - 50),
      tilt: Math.floor(Math.random() * 60 - 30),
      zoom: Math.floor(Math.random() * 80),
      createdAt: new Date().toISOString(),
    };

    await savePreset(preset);
    setPresets((prev) => [...prev, preset]);
    setNewPresetName("");
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [newPresetName, currentCameraId]);

  const handleTemplateSelect = useCallback(
    async (templateType: string) => {
      const newPresets = createPresetsFromTemplate(
        currentCameraId || "demo",
        templateType as any
      );

      for (const preset of newPresets) {
        await savePreset(preset);
      }

      setPresets((prev) => [...prev, ...newPresets]);
      setViewMode("presets");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [currentCameraId]
  );

  const renderEmptyState = () => (
    <EmptyState
      image={require("../../assets/images/empty-presets.png")}
      title="No Presets Yet"
      description="Save camera positions to quickly switch between shots"
      action={
        <View style={styles.emptyActions}>
          <Button onPress={() => setShowAddModal(true)}>
            Save Current Position
          </Button>
          <Pressable
            onPress={() => setViewMode("templates")}
            style={({ pressed }) => [
              styles.secondaryButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
              Use Template
            </Text>
          </Pressable>
        </View>
      }
    />
  );

  const renderPresetItem = ({ item, index }: { item: PTZPreset; index: number }) => (
    <PresetCard
      preset={item}
      onPress={() => handlePresetPress(item)}
      onDelete={() => handleDeletePreset(item)}
      index={index}
    />
  );

  const renderTemplateItem = ({ item, index }: { item: typeof PRESET_TEMPLATES[0]; index: number }) => (
    <TemplateCard
      template={item}
      onPress={() => handleTemplateSelect(item.type)}
      index={index}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Segmented control */}
      <View
        style={[
          styles.segmentContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View style={[styles.segment, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable
            onPress={() => setViewMode("presets")}
            style={[
              styles.segmentButton,
              viewMode === "presets" && { backgroundColor: theme.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: viewMode === "presets" ? "#FFFFFF" : theme.textSecondary },
              ]}
            >
              My Presets
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("templates")}
            style={[
              styles.segmentButton,
              viewMode === "templates" && { backgroundColor: theme.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: viewMode === "templates" ? "#FFFFFF" : theme.textSecondary },
              ]}
            >
              Templates
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {viewMode === "presets" ? (
        <FlatList
          data={presets}
          keyExtractor={(item) => item.id}
          renderItem={renderPresetItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + Spacing.xl },
            presets.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={PRESET_TEMPLATES}
          keyExtractor={(item) => item.type}
          renderItem={renderTemplateItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <ThemedText type="small" style={[styles.sectionHeader, { color: theme.textSecondary }]}>
              Smart templates create multiple presets at once based on common production scenarios.
            </ThemedText>
          }
        />
      )}

      {/* Add FAB */}
      {viewMode === "presets" && presets.length > 0 ? (
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: theme.primary,
              bottom: tabBarHeight + Spacing.xl,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}

      {/* Add Preset Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h4" style={styles.modalTitle}>
              Save Current Position
            </ThemedText>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                },
              ]}
              placeholder="Preset name"
              placeholderTextColor={theme.textSecondary}
              value={newPresetName}
              onChangeText={setNewPresetName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  setNewPresetName("");
                }}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddPreset}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: newPresetName.trim() ? 1 : 0.5,
                  },
                ]}
                disabled={!newPresetName.trim()}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: BorderRadius.sm,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  segmentText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  emptyListContent: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyActions: {
    alignItems: "center",
    gap: Spacing.md,
    width: "100%",
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
});
