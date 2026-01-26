import AsyncStorage from "@react-native-async-storage/async-storage";

const CAPTURES_KEY = "@vrp_ai_captures";
const CUSTOM_TRIGGERS_KEY = "@vrp_ai_triggers";

export interface AICapture {
  id: string;
  imageUri: string;
  trigger: string;
  capturedAt: string;
}

export interface CustomTrigger {
  id: string;
  name: string;
  prompt: string;
  icon: string;
  createdAt: string;
}

export interface TriggerPreset {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  detectQuery?: string;
  isCustom?: boolean;
}

export const DEFAULT_TRIGGERS: TriggerPreset[] = [
  {
    id: "wave",
    name: "Wave",
    icon: "👋",
    prompt: "Is someone waving their hand? Answer only 'yes' or 'no'.",
    detectQuery: "person waving hand",
  },
  {
    id: "smile",
    name: "Smile",
    icon: "😊",
    prompt: "Is someone smiling? Answer only 'yes' or 'no'.",
    detectQuery: "smiling face",
  },
  {
    id: "thumbsup",
    name: "Thumbs Up",
    icon: "👍",
    prompt: "Is someone giving a thumbs up? Answer only 'yes' or 'no'.",
    detectQuery: "thumbs up hand gesture",
  },
  {
    id: "peace",
    name: "Peace",
    icon: "✌️",
    prompt: "Is someone making a peace sign? Answer only 'yes' or 'no'.",
    detectQuery: "peace sign hand gesture",
  },
  {
    id: "pointing",
    name: "Pointing",
    icon: "👆",
    prompt: "Is someone pointing at the camera? Answer only 'yes' or 'no'.",
    detectQuery: "person pointing",
  },
];

export async function getAICaptures(): Promise<AICapture[]> {
  try {
    const data = await AsyncStorage.getItem(CAPTURES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveAICapture(capture: AICapture): Promise<void> {
  const captures = await getAICaptures();
  captures.unshift(capture);
  const trimmed = captures.slice(0, 100);
  await AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(trimmed));
}

export async function deleteAICapture(id: string): Promise<void> {
  const captures = await getAICaptures();
  const filtered = captures.filter(c => c.id !== id);
  await AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(filtered));
}

export async function clearAICaptures(): Promise<void> {
  await AsyncStorage.removeItem(CAPTURES_KEY);
}

export async function getCustomTriggers(): Promise<CustomTrigger[]> {
  try {
    const data = await AsyncStorage.getItem(CUSTOM_TRIGGERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveCustomTrigger(trigger: CustomTrigger): Promise<void> {
  const triggers = await getCustomTriggers();
  triggers.push(trigger);
  await AsyncStorage.setItem(CUSTOM_TRIGGERS_KEY, JSON.stringify(triggers));
}

export async function deleteCustomTrigger(id: string): Promise<void> {
  const triggers = await getCustomTriggers();
  const filtered = triggers.filter(t => t.id !== id);
  await AsyncStorage.setItem(CUSTOM_TRIGGERS_KEY, JSON.stringify(filtered));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
