import { CameraProfile } from "./storage";

export interface CameraConnectionState {
  connected: boolean;
  fps: number;
  frameCount: number;
  lastError: string | null;
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
  
  // Method 1: Query parameters (PTZOptics style)
  if (camera.username && camera.password) {
    configs.push({
      url: `${base}/cgi-bin/snapshot.cgi?usr=${encodeURIComponent(camera.username)}&pwd=${encodeURIComponent(camera.password)}`,
      name: "Query params auth",
    });
  }
  
  // Method 2: HTTP Basic Auth header
  if (camera.username && camera.password) {
    configs.push({
      url: `${base}/cgi-bin/snapshot.cgi`,
      headers: {
        "Authorization": `Basic ${btoa(`${camera.username}:${camera.password}`)}`,
      },
      name: "Basic Auth header",
    });
  }
  
  // Method 3: No auth (some cameras allow public access to snapshots)
  configs.push({
    url: `${base}/cgi-bin/snapshot.cgi`,
    name: "No auth",
  });
  
  // Method 4: Alternative snapshot endpoints
  configs.push({
    url: `${base}/snapshot.jpg`,
    headers: camera.username && camera.password ? {
      "Authorization": `Basic ${btoa(`${camera.username}:${camera.password}`)}`,
    } : undefined,
    name: "snapshot.jpg",
  });
  
  configs.push({
    url: `${base}/jpg/image.jpg`,
    headers: camera.username && camera.password ? {
      "Authorization": `Basic ${btoa(`${camera.username}:${camera.password}`)}`,
    } : undefined,
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

export async function fetchCameraFrame(camera: CameraProfile): Promise<string | null> {
  if (!activeSnapshotConfig) {
    return null;
  }
  
  const timeout = createTimeoutSignal(3000);
  try {
    const separator = activeSnapshotConfig.url.includes("?") ? "&" : "?";
    const url = `${activeSnapshotConfig.url}${separator}t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: activeSnapshotConfig.headers,
      signal: timeout.signal,
    });
    
    timeout.clear();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    timeout.clear();
    console.log("Frame fetch error:", error);
    return null;
  }
}

export function clearActiveConfig() {
  activeSnapshotConfig = null;
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
