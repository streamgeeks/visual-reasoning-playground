import * as LocalAuthentication from "expo-local-authentication";
import { getSecuritySettings } from "./storage";

export type BiometricType = "fingerprint" | "facial" | "iris" | "none";

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometricType: BiometricType;
  isEnrolled: boolean;
}

export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: BiometricType = "none";
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = "facial";
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = "fingerprint";
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = "iris";
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      biometricType,
      isEnrolled,
    };
  } catch {
    return {
      isAvailable: false,
      biometricType: "none",
      isEnrolled: false,
    };
  }
}

export function getBiometricDisplayName(type: BiometricType): string {
  switch (type) {
    case "facial":
      return "Face ID";
    case "fingerprint":
      return "Touch ID";
    case "iris":
      return "Iris Scan";
    default:
      return "Biometric";
  }
}

export function getBiometricIcon(type: BiometricType): string {
  switch (type) {
    case "facial":
      return "scan-face";
    case "fingerprint":
      return "fingerprint";
    case "iris":
      return "eye";
    default:
      return "lock";
  }
}

export interface AuthenticationResult {
  success: boolean;
  error?: string;
  warning?: string;
}

export async function authenticateWithBiometrics(
  promptMessage: string = "Authenticate to access sensitive data"
): Promise<AuthenticationResult> {
  try {
    const capabilities = await getBiometricCapabilities();

    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device",
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      fallbackLabel: "Use Passcode",
    });

    if (result.success) {
      return { success: true };
    }

    if (result.error === "user_cancel") {
      return { success: false, error: "Authentication cancelled" };
    }

    if (result.error === "user_fallback") {
      return { success: false, warning: "User chose passcode fallback" };
    }

    return { success: false, error: result.error || "Authentication failed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function requireBiometricForSensitiveAction(
  actionDescription: string
): Promise<boolean> {
  const settings = await getSecuritySettings();

  if (!settings.biometricProtectionEnabled) {
    return true;
  }

  const result = await authenticateWithBiometrics(
    `Authenticate to ${actionDescription}`
  );

  return result.success;
}

export async function canEnableBiometricProtection(): Promise<{
  canEnable: boolean;
  reason?: string;
}> {
  const capabilities = await getBiometricCapabilities();

  if (!capabilities.isAvailable) {
    if (!capabilities.isEnrolled) {
      return {
        canEnable: false,
        reason: `${getBiometricDisplayName(capabilities.biometricType) || "Biometric authentication"} is not set up on this device. Please enable it in Settings.`,
      };
    }
    return {
      canEnable: false,
      reason: "Biometric authentication is not available on this device",
    };
  }

  return { canEnable: true };
}
