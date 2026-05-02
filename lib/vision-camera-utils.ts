/**
 * Vision Camera Utilities — Frame processing helpers
 *
 * Provides platform-safe wrappers for react-native-vision-camera.
 * Used by: Live Form Coach (M12), Enhanced Form Checker (M5)
 *
 * These utilities are designed to be imported dynamically on native
 * platforms only. On web, they return no-op stubs.
 */
import { Platform } from "react-native";

/**
 * Check if VisionCamera is available on the current platform.
 * Returns false on web (VisionCamera is native-only).
 */
export function isVisionCameraAvailable(): boolean {
  return Platform.OS !== "web";
}

/**
 * Request camera permission for VisionCamera.
 * Returns the permission status.
 *
 * Must be called before rendering <Camera> from react-native-vision-camera.
 *
 * NOTE: In components, prefer the `useCameraPermission()` hook instead.
 * This imperative function is for use outside of React component trees
 * (e.g., permission pre-checks in navigation guards).
 */
export async function requestVisionCameraPermission(): Promise<
  "granted" | "denied" | "not-determined" | "restricted"
> {
  if (!isVisionCameraAvailable()) {
    return "denied";
  }

  try {
    // VisionCamera v5 exposes a singleton CameraFactory instance as `VisionCamera`
    const { VisionCamera } = await import("react-native-vision-camera");
    const granted = await VisionCamera.requestCameraPermission();
    // VisionCamera.requestCameraPermission() returns boolean in v5
    // Map to a status string for backward compatibility
    if (granted) {
      return "granted";
    }
    // Check the current status to distinguish denied vs restricted
    const status = VisionCamera.cameraPermissionStatus;
    if (status === "restricted") return "restricted";
    if (status === "not-determined") return "not-determined";
    return "denied";
  } catch (error) {
    console.warn("[VisionCamera] Permission request failed:", error);
    return "denied";
  }
}

/**
 * Get the best available camera device for form checking.
 * Prefers the back camera with wide-angle lens.
 *
 * NOTE: This is a guidance function. In actual components, use:
 *   const device = useCameraDevice('back');
 * This function exists for documentation and non-hook contexts.
 */
export async function getFormCheckDevice() {
  if (!isVisionCameraAvailable()) {
    return null;
  }

  try {
    // useCameraDevice is a hook and must be used inside a component.
    // This function serves as a placeholder for the device selection logic.
    // In components, use: const device = useCameraDevice('back');
    return null;
  } catch {
    return null;
  }
}

/**
 * Frame processor configuration for pose estimation.
 * These settings balance accuracy with performance for real-time form checking.
 */
export const FRAME_PROCESSOR_CONFIG = {
  /** Target FPS for frame processing (30 = real-time, 15 = balanced, 5 = power saver) */
  targetFps: 30,
  /** Pixel format for frame processor input */
  pixelFormat: "yuv" as const,
  /** Video resolution for form checking (720p balances quality and performance) */
  videoResolution: { width: 1280, height: 720 },
  /** Whether to enable frame processor (can be toggled for performance) */
  enableFrameProcessor: true,
  /** Minimum confidence threshold for pose detection (0-1) */
  poseConfidenceThreshold: 0.5,
  /** Maximum number of poses to detect (1 for single-user form checking) */
  maxPoses: 1,
};

/**
 * Capture a single frame from the camera for Claude Vision analysis.
 * Used as a fallback when real-time frame processing is not needed.
 *
 * @param cameraRef - Reference to the VisionCamera component
 * @returns Base64-encoded JPEG image, or null on failure
 */
export async function captureFrameForAnalysis(
  cameraRef: any
): Promise<string | null> {
  if (!cameraRef?.current) {
    return null;
  }

  try {
    const photo = await cameraRef.current.takePhoto({
      qualityPrioritization: "speed",
      enableShutterSound: false,
    });

    // Read the photo file and convert to base64
    // Use the legacy API which exports EncodingType and readAsStringAsync
    const FileSystem = await import("expo-file-system/legacy");
    const base64 = await FileSystem.readAsStringAsync(
      `file://${photo.path}`,
      { encoding: FileSystem.EncodingType.Base64 }
    );

    return base64;
  } catch (error) {
    console.warn("[VisionCamera] Frame capture failed:", error);
    return null;
  }
}
