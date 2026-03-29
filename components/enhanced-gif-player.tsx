/**
 * EnhancedGifPlayer — Updated to use ExerciseDB animated GIFs
 *
 * WHAT CHANGED vs the previous version:
 *   - Uses ExerciseGifDisplay (expo-image based) instead of
 *     ExerciseVideoPlayer (expo-video based)
 *   - Derives a human-readable exercise name from the registry key and
 *     uses it to look up an animated GIF from ExerciseDB
 *   - Front / Side toggle is preserved in the UI; both angles show the
 *     same ExerciseDB GIF because ExerciseDB does not split by angle
 *     (the toggle is kept to avoid breaking existing UX)
 *   - Accepts an optional `exerciseName` prop so callers can pass the
 *     plain name directly instead of relying on key derivation
 *
 * WHY THIS FIX WORKS:
 *   expo-video cannot pass HTTP headers to video requests (issue #29436).
 *   MuscleWiki CDN blocks requests without a Referer header — so every
 *   MuscleWiki MP4 URL showed as a black frame in the app. ExerciseDB
 *   GIF URLs are on a public CDN and require no auth headers at all.
 *   expo-image renders them as smooth animated GIFs natively.
 *
 * USAGE (unchanged from original):
 *   import EnhancedGifPlayer from "@/components/enhanced-gif-player";
 *   <EnhancedGifPlayer exerciseKey="male-Barbell-barbell-squat-front" />
 */
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ExerciseGifDisplay } from "@/components/exercise-gif-display";

type Angle = "front" | "side";

interface EnhancedGifPlayerProps {
  /**
   * Registry key with or without angle suffix.
   * e.g. "male-Barbell-barbell-squat-front" or "male-Barbell-barbell-squat"
   */
  exerciseKey: string;
  /**
   * Optional human-readable exercise name.
   * When provided, used directly for ExerciseDB lookup (more accurate).
   * When omitted, derived from exerciseKey.
   */
  exerciseName?: string;
  /** Rendered height of the player in pixels. Defaults to 260. */
  height?: number;
  /** Show the Front / Side toggle bar. Defaults to true. */
  showControls?: boolean;
  /** Additional style on the outer container. */
  style?: ViewStyle;
}

/**
 * Derive a plain exercise name from a MuscleWiki registry key.
 * "male-Barbell-barbell-squat-front" → "barbell squat"
 */
function keyToExerciseName(key: string): string {
  return key
    .replace(/^male-[A-Z][a-zA-Z]+-/, "") // strip "male-Category-"
    .replace(/-(?:front|side)$/, "")       // strip trailing angle
    .replace(/-/g, " ")
    .trim();
}

export default function EnhancedGifPlayer({
  exerciseKey,
  exerciseName,
  height = 260,
  showControls = true,
  style,
}: EnhancedGifPlayerProps) {
  const [angle, setAngle] = useState<Angle>("front");

  // Use explicit name if given; otherwise derive from the registry key
  const name = exerciseName ?? keyToExerciseName(exerciseKey);

  return (
    <View style={[styles.wrapper, style]}>
      {/* Animated GIF via ExerciseDB public CDN (no auth headers needed) */}
      <ExerciseGifDisplay exerciseName={name} height={height} />

      {/* Front / Side toggle — kept for UX parity */}
      {showControls && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, angle === "front" && styles.toggleBtnActive]}
            onPress={() => setAngle("front")}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Show front view"
            accessibilityState={{ selected: angle === "front" }}
          >
            <Text
              style={[
                styles.toggleText,
                angle === "front" && styles.toggleTextActive,
              ]}
            >
              Front
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, angle === "side" && styles.toggleBtnActive]}
            onPress={() => setAngle("side")}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Show side view"
            accessibilityState={{ selected: angle === "side" }}
          >
            <Text
              style={[
                styles.toggleText,
                angle === "side" && styles.toggleTextActive,
              ]}
            >
              Side
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const AMBER = "#F59E0B";
const AMBER_DIM = "rgba(245,158,11,0.12)";
const SURFACE = "#141A22";

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: SURFACE,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    paddingTop: 10,
    backgroundColor: SURFACE,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: AMBER_DIM,
  },
  toggleBtnActive: {
    backgroundColor: AMBER,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: AMBER,
  },
  toggleTextActive: {
    color: "#0A0E14",
  },
});
