/**
 * EnhancedGifPlayer — Complete Rewrite for MP4 Videos
 *
 * WHAT CHANGED vs the original:
 *  - Uses <ExerciseVideoPlayer> (expo-video) instead of <Image> from expo-image.
 *  - Front / Side toggle now correctly swaps the video URL by deriving the
 *    side-view key from the front-view key via getExerciseVideoUrl().
 *  - Loading state is handled by the video player itself (no manual isLoading flag).
 *  - Falls back gracefully when a video URL is unavailable (shows "No demo" text).
 *
 * Props
 * ─────
 *  exerciseKey   — registry key WITHOUT angle suffix, e.g. "male-Barbell-barbell-squat"
 *                  OR with "-front" suffix (both are normalised automatically)
 *  height        — rendered height in px (default 260)
 *  showControls  — show the Front / Side toggle bar (default true)
 *  style         — extra ViewStyle overrides on the outer container
 *
 * Usage
 * ─────
 *  import EnhancedGifPlayer from "@/components/enhanced-gif-player";
 *
 *  <EnhancedGifPlayer exerciseKey="male-Barbell-barbell-squat-front" />
 */

import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ExerciseVideoPlayer } from "@/components/exercise-video-player";
import { getExerciseVideoUrl } from "@/lib/exercise-gif-registry";

// ─── Types ──────────────────────────────────────────────────────────────────

type Angle = "front" | "side";

interface EnhancedGifPlayerProps {
  /**
   * The exercise registry key.
   * Accepts either form:
   *   "male-Barbell-barbell-squat"        (no angle suffix)
   *   "male-Barbell-barbell-squat-front"  (with angle suffix — stripped internally)
   */
  exerciseKey: string;
  /** Rendered height of the video player. Defaults to 260. */
  height?: number;
  /** Show the Front / Side toggle. Defaults to true. */
  showControls?: boolean;
  /** Additional style on the outer container. */
  style?: ViewStyle;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise the key to always end with "-front" for front-angle lookups */
function normaliseFrontKey(key: string): string {
  if (key.endsWith("-side")) return key.replace(/-side$/, "-front");
  if (key.endsWith("-front")) return key;
  return `${key}-front`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EnhancedGifPlayer({
  exerciseKey,
  height = 260,
  showControls = true,
  style,
}: EnhancedGifPlayerProps) {
  const [angle, setAngle] = useState<Angle>("front");

  // Ensure we always have a front-normalised key for the registry lookup
  const frontKey = normaliseFrontKey(exerciseKey);

  // Derive the active video URL from the registry
  const videoUri = getExerciseVideoUrl(frontKey, angle);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.wrapper, style]}>
      {/* ── Video ── */}
      <ExerciseVideoPlayer uri={videoUri} height={height} />

      {/* ── Front / Side Toggle ── */}
      {showControls && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              angle === "front" && styles.toggleBtnActive,
            ]}
            onPress={() => setAngle("front")}
            activeOpacity={0.75}
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
            style={[
              styles.toggleBtn,
              angle === "side" && styles.toggleBtnActive,
            ]}
            onPress={() => setAngle("side")}
            activeOpacity={0.75}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const AMBER = "#F59E0B";
const AMBER_DIM = "rgba(245,158,11,0.12)";
const SURFACE = "#141A22";
const TEXT_MUTED = "#6B7280";
const TEXT_ACTIVE = "#0A0E14";

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
    color: TEXT_ACTIVE,
  },
});
