import { requireNativeModule, Platform } from "expo-modules-core";

const NativeModule =
  Platform.OS === "ios" ? requireNativeModule("CameraControls") : null;

export const isCameraControlsAvailable = Platform.OS === "ios";

export async function setWhiteBalanceTemperature(kelvin) {
  if (!NativeModule) {
    console.warn("CameraControls: Not available on this platform");
    return;
  }
  return NativeModule.setWhiteBalanceTemperature(kelvin);
}

export async function setWhiteBalanceTint(tint) {
  if (!NativeModule) {
    console.warn("CameraControls: Not available on this platform");
    return;
  }
  return NativeModule.setWhiteBalanceTint(tint);
}

export async function setExposureCompensation(value) {
  if (!NativeModule) {
    console.warn("CameraControls: Not available on this platform");
    return;
  }
  return NativeModule.setExposureCompensation(value);
}

export async function setISO(iso) {
  if (!NativeModule) {
    console.warn("CameraControls: Not available on this platform");
    return;
  }
  return NativeModule.setISO(iso);
}

export async function resetToAuto() {
  if (!NativeModule) {
    console.warn("CameraControls: Not available on this platform");
    return;
  }
  return NativeModule.resetToAuto();
}

export function isAvailable() {
  if (!NativeModule) {
    return false;
  }
  return NativeModule.isAvailable();
}

export function getDeviceInfo() {
  if (!NativeModule) {
    return { available: false };
  }
  return NativeModule.getDeviceInfo();
}
