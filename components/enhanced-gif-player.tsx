/**
 * EnhancedGifPlayer — Multi-Angle Exercise Demo Player
 *
 * Shows animated exercise demos with a Front / Side toggle.
 *
 * Resolution chain (per angle):
 *   1. MuscleWiki registry via getExerciseVideoUrl(key, angle) — 74 exercises
 *      with distinct front + side MP4 URLs.
 *   2. CDN lookup via getExerciseDbGifUrl() — 104+ name variants (animated GIFs,
 *      single angle only; used for front, duplicated for side if no other source).
 *   3. Async ExerciseDB RapidAPI search — 1300+ exercises (single angle).
 *   4. "Demo not available" placeholder.
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
import { EXERCISE_GIFS, getExerciseVideoUrl } from "@/lib/exercise-gif-registry";

type Angle = "front" | "side";

interface EnhancedGifPlayerProps {
  /**
   * Registry key (with or without angle suffix).
   * e.g. "male-Barbell-barbell-squat-front" or "male-Barbell-barbell-squat"
   */
  exerciseKey?: string;
  /**
   * Human-readable exercise name (preferred over exerciseKey for CDN/API lookups).
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

/**
 * Ensure the registry key ends with "-front" so getExerciseVideoUrl can
 * derive the "-side" variant correctly.
 */
function normaliseFrontKey(key: string): string {
  if (key.endsWith("-front")) return key;
  if (key.endsWith("-side")) return key.replace(/-side$/, "-front");
  return `${key}-front`;
}

/**
 * Check whether the registry has a distinct side URL that differs from front.
 */
function registryHasDistinctSide(frontKey: string): boolean {
  const normalised = normaliseFrontKey(frontKey);
  const sideKey = normalised.replace(/-front$/, "-side");
  const frontUrl = EXERCISE_GIFS[normalised];
  const sideUrl = EXERCISE_GIFS[sideKey];
  return !!sideUrl && sideUrl !== frontUrl;
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
  const [hasDistinctSide, setHasDistinctSide] = useState(false);
  const mountedRef = useRef(true);

  // Derive the exercise name for CDN/API fallback
  const name = exerciseName ?? (exerciseKey ? keyToExerciseName(exerciseKey) : "");

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setImgError(false);
    setFrontUrl(null);
    setSideUrl(null);
    setHasDistinctSide(false);

    if (!name && !exerciseKey) {
      setLoading(false);
      return;
    }

    let resolved = false;

    // ── Priority 1: MuscleWiki registry (has proper front + side MP4s) ──
    if (exerciseKey) {
      const frontKey = normaliseFrontKey(exerciseKey);
      const registryFront = EXERCISE_GIFS[frontKey];

      if (registryFront) {
        const registrySide = getExerciseVideoUrl(frontKey, "side");
        const distinct = registryHasDistinctSide(frontKey);

        if (mountedRef.current) {
          setFrontUrl(registryFront);
          setSideUrl(registrySide);
          setHasDistinctSide(distinct);
          setLoading(false);
          resolved = true;
        }
      }
    }

    // ── Priority 2: CDN GIF lookup (single angle, instant) ──
    if (!resolved && name) {
      const cdnUrl = getExerciseDbGifUrl(name);
      if (cdnUrl && mountedRef.current) {
        setFrontUrl(cdnUrl);
        // CDN only has one angle — side will be the same
        setSideUrl(cdnUrl);
        setHasDistinctSide(false);
        setLoading(false);
        resolved = true;
      }
    }

    // ── Priority 3: ExerciseDB RapidAPI (async, single angle GIF) ──
    if (!resolved && name) {
      if (hasExerciseDBKey()) {
        searchExercisesByName(name, 2)
          .then((results) => {
            if (!mountedRef.current) return;
            if (results.length > 0) {
              setFrontUrl(results[0].gifUrl);
              // API results are different exercises, not different angles
              // so use the same GIF for both
              setSideUrl(results[0].gifUrl);
              setHasDistinctSide(false);
            }
            setLoading(false);
          })
          .catch(() => {
            if (mountedRef.current) setLoading(false);
          });
      } else {
        // No API key — try single async lookup
        getExerciseGifUrl(name)
          .then((url) => {
            if (!mountedRef.current) return;
            if (url) {
              setFrontUrl(url);
              setSideUrl(url);
            }
            setLoading(false);
          })
          .catch(() => {
            if (mountedRef.current) setLoading(false);
          });
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, [name, exerciseKey]);

  const currentUrl = angle === "front" ? frontUrl : (sideUrl ?? frontUrl);
  const noContent = !currentUrl && !loading;

  return (
    <View style={[styles.wrapper, style]}>
      {/* GIF / Video Display */}
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
            onPress={() => {
              setAngle("front");
              setImgError(false);
            }}
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
            style={[
              styles.toggleBtn,
              angle === "side" && styles.toggleBtnActive,
              !hasDistinctSide && styles.toggleBtnDisabled,
            ]}
            onPress={() => {
              if (hasDistinctSide) {
                setAngle("side");
                setImgError(false);
              }
            }}
            activeOpacity={hasDistinctSide ? 0.75 : 1}
            accessibilityRole="button"
            accessibilityLabel={
              hasDistinctSide
                ? "Show side view"
                : "Side view not available for this exercise"
            }
            accessibilityState={{
              selected: angle === "side",
              disabled: !hasDistinctSide,
            }}
          >
            <Text
              style={[
                styles.toggleText,
                angle === "side" && styles.toggleTextActive,
                !hasDistinctSide && styles.toggleTextDisabled,
              ]}
            >
              Side
              {!hasDistinctSide && " (N/A)"}
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
  toggleBtnDisabled: {
    opacity: 0.4,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: AMBER,
  },
  toggleTextActive: {
    color: "#0A0E14",
  },
  toggleTextDisabled: {
    color: "#6B7280",
  },
});
