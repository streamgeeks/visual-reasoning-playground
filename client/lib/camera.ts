import { Platform } from "react-native";
import { CameraProfile } from "./storage";

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
    return null;
  }
  
  const separator = activeSnapshotConfig.url.includes("?") ? "&" : "?";
  const url = `${activeSnapshotConfig.url}${separator}t=${Date.now()}`;
  
  const timeout = createTimeoutSignal(2000);
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
  } catch (error) {
    timeout.clear();
    return null;
  }
}

export function clearActiveConfig() {
  activeSnapshotConfig = null;
}

export function getMjpegUrl(camera: CameraProfile): string {
  const base = `http://${camera.ipAddress}:${camera.httpPort}`;
  if (camera.username && camera.password) {
    return `${base}/cgi-bin/mjpg/video.cgi?usr=${encodeURIComponent(camera.username)}&pwd=${encodeURIComponent(camera.password)}`;
  }
  return `${base}/cgi-bin/mjpg/video.cgi`;
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

export async function sendPtzCommand(camera: CameraProfile, command: string): Promise<boolean> {
  const timeout = createTimeoutSignal(2000);
  try {
    const url = getPtzControlUrl(camera, command);
    const headers = getBasicAuthHeader(camera);
    
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: timeout.signal,
    });
    
    timeout.clear();
    return response.ok;
  } catch (error) {
    timeout.clear();
    console.log("PTZ command error:", error);
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
} as const;
