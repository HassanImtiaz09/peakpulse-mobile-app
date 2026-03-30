/**
 * EnhancedGifPlayer — Multi-Angle Exercise Demo Player
 *
 * Shows animated exercise demos with a Front / Side toggle.
 *
 * Resolution chain (per angle):
 *   1. CDN GIF lookup via getExerciseDbGifUrl() — 104+ name variants, manuscdn.com
 *      hosted animated GIFs. Single angle only (same GIF for front & side).
 *   2. Async ExerciseDB RapidAPI search — 1300+ exercises (single angle).
 *   3. "Demo not available" placeholder.
 *
 * NOTE: MuscleWiki registry (exercise-gif-registry.ts) is intentionally NOT used
 * because MuscleWiki's CDN now returns HTTP 403 for direct MP4 requests.
 *
 * The Front/Side toggle is kept for future use when a second-angle source becomes
 * available. Currently both angles show the same CDN GIF and the Side button is
 * disabled with "(N/A)".
 *
 * USAGE:
 *   import EnhancedGifPlayer from "@/components/enhanced-gif-player";
 *   <EnhancedGifPlayer exerciseName="Bench Press" />
 *   <EnhancedGifPlayer exerciseKey="male-Barbell-barbell-squat-front" exerciseName="Barbell Squat" />
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
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
   * Registry key (used to derive exercise name if exerciseName is not provided).
   * e.g. "male-Barbell-barbell-squat-front"
   */
  exerciseKey?: string;
  /**
   * Human-readable exercise name — PREFERRED prop for GIF resolution.
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
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [triedApiFallback, setTriedApiFallback] = useState(false);
  const mountedRef = useRef(true);

  // Derive the exercise name for CDN/API lookups
  const name =
    exerciseName ?? (exerciseKey ? keyToExerciseName(exerciseKey) : "");

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setImgError(false);
    setGifUrl(null);
    setTriedApiFallback(false);

    if (!name) {
      setLoading(false);
      return;
    }

    // ── Priority 1: CDN GIF lookup (instant, 104+ exercises, manuscdn.com) ──
    const cdnUrl = getExerciseDbGifUrl(name);
    if (cdnUrl) {
      setGifUrl(cdnUrl);
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    // ── Priority 2: Async ExerciseDB RapidAPI search ──
    if (hasExerciseDBKey()) {
      searchExercisesByName(name, 1)
        .then((results) => {
          if (!mountedRef.current) return;
          if (results.length > 0 && results[0].gifUrl) {
            setGifUrl(results[0].gifUrl);
          }
          setLoading(false);
          setTriedApiFallback(true);
        })
        .catch(() => {
          if (mountedRef.current) {
            setLoading(false);
            setTriedApiFallback(true);
          }
        });
    } else {
      // No API key — try the single-exercise async lookup
      getExerciseGifUrl(name)
        .then((url) => {
          if (!mountedRef.current) return;
          if (url) setGifUrl(url);
          setLoading(false);
          setTriedApiFallback(true);
        })
        .catch(() => {
          if (mountedRef.current) {
            setLoading(false);
            setTriedApiFallback(true);
          }
        });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [name]);

  // ── Fallback on image error: try API if CDN GIF failed ──
  const handleImageError = useCallback(() => {
    if (!triedApiFallback && name && hasExerciseDBKey()) {
      setTriedApiFallback(true);
      searchExercisesByName(name, 1)
        .then((results) => {
          if (!mountedRef.current) return;
          if (results.length > 0 && results[0].gifUrl) {
            setGifUrl(results[0].gifUrl);
            setImgError(false);
          } else {
            setImgError(true);
          }
          setLoading(false);
        })
        .catch(() => {
          if (mountedRef.current) {
            setImgError(true);
            setLoading(false);
          }
        });
    } else {
      setImgError(true);
      setLoading(false);
    }
  }, [name, triedApiFallback]);

  const noContent = !gifUrl && !loading;
  // Side view is not available since MuscleWiki is blocked and ExerciseDB API
  // doesn't provide multi-angle GIFs. Keep the toggle UI for future use.
  const hasDistinctSide = false;

  return (
    <View style={[styles.wrapper, style]}>
      {/* GIF Display */}
      <View style={[styles.gifContainer, { height }]}>
        {loading && !gifUrl && (
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

        {gifUrl && !imgError && (
          <Image
            source={{ uri: gifUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            autoplay
            cachePolicy="memory-disk"
            onLoad={() => setLoading(false)}
            onError={handleImageError}
          />
        )}
      </View>

      {/* Front / Side toggle */}
      {showControls && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              angle === "front" && styles.toggleBtnActive,
            ]}
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
