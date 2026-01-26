export interface DetectionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
}

export interface TrackingResult {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  isLost: boolean;
}

export interface ClassificationResult {
  identifier: string;
  confidence: number;
}

export interface PoseKeypoint {
  name: string;
  x: number;
  y: number;
  confidence: number;
}

export interface PoseAnalysisResult {
  keypoints: PoseKeypoint[];
  isJumping: boolean;
  isRunning: boolean;
  armsRaised: boolean;
  confidence: number;
}

export interface HandPoseResult {
  chirality: "left" | "right";
  confidence: number;
  isPointing: boolean;
  isOpenPalm: boolean;
  isFist: boolean;
  isThumbsUp: boolean;
  isPeaceSign: boolean;
  wristX: number;
  wristY: number;
}

export const isVisionAvailable: boolean;

export function isYOLOAvailable(): Promise<boolean>;
export function isCLIPAvailable(): Promise<boolean>;

export function detectHumans(imageBase64: string): Promise<DetectionResult[]>;
export function detectFaces(imageBase64: string): Promise<DetectionResult[]>;
export function detectAnimals(imageBase64: string): Promise<DetectionResult[]>;
export function detectObjectsYOLO(imageBase64: string): Promise<DetectionResult[]>;
export function detectWithQuery(imageBase64: string, query: string, topK?: number): Promise<DetectionResult[]>;

export function embedImageCLIP(imageBase64: string): Promise<number[]>;
export function embedTextCLIP(text: string): Promise<number[]>;
export function clipSimilarity(embedding1: number[], embedding2: number[]): Promise<number>;
export function classifyScene(imageBase64: string, maxResults?: number): Promise<ClassificationResult[]>;
export function detectBodyPoses(imageBase64: string): Promise<PoseAnalysisResult[]>;
export function detectHandPoses(imageBase64: string): Promise<HandPoseResult[]>;

export function startTracking(
  x: number,
  y: number,
  width: number,
  height: number
): string | null;

export function updateTracking(
  trackingId: string,
  imageBase64: string
): Promise<TrackingResult | null>;

export function stopTracking(trackingId: string): void;
export function stopAllTracking(): void;
export function getActiveTrackingCount(): number;

export function generateFeaturePrint(imageBase64: string): Promise<number[]>;
export function calculateSimilarity(embedding1: number[], embedding2: number[]): Promise<number>;
