import { requireNativeModule, Platform } from "expo-modules-core";

const NativeModule =
  Platform.OS === "ios" ? requireNativeModule("ColorAnalysis") : null;

export const isColorAnalysisAvailable = Platform.OS === "ios";

export async function analyzeImage(imageBase64) {
  if (!NativeModule) {
    console.warn("ColorAnalysis: Not available on this platform");
    return null;
  }
  return NativeModule.analyzeImage(imageBase64);
}

export async function compareImages(currentBase64, referenceBase64) {
  if (!NativeModule) {
    console.warn("ColorAnalysis: Not available on this platform");
    return null;
  }
  return NativeModule.compareImages(currentBase64, referenceBase64);
}

export async function generateCorrection(currentBase64, referenceBase64) {
  if (!NativeModule) {
    console.warn("ColorAnalysis: Not available on this platform");
    return null;
  }
  return NativeModule.generateCorrection(currentBase64, referenceBase64);
}

export function isAvailable() {
  if (!NativeModule) {
    return false;
  }
  return NativeModule.isAvailable();
}
