import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Alert, TextInput,
  Modal, Dimensions, Platform, ImageBackground} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useKeepAwake } from "expo-keep-awake";
import { getExerciseDemo } from "@/lib/exercise-demos";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExerciseDemoPlayer } from "@/components/exercise-demo-player";
import { BodyDiagramInline } from "@/components/body-diagram";
import { EnhancedGifPlayer } from "@/components/enhanced-gif-player";
import { getExerciseInfo, getAlternativeExercises } from "@/lib/exercise-data";
import { Image } from "expo-image";
import { useFavorites } from "@/lib/favorites-context";
import { logWorkoutPRs } from "@/lib/personal-records";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  type RestTimerSettings,
  DEFAULT_REST_TIMERS,
  loadRestTimerSettings,
  getRestTimeForExercise,
} from "@/lib/rest-timer-settings";
import { preloadExerciseVideos, clearPreloadCache } from "@/lib/video-preload";

import { GOLDEN_WORKOUT, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const SF = {
  bg: "#0A0E14",
  surface: "#141A22",
  border: "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg: "#F1F5F9",
  muted: "#B45309",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  gold3: "#FDE68A",
};

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
  muscleGroup?: string;
}

interface SetLog {
  weight: string;
  reps: string;
  completed: boolean;
}

// ── Demo Video Component (Exercise GIF Player) ────────────────────────────────
function ExerciseDemoVideo({ exerciseName, compact = false }: { exerciseName: string; compact?: boolean }) {
  const demo = getExerciseDemo(exerciseName);
  const exerciseInfo = getExerciseInfo(exerciseName);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(exerciseName);
  const [showEnhanced, setShowEnhanced] = React.useState(false);

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Header with body diagram */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {exerciseInfo && (
            <BodyDiagramInline
              primary={exerciseInfo.primaryMuscles}
              secondary={exerciseInfo.secondaryMuscles}
            />
          )}
          <View>
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1 }}>FORM GUIDE</Text>
            {exerciseInfo && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                {exerciseInfo.primaryMuscles.map((m) => (
                  <View key={m} style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ color: SF.gold, fontFamily: "DMSans_500Medium", fontSize: 9 }}>{m.replace(/_/g, " ")}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {/* Favorite button */}
          <TouchableOpacity
            onPress={() => toggleFavorite(exerciseName)}
            style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.08)" }}
          >
            <MaterialIcons name={favorited ? "favorite" : "favorite-border"} size={16} color={favorited ? "#EF4444" : SF.muted} />
          </TouchableOpacity>
          {/* Toggle enhanced/video */}
          {exerciseInfo && exerciseInfo.angleViews.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowEnhanced((v) => !v)}
              style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: showEnhanced ? SF.gold : "rgba(245,158,11,0.08)" }}
            >
              <MaterialIcons name="360" size={16} color={showEnhanced ? SF.bg : SF.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Exercise GIF Demo */}
      {showEnhanced && exerciseInfo ? (
        <EnhancedGifPlayer
          angleViews={exerciseInfo.angleViews}
          exerciseName={exerciseName}
          height={compact ? 160 : 220}
        />
      ) : (
        <ExerciseDemoPlayer gifUrl={demo.gifUrl} cue={demo.cue} height={compact ? 140 : 200} exerciseName={exerciseName} />
      )}
    </View>
  );
}

// ── Fullscreen Timer Modal ────────────────────────────────────────────────────────
function FullscreenTimerModal({
  visible,
  exercise,
  elapsedSeconds,
  restTimer,
  onClose,
  onCompleteSet,
  onSkipRest,
  currentSetIndex,
  totalSets,
  completedSets,
}: {
  visible: boolean;
  exercise: Exercise;
  elapsedSeconds: number;
  restTimer: number | null;
  onClose: () => void;
  onCompleteSet: () => void;
  onSkipRest: () => void;
  currentSetIndex: number;
  totalSets: number;
  completedSets: number;
}) {
  const demo = getExerciseDemo(exercise.name);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SF.surface, alignItems: "center", justifyContent: "center" }}
            onPress={onClose}
          >
            <Text style={{ color: SF.fg, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1 }}>ACTIVE EXERCISE</Text>
            <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 16 }} numberOfLines={1}>{exercise.name}</Text>
          </View>
          <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: SF.gold2, fontFamily: "DMSans_700Bold", fontSize: 13 }}>⏱ {formatTime(elapsedSeconds)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {/* Large Timer / Rest Timer */}
          {restTimer !== null ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_700Bold", fontSize: 13, letterSpacing: 1, marginBottom: 8 }}>REST TIMER</Text>
              <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 80, lineHeight: 90 }}>{formatTime(restTimer)}</Text>
              <TouchableOpacity
                style={{ marginTop: 12, backgroundColor: SF.surface, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: SF.border }}
                onPress={onSkipRest}
              >
                <Text style={{ color: SF.muted, fontFamily: "DMSans_700Bold" }}>Skip Rest</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_700Bold", fontSize: 13, letterSpacing: 1, marginBottom: 4 }}>WORKOUT TIME</Text>
              <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 72, lineHeight: 82 }}>{formatTime(elapsedSeconds)}</Text>
              {/* Set progress */}
              <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
                {Array.from({ length: totalSets }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: i < completedSets ? SF.gold : SF.surface,
                      borderWidth: 1, borderColor: i < completedSets ? SF.gold : SF.border,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: i < completedSets ? SF.bg : SF.muted, fontFamily: "DMSans_700Bold", fontSize: 12 }}>
                      {i < completedSets ? "✓" : i + 1}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: SF.muted, fontSize: 12, marginTop: 8 }}>
                {completedSets}/{totalSets} sets · {exercise.reps} reps · Rest: {exercise.rest}
              </Text>
            </View>
          )}

          {/* Complete Set Button */}
          {restTimer === null && (
            <TouchableOpacity
              style={{ backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 20 }}
              onPress={onCompleteSet}
              disabled={completedSets >= totalSets}
            >
              <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
                {completedSets >= totalSets ? "✓ All Sets Done" : `Complete Set ${completedSets + 1}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Demo Video */}
          <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: SF.border }}>
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 10 }}>EXERCISE DEMO</Text>
            <ExerciseDemoPlayer gifUrl={demo.gifUrl} cue={demo.cue} height={180} exerciseName={exercise.name} />
            {exercise.notes && (
              <View style={{ marginTop: 10, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, padding: 10 }}>
                <Text style={{ color: SF.muted, fontSize: 12 }}>📋 {exercise.notes}</Text>
              </View>
            )}
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={{ marginTop: 20, backgroundColor: SF.surface, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: SF.border }}
            onPress={onClose}
          >
            <Text style={{ color: SF.muted, fontFamily: "DMSans_700Bold" }}>← Back to Full Workout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ActiveWorkoutScreen() {
  useKeepAwake();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ dayData: string }>();

  let dayData: any = null;
  try {
    dayData = params.dayData ? JSON.parse(params.dayData) : null;
  } catch (_) {
    // Malformed JSON — will show empty workout
  }
  const exercises: Exercise[] = dayData?.exercises ?? [];

  const [currentExercise, setCurrentExercise] = useState(0);
  const [setLogs, setSetLogs] = useState<Record<number, SetLog[]>>({});
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [subscription, setSubscription] = useState<string>("free");
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [restSettings, setRestSettings] = useState<RestTimerSettings>(DEFAULT_REST_TIMERS);

  const logSession = trpc.workoutPlan.logSession.useMutation({
    onSuccess: () => {
      Alert.alert("Workout Complete! \uD83C\uDF89", "Great job! Your session has been logged.", [
        { text: "Done", onPress: () => router.back() },
        { text: "Share \uD83D\uDCF1", onPress: () => router.replace({ pathname: "/share-workout" as any, params: { type: "session", sessionName: dayData?.focus ?? "Workout", sessionDuration: String(Math.round(elapsedSeconds / 60)), sessionExercises: String(exercises.length) } }) },
      ]);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  // Load rest timer settings
  useEffect(() => {
    loadRestTimerSettings().then(setRestSettings);
  }, []);

  // Preload next exercise videos when rest timer starts or exercise changes
  useEffect(() => {
    const nextIdx = currentExercise + 1;
    if (nextIdx < exercises.length) {
      preloadExerciseVideos(exercises[nextIdx].name).catch(() => {});
    }
  }, [currentExercise, restTimer]);

  // Preload first 2 exercises at workout start
  useEffect(() => {
    if (workoutStarted && exercises.length > 0) {
      preloadExerciseVideos(exercises[0].name).catch(() => {});
      if (exercises.length > 1) {
        preloadExerciseVideos(exercises[1].name).catch(() => {});
      }
    }
    return () => clearPreloadCache();
  }, [workoutStarted]);

  // Load subscription state
  useEffect(() => {
    AsyncStorage.multiGet(["@subscription_plan", "@ai_coach_trial_start"]).then(([planEntry, trialEntry]) => {
      const plan = planEntry[1] ?? "free";
      setSubscription(plan);
      if (plan !== "advanced") {
        const trialStart = trialEntry[1] ? parseInt(trialEntry[1]) : null;
        if (trialStart) {
          const daysPassed = Math.floor((Date.now() - trialStart) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(Math.max(0, 3 - daysPassed));
        } else {
          setTrialDaysLeft(null); // not started yet
        }
      }
    });
  }, []);

  useEffect(() => {
    if (workoutStarted) {
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [workoutStarted]);

  useEffect(() => {
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, []);

  function startRestTimer(seconds: number) {
    setRestTimer(seconds);
    if (restRef.current) clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestTimer(prev => {
        if (prev === null || prev <= 1) {
          if (restRef.current) clearInterval(restRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function initSetLogs(exerciseIndex: number, numSets: number): SetLog[] {
    return Array.from({ length: numSets }, () => ({ weight: "", reps: "", completed: false }));
  }

  function getSetLogs(exerciseIndex: number): SetLog[] {
    if (!setLogs[exerciseIndex]) {
      const ex = exercises[exerciseIndex];
      return initSetLogs(exerciseIndex, ex?.sets ?? 3);
    }
    return setLogs[exerciseIndex];
  }

  function updateSetLog(exerciseIndex: number, setIndex: number, field: keyof SetLog, value: any) {
    const current = getSetLogs(exerciseIndex);
    const updated = current.map((s, i) => i === setIndex ? { ...s, [field]: value } : s);
    setSetLogs(prev => ({ ...prev, [exerciseIndex]: updated }));
  }

  function completeSet(exerciseIndex: number, setIndex: number) {
    updateSetLog(exerciseIndex, setIndex, "completed", true);
    const ex = exercises[exerciseIndex];
    // Use custom rest timer based on exercise type classification
    // Falls back to the exercise's own rest field, then to the custom default
    const classifiedRest = getRestTimeForExercise(ex?.name ?? "", restSettings);
    const restSeconds = classifiedRest;
    startRestTimer(restSeconds);
  }

  function completeCurrentSet() {
    const logs = getSetLogs(currentExercise);
    const nextIncomplete = logs.findIndex(l => !l.completed);
    if (nextIncomplete !== -1) completeSet(currentExercise, nextIncomplete);
  }

  async function saveSessionLocally(session: { dayName: string; focus: string; completedExercisesJson: string; durationMinutes: number; completedAt: string }) {
    try {
      const raw = await AsyncStorage.getItem("@workout_sessions_local");
      const existing = raw ? JSON.parse(raw) : [];
      existing.unshift(session);
      await AsyncStorage.setItem("@workout_sessions_local", JSON.stringify(existing));
    } catch {}
  }

  function finishWorkout() {
    Alert.alert(
      "Finish Workout?",
      "Are you sure you want to end this workout session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          onPress: async () => {
            const completedExercises = exercises.map((ex, i) => ({
              name: ex.name,
              sets: getSetLogs(i).filter(s => s.completed).length,
              logs: getSetLogs(i),
            }));
            const sessionData = {
              dayName: dayData?.day ?? "Workout",
              focus: dayData?.focus ?? "",
              completedExercisesJson: JSON.stringify(completedExercises.map(e => e.name)),
              durationMinutes: Math.floor(elapsedSeconds / 60),
              completedAt: new Date().toISOString(),
            };
            // Auto-log personal records
            try {
              const prResults = await logWorkoutPRs(completedExercises);
              const newPRs = prResults.filter(r => r.isNewPR);
              const prMessage = newPRs.length > 0
                ? `\n\n\u{1F3C6} ${newPRs.length} new PR${newPRs.length > 1 ? "s" : ""}! ${newPRs.map(p => p.exercise).join(", ")}`
                : "";
              if (isAuthenticated) {
                logSession.mutate({
                  dayName: sessionData.dayName,
                  focus: sessionData.focus,
                  completedExercises: completedExercises.map(e => e.name),
                  durationMinutes: sessionData.durationMinutes,
                });
              } else {
                // Guest: save locally
                await saveSessionLocally(sessionData);
                Alert.alert("Workout Complete! \u{1F389}", `Great job! Your session has been logged locally.${prMessage}`, [
                  { text: "Done", onPress: () => router.back() },
                  { text: "Share \uD83D\uDCF1", onPress: () => router.replace({ pathname: "/share-workout" as any, params: { type: "session", sessionName: dayData?.focus ?? "Workout", sessionDuration: String(Math.round(elapsedSeconds / 60)), sessionExercises: String(exercises.length) } }) },
                ]);
              }
            } catch {
              // PR logging failed silently, still save session
              if (isAuthenticated) {
                logSession.mutate({
                  dayName: sessionData.dayName,
                  focus: sessionData.focus,
                  completedExercises: completedExercises.map(e => e.name),
                  durationMinutes: sessionData.durationMinutes,
                });
              } else {
                await saveSessionLocally(sessionData);
                Alert.alert("Workout Complete! \u{1F389}", "Great job! Your session has been logged locally.", [
                  { text: "Done", onPress: () => router.back() },
                ]);
              }
            }
          },
        },
      ]
    );
  }

  async function handleAIFeatureTap(feature: "coach" | "form_check") {
    const hasAccess = subscription === "advanced" || (trialDaysLeft !== null && trialDaysLeft > 0);
    if (!hasAccess) {
      // Offer to start trial if not started
      if (trialDaysLeft === null) {
        Alert.alert(
          "🌟 Advanced Feature",
          "AI Coach and Form Check are Advanced plan features. Start your 3-day free trial now?",
          [
            { text: "Not Now", style: "cancel" },
            {
              text: "Start 3-Day Trial",
              onPress: async () => {
                await AsyncStorage.setItem("@ai_coach_trial_start", String(Date.now()));
                setTrialDaysLeft(3);
                navigateToFeature(feature);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Trial Expired",
          "Your 3-day AI Coach trial has ended. Upgrade to Advanced to continue using AI Coach and Form Check.",
          [
            { text: "Maybe Later", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/subscription-plans") },
          ]
        );
      }
      return;
    }
    navigateToFeature(feature);
  }

  function navigateToFeature(feature: "coach" | "form_check") {
    if (feature === "coach") {
      router.push("/ai-coach");
    } else {
      router.push("/form-checker");
    }
  }

  const exercise = exercises[currentExercise];
  const logs = exercise ? getSetLogs(currentExercise) : [];
  const completedSets = logs.filter(s => s.completed).length;
  const totalCompleted = Object.values(setLogs).reduce((sum, ls) => sum + ls.filter(s => s.completed).length, 0);
  const isAdvancedOrTrial = subscription === "advanced" || (trialDaysLeft !== null && trialDaysLeft > 0);

  if (!dayData) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">No workout data found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold" }}>← Go Back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SF.surface, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: SF.fg, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: SF.fg, fontSize: 18, fontFamily: "BebasNeue_400Regular" }}>{dayData.day} — {dayData.focus}</Text>
          <Text style={{ color: SF.muted, fontSize: 12 }}>{exercises.length} exercises</Text>
        </View>
        <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: SF.gold2, fontFamily: "DMSans_700Bold", fontSize: 14 }}>⏱ {formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Start Banner */}
      {!workoutStarted && (
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
          onPress={() => setWorkoutStarted(true)}
        >
          <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>▶ Start Workout</Text>
        </TouchableOpacity>
      )}

      {/* Rest Timer */}
      {restTimer !== null && (
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: "#F9731620", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#F9731640", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "#FED7AA", fontFamily: "DMSans_700Bold", fontSize: 14 }}>🔄 Rest Timer</Text>
          <Text style={{ color: SF.gold2, fontFamily: "BebasNeue_400Regular", fontSize: 24 }}>{formatTime(restTimer)}</Text>
          <TouchableOpacity onPress={() => { setRestTimer(null); if (restRef.current) clearInterval(restRef.current); }}>
            <Text style={{ color: SF.muted, fontSize: 12 }}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Bar */}
      <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ color: SF.muted, fontSize: 11 }}>Exercise {currentExercise + 1} of {exercises.length}</Text>
          <Text style={{ color: SF.gold3, fontSize: 11 }}>{totalCompleted} sets done</Text>
        </View>
        <View style={{ height: 4, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 2 }}>
          <View style={{ height: 4, backgroundColor: SF.gold, borderRadius: 2, width: `${((currentExercise) / exercises.length) * 100}%` }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Exercise Navigator */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 16 }}>
          {exercises.map((ex, i) => (
            <TouchableOpacity
              key={i}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: currentExercise === i ? SF.gold : SF.surface, borderWidth: 1, borderColor: currentExercise === i ? SF.gold : SF.border }}
              onPress={() => setCurrentExercise(i)}
            >
              <Text style={{ color: currentExercise === i ? SF.fg : SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 12 }} numberOfLines={1}>{ex.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Current Exercise */}
        {exercise && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Exercise header card with body diagram */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SF.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                {/* Body diagram + exercise info */}
                <View style={{ flexDirection: "row", flex: 1, gap: 10, alignItems: "center" }}>
                  {(() => {
                    const info = getExerciseInfo(exercise.name);
                    if (info) return (
                      <View style={{ backgroundColor: "rgba(245,158,11,0.04)", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "rgba(245,158,11,0.1)" }}>
                        <BodyDiagramInline primary={info.primaryMuscles} secondary={info.secondaryMuscles} />
                      </View>
                    );
                    return null;
                  })()}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: SF.gold2, fontSize: 11, fontFamily: "DMSans_700Bold", marginBottom: 4 }}>{exercise.muscleGroup?.toUpperCase()}</Text>
                    <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 20 }}>{exercise.name}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: SF.muted, fontSize: 12 }}>{exercise.sets} sets × {exercise.reps}</Text>
                  <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>Rest: {exercise.rest}</Text>
                  {/* Demo link */}
                  <TouchableOpacity
                    onPress={() => {
                      // Scroll down to the demo video section
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(245,158,11,0.08)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}
                  >
                    <MaterialIcons name="play-circle-outline" size={12} color={SF.gold} />
                    <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>Demo</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {exercise.notes && (
                <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, padding: 10 }}>
                  <Text style={{ color: SF.muted, fontSize: 12 }}>💡 {exercise.notes}</Text>
                </View>
              )}

              {/* Fullscreen Timer Button */}
              <TouchableOpacity
                style={{ marginTop: 12, backgroundColor: SF.gold, borderRadius: 12, paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                onPress={() => setFullscreenVisible(true)}
              >
                <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>⏱ Open Fullscreen Timer + Demo</Text>
              </TouchableOpacity>
            </View>

            {/* Demo Video (inline, compact) */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: SF.border }}>
              <ExerciseDemoVideo exerciseName={exercise.name} compact />
            </View>

            {/* Alternative Exercises */}
            {(() => {
              const alts = getAlternativeExercises(exercise.name, 3);
              if (alts.length === 0) return null;
              return (
                <ImageBackground source={{ uri: GOLDEN_WORKOUT }} style={{ flex: 1 }} resizeMode="cover">
                <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: SF.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <MaterialIcons name="swap-horiz" size={14} color={SF.gold} />
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 1.2 }}>TRY INSTEAD</Text>
                  </View>
                  {alts.map((alt) => (
                    <TouchableOpacity
                      key={alt.key}
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        router.push({ pathname: "/exercise-detail" as any, params: { name: alt.name } });
                      }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(245,158,11,0.08)" }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: SF.bg, overflow: "hidden", borderWidth: 1, borderColor: SF.border }}>
                        <Image
                          source={{ uri: alt.angleViews[0]?.gifUrl }}
                          style={{ width: 44, height: 44 }}
                          contentFit="contain"
                          cachePolicy="disk"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 12 }} numberOfLines={1}>{alt.name}</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 1 }} numberOfLines={1}>{alt.cue}</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={16} color={SF.muted} />
                    </TouchableOpacity>
                  ))}
                </View>
                </ImageBackground>
              );
            })()}

            {/* Set Tracker */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: SF.border }}>
              <View style={{ flexDirection: "row", marginBottom: 10 }}>
                <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "DMSans_700Bold", width: 40 }}>SET</Text>
                <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "DMSans_700Bold", flex: 1, textAlign: "center" }}>WEIGHT (kg)</Text>
                <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "DMSans_700Bold", flex: 1, textAlign: "center" }}>REPS</Text>
                <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "DMSans_700Bold", width: 60, textAlign: "center" }}>DONE</Text>
              </View>
              {logs.map((log, setIdx) => (
                <View key={setIdx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, opacity: log.completed ? 0.6 : 1 }}>
                  <View style={{ width: 40, height: 28, borderRadius: 8, backgroundColor: log.completed ? "rgba(245,158,11,0.10)" : SF.surface, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: log.completed ? SF.gold3 : SF.muted, fontFamily: "DMSans_700Bold", fontSize: 12 }}>{setIdx + 1}</Text>
                  </View>
                  <TextInput
                    value={log.weight}
                    onChangeText={v => updateSetLog(currentExercise, setIdx, "weight", v)}
                    placeholder="0"
                    placeholderTextColor="#451A03"
                    keyboardType="numeric"
                    editable={!log.completed}
                    style={{ flex: 1, backgroundColor: "#141A22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: SF.fg, fontSize: 14, textAlign: "center", marginHorizontal: 6 }}
                    returnKeyType="done"
                  />
                  <TextInput
                    value={log.reps}
                    onChangeText={v => updateSetLog(currentExercise, setIdx, "reps", v)}
                    placeholder={exercise.reps}
                    placeholderTextColor="#451A03"
                    keyboardType="numeric"
                    editable={!log.completed}
                    style={{ flex: 1, backgroundColor: "#141A22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: SF.fg, fontSize: 14, textAlign: "center", marginHorizontal: 6 }}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={{ width: 60, height: 32, borderRadius: 8, backgroundColor: log.completed ? SF.gold2 : "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}
                    onPress={() => !log.completed && completeSet(currentExercise, setIdx)}
                    disabled={log.completed}
                  >
                    <Text style={{ color: log.completed ? SF.bg : SF.gold2, fontFamily: "DMSans_700Bold", fontSize: 12 }}>
                      {log.completed ? "✓" : "Done"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: SF.muted, fontSize: 12 }}>{completedSets}/{logs.length} sets completed</Text>
              </View>
            </View>

            {/* AI Coach & Form Check buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: isAdvancedOrTrial ? "rgba(245,158,11,0.12)" : SF.surface, borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: isAdvancedOrTrial ? SF.gold : SF.border }}
                onPress={() => handleAIFeatureTap("form_check")}
              >
                <Text style={{ color: isAdvancedOrTrial ? SF.gold : SF.muted, fontFamily: "DMSans_700Bold", fontSize: 13 }}>🎯 Form Check</Text>
                {!isAdvancedOrTrial && (
                  <Text style={{ color: SF.muted, fontSize: 10, marginTop: 2 }}>Advanced · 3-day trial</Text>
                )}
                {trialDaysLeft !== null && trialDaysLeft > 0 && subscription !== "advanced" && (
                  <Text style={{ color: SF.gold3, fontSize: 10, marginTop: 2 }}>{trialDaysLeft}d trial left</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: isAdvancedOrTrial ? "rgba(245,158,11,0.12)" : SF.surface, borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: isAdvancedOrTrial ? SF.gold : SF.border }}
                onPress={() => handleAIFeatureTap("coach")}
              >
                <Text style={{ color: isAdvancedOrTrial ? SF.gold : SF.muted, fontFamily: "DMSans_700Bold", fontSize: 13 }}>🤖 AI Coach</Text>
                {!isAdvancedOrTrial && (
                  <Text style={{ color: SF.muted, fontSize: 10, marginTop: 2 }}>Advanced · 3-day trial</Text>
                )}
                {trialDaysLeft !== null && trialDaysLeft > 0 && subscription !== "advanced" && (
                  <Text style={{ color: SF.gold3, fontSize: 10, marginTop: 2 }}>{trialDaysLeft}d trial left</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Navigation */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {currentExercise > 0 && (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: SF.surface, borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: SF.border }}
                  onPress={() => setCurrentExercise(currentExercise - 1)}
                >
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_700Bold" }}>← Previous</Text>
                </TouchableOpacity>
              )}
              {currentExercise < exercises.length - 1 ? (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: SF.gold, borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                  onPress={() => setCurrentExercise(currentExercise + 1)}
                >
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold" }}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: SF.gold3, borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                  onPress={finishWorkout}
                >
                  <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold" }}>🏁 Finish Workout</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Timer Modal */}
      {exercise && (
        <FullscreenTimerModal
          visible={fullscreenVisible}
          exercise={exercise}
          elapsedSeconds={elapsedSeconds}
          restTimer={restTimer}
          onClose={() => setFullscreenVisible(false)}
          onCompleteSet={completeCurrentSet}
          onSkipRest={() => { setRestTimer(null); if (restRef.current) clearInterval(restRef.current); }}
          currentSetIndex={completedSets}
          totalSets={exercise.sets}
          completedSets={completedSets}
        />
      )}
    </ScreenContainer>
  );
}
