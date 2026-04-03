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
  ActivityIndicator,
  Animated as RNAnimated,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { useFavorites } from "@/lib/favorites-context";
import { getExerciseInfo } from "@/lib/exercise-data";
import { resolveGifAsset } from "@/lib/gif-resolver";
import { getExerciseDbGifUrl, hasExerciseDbGif } from "@/lib/exercisedb-api";
import { MuscleSvgMini } from "@/components/muscle-svg-diagram";
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
import { FormCueOverlay, FormCueBadge } from "@/components/form-cue-overlay";
import { hasFormTips } from "@/lib/form-cue-tips";

import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import type { VideoSource } from "expo-video";

/** Check if a URL points to an MP4 video file */
function isVideoUrl(url: string | number | undefined): url is string {
  if (typeof url !== "string") return false;
  return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");
}

const { width: SCREEN_W } = Dimensions.get("window");

interface ExerciseDemoPlayerProps {
  /** Legacy gifUrl prop (ignored if gifAsset is provided) */
  gifUrl?: string;
  /** Exercise image asset Ã¢ÂÂ CDN URL string or legacy require() number */
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

  // Form cue overlay state
  const [showFormCues, setShowFormCues] = useState(false);
  const canShowFormCues = exerciseName ? hasFormTips(exerciseName) : false;

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

  // ExerciseDB animated GIF source
  const exerciseDbGifUrl = useMemo(
    () => (exerciseName ? getExerciseDbGifUrl(exerciseName) : null),
    [exerciseName]
  );
  const [useExerciseDb, setUseExerciseDb] = useState(false);

  // Muscle info for mini diagram
  const exerciseInfo = useMemo(
    () => (exerciseName ? getExerciseInfo(exerciseName) : undefined),
    [exerciseName]
  );

  // Resolve the image asset - prefer MuscleWiki angleViews, ExerciseDB GIF only when toggled on
  const currentAsset = useMemo(() => {
    // MuscleWiki angle views are the primary source
    if (!useExerciseDb && hasMultipleAngles && angleViews[activeAngle]) {
      return angleViews[activeAngle].gifUrl;
    }
    if (!useExerciseDb && gifAsset) return gifAsset;
    // ExerciseDB animated GIF only when explicitly toggled on
    if (useExerciseDb && exerciseDbGifUrl) {
      return exerciseDbGifUrl;
    }
    // Fallback chain
    if (hasMultipleAngles && angleViews[activeAngle]) {
      return angleViews[activeAngle].gifUrl;
    }
    if (gifAsset) return gifAsset;
    if (gifUrl) return resolveGifAsset(gifUrl);
    return resolveGifAsset("");
  }, [useExerciseDb, exerciseDbGifUrl, hasMultipleAngles, angleViews, activeAngle, gifAsset, gifUrl]);

  
  // --- MP4 Video Playback ---
  const isCurrentVideo = isVideoUrl(currentAsset);
  const [videoRetryKey, setVideoRetryKey] = useState(0);
  const videoSource: VideoSource | null = isCurrentVideo
    ? { uri: (currentAsset as string) + (videoRetryKey > 0 ? `#retry=${videoRetryKey}` : ""), ...(Platform.OS !== "web" ? { useCaching: true } : {}) }
    : null;
  const videoPlayer = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.play();
  });

  // Track video player status for loading/error states
  const { status: videoStatus, error: videoError } = useEvent(videoPlayer, "statusChange", {
    status: videoPlayer.status,
    error: undefined,
  });

  const videoIsLoading = isCurrentVideo && (videoStatus === "loading" || videoStatus === "idle");
  const videoHasError = isCurrentVideo && videoStatus === "error";

  // Animated shimmer for loading skeleton
  const shimmerAnim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (videoIsLoading) {
      const loop = RNAnimated.loop(
        RNAnimated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [videoIsLoading]);

  // Retry handler for video errors
  const handleVideoRetry = useCallback(() => {
    setVideoRetryKey((k) => k + 1);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, []);

  // Reset retry key when asset changes
  useEffect(() => {
    setVideoRetryKey(0);
  }, [currentAsset]);

  // --- Playback Speed Control ---
  const SPEED_OPTIONS = [0.5, 1, 2] as const;
  const [speedIndex, setSpeedIndex] = useState(1); // default 1x
  const currentSpeed = SPEED_OPTIONS[speedIndex];

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((prev) => {
      const next = (prev + 1) % SPEED_OPTIONS.length;
      if (videoPlayer) {
        videoPlayer.playbackRate = SPEED_OPTIONS[next];
        videoPlayer.preservesPitch = true;
      }
      return next;
    });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [videoPlayer]);

  // Reset speed when asset changes
  useEffect(() => {
    setSpeedIndex(1);
    if (videoPlayer) {
      videoPlayer.playbackRate = 1;
    }
  }, [currentAsset]);

  // Reset video when asset changes
  useEffect(() => {
    if (videoPlayer && isCurrentVideo) {
      videoPlayer.play();
    }
  }, [currentAsset, isCurrentVideo]);

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

  const toggleFormCues = useCallback(() => {
    setShowFormCues((prev) => !prev);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

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
        onPress={showFormCues ? toggleFormCues : openFullscreen}
        onLongPress={canShowFormCues ? toggleFormCues : undefined}
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
            {isCurrentVideo && videoPlayer ? (
              <VideoView
                player={videoPlayer}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                nativeControls={false}
                allowsFullscreen={false}
              />
            ) : (
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
                autoplay={true}
                transition={200}
              />
            )}
            {/* Loading Skeleton Overlay */}
            {videoIsLoading && (
              <View style={styles.skeletonOverlay}>
                <RNAnimated.View
                  style={[
                    styles.skeletonShimmer,
                    {
                      opacity: shimmerAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 0.7, 0.3],
                      }),
                    },
                  ]}
                />
                <View style={styles.skeletonContent}>
                  <ActivityIndicator size="large" color="#F59E0B" />
                  <Text style={styles.skeletonText}>Loading video...</Text>
                  <View style={styles.skeletonBar} />
                  <View style={[styles.skeletonBar, { width: "50%" }]} />
                </View>
              </View>
            )}
            {/* Error Fallback Overlay */}
            {videoHasError && (
              <View style={styles.errorOverlay}>
                <MaterialIcons name="error-outline" size={40} color="#EF4444" />
                <Text style={styles.errorTitle}>Video failed to load</Text>
                <Text style={styles.errorSubtitle}>
                  {videoError?.message || "The MuscleWiki video could not be loaded. Check your connection and try again."}
                </Text>
                <Pressable
                  onPress={handleVideoRetry}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <MaterialIcons name="refresh" size={18} color="#0A0E14" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            )}
            {/* Form Annotation Overlay */}
            {showAnnotations && annotations && (
              <FormAnnotationOverlay
                annotation={annotations}
                width={imageWidth}
                height={height}
                simplified={false}
              />
            )}
            {/* Form Cue Tips Overlay */}
            {exerciseName && (
              <FormCueOverlay
                exerciseName={exerciseName}
                visible={showFormCues}
                onDismiss={() => setShowFormCues(false)}
              />
            )}
          </View>
          {/* Badge */}
          <View style={styles.gifBadge}>
            <MaterialIcons name={useExerciseDb ? "gif" : "image"} size={16} color="#fff" />
            <Text style={styles.gifBadgeText}>{useExerciseDb ? "Animated GIF" : "MuscleWiki Video"}</Text>
          </View>
          {/* Muscle mini diagram overlay (bottom-left) */}
          {exerciseInfo && (
            <View style={styles.muscleMiniOverlay}>
              <MuscleSvgMini primary={exerciseInfo.primaryMuscles} secondary={exerciseInfo.secondaryMuscles} width={56} height={84} />
            </View>
          )}
          {/* Angle label overlay */}
          {hasMultipleAngles && angleViews[activeAngle] && (
            <View style={styles.angleLabelOverlay}>
              <Text style={styles.angleLabelText}>
                {getAngleShortLabel(angleViews[activeAngle].label)}
              </Text>
            </View>
          )}
          {/* Speed control button (inline) */}
          {isCurrentVideo && !videoIsLoading && !videoHasError && (
            <Pressable
              onPress={cycleSpeed}
              style={({ pressed }) => [
                styles.speedButton,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Text style={styles.speedButtonText}>{currentSpeed}x</Text>
            </Pressable>
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
                color={activeAngle === i ? "#0A0E14" : "#F59E0B"}
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

      {/* Angle focus card Ã¢ÂÂ shows the per-view coaching focus from exercise-data */}
      {hasMultipleAngles && angleViews[activeAngle]?.focus ? (
        <View style={styles.angleFocusCard}>
          {/* Section label row */}
          <View style={styles.sectionLabelRow}>
            <View style={styles.sectionAccentBar} />
            <MaterialIcons
              name={angleViews[activeAngle].label.includes("Side") ? "switch-video" : "videocam"}
              size={12}
              color="#F59E0B"
            />
            <Text style={styles.sectionLabelText}>
              {angleViews[activeAngle].label.toUpperCase()} - WHAT TO CHECK
            </Text>
          </View>
          <Text style={styles.angleFocusText}>{angleViews[activeAngle].focus}</Text>
        </View>
      ) : null}

      {/* GIF Source Toggle: ExerciseDB animated vs static images */}
      {exerciseDbGifUrl && (
        <View style={styles.sourceToggleRow}>
          <Pressable
            onPress={() => { setUseExerciseDb(true); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
            style={({ pressed }) => [
              styles.sourceToggleBtn,
              useExerciseDb && styles.sourceToggleBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="gif" size={14} color={useExerciseDb ? "#0A0E14" : "#B45309"} />
            <Text style={[styles.sourceToggleTxt, useExerciseDb && styles.sourceToggleTxtActive]}>ExerciseDB GIF</Text>
          </Pressable>
          <Pressable
            onPress={() => { setUseExerciseDb(false); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
            style={({ pressed }) => [
              styles.sourceToggleBtn,
              !useExerciseDb && styles.sourceToggleBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="image" size={14} color={!useExerciseDb ? "#0A0E14" : "#B45309"} />
            <Text style={[styles.sourceToggleTxt, !useExerciseDb && styles.sourceToggleTxtActive]}>MuscleWiki Video</Text>
          </Pressable>
        </View>
      )}

      {/* Action Bar: Form Tips, Annotations, Audio, Compare */}
      <View style={styles.actionBar}>
        {canShowFormCues && (
          <FormCueBadge
            exerciseName={exerciseName!}
            onPress={toggleFormCues}
            active={showFormCues}
          />
        )}
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
        <View style={styles.cueSection}>
          {/* Section label */}
          <View style={styles.sectionLabelRow}>
            <View style={styles.sectionAccentBar} />
            <MaterialIcons name="chat-bubble-outline" size={12} color="#F59E0B" />
            <Text style={styles.sectionLabelText}>COACHING CUE</Text>
          </View>
          {/* Quote card */}
          <View style={[styles.cueContainer, { backgroundColor: colors.surface }]}>
            <Text style={styles.cueQuoteMark}>"</Text>
            <Text style={[styles.cueText, { color: colors.foreground }]}>{cue}</Text>
          </View>
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
          <Pressable
            onPress={canShowFormCues ? toggleFormCues : undefined}
            style={styles.fullscreenImageContainer}
          >
            {isCurrentVideo && videoPlayer ? (
              <VideoView
                player={videoPlayer}
                style={{ width: SCREEN_W, height: SCREEN_W }}
                contentFit="contain"
                nativeControls={false}
                allowsFullscreen={false}
              />
            ) : (
              <Image
                key={`fs-${activeAngle}-${currentAsset}`}
                source={typeof currentAsset === "string" ? { uri: currentAsset } : currentAsset}
                autoplay={true}
                style={{ width: SCREEN_W, height: SCREEN_W }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
              />
            )}
            {/* Fullscreen Loading Skeleton */}
            {videoIsLoading && (
              <View style={[styles.skeletonOverlay, { width: SCREEN_W, height: SCREEN_W }]}>
                <RNAnimated.View
                  style={[
                    styles.skeletonShimmer,
                    {
                      opacity: shimmerAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 0.7, 0.3],
                      }),
                    },
                  ]}
                />
                <View style={styles.skeletonContent}>
                  <ActivityIndicator size="large" color="#F59E0B" />
                  <Text style={styles.skeletonText}>Loading video...</Text>
                </View>
              </View>
            )}
            {/* Fullscreen Error Fallback */}
            {videoHasError && (
              <View style={[styles.errorOverlay, { width: SCREEN_W, height: SCREEN_W }]}>
                <MaterialIcons name="error-outline" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Video failed to load</Text>
                <Text style={styles.errorSubtitle}>
                  {videoError?.message || "The MuscleWiki video could not be loaded."}
                </Text>
                <Pressable
                  onPress={handleVideoRetry}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <MaterialIcons name="refresh" size={18} color="#0A0E14" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            )}
            {showAnnotations && annotations && (
              <FormAnnotationOverlay
                annotation={annotations}
                width={SCREEN_W}
                height={SCREEN_W}
              />
            )}
            {/* Form Cue Tips Overlay (fullscreen) */}
            {exerciseName && (
              <FormCueOverlay
                exerciseName={exerciseName}
                visible={showFormCues}
                onDismiss={() => setShowFormCues(false)}
                fullscreen
              />
            )}
          </Pressable>

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

          {/* Speed control in fullscreen */}
          {isCurrentVideo && !videoIsLoading && !videoHasError && (
            <View style={styles.fullscreenSpeedRow}>
              {SPEED_OPTIONS.map((speed, i) => (
                <Pressable
                  key={speed}
                  onPress={() => {
                    setSpeedIndex(i);
                    if (videoPlayer) {
                      videoPlayer.playbackRate = speed;
                      videoPlayer.preservesPitch = true;
                    }
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }
                  }}
                  style={({ pressed }) => [
                    styles.fullscreenSpeedBtn,
                    speedIndex === i && styles.fullscreenSpeedBtnActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.fullscreenSpeedTxt,
                      speedIndex === i && styles.fullscreenSpeedTxtActive,
                    ]}
                  >
                    {speed}x
                  </Text>
                </Pressable>
              ))}
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
  // Ã¢ÂÂÃ¢ÂÂ Section label pattern Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionAccentBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#F59E0B",
  },
  sectionLabelText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    fontFamily: "DMSans_700Bold",
  },

  // Ã¢ÂÂÃ¢ÂÂ Angle focus card Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  angleFocusCard: {
    marginTop: 10,
    backgroundColor: "#141A22",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.14)",
  },
  angleFocusText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
  },

  // Ã¢ÂÂÃ¢ÂÂ Coaching cue section Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  cueSection: {
    marginTop: 12,
  },
  cueQuoteMark: {
    position: "absolute",
    top: -2,
    left: 6,
    fontSize: 44,
    color: "#F59E0B",
    opacity: 0.10,
    lineHeight: 44,
    fontWeight: "900",
  },

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
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  muscleMiniOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    padding: 6,
    overflow: "visible",
  },
  sourceToggleRow: {
    flexDirection: "row" as const,
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  sourceToggleBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(180,83,9,0.12)",
    borderWidth: 1,
    borderColor: "rgba(180,83,9,0.25)",
  },
  sourceToggleBtnActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  sourceToggleTxt: {
    color: "#B45309",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  sourceToggleTxtActive: {
    color: "#0A0E14",
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
    gap: 8,
    marginTop: 10,
  },
  angleToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.18)",
  },
  angleToggleBtnActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  angleToggleText: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
  },
  angleToggleTextActive: {
    color: "#0A0E14",
  },
  // Action bar
  actionBar: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.18)",
  },
  actionBtnActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  actionBtnText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.2,
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.16)",
    overflow: "hidden",
  },
  cueText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
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
  // — Loading skeleton overlay —
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A0E14",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  skeletonShimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1A1F28",
  },
  skeletonContent: {
    alignItems: "center",
    gap: 12,
    zIndex: 1,
  },
  skeletonText: {
    color: "#9BA1A6",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  skeletonBar: {
    width: "70%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1E2530",
  },
  // — Error fallback overlay —
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,20,0.92)",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    zIndex: 6,
  },
  errorTitle: {
    color: "#F87171",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  errorSubtitle: {
    color: "#9BA1A6",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 260,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
  },
  retryButtonText: {
    color: "#0A0E14",
    fontSize: 14,
    fontWeight: "700",
  },
  // — Playback speed control (inline) —
  speedButton: {
    position: "absolute",
    bottom: 8,
    right: 40,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
  },
  speedButtonText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
  },
  // — Playback speed control (fullscreen) —
  fullscreenSpeedRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  fullscreenSpeedBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  fullscreenSpeedBtnActive: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  fullscreenSpeedTxt: {
    color: "#9BA1A6",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
  },
  fullscreenSpeedTxtActive: {
    color: "#0A0E14",
  },
});
