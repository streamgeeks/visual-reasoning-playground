import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StoryCapture {
  id: string;
  imageUri: string;
  description: string;
  capturedAt: string;
  length: "short" | "medium" | "long";
}

export interface Story {
  id: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  captures: StoryCapture[];
  intervalSeconds: number;
}

const STORIES_KEY = "scene_stories";
const ACTIVE_STORY_KEY = "active_story";

export async function getStories(): Promise<Story[]> {
  try {
    const data = await AsyncStorage.getItem(STORIES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Failed to load stories:", error);
    return [];
  }
}

export async function saveStory(story: Story): Promise<void> {
  try {
    const stories = await getStories();
    const existingIndex = stories.findIndex((s) => s.id === story.id);
    if (existingIndex >= 0) {
      stories[existingIndex] = story;
    } else {
      stories.unshift(story);
    }
    // Keep only the last 20 stories
    const trimmed = stories.slice(0, 20);
    await AsyncStorage.setItem(STORIES_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save story:", error);
  }
}

export async function deleteStory(id: string): Promise<void> {
  try {
    const stories = await getStories();
    const filtered = stories.filter((story) => story.id !== id);
    await AsyncStorage.setItem(STORIES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete story:", error);
  }
}

export async function getActiveStory(): Promise<Story | null> {
  try {
    const data = await AsyncStorage.getItem(ACTIVE_STORY_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error("Failed to load active story:", error);
    return null;
  }
}

export async function setActiveStory(story: Story | null): Promise<void> {
  try {
    if (story) {
      await AsyncStorage.setItem(ACTIVE_STORY_KEY, JSON.stringify(story));
    } else {
      await AsyncStorage.removeItem(ACTIVE_STORY_KEY);
    }
  } catch (error) {
    console.error("Failed to set active story:", error);
  }
}

export async function addCaptureToActiveStory(capture: StoryCapture): Promise<Story | null> {
  try {
    const activeStory = await getActiveStory();
    if (activeStory) {
      activeStory.captures.push(capture);
      await setActiveStory(activeStory);
      await saveStory(activeStory);
      return activeStory;
    }
    return null;
  } catch (error) {
    console.error("Failed to add capture to story:", error);
    return null;
  }
}

export async function startNewStory(intervalSeconds: number): Promise<Story> {
  const now = new Date();
  const story: Story = {
    id: Date.now().toString(),
    title: `Story ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
    startedAt: now.toISOString(),
    captures: [],
    intervalSeconds,
  };
  await setActiveStory(story);
  await saveStory(story);
  return story;
}

export async function endActiveStory(): Promise<Story | null> {
  try {
    const activeStory = await getActiveStory();
    if (activeStory) {
      activeStory.endedAt = new Date().toISOString();
      await saveStory(activeStory);
      await setActiveStory(null);
      return activeStory;
    }
    return null;
  } catch (error) {
    console.error("Failed to end story:", error);
    return null;
  }
}

export async function clearAllStories(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORIES_KEY);
    await AsyncStorage.removeItem(ACTIVE_STORY_KEY);
  } catch (error) {
    console.error("Failed to clear stories:", error);
  }
}
