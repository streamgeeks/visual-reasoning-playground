export const isCameraControlsAvailable: boolean;

export function setWhiteBalanceTemperature(kelvin: number): Promise<void>;

export function setWhiteBalanceTint(tint: number): Promise<void>;

export function setExposureCompensation(value: number): Promise<void>;

export function setISO(iso: number): Promise<void>;

export function resetToAuto(): Promise<void>;

export function isAvailable(): boolean;

export interface DeviceInfo {
  available: boolean;
  minExposureBias?: number;
  maxExposureBias?: number;
  minISO?: number;
  maxISO?: number;
}

export function getDeviceInfo(): DeviceInfo;
