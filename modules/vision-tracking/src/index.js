import { requireNativeModule, Platform } from "expo-modules-core";

const NativeModule =
  Platform.OS === "ios" ? requireNativeModule("VisionTracking") : null;

export const isVisionAvailable = Platform.OS === "ios";

export async function detectHumans(imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.detectHumans(imageBase64);
}

export async function detectFaces(imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.detectFaces(imageBase64);
}

export async function detectAnimals(imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.detectAnimals(imageBase64);
}

export async function classifyScene(imageBase64, maxResults = 5) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.classifyScene(imageBase64, maxResults);
}

export async function detectBodyPoses(imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.detectBodyPoses(imageBase64);
}

export async function detectHandPoses(imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.detectHandPoses(imageBase64);
}

export function startTracking(x, y, width, height) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return null;
  }
  return NativeModule.startTracking(x, y, width, height);
}

export async function updateTracking(trackingId, imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return null;
  }
  return NativeModule.updateTracking(trackingId, imageBase64);
}

export function stopTracking(trackingId) {
  if (!NativeModule) {
    return;
  }
  NativeModule.stopTracking(trackingId);
}

export function stopAllTracking() {
  if (!NativeModule) {
    return;
  }
  NativeModule.stopAllTracking();
}

export function getActiveTrackingCount() {
  if (!NativeModule) {
    return 0;
  }
  return NativeModule.getActiveTrackingCount();
}

export async function isYOLOAvailable() {
  if (!NativeModule) {
    return false;
  }
  return NativeModule.isYOLOAvailable();
}

export async function isCLIPAvailable() {
  if (!NativeModule) {
    return false;
  }
  return NativeModule.isCLIPAvailable();
}

export async function detectObjectsYOLO(imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.detectObjectsYOLO(imageBase64);
}

export async function detectWithQuery(imageBase64, query, topK = 5) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.detectWithQuery(imageBase64, query, topK);
}

export async function embedImageCLIP(imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.embedImageCLIP(imageBase64);
}

export async function embedTextCLIP(text) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.embedTextCLIP(text);
}

export async function clipSimilarity(embedding1, embedding2) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return 0;
  }
  return NativeModule.clipSimilarity(embedding1, embedding2);
}

export async function generateFeaturePrint(imageBase64) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return [];
  }
  return NativeModule.generateFeaturePrint(imageBase64);
}

export async function calculateSimilarity(embedding1, embedding2) {
  if (!NativeModule) {
    console.warn("VisionTracking: Not available on this platform");
    return 0;
  }
  return NativeModule.calculateSimilarity(embedding1, embedding2);
}
