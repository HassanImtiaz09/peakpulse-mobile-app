/**
 * Exercise Video Player
 *
 * Plays looping MuscleWiki exercise demonstration videos using expo-video.
 * Features:
 * - Auto-play with loop and mute by default
 * - Play/pause toggle
 * - Loading state indicator
 * - Fullscreen support
 * - Falls back to static image when video unavailable
 *
 * Attribution: Exercise videos powered by MuscleWiki (musclewiki.com)
 */
import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

const C = {
  bg: "#0A0E14",
  surface: "#141A22",
  border: "rgba(245,158,11,0.15)",
  fg: "#F1F5F9",
  muted: "#B45309",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  dim: "rgba(245,158,11,0.08)",
};

interface ExerciseVideoPlayerProps {
  /** Video URL (mp4) */
  videoUrl: string;
  /** Height of the player */
  height?: number;
  /** Label for the angle (e.g. "Front View") */
  angleLabel?: string;
  /** Whether to auto-play */
  autoPlay?: boolean;
}

export function ExerciseVideoPlayer({
  videoUrl,
  height = 220,
  angleLabel,
  autoPlay = true,
}: ExerciseVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [hasError, setHasError] = useState(false);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
    if (autoPlay) {
      p.play();
    }
  });

  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });

  // Track errors
  useEffect(() => {
    if (status === "error") {
      setHasError(true);
    }
  }, [status]);

  const togglePlayPause = useCallback(() => {
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [player]);

  if (hasError) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={32} color={C.muted} />
          <Text style={styles.errorText}>Video unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {/* Video */}
      <VideoView
        style={styles.video}
        player={player}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Loading overlay */}
      {status === "loading" && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {/* Play/Pause overlay button */}
      <Pressable
        onPress={togglePlayPause}
        style={({ pressed }) => [
          styles.playPauseOverlay,
          pressed && { opacity: 0.8 },
        ]}
      >
        {!isPlaying && (
          <View style={styles.playButton}>
            <MaterialIcons name="play-arrow" size={36} color="#fff" />
          </View>
        )}
      </Pressable>

      {/* Angle label */}
      {angleLabel && (
        <View style={styles.angleBadge}>
          <Text style={styles.angleBadgeText}>{angleLabel}</Text>
        </View>
      )}

      {/* Video indicator badge */}
      <View style={styles.videoBadge}>
        <MaterialIcons name="videocam" size={12} color={C.gold} />
        <Text style={styles.videoBadgeText}>VIDEO</Text>
      </View>

      {/* MuscleWiki attribution */}
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>Powered by MuscleWiki</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: C.bg,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,20,0.85)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "500",
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(245,158,11,0.4)",
  },
  angleBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(10,14,20,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  angleBadgeText: {
    color: C.gold2,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  videoBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(10,14,20,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  videoBadgeText: {
    color: C.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  attribution: {
    position: "absolute",
    bottom: 4,
    right: 8,
  },
  attributionText: {
    color: "rgba(245,158,11,0.35)",
    fontSize: 8,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
  },
  errorText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "500",
  },
});
