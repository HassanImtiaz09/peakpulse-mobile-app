/**
 * Enhanced GIF Player
 *
 * Features:
 * - Multi-angle views (2-3 per exercise) with angle selector
 * - Uses locally bundled GIF assets for reliable offline playback
 * - Slow-motion playback simulation via opacity pulse
 * - Loop toggle control
 * - Focus annotations showing what to watch for each angle
 * - Fullscreen modal with favorites
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Platform, Modal, Dimensions } from "react-native";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import type { ExerciseAngleView } from "@/lib/exercise-data";
import { useFavorites } from "@/lib/favorites-context";
import { resolveGifAssetOrNull, hasSideViewGif } from "@/lib/gif-resolver";
import { getExerciseVideoUrl, hasExerciseVideo } from "@/lib/exercise-video-registry";
import { ExerciseVideoPlayer } from "@/components/exercise-video-player";

const { width: SCREEN_W } = Dimensions.get("window");

interface EnhancedGifPlayerProps {
  /** Multi-angle views for this exercise */
  angleViews: ExerciseAngleView[];
  /** Exercise name for display */
  exerciseName: string;
  /** Height of the player */
  height?: number;
  /** Whether to start in compact mode */
  compact?: boolean;
}

const C = {
  bg: "#0A0E14",
  surface: "#141A22",
  surface2: "#1A0F00",
  border: "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg: "#F1F5F9",
  muted: "#B45309",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  gold3: "#FDE68A",
  dim: "rgba(245,158,11,0.08)",
};

export function EnhancedGifPlayer({
  angleViews,
  exerciseName,
  height = 220,
  compact = false,
}: EnhancedGifPlayerProps) {
  const [activeAngle, setActiveAngle] = useState(0);
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [showFocus, setShowFocus] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [useVideo, setUseVideo] = useState(true); // prefer video when available
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(exerciseName);

  // Check if this exercise has a video available
  const videoAvailable = hasExerciseVideo(exerciseName);

  const currentView = angleViews[activeAngle] || angleViews[0];
  if (!currentView) return null;

  // Resolve the GIF URL to a local asset (null if not available)
  const currentAsset = useMemo(
    () => resolveGifAssetOrNull(currentView.gifUrl),
    [currentView.gifUrl]
  );

  // Check if this is a side view with no distinct side-view image
  const isSideView = currentView.label.includes("Side") || currentView.gifUrl.includes("side");
  const hasDistinctSide = isSideView ? hasSideViewGif(currentView.gifUrl) : false;
  // Show "missing" only if it's a side view AND we have no asset at all
  // If we have an asset (even if it's the front view), show it with a label
  const isMissingSideView = isSideView && currentAsset === null;

  // Resolve video URL for current angle
  const currentVideoUrl = useMemo(() => {
    if (!videoAvailable || !useVideo) return null;
    const angle = isSideView ? "side" : "front";
    return getExerciseVideoUrl(exerciseName, angle);
  }, [videoAvailable, useVideo, isSideView, exerciseName]);

  const showVideo = useVideo && currentVideoUrl !== null;

  // Slow-motion pulse animation
  useEffect(() => {
    if (isSlowMotion) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSlowMotion, pulseAnim]);

  const handleAngleChange = useCallback((index: number) => {
    setActiveAngle(index);
    setImageKey((k) => k + 1);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const toggleSlowMotion = useCallback(() => {
    setIsSlowMotion((v) => !v);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping((v) => {
      if (!v) {
        setImageKey((k) => k + 1);
      }
      return !v;
    });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const toggleFocus = useCallback(() => {
    setShowFocus((v) => !v);
  }, []);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(exerciseName);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [exerciseName, toggleFavorite]);

  const toggleVideoMode = useCallback(() => {
    setUseVideo((v) => !v);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Media Display */}
      <View style={[styles.gifContainer, { height }]}>
        {showVideo ? (
          <ExerciseVideoPlayer
            videoUrl={currentVideoUrl}
            height={height}
            angleLabel={currentView.label}
            autoPlay
          />
        ) : (
          <Animated.View style={[styles.gifWrapper, { opacity: isSlowMotion ? pulseAnim : 1 }]}>
            {isMissingSideView ? (
              <View style={styles.missingViewContainer}>
                <MaterialIcons name="videocam-off" size={40} color="rgba(245,158,11,0.4)" />
                <Text style={styles.missingViewTitle}>Side View Not Available</Text>
                <Text style={styles.missingViewSubtitle}>Switch to Front view for the demo</Text>
              </View>
            ) : (
              <Image
                key={`${activeAngle}-${imageKey}`}
                source={typeof currentAsset === "string" ? { uri: currentAsset } : currentAsset}
                style={styles.gif}
                contentFit="contain"
                cachePolicy="memory-disk"
                recyclingKey={`${exerciseName}-${activeAngle}`}
                transition={200}
              />
            )}
          </Animated.View>
        )}

        {/* Slow-motion overlay indicator (image mode only) */}
        {!showVideo && isSlowMotion && (
          <View style={styles.slowMotionBadge}>
            <MaterialIcons name="slow-motion-video" size={12} color={C.gold} />
            <Text style={styles.slowMotionText}>SLOW-MO</Text>
          </View>
        )}

        {/* Angle label overlay (image mode only) */}
        {!showVideo && (
          <View style={styles.angleLabelOverlay}>
            <Text style={styles.angleLabelText}>{currentView.label}</Text>
            {isSideView && !hasDistinctSide && currentAsset !== null && (
              <Text style={styles.angleFallbackText}>Front angle shown</Text>
            )}
          </View>
        )}

        {/* Fullscreen expand button (image mode only) */}
        {!showVideo && (
          <Pressable
            onPress={() => setFullscreen(true)}
            style={({ pressed }) => [styles.expandBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="fullscreen" size={22} color="#fff" />
          </Pressable>
        )}
      </View>

      {/* Focus Annotation */}
      {showFocus && (
        <View style={styles.focusBox}>
          <MaterialIcons name="visibility" size={14} color={C.gold} />
          <Text style={styles.focusText}>{currentView.focus}</Text>
        </View>
      )}

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        {/* Angle Selector */}
        <View style={styles.angleSelector}>
          {angleViews.map((view, i) => (
            <Pressable
              key={i}
              onPress={() => handleAngleChange(i)}
              style={({ pressed }) => [
                styles.angleButton,
                activeAngle === i && styles.angleButtonActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[
                styles.angleButtonText,
                activeAngle === i && styles.angleButtonTextActive,
              ]}>
                {getAngleShortLabel(view.label, i)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Playback Controls */}
        <View style={styles.playbackControls}>
          {/* Video/Image toggle (only when video available) */}
          {videoAvailable && (
            <Pressable
              onPress={toggleVideoMode}
              style={({ pressed }) => [
                styles.controlButton,
                useVideo && styles.controlButtonActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialIcons
                name={useVideo ? "videocam" : "image"}
                size={16}
                color={useVideo ? C.bg : C.gold}
              />
            </Pressable>
          )}

          {/* Focus toggle */}
          <Pressable
            onPress={toggleFocus}
            style={({ pressed }) => [
              styles.controlButton,
              showFocus && styles.controlButtonActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons
              name="visibility"
              size={16}
              color={showFocus ? C.bg : C.gold}
            />
          </Pressable>

          {/* Slow-motion toggle */}
          <Pressable
            onPress={toggleSlowMotion}
            style={({ pressed }) => [
              styles.controlButton,
              isSlowMotion && styles.controlButtonActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons
              name="slow-motion-video"
              size={16}
              color={isSlowMotion ? C.bg : C.gold}
            />
          </Pressable>

          {/* Loop toggle */}
          <Pressable
            onPress={toggleLoop}
            style={({ pressed }) => [
              styles.controlButton,
              isLooping && styles.controlButtonActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons
              name="loop"
              size={16}
              color={isLooping ? C.bg : C.gold}
            />
          </Pressable>
        </View>
      </View>

      {/* Angle dots indicator */}
      {angleViews.length > 1 && (
        <View style={styles.dotsRow}>
          {angleViews.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                activeAngle === i && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Fullscreen Modal */}
      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
        statusBarTranslucent
      >
        <View style={styles.fullscreenOverlay}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>{exerciseName}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={handleToggleFavorite}
                style={({ pressed }) => [styles.fullscreenClose, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons
                  name={favorited ? "favorite" : "favorite-border"}
                  size={22}
                  color={favorited ? "#EF4444" : "#fff"}
                />
              </Pressable>
              <Pressable
                onPress={() => setFullscreen(false)}
                style={({ pressed }) => [styles.fullscreenClose, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
          <View style={styles.fullscreenImageWrap}>
            {isMissingSideView ? (
              <View style={[styles.missingViewContainer, { width: SCREEN_W, height: SCREEN_W }]}>
                <MaterialIcons name="videocam-off" size={56} color="rgba(245,158,11,0.4)" />
                <Text style={[styles.missingViewTitle, { fontSize: 18 }]}>Side View Not Available</Text>
                <Text style={styles.missingViewSubtitle}>Switch to Front view for the demo</Text>
              </View>
            ) : (
              <Image
                key={`fs-${activeAngle}-${imageKey}`}
                source={typeof currentAsset === "string" ? { uri: currentAsset } : currentAsset}
                style={{ width: SCREEN_W, height: SCREEN_W }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
              />
            )}
          </View>
          <View style={styles.fullscreenAngleRow}>
            {angleViews.map((view, i) => (
              <Pressable
                key={i}
                onPress={() => handleAngleChange(i)}
                style={[styles.fullscreenAngleBtn, activeAngle === i && styles.fullscreenAngleBtnActive]}
              >
                <Text style={[styles.fullscreenAngleTxt, activeAngle === i && { color: C.bg }]}>
                  {getAngleShortLabel(view.label, i)}
                </Text>
              </Pressable>
            ))}
          </View>
          {currentView.focus ? (
            <View style={styles.fullscreenFocus}>
              <MaterialIcons name="visibility" size={16} color={C.gold} />
              <Text style={styles.fullscreenFocusTxt}>{currentView.focus}</Text>
            </View>
          ) : null}
          <Pressable onPress={() => setFullscreen(false)} style={styles.fullscreenHint}>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Tap to close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function getAngleShortLabel(label: string, index: number): string {
  if (label.includes("Side")) return "Side";
  if (label.includes("Front")) return "Front";
  if (label.includes("Back")) return "Back";
  if (label.includes("Top")) return "Top";
  if (label.includes("Close")) return "Detail";
  return `View ${index + 1}`;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  gifContainer: {
    width: "100%",
    backgroundColor: C.bg,
    position: "relative",
  },
  gifWrapper: {
    flex: 1,
  },
  gif: {
    flex: 1,
    width: "100%",
  },
  slowMotionBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10,5,0,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border2,
  },
  slowMotionText: {
    color: C.gold,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  angleLabelOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(10,5,0,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  angleLabelText: {
    color: C.gold3,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  angleFallbackText: {
    color: "rgba(245,158,11,0.5)",
    fontSize: 8,
    fontWeight: "400",
    marginTop: 1,
  },
  focusBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.dim,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  focusText: {
    color: C.gold3,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  angleSelector: {
    flexDirection: "row",
    gap: 4,
  },
  angleButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.dim,
    borderWidth: 1,
    borderColor: "transparent",
  },
  angleButtonActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: C.border2,
  },
  angleButtonText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  angleButtonTextActive: {
    color: C.gold,
  },
  playbackControls: {
    flexDirection: "row",
    gap: 6,
  },
  controlButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.dim,
    borderWidth: 1,
    borderColor: "transparent",
  },
  controlButtonActive: {
    backgroundColor: C.gold,
    borderColor: C.gold2,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(245,158,11,0.2)",
  },
  dotActive: {
    backgroundColor: C.gold,
    width: 12,
  },
  expandBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 8,
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
  fullscreenClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImageWrap: {
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
    borderColor: C.border2,
  },
  fullscreenAngleBtnActive: {
    backgroundColor: C.gold,
    borderColor: C.gold2,
  },
  fullscreenAngleTxt: {
    color: C.gold,
    fontWeight: "600",
    fontSize: 13,
  },
  fullscreenFocus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 24,
  },
  fullscreenFocusTxt: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  fullscreenHint: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
  missingViewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
    gap: 8,
  },
  missingViewTitle: {
    color: C.fg,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  missingViewSubtitle: {
    color: C.muted,
    fontSize: 12,
  },
});
