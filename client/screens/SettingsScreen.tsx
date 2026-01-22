import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  Modal,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { CameraCard } from "@/components/CameraCard";
import { SettingsRow, SettingsToggle, SettingsInput } from "@/components/SettingsRow";
import { Button } from "@/components/Button";
import {
  CameraProfile,
  UserProfile,
  AppSettings,
  getCameraProfiles,
  saveCameraProfile,
  deleteCameraProfile,
  getCurrentCameraId,
  setCurrentCameraId,
  getSettings,
  saveSettings,
  getUserProfile,
  saveUserProfile,
  generateId,
} from "@/lib/storage";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const [cameras, setCameras] = useState<CameraProfile[]>([]);
  const [currentCameraId, setCurrentCameraIdState] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    replayBufferDuration: 30,
    showStatsByDefault: false,
    moondreamApiKey: "",
  });
  const [userProfile, setUserProfile] = useState<UserProfile>({ displayName: "User" });
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newCamera, setNewCamera] = useState({
    name: "",
    ipAddress: "",
    username: "admin",
    password: "",
    httpPort: "80",
    rtspPort: "554",
  });
  const [pendingApiKey, setPendingApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedCameras, cameraId, loadedSettings, profile] = await Promise.all([
        getCameraProfiles(),
        getCurrentCameraId(),
        getSettings(),
        getUserProfile(),
      ]);

      setCameras(loadedCameras);
      setCurrentCameraIdState(cameraId);
      setSettings(loadedSettings);
      setUserProfile(profile);
      setPendingApiKey(loadedSettings.moondreamApiKey);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSelectCamera = useCallback(async (camera: CameraProfile) => {
    await setCurrentCameraId(camera.id);
    setCurrentCameraIdState(camera.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDeleteCamera = useCallback(async (camera: CameraProfile) => {
    await deleteCameraProfile(camera.id);
    setCameras((prev) => prev.filter((c) => c.id !== camera.id));
    
    if (currentCameraId === camera.id) {
      await setCurrentCameraId(null);
      setCurrentCameraIdState(null);
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentCameraId]);

  const handleAddCamera = useCallback(async () => {
    if (!newCamera.name || !newCamera.ipAddress) return;

    const camera: CameraProfile = {
      id: generateId(),
      name: newCamera.name,
      ipAddress: newCamera.ipAddress,
      username: newCamera.username,
      password: newCamera.password,
      httpPort: parseInt(newCamera.httpPort, 10) || 80,
      rtspPort: parseInt(newCamera.rtspPort, 10) || 554,
      createdAt: new Date().toISOString(),
    };

    await saveCameraProfile(camera);
    setCameras((prev) => [...prev, camera]);
    setShowAddCamera(false);
    setNewCamera({
      name: "",
      ipAddress: "",
      username: "admin",
      password: "",
      httpPort: "80",
      rtspPort: "554",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [newCamera]);

  const handleToggleStats = useCallback(async (value: boolean) => {
    const newSettings = { ...settings, showStatsByDefault: value };
    setSettings(newSettings);
    await saveSettings({ showStatsByDefault: value });
    Haptics.selectionAsync();
  }, [settings]);

  const handleApiKeyChange = useCallback((value: string) => {
    setPendingApiKey(value);
    setApiKeySaved(false);
  }, []);

  const handleSaveApiKey = useCallback(async () => {
    const newSettings = { ...settings, moondreamApiKey: pendingApiKey };
    setSettings(newSettings);
    await saveSettings({ moondreamApiKey: pendingApiKey });
    setApiKeySaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTimeout(() => {
      setApiKeySaved(false);
    }, 2000);
  }, [settings, pendingApiKey]);

  const handleSaveProfile = useCallback(async () => {
    await saveUserProfile(userProfile);
    setShowEditProfile(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [userProfile]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Profile
        </ThemedText>
        <Pressable
          onPress={() => setShowEditProfile(true)}
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="user" size={28} color={theme.textSecondary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>
              {userProfile.displayName}
            </Text>
            <Text style={[styles.profileSubtitle, { color: theme.textSecondary }]}>
              Tap to edit
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>

        {/* Camera Management */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Camera Settings
        </ThemedText>

        {cameras.map((camera, index) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            isActive={currentCameraId === camera.id}
            onPress={() => handleSelectCamera(camera)}
            onDelete={() => handleDeleteCamera(camera)}
            index={index}
          />
        ))}

        <Pressable
          onPress={() => setShowAddCamera(true)}
          style={({ pressed }) => [
            styles.addCameraButton,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.addIcon, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="plus" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.addCameraText, { color: theme.text }]}>
            Add PTZ Camera
          </Text>
        </Pressable>

        {/* Performance Settings */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Performance
        </ThemedText>

        <SettingsToggle
          icon="activity"
          label="Show Stats Overlay"
          description="Display performance metrics on live view"
          value={settings.showStatsByDefault}
          onValueChange={handleToggleStats}
        />

        {/* AI Settings */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          AI Integration
        </ThemedText>

        <View style={[styles.apiKeyContainer, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.apiKeyHeader}>
            <View style={[styles.apiKeyIcon, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="cpu" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.apiKeyLabel, { color: theme.text }]}>Moondream API Key</Text>
          </View>
          <View style={styles.apiKeyInputRow}>
            <TextInput
              style={[
                styles.apiKeyInput,
                { backgroundColor: theme.backgroundSecondary, color: theme.text },
              ]}
              value={pendingApiKey}
              onChangeText={handleApiKeyChange}
              placeholder="Enter your API key"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={handleSaveApiKey}
              disabled={pendingApiKey === settings.moondreamApiKey}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: apiKeySaved
                    ? theme.success
                    : pendingApiKey !== settings.moondreamApiKey
                    ? theme.primary
                    : theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather
                name={apiKeySaved ? "check" : "save"}
                size={18}
                color={
                  apiKeySaved || pendingApiKey !== settings.moondreamApiKey
                    ? "#FFFFFF"
                    : theme.textSecondary
                }
              />
            </Pressable>
          </View>
          {apiKeySaved ? (
            <Text style={[styles.savedMessage, { color: theme.success }]}>
              API key saved successfully
            </Text>
          ) : null}
        </View>

        {/* About */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          About
        </ThemedText>

        <SettingsRow
          icon="info"
          label="Version"
          value="1.0.0"
          showChevron={false}
        />

        <SettingsRow
          icon="book-open"
          label="Documentation"
          onPress={() => console.log("Open docs")}
        />

        <SettingsRow
          icon="help-circle"
          label="Help & Support"
          onPress={() => console.log("Open help")}
        />
      </ScrollView>

      {/* Add Camera Modal */}
      <Modal
        visible={showAddCamera}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCamera(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Add PTZ Camera</ThemedText>
              <Pressable
                onPress={() => setShowAddCamera(false)}
                hitSlop={12}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Camera Name
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                placeholder="My PTZ Camera"
                placeholderTextColor={theme.textSecondary}
                value={newCamera.name}
                onChangeText={(text) => setNewCamera((prev) => ({ ...prev, name: text }))}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                IP Address
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                placeholder="192.168.1.100"
                placeholderTextColor={theme.textSecondary}
                value={newCamera.ipAddress}
                onChangeText={(text) => setNewCamera((prev) => ({ ...prev, ipAddress: text }))}
                keyboardType="numeric"
              />

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    HTTP Port
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                    placeholder="80"
                    placeholderTextColor={theme.textSecondary}
                    value={newCamera.httpPort}
                    onChangeText={(text) => setNewCamera((prev) => ({ ...prev, httpPort: text }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    RTSP Port
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                    placeholder="554"
                    placeholderTextColor={theme.textSecondary}
                    value={newCamera.rtspPort}
                    onChangeText={(text) => setNewCamera((prev) => ({ ...prev, rtspPort: text }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Username
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                placeholder="admin"
                placeholderTextColor={theme.textSecondary}
                value={newCamera.username}
                onChangeText={(text) => setNewCamera((prev) => ({ ...prev, username: text }))}
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Password
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                placeholder="Enter password"
                placeholderTextColor={theme.textSecondary}
                value={newCamera.password}
                onChangeText={(text) => setNewCamera((prev) => ({ ...prev, password: text }))}
                secureTextEntry
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowAddCamera(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddCamera}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: newCamera.name && newCamera.ipAddress ? 1 : 0.5,
                  },
                ]}
                disabled={!newCamera.name || !newCamera.ipAddress}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>Add Camera</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h4" style={styles.modalTitle}>
              Edit Profile
            </ThemedText>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Display Name
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.textSecondary}
              value={userProfile.displayName}
              onChangeText={(text) => setUserProfile((prev) => ({ ...prev, displayName: text }))}
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowEditProfile(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveProfile}
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>Save</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    marginBottom: 2,
  },
  profileSubtitle: {
    fontSize: Typography.small.fontSize,
  },
  addCameraButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    ...Shadows.small,
  },
  addIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  addCameraText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalScroll: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    fontSize: Typography.body.fontSize,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  inputHalf: {
    flex: 1,
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
  apiKeyContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  apiKeyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  apiKeyIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  apiKeyLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  apiKeyInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  apiKeyInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: Typography.body.fontSize,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  savedMessage: {
    fontSize: Typography.small.fontSize,
    marginTop: Spacing.xs,
  },
});
