import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  CAMERA_PROFILES: "@vrp_camera_profiles",
  CURRENT_CAMERA_ID: "@vrp_current_camera_id",
  PRESETS: "@vrp_presets",
  SETTINGS: "@vrp_settings",
  REPLAY_BUFFER_DURATION: "@vrp_replay_duration",
  MOONDREAM_API_KEY: "@vrp_moondream_key",
  SHOW_STATS_BY_DEFAULT: "@vrp_show_stats",
  USER_PROFILE: "@vrp_user_profile",
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

export interface AppSettings {
  replayBufferDuration: number;
  showStatsByDefault: boolean;
  moondreamApiKey: string;
}

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
    const [duration, showStats, apiKey] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.REPLAY_BUFFER_DURATION),
      AsyncStorage.getItem(STORAGE_KEYS.SHOW_STATS_BY_DEFAULT),
      AsyncStorage.getItem(STORAGE_KEYS.MOONDREAM_API_KEY),
    ]);
    
    return {
      replayBufferDuration: duration ? parseInt(duration, 10) : 30,
      showStatsByDefault: showStats === "true",
      moondreamApiKey: apiKey || "",
    };
  } catch {
    return {
      replayBufferDuration: 30,
      showStatsByDefault: false,
      moondreamApiKey: "",
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
      AsyncStorage.setItem(STORAGE_KEYS.MOONDREAM_API_KEY, settings.moondreamApiKey)
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
