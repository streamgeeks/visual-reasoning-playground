import { CameraProfile } from "./storage";

export interface CameraConnectionState {
  connected: boolean;
  fps: number;
  frameCount: number;
  lastError: string | null;
}

const SNAPSHOT_ENDPOINTS = [
  "/cgi-bin/snapshot.cgi",
  "/snapshot.jpg",
  "/image/jpeg.cgi",
  "/jpg/image.jpg",
  "/cgi-bin/jpg/image.cgi",
];

function getAuthHeaders(camera: CameraProfile): HeadersInit {
  const headers: HeadersInit = {};
  if (camera.username && camera.password) {
    const credentials = btoa(`${camera.username}:${camera.password}`);
    headers["Authorization"] = `Basic ${credentials}`;
  }
  return headers;
}

export function getCameraSnapshotUrl(camera: CameraProfile, endpoint?: string): string {
  const path = endpoint || SNAPSHOT_ENDPOINTS[0];
  return `http://${camera.ipAddress}:${camera.httpPort}${path}`;
}

export function getCameraMjpegUrl(camera: CameraProfile): string {
  const streamPath = camera.streamQuality === "high" ? "1" : "2";
  return `http://${camera.ipAddress}:${camera.httpPort}/cgi-bin/mjpg/video.cgi?stream=${streamPath}`;
}

export interface ConnectionTestResult {
  success: boolean;
  endpoint?: string;
  error?: string;
}

export async function testCameraConnection(camera: CameraProfile): Promise<ConnectionTestResult> {
  const headers = getAuthHeaders(camera);
  
  for (const endpoint of SNAPSHOT_ENDPOINTS) {
    try {
      const url = getCameraSnapshotUrl(camera, endpoint);
      console.log(`Testing camera endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("image")) {
          console.log(`Camera connected via: ${endpoint}`);
          return { success: true, endpoint };
        }
      }
      console.log(`Endpoint ${endpoint} returned status ${response.status}`);
    } catch (error: any) {
      console.log(`Endpoint ${endpoint} failed:`, error.message);
    }
  }
  
  return { 
    success: false, 
    error: "Could not connect. Make sure your phone is on the same WiFi network as the camera." 
  };
}

let cachedEndpoint: string | null = null;

export async function fetchCameraFrame(camera: CameraProfile): Promise<string | null> {
  try {
    const endpoint = cachedEndpoint || SNAPSHOT_ENDPOINTS[0];
    const url = getCameraSnapshotUrl(camera, endpoint);
    const timestamp = Date.now();
    const headers = getAuthHeaders(camera);
    
    const response = await fetch(`${url}?t=${timestamp}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(3000),
    });
    
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
    console.log("Frame fetch error:", error);
    return null;
  }
}

export function setCachedEndpoint(endpoint: string) {
  cachedEndpoint = endpoint;
}

export function clearCachedEndpoint() {
  cachedEndpoint = null;
}

export function getPtzControlUrl(camera: CameraProfile, command: string): string {
  return `http://${camera.ipAddress}:${camera.httpPort}/cgi-bin/ptzctrl.cgi?${command}`;
}

export async function sendPtzCommand(camera: CameraProfile, command: string): Promise<boolean> {
  try {
    const url = getPtzControlUrl(camera, command);
    const headers = getAuthHeaders(camera);
    
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(2000),
    });
    
    return response.ok;
  } catch (error) {
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
