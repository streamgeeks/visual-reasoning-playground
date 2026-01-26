import {
  isYOLOAvailable,
  isCLIPAvailable,
  detectObjectsYOLO,
  detectWithQuery,
  embedImageCLIP,
  embedTextCLIP,
  clipSimilarity,
  DetectionResult,
} from "../../modules/vision-tracking/src";
import { Platform } from "react-native";

export interface NativeDetectionResult {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface NativeDetectionStatus {
  available: boolean;
  yoloLoaded: boolean;
  clipLoaded: boolean;
}

let cachedStatus: NativeDetectionStatus | null = null;

export async function checkNativeDetectionStatus(): Promise<NativeDetectionStatus> {
  if (cachedStatus) return cachedStatus;

  if (Platform.OS !== "ios") {
    cachedStatus = { available: false, yoloLoaded: false, clipLoaded: false };
    return cachedStatus;
  }

  try {
    const [yoloLoaded, clipLoaded] = await Promise.all([
      isYOLOAvailable(),
      isCLIPAvailable(),
    ]);

    cachedStatus = {
      available: yoloLoaded,
      yoloLoaded,
      clipLoaded,
    };
  } catch (e) {
    console.warn("[NativeDetection] Failed to check status:", e);
    cachedStatus = { available: false, yoloLoaded: false, clipLoaded: false };
  }

  return cachedStatus;
}

export async function detectAllObjects(
  imageBase64: string
): Promise<NativeDetectionResult[]> {
  const status = await checkNativeDetectionStatus();
  if (!status.yoloLoaded) {
    throw new Error("YOLO model not loaded");
  }

  const detections = await detectObjectsYOLO(imageBase64);
  return detections.map(toNativeResult);
}

export async function detectObject(
  imageBase64: string,
  objectName: string,
  topK: number = 3
): Promise<NativeDetectionResult | null> {
  const status = await checkNativeDetectionStatus();
  if (!status.yoloLoaded) {
    return null;
  }

  const detections = await detectWithQuery(imageBase64, objectName, topK);
  if (detections.length === 0) return null;

  return toNativeResult(detections[0]);
}

export async function detectObjectsMatching(
  imageBase64: string,
  objectName: string,
  topK: number = 5
): Promise<NativeDetectionResult[]> {
  const status = await checkNativeDetectionStatus();
  if (!status.yoloLoaded) {
    return [];
  }

  const detections = await detectWithQuery(imageBase64, objectName, topK);
  return detections.map(toNativeResult);
}

export async function getImageEmbedding(imageBase64: string): Promise<number[]> {
  const status = await checkNativeDetectionStatus();
  if (!status.clipLoaded) {
    throw new Error("CLIP model not loaded");
  }
  return embedImageCLIP(imageBase64);
}

export async function getTextEmbedding(text: string): Promise<number[]> {
  const status = await checkNativeDetectionStatus();
  if (!status.clipLoaded) {
    throw new Error("CLIP model not loaded");
  }
  return embedTextCLIP(text);
}

export async function compareEmbeddings(
  embedding1: number[],
  embedding2: number[]
): Promise<number> {
  return clipSimilarity(embedding1, embedding2);
}

export async function matchImageToText(
  imageBase64: string,
  textOptions: string[]
): Promise<{ text: string; score: number }[]> {
  const status = await checkNativeDetectionStatus();
  if (!status.clipLoaded) {
    throw new Error("CLIP model not loaded");
  }

  const imageEmbedding = await embedImageCLIP(imageBase64);
  const results: { text: string; score: number }[] = [];

  for (const text of textOptions) {
    const textEmbedding = await embedTextCLIP(text);
    const score = await clipSimilarity(imageEmbedding, textEmbedding);
    results.push({ text, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

function toNativeResult(detection: DetectionResult): NativeDetectionResult {
  return {
    label: detection.label,
    confidence: detection.confidence,
    boundingBox: {
      x: detection.x,
      y: detection.y,
      width: detection.width,
      height: detection.height,
    },
  };
}
