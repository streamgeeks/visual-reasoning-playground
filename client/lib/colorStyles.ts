import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColorStylePreset, CameraImageSettings } from "./storage";

const STORAGE_KEY = "@vrp_color_style_presets";

const THUMBNAILS = {
  sportsBroadcast: require("../assets/color-profiles/sports-broadcast.jpg"),
  outdoorDaylight: require("../assets/color-profiles/outdoor-daylight.jpg"),
  talkShowNight: require("../assets/color-profiles/talk-show-night.jpg"),
  newsCorporate: require("../assets/color-profiles/news-corporate.jpg"),
  podcastCool: require("../assets/color-profiles/podcast-cool.jpg"),
  cinematicPerformance: require("../assets/color-profiles/cinematic-performance.jpg"),
};

export const BUILT_IN_PRESETS: ColorStylePreset[] = [
  {
    id: "neutral",
    name: "Neutral",
    description: "Default balanced settings",
    icon: "circle",
    settings: {
      whiteBalanceMode: "auto",
      brightness: 7,
      saturation: 7,
      contrast: 7,
      sharpness: 7,
      hue: 7,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "warm-broadcast",
    name: "Sports Broadcast",
    description: "ESPN-style warm, vibrant look",
    icon: "sun",
    thumbnailImage: THUMBNAILS.sportsBroadcast,
    settings: {
      whiteBalanceMode: "manual",
      colorTemperature: 18,
      redGain: 145,
      blueGain: 110,
      brightness: 8,
      saturation: 9,
      contrast: 8,
      sharpness: 8,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "outdoor-daylight",
    name: "Outdoor Daylight",
    description: "Natural sunlight balance",
    icon: "sunrise",
    thumbnailImage: THUMBNAILS.outdoorDaylight,
    settings: {
      whiteBalanceMode: "outdoor",
      brightness: 7,
      saturation: 7,
      contrast: 8,
      sharpness: 8,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "soft-interview",
    name: "Talk Show",
    description: "Flattering skin tones, soft look",
    icon: "user",
    thumbnailImage: THUMBNAILS.talkShowNight,
    settings: {
      whiteBalanceMode: "manual",
      colorTemperature: 20,
      redGain: 135,
      blueGain: 120,
      brightness: 8,
      saturation: 6,
      contrast: 5,
      sharpness: 4,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "news-corporate",
    name: "News Corporate",
    description: "Studio bright, professional look",
    icon: "briefcase",
    thumbnailImage: THUMBNAILS.newsCorporate,
    settings: {
      whiteBalanceMode: "indoor",
      brightness: 9,
      saturation: 7,
      contrast: 8,
      sharpness: 9,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "podcast-cool",
    name: "Podcast Cool",
    description: "Blue cool tones for intimate settings",
    icon: "mic",
    thumbnailImage: THUMBNAILS.podcastCool,
    settings: {
      whiteBalanceMode: "manual",
      colorTemperature: 28,
      redGain: 110,
      blueGain: 145,
      brightness: 7,
      saturation: 7,
      contrast: 6,
      sharpness: 6,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "cinematic-performance",
    name: "Cinematic",
    description: "Live performance dramatic look",
    icon: "film",
    thumbnailImage: THUMBNAILS.cinematicPerformance,
    settings: {
      whiteBalanceMode: "manual",
      colorTemperature: 16,
      redGain: 148,
      blueGain: 108,
      brightness: 6,
      saturation: 9,
      contrast: 10,
      sharpness: 7,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "cool-stadium",
    name: "Cool Stadium",
    description: "Crisp, cool outdoor sports look",
    icon: "cloud",
    settings: {
      whiteBalanceMode: "manual",
      colorTemperature: 26,
      redGain: 115,
      blueGain: 140,
      brightness: 7,
      saturation: 8,
      contrast: 9,
      sharpness: 9,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "indoor-gym",
    name: "Indoor Gym",
    description: "Corrects fluorescent lighting",
    icon: "home",
    settings: {
      whiteBalanceMode: "indoor",
      brightness: 8,
      saturation: 8,
      contrast: 7,
      sharpness: 7,
      hue: 6,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "vivid-sports",
    name: "Vivid Sports",
    description: "High contrast, punchy colors",
    icon: "zap",
    settings: {
      whiteBalanceMode: "auto",
      brightness: 7,
      saturation: 11,
      contrast: 10,
      sharpness: 10,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
  {
    id: "night-game",
    name: "Night Game",
    description: "Optimized for artificial stadium lights",
    icon: "moon",
    settings: {
      whiteBalanceMode: "manual",
      colorTemperature: 15,
      redGain: 150,
      blueGain: 105,
      brightness: 9,
      saturation: 8,
      contrast: 8,
      sharpness: 7,
    },
    createdAt: new Date().toISOString(),
    isBuiltIn: true,
  },
];

export async function getColorStylePresets(): Promise<ColorStylePreset[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    const customPresets: ColorStylePreset[] = data ? JSON.parse(data) : [];
    return [...BUILT_IN_PRESETS, ...customPresets];
  } catch {
    return BUILT_IN_PRESETS;
  }
}

export async function getCustomPresets(): Promise<ColorStylePreset[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveCustomPreset(preset: Omit<ColorStylePreset, "id" | "createdAt" | "isBuiltIn">): Promise<ColorStylePreset> {
  const customPresets = await getCustomPresets();
  
  const newPreset: ColorStylePreset = {
    ...preset,
    id: `custom-${Date.now()}`,
    createdAt: new Date().toISOString(),
    isBuiltIn: false,
  };
  
  customPresets.push(newPreset);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
  
  return newPreset;
}

export async function deleteCustomPreset(id: string): Promise<void> {
  const customPresets = await getCustomPresets();
  const filtered = customPresets.filter(p => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function updateCustomPreset(id: string, updates: Partial<ColorStylePreset>): Promise<void> {
  const customPresets = await getCustomPresets();
  const index = customPresets.findIndex(p => p.id === id);
  
  if (index >= 0) {
    customPresets[index] = { ...customPresets[index], ...updates };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
  }
}

export function getPresetById(presets: ColorStylePreset[], id: string): ColorStylePreset | undefined {
  return presets.find(p => p.id === id);
}

export function mergeWithDefaults(partial: Partial<CameraImageSettings>): CameraImageSettings {
  return {
    whiteBalanceMode: partial.whiteBalanceMode ?? "auto",
    colorTemperature: partial.colorTemperature ?? 21,
    redGain: partial.redGain ?? 128,
    blueGain: partial.blueGain ?? 128,
    brightness: partial.brightness ?? 7,
    saturation: partial.saturation ?? 7,
    contrast: partial.contrast ?? 7,
    sharpness: partial.sharpness ?? 7,
    hue: partial.hue ?? 7,
  };
}
