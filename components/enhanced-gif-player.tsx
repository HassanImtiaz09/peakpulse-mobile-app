/**
 * EnhancedGifPlayer — Single-View Exercise Demo Player
 *
 * Shows a single animated exercise GIF with no angle toggle.
 *
 * Resolution chain (priority order):
 *   1. ExerciseDB API GIF (static.exercisedb.dev) — preferred because these
 *      GIFs include built-in pauses at the top/bottom of the movement,
 *      making them ~3 s per loop and much easier to follow.
 *   2. CDN GIF lookup via getExerciseDbGifUrl() — 104+ name variants,
 *      manuscdn.com hosted. These play at 10 FPS (1.2 s loop) which is
 *      faster but still usable as a fallback.
 *   3. "Demo not available" placeholder.
 *
 * USAGE:
 *   import EnhancedGifPlayer from "@/components/enhanced-gif-player";
 *   <EnhancedGifPlayer exerciseName="Bench Press" />
 *   <EnhancedGifPlayer exerciseName="Barbell Squat" height={280} />
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { getExerciseDbGifUrl } from "@/lib/exercisedb-api";
import {
  searchExercisesByName,
  hasExerciseDBKey,
} from "@/lib/exercisedb";

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

    // Prepare CDN fallback URL synchronously (fast, 104+ exercises)
    const cdnUrl = getExerciseDbGifUrl(name);

    // ── Priority 1: ExerciseDB API GIF (slower, easier to follow) ──
    searchExercisesByName(name, 1)
      .then((results) => {
        if (!mountedRef.current) return;
        if (results.length > 0 && results[0].gifUrl) {
          setGifUrl(results[0].gifUrl);
          // Keep CDN as fallback in case API GIF fails to load
          if (cdnUrl) setFallbackUrl(cdnUrl);
          setLoading(false);
        } else if (cdnUrl) {
          // No API result — use CDN GIF
          setGifUrl(cdnUrl);
          setLoading(false);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        if (!mountedRef.current) return;
        // API failed — fall back to CDN GIF
        if (cdnUrl) {
          setGifUrl(cdnUrl);
        }
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [name]);

  // ── Fallback on image error: try CDN if API GIF failed ──
  const handleImageError = useCallback(() => {
    if (fallbackUrl && !imgError) {
      // Switch to CDN fallback
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
