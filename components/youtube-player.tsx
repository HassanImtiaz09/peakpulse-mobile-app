import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/use-colors";

interface YouTubePlayerProps {
  /** YouTube video ID */
  videoId: string;
  /** Optional form cue text shown below the player */
  cue?: string;
  /** Height of the inline player (default 200) */
  height?: number;
}

/**
 * YouTube video player component.
 *
 * - On **web**: renders an embedded YouTube iframe (works natively in browsers).
 * - On **native (iOS/Android)**: shows a YouTube thumbnail with a play button overlay.
 *   Tapping opens the video in the system browser via expo-web-browser,
 *   which guarantees reliable YouTube playback without WebView Error 153.
 */
export function YouTubePlayer({
  videoId,
  cue,
  height = 200,
}: YouTubePlayerProps) {
  const colors = useColors();
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=0&showinfo=0&controls=1`;

  // YouTube provides thumbnail images at various qualities
  // maxresdefault (1280x720), sddefault (640x480), hqdefault (480x360), mqdefault (320x180)
  const thumbnailUrl = thumbnailError
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  const openInBrowser = useCallback(async () => {
    try {
      await WebBrowser.openBrowserAsync(youtubeUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: "#F59E0B",
        toolbarColor: "#0A0500",
      });
    } catch {
      // Fallback: try opening in system browser
      try {
        await WebBrowser.openBrowserAsync(youtubeUrl);
      } catch {
        // Silent fail — user can still see the thumbnail
      }
    }
  }, [youtubeUrl]);

  // ── Web: use iframe embed (works perfectly in browsers) ──────────────────
  if (Platform.OS === "web") {
    return (
      <View>
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

  // ── Native: thumbnail preview + open in system browser ───────────────────
  return (
    <View>
      <Pressable
        onPress={openInBrowser}
        style={({ pressed }) => [
          styles.playerContainer,
          {
            height,
            backgroundColor: "#000",
            borderRadius: 12,
            overflow: "hidden",
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        {/* Thumbnail Image */}
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoadStart={() => setThumbnailLoading(true)}
          onLoadEnd={() => setThumbnailLoading(false)}
          onError={() => {
            setThumbnailError(true);
            setThumbnailLoading(false);
          }}
        />

        {/* Loading indicator */}
        {thumbnailLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        )}

        {/* Play button overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <MaterialIcons name="play-arrow" size={40} color="#fff" />
          </View>
        </View>

        {/* "Watch on YouTube" label */}
        <View style={styles.youtubeLabel}>
          <MaterialIcons name="ondemand-video" size={14} color="#fff" />
          <Text style={styles.youtubeLabelText}>Watch Demo</Text>
        </View>
      </Pressable>

      {/* Form cue */}
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
 * Compact thumbnail button that opens the video in the system browser.
 * Used in list items where inline playback is too large.
 */
export function YouTubePlayerButton({
  videoId,
  cue,
  label = "Watch Demo",
}: YouTubePlayerProps & { label?: string }) {
  const colors = useColors();

  const openInBrowser = useCallback(async () => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      if (Platform.OS === "web") {
        window.open(youtubeUrl, "_blank");
      } else {
        await WebBrowser.openBrowserAsync(youtubeUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          controlsColor: "#F59E0B",
          toolbarColor: "#0A0500",
        });
      }
    } catch {
      // Silent fail
    }
  }, [videoId]);

  return (
    <Pressable
      onPress={openInBrowser}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
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
  demoButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
