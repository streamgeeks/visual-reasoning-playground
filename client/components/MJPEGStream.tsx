import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Platform, Image, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { CameraProfile } from "@/lib/storage";
import { getAlternateMjpegUrls } from "@/lib/camera";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Colors } from "@/constants/theme";

interface MJPEGStreamProps {
  camera: CameraProfile;
  onFpsUpdate?: (fps: number) => void;
  onError?: (error: string) => void;
  onFallbackToSnapshot?: () => void;
  style?: any;
}

export function MJPEGStream({ camera, onFpsUpdate, onError, onFallbackToSnapshot, style }: MJPEGStreamProps) {
  const { theme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const mjpegUrls = getAlternateMjpegUrls(camera);
  const mjpegUrl = mjpegUrls[currentUrlIndex];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #0A0E14;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
          }
          img { 
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .error {
            color: #F85149;
            font-family: -apple-system, sans-serif;
            font-size: 14px;
            text-align: center;
            padding: 20px;
          }
        </style>
        <script>
          let frameCount = 0;
          let lastTime = Date.now();
          
          function updateFPS() {
            frameCount++;
            const now = Date.now();
            if (now - lastTime >= 1000) {
              const fps = Math.round(frameCount / ((now - lastTime) / 1000));
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fps', fps }));
              frameCount = 0;
              lastTime = now;
            }
          }
          
          function onImageLoad() {
            updateFPS();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
          }
          
          function onImageError(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to load MJPEG stream' 
            }));
          }
        </script>
      </head>
      <body>
        <img 
          src="${mjpegUrl}" 
          alt="Camera Stream" 
          onload="onImageLoad()"
          onerror="onImageError(event)"
        />
      </body>
    </html>
  `;

  const tryNextUrl = useCallback(() => {
    if (currentUrlIndex < mjpegUrls.length - 1) {
      console.log(`MJPEG URL ${currentUrlIndex + 1} failed, trying next...`);
      setCurrentUrlIndex(prev => prev + 1);
      setIsLoading(true);
      setError(null);
    } else {
      console.log("All MJPEG URLs failed, falling back to snapshot");
      onFallbackToSnapshot?.();
    }
  }, [currentUrlIndex, mjpegUrls.length, onFallbackToSnapshot]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'fps' && onFpsUpdate) {
        onFpsUpdate(data.fps);
      } else if (data.type === 'loaded') {
        setIsLoading(false);
        setError(null);
      } else if (data.type === 'error') {
        setError(data.message);
        onError?.(data.message);
        // Try next URL after a short delay
        setTimeout(tryNextUrl, 500);
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  if (Platform.OS === "web") {
    // On web, just use an img tag directly
    return (
      <View style={[styles.container, style]}>
        <Image
          source={{ uri: mjpegUrl }}
          style={styles.image}
          resizeMode="contain"
          onLoad={() => setIsLoading(false)}
          onError={() => setError("Failed to load stream")}
        />
        {isLoading ? (
          <View style={styles.loadingOverlay}>
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Connecting to MJPEG stream...
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="always"
        originWhitelist={['*']}
        onError={(syntheticEvent: any) => {
          const { nativeEvent } = syntheticEvent;
          setError(nativeEvent.description || "WebView error");
        }}
      />
      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Connecting to MJPEG stream...
          </Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorOverlay}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.errorHint, { color: theme.textSecondary, marginTop: Spacing.sm }]}>
            Trying alternate stream...
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E14",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  image: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(10, 14, 20, 0.8)",
  },
  loadingText: {
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(10, 14, 20, 0.9)",
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  errorHint: {
    fontSize: 12,
    textAlign: "center",
  },
});
