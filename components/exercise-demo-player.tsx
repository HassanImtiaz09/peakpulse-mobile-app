import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { useFavorites } from "@/lib/favorites-context";
import { getExerciseInfo } from "@/lib/exercise-data";
import { resolveGifAsset } from "@/lib/gif-resolver";
import { getFormAnnotations, hasFormAnnotations } from "@/lib/form-annotations";
import {
  getAudioCues,
  hasAudioCues,
  speakCue,
  stopSpeaking,
  getPhaseColor,
  getPhaseIcon,
} from "@/lib/audio-form-cues";
import type { FormCue } from "@/lib/audio-form-cues";
import {
  FormAnnotationOverlay,
  AnnotationLegend,
} from "@/components/form-annotation-overlay";

const { width: SCREEN_W } = Dimensions.get("window");

interface ExerciseDemoPlayerProps {
  /** Legacy gifUrl prop (ignored if gifAsset is provided) */
  gifUrl?: string;
  /** Exercise image asset — CDN URL string or legacy require() number */
  gifAsset?: number | string;
  cue?: string;
  height?: number;
  exerciseName?: string;
  /** Callback when user wants to compare their photo */
  onComparePhoto?: () => void;
}

/** Get angle label from ExerciseAngleView */
function getAngleShortLabel(label: string): string {
  if (label.includes("Side")) return "Side";
  if (label.includes("Front")) return "Front";
  if (label.includes("Back")) return "Back";
  return label;
}

/**
 * Exercise demo player with:
 * - Front/side angle toggle
 * - Fullscreen enlarge
 * - Form annotation overlays (joint angles, alignment lines, checkpoints)
 * - Audio form cues with step-by-step TTS
 * - Compare photo button
 */
export function ExerciseDemoPlayer({
  gifUrl,
  gifAsset,
  cue,
  height = 200,
  exerciseName,
  onComparePhoto,
}: ExerciseDemoPlayerProps) {
  const colors = useColors();
  const [fullscreen, setFullscreen] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = exerciseName ? isFavorite(exerciseName) : false;

  // Annotations state
  const [showAnnotations, setShowAnnotations] = useState(false);
  const annotations = useMemo(
    () => (exerciseName ? getFormAnnotations(exerciseName) : null),
    [exerciseName]
  );
  const canAnnotate = !!annotations;

  // Audio cues state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCueIndex, setCurrentCueIndex] = useState(-1);
  const audioCues = useMemo(
    () => (exerciseName ? getAudioCues(exerciseName) : null),
    [exerciseName]
  );
  const canPlayAudio = !!audioCues;
  const playingRef = useRef(false);

  // Angle views
  const angleViews = useMemo(() => {
    if (!exerciseName) return [];
    const info = getExerciseInfo(exerciseName);
    return info?.angleViews ?? [];
  }, [exerciseName]);

  const hasMultipleAngles = angleViews.length > 1;
  const [activeAngle, setActiveAngle] = useState(0);

  // Resolve the image asset
  const currentAsset = useMemo(() => {
    if (hasMultipleAngles && angleViews[activeAngle]) {
      return resolveGifAsset(angleViews[activeAngle].gifUrl);
    }
    if (gifAsset) return gifAsset;
    if (gifUrl) return resolveGifAsset(gifUrl);
    return resolveGifAsset("");
  }, [hasMultipleAngles, angleViews, activeAngle, gifAsset, gifUrl]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      playingRef.current = false;
      stopSpeaking();
    };
  }, []);

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

  const toggleAnnotations = useCallback(() => {
    setShowAnnotations((prev) => !prev);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  // Audio cue playback
  const playAudioCues = useCallback(async () => {
    if (!audioCues) return;
    if (isPlaying) {
      // Stop
      playingRef.current = false;
      stopSpeaking();
      setIsPlaying(false);
      setCurrentCueIndex(-1);
      return;
    }

    setIsPlaying(true);
    playingRef.current = true;

    for (let i = 0; i < audioCues.cues.length; i++) {
      if (!playingRef.current) break;
      setCurrentCueIndex(i);
      await speakCue(audioCues.cues[i].text);
      if (!playingRef.current) break;
      // Wait for pause duration
      await new Promise<void>((resolve) =>
        setTimeout(resolve, audioCues.cues[i].pauseAfter)
      );
    }

    playingRef.current = false;
    setIsPlaying(false);
    setCurrentCueIndex(-1);
  }, [audioCues, isPlaying]);

  const imageWidth = SCREEN_W - 32; // approximate inline width

  return (
    <View>
      <Pressable
        onPress={openFullscreen}
        style={({ pressed }) => [
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
      >
        <View style={styles.playerContainer}>
          <View
            style={[
              {
                height,
                backgroundColor: "#000",
                borderRadius: 12,
                overflow: "hidden",
              },
            ]}
          >
            <Image
              key={`img-${activeAngle}-${currentAsset}`}
              source={
                typeof currentAsset === "string"
                  ? { uri: currentAsset }
                  : currentAsset
              }
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
            {/* Form Annotation Overlay */}
            {showAnnotations && annotations && (
              <FormAnnotationOverlay
                annotation={annotations}
                width={imageWidth}
                height={height}
                simplified={false}
              />
            )}
          </View>
          {/* Badge */}
          <View style={styles.gifBadge}>
            <MaterialIcons name="gif" size={16} color="#fff" />
            <Text style={styles.gifBadgeText}>Exercise Guide</Text>
          </View>
          {/* Angle label overlay */}
          {hasMultipleAngles && angleViews[activeAngle] && (
            <View style={styles.angleLabelOverlay}>
              <Text style={styles.angleLabelText}>
                {getAngleShortLabel(angleViews[activeAngle].label)}
              </Text>
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
                name={
                  view.label.includes("Side") ? "switch-video" : "videocam"
                }
                size={14}
                color={activeAngle === i ? "#0A0E14" : "#B45309"}
              />
              <Text
                style={[
                  styles.angleToggleText,
                  activeAngle === i && styles.angleToggleTextActive,
                ]}
              >
                {getAngleShortLabel(view.label)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Action Bar: Annotations, Audio, Compare */}
      <View style={styles.actionBar}>
        {canAnnotate && (
          <Pressable
            onPress={toggleAnnotations}
            style={({ pressed }) => [
              styles.actionBtn,
              showAnnotations && styles.actionBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons
              name="architecture"
              size={16}
              color={showAnnotations ? "#0A0E14" : "#D4AF37"}
            />
            <Text
              style={[
                styles.actionBtnText,
                showAnnotations && styles.actionBtnTextActive,
              ]}
            >
              Form Cues
            </Text>
          </Pressable>
        )}
        {canPlayAudio && (
          <Pressable
            onPress={playAudioCues}
            style={({ pressed }) => [
              styles.actionBtn,
              isPlaying && styles.actionBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons
              name={isPlaying ? "stop" : "volume-up"}
              size={16}
              color={isPlaying ? "#0A0E14" : "#D4AF37"}
            />
            <Text
              style={[
                styles.actionBtnText,
                isPlaying && styles.actionBtnTextActive,
              ]}
            >
              {isPlaying ? "Stop" : "Audio Guide"}
            </Text>
          </Pressable>
        )}
        {onComparePhoto && (
          <Pressable
            onPress={onComparePhoto}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="compare" size={16} color="#D4AF37" />
            <Text style={styles.actionBtnText}>Compare</Text>
          </Pressable>
        )}
      </View>

      {/* Annotation Legend */}
      {showAnnotations && canAnnotate && <AnnotationLegend />}

      {/* Audio Cue Progress */}
      {isPlaying && audioCues && currentCueIndex >= 0 && (
        <View style={styles.audioCueCard}>
          <View style={styles.audioCueHeader}>
            <View
              style={[
                styles.audioCuePhaseDot,
                {
                  backgroundColor: getPhaseColor(
                    audioCues.cues[currentCueIndex].phase
                  ),
                },
              ]}
            />
            <Text style={styles.audioCuePhase}>
              {audioCues.cues[currentCueIndex].phase.toUpperCase()}
            </Text>
            <Text style={styles.audioCueStep}>
              Step {currentCueIndex + 1}/{audioCues.cues.length}
            </Text>
          </View>
          <Text style={styles.audioCueLabel}>
            {audioCues.cues[currentCueIndex].label}
          </Text>
          <Text style={styles.audioCueText}>
            {audioCues.cues[currentCueIndex].text}
          </Text>
          {/* Progress dots */}
          <View style={styles.audioCueDots}>
            {audioCues.cues.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.audioCueDot,
                  i === currentCueIndex && styles.audioCueDotActive,
                  i < currentCueIndex && styles.audioCueDotDone,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {cue ? (
        <View
          style={[styles.cueContainer, { backgroundColor: colors.surface }]}
        >
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
              {canAnnotate && (
                <Pressable
                  onPress={toggleAnnotations}
                  style={({ pressed }) => [
                    styles.closeButton,
                    showAnnotations && {
                      backgroundColor: "rgba(212,175,55,0.4)",
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialIcons
                    name="architecture"
                    size={22}
                    color={showAnnotations ? "#FDE68A" : "#fff"}
                  />
                </Pressable>
              )}
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
            <Image
              key={`fs-${activeAngle}-${currentAsset}`}
              source={
                typeof currentAsset === "string"
                  ? { uri: currentAsset }
                  : currentAsset
              }
              style={{ width: SCREEN_W, height: SCREEN_W }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
            {showAnnotations && annotations && (
              <FormAnnotationOverlay
                annotation={annotations}
                width={SCREEN_W}
                height={SCREEN_W}
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
                  <Text
                    style={[
                      styles.fullscreenAngleTxt,
                      activeAngle === i && { color: "#0A0E14" },
                    ]}
                  >
                    {getAngleShortLabel(view.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Audio cue in fullscreen */}
          {isPlaying && audioCues && currentCueIndex >= 0 && (
            <View style={styles.fullscreenAudioCue}>
              <MaterialIcons
                name={getPhaseIcon(audioCues.cues[currentCueIndex].phase) as any}
                size={16}
                color={getPhaseColor(audioCues.cues[currentCueIndex].phase)}
              />
              <Text style={styles.fullscreenAudioCueText} numberOfLines={2}>
                {audioCues.cues[currentCueIndex].text}
              </Text>
            </View>
          )}

          {/* Cue text in fullscreen */}
          {cue && !isPlaying ? (
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
  gifAsset,
  cue,
  label = "Watch Demo",
  exerciseName,
  onComparePhoto,
}: ExerciseDemoPlayerProps & { label?: string }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <View>
        <ExerciseDemoPlayer
          gifUrl={gifUrl}
          gifAsset={gifAsset}
          cue={cue}
          height={180}
          exerciseName={exerciseName}
          onComparePhoto={onComparePhoto}
        />
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
        { backgroundColor: colors.surface, borderColor: colors.border },
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
    color: "#0A0E14",
  },
  // Action bar
  actionBar: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  actionBtnActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#FDE68A",
  },
  actionBtnText: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "600",
  },
  actionBtnTextActive: {
    color: "#0A0E14",
  },
  // Audio cue card
  audioCueCard: {
    marginTop: 8,
    backgroundColor: "rgba(10,14,20,0.9)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  audioCueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  audioCuePhaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  audioCuePhase: {
    color: "#9BA1A6",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  audioCueStep: {
    color: "#687076",
    fontSize: 10,
    fontWeight: "500",
    marginLeft: "auto",
  },
  audioCueLabel: {
    color: "#FDE68A",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  audioCueText: {
    color: "#E5E7EB",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  audioCueDots: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  audioCueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(212,175,55,0.2)",
  },
  audioCueDotActive: {
    backgroundColor: "#D4AF37",
    width: 16,
    borderRadius: 3,
  },
  audioCueDotDone: {
    backgroundColor: "rgba(212,175,55,0.5)",
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
  fullscreenAudioCue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 24,
    maxWidth: SCREEN_W - 48,
  },
  fullscreenAudioCueText: {
    color: "#FDE68A",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
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
