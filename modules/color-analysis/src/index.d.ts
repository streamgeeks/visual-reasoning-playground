export interface ColorProfile {
  red: number;
  green: number;
  blue: number;
  brightness: number;
  saturation: number;
  temperature: number;
  contrast: number;
}

export interface ColorCorrection {
  brightness: number;
  saturation: number;
  contrast: number;
  hue: number;
  redGain: number;
  blueGain: number;
  colorTemperature: number;
  whiteBalanceMode: string;
}

export interface ComparisonResult {
  similarity: number;
  brightnessDelta: number;
  saturationDelta: number;
  temperatureDelta: number;
  contrastDelta: number;
  correction: ColorCorrection;
}

export const isColorAnalysisAvailable: boolean;

export function analyzeImage(imageBase64: string): Promise<ColorProfile | null>;

export function compareImages(
  currentBase64: string,
  referenceBase64: string
): Promise<ComparisonResult | null>;

export function generateCorrection(
  currentBase64: string,
  referenceBase64: string
): Promise<ColorCorrection | null>;

export function isAvailable(): boolean;
