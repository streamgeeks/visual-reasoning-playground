import { getApiUrl } from "./query-client";
import { CameraProfile } from "./storage";

const RTSP_BACKEND_PORT = 8082;

function getRtspApiUrl(): string {
  const apiUrl = getApiUrl();
  const url = new URL(apiUrl);
  url.port = RTSP_BACKEND_PORT.toString();
  return url.toString();
}

export interface CameraStatus {
  cameraId: string;
  connected: boolean;
  fps: number;
  lastFrameTime: number | null;
  frameCount: number;
}

export async function connectCamera(camera: CameraProfile): Promise<boolean> {
  try {
    const response = await fetch(`${getRtspApiUrl()}api/cameras/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cameraId: camera.id,
        ip: camera.ipAddress,
        username: camera.username,
        password: camera.password,
        streamPath: "/1",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to connect");
    }

    return true;
  } catch (error) {
    console.error("RTSP connect error:", error);
    throw error;
  }
}

export async function disconnectCamera(cameraId: string): Promise<void> {
  try {
    await fetch(`${getRtspApiUrl()}api/cameras/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cameraId }),
    });
  } catch (error) {
    console.error("RTSP disconnect error:", error);
  }
}

export async function getCameraStatus(cameraId: string): Promise<CameraStatus | null> {
  try {
    const response = await fetch(`${getRtspApiUrl()}api/cameras/${cameraId}/status`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function getFrameUrl(cameraId: string): string {
  return `${getRtspApiUrl()}api/cameras/${cameraId}/frame`;
}

export async function fetchFrame(cameraId: string): Promise<string | null> {
  try {
    const response = await fetch(getFrameUrl(cameraId));
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function checkRtspBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getRtspApiUrl()}health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
