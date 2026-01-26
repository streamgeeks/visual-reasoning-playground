import { Platform } from "react-native";
import { 
  CameraProfile, 
  CameraImageSettings, 
  WhiteBalanceMode,
  DEFAULT_IMAGE_SETTINGS,
  IMAGE_SETTING_RANGES,
} from "./storage";
import { 
  viscaPanTilt, 
  viscaZoom, 
  viscaHome,
  viscaPresetSave,
  viscaPresetRecall,
  viscaAbsolutePosition,
  viscaZoomDirect,
  viscaFocus,
  viscaAutoFocus,
  viscaOnePushAutoFocus,
} from "./visca";

export interface CameraConnectionState {
  connected: boolean;
  fps: number;
  frameCount: number;
  lastError: string | null;
}

export interface MjpegConfig {
  url: string;
  supported: boolean;
}

function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

interface SnapshotConfig {
  url: string;
  headers?: HeadersInit;
  name: string;
}

function getSnapshotConfigs(camera: CameraProfile): SnapshotConfig[] {
  const base = `http://${camera.ipAddress}:${camera.httpPort}`;
  const configs: SnapshotConfig[] = [];
  const keepAlive: Record<string, string> = { "Connection": "keep-alive" };
  const authHeaders: Record<string, string> = camera.username && camera.password ? {
    "Authorization": `Basic ${btoa(`${camera.username}:${camera.password}`)}`,
    "Connection": "keep-alive",
  } : keepAlive;
  
  // Try low-resolution endpoints first (faster)
  // PTZOptics low-res snapshot (if supported)
  configs.push({
    url: `${base}/cgi-bin/snapshot.cgi?resolution=2`,
    headers: authHeaders,
    name: "Low-res snapshot",
  });
  
  // Standard snapshot with quality parameter
  if (camera.username && camera.password) {
    configs.push({
      url: `${base}/cgi-bin/snapshot.cgi?usr=${encodeURIComponent(camera.username)}&pwd=${encodeURIComponent(camera.password)}&quality=50`,
      headers: { "Connection": "keep-alive" },
      name: "Query params auth (low quality)",
    });
  }
  
  // Method 1: Query parameters (PTZOptics style)
  if (camera.username && camera.password) {
    configs.push({
      url: `${base}/cgi-bin/snapshot.cgi?usr=${encodeURIComponent(camera.username)}&pwd=${encodeURIComponent(camera.password)}`,
      headers: { "Connection": "keep-alive" },
      name: "Query params auth",
    });
  }
  
  // Method 2: HTTP Basic Auth header
  if (camera.username && camera.password) {
    configs.push({
      url: `${base}/cgi-bin/snapshot.cgi`,
      headers: authHeaders,
      name: "Basic Auth header",
    });
  }
  
  // Method 3: No auth (some cameras allow public access to snapshots)
  configs.push({
    url: `${base}/cgi-bin/snapshot.cgi`,
    headers: { "Connection": "keep-alive" },
    name: "No auth",
  });
  
  // Method 4: Alternative snapshot endpoints
  configs.push({
    url: `${base}/snapshot.jpg`,
    headers: authHeaders,
    name: "snapshot.jpg",
  });
  
  // Try sub-stream snapshot (usually lower resolution)
  configs.push({
    url: `${base}/jpg/2/image.jpg`,
    headers: authHeaders,
    name: "Sub-stream snapshot",
  });
  
  configs.push({
    url: `${base}/jpg/image.jpg`,
    headers: authHeaders,
    name: "jpg/image.jpg",
  });
  
  return configs;
}

export interface ConnectionTestResult {
  success: boolean;
  snapshotUrl?: string;
  headers?: HeadersInit;
  error?: string;
}

let activeSnapshotConfig: SnapshotConfig | null = null;

export async function testCameraConnection(camera: CameraProfile): Promise<ConnectionTestResult> {
  const configs = getSnapshotConfigs(camera);
  
  for (const config of configs) {
    const timeout = createTimeoutSignal(5000);
    try {
      console.log(`Testing ${config.name}: ${config.url}`);
      
      const response = await fetch(config.url, {
        method: "GET",
        headers: config.headers,
        signal: timeout.signal,
      });
      
      timeout.clear();
      
      const contentType = response.headers.get("content-type") || "";
      console.log(`Response: ${response.status}, Content-Type: ${contentType}`);
      
      if (response.ok && (contentType.includes("image") || contentType.includes("jpeg") || contentType.includes("jpg"))) {
        console.log(`Success with ${config.name}!`);
        activeSnapshotConfig = config;
        return { success: true, snapshotUrl: config.url, headers: config.headers };
      }
      
      // Check if we got an actual image even if content-type is wrong
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type.includes("image") || blob.size > 1000) {
          // Likely an image even if content-type header was wrong
          console.log(`Success with ${config.name} (blob check)!`);
          activeSnapshotConfig = config;
          return { success: true, snapshotUrl: config.url, headers: config.headers };
        }
      }
    } catch (error: any) {
      timeout.clear();
      console.log(`${config.name} failed:`, error.message);
    }
  }
  
  activeSnapshotConfig = null;
  return { 
    success: false, 
    error: "Could not get snapshot from camera. Check credentials and camera settings." 
  };
}

// Track previous blob URL to revoke it (prevent memory leak)
let previousBlobUrl: string | null = null;

export async function fetchCameraFrame(camera: CameraProfile): Promise<string | null> {
  if (!activeSnapshotConfig) {
    console.log("[Camera] No active snapshot config, attempting to reconnect...");
    const result = await testCameraConnection(camera);
    if (!result.success || !activeSnapshotConfig) {
      console.error("[Camera] Failed to reconnect:", result.error);
      throw new Error(`Camera connection failed: ${result.error || "Could not connect to camera"}`);
    }
    console.log("[Camera] Reconnected successfully");
  }
  
  const separator = activeSnapshotConfig.url.includes("?") ? "&" : "?";
  const url = `${activeSnapshotConfig.url}${separator}t=${Date.now()}`;
  
  const timeout = createTimeoutSignal(5000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: activeSnapshotConfig.headers,
      signal: timeout.signal,
    });
    
    timeout.clear();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // On web, use blob URL for better performance
    if (Platform.OS === "web") {
      const blob = await response.blob();
      
      if (typeof URL !== "undefined" && URL.createObjectURL) {
        if (previousBlobUrl) {
          URL.revokeObjectURL(previousBlobUrl);
        }
        const blobUrl = URL.createObjectURL(blob);
        previousBlobUrl = blobUrl;
        return blobUrl;
      }
    }
    
    // On native, convert to base64 data URI
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return `data:image/jpeg;base64,${base64}`;
  } catch (error: any) {
    timeout.clear();
    const message = error?.name === "AbortError" 
      ? "Camera request timed out" 
      : error?.message || "Network request failed";
    console.error("[Camera] fetchCameraFrame error:", message);
    throw new Error(message);
  }
}

export function clearActiveConfig() {
  activeSnapshotConfig = null;
}

export function getMjpegUrl(camera: CameraProfile): string {
  const base = `http://${camera.ipAddress}:${camera.httpPort}`;
  // PTZOptics cameras typically use /mjpg/video.mjpg or /video.mjpg
  // Try the most common PTZOptics MJPEG endpoint
  if (camera.username && camera.password) {
    return `${base}/mjpg/video.mjpg?usr=${encodeURIComponent(camera.username)}&pwd=${encodeURIComponent(camera.password)}`;
  }
  return `${base}/mjpg/video.mjpg`;
}

export function getAlternateMjpegUrls(camera: CameraProfile): string[] {
  const base = `http://${camera.ipAddress}:${camera.httpPort}`;
  const authQuery = camera.username && camera.password 
    ? `?usr=${encodeURIComponent(camera.username)}&pwd=${encodeURIComponent(camera.password)}`
    : "";
  
  return [
    `${base}/mjpg/video.mjpg${authQuery}`,
    `${base}/video.mjpg${authQuery}`,
    `${base}/cgi-bin/mjpg/video.cgi${authQuery}`,
    `${base}/mjpeg/1${authQuery}`,
    `${base}/stream.mjpg${authQuery}`,
  ];
}

export function getActiveSnapshotUrl(): string | null {
  return activeSnapshotConfig?.url || null;
}

export function getRtspUrl(camera: CameraProfile): string {
  const auth = camera.username && camera.password 
    ? `${camera.username}:${camera.password}@` 
    : "";
  const stream = camera.streamQuality === "high" ? "1" : "2";
  return `rtsp://${auth}${camera.ipAddress}:${camera.rtspPort}/${stream}`;
}

export function getPtzControlUrl(camera: CameraProfile, command: string): string {
  return `http://${camera.ipAddress}:${camera.httpPort}/cgi-bin/ptzctrl.cgi?${command}`;
}

function getBasicAuthHeader(camera: CameraProfile): HeadersInit {
  const headers: HeadersInit = {};
  if (camera.username && camera.password) {
    const credentials = btoa(`${camera.username}:${camera.password}`);
    headers["Authorization"] = `Basic ${credentials}`;
  }
  return headers;
}

export async function sendPtzCommand(camera: CameraProfile, command: string, speed?: number): Promise<boolean> {
  const timeout = createTimeoutSignal(1000);
  try {
    const headers = getBasicAuthHeader(camera);
    
    let fullCommand = command;
    if (speed && speed > 0 && !command.includes("stop")) {
      fullCommand = `${command}&speed=${speed}`;
    }
    
    const url = getPtzControlUrl(camera, fullCommand);
    console.log(`[PTZ] Sending command: ${fullCommand} to ${camera.ipAddress}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: timeout.signal,
    });
    
    timeout.clear();
    
    if (!response.ok) {
      console.log(`[PTZ] Command FAILED: HTTP ${response.status} ${response.statusText}`);
    }
    
    return response.ok;
  } catch (error: any) {
    timeout.clear();
    console.log(`[PTZ] Command EXCEPTION: ${error?.message || error}`);
    return false;
  }
}

export const PTZ_COMMANDS = {
  up: "ptzcmd&up",
  down: "ptzcmd&down", 
  left: "ptzcmd&left",
  right: "ptzcmd&right",
  upleft: "ptzcmd&upleft",
  upright: "ptzcmd&upright",
  downleft: "ptzcmd&downleft",
  downright: "ptzcmd&downright",
  stop: "ptzcmd&ptzstop",
  zoomIn: "ptzcmd&zoomin",
  zoomOut: "ptzcmd&zoomout",
  zoomStop: "ptzcmd&zoomstop",
  home: "ptzcmd&home",
  focusIn: "ptzcmd&focusin",
  focusOut: "ptzcmd&focusout",
  focusStop: "ptzcmd&focusstop",
  presetSet: (slot: number) => `ptzcmd&preset&set&${slot}`,
  presetCall: (slot: number) => `ptzcmd&preset&call&${slot}`,
} as const;

export type PtzDirection = "up" | "down" | "left" | "right" | "upleft" | "upright" | "downleft" | "downright" | "stop";

export async function sendPtzViscaCommand(
  camera: CameraProfile,
  direction: PtzDirection,
  panSpeed: number = 24,
  tiltSpeed: number = 24
): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  
  try {
    const result = await viscaPanTilt(
      { ipAddress: camera.ipAddress, port: viscaPort },
      panSpeed,
      tiltSpeed,
      direction
    );
    
    if (result) {
      return true;
    }
    
    console.log("[VISCA] Failed, falling back to HTTP CGI");
    return sendPtzCommand(camera, PTZ_COMMANDS[direction], panSpeed);
  } catch (err: any) {
    console.error("[VISCA] Exception, falling back to HTTP:", err?.message || err);
    return sendPtzCommand(camera, PTZ_COMMANDS[direction], panSpeed);
  }
}

export async function sendZoomViscaCommand(
  camera: CameraProfile,
  direction: "in" | "out" | "stop",
  speed: number = 7
): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  
  try {
    const result = await viscaZoom(
      { ipAddress: camera.ipAddress, port: viscaPort },
      direction,
      speed
    );
    
    if (result) {
      return true;
    }
    
    const httpCmd = direction === "in" ? PTZ_COMMANDS.zoomIn 
      : direction === "out" ? PTZ_COMMANDS.zoomOut 
      : PTZ_COMMANDS.zoomStop;
    return sendPtzCommand(camera, httpCmd);
  } catch (err: any) {
    console.error("[VISCA] Zoom exception, falling back to HTTP:", err?.message || err);
    const httpCmd = direction === "in" ? PTZ_COMMANDS.zoomIn 
      : direction === "out" ? PTZ_COMMANDS.zoomOut 
      : PTZ_COMMANDS.zoomStop;
    return sendPtzCommand(camera, httpCmd);
  }
}

export async function sendHomeViscaCommand(camera: CameraProfile): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  
  try {
    const result = await viscaHome({ ipAddress: camera.ipAddress, port: viscaPort });
    
    if (result) {
      return true;
    }
    
    return sendPtzCommand(camera, PTZ_COMMANDS.home);
  } catch (err: any) {
    console.error("[VISCA] Home exception, falling back to HTTP:", err?.message || err);
    return sendPtzCommand(camera, PTZ_COMMANDS.home);
  }
}

export async function sendFocusViscaCommand(
  camera: CameraProfile,
  direction: "near" | "far" | "stop",
  speed: number = 3
): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  
  try {
    const result = await viscaFocus(
      { ipAddress: camera.ipAddress, port: viscaPort },
      direction,
      speed
    );
    
    if (result) {
      return true;
    }
    
    const httpCmd = direction === "near" ? PTZ_COMMANDS.focusIn 
      : direction === "far" ? PTZ_COMMANDS.focusOut 
      : PTZ_COMMANDS.focusStop;
    return sendPtzCommand(camera, httpCmd);
  } catch (err: any) {
    console.error("[VISCA] Focus exception, falling back to HTTP:", err?.message || err);
    const httpCmd = direction === "near" ? PTZ_COMMANDS.focusIn 
      : direction === "far" ? PTZ_COMMANDS.focusOut 
      : PTZ_COMMANDS.focusStop;
    return sendPtzCommand(camera, httpCmd);
  }
}

export async function setAutoFocus(
  camera: CameraProfile,
  enabled: boolean
): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  
  try {
    return await viscaAutoFocus({ ipAddress: camera.ipAddress, port: viscaPort }, enabled);
  } catch (err: any) {
    console.error("[VISCA] Auto focus exception:", err?.message || err);
    return false;
  }
}

export async function triggerOnePushAutoFocus(camera: CameraProfile): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  
  try {
    return await viscaOnePushAutoFocus({ ipAddress: camera.ipAddress, port: viscaPort });
  } catch (err: any) {
    console.error("[VISCA] One-push auto focus exception:", err?.message || err);
    return false;
  }
}

export async function savePresetToCamera(
  camera: CameraProfile,
  slot: number
): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  const clampedSlot = Math.max(0, Math.min(254, slot));
  
  try {
    const result = await viscaPresetSave(
      { ipAddress: camera.ipAddress, port: viscaPort },
      clampedSlot
    );
    
    if (result) {
      console.log(`[Camera] Preset saved to slot ${clampedSlot} via VISCA`);
      return true;
    }
    
    console.log("[Camera] VISCA preset save failed, trying HTTP CGI");
    return sendPtzCommand(camera, PTZ_COMMANDS.presetSet(clampedSlot));
  } catch (err: any) {
    console.error("[Camera] Preset save exception, falling back to HTTP:", err?.message || err);
    return sendPtzCommand(camera, PTZ_COMMANDS.presetSet(clampedSlot));
  }
}

export async function recallPresetFromCamera(
  camera: CameraProfile,
  slot: number
): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  const clampedSlot = Math.max(0, Math.min(254, slot));
  
  try {
    const result = await viscaPresetRecall(
      { ipAddress: camera.ipAddress, port: viscaPort },
      clampedSlot
    );
    
    if (result) {
      console.log(`[Camera] Preset recalled from slot ${clampedSlot} via VISCA`);
      return true;
    }
    
    console.log("[Camera] VISCA preset recall failed, trying HTTP CGI");
    return sendPtzCommand(camera, PTZ_COMMANDS.presetCall(clampedSlot));
  } catch (err: any) {
    console.error("[Camera] Preset recall exception, falling back to HTTP:", err?.message || err);
    return sendPtzCommand(camera, PTZ_COMMANDS.presetCall(clampedSlot));
  }
}

export async function moveToAbsolutePosition(
  camera: CameraProfile,
  panPosition: number,
  tiltPosition: number,
  speed: number = 12
): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  
  try {
    const result = await viscaAbsolutePosition(
      { ipAddress: camera.ipAddress, port: viscaPort },
      speed,
      speed,
      panPosition,
      tiltPosition
    );
    
    if (result) {
      console.log(`[Camera] Moved to absolute position pan=${panPosition}, tilt=${tiltPosition}`);
      return true;
    }
    
    console.log("[Camera] Absolute position move failed");
    return false;
  } catch (err: any) {
    console.error("[Camera] Absolute position exception:", err?.message || err);
    return false;
  }
}

export async function setZoomDirect(
  camera: CameraProfile,
  zoomPosition: number
): Promise<boolean> {
  const viscaPort = camera.viscaPort || 1259;
  
  try {
    const result = await viscaZoomDirect(
      { ipAddress: camera.ipAddress, port: viscaPort },
      zoomPosition
    );
    
    if (result) {
      console.log(`[Camera] Zoom set to ${zoomPosition}`);
      return true;
    }
    
    return false;
  } catch (err: any) {
    console.error("[Camera] Direct zoom exception:", err?.message || err);
    return false;
  }
}

type ImageSettingParam = 
  | "wbmode" 
  | "colortemp" 
  | "rgain" 
  | "bgain" 
  | "brightness" 
  | "saturation" 
  | "contrast" 
  | "sharpness" 
  | "hue";

async function sendImageSettingCommand(
  camera: CameraProfile,
  param: ImageSettingParam,
  value: string | number
): Promise<boolean> {
  const base = `http://${camera.ipAddress}:${camera.httpPort}`;
  
  const authHeaders: HeadersInit = camera.username && camera.password ? {
    "Authorization": `Basic ${btoa(`${camera.username}:${camera.password}`)}`,
  } : {};
  
  const urlWithHeader = `${base}/cgi-bin/param.cgi?post_image_value&${param}&${value}`;
  
  try {
    const { signal, clear } = createTimeoutSignal(3000);
    const response = await fetch(urlWithHeader, { 
      method: "GET",
      headers: authHeaders,
      signal,
    });
    clear();
    
    if (response.ok) {
      console.log(`[Camera] Set ${param}=${value} (header auth)`);
      return true;
    }
    
    if ((response.status === 401 || response.status === 403) && camera.username && camera.password) {
      console.log(`[Camera] Header auth failed (${response.status}), trying URL auth for ${param}`);
      
      const urlWithAuth = `${base}/cgi-bin/param.cgi?post_image_value&usr=${encodeURIComponent(camera.username)}&pwd=${encodeURIComponent(camera.password)}&${param}&${value}`;
      
      const { signal: signal2, clear: clear2 } = createTimeoutSignal(3000);
      const response2 = await fetch(urlWithAuth, { 
        method: "GET",
        signal: signal2,
      });
      clear2();
      
      if (response2.ok) {
        console.log(`[Camera] Set ${param}=${value} (URL auth)`);
        return true;
      }
      
      console.warn(`[Camera] URL auth also failed for ${param}: ${response2.status}`);
      return false;
    }
    
    console.warn(`[Camera] Failed to set ${param}: ${response.status}`);
    return false;
  } catch (err: any) {
    console.error(`[Camera] Image setting error for ${param}:`, err?.message || err);
    return false;
  }
}

export async function setCameraWhiteBalanceMode(
  camera: CameraProfile,
  mode: WhiteBalanceMode
): Promise<boolean> {
  return sendImageSettingCommand(camera, "wbmode", mode);
}

export async function setCameraColorTemperature(
  camera: CameraProfile,
  value: number
): Promise<boolean> {
  const clamped = Math.max(
    IMAGE_SETTING_RANGES.colorTemperature.min,
    Math.min(IMAGE_SETTING_RANGES.colorTemperature.max, Math.round(value))
  );
  return sendImageSettingCommand(camera, "colortemp", clamped);
}

export async function setCameraRedGain(
  camera: CameraProfile,
  value: number
): Promise<boolean> {
  const clamped = Math.max(
    IMAGE_SETTING_RANGES.redGain.min,
    Math.min(IMAGE_SETTING_RANGES.redGain.max, Math.round(value))
  );
  return sendImageSettingCommand(camera, "rgain", clamped);
}

export async function setCameraBlueGain(
  camera: CameraProfile,
  value: number
): Promise<boolean> {
  const clamped = Math.max(
    IMAGE_SETTING_RANGES.blueGain.min,
    Math.min(IMAGE_SETTING_RANGES.blueGain.max, Math.round(value))
  );
  return sendImageSettingCommand(camera, "bgain", clamped);
}

export async function setCameraBrightness(
  camera: CameraProfile,
  value: number
): Promise<boolean> {
  const clamped = Math.max(
    IMAGE_SETTING_RANGES.brightness.min,
    Math.min(IMAGE_SETTING_RANGES.brightness.max, Math.round(value))
  );
  return sendImageSettingCommand(camera, "brightness", clamped);
}

export async function setCameraSaturation(
  camera: CameraProfile,
  value: number
): Promise<boolean> {
  const clamped = Math.max(
    IMAGE_SETTING_RANGES.saturation.min,
    Math.min(IMAGE_SETTING_RANGES.saturation.max, Math.round(value))
  );
  return sendImageSettingCommand(camera, "saturation", clamped);
}

export async function setCameraContrast(
  camera: CameraProfile,
  value: number
): Promise<boolean> {
  const clamped = Math.max(
    IMAGE_SETTING_RANGES.contrast.min,
    Math.min(IMAGE_SETTING_RANGES.contrast.max, Math.round(value))
  );
  return sendImageSettingCommand(camera, "contrast", clamped);
}

export async function setCameraSharpness(
  camera: CameraProfile,
  value: number
): Promise<boolean> {
  const clamped = Math.max(
    IMAGE_SETTING_RANGES.sharpness.min,
    Math.min(IMAGE_SETTING_RANGES.sharpness.max, Math.round(value))
  );
  return sendImageSettingCommand(camera, "sharpness", clamped);
}

export async function setCameraHue(
  camera: CameraProfile,
  value: number
): Promise<boolean> {
  const clamped = Math.max(
    IMAGE_SETTING_RANGES.hue.min,
    Math.min(IMAGE_SETTING_RANGES.hue.max, Math.round(value))
  );
  return sendImageSettingCommand(camera, "hue", clamped);
}

export async function applyCameraImageSettings(
  camera: CameraProfile,
  settings: Partial<CameraImageSettings>
): Promise<{ success: boolean; applied: string[]; failed: string[] }> {
  const applied: string[] = [];
  const failed: string[] = [];
  
  const operations: Array<{ name: string; fn: () => Promise<boolean> }> = [];
  
  if (settings.whiteBalanceMode !== undefined) {
    operations.push({
      name: "whiteBalanceMode",
      fn: () => setCameraWhiteBalanceMode(camera, settings.whiteBalanceMode!),
    });
  }
  
  if (settings.colorTemperature !== undefined) {
    operations.push({
      name: "colorTemperature",
      fn: () => setCameraColorTemperature(camera, settings.colorTemperature!),
    });
  }
  
  if (settings.redGain !== undefined) {
    operations.push({
      name: "redGain",
      fn: () => setCameraRedGain(camera, settings.redGain!),
    });
  }
  
  if (settings.blueGain !== undefined) {
    operations.push({
      name: "blueGain",
      fn: () => setCameraBlueGain(camera, settings.blueGain!),
    });
  }
  
  if (settings.brightness !== undefined) {
    operations.push({
      name: "brightness",
      fn: () => setCameraBrightness(camera, settings.brightness!),
    });
  }
  
  if (settings.saturation !== undefined) {
    operations.push({
      name: "saturation",
      fn: () => setCameraSaturation(camera, settings.saturation!),
    });
  }
  
  if (settings.contrast !== undefined) {
    operations.push({
      name: "contrast",
      fn: () => setCameraContrast(camera, settings.contrast!),
    });
  }
  
  if (settings.sharpness !== undefined) {
    operations.push({
      name: "sharpness",
      fn: () => setCameraSharpness(camera, settings.sharpness!),
    });
  }
  
  if (settings.hue !== undefined) {
    operations.push({
      name: "hue",
      fn: () => setCameraHue(camera, settings.hue!),
    });
  }
  
  for (const op of operations) {
    const result = await op.fn();
    if (result) {
      applied.push(op.name);
    } else {
      failed.push(op.name);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  
  return {
    success: failed.length === 0,
    applied,
    failed,
  };
}

export async function resetCameraImageSettings(camera: CameraProfile): Promise<boolean> {
  const result = await applyCameraImageSettings(camera, DEFAULT_IMAGE_SETTINGS);
  return result.success;
}

export async function sendFineTuneMove(
  camera: CameraProfile,
  direction: PtzDirection,
  durationMs: number = 150
): Promise<boolean> {
  if (direction === "stop") return true;
  
  const lowSpeed = 2;
  let stopped = false;
  
  const ensureStop = async () => {
    if (!stopped) {
      stopped = true;
      await sendPtzViscaCommand(camera, "stop", lowSpeed, lowSpeed);
    }
  };
  
  try {
    const started = await sendPtzViscaCommand(camera, direction, lowSpeed, lowSpeed);
    if (!started) {
      return false;
    }
    
    await new Promise(resolve => setTimeout(resolve, durationMs));
    await ensureStop();
    return true;
  } catch (err: any) {
    console.error("[Camera] Fine-tune error:", err?.message || err);
    await ensureStop();
    return false;
  }
}
