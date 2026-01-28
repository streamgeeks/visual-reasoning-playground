import AsyncStorage from "@react-native-async-storage/async-storage";

const BUNDLED_API_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlfaWQiOiIxYzgxMmY0MS1kZjk2LTQwYTgtYTFjOS05YTQyMWNmYTYwYTYiLCJvcmdfaWQiOiI5VGh4NUZhM1hhSndxWkxRU2x5UGFneDRvUHF1bmpPcyIsImlhdCI6MTc2OTU1NTI4OSwidmVyIjoxfQ.1BytgWTKT5z-vbKFp67FCDT8BUk_WvgMwhN2D5lEoGs";

const USAGE_COUNT_KEY = "moondream_bundled_usage_count";
const FREE_TIER_LIMIT = 1000;

let cachedUsageCount: number | null = null;

export async function getBundledApiKeyUsage(): Promise<number> {
  if (cachedUsageCount !== null) {
    return cachedUsageCount;
  }

  try {
    const stored = await AsyncStorage.getItem(USAGE_COUNT_KEY);
    cachedUsageCount = stored ? parseInt(stored, 10) : 0;
    return cachedUsageCount;
  } catch {
    return 0;
  }
}

export async function incrementBundledApiKeyUsage(): Promise<number> {
  try {
    const current = await getBundledApiKeyUsage();
    const newCount = current + 1;
    cachedUsageCount = newCount;
    await AsyncStorage.setItem(USAGE_COUNT_KEY, newCount.toString());
    return newCount;
  } catch {
    return cachedUsageCount ?? 0;
  }
}

export async function isBundledKeyAvailable(): Promise<boolean> {
  const usage = await getBundledApiKeyUsage();
  return usage < FREE_TIER_LIMIT;
}

export async function getRemainingFreeCalls(): Promise<number> {
  const usage = await getBundledApiKeyUsage();
  return Math.max(0, FREE_TIER_LIMIT - usage);
}

export function getEffectiveApiKey(userApiKey: string | undefined): string {
  if (userApiKey && userApiKey.trim().length > 0) {
    return userApiKey;
  }
  return BUNDLED_API_KEY;
}

export async function shouldShowUpgradeHint(
  userApiKey: string | undefined,
): Promise<boolean> {
  if (userApiKey && userApiKey.trim().length > 0) {
    return false;
  }

  const available = await isBundledKeyAvailable();
  return !available;
}

export function isUsingBundledKey(userApiKey: string | undefined): boolean {
  return !userApiKey || userApiKey.trim().length === 0;
}

export async function trackApiCall(
  userApiKey: string | undefined,
): Promise<void> {
  if (isUsingBundledKey(userApiKey)) {
    await incrementBundledApiKeyUsage();
  }
}

export function getFreeTierLimit(): number {
  return FREE_TIER_LIMIT;
}
