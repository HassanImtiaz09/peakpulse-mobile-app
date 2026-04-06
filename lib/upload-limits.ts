/**
 * File upload size and type validation.
 * Enforces limits before sending data to the server.
 */

import { Alert, Platform } from "react-native";

// ── Size limits (in bytes) ──

export const UPLOAD_LIMITS = {
  /** Profile photo / avatar */
  profilePhoto: 5 * 1024 * 1024, // 5 MB
  /** Progress check-in photo */
  progressPhoto: 10 * 1024 * 1024, // 10 MB
  /** Body scan image */
  bodyScan: 15 * 1024 * 1024, // 15 MB
  /** Meal / food photo */
  mealPhoto: 8 * 1024 * 1024, // 8 MB
  /** Generic image upload */
  genericImage: 10 * 1024 * 1024, // 10 MB
} as const;

export type UploadCategory = keyof typeof UPLOAD_LIMITS;

// ── Allowed MIME types ──

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// ── Formatting helpers ──

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Validation ──

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file before uploading.
 * Checks size limit and MIME type.
 */
export function validateUpload(
  file: { uri: string; fileSize?: number; type?: string; fileName?: string },
  category: UploadCategory,
): UploadValidationResult {
  const maxSize = UPLOAD_LIMITS[category];

  // Check file size
  if (file.fileSize && file.fileSize > maxSize) {
    return {
      valid: false,
      error: `File is too large (${formatFileSize(file.fileSize)}). Maximum size is ${formatFileSize(maxSize)}.`,
    };
  }

  // Check MIME type
  const mimeType = file.type ?? guessMimeFromName(file.fileName ?? file.uri);
  if (mimeType && !ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file type "${mimeType}". Accepted formats: JPEG, PNG, WebP, HEIC.`,
    };
  }

  return { valid: true };
}

/**
 * Validate and show alert if invalid. Returns true if file is OK.
 */
export function validateUploadWithAlert(
  file: { uri: string; fileSize?: number; type?: string; fileName?: string },
  category: UploadCategory,
): boolean {
  const result = validateUpload(file, category);
  if (!result.valid && result.error) {
    Alert.alert("Upload Error", result.error);
    return false;
  }
  return true;
}

/**
 * Guess MIME type from file extension.
 */
function guessMimeFromName(name: string): string | undefined {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return undefined;
  }
}

/**
 * Server-side validation (for Express / tRPC routes).
 * Throws a descriptive error if the file exceeds limits.
 */
export function assertUploadSize(
  sizeInBytes: number,
  category: UploadCategory,
): void {
  const maxSize = UPLOAD_LIMITS[category];
  if (sizeInBytes > maxSize) {
    throw new Error(
      `File size ${formatFileSize(sizeInBytes)} exceeds the ${formatFileSize(maxSize)} limit for ${category}.`,
    );
  }
}
