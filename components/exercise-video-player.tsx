/**
 * ExerciseVideoPlayer
 *
 * Replaces the old expo-image GIF player with a proper expo-video player.
 * Streams MP4s from MuscleWiki CDN (or a cached local URI if gif-cache.ts
 * has already downloaded the file).
 *
 * Props
 * ─────
 *  uri         — full MP4 URL (from exercise-gif-registry.ts)
 *  height      — rendered height in px (default 260)
 *  posterUri   — optional thumbnail shown while the video buffers
 *  style       — extra ViewStyle overrides
 *
 * Requirements
 * ────────────
 *  expo-video  (ships with Expo SDK 54 — no separate install needed)
 *
 * Usage
 * ─────
 *  import { ExerciseVideoPlayer } from "@/components/exercise-video-player";
 *
 *  <ExerciseVideoPlayer
 *    uri={EXERCISE_GIFS["male-Barbell-barbell-squat-front"]}
 *    height={280}
 *  />
 */

import React, { useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExerciseVideoPlayerProps {
  /** MP4 URL — can be a remote https:// URL or a local file:// URI from cache */
  uri: string;
  /** Height of the player in pixels. Defaults to 260. */
  height?: number;
  /** Optional poster/thumbnail shown before the video loads */
  posterUri?: string;
  /** Additional style applied to the outer container */
  style?: ViewStyle;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ExerciseVideoPlayer({
  uri,
  height = 260,
  style,
}: ExerciseVideoPlayerProps) {
  // Create a looping, muted, autoplaying video player instance.
  // `useVideoPlayer` is the expo-video SDK 54 hook.
  const player = useVideoPlayer(
    { uri },
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );

  // If the URI changes (e.g. user toggles Front ↔ Side), reload the source.
  useEffect(() => {
    if (!player) return;
    player.replace({ uri });
    player.play();
  }, [uri]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!uri) {
    return (
      <View style={[styles.container, { height }, style, styles.placeholder]}>
        <Text style={styles.placeholderText}>No demo available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#0D1117",
    borderRadius: 12,
    overflow: "hidden",
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
});

export default ExerciseVideoPlayer;
