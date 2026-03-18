import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
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
 * In-app YouTube video player with fullscreen support.
 * Uses WebView to embed YouTube's iframe player API.
 * Supports inline playback and a fullscreen modal.
 */
export function YouTubePlayer({
  videoId,
  cue,
  height = 200,
}: YouTubePlayerProps) {
  const colors = useColors();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=0&showinfo=0&controls=1`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; overflow: hidden; }
        iframe { width: 100%; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe
        src="${embedUrl}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </body>
    </html>
  `;

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <View>
      {/* Inline Player */}
      <View
        style={[
          styles.playerContainer,
          { height, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" },
        ]}
      >
        {Platform.OS === "web" ? (
          <iframe
            src={embedUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <WebView
            source={{ html: htmlContent }}
            style={{ flex: 1, backgroundColor: "#000" }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            onLoadEnd={handleLoadEnd}
            scrollEnabled={false}
          />
        )}

        {isLoading && Platform.OS !== "web" && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        )}

        {/* Fullscreen button overlay */}
        <Pressable
          onPress={() => setIsFullscreen(true)}
          style={({ pressed }) => [
            styles.fullscreenButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons name="fullscreen" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Form cue */}
      {cue ? (
        <View style={[styles.cueContainer, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="info-outline" size={14} color={colors.muted} />
          <Text style={[styles.cueText, { color: colors.muted }]}>{cue}</Text>
        </View>
      ) : null}

      {/* Fullscreen Modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={["portrait", "landscape"]}
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          {Platform.OS === "web" ? (
            <iframe
              src={embedUrl.replace("autoplay=0", "autoplay=1")}
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <WebView
              source={{
                html: htmlContent.replace("autoplay=0", "autoplay=1"),
              }}
              style={{ flex: 1, backgroundColor: "#000" }}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              scrollEnabled={false}
            />
          )}

          {/* Close button */}
          <Pressable
            onPress={() => setIsFullscreen(false)}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Compact thumbnail button that opens the video player in a modal.
 * Used in list items where inline playback is too large.
 */
export function YouTubePlayerButton({
  videoId,
  cue,
  label = "Watch Demo",
}: YouTubePlayerProps & { label?: string }) {
  const colors = useColors();
  const [showPlayer, setShowPlayer] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setShowPlayer(true)}
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

      <Modal
        visible={showPlayer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlayer(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Exercise Demo
            </Text>
            <Pressable
              onPress={() => setShowPlayer(false)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <MaterialIcons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>

          {/* Player */}
          <View style={styles.modalPlayer}>
            <YouTubePlayer videoId={videoId} cue={cue} height={240} />
          </View>
        </View>
      </Modal>
    </>
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
  fullscreenButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
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
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalPlayer: {
    padding: 16,
  },
});
