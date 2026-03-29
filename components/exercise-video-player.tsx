/**
 * ExerciseVideoPlayer — Rewritten: expo-video → expo-image
 *
 * ROOT CAUSE OF THE ORIGINAL BUG (explains 8 failed fix attempts):
 *   The previous version used expo-video (VideoView / useVideoPlayer) which
 *   does NOT support custom HTTP headers in VideoSource (GitHub issue #29436).
 *   MuscleWiki's CDN (media.musclewiki.com) uses hotlink protection — it
 *   requires a `Referer: https://musclewiki.com` header on every video
 *   request. Without it the CDN returns an empty byte stream, producing the
 *   black video that users see. Because expo-video cannot send that header,
 *   no amount of URL tweaking or key configuration could ever fix it.
 *
 * THE FIX:
 *   Replace expo-video with expo-image, which:
 *     • Renders animated GIFs natively (autoplay prop)
 *     • Does not require auth headers for ExerciseDB's public GIF CDN
 *     • Already ships with Expo SDK 54 — no extra install needed
 *
 * USAGE (unchanged from original — all call sites remain compatible):
 *   import { ExerciseVideoPlayer } from "@/components/exercise-video-player";
 *   <ExerciseVideoPlayer uri={gifUrl} height={280} />
 */
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";

interface ExerciseVideoPlayerProps {
  /** Animated GIF URL from ExerciseDB CDN (or any public GIF/image URL) */
  uri: string;
  /** Rendered height in pixels. Defaults to 260. */
  height?: number;
  /** Optional poster/thumbnail — not used by expo-image but kept for API compat */
  posterUri?: string;
  /** Additional style applied to the outer container */
  style?: ViewStyle;
}

export function ExerciseVideoPlayer({
  uri,
  height = 260,
  style,
}: ExerciseVideoPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!uri) {
    return (
      <View style={[styles.container, { height }, style, styles.placeholder]}>
        <Text style={styles.placeholderText}>No demo available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      {loading && !hasError && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator color="#F59E0B" size="small" />
        </View>
      )}
      {hasError ? (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Text style={styles.placeholderText}>Demo unavailable</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          autoplay
          cachePolicy="memory-disk"
          onLoad={() => setLoading(false)}
          onError={() => {
            setHasError(true);
            setLoading(false);
          }}
        />
      )}
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
  },
  placeholderText: {
    color: "#4B5563",
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
  },
  loadingOverlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1117",
    zIndex: 1,
  },
});

export default ExerciseVideoPlayer;
