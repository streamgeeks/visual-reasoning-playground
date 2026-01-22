import AsyncStorage from "@react-native-async-storage/async-storage";

export interface GalleryItem {
  id: string;
  imageUri: string;
  description: string;
  capturedAt: string;
  length: "short" | "medium" | "long";
}

const GALLERY_KEY = "scene_gallery";

export async function getGalleryItems(): Promise<GalleryItem[]> {
  try {
    const data = await AsyncStorage.getItem(GALLERY_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Failed to load gallery:", error);
    return [];
  }
}

export async function saveGalleryItem(item: GalleryItem): Promise<void> {
  try {
    const items = await getGalleryItems();
    items.unshift(item);
    // Keep only the last 50 items
    const trimmed = items.slice(0, 50);
    await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save gallery item:", error);
  }
}

export async function deleteGalleryItem(id: string): Promise<void> {
  try {
    const items = await getGalleryItems();
    const filtered = items.filter((item) => item.id !== id);
    await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete gallery item:", error);
  }
}

export async function clearGallery(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GALLERY_KEY);
  } catch (error) {
    console.error("Failed to clear gallery:", error);
  }
}
