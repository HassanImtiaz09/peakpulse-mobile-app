/**
 * EnhancedGifPlayer — Multi-Angle Exercise Demo Player
 *
 * Shows animated GIF exercise demos with a Front / Side toggle.
 *
 * Resolution chain per angle:
 *   1. CDN lookup via getExerciseDbGifUrl() — instant, 104+ name variants
 *   2. Async ExerciseDB RapidAPI search — 1300+ exercises
 *   3. "Demo not available" placeholder
 *
 * Front view: uses the exercise name directly.
 * Side view: searches ExerciseDB API for the same exercise and picks a
 *            different result (if available) to approximate a side angle.
 *            If only one result exists, shows the same GIF.
 *
 * USAGE:
 *   import EnhancedGifPlayer from "@/components/enhanced-gif-player";
 *   <EnhancedGifPlayer exerciseKey="male-Barbell-barbell-squat-front" />
 *   <EnhancedGifPlayer exerciseName="Bench Press" />
 */
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { getExerciseDbGifUrl } from "@/lib/exercisedb-api";
import {
  getExerciseGifUrl,
  searchExercisesByName,
  hasExerciseDBKey,
} from "@/lib/exercisedb";

type Angle = "front" | "side";

interface EnhancedGifPlayerProps {
  /**
   * Registry key with or without angle suffix.
   * e.g. "male-Barbell-barbell-squat-front" or "male-Barbell-barbell-squat"
   */
  exerciseKey?: string;
  /**
   * Human-readable exercise name (preferred over exerciseKey).
   * When provided, used directly for lookups (more accurate).
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
    .replace(/-(?:front|side)$/, "") // strip trailing angle
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
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [sideUrl, setSideUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const mountedRef = useRef(true);

  // Derive the exercise name
  const name = exerciseName ?? (exerciseKey ? keyToExerciseName(exerciseKey) : "");

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setImgError(false);
    setFrontUrl(null);
    setSideUrl(null);

    if (!name) {
      setLoading(false);
      return;
    }

    // Step 1: Try synchronous CDN lookup (instant)
    const cdnUrl = getExerciseDbGifUrl(name);
    if (cdnUrl) {
      if (mountedRef.current) {
        setFrontUrl(cdnUrl);
        setLoading(false);
      }
    }

    // Step 2: Search ExerciseDB API for front + side GIFs
    if (hasExerciseDBKey()) {
      searchExercisesByName(name, 5).then((results) => {
        if (!mountedRef.current) return;

        if (results.length > 0) {
          // First result = front view
          const front = results[0].gifUrl;
          if (front && !cdnUrl) {
            setFrontUrl(front);
          }

          // Second result (if different exercise variant) = side view
          if (results.length > 1) {
            setSideUrl(results[1].gifUrl);
          } else if (front) {
            // Same GIF for side if only one result
            setSideUrl(front);
          }
        }

        setLoading(false);
      }).catch(() => {
        if (mountedRef.current) setLoading(false);
      });
    } else if (!cdnUrl) {
      // No CDN hit and no API key — try async single lookup
      getExerciseGifUrl(name).then((url) => {
        if (!mountedRef.current) return;
        if (url) setFrontUrl(url);
        setLoading(false);
      });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [name]);

  const currentUrl = angle === "front" ? frontUrl : (sideUrl ?? frontUrl);
  const noContent = !currentUrl && !loading;

  return (
    <View style={[styles.wrapper, style]}>
      {/* GIF Display */}
      <View style={[styles.gifContainer, { height }]}>
        {loading && !currentUrl && (
          <View style={[StyleSheet.absoluteFill, styles.loadingLayer]}>
            <ActivityIndicator color={AMBER} size="small" />
            <Text style={styles.loadingText}>Loading demo...</Text>
          </View>
        )}

        {(noContent || imgError) && (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <Text style={styles.placeholderTitle}>Demo not available</Text>
            {!hasExerciseDBKey() && (
              <Text style={styles.placeholderHint}>
                Add EXPO_PUBLIC_RAPIDAPI_KEY to .env to enable animated demos
              </Text>
            )}
          </View>
        )}

        {currentUrl && !imgError && (
          <Image
            source={{ uri: currentUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            autoplay
            cachePolicy="memory-disk"
            onLoad={() => setLoading(false)}
            onError={() => {
              setImgError(true);
              setLoading(false);
            }}
          />
        )}
      </View>

      {/* Front / Side toggle */}
      {showControls && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, angle === "front" && styles.toggleBtnActive]}
            onPress={() => { setAngle("front"); setImgError(false); }}
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
            onPress={() => { setAngle("side"); setImgError(false); }}
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
  gifContainer: {
    width: "100%",
    backgroundColor: "#0D1117",
    position: "relative",
  },
  loadingLayer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1117",
    zIndex: 1,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    marginTop: 8,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  placeholderTitle: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
  },
  placeholderHint: {
    color: "#374151",
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    lineHeight: 15,
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
