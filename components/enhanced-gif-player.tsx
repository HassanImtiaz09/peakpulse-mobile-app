/**
 * EnhancedGifPlayer — Single-View Exercise Demo Player
 *
 * Shows a single animated exercise GIF with:
 *   - 0.25x slow-motion playback (configurable via `speed` prop)
 *   - Play/pause toggle via tap overlay
 *   - Fullscreen/enlarge button
 *   - Speed badge showing current playback rate
 *
 * Resolution chain (priority order):
 *   1. CDN GIF lookup via getExerciseDbGifUrl() — 104+ name variants,
 *      manuscdn.com hosted. This is the SAME source the exercise library
 *      preview uses, guaranteeing the detail screen shows the identical GIF.
 *   2. ExerciseDB API GIF (static.exercisedb.dev) — searched by name for
 *      exercises not in the CDN map.
 *   3. "Demo not available" placeholder.
 *
 * ARCHITECTURE (Round 48):
 *   GIF binary is fetched in React Native (no CORS issues) and converted
 *   to base64. The base64 data is passed to GifWebViewPlayer which embeds
 *   it directly in the WebView HTML, bypassing CORS restrictions that
 *   previously caused "demo not available" on the detail screen.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Platform,
} from "react-native";
import GifWebViewPlayer from "@/components/gif-webview-player";
import { getExerciseDbGifUrl } from "@/lib/exercisedb-api";
import {
  searchExercisesByName,
  hasExerciseDBKey,
} from "@/lib/exercisedb";
import { resolveGifUri } from "@/lib/exercise-gif-cache";
import { UI } from "@/constants/ui-colors";

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

/**
 * Fetch a GIF URL and return base64-encoded data.
 * This runs in React Native context (no CORS restrictions).
 */
async function fetchGifAsBase64(url: string): Promise<string | null> {
  try {
    // On native, use FileSystem for reliable binary downloads
    if (Platform.OS !== "web") {
      const FileSystem = await import("expo-file-system/legacy");
      const tmpPath = (FileSystem.cacheDirectory || "") + "tmp_gif_" + Date.now() + ".gif";
      const result = await FileSystem.downloadAsync(url, tmpPath);
      if (result.status !== 200) return null;
      const base64 = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      // Clean up temp file (non-blocking)
      FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
      return base64;
    }
    // On web, use fetch + arrayBuffer
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

export default function EnhancedGifPlayer({
  exerciseKey,
  exerciseName,
  height = 260,
  speed = 0.25,
  style,
}: EnhancedGifPlayerProps) {
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
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
    setBase64Data(null);
    setFallbackUrl(null);

    if (!name) {
      setLoading(false);
      return;
    }

    async function resolveGif() {
      // ── Priority 1: CDN GIF (synchronous lookup, same source as library preview) ──
      const cdnUrl = getExerciseDbGifUrl(name);

      if (cdnUrl) {
        if (!mountedRef.current) return;
        setGifUrl(cdnUrl);

        // Try to resolve from disk cache first
        let resolvedUrl = cdnUrl;
        try {
          resolvedUrl = await resolveGifUri(cdnUrl);
        } catch {
          // Use original URL
        }

        if (!mountedRef.current) return;
        setGifUrl(resolvedUrl);

        // Fetch as base64 for WebView speed control
        const b64 = await fetchGifAsBase64(resolvedUrl);
        if (!mountedRef.current) return;
        if (b64) {
          setBase64Data(b64);
        }
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
            .catch(() => {});
        }
      } else {
        // ── Priority 2: ExerciseDB API GIF (no CDN match) ──
        if (hasExerciseDBKey()) {
          try {
            const results = await searchExercisesByName(name, 1);
            if (!mountedRef.current) return;
            if (results.length > 0 && results[0].gifUrl) {
              const apiUrl = results[0].gifUrl;
              setGifUrl(apiUrl);

              // Try disk cache
              let resolvedUrl = apiUrl;
              try {
                resolvedUrl = await resolveGifUri(apiUrl);
              } catch {}

              if (!mountedRef.current) return;
              setGifUrl(resolvedUrl);

              // Fetch as base64
              const b64 = await fetchGifAsBase64(resolvedUrl);
              if (!mountedRef.current) return;
              if (b64) setBase64Data(b64);
            }
          } catch {}
        }
        if (mountedRef.current) setLoading(false);
      }
    }

    resolveGif();

    return () => {
      mountedRef.current = false;
    };
  }, [name]);

  // ── Fallback on GIF error: try API GIF if CDN failed ──
  const handleGifError = useCallback(async () => {
    if (fallbackUrl && !imgError) {
      // Switch to API fallback
      setGifUrl(fallbackUrl);
      setFallbackUrl(null);
      setImgError(false);
      setBase64Data(null);
      // Fetch fallback as base64
      const b64 = await fetchGifAsBase64(fallbackUrl);
      if (mountedRef.current && b64) {
        setBase64Data(b64);
      }
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
            base64Data={base64Data ?? undefined}
            speed={speed}
            height={height}
            autoplay
            showExpandButton
            onLoad={() => setLoading(false)}
            onError={handleGifError}
          />
        )}
      </View>
    </View>
  );
}

const AMBER = UI.gold;
const SURFACE = UI.surface;

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
