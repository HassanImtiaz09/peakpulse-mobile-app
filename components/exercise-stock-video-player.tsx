/**
 * ExerciseStockVideoPlayer — expo-video based player for stock exercise videos.
 *
 * Features:
 *  • 0.25x / 0.5x / 1x speed selector (tap speed badge to cycle)
 *  • Play / Pause overlay (tap video to toggle)
 *  • Seek ±3s buttons
 *  • Fullscreen support (native)
 *  • Loop playback
 *  • Built-in caching (useCaching: true)
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import type { VideoSource } from "expo-video";
import { useEvent } from "expo";
import { MaterialIcons } from "@expo/vector-icons";

const SPEED_OPTIONS = [0.25, 0.5, 1] as const;
type Speed = (typeof SPEED_OPTIONS)[number];

interface ExerciseStockVideoPlayerProps {
  /** Direct MP4 URL (e.g. from Pexels CDN) */
  videoUrl: string;
  /** Height of the video view. Defaults to 280. */
  height?: number;
  /** Whether to loop. Defaults to true. */
  loop?: boolean;
  /** Initial speed. Defaults to 0.25. */
  initialSpeed?: Speed;
}

export function ExerciseStockVideoPlayer({
  videoUrl,
  height = 280,
  loop = true,
  initialSpeed = 0.25,
}: ExerciseStockVideoPlayerProps) {
  const [speed, setSpeed] = useState<Speed>(initialSpeed);

  // Build video source with caching enabled on native
  const videoSource: VideoSource = {
    uri: videoUrl,
    ...(Platform.OS !== "web" ? { useCaching: true } : {}),
  };

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = loop;
    p.playbackRate = initialSpeed;
    p.play();
  });

  // Listen to playing state changes
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  // Listen to status changes for loading indicator
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });

  const togglePlayPause = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const cycleSpeed = useCallback(() => {
    const currentIdx = SPEED_OPTIONS.indexOf(speed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIdx];
    setSpeed(newSpeed);
    player.playbackRate = newSpeed;
  }, [speed, player]);

  const seekBackward = useCallback(() => {
    player.seekBy(-3);
  }, [player]);

  const seekForward = useCallback(() => {
    player.seekBy(3);
  }, [player]);

  const isLoading = status === "loading";

  if (!videoUrl) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholderInner}>
          <MaterialIcons name="videocam-off" size={32} color="#4B5563" />
          <Text style={styles.placeholderText}>No video available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: height + 58 }]}>
      {/* Video View */}
      <View style={[styles.videoWrapper, { height }]}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          contentFit="contain"
          nativeControls={false}
        />

        {/* Loading overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#D4A843" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}

        {/* Tap-to-play/pause overlay */}
        <Pressable style={styles.tapOverlay} onPress={togglePlayPause}>
          {!isPlaying && !isLoading && (
            <View style={styles.playIconContainer}>
              <MaterialIcons name="play-arrow" size={56} color="#fff" />
            </View>
          )}
        </Pressable>

        {/* Speed badge (top-right) */}
        <Pressable style={styles.speedBadge} onPress={cycleSpeed}>
          <Text style={styles.speedBadgeText}>{speed}x</Text>
        </Pressable>

        {/* Slow-motion label */}
        {speed < 1 && (
          <View style={styles.slowMoLabel}>
            <MaterialIcons name="slow-motion-video" size={14} color="#D4A843" />
            <Text style={styles.slowMoText}>Slow Motion</Text>
          </View>
        )}
      </View>

      {/* Controls bar */}
      <View style={styles.controlsBar}>
        {/* Seek backward */}
        <Pressable
          onPress={seekBackward}
          style={({ pressed }) => [
            styles.controlButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <MaterialIcons name="replay" size={22} color="#D4A843" />
          <Text style={styles.controlLabel}>-3s</Text>
        </Pressable>

        {/* Play/Pause */}
        <Pressable
          onPress={togglePlayPause}
          style={({ pressed }) => [
            styles.playButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
        >
          <MaterialIcons
            name={isPlaying ? "pause" : "play-arrow"}
            size={28}
            color="#0D1117"
          />
        </Pressable>

        {/* Seek forward */}
        <Pressable
          onPress={seekForward}
          style={({ pressed }) => [
            styles.controlButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <MaterialIcons name="forward-5" size={22} color="#D4A843" />
          <Text style={styles.controlLabel}>+3s</Text>
        </Pressable>

        {/* Speed selector */}
        <Pressable
          onPress={cycleSpeed}
          style={({ pressed }) => [
            styles.speedButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.speedButtonText}>{speed}x</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoWrapper: {
    width: "100%",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  placeholderInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    color: "#4B5563",
    fontSize: 13,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#ccc",
    fontSize: 13,
    marginTop: 8,
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  speedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(212,168,67,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speedBadgeText: {
    color: "#0D1117",
    fontSize: 13,
    fontWeight: "700",
  },
  slowMoLabel: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  slowMoText: {
    color: "#D4A843",
    fontSize: 11,
    fontWeight: "600",
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#161B22",
    gap: 20,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    color: "#9BA1A6",
    fontSize: 10,
    marginTop: 2,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D4A843",
    justifyContent: "center",
    alignItems: "center",
  },
  speedButton: {
    backgroundColor: "rgba(212,168,67,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.4)",
  },
  speedButtonText: {
    color: "#D4A843",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ExerciseStockVideoPlayer;
