import * as VisionTracking from "vision-tracking";
import type {
  DetectionResult,
  ClassificationResult,
  PoseAnalysisResult,
  HandPoseResult,
} from "vision-tracking";

export type DescriptionSource = "apple" | "moondream";

export type ActivityLevel = "low" | "medium" | "high";

export interface SceneAnalysis {
  sceneTypes: ClassificationResult[];
  humans: DetectionResult[];
  faces: DetectionResult[];
  animals: DetectionResult[];
  poses: PoseAnalysisResult[];
  hands: HandPoseResult[];
  humanCount: number;
  jumpingCount: number;
  armsRaisedCount: number;
  runningCount: number;
  pointingCount: number;
  wavingCount: number;
  thumbsUpCount: number;
  peaceSignCount: number;
  activityLevel: ActivityLevel;
}

export interface StructuredDescription {
  sceneType: string;
  objectCounts: Record<string, number>;
  activity: string;
  actions: string[];
}

export interface VisionDescription {
  natural: string;
  structured: StructuredDescription;
  source: DescriptionSource;
  analysisTimeMs: number;
}

export async function analyzeScene(imageBase64: string): Promise<SceneAnalysis> {
  if (!VisionTracking.isVisionAvailable) {
    return createEmptyAnalysis();
  }

  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  const [sceneTypes, humans, faces, animals, poses, hands] = await Promise.all([
    VisionTracking.classifyScene(base64Data, 5).catch(() => []),
    VisionTracking.detectHumans(base64Data).catch(() => []),
    VisionTracking.detectFaces(base64Data).catch(() => []),
    VisionTracking.detectAnimals(base64Data).catch(() => []),
    VisionTracking.detectBodyPoses(base64Data).catch(() => []),
    VisionTracking.detectHandPoses(base64Data).catch(() => []),
  ]);

  const jumpingCount = poses.filter((p) => p.isJumping).length;
  const armsRaisedCount = poses.filter((p) => p.armsRaised).length;
  const runningCount = poses.filter((p) => p.isRunning).length;

  const pointingCount = hands.filter((h) => h.isPointing).length;
  const wavingCount = hands.filter((h) => h.isOpenPalm).length;
  const thumbsUpCount = hands.filter((h) => h.isThumbsUp).length;
  const peaceSignCount = hands.filter((h) => h.isPeaceSign).length;

  const activeCount = jumpingCount + runningCount;
  const humanCount = humans.length;
  const ratio = humanCount > 0 ? activeCount / humanCount : 0;

  let activityLevel: ActivityLevel = "low";
  if (ratio > 0.5 || jumpingCount > 2) {
    activityLevel = "high";
  } else if (ratio > 0.2 || activeCount > 0) {
    activityLevel = "medium";
  }

  return {
    sceneTypes,
    humans,
    faces,
    animals,
    poses,
    hands,
    humanCount,
    jumpingCount,
    armsRaisedCount,
    runningCount,
    pointingCount,
    wavingCount,
    thumbsUpCount,
    peaceSignCount,
    activityLevel,
  };
}

function createEmptyAnalysis(): SceneAnalysis {
  return {
    sceneTypes: [],
    humans: [],
    faces: [],
    animals: [],
    poses: [],
    hands: [],
    humanCount: 0,
    jumpingCount: 0,
    armsRaisedCount: 0,
    runningCount: 0,
    pointingCount: 0,
    wavingCount: 0,
    thumbsUpCount: 0,
    peaceSignCount: 0,
    activityLevel: "low",
  };
}

const SCENE_CONTEXTS: Record<string, { setting: string; peopleVerb: string; actionContext: string }> = {
  basketball_court: { setting: "a basketball court", peopleVerb: "playing", actionContext: "game" },
  gym: { setting: "a gym", peopleVerb: "working out", actionContext: "exercise" },
  office: { setting: "an office space", peopleVerb: "working", actionContext: "meeting" },
  conference_room: { setting: "a conference room", peopleVerb: "meeting", actionContext: "discussion" },
  living_room: { setting: "a living room", peopleVerb: "relaxing", actionContext: "gathering" },
  kitchen: { setting: "a kitchen", peopleVerb: "cooking", actionContext: "meal prep" },
  bedroom: { setting: "a bedroom", peopleVerb: "resting", actionContext: "relaxation" },
  classroom: { setting: "a classroom", peopleVerb: "learning", actionContext: "lesson" },
  restaurant: { setting: "a restaurant", peopleVerb: "dining", actionContext: "meal" },
  bar: { setting: "a bar", peopleVerb: "socializing", actionContext: "gathering" },
  stage: { setting: "a stage", peopleVerb: "performing", actionContext: "performance" },
  park: { setting: "a park", peopleVerb: "enjoying the outdoors", actionContext: "recreation" },
  street: { setting: "a street scene", peopleVerb: "walking", actionContext: "activity" },
  lobby: { setting: "a lobby", peopleVerb: "waiting", actionContext: "transit" },
  parking_lot: { setting: "a parking area", peopleVerb: "moving about", actionContext: "transit" },
  warehouse: { setting: "a warehouse", peopleVerb: "working", actionContext: "operations" },
  factory: { setting: "an industrial space", peopleVerb: "working", actionContext: "production" },
};

function getSceneContext(identifier: string): { setting: string; peopleVerb: string; actionContext: string } {
  const key = identifier.toLowerCase().replace(/\s+/g, "_");
  return SCENE_CONTEXTS[key] || { 
    setting: `a ${formatSceneName(identifier).toLowerCase()}`, 
    peopleVerb: "present", 
    actionContext: "scene" 
  };
}

function numberToWord(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return n <= 10 ? words[n] : n.toString();
}

export function generateFreeDescription(analysis: SceneAnalysis): VisionDescription {
  const startTime = Date.now();
  const actions: string[] = [];
  const objectCounts: Record<string, number> = {};

  const topScene = analysis.sceneTypes[0];
  const sceneType = topScene ? formatSceneName(topScene.identifier) : "Unknown scene";
  const context = topScene ? getSceneContext(topScene.identifier) : null;

  let description = "";

  if (context && topScene && topScene.confidence > 0.3) {
    if (analysis.humanCount > 0) {
      objectCounts["people"] = analysis.humanCount;
      const peopleWord = analysis.humanCount === 1 ? "person" : "people";
      description = `This appears to be ${context.setting} with ${numberToWord(analysis.humanCount)} ${peopleWord}`;
      
      if (analysis.humanCount > 1) {
        description += ` ${context.peopleVerb}`;
      }
      description += ". ";
    } else {
      description = `This appears to be ${context.setting}. No people are currently visible. `;
    }
  } else {
    if (analysis.humanCount > 0) {
      objectCounts["people"] = analysis.humanCount;
      const peopleWord = analysis.humanCount === 1 ? "person is" : "people are";
      description = `${numberToWord(analysis.humanCount).charAt(0).toUpperCase() + numberToWord(analysis.humanCount).slice(1)} ${peopleWord} visible in the frame. `;
    } else {
      description = "The scene appears empty with no people visible. ";
    }
  }

  if (analysis.animals.length > 0) {
    const animalLabels = analysis.animals.map((a) => a.label);
    const uniqueAnimals = [...new Set(animalLabels)];
    uniqueAnimals.forEach((label) => {
      const count = animalLabels.filter((l) => l === label).length;
      objectCounts[label] = count;
    });
    const animalWord = analysis.animals.length === 1 ? "animal" : "animals";
    description += `There ${analysis.animals.length === 1 ? "is" : "are"} also ${numberToWord(analysis.animals.length)} ${animalWord} in view. `;
  }

  const actionParts: string[] = [];

  if (analysis.jumpingCount > 0) {
    const subject = analysis.jumpingCount === 1 ? "Someone is" : `${numberToWord(analysis.jumpingCount).charAt(0).toUpperCase() + numberToWord(analysis.jumpingCount).slice(1)} people are`;
    actionParts.push(`${subject} jumping`);
    actions.push("jumping");
  }

  if (analysis.runningCount > 0) {
    const subject = analysis.runningCount === 1 ? "one is" : `${numberToWord(analysis.runningCount)} are`;
    actionParts.push(`${subject} running`);
    actions.push("running");
  }

  if (analysis.armsRaisedCount > 0) {
    const subject = analysis.armsRaisedCount === 1 ? "one has" : `${numberToWord(analysis.armsRaisedCount)} have`;
    actionParts.push(`${subject} their arms raised`);
    actions.push("arms raised");
  }

  if (actionParts.length > 0) {
    description += actionParts.join(", and ") + ". ";
  }

  const gestureParts: string[] = [];

  if (analysis.pointingCount > 0) {
    gestureParts.push(`${numberToWord(analysis.pointingCount)} pointing`);
    actions.push("pointing");
  }

  if (analysis.thumbsUpCount > 0) {
    gestureParts.push(`${numberToWord(analysis.thumbsUpCount)} giving a thumbs up`);
    actions.push("thumbs up");
  }

  if (analysis.peaceSignCount > 0) {
    gestureParts.push(`${numberToWord(analysis.peaceSignCount)} showing a peace sign`);
    actions.push("peace sign");
  }

  if (analysis.wavingCount > 0 && analysis.wavingCount > analysis.thumbsUpCount) {
    gestureParts.push(`${numberToWord(analysis.wavingCount)} waving`);
    actions.push("waving");
  }

  if (gestureParts.length > 0) {
    description += "Gestures detected: " + gestureParts.join(", ") + ". ";
  }

  if (analysis.activityLevel === "high") {
    description += "The scene shows high energy and movement.";
  } else if (analysis.activityLevel === "medium") {
    description += "There's moderate activity in the scene.";
  } else if (analysis.humanCount > 0) {
    description += "The atmosphere appears calm.";
  }

  return {
    natural: description.trim(),
    structured: {
      sceneType,
      objectCounts,
      activity: analysis.activityLevel,
      actions,
    },
    source: "apple",
    analysisTimeMs: Date.now() - startTime,
  };
}

function formatSceneName(identifier: string): string {
  return identifier
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getActivityText(level: ActivityLevel): string {
  switch (level) {
    case "high":
      return "High activity";
    case "medium":
      return "Moderate activity";
    case "low":
      return "Low activity";
  }
}

export async function generateVisionDescription(
  imageBase64: string
): Promise<VisionDescription> {
  const analysis = await analyzeScene(imageBase64);
  return generateFreeDescription(analysis);
}

export function buildMoondreamContext(analysis: SceneAnalysis): string {
  const parts: string[] = [];

  const topScene = analysis.sceneTypes[0];
  if (topScene && topScene.confidence > 0.3) {
    parts.push(`Scene: ${topScene.identifier}`);
  }

  if (analysis.humanCount > 0) {
    parts.push(`${analysis.humanCount} people detected`);
  }

  if (analysis.animals.length > 0) {
    parts.push(`Animals: ${analysis.animals.map((a) => a.label).join(", ")}`);
  }

  if (analysis.jumpingCount > 0) {
    parts.push(`${analysis.jumpingCount} jumping`);
  }

  if (analysis.armsRaisedCount > 0) {
    parts.push(`${analysis.armsRaisedCount} arms raised`);
  }

  if (analysis.runningCount > 0) {
    parts.push(`${analysis.runningCount} running`);
  }

  if (analysis.pointingCount > 0) {
    parts.push(`${analysis.pointingCount} pointing`);
  }

  if (analysis.thumbsUpCount > 0) {
    parts.push(`${analysis.thumbsUpCount} thumbs up`);
  }

  if (analysis.peaceSignCount > 0) {
    parts.push(`${analysis.peaceSignCount} peace signs`);
  }

  parts.push(`Activity: ${analysis.activityLevel}`);

  return parts.join(". ");
}
