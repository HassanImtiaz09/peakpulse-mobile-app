import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer, type VideoSource } from "expo-video";
import { useEvent } from "expo";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { useFavorites } from "@/lib/favorites-context";
import { getExerciseInfo, type ExerciseAngleView } from "@/lib/exercise-data";

const { width: SCREEN_W } = Dimensions.get("window");

function isVideoUrl(url: string): boolean {
  return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");
}

/** Build a VideoSource with caching enabled (native only) */
function cachedSource(url: string): VideoSource {
  if (Platform.OS === "web") return url;
  return { uri: url, useCaching: true };
}

interface ExerciseDemoPlayerProps {
  gifUrl: string;
  cue?: string;
  height?: number;
  exerciseName?: string;
}

// ─── Web HTML5 Video Player ───────────────────────────────────────────
// On web, expo-video can have issues. Use a native HTML5 <video> tag for reliability.
function WebVideoPlayer({ url, height, fill }: { url: string; height?: number; fill?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (Platform.OS !== "web") return null;

  return (
    <View style={fill ? { width: SCREEN_W, height: SCREEN_W } : { height: height ?? 200, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" }}>
      {loading && !error && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center", zIndex: 2 }]}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      )}
      {error && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center", zIndex: 2 }]}>
          <MaterialIcons name="error-outline" size={32} color="#F59E0B" />
          <Text style={{ color: "#F59E0B", fontSize: 12, marginTop: 4 }}>Video unavailable</Text>
        </View>
      )}
      {/* @ts-ignore - RNW supports HTML video element */}
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          backgroundColor: "#000",
          borderRadius: fill ? 0 : 12,
        }}
      />
    </View>
  );
}

// ─── Native Video Player ──────────────────────────────────────────────
function NativeVideoPlayer({ url, height, fill }: { url: string; height?: number; fill?: boolean }) {
  const source = useMemo(() => cachedSource(url), [url]);
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (status === "error") setHasError(true);
  }, [status]);

  const containerStyle = fill
    ? { width: SCREEN_W, height: SCREEN_W }
    : { height: height ?? 200, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" as const };

  return (
    <View style={containerStyle}>
      {status === "loading" && !hasError && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center", zIndex: 2 }]}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      )}
      {hasError && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center", zIndex: 2 }]}>
          <MaterialIcons name="error-outline" size={32} color="#F59E0B" />
          <Text style={{ color: "#F59E0B", fontSize: 12, marginTop: 4 }}>Video unavailable</Text>
        </View>
      )}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

// ─── Cross-platform Video Player ──────────────────────────────────────
function VideoPlayer({ url, height, fill }: { url: string; height?: number; fill?: boolean }) {
  if (Platform.OS === "web") {
    return <WebVideoPlayer url={url} height={height} fill={fill} />;
  }
  return <NativeVideoPlayer url={url} height={height} fill={fill} />;
}

/** Get angle label from ExerciseAngleView */
function getAngleShortLabel(label: string): string {
  if (label.includes("Side")) return "Side";
  if (label.includes("Front")) return "Front";
  if (label.includes("Back")) return "Back";
  return label;
}

/**
 * Exercise demo player with fullscreen enlarge support and front/side angle toggle.
 * Supports both MP4 video (MuscleWiki) and GIF fallback.
 * Tap the expand icon or the media itself to open fullscreen modal.
 */
export function ExerciseDemoPlayer({
  gifUrl,
  cue,
  height = 200,
  exerciseName,
}: ExerciseDemoPlayerProps) {
  const colors = useColors();
  const [fullscreen, setFullscreen] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = exerciseName ? isFavorite(exerciseName) : false;

  // Look up angle views for this exercise to enable front/side toggle
  const angleViews = useMemo(() => {
    if (!exerciseName) return [];
    const info = getExerciseInfo(exerciseName);
    return info?.angleViews ?? [];
  }, [exerciseName]);

  const hasMultipleAngles = angleViews.length > 1;
  const [activeAngle, setActiveAngle] = useState(0);

  // Current URL: use angle view URL if available, otherwise fall back to gifUrl
  const currentUrl = useMemo(() => {
    if (hasMultipleAngles && angleViews[activeAngle]) {
      return angleViews[activeAngle].gifUrl;
    }
    return gifUrl;
  }, [hasMultipleAngles, angleViews, activeAngle, gifUrl]);

  const isVideo = useMemo(() => isVideoUrl(currentUrl), [currentUrl]);

  const handleToggleFavorite = useCallback(() => {
    if (exerciseName) {
      toggleFavorite(exerciseName);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
  }, [exerciseName, toggleFavorite]);

  const handleAngleChange = useCallback((index: number) => {
    setActiveAngle(index);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  return (
    <View>
      <Pressable
        onPress={openFullscreen}
        style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
      >
        <View style={styles.playerContainer}>
          {isVideo ? (
            <VideoPlayer key={`v-${activeAngle}-${currentUrl}`} url={currentUrl} height={height} />
          ) : (
            <View
              style={[
                { height, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" },
              ]}
            >
              <Image
                key={`img-${activeAngle}`}
                source={currentUrl}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                cachePolicy="disk"
                transition={200}
              />
            </View>
          )}
          {/* Badge */}
          <View style={styles.gifBadge}>
            <MaterialIcons name={isVideo ? "videocam" : "gif"} size={16} color="#fff" />
            <Text style={styles.gifBadgeText}>Exercise Guide</Text>
          </View>
          {/* Angle label overlay */}
          {hasMultipleAngles && angleViews[activeAngle] && (
            <View style={styles.angleLabelOverlay}>
              <Text style={styles.angleLabelText}>{getAngleShortLabel(angleViews[activeAngle].label)}</Text>
            </View>
          )}
          {/* Expand button */}
          <Pressable
            onPress={openFullscreen}
            style={({ pressed }) => [
              styles.expandButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="fullscreen" size={22} color="#fff" />
          </Pressable>
        </View>
      </Pressable>

      {/* Front/Side Angle Toggle */}
      {hasMultipleAngles && (
        <View style={styles.angleToggleRow}>
          {angleViews.map((view, i) => (
            <Pressable
              key={i}
              onPress={() => handleAngleChange(i)}
              style={({ pressed }) => [
                styles.angleToggleBtn,
                activeAngle === i && styles.angleToggleBtnActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialIcons
                name={view.label.includes("Side") ? "switch-video" : "videocam"}
                size={14}
                color={activeAngle === i ? "#0A0500" : "#B45309"}
              />
              <Text style={[
                styles.angleToggleText,
                activeAngle === i && styles.angleToggleTextActive,
              ]}>
                {getAngleShortLabel(view.label)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {cue ? (
        <View style={[styles.cueContainer, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="info-outline" size={14} color={colors.muted} />
          <Text style={[styles.cueText, { color: colors.muted }]}>{cue}</Text>
        </View>
      ) : null}

      {/* Fullscreen Modal */}
      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        onRequestClose={closeFullscreen}
        statusBarTranslucent
      >
        <View style={styles.fullscreenOverlay}>
          {/* Header */}
          <View style={styles.fullscreenHeader}>
            {exerciseName ? (
              <Text style={styles.fullscreenTitle} numberOfLines={1}>
                {exerciseName}
              </Text>
            ) : (
              <View />
            )}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {exerciseName ? (
                <Pressable
                  onPress={handleToggleFavorite}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialIcons
                    name={favorited ? "favorite" : "favorite-border"}
                    size={22}
                    color={favorited ? "#EF4444" : "#fff"}
                  />
                </Pressable>
              ) : null}
              <Pressable
                onPress={closeFullscreen}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Full-size media */}
          <View style={styles.fullscreenImageContainer}>
            {isVideo ? (
              <VideoPlayer key={`fsv-${activeAngle}-${currentUrl}`} url={currentUrl} fill />
            ) : (
              <Image
                key={`fs-${activeAngle}`}
                source={currentUrl}
                style={{ width: SCREEN_W, height: SCREEN_W }}
                contentFit="contain"
                cachePolicy="disk"
                transition={200}
              />
            )}
          </View>

          {/* Fullscreen angle toggle */}
          {hasMultipleAngles && (
            <View style={styles.fullscreenAngleRow}>
              {angleViews.map((view, i) => (
                <Pressable
                  key={i}
                  onPress={() => handleAngleChange(i)}
                  style={[
                    styles.fullscreenAngleBtn,
                    activeAngle === i && styles.fullscreenAngleBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.fullscreenAngleTxt,
                    activeAngle === i && { color: "#0A0500" },
                  ]}>
                    {getAngleShortLabel(view.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Cue text in fullscreen */}
          {cue ? (
            <View style={styles.fullscreenCue}>
              <MaterialIcons name="info-outline" size={16} color="#D4AF37" />
              <Text style={styles.fullscreenCueText}>{cue}</Text>
            </View>
          ) : null}

          {/* Tap to close hint */}
          <Pressable onPress={closeFullscreen} style={styles.tapToCloseArea}>
            <Text style={styles.tapToCloseText}>Tap anywhere to close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Compact button that expands to show the player inline.
 */
export function ExerciseDemoButton({
  gifUrl,
  cue,
  label = "Watch Demo",
  exerciseName,
}: ExerciseDemoPlayerProps & { label?: string }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <View>
        <ExerciseDemoPlayer gifUrl={gifUrl} cue={cue} height={180} exerciseName={exerciseName} />
        <Pressable
          onPress={() => setExpanded(false)}
          style={({ pressed }) => [
            styles.collapseButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialIcons name="expand-less" size={18} color={colors.muted} />
          <Text style={[styles.demoButtonText, { color: colors.muted }]}>Collapse</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => setExpanded(true)}
      style={({ pressed }) => [
        styles.demoButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
      ]}
    >
      <MaterialIcons name="play-circle-outline" size={20} color="#D4AF37" />
      <Text style={[styles.demoButtonText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  playerContainer: {
    position: "relative",
  },
  gifBadge: {
    position: "absolute",
    top: 8,
    left: 8,
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
  angleLabelOverlay: {
    position: "absolute",
    top: 8,
    right: 48,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  angleLabelText: {
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  expandButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 8,
  },
  angleToggleRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  angleToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
  },
  angleToggleBtnActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#FBBF24",
  },
  angleToggleText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "600",
  },
  angleToggleTextActive: {
    color: "#0A0500",
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
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenHeader: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  fullscreenTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImageContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenAngleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  fullscreenAngleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  fullscreenAngleBtnActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#FBBF24",
  },
  fullscreenAngleTxt: {
    color: "#F59E0B",
    fontWeight: "600",
    fontSize: 13,
  },
  fullscreenCue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  fullscreenCueText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  tapToCloseArea: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
  tapToCloseText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
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
