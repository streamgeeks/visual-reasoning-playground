import { CameraProfile } from "./storage";

const RTSP_BACKEND_PORT = 8082;

function getBackendUrl(): string {
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    return `http://${hostname}:${RTSP_BACKEND_PORT}`;
  }
  return `http://localhost:${RTSP_BACKEND_PORT}`;
}

export interface BackendStatus {
  available: boolean;
  activeCameras: number;
  uptime: number;
}

export interface RtspConnectionResult {
  success: boolean;
  cameraId?: string;
  error?: string;
}

export async function checkBackendHealth(): Promise<BackendStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${getBackendUrl()}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        activeCameras: data.activeCameras || 0,
        uptime: data.uptime || 0,
      };
    }
    
    return { available: false, activeCameras: 0, uptime: 0 };
  } catch (error) {
    return { available: false, activeCameras: 0, uptime: 0 };
  }
}

export async function connectCameraRtsp(
  camera: CameraProfile
): Promise<RtspConnectionResult> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/cameras/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cameraId: camera.id,
        ip: camera.ipAddress,
        username: camera.username || "admin",
        password: camera.password || "",
        streamPath: "/1",
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, cameraId: data.cameraId };
    }
    
    const error = await response.text();
    return { success: false, error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function disconnectCameraRtsp(cameraId: string): Promise<boolean> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/cameras/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraId }),
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function fetchRtspFrame(cameraId: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    
    const response = await fetch(
      `${getBackendUrl()}/api/cameras/${cameraId}/frame?t=${Date.now()}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    const blob = await response.blob();
    
    if (typeof URL !== "undefined" && URL.createObjectURL) {
      return URL.createObjectURL(blob);
    }
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
}

export async function getCameraStatus(cameraId: string): Promise<{
  connected: boolean;
  frameRate: number;
  frameCount: number;
} | null> {
  try {
    const response = await fetch(
      `${getBackendUrl()}/api/cameras/${cameraId}/status`
    );
    
    if (response.ok) {
      return await response.json();
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export function getRtspFrameUrl(cameraId: string): string {
  return `${getBackendUrl()}/api/cameras/${cameraId}/frame`;
}

export type StreamMode = "rtsp" | "snapshot" | "mjpeg";

export interface StreamModeInfo {
  mode: StreamMode;
  fps: number;
  label: string;
  description: string;
}
