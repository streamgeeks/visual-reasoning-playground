import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type CloudActivityType = "moondream_query" | "moondream_detect" | "idle";

interface CloudActivity {
  type: CloudActivityType;
  startTime: number;
  description?: string;
}

interface CloudActivityStats {
  totalRequests: number;
  totalDataSentBytes: number;
  lastActivityTime: number | null;
  sessionStartTime: number;
}

interface CloudActivityContextType {
  currentActivity: CloudActivity | null;
  isActive: boolean;
  stats: CloudActivityStats;
  startActivity: (type: CloudActivityType, description?: string) => void;
  endActivity: () => void;
  recordDataSent: (bytes: number) => void;
  resetStats: () => void;
}

const CloudActivityContext = createContext<CloudActivityContextType | null>(null);

export function CloudActivityProvider({ children }: { children: ReactNode }) {
  const [currentActivity, setCurrentActivity] = useState<CloudActivity | null>(null);
  const [stats, setStats] = useState<CloudActivityStats>({
    totalRequests: 0,
    totalDataSentBytes: 0,
    lastActivityTime: null,
    sessionStartTime: Date.now(),
  });

  const startActivity = useCallback((type: CloudActivityType, description?: string) => {
    setCurrentActivity({
      type,
      startTime: Date.now(),
      description,
    });
    setStats((prev) => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      lastActivityTime: Date.now(),
    }));
  }, []);

  const endActivity = useCallback(() => {
    setCurrentActivity(null);
  }, []);

  const recordDataSent = useCallback((bytes: number) => {
    setStats((prev) => ({
      ...prev,
      totalDataSentBytes: prev.totalDataSentBytes + bytes,
    }));
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      totalRequests: 0,
      totalDataSentBytes: 0,
      lastActivityTime: null,
      sessionStartTime: Date.now(),
    });
  }, []);

  return (
    <CloudActivityContext.Provider
      value={{
        currentActivity,
        isActive: currentActivity !== null,
        stats,
        startActivity,
        endActivity,
        recordDataSent,
        resetStats,
      }}
    >
      {children}
    </CloudActivityContext.Provider>
  );
}

export function useCloudActivity() {
  const context = useContext(CloudActivityContext);
  if (!context) {
    throw new Error("useCloudActivity must be used within CloudActivityProvider");
  }
  return context;
}

export function formatDataSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
