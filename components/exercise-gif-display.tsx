/**
 * ExerciseGifDisplay
 *
 * Renders an animated GIF exercise demo using expo-image.
 *
 * Resolution chain (fast → slow):
 *   1. Synchronous CDN lookup via getExerciseDbGifUrl() — 75 exercises, instant
 *   2. Async ExerciseDB RapidAPI call via getExerciseGifUrl() — 1300+ exercises
 *   3. Fallback URI if provided
 *   4. "Demo not available" placeholder
 *
 * WHY expo-image instead of expo-video:
 *   expo-video (VideoView) does not support custom HTTP headers (issue #29436).
 *   MuscleWiki's CDN requires a Referer header — without it every request
 *   returns a black/empty stream in React Native.
 *   expo-image handles animated GIFs natively and requires no auth headers.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { getExerciseGifUrl, hasExerciseDBKey } from "@/lib/exercisedb";
import { getExerciseDbGifUrl } from "@/lib/exercisedb-api";
import { UI } from "@/constants/ui-colors";

interface ExerciseGifDisplayProps {
  /** Exercise name used for lookup (e.g. "barbell squat", "Bench Press") */
  exerciseName: string;
  /** Static fallback URI shown if all lookups fail */
  fallbackUri?: string;
  height?: number;
  style?: ViewStyle;
}

export function ExerciseGifDisplay({
  exerciseName,
  fallbackUri,
  height = 260,
  style,
}: ExerciseGifDisplayProps) {
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setImgError(false);

    // Step 1: Try synchronous CDN lookup (instant, covers 104+ name variants)
    const cdnUrl = getExerciseDbGifUrl(exerciseName);
    if (cdnUrl) {
      setGifUrl(cdnUrl);
      setLoading(false);
      return () => { mountedRef.current = false; };
    }

    // Step 2: Try async ExerciseDB RapidAPI call (covers 1300+ exercises)
    setLoading(true);
    if (hasExerciseDBKey()) {
      getExerciseGifUrl(exerciseName).then((url) => {
        if (!mountedRef.current) return;
        if (url) {
          setGifUrl(url);
        } else if (fallbackUri) {
          setGifUrl(fallbackUri);
        }
        setLoading(false);
      });
    } else if (fallbackUri) {
      // No API key — use fallback
      setGifUrl(fallbackUri);
      setLoading(false);
    } else {
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [exerciseName, fallbackUri]);

  const noContent = !gifUrl && !loading;

  if (noContent || imgError) {
    return (
      <View style={[styles.container, { height }, style, styles.placeholder]}>
        <Text style={styles.placeholderTitle}>Demo not available</Text>
        {!hasExerciseDBKey() && (
          <Text style={styles.placeholderHint}>
            Add EXPO_PUBLIC_RAPIDAPI_KEY to .env to enable animated demos
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingLayer]}>
          <ActivityIndicator color={UI.gold} size="small" />
        </View>
      )}
      {gifUrl ? (
        <Image
          source={{ uri: gifUrl }}
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#0D1117",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
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
  loadingLayer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1117",
    zIndex: 1,
  },
});

export default ExerciseGifDisplay;
