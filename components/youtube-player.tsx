import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { getCachedThumbnail, getThumbnailUrl } from "@/lib/thumbnail-cache";

// Lazy import YoutubeIframe only on native to avoid web issues
let YoutubeIframe: typeof import("react-native-youtube-iframe").default | null = null;
if (Platform.OS !== "web") {
  try {
    YoutubeIframe = require("react-native-youtube-iframe").default;
  } catch {
    // Fallback if package not available
  }
}

type DemoMode = "video" | "gif";

interface YouTubePlayerProps {
  /** YouTube video ID */
  videoId: string;
  /** Optional form cue text shown below the player */
  cue?: string;
  /** Height of the inline player (default 200) */
  height?: number;
  /** Animated GIF URL for offline exercise guidance */
  gifUrl?: string;
}

/**
 * Enhanced YouTube video player component with GIF toggle.
 *
 * - On **web**: renders an embedded YouTube iframe.
 * - On **native (iOS/Android)**: uses react-native-youtube-iframe for in-app playback.
 * - **GIF mode**: shows animated exercise GIF from ExerciseDB (offline-capable via expo-image caching).
 * - Thumbnails are cached locally for instant loading.
 */
export function YouTubePlayer({
  videoId,
  cue,
  height = 200,
  gifUrl,
}: YouTubePlayerProps) {
  const colors = useColors();
  const [mode, setMode] = useState<DemoMode>("gif");
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [cachedThumbUri, setCachedThumbUri] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // Load cached thumbnail
  useEffect(() => {
    let cancelled = false;
    getCachedThumbnail(videoId).then((uri) => {
      if (!cancelled) setCachedThumbUri(uri);
    });
    return () => { cancelled = true; };
  }, [videoId]);

  const thumbnailUri = cachedThumbUri || getThumbnailUrl(videoId, "mq");

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "video" ? "gif" : "video"));
    setPlaying(false);
    setShowPlayer(false);
    setReady(false);
  }, []);

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  const onReady = useCallback(() => {
    setReady(true);
  }, []);

  // ── Mode toggle button ──────────────────────────────────────────────────
  const ModeToggle = gifUrl ? (
    <View style={styles.modeToggleRow}>
      <Pressable
        onPress={toggleMode}
        style={({ pressed }) => [
          styles.modeToggleBtn,
          {
            backgroundColor: mode === "gif" ? "#D4AF37" : colors.surface,
            borderColor: mode === "gif" ? "#D4AF37" : colors.border,
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <MaterialIcons
          name="gif"
          size={18}
          color={mode === "gif" ? "#000" : colors.foreground}
        />
        <Text
          style={[
            styles.modeToggleText,
            { color: mode === "gif" ? "#000" : colors.foreground },
          ]}
        >
          GIF Guide
        </Text>
      </Pressable>
      <Pressable
        onPress={toggleMode}
        style={({ pressed }) => [
          styles.modeToggleBtn,
          {
            backgroundColor: mode === "video" ? "#D4AF37" : colors.surface,
            borderColor: mode === "video" ? "#D4AF37" : colors.border,
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <MaterialIcons
          name="play-circle-outline"
          size={18}
          color={mode === "video" ? "#000" : colors.foreground}
        />
        <Text
          style={[
            styles.modeToggleText,
            { color: mode === "video" ? "#000" : colors.foreground },
          ]}
        >
          Video
        </Text>
      </Pressable>
    </View>
  ) : null;

  // ── GIF Mode ────────────────────────────────────────────────────────────
  if (mode === "gif" && gifUrl) {
    return (
      <View>
        {ModeToggle}
        <View
          style={[
            styles.playerContainer,
            {
              height,
              backgroundColor: "#000",
              borderRadius: 12,
              overflow: "hidden",
            },
          ]}
        >
          <Image
            source={gifUrl}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            cachePolicy="disk"
            transition={200}
          />
          {/* GIF badge */}
          <View style={styles.gifBadge}>
            <MaterialIcons name="gif" size={16} color="#fff" />
            <Text style={styles.gifBadgeText}>Offline Guide</Text>
          </View>
        </View>
        {cue ? (
          <View style={[styles.cueContainer, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="info-outline" size={14} color={colors.muted} />
            <Text style={[styles.cueText, { color: colors.muted }]}>{cue}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // ── Video Mode: Web (iframe) ────────────────────────────────────────────
  if (Platform.OS === "web") {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=0&showinfo=0&controls=1`;
    return (
      <View>
        {ModeToggle}
        <View
          style={[
            styles.playerContainer,
            { height, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" },
          ]}
        >
          <iframe
            src={embedUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin"
          />
        </View>
        {cue ? (
          <View style={[styles.cueContainer, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="info-outline" size={14} color={colors.muted} />
            <Text style={[styles.cueText, { color: colors.muted }]}>{cue}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // ── Video Mode: Native (react-native-youtube-iframe) ────────────────────
  return (
    <View>
      {ModeToggle}
      <View
        style={[
          styles.playerContainer,
          {
            height,
            backgroundColor: "#000",
            borderRadius: 12,
            overflow: "hidden",
          },
        ]}
      >
        {showPlayer && YoutubeIframe ? (
          <>
            <YoutubeIframe
              height={height}
              videoId={videoId}
              play={playing}
              onChangeState={onStateChange}
              onReady={onReady}
              webViewProps={{
                allowsInlineMediaPlayback: true,
                mediaPlaybackRequiresUserAction: false,
              }}
            />
            {!ready && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#D4AF37" />
                <Text style={styles.loadingText}>Loading video...</Text>
              </View>
            )}
          </>
        ) : (
          <Pressable
            onPress={() => {
              setShowPlayer(true);
              setPlaying(true);
            }}
            style={({ pressed }) => [
              StyleSheet.absoluteFill,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            {/* Cached thumbnail */}
            <Image
              source={thumbnailUri}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="disk"
              transition={200}
            />
            {/* Play button overlay */}
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <MaterialIcons name="play-arrow" size={40} color="#fff" />
              </View>
            </View>
            {/* Label */}
            <View style={styles.youtubeLabel}>
              <MaterialIcons name="ondemand-video" size={14} color="#fff" />
              <Text style={styles.youtubeLabelText}>Tap to Play</Text>
            </View>
          </Pressable>
        )}
      </View>
      {cue ? (
        <View style={[styles.cueContainer, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="info-outline" size={14} color={colors.muted} />
          <Text style={[styles.cueText, { color: colors.muted }]}>{cue}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Compact thumbnail button for list items.
 * Opens the video in a modal-like inline player.
 */
export function YouTubePlayerButton({
  videoId,
  cue,
  label = "Watch Demo",
  gifUrl,
}: YouTubePlayerProps & { label?: string }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <View>
        <YouTubePlayer videoId={videoId} cue={cue} height={180} gifUrl={gifUrl} />
        <Pressable
          onPress={() => setExpanded(false)}
          style={({ pressed }) => [
            styles.collapseButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons name="expand-less" size={18} color={colors.muted} />
          <Text style={[styles.demoButtonText, { color: colors.muted }]}>
            Collapse
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => setExpanded(true)}
      style={({ pressed }) => [
        styles.demoButton,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
      ]}
    >
      <MaterialIcons name="play-circle-outline" size={20} color="#D4AF37" />
      <Text style={[styles.demoButtonText, { color: colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  playerContainer: {
    position: "relative",
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  modeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  loadingText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245, 158, 11, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  youtubeLabel: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  youtubeLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  gifBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  gifBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  cueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cueText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  demoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  collapseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
