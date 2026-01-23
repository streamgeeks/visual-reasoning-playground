import { CameraProfile } from "./storage";

export interface CameraConnectionState {
  connected: boolean;
  fps: number;
  frameCount: number;
  lastError: string | null;
}

export function getCameraSnapshotUrl(camera: CameraProfile): string {
  const auth = camera.password 
    ? `${camera.username}:${camera.password}@` 
    : camera.username 
      ? `${camera.username}@` 
      : "";
  
  return `http://${auth}${camera.ipAddress}:${camera.httpPort}/cgi-bin/snapshot.cgi`;
}

export function getCameraMjpegUrl(camera: CameraProfile): string {
  const auth = camera.password 
    ? `${camera.username}:${camera.password}@` 
    : camera.username 
      ? `${camera.username}@` 
      : "";
  
  const streamPath = camera.streamQuality === "high" ? "1" : "2";
  return `http://${auth}${camera.ipAddress}:${camera.httpPort}/cgi-bin/mjpg/video.cgi?stream=${streamPath}`;
}

export async function testCameraConnection(camera: CameraProfile): Promise<boolean> {
  try {
    const url = getCameraSnapshotUrl(camera);
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.log("Camera connection test failed:", error);
    return false;
  }
}

export async function fetchCameraFrame(camera: CameraProfile): Promise<string | null> {
  try {
    const url = getCameraSnapshotUrl(camera);
    const timestamp = Date.now();
    const response = await fetch(`${url}?t=${timestamp}`, {
      method: "GET",
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

export function getPtzControlUrl(camera: CameraProfile, command: string): string {
  return `http://${camera.ipAddress}:${camera.httpPort}/cgi-bin/ptzctrl.cgi?${command}`;
}

export async function sendPtzCommand(camera: CameraProfile, command: string): Promise<boolean> {
  try {
    const url = getPtzControlUrl(camera, command);
    const auth = camera.password 
      ? btoa(`${camera.username}:${camera.password}`)
      : null;
    
    const headers: HeadersInit = {};
    if (auth) {
      headers["Authorization"] = `Basic ${auth}`;
    }
    
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
