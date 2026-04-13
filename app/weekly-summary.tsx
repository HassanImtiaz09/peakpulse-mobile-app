import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Platform, Alert, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Circle } from "react-native-svg";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useExerciseCompletion } from "@/lib/exercise-completion-context";
import { useCalories } from "@/lib/calorie-context";
import * as Haptics from "expo-haptics";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { UI } from "@/constants/ui-colors";

const BG = UI.bg;
const SURFACE = UI.surface;
const FG = UI.fg;
const MUTED = "#64748B";
const GOLD = UI.gold;
const GOLD2 = UI.gold2;
const GOLD3 = UI.gold3;
const GOLD_DIM = UI.dim;
const GOLD_BORDER = UI.borderGold2;
const MINT = UI.emerald;
const ICE = UI.ice;
const ROSE = UI.rose;

function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function ProgressRing({ progress, size, strokeWidth, color, label, value }: { progress: number; size: number; strokeWidth: number; color: string; label: string; value: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: FG, fontFamily: "SpaceMono_700Bold", fontSize: size * 0.22 }}>{value}</Text>
      </View>
      <Text style={{ color: MUTED, fontFamily: "DMSans_500Medium", fontSize: 11, marginTop: 6 }}>{label}</Text>
    </View>
  );
}

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const exerciseCompletion = useExerciseCompletion();
  const { calorieGoal } = useCalories();
  const weekDates = getWeekDates();

  const [weekData, setWeekData] = useState({
    workoutsCompleted: 0,
    workoutsPlanned: 5,
    totalExercisesDone: 0,
    totalExercisesPlanned: 0,
    avgCalories: 0,
    calorieTarget: calorieGoal ?? 2200,
    calorieAdherence: 0,
    bodyFatStart: 0,
    bodyFatCurrent: 0,
    bodyFatTarget: 0,
    progressPhotos: 0,
    streak: 0,
    weekLabel: "",
  });

  useEffect(() => {
    (async () => {
      // Week label
      const start = new Date(weekDates[0]);
      const end = new Date(weekDates[6]);
      const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const weekLabel = `${fmt(start)} - ${fmt(end)}`;

      // Workout completion from exercise completion context
      let totalDone = 0;
      let totalPlanned = 0;
      let workoutsCompleted = 0;

      // Load workout plan to get planned exercises
      const wpRaw = await AsyncStorage.getItem("@workout_plan");
      const wp = wpRaw ? JSON.parse(wpRaw) : null;
      const schedule = wp?.schedule ?? [];
      const workoutsPlanned = schedule.filter((d: any) => !d.isRest).length;

      for (const date of weekDates) {
        const dayData = exerciseCompletion.completions[date];
        if (dayData) {
          const doneCount = Object.values(dayData).filter(Boolean).length;
          totalDone += doneCount;
          if (doneCount > 0) workoutsCompleted++;
        }
      }
      for (const day of schedule) {
        totalPlanned += day.exercises?.length ?? 0;
      }

      // Calorie data from meal logs
      const mlRaw = await AsyncStorage.getItem("@meal_logs");
      const mealLogs: any[] = mlRaw ? JSON.parse(mlRaw) : [];
      let totalCalories = 0;
      let daysWithMeals = 0;
      for (const date of weekDates) {
        const dayMeals = mealLogs.filter((m: any) => m.date?.startsWith(date));
        if (dayMeals.length > 0) {
          totalCalories += dayMeals.reduce((s: number, m: any) => s + (m.calories ?? 0), 0);
          daysWithMeals++;
        }
      }
      const avgCalories = daysWithMeals > 0 ? Math.round(totalCalories / daysWithMeals) : 0;
      const target = calorieGoal ?? 2200;
      const calorieAdherence = avgCalories > 0 ? Math.min(Math.round((1 - Math.abs(avgCalories - target) / target) * 100), 100) : 0;

      // Body composition from scan history
      const scanRaw = await AsyncStorage.getItem("@scan_history");
      const scans: any[] = scanRaw ? JSON.parse(scanRaw) : [];
      const targetRaw = await AsyncStorage.getItem("@target_transformation");
      const targetData = targetRaw ? JSON.parse(targetRaw) : null;
      const bodyFatStart = scans.length > 0 ? scans[0].estimated_bf : 0;
      const bodyFatCurrent = scans.length > 0 ? scans[scans.length - 1].estimated_bf : 0;
      const bodyFatTarget = targetData?.target_bf ?? 0;

      // Progress photos
      const ppRaw = await AsyncStorage.getItem("@progress_photos");
      const photos: any[] = ppRaw ? JSON.parse(ppRaw) : [];
      const weekPhotos = photos.filter((p: any) => weekDates.some((d) => p.date?.startsWith(d)));

      // Streak
      let streak = 0;
      const sortedDates = [...photos.map((p: any) => p.date?.split("T")[0])].filter(Boolean).sort().reverse();
      const uniqueDates = [...new Set(sortedDates)];
      const today = new Date().toISOString().split("T")[0];
      let checkDate = today;
      for (const d of uniqueDates) {
        if (d === checkDate) {
          streak++;
          const prev = new Date(checkDate);
          prev.setDate(prev.getDate() - 1);
          checkDate = prev.toISOString().split("T")[0];
        } else break;
      }

      setWeekData({
        workoutsCompleted,
        workoutsPlanned,
        totalExercisesDone: totalDone,
        totalExercisesPlanned: totalPlanned,
        avgCalories,
        calorieTarget: target,
        calorieAdherence,
        bodyFatStart,
        bodyFatCurrent,
        bodyFatTarget,
        progressPhotos: weekPhotos.length,
        streak,
        weekLabel,
      });
    })();
  }, [exerciseCompletion.completions, calorieGoal]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const msg = `\u{1F4CA} FytNova Weekly Summary\n${weekData.weekLabel}\n\n\u{1F4AA} Workouts: ${weekData.workoutsCompleted}/${weekData.workoutsPlanned}\n\u{1F525} Exercises: ${weekData.totalExercisesDone} completed\n\u{1F34E} Avg Calories: ${weekData.avgCalories} kcal\n\u{1F3AF} Calorie Adherence: ${weekData.calorieAdherence}%\n${weekData.bodyFatCurrent > 0 ? `\u{1F4F8} Body Fat: ${weekData.bodyFatCurrent}%\n` : ""}\u{1F4F7} Progress Photos: ${weekData.progressPhotos}\n\u{1F525} Streak: ${weekData.streak} days\n\n#FytNova #FitnessJourney`;
    try {
      await Share.share({ message: msg });
    } catch {}
  }, [weekData]);

  const workoutPct = weekData.workoutsPlanned > 0 ? weekData.workoutsCompleted / weekData.workoutsPlanned : 0;
  const calPct = weekData.calorieAdherence / 100;
  const bfProgress = weekData.bodyFatStart > 0 && weekData.bodyFatTarget > 0
    ? Math.min((weekData.bodyFatStart - weekData.bodyFatCurrent) / (weekData.bodyFatStart - weekData.bodyFatTarget), 1)
    : 0;

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ImageBackground
        source={{ uri: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/golden-checkin-bg-FybvquGurRSx5VEd9qe2iB.webp" }}
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.12 }}
      >
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={FG} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>WEEKLY SUMMARY</Text>
            <Text style={s.headerSub}>{weekData.weekLabel}</Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
            <MaterialIcons name="share" size={20} color={GOLD} />
            <Text style={s.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Overview Rings */}
        <View style={s.ringsCard}>
          <Text style={s.sectionLabel}>PERFORMANCE OVERVIEW</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 16 }}>
            <ProgressRing progress={workoutPct} size={80} strokeWidth={6} color={GOLD} label="Workouts" value={`${weekData.workoutsCompleted}/${weekData.workoutsPlanned}`} />
            <ProgressRing progress={calPct} size={80} strokeWidth={6} color={MINT} label="Calories" value={`${weekData.calorieAdherence}%`} />
            {weekData.bodyFatCurrent > 0 && (
              <ProgressRing progress={bfProgress} size={80} strokeWidth={6} color={ICE} label="Body Fat" value={`${weekData.bodyFatCurrent}%`} />
            )}
          </View>
        </View>

        {/* Workout Details */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={s.iconBox}><MaterialIcons name="fitness-center" size={18} color={GOLD} /></View>
            <Text style={s.cardTitle}>Workout Completion</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={s.statLabel}>Sessions completed</Text>
            <Text style={s.statValue}>{weekData.workoutsCompleted} / {weekData.workoutsPlanned}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${workoutPct * 100}%` as any, backgroundColor: GOLD }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <Text style={s.statLabel}>Exercises done</Text>
            <Text style={s.statValue}>{weekData.totalExercisesDone}</Text>
          </View>
          {/* Day-by-day dots */}
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 16 }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
              const date = weekDates[i];
              const dayData = exerciseCompletion.completions[date];
              const hasDone = dayData && Object.values(dayData).some(Boolean);
              return (
                <View key={i} style={{ alignItems: "center", gap: 4 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: hasDone ? GOLD : "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
                    {hasDone && <MaterialIcons name="check" size={14} color={BG} />}
                  </View>
                  <Text style={{ color: MUTED, fontSize: 10, fontFamily: "DMSans_500Medium" }}>{d}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Calorie Adherence */}
        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={[s.iconBox, { backgroundColor: "rgba(16,185,129,0.1)" }]}><MaterialIcons name="restaurant" size={18} color={MINT} /></View>
            <Text style={s.cardTitle}>Calorie Adherence</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={s.statLabel}>Avg daily intake</Text>
            <Text style={s.statValue}>{weekData.avgCalories > 0 ? `${weekData.avgCalories} kcal` : "No data"}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={s.statLabel}>Daily target</Text>
            <Text style={s.statValue}>{weekData.calorieTarget} kcal</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${calPct * 100}%` as any, backgroundColor: MINT }]} />
          </View>
          <Text style={{ color: calPct >= 0.8 ? MINT : GOLD, fontFamily: "DMSans_600SemiBold", fontSize: 12, marginTop: 8 }}>
            {calPct >= 0.9 ? "Excellent adherence!" : calPct >= 0.7 ? "Good adherence" : calPct > 0 ? "Needs improvement" : "Start logging meals to track"}
          </Text>
        </View>

        {/* Body Composition */}
        {weekData.bodyFatCurrent > 0 && (
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <View style={[s.iconBox, { backgroundColor: "rgba(34,211,238,0.1)" }]}><MaterialIcons name="analytics" size={18} color={ICE} /></View>
              <Text style={s.cardTitle}>Body Composition</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: MUTED, fontSize: 10, fontFamily: "DMSans_500Medium" }}>START</Text>
                <Text style={{ color: FG, fontFamily: "SpaceMono_700Bold", fontSize: 22, marginTop: 4 }}>{weekData.bodyFatStart}%</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <MaterialIcons name="arrow-forward" size={20} color={MUTED} style={{ marginTop: 14 }} />
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: MUTED, fontSize: 10, fontFamily: "DMSans_500Medium" }}>CURRENT</Text>
                <Text style={{ color: ICE, fontFamily: "SpaceMono_700Bold", fontSize: 22, marginTop: 4 }}>{weekData.bodyFatCurrent}%</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <MaterialIcons name="arrow-forward" size={20} color={MUTED} style={{ marginTop: 14 }} />
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: MUTED, fontSize: 10, fontFamily: "DMSans_500Medium" }}>TARGET</Text>
                <Text style={{ color: GOLD, fontFamily: "SpaceMono_700Bold", fontSize: 22, marginTop: 4 }}>{weekData.bodyFatTarget}%</Text>
              </View>
            </View>
            <View style={[s.progressTrack, { marginTop: 16 }]}>
              <View style={[s.progressFill, { width: `${bfProgress * 100}%` as any, backgroundColor: ICE }]} />
            </View>
            <Text style={{ color: MUTED, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 6, textAlign: "center" }}>
              {weekData.bodyFatStart - weekData.bodyFatCurrent > 0
                ? `${(weekData.bodyFatStart - weekData.bodyFatCurrent).toFixed(1)}% lost so far`
                : "Keep going!"}
            </Text>
          </View>
        )}

        {/* Streak & Photos */}
        <View style={{ flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 12 }}>
          <View style={[s.miniCard, { flex: 1 }]}>
            <MaterialIcons name="local-fire-department" size={28} color={GOLD} />
            <Text style={{ color: FG, fontFamily: "SpaceMono_700Bold", fontSize: 28, marginTop: 4 }}>{weekData.streak}</Text>
            <Text style={{ color: MUTED, fontFamily: "DMSans_500Medium", fontSize: 11 }}>Day Streak</Text>
          </View>
          <View style={[s.miniCard, { flex: 1 }]}>
            <MaterialIcons name="photo-camera" size={28} color={ROSE} />
            <Text style={{ color: FG, fontFamily: "SpaceMono_700Bold", fontSize: 28, marginTop: 4 }}>{weekData.progressPhotos}</Text>
            <Text style={{ color: MUTED, fontFamily: "DMSans_500Medium", fontSize: 11 }}>Photos This Week</Text>
          </View>
        </View>

        {/* Share CTA */}
        <View style={{ marginHorizontal: 16, marginTop: 24 }}>
          <TouchableOpacity style={s.shareCard} onPress={handleShare}>
            <MaterialIcons name="share" size={24} color={BG} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Share Your Progress</Text>
              <Text style={{ color: "rgba(10,14,20,0.6)", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Inspire others with your weekly results</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={BG} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      </ImageBackground>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: UI.border },
  headerTitle: { color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 22, letterSpacing: 2 },
  headerSub: { color: MUTED, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GOLD_DIM, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: GOLD_BORDER },
  shareBtnText: { color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 13 },
  ringsCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: "rgba(20,26,34,0.82)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: GOLD_BORDER },
  sectionLabel: { color: MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5 },
  card: { marginHorizontal: 16, marginTop: 12, backgroundColor: "rgba(20,26,34,0.82)", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: UI.borderGold },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: FG, fontFamily: "DMSans_700Bold", fontSize: 16 },
  statLabel: { color: MUTED, fontFamily: "DMSans_400Regular", fontSize: 13 },
  statValue: { color: FG, fontFamily: "DMSans_700Bold", fontSize: 13 },
  progressTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  miniCard: { backgroundColor: "rgba(20,26,34,0.82)", borderRadius: 18, padding: 18, alignItems: "center", borderWidth: 1, borderColor: UI.borderGold },
  shareCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: GOLD, borderRadius: 18, padding: 18 },
});
