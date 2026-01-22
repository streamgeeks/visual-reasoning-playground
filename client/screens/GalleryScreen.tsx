import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Story, StoryCapture, getStories, deleteStory } from "@/lib/gallery";

export function GalleryScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [])
  );

  const loadStories = async () => {
    const items = await getStories();
    setStories(items);
  };

  const handleDelete = async (id: string) => {
    await deleteStory(id);
    setStories((prev) => prev.filter((story) => story.id !== id));
    setSelectedStory(null);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {stories.length === 0 ? (
        <View style={[styles.emptyState, { paddingTop: headerHeight + Spacing.xl }]}>
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
      ) : (
        <FlatList
          data={stories}
          renderItem={renderStoryCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: headerHeight + Spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

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
                  onPress={() => handleDelete(selectedStory.id)}
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
});
