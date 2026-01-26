import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { LibVlcPlayerView, LibVlcPlayerViewRef, MediaInfo, Error as VlcError, Time } from "expo-libvlc-player";
import { CameraProfile } from "@/lib/storage";
import { getRtspUrl } from "@/lib/camera";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface RTSPStreamProps {
  camera: CameraProfile;
  onFrameUpdate?: (frameData: string | null) => void;
  onStreamStateChange?: (state: "connecting" | "playing" | "error" | "stopped") => void;
  onFpsUpdate?: (fps: number) => void;
  onError?: (error: string) => void;
  style?: any;
  lowLatencyMode?: boolean;
}

export function RTSPStream({
  camera,
  onStreamStateChange,
  onFpsUpdate,
  onError,
  style,
  lowLatencyMode = true,
}: RTSPStreamProps) {
  const playerRef = useRef<LibVlcPlayerViewRef>(null);
  const [streamState, setStreamState] = useState<"connecting" | "playing" | "error" | "stopped">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [fps, setFps] = useState(0);
  
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() });

  const rtspUrl = getRtspUrl(camera);

  const vlcOptions = lowLatencyMode
    ? [
        "--network-caching=50",
        "--live-caching=50", 
        "--file-caching=0",
        "--clock-jitter=0",
        "--clock-synchro=0",
        "--rtsp-tcp",
        "--no-audio",
        "--avcodec-fast",
        "--avcodec-skiploopfilter=4",
        "--drop-late-frames",
        "--skip-frames",
        "--no-stats",
      ]
    : [
        "--network-caching=300",
        "--rtsp-tcp",
        "--no-audio",
      ];

  const updateState = useCallback((state: "connecting" | "playing" | "error" | "stopped") => {
    setStreamState(state);
    onStreamStateChange?.(state);
  }, [onStreamStateChange]);

  const handleBuffering = useCallback(() => {
    if (streamState !== "playing") {
      updateState("connecting");
    }
  }, [streamState, updateState]);

  const handlePlaying = useCallback(() => {
    updateState("playing");
    setErrorMessage(null);
  }, [updateState]);

  const handleStopped = useCallback(() => {
    updateState("stopped");
  }, [updateState]);

  const handleError = useCallback((event: VlcError) => {
    const msg = event.error || "Unknown stream error";
    setErrorMessage(msg);
    updateState("error");
    onError?.(msg);
  }, [updateState, onError]);

  const handleFirstPlay = useCallback((event: MediaInfo) => {
    setMediaInfo(event);
    const estimatedFps = event.width >= 1920 ? 30 : event.width >= 1280 ? 30 : 25;
    setFps(estimatedFps);
    onFpsUpdate?.(estimatedFps);
    console.log(`Stream info: ${event.width}x${event.height}, ~${estimatedFps} FPS`);
  }, [onFpsUpdate]);

  const handleTimeChanged = useCallback((_event: Time) => {}, []);

  useEffect(() => {
    updateState("connecting");
    fpsCounterRef.current = { count: 0, lastTime: Date.now() };
    return () => {
      playerRef.current?.stop();
    };
  }, [rtspUrl]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorText}>RTSP Not Supported</Text>
        <Text style={styles.errorDetail}>RTSP streaming requires native iOS/Android build</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <LibVlcPlayerView
        ref={playerRef}
        source={rtspUrl}
        options={vlcOptions}
        style={styles.player}
        aspectRatio="16:9"
        autoplay={true}
        mute={true}
        volume={0}
        onBuffering={handleBuffering}
        onPlaying={handlePlaying}
        onStopped={handleStopped}
        onEncounteredError={handleError}
        onFirstPlay={handleFirstPlay}
        onTimeChanged={handleTimeChanged}
      />

      {streamState === "connecting" && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.statusText}>Connecting to RTSP stream...</Text>
          <Text style={styles.urlText}>{camera.ipAddress}:{camera.rtspPort}</Text>
        </View>
      )}

      {streamState === "error" && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>Stream Error</Text>
          <Text style={styles.errorDetail}>{errorMessage}</Text>
          <Text style={styles.urlText}>URL: {rtspUrl}</Text>
        </View>
      )}

      {streamState === "playing" && (
        <View style={styles.statusBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>RTSP</Text>
          {fps > 0 && (
            <Text style={styles.fpsText}>{fps} FPS</Text>
          )}
          {mediaInfo && (
            <Text style={styles.resolutionText}>
              {mediaInfo.width}x{mediaInfo.height}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  player: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  statusText: {
    color: "#fff",
    fontSize: 16,
    marginTop: Spacing.md,
  },
  urlText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: Spacing.sm,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundRoot,
    padding: Spacing.lg,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 18,
    fontWeight: "bold",
  },
  errorDetail: {
    color: "#ff8888",
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  statusBadge: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.error,
  },
  liveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  fpsText: {
    color: Colors.dark.success,
    fontSize: 12,
    fontWeight: "bold",
  },
  resolutionText: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    marginLeft: Spacing.xs,
  },
});
