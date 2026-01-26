import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Story, StoryCapture, getStories, deleteStory } from "@/lib/gallery";
import { AICapture, getAICaptures, deleteAICapture } from "@/lib/aiPhotographer";

type GalleryTab = "stories" | "captures";

export function GalleryScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const [activeTab, setActiveTab] = useState<GalleryTab>("captures");
  const [stories, setStories] = useState<Story[]>([]);
  const [aiCaptures, setAiCaptures] = useState<AICapture[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedCapture, setSelectedCapture] = useState<AICapture | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [storiesData, capturesData] = await Promise.all([
      getStories(),
      getAICaptures(),
    ]);
    setStories(storiesData);
    setAiCaptures(capturesData);
  };

  const handleDeleteStory = async (id: string) => {
    await deleteStory(id);
    setStories((prev) => prev.filter((story) => story.id !== id));
    setSelectedStory(null);
  };

  const handleDeleteCapture = async (id: string) => {
    Alert.alert("Delete Capture", "Remove this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteAICapture(id);
          setAiCaptures((prev) => prev.filter((c) => c.id !== id));
          setSelectedCapture(null);
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (story: Story) => {
    if (!story.endedAt) return "In progress";
    const start = new Date(story.startedAt).getTime();
    const end = new Date(story.endedAt).getTime();
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const renderStoryCard = ({ item }: { item: Story }) => {
    const previewImage = item.captures.length > 0 ? item.captures[0].imageUri : null;
    
    return (
      <Pressable
        onPress={() => setSelectedStory(item)}
        style={({ pressed }) => [
          styles.storyCard,
          { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={styles.storyCardContent}>
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={styles.storyPreview}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.storyPreviewEmpty, { backgroundColor: theme.backgroundRoot }]}>
              <Feather name="image" size={24} color={theme.textSecondary} />
            </View>
          )}
          <View style={styles.storyInfo}>
            <Text style={[styles.storyTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.storyMeta, { color: theme.textSecondary }]}>
              {item.captures.length} captures
            </Text>
            <View style={styles.storyDetails}>
              <View style={[styles.detailBadge, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="clock" size={10} color={theme.primary} />
                <Text style={[styles.detailText, { color: theme.primary }]}>
                  {formatDuration(item)}
                </Text>
              </View>
              <Text style={[styles.storyDate, { color: theme.textSecondary }]}>
                {formatDate(item.startedAt)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderCaptureInStory = ({ item, index }: { item: StoryCapture; index: number }) => (
    <View style={styles.captureItem}>
      <View style={styles.captureHeader}>
        <View style={[styles.captureNumber, { backgroundColor: theme.primary }]}>
          <Text style={styles.captureNumberText}>{index + 1}</Text>
        </View>
        <Text style={[styles.captureTime, { color: theme.textSecondary }]}>
          {formatDate(item.capturedAt)}
        </Text>
      </View>
      <Image
        source={{ uri: item.imageUri }}
        style={styles.captureImage}
        contentFit="cover"
      />
      <Text style={[styles.captureDescription, { color: theme.text }]}>
        {item.description}
      </Text>
    </View>
  );

  const renderAICaptureCard = ({ item }: { item: AICapture }) => (
    <Pressable
      onPress={() => setSelectedCapture(item)}
      style={({ pressed }) => [
        styles.aiCaptureCard,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Image
        source={{ uri: item.imageUri }}
        style={styles.aiCaptureImage}
        contentFit="cover"
      />
      <View style={[styles.aiCaptureBadge, { backgroundColor: theme.success }]}>
        <Text style={styles.aiCaptureBadgeText}>{item.trigger}</Text>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => {
    if (activeTab === "captures") {
      return (
        <View style={[styles.emptyState, { paddingTop: headerHeight + Spacing.xl + 60 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="camera" size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No AI Captures Yet
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Use AI Photographer from the Live view to auto-capture moments
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.emptyState, { paddingTop: headerHeight + Spacing.xl + 60 }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="book-open" size={48} color={theme.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          No Stories Yet
        </Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Enable Story Mode from the Live view to start recording your visual journey
          </Text>
        </View>
      );
  };

  const currentData = activeTab === "captures" ? aiCaptures : stories;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.tabBar, { paddingTop: headerHeight, backgroundColor: theme.backgroundDefault }]}>
        <Pressable
          onPress={() => setActiveTab("captures")}
          style={[
            styles.tab,
            activeTab === "captures" && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
        >
          <Feather 
            name="camera" 
            size={16} 
            color={activeTab === "captures" ? theme.primary : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === "captures" ? theme.primary : theme.textSecondary },
          ]}>
            AI Captures
          </Text>
          {aiCaptures.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.tabBadgeText}>{aiCaptures.length}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("stories")}
          style={[
            styles.tab,
            activeTab === "stories" && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
        >
          <Feather 
            name="book-open" 
            size={16} 
            color={activeTab === "stories" ? theme.primary : theme.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === "stories" ? theme.primary : theme.textSecondary },
          ]}>
            Stories
          </Text>
          {stories.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.tabBadgeText}>{stories.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {currentData.length === 0 ? (
        renderEmptyState()
      ) : activeTab === "captures" ? (
        <FlatList
          data={aiCaptures}
          renderItem={renderAICaptureCard}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.capturesGrid}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={stories}
          renderItem={renderStoryCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* AI Capture Detail Modal */}
      <Modal
        visible={selectedCapture !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedCapture(null)}
      >
        <Pressable 
          style={styles.captureModalOverlay} 
          onPress={() => setSelectedCapture(null)}
        >
          <View style={[styles.captureModalContent, { backgroundColor: theme.backgroundDefault }]}>
            {selectedCapture && (
              <>
                <Image
                  source={{ uri: selectedCapture.imageUri }}
                  style={styles.captureModalImage}
                  contentFit="contain"
                />
                <View style={styles.captureModalInfo}>
                  <View style={[styles.captureModalBadge, { backgroundColor: theme.success }]}>
                    <Text style={styles.captureModalBadgeText}>{selectedCapture.trigger}</Text>
                  </View>
                  <Text style={[styles.captureModalTime, { color: theme.textSecondary }]}>
                    {formatDate(selectedCapture.capturedAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteCapture(selectedCapture.id)}
                  style={[styles.captureModalDelete, { backgroundColor: theme.error + "20" }]}
                >
                  <Feather name="trash-2" size={18} color={theme.error} />
                  <Text style={[styles.captureModalDeleteText, { color: theme.error }]}>Delete</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Story Detail Modal */}
      <Modal
        visible={selectedStory !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedStory(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          {selectedStory ? (
            <>
              <View style={[styles.modalHeader, { backgroundColor: theme.backgroundDefault }]}>
                <Pressable
                  onPress={() => setSelectedStory(null)}
                  style={styles.closeButton}
                >
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
                <View style={styles.modalTitleSection}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {selectedStory.title}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                    {selectedStory.captures.length} captures • {formatDuration(selectedStory)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteStory(selectedStory.id)}
                  style={styles.deleteBtn}
                >
                  <Feather name="trash-2" size={20} color={theme.error} />
                </Pressable>
              </View>

              {selectedStory.captures.length === 0 ? (
                <View style={styles.emptyStory}>
                  <Text style={[styles.emptyStoryText, { color: theme.textSecondary }]}>
                    No captures in this story yet
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={selectedStory.captures}
                  renderItem={renderCaptureInStory}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.capturesList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
    gap: Spacing.md,
  },
  storyCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  storyCardContent: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  storyPreview: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
  },
  storyPreviewEmpty: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  storyInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  storyTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  storyMeta: {
    fontSize: Typography.small.fontSize,
  },
  storyDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 4,
  },
  detailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  detailText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "500",
  },
  storyDate: {
    fontSize: Typography.caption.fontSize,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: Typography.h4.fontWeight,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    paddingTop: 60,
    gap: Spacing.md,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalTitleSection: {
    flex: 1,
  },
  modalTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: "600",
  },
  modalSubtitle: {
    fontSize: Typography.small.fontSize,
    marginTop: 2,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  emptyStory: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStoryText: {
    fontSize: Typography.body.fontSize,
  },
  capturesList: {
    padding: Spacing.md,
    gap: Spacing.xl,
  },
  captureItem: {
    gap: Spacing.sm,
  },
  captureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  captureNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  captureNumberText: {
    color: "#FFFFFF",
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  captureTime: {
    fontSize: Typography.small.fontSize,
  },
  captureImage: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.md,
  },
  captureDescription: {
    fontSize: Typography.body.fontSize,
    lineHeight: 24,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  tabText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  capturesGrid: {
    padding: Spacing.xs,
    paddingBottom: 100,
  },
  aiCaptureCard: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: Spacing.xs,
  },
  aiCaptureImage: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#000",
  },
  aiCaptureBadge: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiCaptureBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  captureModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  captureModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  captureModalImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000",
  },
  captureModalInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  captureModalBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  captureModalBadgeText: {
    color: "#FFFFFF",
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  captureModalTime: {
    fontSize: Typography.small.fontSize,
  },
  captureModalDelete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  captureModalDeleteText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
});
