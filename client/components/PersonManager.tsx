import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Text,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { PersonProfile } from "@/lib/storage";
import {
  loadPersonProfiles,
  savePersonProfile,
  deletePersonProfile,
  createPersonProfile,
} from "@/lib/identity";
import { generateFeaturePrint } from "vision-tracking";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";

interface PersonManagerProps {
  onSelectPerson?: (person: PersonProfile | null) => void;
}

const CAMERA_SIZE = 200;

export function PersonManager({ onSelectPerson }: PersonManagerProps) {
  const { theme } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [capturedImage, setCapturedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const loaded = await loadPersonProfiles();
      setProfiles(loaded);
    } catch (error) {
      console.error("Failed to load person profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Camera access is needed to add people.");
        return;
      }
    }
    setShowCameraModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [permission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (photo && photo.base64) {
        setCapturedImage({ uri: photo.uri, base64: photo.base64 });
        setShowCameraModal(false);
        setShowNameModal(true);
      }
    } catch (error) {
      console.error("Failed to capture photo:", error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  }, []);

  const handleSavePerson = useCallback(async () => {
    if (!capturedImage || !newPersonName.trim()) {
      Alert.alert("Missing Info", "Please provide a name for this person.");
      return;
    }

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const embedding = await generateFeaturePrint(capturedImage.base64);

      if (!embedding || embedding.length === 0) {
        throw new Error("Failed to generate face embedding");
      }

      const profile = createPersonProfile(newPersonName.trim(), capturedImage.uri, embedding);
      await savePersonProfile(profile);

      setProfiles((prev) => [...prev, profile]);
      setShowNameModal(false);
      setNewPersonName("");
      setCapturedImage(null);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to save person:", error);
      Alert.alert(
        "Error",
        "Failed to process the image. Please try with a clear face photo."
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, newPersonName]);

  const handleDeletePerson = useCallback((person: PersonProfile) => {
    Alert.alert(
      "Delete Person",
      `Are you sure you want to remove "${person.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePersonProfile(person.id);
              setProfiles((prev) => prev.filter((p) => p.id !== person.id));
              
              if (activePersonId === person.id) {
                setActivePersonId(null);
                onSelectPerson?.(null);
              }
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error("Failed to delete person:", error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  }, [activePersonId, onSelectPerson]);

  const handleTrackPerson = useCallback((person: PersonProfile) => {
    const newActiveId = activePersonId === person.id ? null : person.id;
    setActivePersonId(newActiveId);
    onSelectPerson?.(newActiveId ? person : null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [activePersonId, onSelectPerson]);

  const handleCloseCameraModal = useCallback(() => {
    setShowCameraModal(false);
  }, []);

  const handleCloseNameModal = useCallback(() => {
    setShowNameModal(false);
    setNewPersonName("");
    setCapturedImage(null);
  }, []);

  const handleRetake = useCallback(() => {
    setShowNameModal(false);
    setCapturedImage(null);
    setShowCameraModal(true);
  }, []);

  const renderPersonCard = useCallback(({ item, index }: { item: PersonProfile; index: number }) => {
    const isActive = activePersonId === item.id;
    
    return (
      <Animated.View entering={FadeInRight.delay(index * 80).duration(300)}>
        <View
          style={[
            styles.personCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: isActive ? theme.primary : "transparent",
              borderWidth: isActive ? 2 : 0,
            },
          ]}
        >
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: item.imageUri }}
              style={[
                styles.thumbnail,
                { borderColor: isActive ? theme.primary : theme.backgroundSecondary },
              ]}
            />
            {isActive && (
              <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]}>
                <Feather name="crosshair" size={10} color="#FFFFFF" />
              </View>
            )}
          </View>

          <Text
            style={[styles.personName, { color: theme.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleTrackPerson(item)}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isActive ? theme.primary : theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather
                name={isActive ? "eye-off" : "eye"}
                size={14}
                color={isActive ? "#FFFFFF" : theme.textSecondary}
              />
            </Pressable>

            <Pressable
              onPress={() => handleDeletePerson(item)}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: theme.error + "20",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="trash-2" size={14} color={theme.error} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  }, [activePersonId, theme, handleTrackPerson, handleDeletePerson]);

  const renderAddButton = useCallback(() => (
    <Animated.View entering={FadeIn.duration(300)}>
      <Pressable
        onPress={handleAddPerson}
        style={({ pressed }) => [
          styles.addButton,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.primary + "40",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.addIconContainer, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="user-plus" size={24} color={theme.primary} />
        </View>
        <Text style={[styles.addButtonText, { color: theme.textSecondary }]}>
          Add Person
        </Text>
      </Pressable>
    </Animated.View>
  ), [theme, handleAddPerson]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundDefault }]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="users" size={18} color={theme.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <ThemedText type="body" style={styles.headerTitle}>
            Person ID
          </ThemedText>
          <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
            Save faces to track specific people in crowds
          </Text>
        </View>
        {activePersonId && (
          <View style={[styles.trackingBadge, { backgroundColor: theme.success }]}>
            <Feather name="radio" size={10} color="#FFFFFF" />
            <Text style={styles.trackingBadgeText}>Active</Text>
          </View>
        )}
      </View>

      <FlatList
        data={profiles}
        renderItem={renderPersonCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderAddButton}
        ListEmptyComponent={
          <View style={styles.emptyHint}>
            <Text style={[styles.emptyHintText, { color: theme.textSecondary }]}>
              Tap + to add a face. The camera will follow that specific person.
            </Text>
          </View>
        }
      />

      <Modal
        visible={showCameraModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseCameraModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.cameraModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Take Photo</ThemedText>
              <Pressable onPress={handleCloseCameraModal} hitSlop={12}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <Text style={[styles.cameraHint, { color: theme.textSecondary }]}>
              Position face in the center
            </Text>

            <View style={[styles.cameraContainer, { borderColor: theme.primary }]}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
              />
              <View style={[styles.cameraOverlay, { borderColor: theme.primary }]} />
            </View>

            <Pressable
              onPress={handleCapture}
              style={({ pressed }) => [
                styles.captureButton,
                { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="camera" size={28} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseNameModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Add Person</ThemedText>
              <Pressable onPress={handleCloseNameModal} hitSlop={12}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {capturedImage && (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: capturedImage.uri }}
                  style={[styles.previewImage, { borderColor: theme.primary }]}
                />
                <Pressable
                  onPress={handleRetake}
                  style={[styles.retakeButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
                  <Text style={[styles.retakeText, { color: theme.textSecondary }]}>Retake</Text>
                </Pressable>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Name
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.backgroundSecondary, color: theme.text },
              ]}
              placeholder="Enter person's name"
              placeholderTextColor={theme.textSecondary}
              value={newPersonName}
              onChangeText={setNewPersonName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleCloseNameModal}
                disabled={isProcessing}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSavePerson}
                disabled={isProcessing || !newPersonName.trim()}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: isProcessing || !newPersonName.trim() ? 0.5 : 1,
                  },
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                    Save Person
                  </Text>
                )}
              </Pressable>
            </View>

            {isProcessing && (
              <Text style={[styles.processingText, { color: theme.textSecondary }]}>
                Generating face embedding...
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    height: 140,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "600",
  },
  headerDescription: {
    fontSize: Typography.small.fontSize - 1,
    marginTop: 2,
  },
  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    gap: 4,
  },
  trackingBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  listContent: {
    paddingRight: Spacing.lg,
    gap: Spacing.md,
  },
  personCard: {
    width: 100,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    ...Shadows.small,
  },
  thumbnailContainer: {
    position: "relative",
    marginBottom: Spacing.xs,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  personName: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 28,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 100,
    height: 140,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
    textAlign: "center",
  },
  emptyHint: {
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  emptyHintText: {
    fontSize: Typography.small.fontSize,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  cameraModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
    width: "100%",
  },
  cameraHint: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  cameraContainer: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: CAMERA_SIZE / 2,
    overflow: "hidden",
    borderWidth: 3,
    marginBottom: Spacing.xl,
  },
  camera: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: CAMERA_SIZE / 2,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    marginBottom: Spacing.sm,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  retakeText: {
    fontSize: Typography.small.fontSize,
    fontWeight: "500",
  },
  inputLabel: {
    fontSize: Typography.small.fontSize,
    marginBottom: Spacing.xs,
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    fontSize: Typography.body.fontSize,
    marginBottom: Spacing.lg,
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
  processingText: {
    fontSize: Typography.small.fontSize,
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
