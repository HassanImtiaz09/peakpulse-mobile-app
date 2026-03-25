import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, TextInput, FlatList,
  Alert, Platform, ActivityIndicator, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAllExercises, getExerciseInfo, searchExercises, type ExerciseInfo } from "@/lib/exercise-data";
import { getExerciseDemo } from "@/lib/exercise-demos";
import { BodyHeatmap } from "@/components/body-heatmap";
import {
  getRepSuggestion, analyzeWorkoutBalance, estimateCalories, estimateBodyComposition,
  getCoachingInsights, EXERCISE_CATEGORIES,
  type FitnessGoal, type FitnessLevel, type WorkoutExerciseInput,
  type BalanceAnalysis, type CalorieEstimate, type BodyCompositionEstimate, type WorkoutCoachInsight,
} from "@/lib/workout-insights";

// ── Theme ────────────────────────────────────────────────────────────────────
const SF = {
  bg: "#0A0E14", surface: "rgba(245,158,11,0.04)", surfaceBright: "rgba(245,158,11,0.08)",
  gold1: "#FBBF24", gold2: "#F59E0B", gold3: "#D97706", gold4: "#B45309",
  muted: "#B45309", border: "rgba(245,158,11,0.10)", borderBright: "rgba(245,158,11,0.18)",
  red: "#EF4444", green: "#22C55E", blue: "#3B82F6", cream: "#F1F5F9",
};

interface SelectedExercise {
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  weight: number;
}

type Step = "select" | "configure" | "insights";

const GOALS: { key: FitnessGoal; label: string; icon: string }[] = [
  { key: "build_muscle", label: "Build Muscle", icon: "fitness-center" },
  { key: "lose_fat", label: "Lose Fat", icon: "local-fire-department" },
  { key: "maintain", label: "Maintain", icon: "balance" },
  { key: "athletic", label: "Athletic", icon: "directions-run" },
  { key: "endurance", label: "Endurance", icon: "timer" },
];

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── State ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("select");
  const [goal, setGoal] = useState<FitnessGoal>("build_muscle");
  const [level, setLevel] = useState<FitnessLevel>("intermediate");
  const [bodyWeight, setBodyWeight] = useState(75);
  const [workoutName, setWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [saving, setSaving] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  // Load user profile data
  useEffect(() => {
    AsyncStorage.getItem("@guest_profile").then(raw => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (p.weight) setBodyWeight(parseFloat(p.weight) || 75);
          if (p.fitnessLevel) setLevel(p.fitnessLevel);
          if (p.goal) setGoal(p.goal);
        } catch {}
      }
    });
  }, []);

  // ── Exercise Filtering ───────────────────────────────────────────────────
  const allExercises = useMemo(() => getAllExercises(), []);

  const filteredExercises = useMemo(() => {
    let list = searchQuery ? searchExercises(searchQuery) : allExercises;

    if (activeCategory !== "all") {
      const cat = EXERCISE_CATEGORIES.find(c => c.key === activeCategory);
      if (cat && cat.muscles.length > 0) {
        list = list.filter(ex =>
          ex.primaryMuscles.some(m => cat.muscles.includes(m)) ||
          ex.secondaryMuscles.some(m => cat.muscles.includes(m))
        );
      } else if (activeCategory === "cardio") {
        list = list.filter(ex => ex.category === "cardio");
      } else if (activeCategory === "full_body") {
        list = list.filter(ex => ex.category === "full_body" || ex.primaryMuscles.length >= 3);
      }
    }

    return list;
  }, [searchQuery, activeCategory, allExercises]);

  const isSelected = useCallback((name: string) =>
    selectedExercises.some(e => e.name === name), [selectedExercises]);

  // ── Exercise Selection ───────────────────────────────────────────────────
  const toggleExercise = useCallback((exercise: ExerciseInfo) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedExercises(prev => {
      if (prev.some(e => e.name === exercise.name)) {
        return prev.filter(e => e.name !== exercise.name);
      }
      const suggestion = getRepSuggestion(exercise.name, goal, level);
      const [minReps] = suggestion.suggestedReps.split("-").map(Number);
      return [...prev, {
        name: exercise.name,
        sets: suggestion.suggestedSets,
        reps: minReps || 10,
        restSeconds: parseInt(suggestion.suggestedRest) || 60,
        weight: 0,
      }];
    });
  }, [goal, level]);

  // ── Computed Insights ────────────────────────────────────────────────────
  const workoutInputs: WorkoutExerciseInput[] = useMemo(() =>
    selectedExercises.map(e => ({
      name: e.name, sets: e.sets, reps: e.reps,
      restSeconds: e.restSeconds, weight: e.weight,
    })), [selectedExercises]);

  const balance: BalanceAnalysis | null = useMemo(() =>
    selectedExercises.length > 0 ? analyzeWorkoutBalance(workoutInputs) : null,
    [workoutInputs]);

  const calorieEst: CalorieEstimate | null = useMemo(() =>
    selectedExercises.length > 0 ? estimateCalories(workoutInputs, bodyWeight) : null,
    [workoutInputs, bodyWeight]);

  const bodyCompEst: BodyCompositionEstimate | null = useMemo(() =>
    selectedExercises.length > 0
      ? estimateBodyComposition(workoutInputs, 4, goal, level, bodyWeight)
      : null,
    [workoutInputs, goal, level, bodyWeight]);

  const coachInsights: WorkoutCoachInsight[] = useMemo(() =>
    selectedExercises.length > 0 ? getCoachingInsights(workoutInputs, goal, level) : [],
    [workoutInputs, goal, level]);

  // ── Save Workout ─────────────────────────────────────────────────────────
  const saveWorkout = async () => {
    if (selectedExercises.length === 0) {
      Alert.alert("No Exercises", "Add at least one exercise to your workout.");
      return;
    }
    setSaving(true);
    try {
      const name = workoutName.trim() || `Custom Workout`;
      const daySchedule = {
        day: name,
        focus: selectedExercises.map(e => {
          const info = getExerciseInfo(e.name);
          return info?.category ?? "general";
        }).filter((v, i, a) => a.indexOf(v) === i).join(" / "),
        isRest: false,
        exercises: selectedExercises.map(e => ({
          name: e.name,
          sets: e.sets,
          reps: String(e.reps),
          rest: `${e.restSeconds}s`,
          muscleGroup: getExerciseInfo(e.name)?.primaryMuscles[0] ?? "",
        })),
      };

      // Load existing plan
      const raw = await AsyncStorage.getItem("@guest_workout_plan");
      let plan = raw ? JSON.parse(raw) : { schedule: [] };

      // Add as a new day to the schedule
      if (!plan.schedule) plan.schedule = [];
      plan.schedule.push(daySchedule);

      await AsyncStorage.setItem("@guest_workout_plan", JSON.stringify(plan));

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "Workout Saved!",
        `"${name}" has been added to your workout plan with ${selectedExercises.length} exercises.`,
        [{ text: "View Plans", onPress: () => router.replace("/(tabs)/plans") },
         { text: "Create Another", onPress: () => { setSelectedExercises([]); setStep("select"); setWorkoutName(""); } }],
      );
    } catch (e) {
      Alert.alert("Error", "Failed to save workout. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render Helpers ─────────────────────────────────────────────────────
  const renderExerciseCard = useCallback(({ item }: { item: ExerciseInfo }) => {
    const selected = isSelected(item.name);
    const demo = getExerciseDemo(item.name);
    const suggestion = getRepSuggestion(item.name, goal, level);

    return (
      <TouchableOpacity
        onPress={() => toggleExercise(item)}
        style={{
          backgroundColor: selected ? "rgba(245,158,11,0.12)" : SF.surface,
          borderRadius: 14, padding: 12, marginBottom: 8,
          borderWidth: 1.5,
          borderColor: selected ? SF.gold2 : SF.border,
          flexDirection: "row", gap: 10, alignItems: "center",
        }}
      >
        {/* GIF Thumbnail */}
        {item.angleViews[0]?.gifUrl ? (
          <Image
            source={{ uri: item.angleViews[0].gifUrl }}
            style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.06)" }}
            cachePolicy="disk"
          />
        ) : (
          <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: SF.surfaceBright, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="fitness-center" size={20} color={SF.gold3} />
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{item.name}</Text>
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 1 }}>
            {item.primaryMuscles.map(m => m.replace(/_/g, " ")).join(", ")} · {item.equipment}
          </Text>
          <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 9, marginTop: 2 }}>
            AI suggests: {suggestion.suggestedSets} × {suggestion.suggestedReps} · Rest {suggestion.suggestedRest}
          </Text>
        </View>

        {/* Selection indicator */}
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: selected ? SF.gold2 : "transparent",
          borderWidth: selected ? 0 : 1.5, borderColor: SF.borderBright,
          alignItems: "center", justifyContent: "center",
        }}>
          {selected && <MaterialIcons name="check" size={16} color="#0A0E14" />}
        </View>
      </TouchableOpacity>
    );
  }, [isSelected, goal, level, toggleExercise]);

  const updateExercise = (index: number, field: keyof SelectedExercise, value: number) => {
    setSelectedExercises(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeExercise = (index: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedExercises(prev => prev.filter((_, i) => i !== index));
  };

  // ── Step: Select Exercises ─────────────────────────────────────────────
  if (step === "select") {
    return (
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
        <View style={{ flex: 1, backgroundColor: SF.bg }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <MaterialIcons name="arrow-back" size={22} color={SF.gold1} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 18 }}>Create Workout</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                {selectedExercises.length} exercises selected
              </Text>
            </View>
            {selectedExercises.length > 0 && (
              <TouchableOpacity
                onPress={() => setStep("configure")}
                style={{ backgroundColor: SF.gold2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 12 }}>Next</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Goal & Level Selector */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {GOALS.map(g => (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => setGoal(g.key)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 4,
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                    backgroundColor: goal === g.key ? "rgba(245,158,11,0.2)" : SF.surface,
                    borderWidth: 1, borderColor: goal === g.key ? SF.gold2 : SF.border,
                  }}
                >
                  <MaterialIcons name={g.icon as any} size={12} color={goal === g.key ? SF.gold1 : SF.muted} />
                  <Text style={{ color: goal === g.key ? SF.gold1 : SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <View style={{
              flexDirection: "row", alignItems: "center", backgroundColor: SF.surface,
              borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: SF.border,
            }}>
              <MaterialIcons name="search" size={18} color={SF.muted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor={SF.muted}
                style={{ flex: 1, color: SF.cream, fontFamily: "DMSans_400Regular", fontSize: 13, paddingVertical: 10, paddingLeft: 8 }}
                returnKeyType="done"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <MaterialIcons name="close" size={16} color={SF.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category Chips */}
          <View style={{ marginBottom: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
              {EXERCISE_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setActiveCategory(cat.key)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                    backgroundColor: activeCategory === cat.key ? "rgba(245,158,11,0.15)" : SF.surface,
                    borderWidth: 1, borderColor: activeCategory === cat.key ? SF.gold3 : SF.border,
                  }}
                >
                  <Text style={{
                    color: activeCategory === cat.key ? SF.gold1 : SF.muted,
                    fontFamily: "DMSans_600SemiBold", fontSize: 10,
                  }}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Exercise List */}
          <FlatList
            data={filteredExercises}
            keyExtractor={item => item.key}
            renderItem={renderExerciseCard}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />

          {/* Bottom Bar */}
          {selectedExercises.length > 0 && (
            <View style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              backgroundColor: "rgba(10,5,0,0.95)", borderTopWidth: 1, borderTopColor: SF.border,
              paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16),
              flexDirection: "row", alignItems: "center", gap: 12,
            }}>
              {/* Mini balance indicator */}
              {balance && (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: balance.rating === "excellent" ? SF.green : balance.rating === "good" ? SF.gold1 : SF.red, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
                    {balance.overallScore}
                  </Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 8 }}>Balance</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                  {selectedExercises.length} exercises
                </Text>
                {calorieEst && (
                  <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                    ~{calorieEst.totalCalories} kcal · {calorieEst.durationMinutes} min
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setStep("configure")}
                style={{ backgroundColor: SF.gold2, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
              >
                <Text style={{ color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 13 }}>Configure</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScreenContainer>
    );
  }

  // ── Step: Configure Exercises ──────────────────────────────────────────
  if (step === "configure") {
    return (
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
        <View style={{ flex: 1, backgroundColor: SF.bg }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
            <TouchableOpacity onPress={() => setStep("select")} style={{ padding: 4 }}>
              <MaterialIcons name="arrow-back" size={22} color={SF.gold1} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 18 }}>Configure Workout</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                Adjust sets, reps, and rest for each exercise
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setStep("insights")}
              style={{ backgroundColor: SF.gold2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 12 }}>Review</Text>
            </TouchableOpacity>
          </View>

          {/* Workout Name */}
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <TextInput
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="Workout name (e.g. Push Day, Leg Day)"
              placeholderTextColor={SF.muted}
              style={{
                backgroundColor: SF.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                color: SF.cream, fontFamily: "DMSans_400Regular", fontSize: 13,
                borderWidth: 1, borderColor: SF.border,
              }}
              returnKeyType="done"
            />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            {/* AI Coach Insights Banner */}
            {coachInsights.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowInsightsModal(true)}
                style={{
                  backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 14, padding: 12, marginBottom: 12,
                  borderWidth: 1, borderColor: SF.borderBright, flexDirection: "row", alignItems: "center", gap: 10,
                }}
              >
                <MaterialIcons name="auto-awesome" size={18} color={SF.gold1} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SF.gold1, fontFamily: "DMSans_700Bold", fontSize: 12 }}>AI Coach Insights</Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                    {coachInsights.length} suggestions · Tap to view
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={18} color={SF.gold3} />
              </TouchableOpacity>
            )}

            {/* Balance Score Card */}
            {balance && (
              <View style={{
                backgroundColor: SF.surface, borderRadius: 14, padding: 14, marginBottom: 12,
                borderWidth: 1, borderColor: SF.border,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Muscle Balance</Text>
                  <View style={{
                    backgroundColor: balance.rating === "excellent" ? "rgba(34,197,94,0.15)" : balance.rating === "good" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
                  }}>
                    <Text style={{
                      color: balance.rating === "excellent" ? SF.green : balance.rating === "good" ? SF.gold1 : SF.red,
                      fontFamily: "DMSans_600SemiBold", fontSize: 10,
                    }}>{balance.overallScore}/100 {balance.rating}</Text>
                  </View>
                </View>

                {/* Mini body heatmap */}
                <BodyHeatmap
                  gender="male"
                  mode="target"
                  targetPrimary={selectedExercises.flatMap(e => getExerciseInfo(e.name)?.primaryMuscles ?? [])}
                  targetSecondary={selectedExercises.flatMap(e => getExerciseInfo(e.name)?.secondaryMuscles ?? [])}
                  width={100}
                  height={110}
                  showLabels={false}
                  showLegend={false}
                />

                {/* Warnings */}
                {balance.warnings.map((w, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                    <MaterialIcons name="warning" size={12} color={SF.red} style={{ marginTop: 1 }} />
                    <Text style={{ color: SF.red, fontFamily: "DMSans_400Regular", fontSize: 10, flex: 1 }}>{w}</Text>
                  </View>
                ))}
                {balance.suggestions.map((s, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    <MaterialIcons name="lightbulb" size={12} color={SF.gold3} style={{ marginTop: 1 }} />
                    <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 10, flex: 1 }}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Exercise Configuration Cards */}
            {selectedExercises.map((ex, idx) => {
              const info = getExerciseInfo(ex.name);
              const suggestion = getRepSuggestion(ex.name, goal, level);

              return (
                <View key={ex.name} style={{
                  backgroundColor: SF.surface, borderRadius: 14, padding: 14, marginBottom: 8,
                  borderWidth: 1, borderColor: SF.border,
                }}>
                  {/* Exercise Header */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{ex.name}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                        {info?.primaryMuscles.map(m => m.replace(/_/g, " ")).join(", ")}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeExercise(idx)} style={{ padding: 4 }}>
                      <MaterialIcons name="close" size={18} color={SF.red} />
                    </TouchableOpacity>
                  </View>

                  {/* AI Suggestion */}
                  <View style={{
                    backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 8, padding: 8, marginBottom: 10,
                    flexDirection: "row", gap: 6, alignItems: "flex-start",
                  }}>
                    <MaterialIcons name="auto-awesome" size={11} color={SF.gold3} style={{ marginTop: 1 }} />
                    <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 9, flex: 1 }}>
                      {suggestion.reasoning}
                    </Text>
                  </View>

                  {/* Controls */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {/* Sets */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 9, marginBottom: 4 }}>SETS</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <TouchableOpacity
                          onPress={() => updateExercise(idx, "sets", Math.max(1, ex.sets - 1))}
                          style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: SF.surfaceBright, alignItems: "center", justifyContent: "center" }}
                        >
                          <MaterialIcons name="remove" size={14} color={SF.gold1} />
                        </TouchableOpacity>
                        <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 16, minWidth: 20, textAlign: "center" }}>{ex.sets}</Text>
                        <TouchableOpacity
                          onPress={() => updateExercise(idx, "sets", Math.min(8, ex.sets + 1))}
                          style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: SF.surfaceBright, alignItems: "center", justifyContent: "center" }}
                        >
                          <MaterialIcons name="add" size={14} color={SF.gold1} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Reps */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 9, marginBottom: 4 }}>REPS</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <TouchableOpacity
                          onPress={() => updateExercise(idx, "reps", Math.max(1, ex.reps - 1))}
                          style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: SF.surfaceBright, alignItems: "center", justifyContent: "center" }}
                        >
                          <MaterialIcons name="remove" size={14} color={SF.gold1} />
                        </TouchableOpacity>
                        <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 16, minWidth: 20, textAlign: "center" }}>{ex.reps}</Text>
                        <TouchableOpacity
                          onPress={() => updateExercise(idx, "reps", Math.min(50, ex.reps + 1))}
                          style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: SF.surfaceBright, alignItems: "center", justifyContent: "center" }}
                        >
                          <MaterialIcons name="add" size={14} color={SF.gold1} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Rest */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 9, marginBottom: 4 }}>REST</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <TouchableOpacity
                          onPress={() => updateExercise(idx, "restSeconds", Math.max(15, ex.restSeconds - 15))}
                          style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: SF.surfaceBright, alignItems: "center", justifyContent: "center" }}
                        >
                          <MaterialIcons name="remove" size={14} color={SF.gold1} />
                        </TouchableOpacity>
                        <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 14, minWidth: 28, textAlign: "center" }}>{ex.restSeconds}s</Text>
                        <TouchableOpacity
                          onPress={() => updateExercise(idx, "restSeconds", Math.min(300, ex.restSeconds + 15))}
                          style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: SF.surfaceBright, alignItems: "center", justifyContent: "center" }}
                        >
                          <MaterialIcons name="add" size={14} color={SF.gold1} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Add More Button */}
            <TouchableOpacity
              onPress={() => setStep("select")}
              style={{
                backgroundColor: SF.surface, borderRadius: 12, paddingVertical: 12, alignItems: "center",
                borderWidth: 1, borderColor: SF.borderBright, borderStyle: "dashed", marginTop: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons name="add" size={16} color={SF.gold3} />
                <Text style={{ color: SF.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Add More Exercises</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Bottom Bar */}
          <View style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            backgroundColor: "rgba(10,5,0,0.95)", borderTopWidth: 1, borderTopColor: SF.border,
            paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16),
          }}>
            <TouchableOpacity
              onPress={() => setStep("insights")}
              style={{ backgroundColor: SF.gold2, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons name="auto-awesome" size={16} color="#0A0E14" />
                <Text style={{ color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 14 }}>Review AI Insights</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* AI Insights Modal */}
          <Modal visible={showInsightsModal} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
              <View style={{
                backgroundColor: SF.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                maxHeight: "80%", paddingTop: 16, paddingBottom: Math.max(insets.bottom, 20),
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 }}>
                  <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 16, flex: 1 }}>AI Coach Insights</Text>
                  <TouchableOpacity onPress={() => setShowInsightsModal(false)}>
                    <MaterialIcons name="close" size={22} color={SF.muted} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                  {coachInsights.map((insight, i) => (
                    <View key={i} style={{
                      backgroundColor: insight.type === "warning" ? "rgba(239,68,68,0.08)" : insight.type === "praise" ? "rgba(34,197,94,0.08)" : SF.surface,
                      borderRadius: 12, padding: 12, marginBottom: 8,
                      borderWidth: 1, borderColor: insight.type === "warning" ? "rgba(239,68,68,0.15)" : insight.type === "praise" ? "rgba(34,197,94,0.15)" : SF.border,
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <MaterialIcons
                          name={insight.icon as any}
                          size={14}
                          color={insight.type === "warning" ? SF.red : insight.type === "praise" ? SF.green : SF.gold1}
                        />
                        <Text style={{
                          color: insight.type === "warning" ? SF.red : insight.type === "praise" ? SF.green : SF.gold1,
                          fontFamily: "DMSans_700Bold", fontSize: 12,
                        }}>{insight.title}</Text>
                      </View>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 16 }}>
                        {insight.message}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </ScreenContainer>
    );
  }

  // ── Step: Insights & Save ──────────────────────────────────────────────
  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
          <TouchableOpacity onPress={() => setStep("configure")} style={{ padding: 4 }}>
            <MaterialIcons name="arrow-back" size={22} color={SF.gold1} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 18 }}>AI Analysis</Text>
            <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>
              {workoutName || "Custom Workout"} · {selectedExercises.length} exercises
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Calorie Estimate Card */}
          {calorieEst && (
            <View style={{
              backgroundColor: SF.surface, borderRadius: 16, padding: 16, marginBottom: 12,
              borderWidth: 1.5, borderColor: SF.borderBright,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <MaterialIcons name="local-fire-department" size={16} color={SF.gold1} />
                <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Calorie Estimate</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: SF.gold1, fontFamily: "DMSans_700Bold", fontSize: 24 }}>{calorieEst.totalCalories}</Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>kcal burned</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: SF.gold3, fontFamily: "DMSans_700Bold", fontSize: 24 }}>{calorieEst.durationMinutes}</Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>minutes</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: "#F97316", fontFamily: "DMSans_700Bold", fontSize: 24 }}>+{calorieEst.afterburnCalories}</Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>afterburn</Text>
                </View>
              </View>

              {/* Per-exercise breakdown */}
              {calorieEst.perExercise.map((e, i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                  <Text style={{ color: SF.cream, fontFamily: "DMSans_400Regular", fontSize: 10 }}>{e.name}</Text>
                  <Text style={{ color: SF.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>{e.calories} kcal</Text>
                </View>
              ))}
            </View>
          )}

          {/* Body Composition Projections */}
          {bodyCompEst && (
            <View style={{
              backgroundColor: SF.surface, borderRadius: 16, padding: 16, marginBottom: 12,
              borderWidth: 1.5, borderColor: SF.borderBright,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <MaterialIcons name="trending-up" size={16} color={SF.green} />
                <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Projected Results</Text>
                <View style={{
                  backgroundColor: bodyCompEst.confidence === "high" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                  paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: "auto",
                }}>
                  <Text style={{
                    color: bodyCompEst.confidence === "high" ? SF.green : SF.gold3,
                    fontFamily: "DMSans_600SemiBold", fontSize: 8,
                  }}>{bodyCompEst.confidence.toUpperCase()} CONFIDENCE</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
                {bodyCompEst.estimatedMonthlyMuscleGainKg > 0 && (
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: SF.green, fontFamily: "DMSans_700Bold", fontSize: 20 }}>
                      +{bodyCompEst.estimatedMonthlyMuscleGainKg}
                    </Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>kg muscle/month</Text>
                  </View>
                )}
                {bodyCompEst.estimatedMonthlyFatLossKg > 0 && (
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: SF.blue, fontFamily: "DMSans_700Bold", fontSize: 20 }}>
                      -{bodyCompEst.estimatedMonthlyFatLossKg}
                    </Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>kg fat/month</Text>
                  </View>
                )}
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: SF.gold1, fontFamily: "DMSans_700Bold", fontSize: 20 }}>
                    {bodyCompEst.weeklyMuscleStimulusScore}
                  </Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>stimulus score</Text>
                </View>
              </View>

              {/* Timeline */}
              <View style={{
                backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, padding: 10, marginBottom: 8,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <MaterialIcons name="calendar-today" size={12} color={SF.gold3} />
                  <Text style={{ color: SF.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>
                    Estimated timeline: ~{bodyCompEst.daysToGoal} days to visible results
                  </Text>
                </View>
              </View>

              {/* Notes */}
              {bodyCompEst.notes.map((note, i) => (
                <Text key={i} style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9, lineHeight: 13, marginTop: 3 }}>
                  • {note}
                </Text>
              ))}
            </View>
          )}

          {/* Muscle Balance Heatmap */}
          {balance && (
            <View style={{
              backgroundColor: SF.surface, borderRadius: 16, padding: 16, marginBottom: 12,
              borderWidth: 1.5, borderColor: SF.borderBright,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <MaterialIcons name="accessibility-new" size={16} color={SF.gold1} />
                <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Muscle Coverage</Text>
              </View>

              <BodyHeatmap
                gender="male"
                mode="target"
                targetPrimary={selectedExercises.flatMap(e => getExerciseInfo(e.name)?.primaryMuscles ?? [])}
                targetSecondary={selectedExercises.flatMap(e => getExerciseInfo(e.name)?.secondaryMuscles ?? [])}
                width={140}
                height={160}
                showLabels={true}
                showLegend={true}
              />
            </View>
          )}

          {/* Workout Summary */}
          <View style={{
            backgroundColor: SF.surface, borderRadius: 16, padding: 16, marginBottom: 12,
            borderWidth: 1.5, borderColor: SF.borderBright,
          }}>
            <Text style={{ color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 10 }}>Workout Summary</Text>
            {selectedExercises.map((ex, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: i < selectedExercises.length - 1 ? 1 : 0, borderBottomColor: SF.border }}>
                <Text style={{ color: SF.cream, fontFamily: "DMSans_500Medium", fontSize: 11, flex: 1 }}>{ex.name}</Text>
                <Text style={{ color: SF.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>
                  {ex.sets} × {ex.reps} · {ex.restSeconds}s rest
                </Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: SF.borderBright }}>
              <Text style={{ color: SF.gold1, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Total</Text>
              <Text style={{ color: SF.gold1, fontFamily: "DMSans_700Bold", fontSize: 12 }}>
                {selectedExercises.reduce((s, e) => s + e.sets, 0)} sets · {calorieEst?.durationMinutes ?? "?"} min
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          backgroundColor: "rgba(10,5,0,0.95)", borderTopWidth: 1, borderTopColor: SF.border,
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16),
        }}>
          <TouchableOpacity
            onPress={saveWorkout}
            disabled={saving}
            style={{
              backgroundColor: SF.gold2, borderRadius: 12, paddingVertical: 14, alignItems: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator size="small" color="#0A0E14" />
                <Text style={{ color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 14 }}>Saving...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons name="save" size={18} color="#0A0E14" />
                <Text style={{ color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 14 }}>Save to My Plan</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
