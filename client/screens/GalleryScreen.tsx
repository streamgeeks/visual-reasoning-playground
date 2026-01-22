import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Pressable,
  Modal,
  Dimensions,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { GalleryItem, getGalleryItems, deleteGalleryItem } from "@/lib/gallery";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;

export function GalleryScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadGallery();
    }, [])
  );

  const loadGallery = async () => {
    const galleryItems = await getGalleryItems();
    setItems(galleryItems);
  };

  const handleDelete = async (id: string) => {
    await deleteGalleryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItem(null);
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

  const renderItem = ({ item }: { item: GalleryItem }) => (
    <Pressable
      onPress={() => setSelectedItem(item)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Image
        source={{ uri: item.imageUri }}
        style={styles.cardImage}
        contentFit="cover"
      />
      <View style={styles.cardContent}>
        <Text
          style={[styles.cardDescription, { color: theme.text }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
        <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
          {formatDate(item.capturedAt)}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {items.length === 0 ? (
        <View style={[styles.emptyState, { paddingTop: headerHeight + Spacing.xl }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="image" size={48} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No Captures Yet
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Scene descriptions will appear here when you capture them from the Live view
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: headerHeight + Spacing.md },
          ]}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={selectedItem !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedItem(null)}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}
          >
            {selectedItem ? (
              <>
                <Image
                  source={{ uri: selectedItem.imageUri }}
                  style={styles.modalImage}
                  contentFit="cover"
                />
                <View style={styles.modalBody}>
                  <Text style={[styles.modalDescription, { color: theme.text }]}>
                    {selectedItem.description}
                  </Text>
                  <View style={styles.modalMeta}>
                    <View style={[styles.lengthBadge, { backgroundColor: theme.primary + "20" }]}>
                      <Text style={[styles.lengthBadgeText, { color: theme.primary }]}>
                        {selectedItem.length.charAt(0).toUpperCase() + selectedItem.length.slice(1)}
                      </Text>
                    </View>
                    <Text style={[styles.modalDate, { color: theme.textSecondary }]}>
                      {formatDate(selectedItem.capturedAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(selectedItem.id)}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      { backgroundColor: theme.error, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Feather name="trash-2" size={16} color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Animated.View>
        </Pressable>
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
  },
  row: {
    gap: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 0.75,
  },
  cardContent: {
    padding: Spacing.sm,
  },
  cardDescription: {
    fontSize: Typography.small.fontSize,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  cardDate: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  modalImage: {
    width: "100%",
    height: 250,
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalDescription: {
    fontSize: Typography.body.fontSize,
    lineHeight: 24,
  },
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lengthBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  lengthBadgeText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  modalDate: {
    fontSize: Typography.caption.fontSize,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
});
