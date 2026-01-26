import dgram from "react-native-udp";

const VISCA_PORT = 1259;
const VISCA_TIMEOUT = 100;

let socket: any = null;
let socketReady = false;
let socketInitializing = false;

export interface ViscaConfig {
  ipAddress: string;
  port?: number;
}

function ensureSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket && socketReady) {
      console.log("[VISCA] Socket already ready");
      resolve();
      return;
    }

    if (socketInitializing) {
      const checkInterval = setInterval(() => {
        if (socketReady) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!socketReady) reject(new Error("Socket initialization timeout"));
      }, 3000);
      return;
    }

    socketInitializing = true;
    console.log("[VISCA] Creating UDP socket...");

    try {
      socket = dgram.createSocket({ type: "udp4" });
      
      socket.once("listening", () => {
        socketReady = true;
        socketInitializing = false;
        const addr = socket.address();
        console.log(`[VISCA] Socket ready, bound to port ${addr?.port || "unknown"}`);
        resolve();
      });

      socket.once("error", (err: Error) => {
        console.error("[VISCA] Socket error:", err.message);
        socketReady = false;
        socketInitializing = false;
        socket = null;
        reject(err);
      });

      socket.bind(0);
    } catch (err: any) {
      console.error("[VISCA] Failed to create socket:", err?.message || err);
      socketInitializing = false;
      reject(err);
    }
  });
}

function sendViscaCommand(ip: string, port: number, command: number[]): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      await ensureSocket();
      
      // Use Uint8Array instead of Buffer (Buffer not available in React Native without polyfill)
      const data = new Uint8Array(command);
      const hexCmd = command.map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`[VISCA] Sending to ${ip}:${port} -> ${hexCmd}`);
      
      socket.send(data, 0, data.length, port, ip, (err: Error | null) => {
        if (err) {
          console.error("[VISCA] Send error:", err.message);
          resolve(false);
        } else {
          console.log("[VISCA] Command sent successfully");
          resolve(true);
        }
      });
    } catch (err: any) {
      console.error("[VISCA] Error:", err?.message || err);
      resolve(false);
    }
  });
}

function clampSpeed(speed: number): number {
  return Math.max(1, Math.min(24, Math.round(speed)));
}

export async function viscaPanTilt(
  config: ViscaConfig,
  panSpeed: number,
  tiltSpeed: number,
  direction: "up" | "down" | "left" | "right" | "upleft" | "upright" | "downleft" | "downright" | "stop"
): Promise<boolean> {
  const ps = clampSpeed(panSpeed);
  const ts = clampSpeed(tiltSpeed);
  const port = config.port || VISCA_PORT;

  let panDir: number;
  let tiltDir: number;

  switch (direction) {
    case "up":
      panDir = 0x03; tiltDir = 0x01;
      break;
    case "down":
      panDir = 0x03; tiltDir = 0x02;
      break;
    case "left":
      panDir = 0x01; tiltDir = 0x03;
      break;
    case "right":
      panDir = 0x02; tiltDir = 0x03;
      break;
    case "upleft":
      panDir = 0x01; tiltDir = 0x01;
      break;
    case "upright":
      panDir = 0x02; tiltDir = 0x01;
      break;
    case "downleft":
      panDir = 0x01; tiltDir = 0x02;
      break;
    case "downright":
      panDir = 0x02; tiltDir = 0x02;
      break;
    case "stop":
    default:
      panDir = 0x03; tiltDir = 0x03;
      break;
  }

  const command = [
    0x81,
    0x01,
    0x06,
    0x01,
    ps,
    ts,
    panDir,
    tiltDir,
    0xFF,
  ];

  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaZoom(
  config: ViscaConfig,
  direction: "in" | "out" | "stop",
  speed: number = 7
): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const s = Math.max(0, Math.min(7, speed));

  let zoomByte: number;
  switch (direction) {
    case "in":
      zoomByte = 0x20 | s;
      break;
    case "out":
      zoomByte = 0x30 | s;
      break;
    case "stop":
    default:
      zoomByte = 0x00;
      break;
  }

  const command = [0x81, 0x01, 0x04, 0x07, zoomByte, 0xFF];
  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaHome(config: ViscaConfig): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const command = [0x81, 0x01, 0x06, 0x04, 0xFF];
  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaPresetSave(
  config: ViscaConfig,
  slot: number
): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const presetNum = Math.max(0, Math.min(254, slot));
  const command = [0x81, 0x01, 0x04, 0x3F, 0x01, presetNum, 0xFF];
  console.log(`[VISCA] Saving preset to slot ${presetNum}`);
  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaPresetRecall(
  config: ViscaConfig,
  slot: number
): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const presetNum = Math.max(0, Math.min(254, slot));
  const command = [0x81, 0x01, 0x04, 0x3F, 0x02, presetNum, 0xFF];
  console.log(`[VISCA] Recalling preset from slot ${presetNum}`);
  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaAbsolutePosition(
  config: ViscaConfig,
  panSpeed: number,
  tiltSpeed: number,
  panPosition: number,
  tiltPosition: number
): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const ps = clampSpeed(panSpeed);
  const ts = clampSpeed(tiltSpeed);
  
  const pan = Math.max(0, Math.min(0xFFFF, panPosition));
  const tilt = Math.max(0, Math.min(0xFFFF, tiltPosition));
  
  const command = [
    0x81, 0x01, 0x06, 0x02,
    ps, ts,
    (pan >> 12) & 0x0F,
    (pan >> 8) & 0x0F,
    (pan >> 4) & 0x0F,
    pan & 0x0F,
    (tilt >> 12) & 0x0F,
    (tilt >> 8) & 0x0F,
    (tilt >> 4) & 0x0F,
    tilt & 0x0F,
    0xFF
  ];
  
  console.log(`[VISCA] Moving to absolute position pan=${pan}, tilt=${tilt}`);
  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaZoomDirect(
  config: ViscaConfig,
  zoomPosition: number
): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const zoom = Math.max(0, Math.min(0x4000, zoomPosition));
  
  const command = [
    0x81, 0x01, 0x04, 0x47,
    (zoom >> 12) & 0x0F,
    (zoom >> 8) & 0x0F,
    (zoom >> 4) & 0x0F,
    zoom & 0x0F,
    0xFF
  ];
  
  console.log(`[VISCA] Setting zoom to ${zoom}`);
  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaFocus(
  config: ViscaConfig,
  direction: "near" | "far" | "stop",
  speed: number = 3
): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const s = Math.max(0, Math.min(7, speed));

  let focusByte: number;
  switch (direction) {
    case "near":
      focusByte = 0x20 | s;
      break;
    case "far":
      focusByte = 0x30 | s;
      break;
    case "stop":
    default:
      focusByte = 0x00;
      break;
  }

  const command = [0x81, 0x01, 0x04, 0x08, focusByte, 0xFF];
  console.log(`[VISCA] Focus ${direction} @ speed ${s}`);
  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaAutoFocus(
  config: ViscaConfig,
  enabled: boolean
): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const command = [0x81, 0x01, 0x04, 0x38, enabled ? 0x02 : 0x03, 0xFF];
  console.log(`[VISCA] Auto focus ${enabled ? "ON" : "OFF (manual)"}`);
  return sendViscaCommand(config.ipAddress, port, command);
}

export async function viscaOnePushAutoFocus(config: ViscaConfig): Promise<boolean> {
  const port = config.port || VISCA_PORT;
  const command = [0x81, 0x01, 0x04, 0x18, 0x01, 0xFF];
  console.log(`[VISCA] One-push auto focus triggered`);
  return sendViscaCommand(config.ipAddress, port, command);
}

export function closeViscaSocket(): void {
  if (socket) {
    try {
      socket.close();
    } catch (e) {}
    socket = null;
    socketReady = false;
  }
}
