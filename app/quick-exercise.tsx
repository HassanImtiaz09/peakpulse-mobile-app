/**
 * Quick Exercise Screen
 * "Just One Exercise" — picks a single exercise based on muscle recovery and energy level.
 * Minimal, focused UI for low-motivation days.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  selectQuickExercise,
  parseWorkoutHistory,
  getMotivationalMessage,
  type QuickPickExercise,
} from "@/lib/quick-pick-exercise";
import { getAllExercises } from "@/lib/exercise-data";

const STORAGE_KEY_LOGS = "@workout_logs";

type EnergyLevel = "low" | "normal" | "high";

const ENERGY_OPTIONS: { level: EnergyLevel; icon: string; label: string; color: string }[] = [
  { level: "low", icon: "battery-2-bar", label: "Low Energy", color: "#F59E0B" },
  { level: "normal", icon: "battery-4-bar", label: "Normal", color: "#22C55E" },
  { level: "high", icon: "battery-full", label: "Fired Up", color: "#3B82F6" },
];

export default function QuickExerciseScreen() {
  const router = useRouter();
  const colors = useColors();
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [exercise, setExercise] = useState<QuickPickExercise | null>(null);
  const [motivation, setMotivation] = useState("");
  const [loading, setLoading] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [excludeList, setExcludeList] = useState<string[]>([]);

  const pickExercise = useCallback(async (energy: EnergyLevel, exclude: string[]) => {
    setLoading(true);
    try {
      const allExercises = getAllExercises();
      const logsRaw = await AsyncStorage.getItem(STORAGE_KEY_LOGS);
      const logs = logsRaw ? JSON.parse(logsRaw) : [];
      const history = parseWorkoutHistory(logs);

      const result = selectQuickExercise(allExercises, history, {
        energyLevel: energy,
        excludeExercises: exclude,
      });

      setExercise(result);
      setMotivation(getMotivationalMessage(energy));
    } catch {
      setExercise(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEnergySelect = (level: EnergyLevel) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnergyLevel(level);
    setExcludeList([]);
    setShuffleCount(0);
    pickExercise(level, []);
  };

  const handleShuffle = () => {
    if (!energyLevel || !exercise) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExclude = [...excludeList, exercise.name];
    setExcludeList(newExclude);
    setShuffleCount((c) => c + 1);
    pickExercise(energyLevel, newExclude);
  };

  const handleStartWorkout = () => {
    if (!exercise || !energyLevel) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dayData = {
      day: "Quick",
      focus: exercise.name,
      exercises: [
        {
          name: exercise.name,
          sets: exercise.suggestedSets,
          reps: `${exercise.suggestedReps}`,
          notes: exercise.cue || "Focus on form and controlled movement.",
        },
      ],
    };
    router.push({
      pathname: "/active-workout" as any,
      params: {
        dayData: JSON.stringify(dayData),
        energyLevel,
      },
    });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Just One Exercise</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {energyLevel ? "We picked the perfect one for you" : "How are you feeling?"}
            </Text>
          </View>
        </View>

        {/* Energy Selection */}
        {!energyLevel && (
          <View style={styles.energySection}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>
              Select your energy level
            </Text>
            {ENERGY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.level}
                onPress={() => handleEnergySelect(opt.level)}
                activeOpacity={0.85}
                style={[styles.energyCard, { backgroundColor: `${opt.color}10`, borderColor: `${opt.color}30` }]}
              >
                <View style={[styles.energyIcon, { backgroundColor: `${opt.color}20` }]}>
                  <MaterialIcons name={opt.icon as any} size={28} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.energyLabel, { color: colors.foreground }]}>{opt.label}</Text>
                  <Text style={[styles.energyDesc, { color: colors.muted }]}>
                    {opt.level === "low" && "Fewer sets, easier movement"}
                    {opt.level === "normal" && "Standard sets and reps"}
                    {opt.level === "high" && "Extra sets, push harder"}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Loading */}
        {energyLevel && loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Finding the perfect exercise...</Text>
          </View>
        )}

        {/* Exercise Result */}
        {energyLevel && !loading && exercise && (
          <View style={styles.resultSection}>
            <Text style={[styles.motivationText, { color: "#F59E0B" }]}>{motivation}</Text>

            <View style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.exerciseHeader}>
                <View style={[styles.exerciseBadge, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
                  <MaterialIcons name="flash-on" size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exerciseName, { color: colors.foreground }]}>{exercise.name}</Text>
                  <Text style={[styles.exerciseMeta, { color: colors.muted }]}>
                    {exercise.equipment.replace(/_/g, " ")} · {exercise.difficulty}
                  </Text>
                </View>
              </View>

              <View style={styles.muscleRow}>
                <Text style={[styles.muscleLabel, { color: colors.muted }]}>Primary:</Text>
                <View style={styles.muscleChips}>
                  {exercise.primaryMuscles.map((m) => (
                    <View key={m} style={[styles.chip, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                      <Text style={[styles.chipText, { color: "#F59E0B" }]}>{m.replace(/_/g, " ")}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {exercise.secondaryMuscles.length > 0 && (
                <View style={styles.muscleRow}>
                  <Text style={[styles.muscleLabel, { color: colors.muted }]}>Secondary:</Text>
                  <View style={styles.muscleChips}>
                    {exercise.secondaryMuscles.map((m) => (
                      <View key={m} style={[styles.chip, { backgroundColor: `${colors.border}80` }]}>
                        <Text style={[styles.chipText, { color: colors.muted }]}>{m.replace(/_/g, " ")}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={[styles.setsRow, { borderTopColor: colors.border }]}>
                <View style={styles.setItem}>
                  <Text style={[styles.setNumber, { color: colors.foreground }]}>{exercise.suggestedSets}</Text>
                  <Text style={[styles.setLabel, { color: colors.muted }]}>Sets</Text>
                </View>
                <View style={[styles.setDivider, { backgroundColor: colors.border }]} />
                <View style={styles.setItem}>
                  <Text style={[styles.setNumber, { color: colors.foreground }]}>{exercise.suggestedReps}</Text>
                  <Text style={[styles.setLabel, { color: colors.muted }]}>Reps</Text>
                </View>
              </View>

              <View style={[styles.reasonBox, { backgroundColor: colors.background }]}>
                <MaterialIcons name="lightbulb-outline" size={16} color="#F59E0B" />
                <Text style={[styles.reasonText, { color: colors.muted }]}>{exercise.reason}</Text>
              </View>

              {exercise.cue ? (
                <View style={[styles.cueBox, { borderLeftColor: "#F59E0B" }]}>
                  <Text style={[styles.cueText, { color: colors.foreground }]}>{exercise.cue}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={handleShuffle}
                activeOpacity={0.85}
                style={[styles.shuffleButton, { borderColor: colors.border }]}
              >
                <MaterialIcons name="shuffle" size={20} color={colors.foreground} />
                <Text style={[styles.shuffleText, { color: colors.foreground }]}>
                  Pick Another{shuffleCount > 0 ? ` (${shuffleCount})` : ""}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleStartWorkout} activeOpacity={0.85} style={styles.startButton}>
              <MaterialIcons name="play-arrow" size={22} color="#000" />
              <Text style={styles.startText}>Start Exercise</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setEnergyLevel(null); setExercise(null); setExcludeList([]); setShuffleCount(0); }}
              style={styles.changeEnergy}
            >
              <Text style={[styles.changeEnergyText, { color: colors.muted }]}>Change energy level</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No exercise found */}
        {energyLevel && !loading && !exercise && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="fitness-center" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No exercises available. Try changing your energy level.
            </Text>
            <TouchableOpacity
              onPress={() => { setEnergyLevel(null); setExcludeList([]); setShuffleCount(0); }}
              style={[styles.retryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.retryText, { color: colors.foreground }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 2 },
  energySection: { paddingHorizontal: 20, gap: 12, marginTop: 20 },
  sectionLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  energyCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  energyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  energyLabel: { fontSize: 16, fontWeight: "600" },
  energyDesc: { fontSize: 13, marginTop: 2 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16 },
  loadingText: { fontSize: 15 },
  resultSection: { paddingHorizontal: 20, marginTop: 12, gap: 16 },
  motivationText: { fontSize: 15, fontStyle: "italic", textAlign: "center", paddingHorizontal: 10 },
  exerciseCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  exerciseHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  exerciseBadge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  exerciseName: { fontSize: 20, fontWeight: "700" },
  exerciseMeta: { fontSize: 13, marginTop: 2, textTransform: "capitalize" },
  muscleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  muscleLabel: { fontSize: 12, fontWeight: "600", width: 70 },
  muscleChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  setsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderTopWidth: 1, paddingTop: 16, gap: 32 },
  setItem: { alignItems: "center" },
  setNumber: { fontSize: 28, fontWeight: "700" },
  setLabel: { fontSize: 12, marginTop: 2 },
  setDivider: { width: 1, height: 32 },
  reasonBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12 },
  reasonText: { fontSize: 13, flex: 1, lineHeight: 18 },
  cueBox: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  cueText: { fontSize: 14, fontWeight: "500", fontStyle: "italic" },
  actionRow: { flexDirection: "row", gap: 12 },
  shuffleButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  shuffleText: { fontSize: 15, fontWeight: "600" },
  startButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, backgroundColor: "#F59E0B" },
  startText: { fontSize: 16, fontWeight: "700", color: "#000" },
  changeEnergy: { alignItems: "center", paddingVertical: 8 },
  changeEnergyText: { fontSize: 14, textDecorationLine: "underline" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, textAlign: "center" },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  retryText: { fontSize: 15, fontWeight: "600" },
});
