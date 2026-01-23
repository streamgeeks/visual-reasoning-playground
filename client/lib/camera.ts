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

export function getCameraSnapshotUrl(camera: CameraProfile): string {
  const authParams = camera.username && camera.password 
    ? `?usr=${encodeURIComponent(camera.username)}&pwd=${encodeURIComponent(camera.password)}`
    : "";
  return `http://${camera.ipAddress}:${camera.httpPort}/cgi-bin/snapshot.cgi${authParams}`;
}

export function getCameraMjpegUrl(camera: CameraProfile): string {
  const streamPath = camera.streamQuality === "high" ? "1" : "2";
  return `http://${camera.ipAddress}:${camera.httpPort}/cgi-bin/mjpg/video.cgi?stream=${streamPath}`;
}

export function getRtspUrl(camera: CameraProfile): string {
  const auth = camera.username && camera.password 
    ? `${camera.username}:${camera.password}@` 
    : "";
  const stream = camera.streamQuality === "high" ? "1" : "2";
  return `rtsp://${auth}${camera.ipAddress}:${camera.rtspPort}/${stream}`;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
}

export async function testCameraConnection(camera: CameraProfile): Promise<ConnectionTestResult> {
  const timeout = createTimeoutSignal(8000);
  try {
    const url = getCameraSnapshotUrl(camera);
    console.log(`Testing camera: ${url}`);
    
    const response = await fetch(url, {
      method: "GET",
      signal: timeout.signal,
    });
    
    timeout.clear();
    
    console.log(`Camera response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      console.log(`Content-Type: ${contentType}`);
      if (contentType.includes("image") || contentType.includes("jpeg") || contentType.includes("jpg")) {
        console.log("Camera connected successfully!");
        return { success: true };
      }
      return { success: false, error: `Unexpected response type: ${contentType}` };
    }
    
    if (response.status === 401) {
      return { success: false, error: "Authentication failed. Check username and password in Settings." };
    }
    
    return { success: false, error: `Camera returned error: ${response.status}` };
  } catch (error: any) {
    timeout.clear();
    console.log(`Connection failed:`, error.message);
    
    if (error.name === "AbortError") {
      return { success: false, error: "Connection timed out. Check IP address and make sure camera is on." };
    }
    
    return { 
      success: false, 
      error: "Could not connect. Make sure your phone is on the same WiFi network as the camera." 
    };
  }
}

export async function fetchCameraFrame(camera: CameraProfile): Promise<string | null> {
  const timeout = createTimeoutSignal(3000);
  try {
    const baseUrl = getCameraSnapshotUrl(camera);
    const separator = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${separator}t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: "GET",
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

export async function sendPtzPosition(
  camera: CameraProfile, 
  pan: number, 
  tilt: number, 
  speed: number = 5
): Promise<boolean> {
  return sendPtzCommand(camera, `ptzcmd&poscall&${pan}&${tilt}&${speed}`);
}

export async function sendZoomLevel(camera: CameraProfile, level: number): Promise<boolean> {
  return sendPtzCommand(camera, `ptzcmd&zoomcall&${level}`);
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
