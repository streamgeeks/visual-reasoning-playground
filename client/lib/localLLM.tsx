import React, { createContext, useContext, useCallback, ReactNode } from "react";

interface ObjectForRanking {
  id: string;
  name: string;
  category: string;
  relativeLocation: string;
}

interface RankedObject {
  id: string;
  importance: number;
  reason: string;
}

interface LocalLLMContextValue {
  isReady: boolean;
  isGenerating: boolean;
  downloadProgress: number;
  error: string | null;
  rankObjects: (objects: ObjectForRanking[]) => Promise<RankedObject[]>;
  generateText: (prompt: string) => Promise<string>;
}

const LocalLLMContext = createContext<LocalLLMContextValue | null>(null);

interface LocalLLMProviderProps {
  children: ReactNode;
}

export function LocalLLMProvider({ children }: LocalLLMProviderProps) {
  const generateText = useCallback(async (_prompt: string): Promise<string> => {
    throw new Error("Local LLM requires native iOS build with react-native-executorch");
  }, []);

  const rankObjects = useCallback(async (objects: ObjectForRanking[]): Promise<RankedObject[]> => {
    console.log("[LocalLLM] Using intelligent fallback ranking");
    return fallbackRanking(objects);
  }, []);

  const value: LocalLLMContextValue = {
    isReady: false,
    isGenerating: false,
    downloadProgress: 0,
    error: null,
    rankObjects,
    generateText,
  };

  return (
    <LocalLLMContext.Provider value={value}>
      {children}
    </LocalLLMContext.Provider>
  );
}

export function useLocalLLM(): LocalLLMContextValue {
  const context = useContext(LocalLLMContext);
  if (!context) {
    return {
      isReady: false,
      isGenerating: false,
      downloadProgress: 0,
      error: "LocalLLMProvider not found in tree",
      rankObjects: async (objects) => fallbackRanking(objects),
      generateText: async () => { throw new Error("LocalLLMProvider not found"); },
    };
  }
  return context;
}

function parseRankingResponse(response: string, objects: ObjectForRanking[]): RankedObject[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log("[LocalLLM] No JSON array found in response");
      return fallbackRanking(objects);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{ id?: string; importance?: number; reason?: string }>;
    
    const validIds = new Set(objects.map(o => o.id));
    const results: RankedObject[] = [];

    for (const item of parsed) {
      if (item.id && validIds.has(item.id)) {
        results.push({
          id: item.id,
          importance: Math.min(10, Math.max(1, Math.round(item.importance || 5))),
          reason: item.reason || "",
        });
      }
    }

    const resultIds = new Set(results.map(r => r.id));
    for (const obj of objects) {
      if (!resultIds.has(obj.id)) {
        results.push({
          id: obj.id,
          importance: 5,
          reason: "Not ranked by model",
        });
      }
    }

    return results;
  } catch (err) {
    console.error("[LocalLLM] Failed to parse response:", err);
    return fallbackRanking(objects);
  }
}

const CATEGORY_IMPORTANCE: Record<string, number> = {
  safety: 9,
  security: 8,
  electronics: 7,
  furniture: 4,
  decoration: 3,
  storage: 5,
  lighting: 4,
  plant: 3,
  appliance: 6,
  other: 5,
};

const KEYWORD_BOOSTS: Array<{ pattern: RegExp; boost: number; reason: string }> = [
  { pattern: /door|entrance|exit/i, boost: 3, reason: "Entry/exit point" },
  { pattern: /window/i, boost: 2, reason: "Potential entry point" },
  { pattern: /fire|smoke|alarm/i, boost: 4, reason: "Safety device" },
  { pattern: /safe|vault|lock/i, boost: 3, reason: "Security item" },
  { pattern: /computer|laptop|monitor/i, boost: 2, reason: "Valuable electronics" },
  { pattern: /tv|television/i, boost: 1, reason: "Entertainment device" },
  { pattern: /camera|sensor/i, boost: 2, reason: "Monitoring device" },
  { pattern: /knife|weapon|gun/i, boost: 4, reason: "Potential hazard" },
  { pattern: /medication|medicine|pills/i, boost: 2, reason: "Health item" },
  { pattern: /baby|child|pet/i, boost: 3, reason: "Requires monitoring" },
  { pattern: /wallet|purse|keys/i, boost: 2, reason: "Personal valuables" },
];

function fallbackRanking(objects: ObjectForRanking[]): RankedObject[] {
  return objects.map(obj => {
    let baseScore = CATEGORY_IMPORTANCE[obj.category] || 5;
    let reason = `${obj.category} category`;

    for (const { pattern, boost, reason: boostReason } of KEYWORD_BOOSTS) {
      if (pattern.test(obj.name)) {
        baseScore = Math.min(10, baseScore + boost);
        reason = boostReason;
        break;
      }
    }

    return {
      id: obj.id,
      importance: baseScore,
      reason,
    };
  });
}

export { fallbackRanking };
