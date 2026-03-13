import React, { useState, useEffect, useRef } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Alert, TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useKeepAwake } from "expo-keep-awake";

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

  const exercise = exercises[currentExercise];
  const logs = exercise ? getSetLogs(currentExercise) : [];
  const completedSets = logs.filter(s => s.completed).length;
  const totalCompleted = Object.values(setLogs).reduce((sum, logs) => sum + logs.filter(s => s.completed).length, 0);

  if (!dayData) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">No workout data found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#10B981", fontFamily: "Outfit_700Bold" }}>← Go Back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#0D1F18", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#E6FFF5", fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#E6FFF5", fontSize: 18, fontFamily: "Outfit_800ExtraBold" }}>{dayData.day} — {dayData.focus}</Text>
          <Text style={{ color: "#4D8C72", fontSize: 12 }}>{exercises.length} exercises</Text>
        </View>
        <View style={{ backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: "#34D399", fontFamily: "Outfit_700Bold", fontSize: 14 }}>⏱ {formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Start Banner */}
      {!workoutStarted && (
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
          onPress={() => setWorkoutStarted(true)}
        >
          <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16 }}>▶ Start Workout</Text>
        </TouchableOpacity>
      )}

      {/* Rest Timer */}
      {restTimer !== null && (
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: "#F9731620", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#F9731640", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: "#FED7AA", fontFamily: "Outfit_700Bold", fontSize: 14 }}>🔄 Rest Timer</Text>
          <Text style={{ color: "#34D399", fontFamily: "Outfit_800ExtraBold", fontSize: 24 }}>{formatTime(restTimer)}</Text>
          <TouchableOpacity onPress={() => { setRestTimer(null); if (restRef.current) clearInterval(restRef.current); }}>
            <Text style={{ color: "#4D8C72", fontSize: 12 }}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Bar */}
      <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ color: "#4D8C72", fontSize: 11 }}>Exercise {currentExercise + 1} of {exercises.length}</Text>
          <Text style={{ color: "#6EE7B7", fontSize: 11 }}>{totalCompleted} sets done</Text>
        </View>
        <View style={{ height: 4, backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 2 }}>
          <View style={{ height: 4, backgroundColor: "#10B981", borderRadius: 2, width: `${((currentExercise) / exercises.length) * 100}%` }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Exercise Navigator */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 16 }}>
          {exercises.map((ex, i) => (
            <TouchableOpacity
              key={i}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: currentExercise === i ? "#10B981" : "#0D1F18", borderWidth: 1, borderColor: currentExercise === i ? "#10B981" : "rgba(16,185,129,0.10)" }}
              onPress={() => setCurrentExercise(i)}
            >
              <Text style={{ color: currentExercise === i ? "#E6FFF5" : "#4D8C72", fontFamily: "DMSans_600SemiBold", fontSize: 12 }} numberOfLines={1}>{ex.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Current Exercise */}
        {exercise && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: "#0D1F18", borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(16,185,129,0.12)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View>
                  <Text style={{ color: "#34D399", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 4 }}>{exercise.muscleGroup?.toUpperCase()}</Text>
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>{exercise.name}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: "#4D8C72", fontSize: 12 }}>{exercise.sets} sets × {exercise.reps}</Text>
                  <Text style={{ color: "#4D8C72", fontSize: 11, marginTop: 2 }}>Rest: {exercise.rest}</Text>
                </View>
              </View>
              {exercise.notes && (
                <View style={{ backgroundColor: "#0D1F18", borderRadius: 10, padding: 10 }}>
                  <Text style={{ color: "#4D8C72", fontSize: 12 }}>💡 {exercise.notes}</Text>
                </View>
              )}
            </View>

            {/* Set Tracker */}
            <View style={{ backgroundColor: "#0D1F18", borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(16,185,129,0.10)" }}>
              <View style={{ flexDirection: "row", marginBottom: 10 }}>
                <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", width: 40 }}>SET</Text>
                <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", flex: 1, textAlign: "center" }}>WEIGHT (kg)</Text>
                <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", flex: 1, textAlign: "center" }}>REPS</Text>
                <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", width: 60, textAlign: "center" }}>DONE</Text>
              </View>
              {logs.map((log, setIdx) => (
                <View key={setIdx} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, opacity: log.completed ? 0.6 : 1 }}>
                  <View style={{ width: 40, height: 28, borderRadius: 8, backgroundColor: log.completed ? "rgba(16,185,129,0.10)" : "#0D1F18", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: log.completed ? "#6EE7B7" : "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 12 }}>{setIdx + 1}</Text>
                  </View>
                  <TextInput
                    value={log.weight}
                    onChangeText={v => updateSetLog(currentExercise, setIdx, "weight", v)}
                    placeholder="0"
                    placeholderTextColor="#1A4A38"
                    keyboardType="numeric"
                    editable={!log.completed}
                    style={{ flex: 1, backgroundColor: "#0D1F18", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: "#E6FFF5", fontSize: 14, textAlign: "center", marginHorizontal: 6 }}
                    returnKeyType="done"
                  />
                  <TextInput
                    value={log.reps}
                    onChangeText={v => updateSetLog(currentExercise, setIdx, "reps", v)}
                    placeholder={exercise.reps}
                    placeholderTextColor="#1A4A38"
                    keyboardType="numeric"
                    editable={!log.completed}
                    style={{ flex: 1, backgroundColor: "#0D1F18", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: "#E6FFF5", fontSize: 14, textAlign: "center", marginHorizontal: 6 }}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={{ width: 60, height: 32, borderRadius: 8, backgroundColor: log.completed ? "#6EE7B7" : "rgba(16,185,129,0.10)", alignItems: "center", justifyContent: "center" }}
                    onPress={() => !log.completed && completeSet(currentExercise, setIdx)}
                    disabled={log.completed}
                  >
                    <Text style={{ color: log.completed ? "#E6FFF5" : "#34D399", fontFamily: "Outfit_700Bold", fontSize: 12 }}>
                      {log.completed ? "✓" : "Done"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: "#4D8C72", fontSize: 12 }}>{completedSets}/{logs.length} sets completed</Text>
              </View>
            </View>

            {/* Navigation */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {currentExercise > 0 && (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#0D1F18", borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(16,185,129,0.10)" }}
                  onPress={() => setCurrentExercise(currentExercise - 1)}
                >
                  <Text style={{ color: "#4D8C72", fontFamily: "Outfit_700Bold" }}>← Previous</Text>
                </TouchableOpacity>
              )}
              {currentExercise < exercises.length - 1 ? (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                  onPress={() => setCurrentExercise(currentExercise + 1)}
                >
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold" }}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#6EE7B7", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
                  onPress={finishWorkout}
                >
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold" }}>🏁 Finish Workout</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
