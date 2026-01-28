import * as FileSystem from "expo-file-system";
import { getSecuritySettings } from "./storage";

const CAPTURE_DIR = `${FileSystem.cacheDirectory}captures/`;

let pendingClears: Map<string, NodeJS.Timeout> = new Map();

export async function ensureCaptureDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CAPTURE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CAPTURE_DIR, { intermediates: true });
  }
}

export async function saveTempCapture(base64Data: string): Promise<string> {
  await ensureCaptureDirectory();
  const filename = `capture_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
  const filepath = `${CAPTURE_DIR}${filename}`;
  
  await FileSystem.writeAsStringAsync(filepath, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  const settings = await getSecuritySettings();
  if (settings.autoClearCapturesEnabled) {
    scheduleAutoClear(filepath, settings.autoClearDelaySeconds * 1000);
  }
  
  return filepath;
}

export function scheduleAutoClear(filepath: string, delayMs: number): void {
  if (pendingClears.has(filepath)) {
    clearTimeout(pendingClears.get(filepath)!);
  }
  
  const timeout = setTimeout(async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filepath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filepath, { idempotent: true });
      }
    } catch {
    }
    pendingClears.delete(filepath);
  }, delayMs);
  
  pendingClears.set(filepath, timeout);
}

export async function clearCapture(filepath: string): Promise<void> {
  if (pendingClears.has(filepath)) {
    clearTimeout(pendingClears.get(filepath)!);
    pendingClears.delete(filepath);
  }
  
  try {
    const fileInfo = await FileSystem.getInfoAsync(filepath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filepath, { idempotent: true });
    }
  } catch {
  }
}

export async function clearAllCaptures(): Promise<number> {
  pendingClears.forEach((timeout) => clearTimeout(timeout));
  pendingClears.clear();
  
  try {
    const dirInfo = await FileSystem.getInfoAsync(CAPTURE_DIR);
    if (!dirInfo.exists) {
      return 0;
    }
    
    const files = await FileSystem.readDirectoryAsync(CAPTURE_DIR);
    let cleared = 0;
    
    for (const file of files) {
      try {
        await FileSystem.deleteAsync(`${CAPTURE_DIR}${file}`, { idempotent: true });
        cleared++;
      } catch {
      }
    }
    
    return cleared;
  } catch {
    return 0;
  }
}

export async function getCaptureStats(): Promise<{
  count: number;
  totalSizeBytes: number;
}> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CAPTURE_DIR);
    if (!dirInfo.exists) {
      return { count: 0, totalSizeBytes: 0 };
    }
    
    const files = await FileSystem.readDirectoryAsync(CAPTURE_DIR);
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(`${CAPTURE_DIR}${file}`);
        if (fileInfo.exists && "size" in fileInfo) {
          totalSize += fileInfo.size || 0;
        }
      } catch {
      }
    }
    
    return { count: files.length, totalSizeBytes: totalSize };
  } catch {
    return { count: 0, totalSizeBytes: 0 };
  }
}

export async function immediatelyClearAfterProcessing(
  base64Data: string,
  processFunction: (data: string) => Promise<void>
): Promise<void> {
  const settings = await getSecuritySettings();
  
  if (settings.autoClearCapturesEnabled) {
    await processFunction(base64Data);
  } else {
    await processFunction(base64Data);
  }
}
