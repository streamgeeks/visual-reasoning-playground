import { describeScene, detectObject, MoondreamDetectionResult } from "@/lib/moondream";
import {
  RoomScan,
  ScanPosition,
  DetectedObject,
  ObjectCategory,
  ObjectImage,
  RelativeLocation,
  BoundingBox,
  ZoomRoundsConfig,
  AnalysisTiming,
  ZoomRoundTiming,
  ScanTimingData,
  addObjectToScan,
  updateScanPosition,
  categorizeObject,
  getRelativeLocationFromBox,
  generateId,
  deduplicateObjects,
  getNextAvailablePresetSlot,
  getUsedPresetSlots,
} from "@/lib/huntAndFind";
import { CameraProfile } from "@/lib/storage";
import {
  recallPresetFromCamera,
  savePresetToCamera,
  fetchCameraFrame,
  sendZoomViscaCommand,
  sendPtzViscaCommand,
} from "@/lib/camera";
import {
  calculatePtzDirection,
  getPtzDirectionFromPanTilt,
} from "@/lib/trackingService";
import * as VisionTracking from "vision-tracking";
import { detectAllObjects, NativeDetectionResult, checkNativeDetectionStatus } from "@/lib/nativeDetection";

// Detection mode for Hunt & Find
export type DetectionMode = "moondream" | "yolo";

// COCO class names that YOLO can detect (80 classes)
export const YOLO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
  "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
  "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
  "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
  "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
  "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
  "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
  "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush"
];

// Map YOLO labels to our object categories
function yoloLabelToCategory(label: string): ObjectCategory {
  const labelLower = label.toLowerCase();
  
  // Person
  if (labelLower === "person") return "person";
  
  // Electronics
  if (["tv", "laptop", "mouse", "remote", "keyboard", "cell phone"].includes(labelLower)) {
    return "electronics";
  }
  
  // Furniture
  if (["chair", "couch", "bed", "dining table", "bench"].includes(labelLower)) {
    return "furniture";
  }
  
  // Appliances
  if (["microwave", "oven", "toaster", "sink", "refrigerator"].includes(labelLower)) {
    return "appliance";
  }
  
  // Plants
  if (labelLower === "potted plant") return "plant";
  
  // Lighting (YOLO doesn't have lamps, so clock/vase might be closest to decor)
  if (["clock", "vase"].includes(labelLower)) return "decor";
  
  // Storage (books can indicate shelves)
  if (labelLower === "book") return "storage";
  
  // Animals as "other" - they're detected but not room objects
  if (["bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "teddy bear"].includes(labelLower)) {
    return "other";
  }
  
  // Kitchen/food items
  if (["bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
       "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake"].includes(labelLower)) {
    return "other";
  }
  
  // Vehicles (usually not indoor, but just in case)
  if (["bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat"].includes(labelLower)) {
    return "other";
  }
  
  return "other";
}

const OBJECT_DETECTION_PROMPT = `Analyze this room image carefully. List ALL distinct objects you can see.

For EACH object, provide in this EXACT format (one object per line):
OBJECT: [name] | CATEGORY: [category] | LOCATION: [location] | SIZE: [size]

Categories: person, furniture, electronics, decor, plant, door, window, appliance, storage, lighting, other
Locations: left-top, center-top, right-top, left-middle, center-middle, right-middle, left-bottom, center-bottom, right-bottom
Sizes: small, medium, large

Be thorough - include furniture, electronics, decorations, plants, doors, windows, wall art, rugs, lamps.
List at least 5-15 objects if visible. Do not describe the scene, just list objects.`;

interface ParsedObject {
  name: string;
  category: string;
  location: string;
  size: string;
}

function parseObjectLine(line: string): ParsedObject | null {
  const objectMatch = line.match(/OBJECT:\s*([^|]+)/i);
  const categoryMatch = line.match(/CATEGORY:\s*([^|]+)/i);
  const locationMatch = line.match(/LOCATION:\s*([^|]+)/i);
  const sizeMatch = line.match(/SIZE:\s*([^|]+)/i);
  
  if (!objectMatch) return null;
  
  return {
    name: objectMatch[1].trim(),
    category: categoryMatch?.[1]?.trim().toLowerCase() || "other",
    location: locationMatch?.[1]?.trim().toLowerCase() || "center-middle",
    size: sizeMatch?.[1]?.trim().toLowerCase() || "medium",
  };
}

function parseObjectDetectionResponse(response: string): ParsedObject[] {
  const lines = response.split("\n").filter(line => line.trim());
  const objects: ParsedObject[] = [];
  
  for (const line of lines) {
    if (line.includes("OBJECT:") || line.includes("object:")) {
      const parsed = parseObjectLine(line);
      if (parsed) {
        objects.push(parsed);
      }
    }
  }
  
  if (objects.length === 0) {
    const simpleLines = lines.filter(line => 
      line.trim().length > 2 && 
      !line.toLowerCase().includes("image") &&
      !line.toLowerCase().includes("scene") &&
      !line.toLowerCase().includes("room")
    );
    
    for (const line of simpleLines.slice(0, 15)) {
      const cleanName = line.replace(/^[-•*\d.)\s]+/, "").trim();
      if (cleanName.length > 1 && cleanName.length < 50) {
        objects.push({
          name: cleanName,
          category: "other",
          location: "center-middle",
          size: "medium",
        });
      }
    }
  }
  
  return objects;
}

function normalizeLocation(location: string): RelativeLocation {
  const loc = location.toLowerCase().replace(/\s+/g, "-");
  const validLocations: RelativeLocation[] = [
    "left-top", "center-top", "right-top",
    "left-middle", "center-middle", "right-middle",
    "left-bottom", "center-bottom", "right-bottom",
  ];
  
  if (validLocations.includes(loc as RelativeLocation)) {
    return loc as RelativeLocation;
  }
  
  if (loc.includes("left") && loc.includes("top")) return "left-top";
  if (loc.includes("right") && loc.includes("top")) return "right-top";
  if (loc.includes("left") && loc.includes("bottom")) return "left-bottom";
  if (loc.includes("right") && loc.includes("bottom")) return "right-bottom";
  if (loc.includes("left")) return "left-middle";
  if (loc.includes("right")) return "right-middle";
  if (loc.includes("top")) return "center-top";
  if (loc.includes("bottom")) return "center-bottom";
  
  return "center-middle";
}

function normalizeCategory(category: string): ObjectCategory {
  const cat = category.toLowerCase();
  const validCategories: ObjectCategory[] = [
    "person", "furniture", "electronics", "decor", "plant",
    "door", "window", "appliance", "storage", "lighting", "other",
  ];
  
  if (validCategories.includes(cat as ObjectCategory)) {
    return cat as ObjectCategory;
  }
  
  return categorizeObject(category);
}

function estimateBoundingBox(location: RelativeLocation, size: string): BoundingBox {
  const sizeMultiplier = size === "large" ? 0.4 : size === "small" ? 0.15 : 0.25;
  
  const [horizontal, vertical] = location.split("-");
  
  let centerX = 0.5;
  let centerY = 0.5;
  
  if (horizontal === "left") centerX = 0.25;
  else if (horizontal === "right") centerX = 0.75;
  
  if (vertical === "top") centerY = 0.25;
  else if (vertical === "bottom") centerY = 0.75;
  
  const halfWidth = sizeMultiplier / 2;
  const halfHeight = sizeMultiplier / 2;
  
  return {
    x_min: Math.max(0, centerX - halfWidth),
    y_min: Math.max(0, centerY - halfHeight),
    x_max: Math.min(1, centerX + halfWidth),
    y_max: Math.min(1, centerY + halfHeight),
  };
}

export async function analyzePositionImage(
  imageBase64: string,
  apiKey: string,
  position: ScanPosition
): Promise<Omit<DetectedObject, "id" | "scanId" | "detectedAt">[]> {
  const result = await describeScene(imageBase64, apiKey, OBJECT_DETECTION_PROMPT);
  
  if (result.error) {
    console.error("[ScanAnalysis] Detection failed:", result.error);
    return [];
  }
  
  console.log("[ScanAnalysis] Raw response:", result.description);
  
  const parsedObjects = parseObjectDetectionResponse(result.description);
  console.log(`[ScanAnalysis] Parsed ${parsedObjects.length} objects from description`);
  
  const detectedObjects: Omit<DetectedObject, "id" | "scanId" | "detectedAt">[] = [];
  
  for (const obj of parsedObjects) {
    const location = normalizeLocation(obj.location);
    const category = normalizeCategory(obj.category);
    
    let boundingBox: BoundingBox | null = null;
    let confidence = 0.5;
    let detectionMethod = "estimated";
    
    const detection = await detectObject(imageBase64, apiKey, obj.name);
    
    if (detection.found && detection.box) {
      boundingBox = detection.box;
      confidence = detection.confidence || 0.8;
      detectionMethod = "moondream";
      
      const boxWidth = (detection.box.x_max - detection.box.x_min) * 100;
      const boxHeight = (detection.box.y_max - detection.box.y_min) * 100;
      console.log(`[ScanAnalysis] "${obj.name}" DETECTED: box=(${detection.box.x_min.toFixed(3)},${detection.box.y_min.toFixed(3)})-(${detection.box.x_max.toFixed(3)},${detection.box.y_max.toFixed(3)}) size=${boxWidth.toFixed(1)}%x${boxHeight.toFixed(1)}% conf=${confidence.toFixed(2)}`);
    } else {
      boundingBox = estimateBoundingBox(location, obj.size);
      confidence = 0.3;
      console.log(`[ScanAnalysis] "${obj.name}" not detected by Moondream, using estimated box (conf=0.3)`);
    }
    
    detectedObjects.push({
      positionId: position.id,
      presetSlot: position.presetSlot,
      images: [],
      zoomRoundCompleted: false,
      starred: false,
      name: obj.name,
      category,
      description: detectionMethod === "moondream" ? "Verified detection" : "Estimated location",
      confidence,
      boundingBox,
      relativeLocation: boundingBox ? getRelativeLocationFromBox(boundingBox) : location,
      importance: 5,
      importanceReason: null,
      thumbnailUri: null,
    });
  }
  
  console.log(`[ScanAnalysis] Position complete: ${detectedObjects.filter(o => o.confidence >= 0.5).length}/${detectedObjects.length} objects with real detection`);
  
  return detectedObjects;
}

export async function analyzePositionImageYOLO(
  imageBase64: string,
  position: ScanPosition
): Promise<Omit<DetectedObject, "id" | "scanId" | "detectedAt">[]> {
  const status = await checkNativeDetectionStatus();
  if (!status.yoloLoaded) {
    console.error("[ScanAnalysis/YOLO] YOLO model not loaded");
    return [];
  }

  try {
    const detections = await detectAllObjects(imageBase64);
    console.log(`[ScanAnalysis/YOLO] Detected ${detections.length} objects`);

    const detectedObjects: Omit<DetectedObject, "id" | "scanId" | "detectedAt">[] = [];

    for (const det of detections) {
      const boundingBox: BoundingBox = {
        x_min: det.boundingBox.x,
        y_min: det.boundingBox.y,
        x_max: det.boundingBox.x + det.boundingBox.width,
        y_max: det.boundingBox.y + det.boundingBox.height,
      };

      const category = yoloLabelToCategory(det.label);
      const relativeLocation = getRelativeLocationFromBox(boundingBox);

      const boxWidth = det.boundingBox.width * 100;
      const boxHeight = det.boundingBox.height * 100;
      console.log(`[ScanAnalysis/YOLO] "${det.label}" conf=${det.confidence.toFixed(2)} box=${boxWidth.toFixed(1)}%x${boxHeight.toFixed(1)}%`);

      detectedObjects.push({
        positionId: position.id,
        presetSlot: position.presetSlot,
        images: [],
        zoomRoundCompleted: false,
        starred: false,
        name: det.label,
        category,
        description: "On-device YOLO detection",
        confidence: det.confidence,
        boundingBox,
        relativeLocation,
        importance: 5,
        importanceReason: null,
        thumbnailUri: null,
      });
    }

    console.log(`[ScanAnalysis/YOLO] Position complete: ${detectedObjects.length} objects detected`);
    return detectedObjects;
  } catch (err) {
    console.error("[ScanAnalysis/YOLO] Detection failed:", err);
    return [];
  }
}

export async function isYOLOAvailable(): Promise<boolean> {
  const status = await checkNativeDetectionStatus();
  return status.yoloLoaded;
}

export type CustomRanker = (objects: Array<{
  id: string;
  name: string;
  category: string;
  relativeLocation: string;
}>) => Promise<Array<{ id: string; importance: number; reason: string }>>;

export async function rankObjectImportance(
  objects: DetectedObject[],
  _apiKey: string,
  customRanker?: CustomRanker
): Promise<DetectedObject[]> {
  if (objects.length === 0) return objects;
  
  if (customRanker) {
    console.log(`[ScanAnalysis] Ranking ${objects.length} objects using custom ranker (Local LLM)`);
    try {
      const objectsForRanking = objects.map(o => ({
        id: o.id,
        name: o.name,
        category: o.category,
        relativeLocation: o.relativeLocation,
      }));
      
      const rankings = await customRanker(objectsForRanking);
      const rankingMap = new Map(rankings.map(r => [r.id, r]));
      
      return objects.map(obj => {
        const ranking = rankingMap.get(obj.id);
        let importance = ranking?.importance ?? 5;
        let reason = ranking?.reason ?? null;
        
        const qualityResult = applyDetectionQualityModifiers(obj, importance, reason);
        return {
          ...obj,
          importance: qualityResult.importance,
          importanceReason: qualityResult.reason,
        };
      });
    } catch (err) {
      console.error("[ScanAnalysis] Custom ranker failed, falling back to heuristics:", err);
    }
  }
  
  const IMPORTANCE_BY_CATEGORY: Record<ObjectCategory, number> = {
    person: 10,
    electronics: 8,
    door: 7,
    window: 6,
    appliance: 6,
    furniture: 5,
    storage: 4,
    lighting: 4,
    plant: 3,
    decor: 3,
    other: 2,
  };

  const IMPORTANCE_KEYWORDS: Array<{ keywords: string[]; boost: number; reason: string }> = [
    { keywords: ["tv", "television", "monitor", "screen", "computer"], boost: 2, reason: "Interactive display" },
    { keywords: ["whiteboard", "presentation", "projector"], boost: 3, reason: "Presentation area" },
    { keywords: ["entrance", "exit", "main door", "front door"], boost: 2, reason: "Entry point" },
    { keywords: ["desk", "workstation", "office"], boost: 1, reason: "Work area" },
    { keywords: ["couch", "sofa", "seating"], boost: 1, reason: "Main seating" },
    { keywords: ["camera", "security"], boost: 2, reason: "Security device" },
    { keywords: ["speaker", "microphone", "audio"], boost: 1, reason: "Audio equipment" },
  ];
  
  console.log(`[ScanAnalysis] Ranking ${objects.length} objects using enhanced heuristics`);
  
  const ranked = objects.map(obj => {
    let importance = IMPORTANCE_BY_CATEGORY[obj.category] || 5;
    let reason: string | null = null;
    
    const lowerName = obj.name.toLowerCase();
    
    for (const rule of IMPORTANCE_KEYWORDS) {
      if (rule.keywords.some(kw => lowerName.includes(kw))) {
        importance = Math.min(10, importance + rule.boost);
        reason = rule.reason;
        break;
      }
    }
    
    const qualityResult = applyDetectionQualityModifiers(obj, importance, reason);
    
    return {
      ...obj,
      importance: qualityResult.importance,
      importanceReason: qualityResult.reason,
    };
  });
  
  const verifiedCount = ranked.filter(o => o.confidence >= 0.5).length;
  const highPriorityCount = ranked.filter(o => o.importance >= 7).length;
  console.log(`[ScanAnalysis] Ranking complete: ${verifiedCount}/${ranked.length} verified, ${highPriorityCount} high priority`);
  
  return ranked;
}

function applyDetectionQualityModifiers(
  obj: DetectedObject,
  baseImportance: number,
  baseReason: string | null
): { importance: number; reason: string | null } {
  let importance = baseImportance;
  let reason = baseReason;
  
  if (obj.confidence >= 0.7) {
    importance = Math.min(10, importance + 1);
    reason = reason ? `${reason} (verified)` : "High-confidence detection";
  } else if (obj.confidence < 0.5) {
    importance = Math.max(1, importance - 2);
    reason = reason ? `${reason} (unverified)` : "Low-confidence - may not be trackable";
  }
  
  if (obj.boundingBox) {
    const boxWidth = obj.boundingBox.x_max - obj.boundingBox.x_min;
    const boxHeight = obj.boundingBox.y_max - obj.boundingBox.y_min;
    const boxArea = boxWidth * boxHeight;
    
    if (boxArea < 0.01) {
      importance = Math.max(1, importance - 2);
      reason = reason ? `${reason} (too small)` : "Too small to track reliably";
    } else if (boxArea > 0.5) {
      importance = Math.max(1, importance - 1);
      reason = reason ? `${reason} (very large)` : "Very large object - may be background";
    } else if (boxArea >= 0.02 && boxArea <= 0.15) {
      importance = Math.min(10, importance + 1);
    }
  }
  
  return { importance, reason };
}

export async function generateRoomSummary(
  objects: DetectedObject[],
  _apiKey: string
): Promise<string> {
  if (objects.length === 0) {
    return "No objects detected in the room scan.";
  }
  
  const topObjects = [...objects]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);
  
  const categoryCounts: Partial<Record<ObjectCategory, number>> = {};
  for (const obj of objects) {
    categoryCounts[obj.category] = (categoryCounts[obj.category] || 0) + 1;
  }
  
  const highPriority = topObjects.filter(o => o.importance >= 8);
  const mediumPriority = topObjects.filter(o => o.importance >= 5 && o.importance < 8);
  
  let summary = `Scanned ${objects.length} objects. `;
  
  if (highPriority.length > 0) {
    summary += `Key items: ${highPriority.slice(0, 3).map(o => o.name).join(", ")}. `;
  }
  
  const mainCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${count} ${cat}${count > 1 ? "s" : ""}`);
  
  if (mainCategories.length > 0) {
    summary += `Contains ${mainCategories.join(", ")}.`;
  }
  
  return summary;
}

export async function analyzeFullScan(
  scan: RoomScan,
  apiKey: string,
  onProgress?: (positionIndex: number, total: number) => void,
  customRanker?: CustomRanker,
  detectionMode: DetectionMode = "moondream"
): Promise<RoomScan> {
  let updatedScan = { ...scan };
  const allObjects: DetectedObject[] = [];
  const analysisTimings: AnalysisTiming[] = [];
  
  const modeLabel = detectionMode === "yolo" ? "YOLO" : "Moondream";
  console.log(`[ScanAnalysis] Using ${modeLabel} detection mode`);
  
  for (let i = 0; i < scan.positions.length; i++) {
    const position = scan.positions[i];
    
    if (!position.imageUri) {
      console.log(`[ScanAnalysis] Skipping position ${i} - no image`);
      continue;
    }
    
    if (position.status === "analyzed") {
      console.log(`[ScanAnalysis] Skipping position ${i} - already analyzed`);
      const existingObjects = scan.objects.filter(o => o.positionId === position.id);
      allObjects.push(...existingObjects);
      continue;
    }
    
    onProgress?.(i, scan.positions.length);
    console.log(`[ScanAnalysis] Analyzing position ${i + 1}/${scan.positions.length} with ${modeLabel}`);
    
    const analysisStartMs = Date.now();
    let objectsDetected = 0;
    
    try {
      let imageBase64 = position.imageUri;
      if (imageBase64.startsWith("data:")) {
        imageBase64 = imageBase64.split(",")[1];
      }
      
      const detectedObjects = detectionMode === "yolo"
        ? await analyzePositionImageYOLO(imageBase64, position)
        : await analyzePositionImage(imageBase64, apiKey, position);
      objectsDetected = detectedObjects.length;
      
      for (const obj of detectedObjects) {
        updatedScan = addObjectToScan(updatedScan, obj);
        const addedObject = updatedScan.objects[updatedScan.objects.length - 1];
        allObjects.push(addedObject);
      }
      
      updatedScan = updateScanPosition(updatedScan, i, { status: "analyzed" });
      
      const delayMs = detectionMode === "yolo" ? 100 : 500;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
    } catch (err) {
      console.error(`[ScanAnalysis] Error analyzing position ${i}:`, err);
    }
    
    const analysisEndMs = Date.now();
    analysisTimings.push({
      positionIndex: i,
      startMs: analysisStartMs,
      endMs: analysisEndMs,
      durationMs: analysisEndMs - analysisStartMs,
      objectsDetected,
    });
  }
  
  console.log(`[ScanAnalysis] Total objects before dedup: ${allObjects.length}`);
  const uniqueObjects = deduplicateObjects(allObjects);
  console.log(`[ScanAnalysis] Unique objects after dedup: ${uniqueObjects.length}`);
  
  console.log("[ScanAnalysis] Ranking object importance...");
  const rankedObjects = await rankObjectImportance(uniqueObjects, apiKey, customRanker);
  
  console.log("[ScanAnalysis] Generating room summary...");
  const summary = await generateRoomSummary(rankedObjects, apiKey);
  
  const updatedTiming: ScanTimingData | null = updatedScan.timing ? {
    ...updatedScan.timing,
    analysisTimings: [...updatedScan.timing.analysisTimings, ...analysisTimings],
  } : null;
  
  updatedScan = {
    ...updatedScan,
    objects: rankedObjects,
    summary,
    status: "completed",
    completedAt: new Date().toISOString(),
    timing: updatedTiming,
  };
  
  return updatedScan;
}

export function getAnalysisProgress(scan: RoomScan): {
  total: number;
  analyzed: number;
  objectCount: number;
  percentComplete: number;
} {
  const total = scan.positions.filter(p => p.imageUri).length;
  const analyzed = scan.positions.filter(p => p.status === "analyzed").length;
  const objectCount = scan.objects.length;
  const percentComplete = total > 0 ? Math.round((analyzed / total) * 100) : 0;
  
  return { total, analyzed, objectCount, percentComplete };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const TRACKING_CONFIG = {
  tightDeadZone: 0.10,
  innerDeadZone: 0.04,
  looseDeadZone: 0.12,
  maxCenteringIterations: 30,
  centeredConfirmations: 2,
  moveDurationMs: 120,
  settleDurationMs: 250,
  zoomStepDurationMs: 300,
  zoomSpeed: 2,
  visionFrameDelayMs: 100,
  ptzNudgeSpeed: 6,
  ptzMinSpeed: 2,
  ptzFineTuneSpeed: 1,
  ptzSpeed: 10,
};

interface CenteringResult {
  success: boolean;
  box?: BoundingBox;
  iterations: number;
  finalFrame?: string;
}

async function getFrameAndDetect(
  camera: CameraProfile,
  apiKey: string,
  objectName: string
): Promise<{ frame: string; detection: MoondreamDetectionResult } | null> {
  const frame = await fetchCameraFrame(camera);
  if (!frame) return null;
  
  let imageBase64 = frame;
  if (imageBase64.startsWith("data:")) {
    imageBase64 = imageBase64.split(",")[1];
  }
  
  const detection = await detectObject(imageBase64, apiKey, objectName);
  return { frame, detection };
}

async function centerWithVisionTracking(
  camera: CameraProfile,
  trackingId: string,
  deadZone: number = TRACKING_CONFIG.tightDeadZone,
  onIteration?: (iteration: number, centered: boolean) => void
): Promise<CenteringResult> {
  let iterations = 0;
  let centeredCount = 0;
  let lastBox: BoundingBox | undefined;
  let lastFrame: string | undefined;
  let consecutiveLost = 0;
  
  console.log(`[VisionCentering] Starting with deadzone ${(deadZone * 100).toFixed(0)}%`);
  
  while (iterations < TRACKING_CONFIG.maxCenteringIterations) {
    iterations++;
    onIteration?.(iterations, false);
    
    const frame = await fetchCameraFrame(camera);
    if (!frame) {
      await delay(TRACKING_CONFIG.visionFrameDelayMs);
      continue;
    }
    
    let imageBase64 = frame;
    if (imageBase64.startsWith("data:")) {
      imageBase64 = imageBase64.split(",")[1];
    }
    
    const trackResult = await VisionTracking.updateTracking(trackingId, imageBase64);
    
    console.log(`[VisionCentering] Iter ${iterations}: trackResult=${trackResult ? `conf=${trackResult.confidence?.toFixed(2)} lost=${trackResult.isLost}` : 'NULL'}`);
    
    if (!trackResult || trackResult.isLost || trackResult.confidence < 0.3) {
      consecutiveLost++;
      console.log(`[VisionCentering] Track lost (${consecutiveLost}/3) - result=${trackResult ? `isLost=${trackResult.isLost} conf=${trackResult.confidence}` : 'null'}`);
      
      if (consecutiveLost >= 3) {
        console.log(`[VisionCentering] FAILED: Too many lost frames, aborting`);
        return { success: false, iterations };
      }
      await delay(TRACKING_CONFIG.visionFrameDelayMs);
      continue;
    }
    
    consecutiveLost = 0;
    lastFrame = frame;
    lastBox = {
      x_min: trackResult.x,
      y_min: trackResult.y,
      x_max: trackResult.x + trackResult.width,
      y_max: trackResult.y + trackResult.height,
    };
    
    const centerX = trackResult.x + trackResult.width / 2;
    const centerY = trackResult.y + trackResult.height / 2;
    const offsetX = Math.abs(centerX - 0.5);
    const offsetY = Math.abs(centerY - 0.5);
    const maxOffset = Math.max(offsetX, offsetY);
    
    console.log(`[VisionCentering] Object center: (${(centerX * 100).toFixed(1)}%, ${(centerY * 100).toFixed(1)}%) - frame center is (50%, 50%)`);
    
    const direction = calculatePtzDirection(centerX, centerY, TRACKING_CONFIG.innerDeadZone);
    
    if (direction.pan === null && direction.tilt === null) {
      centeredCount++;
      console.log(`[VisionCentering] In inner deadzone (${centeredCount}/${TRACKING_CONFIG.centeredConfirmations} confirmations needed) - offset=(${(offsetX * 100).toFixed(1)}%, ${(offsetY * 100).toFixed(1)}%)`);
      
      if (centeredCount >= TRACKING_CONFIG.centeredConfirmations) {
        console.log(`[VisionCentering] SUCCESS: Centered in ${iterations} iterations`);
        onIteration?.(iterations, true);
        return { success: true, box: lastBox, iterations, finalFrame: lastFrame };
      }
      await delay(TRACKING_CONFIG.visionFrameDelayMs);
      continue;
    }
    
    centeredCount = 0;
    
    const ptzDirection = getPtzDirectionFromPanTilt(direction.pan, direction.tilt);
    const isFineTuning = maxOffset <= deadZone && maxOffset > TRACKING_CONFIG.innerDeadZone;
    
    console.log(`[VisionCentering] Iter ${iterations}: offset=(${(offsetX * 100).toFixed(1)}%, ${(offsetY * 100).toFixed(1)}%) dir=(${direction.pan || 'none'}, ${direction.tilt || 'none'}) ptz=${ptzDirection || 'NONE'} fineTune=${isFineTuning}`);
    
    if (ptzDirection) {
      let scaledSpeed: number;
      let moveTime: number;
      
      if (isFineTuning) {
        scaledSpeed = TRACKING_CONFIG.ptzFineTuneSpeed;
        moveTime = 40;
      } else {
        const normalizedOffset = Math.min(1, (maxOffset - deadZone) / (0.4 - deadZone));
        scaledSpeed = Math.round(
          TRACKING_CONFIG.ptzMinSpeed + normalizedOffset * (TRACKING_CONFIG.ptzNudgeSpeed - TRACKING_CONFIG.ptzMinSpeed)
        );
        moveTime = Math.max(40, Math.min(180, normalizedOffset * 180));
      }
      
      console.log(`[VisionCentering] Sending VISCA: ${ptzDirection} @ speed ${scaledSpeed} for ${moveTime}ms ${isFineTuning ? '(fine-tuning)' : ''}`);
      const moveResult = await sendPtzViscaCommand(camera, ptzDirection, scaledSpeed, scaledSpeed);
      console.log(`[VisionCentering] PTZ move result: ${moveResult ? 'OK' : 'FAILED'}`);
      
      await delay(moveTime);
      
      const stopResult = await sendPtzViscaCommand(camera, "stop", scaledSpeed, scaledSpeed);
      console.log(`[VisionCentering] PTZ stop result: ${stopResult ? 'OK' : 'FAILED'}`);
      
      await delay(isFineTuning ? TRACKING_CONFIG.settleDurationMs / 2 : TRACKING_CONFIG.settleDurationMs);
    } else {
      console.log(`[VisionCentering] No PTZ direction (in deadzone but not confirmed yet)`);
    }
  }
  
  console.log(`[VisionCentering] Max iterations reached`);
  return { success: lastBox !== undefined, box: lastBox, iterations, finalFrame: lastFrame };
}

async function centerObjectHybrid(
  camera: CameraProfile,
  apiKey: string,
  objectName: string,
  existingBox?: BoundingBox,
  deadZone: number = TRACKING_CONFIG.tightDeadZone,
  onIteration?: (iteration: number, centered: boolean) => void
): Promise<CenteringResult> {
  console.log(`[HybridCentering] Starting for "${objectName}" deadzone=${(deadZone * 100).toFixed(0)}% existingBox=${existingBox ? 'YES' : 'NO'} camera=${camera.ipAddress}`);
  
  if (!VisionTracking.isVisionAvailable) {
    console.log(`[HybridCentering] Vision not available, falling back to Moondream`);
    return centerObjectPatient(camera, apiKey, objectName, deadZone, onIteration);
  }
  
  let trackingId: string | null = null;
  
  try {
    console.log(`[HybridCentering] Getting fresh detection from Moondream for "${objectName}"...`);
    const result = await getFrameAndDetect(camera, apiKey, objectName);
    
    let boxToUse: BoundingBox | undefined;
    
    if (result && result.detection.found && result.detection.box) {
      boxToUse = result.detection.box;
      const width = boxToUse.x_max - boxToUse.x_min;
      const height = boxToUse.y_max - boxToUse.y_min;
      console.log(`[HybridCentering] Moondream detected: x=${boxToUse.x_min.toFixed(3)} y=${boxToUse.y_min.toFixed(3)} w=${width.toFixed(3)} h=${height.toFixed(3)} conf=${result.detection.confidence?.toFixed(2)}`);
    } else if (existingBox) {
      boxToUse = existingBox;
      const width = boxToUse.x_max - boxToUse.x_min;
      const height = boxToUse.y_max - boxToUse.y_min;
      console.log(`[HybridCentering] Moondream missed, using fallback box: x=${boxToUse.x_min.toFixed(3)} y=${boxToUse.y_min.toFixed(3)} w=${width.toFixed(3)} h=${height.toFixed(3)}`);
    } else {
      console.log(`[HybridCentering] No detection and no fallback box for "${objectName}"`);
      return { success: false, iterations: 0 };
    }
    
    const width = boxToUse.x_max - boxToUse.x_min;
    const height = boxToUse.y_max - boxToUse.y_min;
    trackingId = VisionTracking.startTracking(boxToUse.x_min, boxToUse.y_min, width, height);
    console.log(`[HybridCentering] Handed off to Vision tracking with ID: ${trackingId}`);
    
    if (!trackingId) {
      console.log(`[HybridCentering] Failed to start Vision tracking, falling back to Moondream-only centering`);
      return centerObjectPatient(camera, apiKey, objectName, deadZone, onIteration);
    }
    
    const centerResult = await centerWithVisionTracking(camera, trackingId, deadZone, onIteration);
    
    VisionTracking.stopTracking(trackingId);
    
    return centerResult;
    
  } catch (err) {
    console.error(`[HybridCentering] Error:`, err);
    if (trackingId) {
      VisionTracking.stopTracking(trackingId);
    }
    return centerObjectPatient(camera, apiKey, objectName, deadZone, onIteration);
  }
}

async function centerObjectPatient(
  camera: CameraProfile,
  apiKey: string,
  objectName: string,
  deadZone: number = TRACKING_CONFIG.tightDeadZone,
  onIteration?: (iteration: number, centered: boolean) => void
): Promise<CenteringResult> {
  let iterations = 0;
  let centeredCount = 0;
  let lastBox: BoundingBox | undefined;
  let lastFrame: string | undefined;
  
  console.log(`[MoondreamCentering] Starting for "${objectName}" deadzone=${(deadZone * 100).toFixed(0)}% camera=${camera.ipAddress}`);
  
  while (iterations < TRACKING_CONFIG.maxCenteringIterations) {
    iterations++;
    onIteration?.(iterations, false);
    
    const result = await getFrameAndDetect(camera, apiKey, objectName);
    
    if (!result || !result.detection.found || !result.detection.box) {
      console.log(`[MoondreamCentering] Iter ${iterations}: Object NOT FOUND`);
      centeredCount = 0;
      if (iterations > 3) {
        console.log(`[MoondreamCentering] FAILED: Object not found after ${iterations} iterations`);
        return { success: false, iterations };
      }
      await delay(500);
      continue;
    }
    
    lastBox = result.detection.box;
    lastFrame = result.frame;
    
    const centerX = (lastBox.x_min + lastBox.x_max) / 2;
    const centerY = (lastBox.y_min + lastBox.y_max) / 2;
    const offsetX = Math.abs(centerX - 0.5);
    const offsetY = Math.abs(centerY - 0.5);
    const maxOffset = Math.max(offsetX, offsetY);
    
    console.log(`[MoondreamCentering] Iter ${iterations}: center=(${(centerX * 100).toFixed(1)}%, ${(centerY * 100).toFixed(1)}%) offset=(${(offsetX * 100).toFixed(1)}%, ${(offsetY * 100).toFixed(1)}%)`);
    
    const direction = calculatePtzDirection(centerX, centerY, TRACKING_CONFIG.innerDeadZone);
    
    if (direction.pan === null && direction.tilt === null) {
      centeredCount++;
      console.log(`[MoondreamCentering] In inner deadzone (${centeredCount}/${TRACKING_CONFIG.centeredConfirmations} confirmations)`);
      
      if (centeredCount >= TRACKING_CONFIG.centeredConfirmations) {
        console.log(`[MoondreamCentering] SUCCESS: Centered in ${iterations} iterations`);
        onIteration?.(iterations, true);
        return { success: true, box: lastBox, iterations, finalFrame: lastFrame };
      }
      await delay(300);
      continue;
    }
    
    centeredCount = 0;
    
    const ptzDirection = getPtzDirectionFromPanTilt(direction.pan, direction.tilt);
    const isFineTuning = maxOffset <= deadZone && maxOffset > TRACKING_CONFIG.innerDeadZone;
    
    console.log(`[MoondreamCentering] Iter ${iterations}: dir=(${direction.pan || 'none'}, ${direction.tilt || 'none'}) ptz=${ptzDirection || 'NONE'} fineTune=${isFineTuning}`);
    
    if (ptzDirection) {
      let scaledSpeed: number;
      let moveTime: number;
      
      if (isFineTuning) {
        scaledSpeed = TRACKING_CONFIG.ptzFineTuneSpeed;
        moveTime = 40;
      } else {
        const normalizedOffset = Math.min(1, (maxOffset - deadZone) / (0.4 - deadZone));
        scaledSpeed = Math.round(
          TRACKING_CONFIG.ptzMinSpeed + normalizedOffset * (TRACKING_CONFIG.ptzNudgeSpeed - TRACKING_CONFIG.ptzMinSpeed)
        );
        moveTime = Math.max(50, Math.min(200, normalizedOffset * 200));
      }
      
      console.log(`[MoondreamCentering] Sending VISCA: ${ptzDirection} @ speed ${scaledSpeed} for ${moveTime}ms ${isFineTuning ? '(fine-tuning)' : ''}`);
      
      const moveResult = await sendPtzViscaCommand(camera, ptzDirection, scaledSpeed, scaledSpeed);
      console.log(`[MoondreamCentering] PTZ move result: ${moveResult ? 'OK' : 'FAILED'}`);
      
      await delay(moveTime);
      
      const stopResult = await sendPtzViscaCommand(camera, "stop", scaledSpeed, scaledSpeed);
      console.log(`[MoondreamCentering] PTZ stop result: ${stopResult ? 'OK' : 'FAILED'}`);
      
      await delay(isFineTuning ? TRACKING_CONFIG.settleDurationMs / 2 : TRACKING_CONFIG.settleDurationMs);
    } else {
      console.log(`[MoondreamCentering] No PTZ direction generated`);
    }
  }
  
  console.log(`[MoondreamCentering] Max iterations (${TRACKING_CONFIG.maxCenteringIterations}) reached`);
  console.log(`[MoondreamCentering] Result: ${lastBox ? 'PARTIAL SUCCESS (has box)' : 'FAILED (no box)'}`);
  
  return { success: lastBox !== undefined, box: lastBox, iterations, finalFrame: lastFrame };
}

async function zoomStepWithCenter(
  camera: CameraProfile,
  apiKey: string,
  objectName: string,
  lastBox?: BoundingBox,
  zoomDurationMs: number = TRACKING_CONFIG.zoomStepDurationMs
): Promise<{ success: boolean; box?: BoundingBox }> {
  await sendZoomViscaCommand(camera, "in", TRACKING_CONFIG.zoomSpeed);
  await delay(zoomDurationMs);
  await sendZoomViscaCommand(camera, "stop");
  await delay(150);
  
  const centerResult = await centerObjectHybrid(
    camera,
    apiKey,
    objectName,
    lastBox,
    TRACKING_CONFIG.looseDeadZone
  );
  
  return { success: centerResult.success, box: centerResult.box };
}

export interface ZoomRoundsCallbacks {
  onStepProgress?: (objectIndex: number, totalObjects: number, step: number, objectName: string, description: string) => void;
  onZoomLevel?: (level: "medium" | "tight" | "close", objectName: string) => void;
  onCentering?: (objectName: string, iteration: number) => void;
  onObjectComplete?: (objectName: string) => void;
}

export async function runZoomRounds(
  scan: RoomScan,
  camera: CameraProfile,
  apiKey: string,
  callbacks?: ZoomRoundsCallbacks
): Promise<RoomScan> {
  const config = scan.zoomRoundsConfig;
  
  if (!config.enabled || config.topObjectCount === 0) {
    console.log("[ZoomRounds] Disabled or count is 0, skipping");
    return scan;
  }

  const topObjects = [...scan.objects]
    .sort((a, b) => b.importance - a.importance)
    .filter(obj => !obj.zoomRoundCompleted)
    .slice(0, config.topObjectCount);

  if (topObjects.length === 0) {
    console.log("[ZoomRounds] No objects to process");
    return scan;
  }

  console.log(`[ZoomRounds] Processing ${topObjects.length} objects`);
  let updatedScan: RoomScan = { ...scan, status: "zooming" };
  const usedSlots = getUsedPresetSlots(updatedScan);
  const zoomRoundTimings: ZoomRoundTiming[] = [];

  const zoomLevels: Array<{
    name: "medium" | "tight" | "close";
    target: number;
    zoomSpeed: number;
    zoomDuration: number;
  }> = [
    { name: "medium", target: config.mediumZoomTarget, zoomSpeed: 4, zoomDuration: 600 },
    { name: "tight", target: config.tightZoomTarget, zoomSpeed: 4, zoomDuration: 600 },
    { name: "close", target: config.closeZoomTarget, zoomSpeed: 3, zoomDuration: 500 },
  ];

  for (let i = 0; i < topObjects.length; i++) {
    const obj = topObjects[i];
    let stepInObject = 0;
    
    const reportStep = (description: string) => {
      callbacks?.onStepProgress?.(i, topObjects.length, stepInObject, obj.name, description);
      stepInObject++;
    };
    
    reportStep("Recalling position...");
    console.log(`[ZoomRounds] Processing object ${i + 1}/${topObjects.length}: ${obj.name}`);

    const roundStartMs = Date.now();
    let recallPresetMs = 0;
    let detectObjectMs = 0;
    let mediumZoomMs = 0;
    let tightZoomMs = 0;
    let closeZoomMs = 0;

    try {
      const recallStart = Date.now();
      await recallPresetFromCamera(camera, obj.presetSlot);
      await delay(400);
      recallPresetMs = Date.now() - recallStart;

      reportStep("Capturing wide frame...");
      const wideFrame = await fetchCameraFrame(camera);
      if (!wideFrame) {
        console.log(`[ZoomRounds] Failed to capture wide frame for ${obj.name}`);
        continue;
      }

      reportStep("Verifying object...");
      let imageBase64 = wideFrame;
      if (imageBase64.startsWith("data:")) {
        imageBase64 = imageBase64.split(",")[1];
      }
      
      const verifyDetection = await detectObject(imageBase64, apiKey, obj.name);
      
      let verifiedBox: BoundingBox | undefined;
      if (verifyDetection.found && verifyDetection.box) {
        verifiedBox = verifyDetection.box;
        console.log(`[ZoomRounds] "${obj.name}" VERIFIED: conf=${verifyDetection.confidence?.toFixed(2)} box=(${verifiedBox.x_min.toFixed(3)},${verifiedBox.y_min.toFixed(3)})`);
      } else {
        console.log(`[ZoomRounds] "${obj.name}" NOT DETECTED at preset position, skipping`);
        const roundEndMs = Date.now();
        zoomRoundTimings.push({
          objectName: obj.name,
          objectIndex: i,
          startMs: roundStartMs,
          endMs: roundEndMs,
          recallPresetMs,
          detectObjectMs: Date.now() - roundStartMs - recallPresetMs,
          mediumZoomMs: 0,
          tightZoomMs: 0,
          closeZoomMs: 0,
          totalDurationMs: roundEndMs - roundStartMs,
        });
        continue;
      }

      const wideImage: ObjectImage = {
        presetSlot: obj.presetSlot,
        imageUri: wideFrame,
        zoomLevel: "wide",
        boundingBox: verifiedBox,
        capturedAt: new Date().toISOString(),
      };

      const updatedImages: ObjectImage[] = [wideImage];

      reportStep("Initial centering...");
      const detectStart = Date.now();
      const centerResult = await centerObjectHybrid(
        camera, 
        apiKey, 
        obj.name, 
        verifiedBox,
        TRACKING_CONFIG.tightDeadZone,
        (iteration) => callbacks?.onCentering?.(obj.name, iteration)
      );
      detectObjectMs = Date.now() - detectStart;
      
      if (!centerResult.success) {
        console.log(`[ZoomRounds] Could not center ${obj.name}, skipping zoom rounds`);
        const updatedObj: DetectedObject = {
          ...obj,
          images: updatedImages,
          zoomRoundCompleted: true,
        };
        updatedScan = updateObjectInScan(updatedScan, updatedObj);
        
        const roundEndMs = Date.now();
        zoomRoundTimings.push({
          objectName: obj.name,
          objectIndex: i,
          startMs: roundStartMs,
          endMs: roundEndMs,
          recallPresetMs,
          detectObjectMs,
          mediumZoomMs: 0,
          tightZoomMs: 0,
          closeZoomMs: 0,
          totalDurationMs: roundEndMs - roundStartMs,
        });
        continue;
      }

      console.log(`[ZoomRounds] ${obj.name} centered, starting zoom sequence`);

      for (const level of zoomLevels) {
        reportStep(`Zooming ${level.name}...`);
        const levelStart = Date.now();
        callbacks?.onZoomLevel?.(level.name, obj.name);
        
        const result = await zoomAndCenterToTarget(
          camera,
          apiKey,
          obj.name,
          level.target,
          level.zoomSpeed,
          level.zoomDuration,
          usedSlots,
          level.name,
          (iteration) => callbacks?.onCentering?.(obj.name, iteration)
        );

        const levelDuration = Date.now() - levelStart;
        
        if (level.name === "medium") mediumZoomMs = levelDuration;
        else if (level.name === "tight") tightZoomMs = levelDuration;
        else if (level.name === "close") closeZoomMs = levelDuration;

        if (result) {
          reportStep(`Captured ${level.name}`);
          updatedImages.push(result.image);
          usedSlots.push(result.image.presetSlot);
          console.log(`[ZoomRounds] ${obj.name} ${level.name} zoom captured at slot ${result.image.presetSlot}`);
        } else {
          console.log(`[ZoomRounds] ${obj.name} ${level.name} zoom failed, stopping sequence`);
          break;
        }
      }

      const updatedObj: DetectedObject = {
        ...obj,
        images: updatedImages,
        zoomRoundCompleted: true,
      };

      updatedScan = updateObjectInScan(updatedScan, updatedObj);
      updatedScan = { ...updatedScan, zoomRoundsCompleted: i + 1 };
      
      callbacks?.onObjectComplete?.(obj.name);
      console.log(`[ZoomRounds] Completed ${obj.name} with ${updatedImages.length} images`);

      await sendZoomViscaCommand(camera, "out", 7);
      await delay(800);
      await sendZoomViscaCommand(camera, "stop");
      await delay(150);

      const roundEndMs = Date.now();
      zoomRoundTimings.push({
        objectName: obj.name,
        objectIndex: i,
        startMs: roundStartMs,
        endMs: roundEndMs,
        recallPresetMs,
        detectObjectMs,
        mediumZoomMs,
        tightZoomMs,
        closeZoomMs,
        totalDurationMs: roundEndMs - roundStartMs,
      });

    } catch (err) {
      console.error(`[ZoomRounds] Error processing ${obj.name}:`, err);
      
      const roundEndMs = Date.now();
      zoomRoundTimings.push({
        objectName: obj.name,
        objectIndex: i,
        startMs: roundStartMs,
        endMs: roundEndMs,
        recallPresetMs,
        detectObjectMs,
        mediumZoomMs,
        tightZoomMs,
        closeZoomMs,
        totalDurationMs: roundEndMs - roundStartMs,
      });
    }
  }

  const updatedTiming: ScanTimingData | null = updatedScan.timing ? {
    ...updatedScan.timing,
    zoomRoundTimings: [...updatedScan.timing.zoomRoundTimings, ...zoomRoundTimings],
  } : null;

  return {
    ...updatedScan,
    timing: updatedTiming,
  };
}

async function zoomAndCenterToTarget(
  camera: CameraProfile,
  apiKey: string,
  objectName: string,
  targetHeight: number,
  _zoomSpeed: number,
  _zoomDuration: number,
  usedSlots: number[],
  zoomLevel: "medium" | "tight" | "close",
  onCentering?: (iteration: number) => void
): Promise<{ image: ObjectImage } | null> {
  const maxZoomSteps = 8;
  let currentBoxHeight = 0;
  let lastBox: BoundingBox | undefined;

  console.log(`[ZoomRounds] Starting zoom to ${zoomLevel} (target: ${(targetHeight * 100).toFixed(0)}% box height)`);

  for (let step = 0; step < maxZoomSteps; step++) {
    const zoomResult = await zoomStepWithCenter(camera, apiKey, objectName, lastBox);
    
    if (!zoomResult.success || !zoomResult.box) {
      console.log(`[ZoomRounds] Lost ${objectName} during zoom step ${step + 1}`);
      if (step === 0) return null;
      break;
    }

    lastBox = zoomResult.box;
    currentBoxHeight = lastBox.y_max - lastBox.y_min;
    console.log(`[ZoomRounds] Step ${step + 1}: box height ${(currentBoxHeight * 100).toFixed(1)}% (target: ${(targetHeight * 100).toFixed(0)}%)`);

    if (currentBoxHeight >= targetHeight) {
      console.log(`[ZoomRounds] Target reached at step ${step + 1}`);
      break;
    }
  }

  console.log(`[ZoomRounds] Final centering before capture...`);
  const finalCenter = await centerObjectHybrid(
    camera,
    apiKey,
    objectName,
    lastBox,
    TRACKING_CONFIG.tightDeadZone,
    onCentering
  );

  if (!finalCenter.success) {
    console.log(`[ZoomRounds] Final centering failed for ${objectName}`);
    return null;
  }

  console.log(`[ZoomRounds] Settling after centering...`);
  await delay(300);

  const presetSlot = getNextAvailablePresetSlot(usedSlots);
  if (!presetSlot) {
    console.log("[ZoomRounds] No preset slots available");
    return null;
  }

  await savePresetToCamera(camera, presetSlot);
  console.log(`[ZoomRounds] Preset ${presetSlot} saved, waiting for camera to settle...`);
  await delay(400);

  const capturedFrame = await fetchCameraFrame(camera);
  if (!capturedFrame) return null;

  console.log(`[ZoomRounds] Captured fresh frame for ${zoomLevel} at preset ${presetSlot}`);

  return {
    image: {
      presetSlot,
      imageUri: capturedFrame,
      zoomLevel,
      boundingBox: finalCenter.box || lastBox || undefined,
      capturedAt: new Date().toISOString(),
    },
  };
}

function updateObjectInScan(scan: RoomScan, updatedObject: DetectedObject): RoomScan {
  return {
    ...scan,
    objects: scan.objects.map(obj =>
      obj.id === updatedObject.id ? updatedObject : obj
    ),
  };
}

export interface EnhanceCallbacks {
  onProgress?: (message: string) => void;
  onZoomLevel?: (level: string) => void;
}

export async function enhanceStarredObject(
  camera: CameraProfile,
  apiKey: string,
  scan: RoomScan,
  object: DetectedObject,
  callbacks?: EnhanceCallbacks
): Promise<RoomScan> {
  console.log(`[Enhance] Starting enhancement for ${object.name}`);
  callbacks?.onProgress?.(`Enhancing ${object.name}...`);

  await recallPresetFromCamera(camera, object.presetSlot);
  await delay(1000);
  callbacks?.onProgress?.("Recalled base position");

  const usedSlots = new Set<number>();
  scan.objects.forEach(o => {
    usedSlots.add(o.presetSlot);
    o.images?.forEach(img => usedSlots.add(img.presetSlot));
  });

  const wideFrame = await fetchCameraFrame(camera);
  if (!wideFrame) {
    console.log(`[Enhance] Failed to capture wide frame for ${object.name}`);
    return scan;
  }

  const wideImage: ObjectImage = {
    presetSlot: object.presetSlot,
    imageUri: wideFrame,
    zoomLevel: "wide",
    boundingBox: object.boundingBox || undefined,
    capturedAt: new Date().toISOString(),
  };

  const updatedImages: ObjectImage[] = [wideImage];

  callbacks?.onProgress?.("Centering on object...");
  const centerResult = await centerObjectHybrid(camera, apiKey, object.name, object.boundingBox || undefined);
  
  if (!centerResult.success) {
    console.log(`[Enhance] Could not center ${object.name}`);
    const updatedObj: DetectedObject = {
      ...object,
      images: updatedImages,
      zoomRoundCompleted: true,
    };
    return updateObjectInScan(scan, updatedObj);
  }

  const zoomLevels = [
    { name: "medium" as const, target: 0.35 },
    { name: "tight" as const, target: 0.50 },
    { name: "close" as const, target: 0.70 },
  ];

  for (const level of zoomLevels) {
    callbacks?.onZoomLevel?.(level.name);
    callbacks?.onProgress?.(`Zooming to ${level.name}...`);
    
    const result = await zoomAndCenterToTarget(
      camera,
      apiKey,
      object.name,
      level.target,
      4,
      800,
      Array.from(usedSlots),
      level.name
    );
    
    if (result?.image) {
      updatedImages.push(result.image);
      usedSlots.add(result.image.presetSlot);
      console.log(`[Enhance] Captured ${level.name} for ${object.name}`);
    }
    
    await delay(300);
  }

  const updatedObj: DetectedObject = {
    ...object,
    images: updatedImages,
    zoomRoundCompleted: true,
  };

  console.log(`[Enhance] Completed ${object.name} with ${updatedImages.length} images`);
  callbacks?.onProgress?.(`Done! ${updatedImages.length} images captured`);
  
  return updateObjectInScan(scan, updatedObj);
}
