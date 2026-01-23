import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Image, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { CameraProfile } from "@/lib/storage";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface StreamStats {
  fps: number;
  avgLatency: number;
}

interface OptimizedSnapshotStreamProps {
  camera: CameraProfile;
  targetFps?: number;
  onFpsUpdate?: (stats: StreamStats) => void;
  onFrameUpdate?: (frameUri: string) => void;
  onError?: (error: string) => void;
  style?: any;
}

export function OptimizedSnapshotStream({
  camera,
  targetFps = 8,
  onFpsUpdate,
  onFrameUpdate,
  onError,
  style,
}: OptimizedSnapshotStreamProps) {
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualFps, setActualFps] = useState(0);

  const activeRequestsRef = useRef(0);
  const maxConcurrentRequests = 2;
  const streamingRef = useRef(false);
  const fpsCounterRef = useRef<{ count: number; lastTime: number; times: Array<{ timestamp: number; requestTime: number }> }>({
    count: 0,
    lastTime: Date.now(),
    times: [],
  });
  const abortControllersRef = useRef<AbortController[]>([]);
  const frameSequenceRef = useRef(0);
  const lastDisplayedSequenceRef = useRef(0);

  // Build snapshot URL - use the working endpoint from logs
  const getSnapshotUrl = useCallback(() => {
    const base = `http://${camera.ipAddress}:${camera.httpPort}`;
    // Use snapshot.jpg which was confirmed working
    return `${base}/snapshot.jpg`;
  }, [camera]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const updateFpsCounter = useCallback((requestTime: number) => {
    const now = Date.now();
    fpsCounterRef.current.count++;
    fpsCounterRef.current.times.push({ timestamp: now, requestTime });

    // Keep only last 30 frames for FPS calculation
    if (fpsCounterRef.current.times.length > 30) {
      fpsCounterRef.current.times.shift();
    }

    const elapsed = now - fpsCounterRef.current.lastTime;

    // Update FPS every second
    if (elapsed >= 1000) {
      const fps = Math.round(fpsCounterRef.current.count / (elapsed / 1000));
      setActualFps(fps);

      if (onFpsUpdate) {
        const avgRequestTime =
          fpsCounterRef.current.times.reduce((sum, t) => sum + t.requestTime, 0) /
          fpsCounterRef.current.times.length;

        onFpsUpdate({
          fps,
          avgLatency: Math.round(avgRequestTime),
        });
      }

      fpsCounterRef.current = {
        count: 0,
        lastTime: now,
        times: fpsCounterRef.current.times,
      };
    }
  }, [onFpsUpdate]);

  const fetchFrame = useCallback(async (sequence: number) => {
    const abortController = new AbortController();
    abortControllersRef.current.push(abortController);

    activeRequestsRef.current++;
    const requestStart = Date.now();

    try {
      // Aggressive timeout - camera should respond quickly
      const timeoutId = setTimeout(() => abortController.abort(), 800);

      const response = await fetch(getSnapshotUrl(), {
        method: "GET",
        signal: abortController.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const requestTime = Date.now() - requestStart;

      // For React Native, we need to convert to base64
      if (Platform.OS !== "web") {
        const blob = await response.blob();
        const reader = new FileReader();
        
        return new Promise<void>((resolve) => {
          reader.onloadend = () => {
            // Only update if this is the newest frame (avoid out-of-order updates)
            if (sequence > lastDisplayedSequenceRef.current) {
              lastDisplayedSequenceRef.current = sequence;
              const base64data = reader.result as string;
              setCurrentFrame(base64data);
              onFrameUpdate?.(base64data);
              updateFpsCounter(requestTime);
            }
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(blob);
        });
      } else {
        // Web: use blob URL
        const blob = await response.blob();
        if (sequence > lastDisplayedSequenceRef.current) {
          lastDisplayedSequenceRef.current = sequence;
          const blobUrl = URL.createObjectURL(blob);
          setCurrentFrame(blobUrl);
          onFrameUpdate?.(blobUrl);
          updateFpsCounter(requestTime);
        }
      }

      // Clear error on successful fetch
      if (error) setError(null);
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Timeout - expected for slow responses
        console.log("Request timeout (>800ms)");
      } else {
        console.error("Snapshot error:", err);
        setError(err.message);
        onError?.(err.message);
      }
    } finally {
      activeRequestsRef.current--;

      // Remove from abort controllers list
      const index = abortControllersRef.current.indexOf(abortController);
      if (index > -1) {
        abortControllersRef.current.splice(index, 1);
      }
    }
  }, [getSnapshotUrl, error, onFrameUpdate, onError, updateFpsCounter]);

  const requestLoop = useCallback(async () => {
    while (streamingRef.current) {
      // Limit concurrent requests
      if (activeRequestsRef.current >= maxConcurrentRequests) {
        await sleep(10);
        continue;
      }

      const sequence = ++frameSequenceRef.current;
      fetchFrame(sequence);

      // Adaptive delay based on target FPS
      const delay = Math.max(1000 / targetFps, 50);
      await sleep(delay);
    }
  }, [fetchFrame, targetFps]);

  const startStreaming = useCallback(() => {
    if (streamingRef.current) return;

    streamingRef.current = true;
    setIsStreaming(true);
    setError(null);
    frameSequenceRef.current = 0;
    lastDisplayedSequenceRef.current = 0;

    // Start multiple concurrent request loops
    for (let i = 0; i < maxConcurrentRequests; i++) {
      requestLoop();
    }
  }, [requestLoop]);

  const stopStreaming = useCallback(() => {
    streamingRef.current = false;
    setIsStreaming(false);

    // Abort all active requests
    abortControllersRef.current.forEach((controller) => {
      try {
        controller.abort();
      } catch (e) {}
    });
    abortControllersRef.current = [];
  }, []);

  useEffect(() => {
    startStreaming();

    return () => {
      stopStreaming();
    };
  }, [camera.ipAddress, camera.httpPort]);

  if (error && !currentFrame) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorText}>Connection Error</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <Text style={styles.errorHint}>Check camera IP: {camera.ipAddress}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {currentFrame ? (
        <Image source={{ uri: currentFrame }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Connecting to camera...</Text>
        </View>
      )}

      {isStreaming && actualFps > 0 ? (
        <View style={styles.fpsContainer}>
          <Text style={styles.fpsText}>{actualFps} FPS</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: Spacing.md,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: Spacing.sm,
  },
  errorDetail: {
    color: "#ff8888",
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  errorHint: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  fpsContainer: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  fpsText: {
    color: Colors.dark.success,
    fontSize: 14,
    fontWeight: "bold",
  },
});
