/**
 * WorkoutTimerCoach
 *
 * A comprehensive workout timer with integrated voice coaching.
 * Automatically plays audio form cues during exercise sets,
 * provides voice countdown during rest periods, and announces
 * exercise transitions.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  Dimensions, Platform, StyleSheet, Animated,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  getAudioCues, hasAudioCues, speakCue, stopSpeaking,
  getPhaseColor, getPhaseIcon, type FormCue, type ExerciseAudioCues,
} from "@/lib/audio-form-cues";
import { ExerciseDemoPlayer } from "@/components/exercise-demo-player";
import { getExerciseDemo } from "@/lib/exercise-demos";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Colors ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0A0E14",
  surface: "#141A22",
  border: "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg: "#F1F5F9",
  muted: "#B45309",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  gold3: "#FDE68A",
  green: "#22C55E",
  red: "#EF4444",
};

// ── Types ───────────────────────────────────────────────────────────────────
export interface TimerExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

type TimerState = "idle" | "active" | "resting" | "transition" | "finished";
type VoiceCoachMode = "full" | "cues_only" | "countdown_only" | "off";

interface Props {
  visible: boolean;
  exercise: TimerExercise;
  exercises: TimerExercise[];
  currentExerciseIndex: number;
  completedSets: number;
  totalElapsed: number;
  onClose: () => void;
  onCompleteSet: () => void;
  onSkipRest: () => void;
  onNextExercise: () => void;
  onPrevExercise: () => void;
  restTimerValue: number | null;
}

// ── Voice Coach Service ─────────────────────────────────────────────────────

async function speakAnnouncement(text: string): Promise<void> {
  try {
    await speakCue(text);
  } catch {
    // Speech failed silently
  }
}

function getRestCountdownText(seconds: number): string {
  if (seconds === 10) return "Ten seconds left.";
  if (seconds === 5) return "Five.";
  if (seconds === 4) return "Four.";
  if (seconds === 3) return "Three.";
  if (seconds === 2) return "Two.";
  if (seconds === 1) return "One.";
  if (seconds === 0) return "Go! Next set.";
  return "";
}

// ── Component ───────────────────────────────────────────────────────────────

export function WorkoutTimerCoach({
  visible,
  exercise,
  exercises,
  currentExerciseIndex,
  completedSets,
  totalElapsed,
  onClose,
  onCompleteSet,
  onSkipRest,
  onNextExercise,
  onPrevExercise,
  restTimerValue,
}: Props) {
  // ── State ───────────────────────────────────────────────────────────────
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [setElapsed, setSetElapsed] = useState(0);
  const [voiceMode, setVoiceMode] = useState<VoiceCoachMode>("full");
  const [currentCueIndex, setCurrentCueIndex] = useState(-1);
  const [isPlayingCues, setIsPlayingCues] = useState(false);
  const [showCuePanel, setShowCuePanel] = useState(true);
  const [autoPlayCues, setAutoPlayCues] = useState(true);

  const setTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cuePlaybackRef = useRef<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const audioCues = getAudioCues(exercise.name);
  const demo = getExerciseDemo(exercise.name);
  const totalSets = exercise.sets;
  const isResting = restTimerValue !== null;

  // ── Pulse animation for active timer ──────────────────────────────────
  useEffect(() => {
    if (timerState === "active" && !isResting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timerState, isResting]);

  // ── Set elapsed timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (timerState === "active" && !isResting) {
      setTimerRef.current = setInterval(() => {
        setSetElapsed((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (setTimerRef.current) clearInterval(setTimerRef.current);
    };
  }, [timerState, isResting]);

  // ── Reset set timer when set completes (rest starts) ──────────────────
  useEffect(() => {
    if (isResting) {
      setSetElapsed(0);
      setTimerState("resting");
    } else if (timerState === "resting") {
      setTimerState("active");
    }
  }, [isResting]);

  // ── Voice countdown during rest ───────────────────────────────────────
  useEffect(() => {
    if (!isResting || voiceMode === "off" || voiceMode === "cues_only") return;
    if (restTimerValue === null) return;

    const text = getRestCountdownText(restTimerValue);
    if (text) {
      speakAnnouncement(text);
      if (restTimerValue <= 3 && Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    }
  }, [restTimerValue, isResting, voiceMode]);

  // ── Auto-play form cues when set starts ───────────────────────────────
  useEffect(() => {
    if (
      timerState === "active" &&
      !isResting &&
      autoPlayCues &&
      audioCues &&
      (voiceMode === "full" || voiceMode === "cues_only") &&
      !isPlayingCues &&
      completedSets === 0 &&
      setElapsed === 0
    ) {
      // Play setup cues on first set
      playCuesSequentially(audioCues, 0);
    }
  }, [timerState, isResting, completedSets]);

  // ── Announce exercise transitions ─────────────────────────────────────
  useEffect(() => {
    if (visible && (voiceMode === "full" || voiceMode === "countdown_only")) {
      const announcement = `${exercise.name}. ${exercise.sets} sets of ${exercise.reps} reps.`;
      speakAnnouncement(announcement);
    }
  }, [exercise.name, visible]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopSpeaking();
      cuePlaybackRef.current = false;
      if (setTimerRef.current) clearInterval(setTimerRef.current);
    };
  }, []);

  // ── Cue playback ─────────────────────────────────────────────────────
  const playCuesSequentially = useCallback(
    async (cues: ExerciseAudioCues, startIndex: number) => {
      if (cuePlaybackRef.current) return;
      cuePlaybackRef.current = true;
      setIsPlayingCues(true);

      for (let i = startIndex; i < cues.cues.length; i++) {
        if (!cuePlaybackRef.current) break;
        const cue = cues.cues[i];
        setCurrentCueIndex(i);

        await speakCue(cue.text);

        if (!cuePlaybackRef.current) break;

        // Wait the pause duration
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, cue.pauseAfter);
          // If playback is stopped, resolve immediately
          const check = setInterval(() => {
            if (!cuePlaybackRef.current) {
              clearTimeout(timeout);
              clearInterval(check);
              resolve();
            }
          }, 200);
        });
      }

      cuePlaybackRef.current = false;
      setIsPlayingCues(false);
      setCurrentCueIndex(-1);
    },
    []
  );

  const stopCuePlayback = useCallback(() => {
    cuePlaybackRef.current = false;
    stopSpeaking();
    setIsPlayingCues(false);
    setCurrentCueIndex(-1);
  }, []);

  const playSingleCue = useCallback(async (cue: FormCue, index: number) => {
    stopCuePlayback();
    setCurrentCueIndex(index);
    setIsPlayingCues(true);
    await speakCue(cue.text);
    setIsPlayingCues(false);
    setCurrentCueIndex(-1);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStartSet = () => {
    setTimerState("active");
    setSetElapsed(0);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    if (autoPlayCues && audioCues && (voiceMode === "full" || voiceMode === "cues_only")) {
      // Play execution cues for subsequent sets, setup for first
      const startIdx = completedSets === 0 ? 0 : audioCues.cues.findIndex((c) => c.phase === "execution");
      playCuesSequentially(audioCues, Math.max(0, startIdx));
    }
  };

  const handleCompleteSet = () => {
    stopCuePlayback();
    onCompleteSet();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (voiceMode === "full" || voiceMode === "countdown_only") {
      const setsLeft = totalSets - completedSets - 1;
      if (setsLeft > 0) {
        speakAnnouncement(`Set ${completedSets + 1} complete. ${setsLeft} set${setsLeft > 1 ? "s" : ""} remaining. Rest now.`);
      } else {
        speakAnnouncement(`All sets complete! Great work on ${exercise.name}.`);
      }
    }
  };

  const handleSkipRest = () => {
    stopSpeaking();
    onSkipRest();
  };

  const cycleVoiceMode = () => {
    const modes: VoiceCoachMode[] = ["full", "cues_only", "countdown_only", "off"];
    const idx = modes.indexOf(voiceMode);
    const next = modes[(idx + 1) % modes.length];
    setVoiceMode(next);
    if (next === "off") stopCuePlayback();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const voiceModeLabel = {
    full: "Full Coach",
    cues_only: "Cues Only",
    countdown_only: "Countdown",
    off: "Muted",
  }[voiceMode];

  const voiceModeIcon = voiceMode === "off" ? "volume-off" : "record-voice-over";

  // ── Format helpers ────────────────────────────────────────────────────
  function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  // ── Progress ring calculation ─────────────────────────────────────────
  const restProgress = isResting && restTimerValue !== null
    ? 1 - restTimerValue / (parseInt(exercise.rest) || 60)
    : 0;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <MaterialIcons name="close" size={20} color={C.fg} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>VOICE COACH TIMER</Text>
            <Text style={styles.headerExercise} numberOfLines={1}>
              {exercise.name}
            </Text>
          </View>

          <TouchableOpacity style={styles.headerBtn} onPress={cycleVoiceMode}>
            <MaterialIcons name={voiceModeIcon as any} size={18} color={voiceMode === "off" ? C.red : C.gold} />
          </TouchableOpacity>
        </View>

        {/* Voice mode indicator */}
        <View style={styles.voiceModeBar}>
          <MaterialIcons name={voiceModeIcon as any} size={12} color={C.gold} />
          <Text style={styles.voiceModeText}>{voiceModeLabel}</Text>
          {autoPlayCues && (
            <View style={styles.autoPlayBadge}>
              <Text style={styles.autoPlayText}>AUTO</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── Main Timer Display ──────────────────────────────────── */}
          <View style={styles.timerSection}>
            {isResting ? (
              <>
                <Text style={styles.timerLabel}>REST</Text>
                {/* Circular progress ring */}
                <View style={styles.timerRingContainer}>
                  <View style={[styles.timerRing, { borderColor: `rgba(245,158,11,${0.15 + restProgress * 0.85})` }]}>
                    <Animated.Text style={[styles.timerBig, { transform: [{ scale: pulseAnim }] }]}>
                      {fmt(restTimerValue ?? 0)}
                    </Animated.Text>
                  </View>
                  {/* Progress bar */}
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${restProgress * 100}%` }]} />
                  </View>
                </View>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkipRest}>
                  <MaterialIcons name="skip-next" size={16} color={C.muted} />
                  <Text style={styles.skipText}>Skip Rest</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.timerLabel}>
                  {timerState === "idle" ? "READY" : timerState === "finished" ? "DONE" : "SET TIME"}
                </Text>
                <View style={styles.timerRingContainer}>
                  <View style={[styles.timerRing, { borderColor: timerState === "active" ? C.gold : C.border }]}>
                    <Animated.Text style={[styles.timerBig, { transform: [{ scale: pulseAnim }] }]}>
                      {fmt(setElapsed)}
                    </Animated.Text>
                  </View>
                </View>
              </>
            )}

            {/* Total elapsed */}
            <View style={styles.totalRow}>
              <MaterialIcons name="timer" size={14} color={C.muted} />
              <Text style={styles.totalText}>Total: {fmt(totalElapsed)}</Text>
            </View>
          </View>

          {/* ── Set Progress Dots ───────────────────────────────────── */}
          <View style={styles.setDotsContainer}>
            <Text style={styles.setsLabel}>SETS</Text>
            <View style={styles.setDots}>
              {Array.from({ length: totalSets }).map((_, i) => {
                const done = i < completedSets;
                const current = i === completedSets && timerState === "active";
                return (
                  <View
                    key={i}
                    style={[
                      styles.setDot,
                      done && styles.setDotDone,
                      current && styles.setDotCurrent,
                    ]}
                  >
                    <Text style={[styles.setDotText, done && styles.setDotTextDone]}>
                      {done ? "✓" : i + 1}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.setsProgress}>
              {completedSets}/{totalSets} · {exercise.reps} reps · Rest {exercise.rest}
            </Text>
          </View>

          {/* ── Action Buttons ──────────────────────────────────────── */}
          <View style={styles.actionRow}>
            {timerState === "idle" ? (
              <TouchableOpacity style={styles.startBtn} onPress={handleStartSet}>
                <MaterialIcons name="play-arrow" size={24} color={C.bg} />
                <Text style={styles.startBtnText}>Start Set</Text>
              </TouchableOpacity>
            ) : timerState === "active" && !isResting ? (
              <TouchableOpacity
                style={[styles.completeBtn, completedSets >= totalSets && styles.disabledBtn]}
                onPress={handleCompleteSet}
                disabled={completedSets >= totalSets}
              >
                <MaterialIcons name="check" size={24} color={C.bg} />
                <Text style={styles.completeBtnText}>
                  {completedSets >= totalSets ? "All Sets Done" : `Complete Set ${completedSets + 1}`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ── Voice Cue Panel ─────────────────────────────────────── */}
          {audioCues && (
            <View style={styles.cuePanel}>
              <TouchableOpacity
                style={styles.cuePanelHeader}
                onPress={() => setShowCuePanel(!showCuePanel)}
              >
                <View style={styles.cuePanelHeaderLeft}>
                  <MaterialIcons name="record-voice-over" size={16} color={C.gold} />
                  <Text style={styles.cuePanelTitle}>Form Cues</Text>
                  <Text style={styles.cuePanelCount}>{audioCues.cues.length} steps</Text>
                </View>
                <View style={styles.cuePanelHeaderRight}>
                  {/* Auto-play toggle */}
                  <TouchableOpacity
                    style={[styles.autoToggle, autoPlayCues && styles.autoToggleOn]}
                    onPress={() => setAutoPlayCues(!autoPlayCues)}
                  >
                    <Text style={[styles.autoToggleText, autoPlayCues && styles.autoToggleTextOn]}>
                      Auto
                    </Text>
                  </TouchableOpacity>
                  <MaterialIcons
                    name={showCuePanel ? "expand-less" : "expand-more"}
                    size={20}
                    color={C.muted}
                  />
                </View>
              </TouchableOpacity>

              {showCuePanel && (
                <View style={styles.cueList}>
                  {audioCues.cues.map((cue, idx) => {
                    const isActive = currentCueIndex === idx;
                    const phaseColor = getPhaseColor(cue.phase);
                    const phaseIcon = getPhaseIcon(cue.phase);

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.cueItem, isActive && styles.cueItemActive]}
                        onPress={() => playSingleCue(cue, idx)}
                      >
                        <View style={[styles.cuePhaseIcon, { backgroundColor: `${phaseColor}20` }]}>
                          <MaterialIcons name={phaseIcon as any} size={14} color={phaseColor} />
                        </View>
                        <View style={styles.cueContent}>
                          <View style={styles.cueTopRow}>
                            <Text style={[styles.cueLabel, isActive && { color: C.gold }]}>
                              {cue.label}
                            </Text>
                            <View style={[styles.cuePhaseBadge, { backgroundColor: `${phaseColor}20` }]}>
                              <Text style={[styles.cuePhaseText, { color: phaseColor }]}>
                                {cue.phase}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.cueText, isActive && { color: C.fg }]} numberOfLines={2}>
                            {cue.text}
                          </Text>
                        </View>
                        {isActive && isPlayingCues && (
                          <View style={styles.speakingIndicator}>
                            <MaterialIcons name="volume-up" size={14} color={C.gold} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Play all / Stop button */}
                  <View style={styles.cueActions}>
                    {isPlayingCues ? (
                      <TouchableOpacity style={styles.stopCuesBtn} onPress={stopCuePlayback}>
                        <MaterialIcons name="stop" size={16} color={C.red} />
                        <Text style={[styles.cueActionText, { color: C.red }]}>Stop</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.playCuesBtn}
                        onPress={() => playCuesSequentially(audioCues, 0)}
                      >
                        <MaterialIcons name="play-arrow" size={16} color={C.gold} />
                        <Text style={styles.cueActionText}>Play All Cues</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Exercise Demo ──────────────────────────────────────── */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>EXERCISE DEMO</Text>
            <ExerciseDemoPlayer
              gifUrl={demo.gifUrl}
              cue={demo.cue}
              height={160}
              exerciseName={exercise.name}
            />
          </View>

          {/* ── Exercise Navigation ─────────────────────────────────── */}
          <View style={styles.exerciseNav}>
            <Text style={styles.exerciseNavLabel}>
              Exercise {currentExerciseIndex + 1} of {exercises.length}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {exercises.map((ex, i) => (
                <View
                  key={i}
                  style={[
                    styles.exerciseChip,
                    i === currentExerciseIndex && styles.exerciseChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.exerciseChipText,
                      i === currentExerciseIndex && styles.exerciseChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* ── Navigation Buttons ──────────────────────────────────── */}
          <View style={styles.navRow}>
            {currentExerciseIndex > 0 && (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => {
                  stopCuePlayback();
                  setTimerState("idle");
                  setSetElapsed(0);
                  onPrevExercise();
                }}
              >
                <MaterialIcons name="chevron-left" size={18} color={C.muted} />
                <Text style={styles.navBtnText}>Previous</Text>
              </TouchableOpacity>
            )}
            {currentExerciseIndex < exercises.length - 1 && (
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnNext]}
                onPress={() => {
                  stopCuePlayback();
                  setTimerState("idle");
                  setSetElapsed(0);
                  onNextExercise();
                }}
              >
                <Text style={[styles.navBtnText, { color: C.gold }]}>Next</Text>
                <MaterialIcons name="chevron-right" size={18} color={C.gold} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Close ───────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>← Back to Workout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerLabel: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  headerExercise: {
    color: C.fg,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 18,
    marginTop: 2,
  },
  voiceModeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: "rgba(245,158,11,0.06)",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  voiceModeText: {
    color: C.gold,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  autoPlayBadge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  autoPlayText: {
    color: C.green,
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Timer
  timerSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  timerLabel: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  timerRingContainer: {
    alignItems: "center",
  },
  timerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,158,11,0.04)",
  },
  timerBig: {
    color: C.gold,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 64,
    lineHeight: 72,
  },
  progressBarBg: {
    width: SCREEN_W - 80,
    height: 4,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderRadius: 2,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    backgroundColor: C.gold,
    borderRadius: 2,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  skipText: {
    color: C.muted,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  totalText: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },

  // Set dots
  setDotsContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  setsLabel: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  setDots: {
    flexDirection: "row",
    gap: 8,
  },
  setDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  setDotDone: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  setDotCurrent: {
    borderColor: C.gold2,
    borderWidth: 2,
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  setDotText: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  setDotTextDone: {
    color: C.bg,
  },
  setsProgress: {
    color: C.muted,
    fontSize: 11,
    marginTop: 8,
  },

  // Action buttons
  actionRow: {
    marginBottom: 20,
  },
  startBtn: {
    backgroundColor: C.gold,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startBtnText: {
    color: C.bg,
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  completeBtn: {
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  completeBtnText: {
    color: "#fff",
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.5,
  },

  // Cue panel
  cuePanel: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  cuePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  cuePanelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cuePanelTitle: {
    color: C.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  cuePanelCount: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
  cuePanelHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  autoToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: C.border,
  },
  autoToggleOn: {
    backgroundColor: "rgba(245,158,11,0.20)",
    borderColor: C.gold,
  },
  autoToggleText: {
    color: C.muted,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
  },
  autoToggleTextOn: {
    color: C.gold,
  },
  cueList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  cueItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,158,11,0.06)",
  },
  cueItemActive: {
    backgroundColor: "rgba(245,158,11,0.08)",
    marginHorizontal: -14,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cuePhaseIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cueContent: {
    flex: 1,
  },
  cueTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  cueLabel: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  cuePhaseBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  cuePhaseText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    textTransform: "uppercase",
  },
  cueText: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  speakingIndicator: {
    marginTop: 4,
  },
  cueActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 12,
  },
  playCuesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  stopCuesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239,68,68,0.10)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  cueActionText: {
    color: C.gold,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },

  // Demo
  demoSection: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  demoLabel: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Exercise nav
  exerciseNav: {
    marginBottom: 16,
  },
  exerciseNavLabel: {
    color: C.muted,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    marginBottom: 8,
  },
  exerciseChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  exerciseChipActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  exerciseChipText: {
    color: C.muted,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  exerciseChipTextActive: {
    color: C.bg,
  },

  // Nav buttons
  navRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  navBtnNext: {
    borderColor: C.gold,
  },
  navBtnText: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },

  // Close
  closeBtn: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  closeBtnText: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
});
