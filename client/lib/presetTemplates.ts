import { PresetTemplateType, PTZPreset, generateId } from "@/lib/storage";

export interface PresetTemplate {
  type: PresetTemplateType;
  name: string;
  description: string;
  presetNames: string[];
  positions: Array<{ pan: number; tilt: number; zoom: number }>;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    type: "basketball",
    name: "Basketball Court",
    description: "5 presets covering a standard basketball court",
    presetNames: ["Left Hoop", "Right Hoop", "Center Wide", "Scoreboard", "Bench"],
    positions: [
      { pan: -50, tilt: 0, zoom: 20 },
      { pan: 50, tilt: 0, zoom: 20 },
      { pan: 0, tilt: 0, zoom: 0 },
      { pan: 0, tilt: 30, zoom: 80 },
      { pan: 0, tilt: -20, zoom: 40 },
    ],
  },
  {
    type: "interview",
    name: "Interview Setup",
    description: "3 presets for two-person interviews",
    presetNames: ["Wide Shot", "Subject 1", "Subject 2"],
    positions: [
      { pan: 0, tilt: 0, zoom: 0 },
      { pan: -30, tilt: 0, zoom: 60 },
      { pan: 30, tilt: 0, zoom: 60 },
    ],
  },
  {
    type: "classroom",
    name: "Classroom",
    description: "4 presets for lecture capture",
    presetNames: ["Teacher", "Whiteboard", "Students Wide", "Students Close"],
    positions: [
      { pan: -40, tilt: 10, zoom: 40 },
      { pan: 0, tilt: 20, zoom: 30 },
      { pan: 0, tilt: -10, zoom: 0 },
      { pan: 0, tilt: -10, zoom: 50 },
    ],
  },
  {
    type: "stage",
    name: "Stage Performance",
    description: "5 presets for live stage productions",
    presetNames: ["Wide Shot", "Center Stage", "Stage Left", "Stage Right", "Closeup"],
    positions: [
      { pan: 0, tilt: 0, zoom: 0 },
      { pan: 0, tilt: 0, zoom: 40 },
      { pan: -40, tilt: 0, zoom: 40 },
      { pan: 40, tilt: 0, zoom: 40 },
      { pan: 0, tilt: 0, zoom: 80 },
    ],
  },
];

export function getTemplate(type: PresetTemplateType): PresetTemplate | undefined {
  return PRESET_TEMPLATES.find((t) => t.type === type);
}

export function createPresetsFromTemplate(
  cameraId: string,
  templateType: PresetTemplateType
): PTZPreset[] {
  const template = getTemplate(templateType);
  if (!template) return [];

  return template.presetNames.map((name, index) => ({
    id: generateId(),
    cameraId,
    name,
    pan: template.positions[index].pan,
    tilt: template.positions[index].tilt,
    zoom: template.positions[index].zoom,
    templateType,
    createdAt: new Date().toISOString(),
  }));
}
