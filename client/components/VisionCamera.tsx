import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "react";
import { StyleSheet, View, StyleProp, ViewStyle, Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  PhotoFile,
  TakePhotoOptions,
  CameraPosition,
  CameraDevice,
} from "react-native-vision-camera";

export interface PhotoWithBase64 {
  uri: string;
  path: string;
  base64?: string;
  width: number;
  height: number;
}

export interface VisionCameraRef {
  takePhoto: (options?: TakePhotoOptions) => Promise<PhotoFile | null>;
  takePhotoWithBase64: () => Promise<PhotoWithBase64 | null>;
  captureFrame: () => Promise<string | null>;
  focus: (point: { x: number; y: number }) => Promise<void>;
}

export interface VisionCameraProps {
  style?: StyleProp<ViewStyle>;
  position?: CameraPosition;
  isActive?: boolean;
  zoom?: number;
  exposure?: number;
  enableZoomGesture?: boolean;
  torch?: "on" | "off";
  onInitialized?: () => void;
  onError?: (error: Error) => void;
}

export function useVisionCameraPermission() {
  const { hasPermission, requestPermission } = useCameraPermission();

  return {
    granted: hasPermission,
    canAskAgain: true,
    requestPermission,
  };
}

export function useVisionCameraDevice(position: CameraPosition = "back") {
  const device = useCameraDevice(position);
  return device;
}

export const VisionCamera = forwardRef<VisionCameraRef, VisionCameraProps>(
  function VisionCamera(
    {
      style,
      position = "back",
      isActive = true,
      zoom = 1,
      exposure = 0,
      enableZoomGesture = false,
      torch = "off",
      onInitialized,
      onError,
    },
    ref,
  ) {
    const cameraRef = useRef<Camera>(null);
    const device = useCameraDevice(position);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      if (device && isReady && onInitialized) {
        onInitialized();
      }
    }, [device, isReady, onInitialized]);

    const takePhoto = useCallback(
      async (options?: TakePhotoOptions): Promise<PhotoFile | null> => {
        if (!cameraRef.current || !isReady) {
          console.warn("[VisionCamera] Camera not ready for photo");
          return null;
        }

        try {
          const photo = await cameraRef.current.takePhoto(options);
          return photo;
        } catch (error) {
          console.error("[VisionCamera] takePhoto error:", error);
          onError?.(error as Error);
          return null;
        }
      },
      [isReady, onError],
    );

    const captureFrame = useCallback(async (): Promise<string | null> => {
      const photo = await takePhoto();
      if (!photo) return null;

      const uri = Platform.OS === "ios" ? photo.path : `file://${photo.path}`;
      return uri;
    }, [takePhoto]);

    const takePhotoWithBase64 =
      useCallback(async (): Promise<PhotoWithBase64 | null> => {
        const photo = await takePhoto();
        if (!photo) return null;

        try {
          const uri =
            Platform.OS === "ios" ? photo.path : `file://${photo.path}`;
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: "base64",
          });

          return {
            uri,
            path: photo.path,
            base64,
            width: photo.width,
            height: photo.height,
          };
        } catch (error) {
          console.error("[VisionCamera] takePhotoWithBase64 error:", error);
          onError?.(error as Error);
          return null;
        }
      }, [takePhoto, onError]);

    const focus = useCallback(
      async (point: { x: number; y: number }): Promise<void> => {
        if (!cameraRef.current || !device?.supportsFocus) {
          return;
        }

        try {
          await cameraRef.current.focus(point);
        } catch (error) {
          console.error("[VisionCamera] focus error:", error);
        }
      },
      [device],
    );

    useImperativeHandle(
      ref,
      () => ({
        takePhoto,
        takePhotoWithBase64,
        captureFrame,
        focus,
      }),
      [takePhoto, takePhotoWithBase64, captureFrame, focus],
    );

    if (!device) {
      return <View style={[styles.container, style]} />;
    }

    const clampedZoom = Math.max(
      device.minZoom,
      Math.min(device.maxZoom, zoom),
    );
    const clampedExposure = Math.max(
      device.minExposure,
      Math.min(device.maxExposure, exposure),
    );

    return (
      <Camera
        ref={cameraRef}
        style={[styles.camera, style]}
        device={device}
        isActive={isActive}
        photo={true}
        zoom={clampedZoom}
        exposure={clampedExposure}
        enableZoomGesture={enableZoomGesture}
        torch={torch}
        onInitialized={() => setIsReady(true)}
        onError={(error) => {
          console.error("[VisionCamera] Camera error:", error);
          onError?.(error);
        }}
      />
    );
  },
);

export function getDeviceCapabilities(device: CameraDevice | undefined) {
  if (!device) {
    return {
      minZoom: 1,
      maxZoom: 1,
      minExposure: 0,
      maxExposure: 0,
      supportsFocus: false,
      supportsFlash: false,
      supportsLowLightBoost: false,
    };
  }

  return {
    minZoom: device.minZoom,
    maxZoom: device.maxZoom,
    minExposure: device.minExposure,
    maxExposure: device.maxExposure,
    supportsFocus: device.supportsFocus,
    supportsFlash: device.hasFlash,
    supportsLowLightBoost: device.supportsLowLightBoost,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
});
