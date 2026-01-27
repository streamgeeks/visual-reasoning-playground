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
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { SettingsStackParamList } from "@/navigation/SettingsStackNavigator";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { CameraCard } from "@/components/CameraCard";
import { PersonManager } from "@/components/PersonManager";
import { SettingsRow, SettingsToggle, SettingsInput } from "@/components/SettingsRow";
import { Button } from "@/components/Button";
import {
  CameraProfile,
  UserProfile,
  AppSettings,
  TrackingSettings,
  StreamQuality,
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
  DEFAULT_TRACKING_SETTINGS,
} from "@/lib/storage";
import { testCameraConnection, sendPtzCommand, PTZ_COMMANDS } from "@/lib/camera";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { AI_TECHNOLOGIES } from "@/lib/aiInfo";
import { setHasSeenOnboarding } from "@/lib/storage";

type SettingsNavProp = NativeStackNavigationProp<SettingsStackParamList, "Settings">;

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<SettingsNavProp>();

  const [cameras, setCameras] = useState<CameraProfile[]>([]);
  const [currentCameraId, setCurrentCameraIdState] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    replayBufferDuration: 30,
    showStatsByDefault: false,
    moondreamApiKey: "",
    tracking: {
      ptzSpeed: 24,
      pulseDuration: 0,
      deadZone: 0.15,
      continuousMode: true,
      trackingMode: "detection-only",
    },
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
    streamQuality: "low" as StreamQuality,
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

  const handleTestCamera = useCallback(async (camera: CameraProfile): Promise<boolean> => {
    try {
      const result = await testCameraConnection(camera);
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const handlePtzStart = useCallback(async (command: string) => {
    const activeCamera = cameras.find(c => c.id === currentCameraId);
    if (!activeCamera) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await sendPtzCommand(activeCamera, command);
  }, [cameras, currentCameraId]);

  const handlePtzStop = useCallback(async () => {
    const activeCamera = cameras.find(c => c.id === currentCameraId);
    if (!activeCamera) return;
    
    await sendPtzCommand(activeCamera, PTZ_COMMANDS.stop);
  }, [cameras, currentCameraId]);

  const handlePtzHome = useCallback(async () => {
    const activeCamera = cameras.find(c => c.id === currentCameraId);
    if (!activeCamera) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await sendPtzCommand(activeCamera, PTZ_COMMANDS.home);
  }, [cameras, currentCameraId]);

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
      streamQuality: newCamera.streamQuality,
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
      streamQuality: "low",
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

        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Identity Tracking
        </ThemedText>
        <PersonManager onSelectPerson={(person) => console.log("Selected person:", person?.name)} />

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
            onTest={() => handleTestCamera(camera)}
            index={index}
          />
        ))}
        
        {currentCameraId ? (
          <View style={[styles.ptzControlSection, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.ptzHeader}>
              <Feather name="move" size={16} color={theme.primary} />
              <Text style={[styles.ptzTitle, { color: theme.text }]}>PTZ Test Controls</Text>
            </View>
            
            <View style={styles.ptzGrid}>
              <View style={styles.ptzRow}>
                <View style={styles.ptzSpacer} />
                <Pressable
                  onPressIn={() => handlePtzStart(PTZ_COMMANDS.up)}
                  onPressOut={handlePtzStop}
                  style={({ pressed }) => [
                    styles.ptzButton,
                    { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="chevron-up" size={24} color={theme.text} />
                </Pressable>
                <View style={styles.ptzSpacer} />
              </View>
              
              <View style={styles.ptzRow}>
                <Pressable
                  onPressIn={() => handlePtzStart(PTZ_COMMANDS.left)}
                  onPressOut={handlePtzStop}
                  style={({ pressed }) => [
                    styles.ptzButton,
                    { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="chevron-left" size={24} color={theme.text} />
                </Pressable>
                <Pressable
                  onPress={handlePtzHome}
                  style={({ pressed }) => [
                    styles.ptzButton,
                    styles.ptzHomeButton,
                    { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="home" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPressIn={() => handlePtzStart(PTZ_COMMANDS.right)}
                  onPressOut={handlePtzStop}
                  style={({ pressed }) => [
                    styles.ptzButton,
                    { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="chevron-right" size={24} color={theme.text} />
                </Pressable>
              </View>
              
              <View style={styles.ptzRow}>
                <View style={styles.ptzSpacer} />
                <Pressable
                  onPressIn={() => handlePtzStart(PTZ_COMMANDS.down)}
                  onPressOut={handlePtzStop}
                  style={({ pressed }) => [
                    styles.ptzButton,
                    { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="chevron-down" size={24} color={theme.text} />
                </Pressable>
                <View style={styles.ptzSpacer} />
              </View>
            </View>
            
            <View style={styles.zoomRow}>
              <Pressable
                onPressIn={() => handlePtzStart(PTZ_COMMANDS.zoomOut)}
                onPressOut={() => sendPtzCommand(cameras.find(c => c.id === currentCameraId)!, PTZ_COMMANDS.zoomStop)}
                style={({ pressed }) => [
                  styles.zoomButton,
                  { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                ]}
              >
                <Feather name="zoom-out" size={20} color={theme.text} />
                <Text style={[styles.zoomText, { color: theme.textSecondary }]}>Zoom Out</Text>
              </Pressable>
              <Pressable
                onPressIn={() => handlePtzStart(PTZ_COMMANDS.zoomIn)}
                onPressOut={() => sendPtzCommand(cameras.find(c => c.id === currentCameraId)!, PTZ_COMMANDS.zoomStop)}
                style={({ pressed }) => [
                  styles.zoomButton,
                  { backgroundColor: pressed ? theme.primary : theme.backgroundSecondary },
                ]}
              >
                <Feather name="zoom-in" size={20} color={theme.text} />
                <Text style={[styles.zoomText, { color: theme.textSecondary }]}>Zoom In</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

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
            <View style={[styles.apiKeyIcon, { backgroundColor: "#FF9500" + "20" }]}>
              <Feather name="key" size={18} color="#FF9500" />
            </View>
            <View style={styles.apiKeyHeaderText}>
              <Text style={[styles.apiKeyLabel, { color: theme.text }]}>Moondream API Key</Text>
              <Text style={[styles.apiKeyOptional, { color: theme.textSecondary }]}>
                Optional - most tools work without it
              </Text>
            </View>
          </View>

          <View style={styles.apiKeyInputRow}>
            <TextInput
              style={[
                styles.apiKeyInput,
                { backgroundColor: theme.backgroundSecondary, color: theme.text },
              ]}
              value={pendingApiKey}
              onChangeText={handleApiKeyChange}
              placeholder="md-xxxxxxxxxxxxxxxx"
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

          <View style={[styles.apiKeyInstructions, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.apiKeyInstructionsTitle, { color: theme.text }]}>
              How to get a free API key:
            </Text>
            <View style={styles.apiKeyStep}>
              <View style={[styles.apiKeyStepNumber, { backgroundColor: theme.primary + "20" }]}>
                <Text style={[styles.apiKeyStepNumberText, { color: theme.primary }]}>1</Text>
              </View>
              <Text style={[styles.apiKeyStepText, { color: theme.textSecondary }]}>
                Visit console.moondream.ai
              </Text>
            </View>
            <View style={styles.apiKeyStep}>
              <View style={[styles.apiKeyStepNumber, { backgroundColor: theme.primary + "20" }]}>
                <Text style={[styles.apiKeyStepNumberText, { color: theme.primary }]}>2</Text>
              </View>
              <Text style={[styles.apiKeyStepText, { color: theme.textSecondary }]}>
                Sign up for a free account
              </Text>
            </View>
            <View style={styles.apiKeyStep}>
              <View style={[styles.apiKeyStepNumber, { backgroundColor: theme.primary + "20" }]}>
                <Text style={[styles.apiKeyStepNumberText, { color: theme.primary }]}>3</Text>
              </View>
              <Text style={[styles.apiKeyStepText, { color: theme.textSecondary }]}>
                Copy your API key and paste it above
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => Linking.openURL("https://console.moondream.ai/")}
            style={({ pressed }) => [
              styles.getApiKeyButton,
              { backgroundColor: "#FF9500", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="external-link" size={16} color="#FFFFFF" />
            <Text style={styles.getApiKeyButtonText}>Get Free API Key</Text>
          </Pressable>

          <View style={styles.apiKeyUnlocks}>
            <Text style={[styles.apiKeyUnlocksTitle, { color: theme.textSecondary }]}>
              API key unlocks:
            </Text>
            <View style={styles.apiKeyUnlocksList}>
              {["Scene descriptions", "Custom object search", "Natural language chat", "Custom photo triggers"].map((feature, i) => (
                <View key={i} style={styles.apiKeyUnlockItem}>
                  <Feather name="check" size={12} color={theme.success} />
                  <Text style={[styles.apiKeyUnlockText, { color: theme.text }]}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* About the AI */}
        <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          About the AI
        </ThemedText>

        <View style={[styles.aiTechSection, { backgroundColor: theme.backgroundDefault }]}>
          <Text style={[styles.aiTechIntro, { color: theme.textSecondary }]}>
            This app uses multiple AI technologies to understand and process camera footage:
          </Text>
          
          {Object.entries(AI_TECHNOLOGIES).map(([key, tech]) => (
            <View key={key} style={styles.aiTechRow}>
              <View style={[styles.aiTechIcon, { backgroundColor: tech.color + "20" }]}>
                <Feather name={tech.icon as any} size={18} color={tech.color} />
              </View>
              <View style={styles.aiTechInfo}>
                <View style={styles.aiTechHeader}>
                  <Text style={[styles.aiTechName, { color: theme.text }]}>{tech.name}</Text>
                  <View style={[styles.aiTechBadge, { backgroundColor: tech.type === "on-device" ? theme.success + "20" : theme.warning + "20" }]}>
                    <Text style={[styles.aiTechBadgeText, { color: tech.type === "on-device" ? theme.success : theme.warning }]}>
                      {tech.type === "on-device" ? "On-Device" : "Cloud"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.aiTechDesc, { color: theme.textSecondary }]}>{tech.description}</Text>
              </View>
            </View>
          ))}

          <View style={[styles.learnMoreSection, { borderTopColor: theme.backgroundSecondary }]}>
            <Text style={[styles.learnMoreTitle, { color: theme.textSecondary }]}>
              Learn More
            </Text>
            <View style={styles.learnMoreLinks}>
              <Pressable
                onPress={() => Linking.openURL("https://visualreasoning.ai")}
                style={({ pressed }) => [
                  styles.learnMoreLink,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="eye" size={14} color={theme.primary} />
                <Text style={[styles.learnMoreLinkText, { color: theme.primary }]}>
                  visualreasoning.ai
                </Text>
                <Feather name="external-link" size={12} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL("https://ptzoptics.com")}
                style={({ pressed }) => [
                  styles.learnMoreLink,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="video" size={14} color={theme.primary} />
                <Text style={[styles.learnMoreLinkText, { color: theme.primary }]}>
                  ptzoptics.com
                </Text>
                <Feather name="external-link" size={12} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL("https://moondream.ai")}
                style={({ pressed }) => [
                  styles.learnMoreLink,
                  { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="cloud" size={14} color={theme.primary} />
                <Text style={[styles.learnMoreLinkText, { color: theme.primary }]}>
                  moondream.ai
                </Text>
                <Feather name="external-link" size={12} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={async () => {
              await setHasSeenOnboarding(false);
              Alert.alert("Onboarding Reset", "The AI onboarding will show again when you restart the app.");
            }}
            style={({ pressed }) => [
              styles.replayOnboardingButton,
              { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="play-circle" size={18} color={theme.primary} />
            <Text style={[styles.replayOnboardingText, { color: theme.text }]}>
              Replay AI Onboarding
            </Text>
          </Pressable>
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
          icon="cpu"
          label="Device Compatibility"
          onPress={() => navigation.navigate("DeviceCompatibility")}
        />

        <SettingsRow
          icon="shield"
          label="Privacy & Licenses"
          onPress={() => navigation.navigate("PrivacyLicenses")}
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
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

            <ScrollView 
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Stream Quality
              </Text>
              <View style={styles.qualitySelector}>
                <Pressable
                  onPress={() => setNewCamera((prev) => ({ ...prev, streamQuality: "high" }))}
                  style={[
                    styles.qualityOption,
                    {
                      backgroundColor: newCamera.streamQuality === "high" 
                        ? theme.primary 
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Feather 
                    name="zap" 
                    size={16} 
                    color={newCamera.streamQuality === "high" ? "#FFFFFF" : theme.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.qualityText,
                      { color: newCamera.streamQuality === "high" ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    High Bitrate
                  </Text>
                  <Text
                    style={[
                      styles.qualitySubtext,
                      { color: newCamera.streamQuality === "high" ? "rgba(255,255,255,0.7)" : theme.textSecondary },
                    ]}
                  >
                    stream1
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setNewCamera((prev) => ({ ...prev, streamQuality: "low" }))}
                  style={[
                    styles.qualityOption,
                    {
                      backgroundColor: newCamera.streamQuality === "low" 
                        ? theme.primary 
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Feather 
                    name="battery" 
                    size={16} 
                    color={newCamera.streamQuality === "low" ? "#FFFFFF" : theme.textSecondary} 
                  />
                  <Text
                    style={[
                      styles.qualityText,
                      { color: newCamera.streamQuality === "low" ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    Low Bitrate
                  </Text>
                  <Text
                    style={[
                      styles.qualitySubtext,
                      { color: newCamera.streamQuality === "low" ? "rgba(255,255,255,0.7)" : theme.textSecondary },
                    ]}
                  >
                    stream2
                  </Text>
                </Pressable>
              </View>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
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
        </KeyboardAvoidingView>
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
    marginBottom: Spacing.md,
  },
  apiKeyIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  apiKeyHeaderText: {
    flex: 1,
  },
  apiKeyLabel: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  apiKeyOptional: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
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
  apiKeyInstructions: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  apiKeyInstructionsTitle: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  apiKeyStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 6,
  },
  apiKeyStepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  apiKeyStepNumberText: {
    fontSize: 11,
    fontWeight: "700",
  },
  apiKeyStepText: {
    fontSize: Typography.small.fontSize,
    flex: 1,
  },
  getApiKeyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  getApiKeyButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  apiKeyUnlocks: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  apiKeyUnlocksTitle: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.xs,
  },
  apiKeyUnlocksList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  apiKeyUnlockItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  apiKeyUnlockText: {
    fontSize: Typography.small.fontSize,
  },
  qualitySelector: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  qualityOption: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  qualityText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  qualitySubtext: {
    fontSize: Typography.small.fontSize,
  },
  ptzControlSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  ptzHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  ptzTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  ptzGrid: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  ptzRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ptzButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  ptzHomeButton: {
    borderRadius: 28,
  },
  ptzSpacer: {
    width: 56,
    height: 56,
  },
  zoomRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  zoomButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  zoomText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  aiTechSection: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  aiTechIntro: {
    fontSize: Typography.small.fontSize,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  aiTechRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  aiTechIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  aiTechInfo: {
    flex: 1,
  },
  aiTechHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  aiTechName: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  aiTechBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  aiTechBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  aiTechDesc: {
    fontSize: Typography.small.fontSize,
    lineHeight: 18,
  },
  replayOnboardingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  replayOnboardingText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  learnMoreSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  learnMoreTitle: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.sm,
  },
  learnMoreLinks: {
    gap: Spacing.xs,
  },
  learnMoreLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  learnMoreLinkText: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
});
