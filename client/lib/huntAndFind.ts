import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  ROOM_SCANS: "@vrp_room_scans",
  ACTIVE_SCAN: "@vrp_active_scan",
} as const;

// ============================================
// DATA INTERFACES
// ============================================

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface ScanGridConfig {
  panMin: number;
  panMax: number;
  tiltMin: number;
  tiltMax: number;
  columns: number;
  rows: number;
  presetSlotStart: number;
}

export interface ScanPosition {
  id: string;
  index: number;
  presetSlot: number;
  pan: number;
  tilt: number;
  zoom: number;
  imageUri: string | null;
  status: "pending" | "moving" | "capturing" | "captured" | "analyzing" | "analyzed";
  capturedAt: string | null;
  objectIds: string[];
}

export interface ObjectImage {
  presetSlot: number;
  imageUri: string;
  zoomLevel: "wide" | "medium" | "tight" | "close";
  boundingBox?: BoundingBox;
  capturedAt: string;
}

export interface DetectedObject {
  id: string;
  scanId: string;
  positionId: string;
  presetSlot: number;
  images: ObjectImage[];
  zoomRoundCompleted: boolean;
  starred: boolean;
  name: string;
  category: ObjectCategory;
  description: string | null;
  confidence: number;
  boundingBox: BoundingBox | null;
  relativeLocation: RelativeLocation;
  importance: number;
  importanceReason: string | null;
  thumbnailUri: string | null;
  detectedAt: string;
}

export interface ZoomRoundsConfig {
  enabled: boolean;
  topObjectCount: number;
  targetBoxHeightPercent: number;
  mediumZoomTarget: number;
  tightZoomTarget: number;
  closeZoomTarget: number;
}

export interface PositionTiming {
  positionIndex: number;
  moveStartMs: number;
  moveEndMs: number;
  captureStartMs: number;
  captureEndMs: number;
  moveDurationMs: number;
  captureDurationMs: number;
  totalDurationMs: number;
}

export interface AnalysisTiming {
  positionIndex: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  objectsDetected: number;
}

export interface ZoomRoundTiming {
  objectName: string;
  objectIndex: number;
  startMs: number;
  endMs: number;
  recallPresetMs: number;
  detectObjectMs: number;
  mediumZoomMs: number;
  tightZoomMs: number;
  closeZoomMs: number;
  totalDurationMs: number;
}

export interface ScanTimingData {
  scanStartMs: number;
  scanEndMs: number | null;
  
  scanningPhaseStartMs: number | null;
  scanningPhaseEndMs: number | null;
  scanningPhaseDurationMs: number | null;
  
  analysisPhaseStartMs: number | null;
  analysisPhaseEndMs: number | null;
  analysisPhaseDurationMs: number | null;
  
  zoomPhaseStartMs: number | null;
  zoomPhaseEndMs: number | null;
  zoomPhaseDurationMs: number | null;
  
  totalDurationMs: number | null;
  
  positionTimings: PositionTiming[];
  analysisTimings: AnalysisTiming[];
  zoomRoundTimings: ZoomRoundTiming[];
  
  averagePositionMoveMs: number | null;
  averagePositionCaptureMs: number | null;
  averageAnalysisPerPositionMs: number | null;
  averageZoomRoundMs: number | null;
}

export type ObjectCategory = 
  | "person"
  | "furniture" 
  | "electronics"
  | "decor"
  | "plant"
  | "door"
  | "window"
  | "appliance"
  | "storage"
  | "lighting"
  | "other";

export type RelativeLocation = 
  | "left-top" | "center-top" | "right-top"
  | "left-middle" | "center-middle" | "right-middle"
  | "left-bottom" | "center-bottom" | "right-bottom";

export type ScanStatus = "idle" | "scanning" | "analyzing" | "zooming" | "completed" | "paused" | "error";

export interface RoomScan {
  id: string;
  cameraId: string;
  name: string;
  status: ScanStatus;
  currentPositionIndex: number;
  startedAt: string;
  completedAt: string | null;
  gridConfig: ScanGridConfig;
  zoomRoundsConfig: ZoomRoundsConfig;
  zoomRoundsCompleted: number;
  positions: ScanPosition[];
  objects: DetectedObject[];
  summary: string | null;
  error: string | null;
  timing: ScanTimingData | null;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_GRID_CONFIG: ScanGridConfig = {
  panMin: -90,
  panMax: 90,
  tiltMin: -20,
  tiltMax: 20,
  columns: 3,
  rows: 3,
  presetSlotStart: 100,
};

export const PRESET_ALLOCATION = {
  wideAngleStart: 100,
  wideAngleEnd: 108,
  zoomPresetsStart: 109,
  zoomPresetsEnd: 250,
  maxZoomPresets: 141,
  slotsPerObject: 2,
} as const;

export const DEFAULT_ZOOM_ROUNDS_CONFIG: ZoomRoundsConfig = {
  enabled: true,
  topObjectCount: 3,
  targetBoxHeightPercent: 0.7,
  mediumZoomTarget: 0.15,
  tightZoomTarget: 0.40,
  closeZoomTarget: 0.70,
};

export function getNextAvailablePresetSlot(usedSlots: number[]): number | null {
  for (let slot = PRESET_ALLOCATION.zoomPresetsStart; slot <= PRESET_ALLOCATION.zoomPresetsEnd; slot++) {
    if (!usedSlots.includes(slot)) {
      return slot;
    }
  }
  return null;
}

export function getUsedPresetSlots(scan: RoomScan): number[] {
  const slots: number[] = [];
  scan.positions.forEach(p => slots.push(p.presetSlot));
  scan.objects.forEach(obj => {
    obj.images.forEach(img => slots.push(img.presetSlot));
  });
  return slots;
}

export interface ScanPattern {
  id: string;
  name: string;
  description: string;
  gridConfig: ScanGridConfig;
  speed: number;
  panMsPerDegree: number;
  tiltMsPerDegree: number;
}

export const SCAN_PATTERNS: ScanPattern[] = [
  {
    id: "tight-forward",
    name: "Tight Forward (90°)",
    description: "Narrow 90° sweep directly ahead. Best for small rooms.",
    gridConfig: {
      panMin: -45,
      panMax: 45,
      tiltMin: -15,
      tiltMax: 15,
      columns: 3,
      rows: 3,
      presetSlotStart: 100,
    },
    speed: 12,
    panMsPerDegree: 50,
    tiltMsPerDegree: 55,
  },
  {
    id: "conservative-forward",
    name: "Conservative (120°)",
    description: "120° sweep with slower movements. Good accuracy.",
    gridConfig: {
      panMin: -60,
      panMax: 60,
      tiltMin: -15,
      tiltMax: 15,
      columns: 3,
      rows: 3,
      presetSlotStart: 100,
    },
    speed: 10,
    panMsPerDegree: 60,
    tiltMsPerDegree: 65,
  },
  {
    id: "standard-forward",
    name: "Standard (150°)",
    description: "150° sweep, balanced speed/coverage.",
    gridConfig: {
      panMin: -75,
      panMax: 75,
      tiltMin: -20,
      tiltMax: 20,
      columns: 3,
      rows: 3,
      presetSlotStart: 100,
    },
    speed: 14,
    panMsPerDegree: 45,
    tiltMsPerDegree: 50,
  },
  {
    id: "wide-forward",
    name: "Wide (180°)",
    description: "Full 180° sweep. May go too far on some cameras.",
    gridConfig: {
      panMin: -90,
      panMax: 90,
      tiltMin: -20,
      tiltMax: 20,
      columns: 3,
      rows: 3,
      presetSlotStart: 100,
    },
    speed: 18,
    panMsPerDegree: 35,
    tiltMsPerDegree: 40,
  },
  {
    id: "slow-precise",
    name: "Slow & Precise (150°)",
    description: "150° sweep with very slow movements. Most accurate.",
    gridConfig: {
      panMin: -75,
      panMax: 75,
      tiltMin: -15,
      tiltMax: 15,
      columns: 3,
      rows: 3,
      presetSlotStart: 100,
    },
    speed: 8,
    panMsPerDegree: 80,
    tiltMsPerDegree: 85,
  },
];

export const PRESET_SLOT_RANGE = {
  start: 100,
  end: 199,
} as const;

export interface ScanTimeEstimate {
  totalSeconds: number;
  scanningSeconds: number;
  analysisSeconds: number;
  zoomRoundsSeconds: number;
  formatted: string;
}

export function estimateScanTime(
  pattern: ScanPattern,
  zoomRoundsCount: number
): ScanTimeEstimate {
  const positions = pattern.gridConfig.columns * pattern.gridConfig.rows;
  
  const panRange = pattern.gridConfig.panMax - pattern.gridConfig.panMin;
  const tiltRange = pattern.gridConfig.tiltMax - pattern.gridConfig.tiltMin;
  const avgMoveDistancePan = panRange / (pattern.gridConfig.columns - 1 || 1);
  const avgMoveDistanceTilt = tiltRange / (pattern.gridConfig.rows - 1 || 1);
  
  const avgMoveTimeMs = (avgMoveDistancePan * pattern.panMsPerDegree + avgMoveDistanceTilt * pattern.tiltMsPerDegree) / 2;
  const settleTimeMs = 800;
  const captureTimeMs = 200;
  const perPositionMs = avgMoveTimeMs + settleTimeMs + captureTimeMs;
  
  const scanningSeconds = Math.round((positions * perPositionMs) / 1000);
  
  const analysisSecondsPerPosition = 4;
  const analysisSeconds = positions * analysisSecondsPerPosition;
  
  const secondsPerZoomObject = 60;
  const zoomRoundsSeconds = zoomRoundsCount * secondsPerZoomObject;
  
  const totalSeconds = scanningSeconds + analysisSeconds + zoomRoundsSeconds;
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = minutes > 0 
    ? `~${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`
    : `~${seconds}s`;
  
  return {
    totalSeconds,
    scanningSeconds,
    analysisSeconds,
    zoomRoundsSeconds,
    formatted: formatted.trim(),
  };
}

// ============================================
// GRID CALCULATION UTILITIES
// ============================================

export function calculateGridPositions(config: ScanGridConfig): Omit<ScanPosition, "id">[] {
  const positions: Omit<ScanPosition, "id">[] = [];
  const { panMin, panMax, tiltMin, tiltMax, columns, rows, presetSlotStart } = config;
  
  const panStep = columns > 1 ? (panMax - panMin) / (columns - 1) : 0;
  const tiltStep = rows > 1 ? (tiltMax - tiltMin) / (rows - 1) : 0;
  
  let index = 0;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const pan = columns > 1 ? panMin + (col * panStep) : 0;
      const tilt = rows > 1 ? tiltMax - (row * tiltStep) : 0;
      
      positions.push({
        index,
        presetSlot: presetSlotStart + index,
        pan: Math.round(pan),
        tilt: Math.round(tilt),
        zoom: 0,
        imageUri: null,
        status: "pending",
        capturedAt: null,
        objectIds: [],
      });
      
      index++;
    }
  }
  
  return positions;
}

export function degreesToViscaPosition(degrees: number, isVertical: boolean): number {
  const maxDegrees = isVertical ? 30 : 170;
  const maxValue = isVertical ? 0x04B0 : 0x0E10;
  const centerValue = isVertical ? 0x0000 : 0x0000;
  
  const normalizedDegrees = Math.max(-maxDegrees, Math.min(maxDegrees, degrees));
  const ratio = normalizedDegrees / maxDegrees;
  
  if (ratio >= 0) {
    return Math.round(centerValue + (ratio * maxValue));
  } else {
    return Math.round(centerValue + (ratio * maxValue) + 0x10000) & 0xFFFF;
  }
}

export function getPositionLabel(index: number, columns: number = 3): string {
  const row = Math.floor(index / columns);
  const col = index % columns;
  
  const colLabels = ["Left", "Center", "Right"];
  const rowLabels = ["Top", "Middle", "Bottom"];
  
  return `${rowLabels[row] || "Row" + row}-${colLabels[col] || "Col" + col}`;
}

export function getRelativeLocationFromBox(box: BoundingBox): RelativeLocation {
  const centerX = (box.x_min + box.x_max) / 2;
  const centerY = (box.y_min + box.y_max) / 2;
  
  const horizontal = centerX < 0.33 ? "left" : centerX > 0.66 ? "right" : "center";
  const vertical = centerY < 0.33 ? "top" : centerY > 0.66 ? "bottom" : "middle";
  
  return `${horizontal}-${vertical}` as RelativeLocation;
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

export async function getRoomScans(): Promise<RoomScan[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ROOM_SCANS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getRoomScan(id: string): Promise<RoomScan | null> {
  const scans = await getRoomScans();
  return scans.find(s => s.id === id) || null;
}

export async function saveRoomScan(scan: RoomScan): Promise<void> {
  const scans = await getRoomScans();
  const existingIndex = scans.findIndex(s => s.id === scan.id);
  
  if (existingIndex >= 0) {
    scans[existingIndex] = scan;
  } else {
    scans.unshift(scan);
  }
  
  const trimmed = scans.slice(0, 10);
  await AsyncStorage.setItem(STORAGE_KEYS.ROOM_SCANS, JSON.stringify(trimmed));
}

export async function deleteRoomScan(id: string): Promise<void> {
  const scans = await getRoomScans();
  const filtered = scans.filter(s => s.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.ROOM_SCANS, JSON.stringify(filtered));
}

export async function getActiveScan(): Promise<RoomScan | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SCAN);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setActiveScan(scan: RoomScan | null): Promise<void> {
  if (scan) {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SCAN, JSON.stringify(scan));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SCAN);
  }
}

export async function clearAllScans(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.ROOM_SCANS);
  await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SCAN);
}

// ============================================
// SCAN CREATION AND MANAGEMENT
// ============================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createInitialTimingData(): ScanTimingData {
  return {
    scanStartMs: Date.now(),
    scanEndMs: null,
    scanningPhaseStartMs: null,
    scanningPhaseEndMs: null,
    scanningPhaseDurationMs: null,
    analysisPhaseStartMs: null,
    analysisPhaseEndMs: null,
    analysisPhaseDurationMs: null,
    zoomPhaseStartMs: null,
    zoomPhaseEndMs: null,
    zoomPhaseDurationMs: null,
    totalDurationMs: null,
    positionTimings: [],
    analysisTimings: [],
    zoomRoundTimings: [],
    averagePositionMoveMs: null,
    averagePositionCaptureMs: null,
    averageAnalysisPerPositionMs: null,
    averageZoomRoundMs: null,
  };
}

export function calculateTimingAverages(timing: ScanTimingData): ScanTimingData {
  const positionMoves = timing.positionTimings.map(p => p.moveDurationMs).filter(d => d > 0);
  const positionCaptures = timing.positionTimings.map(p => p.captureDurationMs).filter(d => d > 0);
  const analysisPerPosition = timing.analysisTimings.map(a => a.durationMs).filter(d => d > 0);
  const zoomRounds = timing.zoomRoundTimings.map(z => z.totalDurationMs).filter(d => d > 0);
  
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  
  return {
    ...timing,
    averagePositionMoveMs: avg(positionMoves),
    averagePositionCaptureMs: avg(positionCaptures),
    averageAnalysisPerPositionMs: avg(analysisPerPosition),
    averageZoomRoundMs: avg(zoomRounds),
  };
}

export function createNewScan(
  cameraId: string,
  name: string,
  gridConfig: ScanGridConfig = DEFAULT_GRID_CONFIG,
  zoomRoundsConfig: ZoomRoundsConfig = DEFAULT_ZOOM_ROUNDS_CONFIG
): RoomScan {
  const positions = calculateGridPositions(gridConfig).map(pos => ({
    ...pos,
    id: generateId(),
  }));
  
  return {
    id: generateId(),
    cameraId,
    name,
    status: "idle",
    currentPositionIndex: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    gridConfig,
    zoomRoundsConfig,
    zoomRoundsCompleted: 0,
    positions,
    objects: [],
    summary: null,
    error: null,
    timing: createInitialTimingData(),
  };
}

export function updateScanPosition(
  scan: RoomScan,
  positionIndex: number,
  updates: Partial<ScanPosition>
): RoomScan {
  const newPositions = [...scan.positions];
  newPositions[positionIndex] = {
    ...newPositions[positionIndex],
    ...updates,
  };
  
  return {
    ...scan,
    positions: newPositions,
  };
}

export function addObjectToScan(
  scan: RoomScan,
  object: Omit<DetectedObject, "id" | "scanId" | "detectedAt">
): RoomScan {
  const newObject: DetectedObject = {
    ...object,
    id: generateId(),
    scanId: scan.id,
    detectedAt: new Date().toISOString(),
  };
  
  const positionIndex = scan.positions.findIndex(p => p.id === object.positionId);
  let newPositions = scan.positions;
  
  if (positionIndex >= 0) {
    newPositions = [...scan.positions];
    newPositions[positionIndex] = {
      ...newPositions[positionIndex],
      objectIds: [...newPositions[positionIndex].objectIds, newObject.id],
    };
  }
  
  return {
    ...scan,
    positions: newPositions,
    objects: [...scan.objects, newObject],
  };
}

export function updateObjectInScan(
  scan: RoomScan,
  objectId: string,
  updates: Partial<DetectedObject>
): RoomScan {
  return {
    ...scan,
    objects: scan.objects.map(obj =>
      obj.id === objectId ? { ...obj, ...updates } : obj
    ),
  };
}

export function toggleObjectStarred(
  scan: RoomScan,
  objectId: string
): RoomScan {
  return {
    ...scan,
    objects: scan.objects.map(obj =>
      obj.id === objectId ? { ...obj, starred: !obj.starred } : obj
    ),
  };
}

export function getStarredObjects(scan: RoomScan): DetectedObject[] {
  return scan.objects
    .filter(obj => obj.starred)
    .sort((a, b) => b.importance - a.importance);
}

export function getObjectsSortedByPriority(scan: RoomScan): DetectedObject[] {
  return [...scan.objects].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return b.importance - a.importance;
  });
}

// ============================================
// OBJECT FILTERING AND SEARCH
// ============================================

export function findObjectsByCategory(
  scan: RoomScan,
  category: ObjectCategory
): DetectedObject[] {
  return scan.objects.filter(obj => obj.category === category);
}

export function findObjectsByName(
  scan: RoomScan,
  searchTerm: string
): DetectedObject[] {
  const lowerSearch = searchTerm.toLowerCase();
  return scan.objects.filter(obj => 
    obj.name.toLowerCase().includes(lowerSearch) ||
    (obj.description?.toLowerCase().includes(lowerSearch))
  );
}

export function getObjectsByImportance(
  scan: RoomScan,
  minImportance: number = 5
): DetectedObject[] {
  return scan.objects
    .filter(obj => obj.importance >= minImportance)
    .sort((a, b) => b.importance - a.importance);
}

export function getObjectsAtPosition(
  scan: RoomScan,
  positionId: string
): DetectedObject[] {
  return scan.objects.filter(obj => obj.positionId === positionId);
}

export function deduplicateObjects(objects: DetectedObject[]): DetectedObject[] {
  const seen = new Map<string, DetectedObject>();
  
  for (const obj of objects) {
    const normalizedName = normalizeObjectName(obj.name);
    const key = `${normalizedName}-${obj.category}`;
    const existing = seen.get(key);
    
    if (!existing) {
      seen.set(key, obj);
    } else {
      const existingScore = scoreObjectQuality(existing);
      const newScore = scoreObjectQuality(obj);
      
      if (newScore > existingScore) {
        console.log(`[Dedup] Replacing "${existing.name}" (score=${existingScore.toFixed(2)}) with "${obj.name}" (score=${newScore.toFixed(2)})`);
        seen.set(key, obj);
      }
    }
  }
  
  const deduped = Array.from(seen.values());
  
  const spatiallyDeduped = removeSpatialDuplicates(deduped);
  
  console.log(`[Dedup] ${objects.length} → ${spatiallyDeduped.length} objects after deduplication`);
  return spatiallyDeduped;
}

function normalizeObjectName(name: string): string {
  const lower = name.toLowerCase().trim();
  
  const synonyms: Record<string, string> = {
    "tv": "television",
    "television": "television",
    "flat screen": "television",
    "monitor": "monitor",
    "computer monitor": "monitor",
    "display": "monitor",
    "couch": "sofa",
    "sofa": "sofa",
    "settee": "sofa",
    "lamp": "lamp",
    "light": "lamp",
    "table lamp": "lamp",
    "floor lamp": "lamp",
    "desk": "desk",
    "work desk": "desk",
    "writing desk": "desk",
    "table": "table",
    "coffee table": "table",
    "dining table": "table",
  };
  
  for (const [pattern, normalized] of Object.entries(synonyms)) {
    if (lower.includes(pattern)) {
      return normalized;
    }
  }
  
  return lower.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function scoreObjectQuality(obj: DetectedObject): number {
  let score = obj.confidence;
  
  if (obj.boundingBox) {
    const boxWidth = obj.boundingBox.x_max - obj.boundingBox.x_min;
    const boxHeight = obj.boundingBox.y_max - obj.boundingBox.y_min;
    const boxArea = boxWidth * boxHeight;
    
    if (boxArea >= 0.02 && boxArea <= 0.25) {
      score += 0.2;
    }
    
    const hasRealBox = 
      obj.boundingBox.x_min % 0.25 !== 0 || 
      obj.boundingBox.y_min % 0.25 !== 0;
    if (hasRealBox) {
      score += 0.3;
    }
  }
  
  return score;
}

function removeSpatialDuplicates(objects: DetectedObject[]): DetectedObject[] {
  const result: DetectedObject[] = [];
  
  for (const obj of objects) {
    if (!obj.boundingBox) {
      result.push(obj);
      continue;
    }
    
    let isDuplicate = false;
    
    for (const existing of result) {
      if (!existing.boundingBox) continue;
      if (existing.positionId !== obj.positionId) continue;
      
      const iou = calculateIoU(obj.boundingBox, existing.boundingBox);
      if (iou > 0.5) {
        if (scoreObjectQuality(obj) > scoreObjectQuality(existing)) {
          const idx = result.indexOf(existing);
          result[idx] = obj;
          console.log(`[Dedup] Spatial overlap: replaced "${existing.name}" with "${obj.name}" (IoU=${iou.toFixed(2)})`);
        }
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      result.push(obj);
    }
  }
  
  return result;
}

function calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
  const xOverlap = Math.max(0, Math.min(box1.x_max, box2.x_max) - Math.max(box1.x_min, box2.x_min));
  const yOverlap = Math.max(0, Math.min(box1.y_max, box2.y_max) - Math.max(box1.y_min, box2.y_min));
  const intersection = xOverlap * yOverlap;
  
  const area1 = (box1.x_max - box1.x_min) * (box1.y_max - box1.y_min);
  const area2 = (box2.x_max - box2.x_min) * (box2.y_max - box2.y_min);
  const union = area1 + area2 - intersection;
  
  return union > 0 ? intersection / union : 0;
}

// ============================================
// CATEGORY UTILITIES
// ============================================

export const CATEGORY_INFO: Record<ObjectCategory, { label: string; icon: string; color: string }> = {
  person: { label: "Person", icon: "user", color: "#FF6B6B" },
  furniture: { label: "Furniture", icon: "square", color: "#4ECDC4" },
  electronics: { label: "Electronics", icon: "monitor", color: "#45B7D1" },
  decor: { label: "Decor", icon: "image", color: "#96CEB4" },
  plant: { label: "Plant", icon: "feather", color: "#88D8B0" },
  door: { label: "Door", icon: "log-out", color: "#DDA0DD" },
  window: { label: "Window", icon: "square", color: "#87CEEB" },
  appliance: { label: "Appliance", icon: "box", color: "#FFB347" },
  storage: { label: "Storage", icon: "archive", color: "#B19CD9" },
  lighting: { label: "Lighting", icon: "sun", color: "#FFD700" },
  other: { label: "Other", icon: "help-circle", color: "#C0C0C0" },
};

export function categorizeObject(name: string): ObjectCategory {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes("person") || lowerName.includes("people") || lowerName.includes("man") || lowerName.includes("woman")) {
    return "person";
  }
  if (lowerName.includes("couch") || lowerName.includes("sofa") || lowerName.includes("chair") || lowerName.includes("table") || lowerName.includes("desk") || lowerName.includes("bed")) {
    return "furniture";
  }
  if (lowerName.includes("tv") || lowerName.includes("monitor") || lowerName.includes("computer") || lowerName.includes("phone") || lowerName.includes("laptop") || lowerName.includes("screen")) {
    return "electronics";
  }
  if (lowerName.includes("plant") || lowerName.includes("flower") || lowerName.includes("tree")) {
    return "plant";
  }
  if (lowerName.includes("door")) {
    return "door";
  }
  if (lowerName.includes("window")) {
    return "window";
  }
  if (lowerName.includes("lamp") || lowerName.includes("light") || lowerName.includes("chandelier")) {
    return "lighting";
  }
  if (lowerName.includes("fridge") || lowerName.includes("microwave") || lowerName.includes("oven") || lowerName.includes("washer") || lowerName.includes("dryer")) {
    return "appliance";
  }
  if (lowerName.includes("shelf") || lowerName.includes("cabinet") || lowerName.includes("drawer") || lowerName.includes("closet")) {
    return "storage";
  }
  if (lowerName.includes("picture") || lowerName.includes("painting") || lowerName.includes("art") || lowerName.includes("vase") || lowerName.includes("sculpture")) {
    return "decor";
  }
  
  return "other";
}

// ============================================
// SCAN PROGRESS UTILITIES
// ============================================

export function getScanProgress(scan: RoomScan): {
  total: number;
  captured: number;
  analyzed: number;
  percentComplete: number;
} {
  const total = scan.positions.length;
  const captured = scan.positions.filter(p => 
    p.status === "captured" || p.status === "analyzing" || p.status === "analyzed"
  ).length;
  const analyzed = scan.positions.filter(p => p.status === "analyzed").length;
  
  let percentComplete = 0;
  if (scan.status === "scanning") {
    percentComplete = (captured / total) * 50;
  } else if (scan.status === "analyzing") {
    percentComplete = 50 + (analyzed / total) * 50;
  } else if (scan.status === "completed") {
    percentComplete = 100;
  }
  
  return { total, captured, analyzed, percentComplete: Math.round(percentComplete) };
}

export function getNextPendingPosition(scan: RoomScan): ScanPosition | null {
  return scan.positions.find(p => p.status === "pending") || null;
}

export function allPositionsCaptured(scan: RoomScan): boolean {
  return scan.positions.every(p => 
    p.status === "captured" || p.status === "analyzing" || p.status === "analyzed"
  );
}

export function allPositionsAnalyzed(scan: RoomScan): boolean {
  return scan.positions.every(p => p.status === "analyzed");
}
