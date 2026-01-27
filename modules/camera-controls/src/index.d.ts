export const isCameraControlsAvailable: boolean;

export interface CameraControlResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export function setWhiteBalanceTemperature(
  kelvin: number,
): Promise<CameraControlResult>;

export function setWhiteBalanceTint(tint: number): Promise<CameraControlResult>;

export function setExposureCompensation(
  value: number,
): Promise<CameraControlResult>;

export function setISO(iso: number): Promise<CameraControlResult>;

export function resetToAuto(): Promise<CameraControlResult>;

export function isAvailable(): boolean;

export interface DeviceInfo {
  available: boolean;
  deviceName?: string;
  position?: "front" | "back";
  minExposureBias?: number;
  maxExposureBias?: number;
  currentExposureBias?: number;
  minISO?: number;
  maxISO?: number;
  currentISO?: number;
  currentTemperature?: number;
  currentTint?: number;
  whiteBalanceMode?: string;
  exposureMode?: string;
  error?: string;
}

export function getDeviceInfo(): DeviceInfo;
