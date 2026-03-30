/**
 * EnhancedGifPlayer — Single-View Exercise Demo Player
 *
 * Shows a single animated exercise GIF with:
 *   - 0.25x slow-motion playback (configurable via `speed` prop)
 *   - Play/pause toggle via tap overlay
 *   - Speed badge showing current playback rate
 *
 * Resolution chain (priority order):
 *   1. CDN GIF lookup via getExerciseDbGifUrl() — 104+ name variants,
 *      manuscdn.com hosted. This is the SAME source the exercise library
 *      preview uses, guaranteeing the detail screen shows the identical GIF.
 *   2. ExerciseDB API GIF (static.exercisedb.dev) — searched by name for
 *      exercises not in the CDN map. These GIFs include built-in pauses
 *      at the top/bottom of the movement (~3 s per loop).
 *   3. "Demo not available" placeholder.
 *
 * USAGE:
 *   import EnhancedGifPlayer from "@/components/enhanced-gif-player";
 *   <EnhancedGifPlayer exerciseName="Bench Press" />
 *   <EnhancedGifPlayer exerciseName="Barbell Squat" height={280} speed={0.5} />
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import GifWebViewPlayer from "@/components/gif-webview-player";
import { getExerciseDbGifUrl } from "@/lib/exercisedb-api";
import {
  searchExercisesByName,
  hasExerciseDBKey,
} from "@/lib/exercisedb";
import { resolveGifUri } from "@/lib/exercise-gif-cache";

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
  /** Playback speed multiplier. 0.25 = quarter speed. Default: 0.25 */
  speed?: number;
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
  speed = 0.25,
  style,
}: EnhancedGifPlayerProps) {
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Derive the exercise name for lookups
  const name =
    exerciseName ?? (exerciseKey ? keyToExerciseName(exerciseKey) : "");

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setImgError(false);
    setGifUrl(null);
    setFallbackUrl(null);

    if (!name) {
      setLoading(false);
      return;
    }

    // ── Priority 1: CDN GIF (synchronous, same source as library preview) ──
    const cdnUrl = getExerciseDbGifUrl(name);

    if (cdnUrl) {
      // Try to serve from disk cache first (offline support)
      resolveGifUri(cdnUrl)
        .then((resolved) => {
          if (!mountedRef.current) return;
          setGifUrl(resolved);
        })
        .catch(() => {
          if (!mountedRef.current) return;
          setGifUrl(cdnUrl);
        });
      setLoading(false);

      // Pre-fetch API URL as fallback (non-blocking)
      if (hasExerciseDBKey()) {
        searchExercisesByName(name, 1)
          .then((results) => {
            if (!mountedRef.current) return;
            if (results.length > 0 && results[0].gifUrl) {
              setFallbackUrl(results[0].gifUrl);
            }
          })
          .catch(() => {
            // Ignore — CDN is already showing
          });
      }
    } else {
      // ── Priority 2: ExerciseDB API GIF (no CDN match) ──
      if (hasExerciseDBKey()) {
        searchExercisesByName(name, 1)
          .then((results) => {
            if (!mountedRef.current) return;
            if (results.length > 0 && results[0].gifUrl) {
              // Try to serve from disk cache (offline support)
              resolveGifUri(results[0].gifUrl)
                .then((resolved) => {
                  if (!mountedRef.current) return;
                  setGifUrl(resolved);
                })
                .catch(() => {
                  if (!mountedRef.current) return;
                  setGifUrl(results[0].gifUrl!);
                });
            }
            setLoading(false);
          })
          .catch(() => {
            if (!mountedRef.current) return;
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, [name]);

  // ── Fallback on GIF error: try API GIF if CDN failed ──
  const handleGifError = useCallback(() => {
    if (fallbackUrl && !imgError) {
      // Switch to API fallback
      setGifUrl(fallbackUrl);
      setFallbackUrl(null);
      setImgError(false);
    } else {
      setImgError(true);
      setLoading(false);
    }
  }, [fallbackUrl, imgError]);

  const noContent = !gifUrl && !loading;

  return (
    <View style={[styles.wrapper, style]}>
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
          </View>
        )}

        {gifUrl && !imgError && (
          <GifWebViewPlayer
            uri={gifUrl}
            speed={speed}
            height={height}
            autoplay
            onLoad={() => setLoading(false)}
            onError={handleGifError}
          />
        )}
      </View>
    </View>
  );
}

const AMBER = "#F59E0B";
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
});
