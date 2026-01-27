import { requireNativeModule, Platform } from "expo-modules-core";

const NativeModule =
  Platform.OS === "ios" ? requireNativeModule("CameraControls") : null;

export const isCameraControlsAvailable = Platform.OS === "ios";

export async function setWhiteBalanceTemperature(kelvin) {
  if (!NativeModule) {
    console.warn("[CameraControls] Not available on this platform");
    return { success: false, error: "Not available on this platform" };
  }
  try {
    const result = await NativeModule.setWhiteBalanceTemperature(kelvin);
    console.log("[CameraControls] setWhiteBalanceTemperature:", result);
    return result;
  } catch (error) {
    console.error("[CameraControls] setWhiteBalanceTemperature error:", error);
    return { success: false, error: error.message };
  }
}

export async function setWhiteBalanceTint(tint) {
  if (!NativeModule) {
    console.warn("[CameraControls] Not available on this platform");
    return { success: false, error: "Not available on this platform" };
  }
  try {
    const result = await NativeModule.setWhiteBalanceTint(tint);
    console.log("[CameraControls] setWhiteBalanceTint:", result);
    return result;
  } catch (error) {
    console.error("[CameraControls] setWhiteBalanceTint error:", error);
    return { success: false, error: error.message };
  }
}

export async function setExposureCompensation(value) {
  if (!NativeModule) {
    console.warn("[CameraControls] Not available on this platform");
    return { success: false, error: "Not available on this platform" };
  }
  try {
    const result = await NativeModule.setExposureCompensation(value);
    console.log("[CameraControls] setExposureCompensation:", result);
    return result;
  } catch (error) {
    console.error("[CameraControls] setExposureCompensation error:", error);
    return { success: false, error: error.message };
  }
}

export async function setISO(iso) {
  if (!NativeModule) {
    console.warn("[CameraControls] Not available on this platform");
    return { success: false, error: "Not available on this platform" };
  }
  try {
    const result = await NativeModule.setISO(iso);
    console.log("[CameraControls] setISO:", result);
    return result;
  } catch (error) {
    console.error("[CameraControls] setISO error:", error);
    return { success: false, error: error.message };
  }
}

export async function resetToAuto() {
  if (!NativeModule) {
    console.warn("[CameraControls] Not available on this platform");
    return { success: false, error: "Not available on this platform" };
  }
  try {
    const result = await NativeModule.resetToAuto();
    console.log("[CameraControls] resetToAuto:", result);
    return result;
  } catch (error) {
    console.error("[CameraControls] resetToAuto error:", error);
    return { success: false, error: error.message };
  }
}

export function isAvailable() {
  if (!NativeModule) {
    return false;
  }
  try {
    return NativeModule.isAvailable();
  } catch (error) {
    console.error("[CameraControls] isAvailable error:", error);
    return false;
  }
}

export function getDeviceInfo() {
  if (!NativeModule) {
    return { available: false };
  }
  try {
    const info = NativeModule.getDeviceInfo();
    console.log("[CameraControls] Device info:", info);
    return info;
  } catch (error) {
    console.error("[CameraControls] getDeviceInfo error:", error);
    return { available: false, error: error.message };
  }
}
