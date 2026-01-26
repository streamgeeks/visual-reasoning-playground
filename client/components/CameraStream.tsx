import React, { useCallback } from "react";
import { StyleSheet } from "react-native";
import { CameraProfile } from "@/lib/storage";
import { OptimizedSnapshotStream } from "./OptimizedSnapshotStream";

// RTSP commented out - using snapshot mode only for simplicity
// import { RTSPStream } from "./RTSPStream";

export type StreamMode = "snapshot";

interface CameraStreamProps {
  camera: CameraProfile;
  streamMode?: StreamMode;
  onFpsUpdate?: (stats: { fps: number; avgLatency?: number }) => void;
  onFrameUpdate?: (frameUri: string) => void;
  onError?: (error: string) => void;
  style?: any;
}

export function CameraStream({
  camera,
  onFpsUpdate,
  onFrameUpdate,
  onError,
  style,
}: CameraStreamProps) {
  const handleSnapshotFps = useCallback((stats: { fps: number; avgLatency: number }) => {
    onFpsUpdate?.(stats);
  }, [onFpsUpdate]);

  return (
    <OptimizedSnapshotStream
      camera={camera}
      targetFps={8}
      style={style}
      onFpsUpdate={handleSnapshotFps}
      onFrameUpdate={onFrameUpdate}
      onError={onError}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
