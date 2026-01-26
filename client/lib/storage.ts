import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEYS = {
  CAMERA_PROFILES: "@vrp_camera_profiles",
  CURRENT_CAMERA_ID: "@vrp_current_camera_id",
  PRESETS: "@vrp_presets",
  SETTINGS: "@vrp_settings",
  REPLAY_BUFFER_DURATION: "@vrp_replay_duration",
  MOONDREAM_API_KEY: "@vrp_moondream_key",
  SHOW_STATS_BY_DEFAULT: "@vrp_show_stats",
  USER_PROFILE: "@vrp_user_profile",
  TRACKING_SETTINGS: "@vrp_tracking_settings",
  CUSTOM_OBJECTS: "@vrp_custom_objects",
  PERSON_PROFILES: "@vrp_person_profiles",
} as const;

const SECURE_KEYS = {
  MOONDREAM_API_KEY: "vrp_moondream_api_key",
  OPENAI_API_KEY: "vrp_openai_api_key",
} as const;

export type StreamQuality = "high" | "low";

export interface CameraProfile {
  id: string;
  name: string;
  ipAddress: string;
  username: string;
  password: string;
  rtspPort: number;
  httpPort: number;
  viscaPort?: number;
  streamQuality: StreamQuality;
  createdAt: string;
}

export interface PTZPreset {
  id: string;
  cameraId: string;
  name: string;
  pan: number;
  tilt: number;
  zoom: number;
  templateType?: PresetTemplateType;
  createdAt: string;
}

export type PresetTemplateType = "basketball" | "interview" | "classroom" | "stage" | "custom";

export interface UserProfile {
  displayName: string;
  avatarUri?: string;
}

export interface TrackingSettings {
  ptzSpeed: number; // 1-24 for PTZOptics
  pulseDuration: number; // ms to move before stopping (0 = continuous)
  deadZone: number; // 0-1, percentage of frame center to ignore
  continuousMode: boolean; // if true, camera keeps moving until object centered
}

export interface AppSettings {
  replayBufferDuration: number;
  showStatsByDefault: boolean;
  moondreamApiKey: string;
  tracking: TrackingSettings;
}

export const DEFAULT_TRACKING_SETTINGS: TrackingSettings = {
  ptzSpeed: 2,
  pulseDuration: 0,
  deadZone: 0.15,
  continuousMode: true,
};

export interface SavedCustomObject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  usageCount: number;
}

export interface PersonProfile {
  id: string;
  name: string;
  imageUri: string;
  embedding: number[];
  createdAt: string;
}

export type WhiteBalanceMode = "auto" | "indoor" | "outdoor" | "onepush" | "manual" | "var";

export interface CameraImageSettings {
  whiteBalanceMode: WhiteBalanceMode;
  colorTemperature: number;
  redGain: number;
  blueGain: number;
  brightness: number;
  saturation: number;
  contrast: number;
  sharpness: number;
  hue: number;
}

export interface ColorStylePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  thumbnailImage?: number;
  settings: Partial<CameraImageSettings>;
  createdAt: string;
  isBuiltIn: boolean;
}

export const DEFAULT_IMAGE_SETTINGS: CameraImageSettings = {
  whiteBalanceMode: "auto",
  colorTemperature: 21,
  redGain: 128,
  blueGain: 128,
  brightness: 7,
  saturation: 7,
  contrast: 7,
  sharpness: 7,
  hue: 7,
};

export const IMAGE_SETTING_RANGES = {
  colorTemperature: { min: 0, max: 37, default: 21 },
  redGain: { min: 0, max: 255, default: 128 },
  blueGain: { min: 0, max: 255, default: 128 },
  brightness: { min: 0, max: 14, default: 7 },
  saturation: { min: 0, max: 14, default: 7 },
  contrast: { min: 0, max: 14, default: 7 },
  sharpness: { min: 0, max: 14, default: 7 },
  hue: { min: 0, max: 14, default: 7 },
} as const;

// Camera Profiles
export async function getCameraProfiles(): Promise<CameraProfile[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CAMERA_PROFILES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveCameraProfile(profile: CameraProfile): Promise<void> {
  const profiles = await getCameraProfiles();
  const existingIndex = profiles.findIndex((p) => p.id === profile.id);
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }
  
  await AsyncStorage.setItem(STORAGE_KEYS.CAMERA_PROFILES, JSON.stringify(profiles));
}

export async function deleteCameraProfile(id: string): Promise<void> {
  const profiles = await getCameraProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.CAMERA_PROFILES, JSON.stringify(filtered));
  
  // Also delete associated presets
  const presets = await getPresets();
  const filteredPresets = presets.filter((p) => p.cameraId !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(filteredPresets));
}

export async function getCurrentCameraId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.CURRENT_CAMERA_ID);
}

export async function setCurrentCameraId(id: string | null): Promise<void> {
  if (id) {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_CAMERA_ID, id);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_CAMERA_ID);
  }
}

// Presets
export async function getPresets(): Promise<PTZPreset[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRESETS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getPresetsForCamera(cameraId: string): Promise<PTZPreset[]> {
  const presets = await getPresets();
  return presets.filter((p) => p.cameraId === cameraId);
}

export async function savePreset(preset: PTZPreset): Promise<void> {
  const presets = await getPresets();
  const existingIndex = presets.findIndex((p) => p.id === preset.id);
  
  if (existingIndex >= 0) {
    presets[existingIndex] = preset;
  } else {
    presets.push(preset);
  }
  
  await AsyncStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
}

export async function deletePreset(id: string): Promise<void> {
  const presets = await getPresets();
  const filtered = presets.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(filtered));
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  try {
    const [duration, showStats, trackingData, secureApiKey, legacyApiKey] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.REPLAY_BUFFER_DURATION),
      AsyncStorage.getItem(STORAGE_KEYS.SHOW_STATS_BY_DEFAULT),
      AsyncStorage.getItem(STORAGE_KEYS.TRACKING_SETTINGS),
      SecureStore.getItemAsync(SECURE_KEYS.MOONDREAM_API_KEY).catch(() => null),
      AsyncStorage.getItem(STORAGE_KEYS.MOONDREAM_API_KEY),
    ]);
    
    const tracking = trackingData 
      ? { ...DEFAULT_TRACKING_SETTINGS, ...JSON.parse(trackingData) }
      : DEFAULT_TRACKING_SETTINGS;
    
    const apiKey = secureApiKey || legacyApiKey || "";
    
    return {
      replayBufferDuration: duration ? parseInt(duration, 10) : 30,
      showStatsByDefault: showStats === "true",
      moondreamApiKey: apiKey,
      tracking,
    };
  } catch {
    return {
      replayBufferDuration: 30,
      showStatsByDefault: false,
      moondreamApiKey: "",
      tracking: DEFAULT_TRACKING_SETTINGS,
    };
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const promises: Promise<void>[] = [];
  
  if (settings.replayBufferDuration !== undefined) {
    promises.push(
      AsyncStorage.setItem(
        STORAGE_KEYS.REPLAY_BUFFER_DURATION,
        settings.replayBufferDuration.toString()
      )
    );
  }
  
  if (settings.showStatsByDefault !== undefined) {
    promises.push(
      AsyncStorage.setItem(
        STORAGE_KEYS.SHOW_STATS_BY_DEFAULT,
        settings.showStatsByDefault.toString()
      )
    );
  }
  
  if (settings.moondreamApiKey !== undefined) {
    promises.push(
      (async () => {
        if (settings.moondreamApiKey) {
          await SecureStore.setItemAsync(SECURE_KEYS.MOONDREAM_API_KEY, settings.moondreamApiKey);
        } else {
          await SecureStore.deleteItemAsync(SECURE_KEYS.MOONDREAM_API_KEY);
        }
        await AsyncStorage.removeItem(STORAGE_KEYS.MOONDREAM_API_KEY);
      })()
    );
  }
  
  if (settings.tracking !== undefined) {
    promises.push(
      AsyncStorage.setItem(STORAGE_KEYS.TRACKING_SETTINGS, JSON.stringify(settings.tracking))
    );
  }
  
  await Promise.all(promises);
}

// User Profile
export async function getUserProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : { displayName: "User" };
  } catch {
    return { displayName: "User" };
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

// Generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Custom Objects
export async function getCustomObjects(): Promise<SavedCustomObject[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_OBJECTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveCustomObject(name: string, description: string): Promise<SavedCustomObject> {
  const objects = await getCustomObjects();
  
  const existing = objects.find(
    (o) => o.description.toLowerCase() === description.toLowerCase()
  );
  
  if (existing) {
    existing.usageCount++;
    existing.name = name;
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_OBJECTS, JSON.stringify(objects));
    return existing;
  }
  
  const newObject: SavedCustomObject = {
    id: generateId(),
    name,
    description,
    createdAt: new Date().toISOString(),
    usageCount: 1,
  };
  
  objects.unshift(newObject);
  
  if (objects.length > 20) {
    objects.pop();
  }
  
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_OBJECTS, JSON.stringify(objects));
  return newObject;
}

export async function deleteCustomObject(id: string): Promise<void> {
  const objects = await getCustomObjects();
  const filtered = objects.filter((o) => o.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_OBJECTS, JSON.stringify(filtered));
}

export async function incrementCustomObjectUsage(id: string): Promise<void> {
  const objects = await getCustomObjects();
  const obj = objects.find((o) => o.id === id);
  if (obj) {
    obj.usageCount++;
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_OBJECTS, JSON.stringify(objects));
  }
}

// Secure Storage for sensitive data
export async function getSecureApiKey(key: keyof typeof SECURE_KEYS): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS[key]);
  } catch {
    return null;
  }
}

export async function setSecureApiKey(key: keyof typeof SECURE_KEYS, value: string): Promise<void> {
  try {
    if (value) {
      await SecureStore.setItemAsync(SECURE_KEYS[key], value);
    } else {
      await SecureStore.deleteItemAsync(SECURE_KEYS[key]);
    }
  } catch (error) {
    console.error("Failed to save secure key:", error);
  }
}

export async function deleteSecureApiKey(key: keyof typeof SECURE_KEYS): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS[key]);
  } catch (error) {
    console.error("Failed to delete secure key:", error);
  }
}

export async function migrateApiKeyToSecureStorage(): Promise<void> {
  try {
    const existingKey = await AsyncStorage.getItem(STORAGE_KEYS.MOONDREAM_API_KEY);
    if (existingKey) {
      await setSecureApiKey("MOONDREAM_API_KEY", existingKey);
      await AsyncStorage.removeItem(STORAGE_KEYS.MOONDREAM_API_KEY);
      console.log("Migrated Moondream API key to secure storage");
    }
  } catch (error) {
    console.error("Failed to migrate API key:", error);
  }
}
