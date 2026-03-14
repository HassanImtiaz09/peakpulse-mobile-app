import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Alert, TextInput,
  Modal, Dimensions, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useKeepAwake } from "expo-keep-awake";
import { VideoView, useVideoPlayer } from "expo-video";
import { getExerciseDemo } from "@/lib/exercise-demos";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const SF = {
  bg: "#0A0500",
  surface: "#150A00",
  border: "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg: "#FFF7ED",
  muted: "#92400E",
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

// ── Demo Video Component ──────────────────────────────────────────────────────
function ExerciseDemoVideo({ exerciseName, compact = false }: { exerciseName: string; compact?: boolean }) {
  const demo = getExerciseDemo(exerciseName);
  const player = useVideoPlayer(demo.videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1 }}>DEMO</Text>
        <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: SF.muted, fontSize: 10 }}>🔇 Muted · Looping</Text>
        </View>
      </View>
      <VideoView
        player={player}
        style={{
          width: "100%",
          height: compact ? 140 : 200,
          borderRadius: 12,
          backgroundColor: "#000",
        }}
        contentFit="cover"
        nativeControls={false}
      />
      <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 6, lineHeight: 17 }}>
        💡 {demo.cue}
      </Text>
    </View>
  );
}

// ── Fullscreen Timer Modal ────────────────────────────────────────────────────
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
  const player = useVideoPlayer(demo.videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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
            <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1 }}>ACTIVE EXERCISE</Text>
            <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }} numberOfLines={1}>{exercise.name}</Text>
          </View>
          <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: SF.gold2, fontFamily: "Outfit_700Bold", fontSize: 13 }}>⏱ {formatTime(elapsedSeconds)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {/* Large Timer / Rest Timer */}
          {restTimer !== null ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ color: SF.muted, fontFamily: "Outfit_700Bold", fontSize: 13, letterSpacing: 1, marginBottom: 8 }}>REST TIMER</Text>
              <Text style={{ color: SF.gold, fontFamily: "Outfit_800ExtraBold", fontSize: 80, lineHeight: 90 }}>{formatTime(restTimer)}</Text>
              <TouchableOpacity
                style={{ marginTop: 12, backgroundColor: SF.surface, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: SF.border }}
                onPress={onSkipRest}
              >
                <Text style={{ color: SF.muted, fontFamily: "Outfit_700Bold" }}>Skip Rest</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ color: SF.muted, fontFamily: "Outfit_700Bold", fontSize: 13, letterSpacing: 1, marginBottom: 4 }}>WORKOUT TIME</Text>
              <Text style={{ color: SF.gold, fontFamily: "Outfit_800ExtraBold", fontSize: 72, lineHeight: 82 }}>{formatTime(elapsedSeconds)}</Text>
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
                    <Text style={{ color: i < completedSets ? SF.bg : SF.muted, fontFamily: "Outfit_700Bold", fontSize: 12 }}>
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
              <Text style={{ color: SF.bg, fontFamily: "Outfit_700Bold", fontSize: 16 }}>
                {completedSets >= totalSets ? "✓ All Sets Done" : `Complete Set ${completedSets + 1}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Demo Video */}
          <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: SF.border }}>
            <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 10 }}>EXERCISE DEMO</Text>
            <VideoView
              player={player}
              style={{ width: "100%", height: 220, borderRadius: 12, backgroundColor: "#000" }}
              contentFit="cover"
              nativeControls={false}
            />
            <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 8, lineHeight: 19 }}>
              💡 {demo.cue}
            </Text>
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
            <Text style={{ color: SF.muted, fontFamily: "Outfit_700Bold" }}>← Back to Full Workout</Text>
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

  const dayData = params.dayData ? JSON.parse(params.dayData) : null;
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

  const logSession = trpc.workoutPlan.logSession.useMutation({
    onSuccess: () => {
      Alert.alert("Workout Complete! 🎉", "Great job! Your session has been logged.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

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
    const restSeconds = ex?.rest ? parseInt(ex.rest) : 60;
    startRestTimer(restSeconds);
  }

  function completeCurrentSet() {
    const logs = getSetLogs(currentExercise);
    const nextIncomplete = logs.findIndex(l => !l.completed);
    if (nextIncomplete !== -1) completeSet(currentExercise, nextIncomplete);
  }

  function finishWorkout() {
    Alert.alert(
      "Finish Workout?",
      "Are you sure you want to end this workout session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          onPress: () => {
            const completedExercises = exercises.map((ex, i) => ({
              name: ex.name,
              sets: getSetLogs(i).filter(s => s.completed).length,
              logs: getSetLogs(i),
            }));
            logSession.mutate({
              dayName: dayData?.day ?? "Workout",
              focus: dayData?.focus ?? "",
              completedExercises: completedExercises.map(e => e.name),
              durationMinutes: Math.floor(elapsedSeconds / 60),
            });
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
          <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold" }}>← Go Back</Text>
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
          <Text style={{ color: SF.fg, fontSize: 18, fontFamily: "Outfit_800ExtraBold" }}>{dayData.day} — {dayData.focus}</Text>
          <Text style={{ color: SF.muted, fontSize: 12 }}>{exercises.length} exercises</Text>
        </View>
        <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: SF.gold2, fontFamily: "Outfit_700Bold", fontSize: 14 }}>⏱ {formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Start Banner */}
      {!workoutStarted && (
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
          onPress={() => setWorkoutStarted(true)}
        >
          <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16 }}>▶ Start Workout</Text>
        </TouchableOpacity>
      )}

      {/* Rest Timer */}
      {restTimer !== null && (
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: "#F9731620", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#F9731640", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "#FED7AA", fontFamily: "Outfit_700Bold", fontSize: 14 }}>🔄 Rest Timer</Text>
          <Text style={{ color: SF.gold2, fontFamily: "Outfit_800ExtraBold", fontSize: 24 }}>{formatTime(restTimer)}</Text>
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
            {/* Exercise header card */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: SF.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SF.gold2, fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 4 }}>{exercise.muscleGroup?.toUpperCase()}</Text>
                  <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>{exercise.name}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: SF.muted, fontSize: 12 }}>{exercise.sets} sets × {exercise.reps}</Text>
                  <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>Rest: {exercise.rest}</Text>
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
                <Text style={{ color: SF.bg, fontFamily: "Outfit_700Bold", fontSize: 14 }}>⏱ Open Fullscreen Timer + Demo</Text>
              </TouchableOpacity>
            </View>

            {/* Demo Video (inline, compact) */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: SF.border }}>
              <ExerciseDemoVideo exerciseName={exercise.name} compact />
            </View>

            {/* Set Tracker */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: SF.border }}>
              <View style={{ flexDirection: "row", marginBottom: 10 }}>
                <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "Outfit_700Bold", width: 40 }}>SET</Text>
                <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "Outfit_700Bold", flex: 1, textAlign: "center" }}>WEIGHT (kg)</Text>
                <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "Outfit_700Bold", flex: 1, textAlign: "center" }}>REPS</Text>
                <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "Outfit_700Bold", width: 60, textAlign: "center" }}>DONE</Text>
              </View>
              {logs.map((log, setIdx) => (
                <View key={setIdx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, opacity: log.completed ? 0.6 : 1 }}>
                  <View style={{ width: 40, height: 28, borderRadius: 8, backgroundColor: log.completed ? "rgba(245,158,11,0.10)" : SF.surface, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: log.completed ? SF.gold3 : SF.muted, fontFamily: "Outfit_700Bold", fontSize: 12 }}>{setIdx + 1}</Text>
                  </View>
                  <TextInput
                    value={log.weight}
                    onChangeText={v => updateSetLog(currentExercise, setIdx, "weight", v)}
                    placeholder="0"
                    placeholderTextColor="#451A03"
                    keyboardType="numeric"
                    editable={!log.completed}
                    style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: SF.fg, fontSize: 14, textAlign: "center", marginHorizontal: 6 }}
                    returnKeyType="done"
                  />
                  <TextInput
                    value={log.reps}
                    onChangeText={v => updateSetLog(currentExercise, setIdx, "reps", v)}
                    placeholder={exercise.reps}
                    placeholderTextColor="#451A03"
                    keyboardType="numeric"
                    editable={!log.completed}
                    style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: SF.fg, fontSize: 14, textAlign: "center", marginHorizontal: 6 }}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={{ width: 60, height: 32, borderRadius: 8, backgroundColor: log.completed ? SF.gold2 : "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}
                    onPress={() => !log.completed && completeSet(currentExercise, setIdx)}
                    disabled={log.completed}
                  >
                    <Text style={{ color: log.completed ? SF.bg : SF.gold2, fontFamily: "Outfit_700Bold", fontSize: 12 }}>
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
                <Text style={{ color: isAdvancedOrTrial ? SF.gold : SF.muted, fontFamily: "Outfit_700Bold", fontSize: 13 }}>🎯 Form Check</Text>
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
                <Text style={{ color: isAdvancedOrTrial ? SF.gold : SF.muted, fontFamily: "Outfit_700Bold", fontSize: 13 }}>🤖 AI Coach</Text>
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
                  <Text style={{ color: SF.muted, fontFamily: "Outfit_700Bold" }}>← Previous</Text>
                </TouchableOpacity>
              )}
              {currentExercise < exercises.length - 1 ? (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: SF.gold, borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                  onPress={() => setCurrentExercise(currentExercise + 1)}
                >
                  <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold" }}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: SF.gold3, borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                  onPress={finishWorkout}
                >
                  <Text style={{ color: SF.bg, fontFamily: "Outfit_700Bold" }}>🏁 Finish Workout</Text>
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
