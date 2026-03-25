/**
 * Onboarding Summary Screen
 * Shown after plan generation completes. Gives the user a visual overview of:
 *  - Their AI-generated workout schedule
 *  - Their meal plan daily targets + first day meals
 *  - Before (initial scan) vs After (target transformation) photo comparison
 * Then navigates to the subscription plan selection screen.
 */
import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Dimensions, ActivityIndicator, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";

import { GOLDEN_PRIMARY, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
const { width: W } = Dimensions.get("window");

const SF = {
  bg:      "#0A0E14",
  surface: "#141A22",
  border:  "rgba(245,158,11,0.18)",
  fg:      "#F1F5F9",
  muted: "#B45309",
  gold:    "#F59E0B",
  gold2:   "#FBBF24",
  gold3:   "#FDE68A",
  orange:  "#EA580C",
  teal:    "#14B8A6",
  emerald: "#10B981",
};

export default function OnboardingSummaryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<any>(null);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [scanPhoto, setScanPhoto] = useState<string | null>(null);
  const [targetTransformation, setTargetTransformation] = useState<any | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("@cached_workout_plan"),
      AsyncStorage.getItem("@cached_meal_plan"),
      AsyncStorage.getItem("@onboarding_scan_photo"),
      AsyncStorage.getItem("@target_transformation"),
      AsyncStorage.getItem("@user_tdee"),
    ]).then(([wp, mp, sp, tt, tdeeRaw]) => {
      if (wp) setWorkoutPlan(JSON.parse(wp));
      if (mp) setMealPlan(JSON.parse(mp));
      if (sp) setScanPhoto(sp);
      if (tt) setTargetTransformation(JSON.parse(tt));
      if (tdeeRaw) setTdee(parseInt(tdeeRaw, 10));
      setLoading(false);
    });
  }, []);

  function handleContinue() {
    router.replace("/subscription-plans" as any);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={SF.gold} size="large" />
        <Text style={{ color: SF.muted, marginTop: 16, fontFamily: "DMSans_400Regular", fontSize: 14 }}>Loading your plan…</Text>
      </View>
    );
  }

  const schedule: any[] = workoutPlan?.schedule ?? [];
  const workoutDays = schedule.filter((d: any) => !d.isRest);
  const restDays = schedule.filter((d: any) => d.isRest);
  const firstDayMeals: any[] = mealPlan?.days?.[0]?.meals ?? [];

  return (
    <ScreenContainer containerClassName="bg-[#0A0500]" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>⚡ YOUR PLAN IS READY</Text>
          <Text style={styles.title}>Here's What{"\n"}Awaits You</Text>
          <Text style={styles.subtitle}>A personalised AI plan built around your body, goals, and lifestyle.</Text>
        </View>

        {/* Before / After comparison */}
        {(scanPhoto || targetTransformation?.imageUrl) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Your Transformation Journey</Text>
            <View style={styles.photoRow}>
              <View style={styles.photoCol}>
                <Text style={styles.photoLabel}>NOW</Text>
                {scanPhoto ? (
                  <Image source={{ uri: scanPhoto }} style={styles.photo} resizeMode="cover" />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text style={{ color: SF.muted, fontSize: 32 }}>📷</Text>
                  </View>
                )}
                <Text style={styles.photoCaption}>Your starting point</Text>
              </View>
              <View style={styles.arrowCol}>
                <Text style={{ fontSize: 28 }}>→</Text>
                {targetTransformation?.target_bf && (
                  <Text style={styles.bfBadge}>{targetTransformation.target_bf}%{"\n"}BF</Text>
                )}
              </View>
              <View style={styles.photoCol}>
                <Text style={[styles.photoLabel, { color: SF.gold }]}>TARGET</Text>
                {targetTransformation?.imageUrl ? (
                  <Image source={{ uri: targetTransformation.imageUrl }} style={styles.photo} resizeMode="cover" />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text style={{ color: SF.muted, fontSize: 32 }}>🏆</Text>
                  </View>
                )}
                <Text style={styles.photoCaption}>
                  {targetTransformation?.estimated_weeks
                    ? `~${targetTransformation.estimated_weeks} weeks away`
                    : "Your goal physique"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Workout plan overview */}
        {workoutPlan && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💪 Your Workout Schedule</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{workoutDays.length}</Text>
                <Text style={styles.statLabel}>Training Days</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{restDays.length}</Text>
                <Text style={styles.statLabel}>Rest Days</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{workoutDays.reduce((s: number, d: any) => s + (d.exercises?.length ?? 0), 0)}</Text>
                <Text style={styles.statLabel}>Total Exercises</Text>
              </View>
            </View>
            <View style={styles.weekRow}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                const match = schedule[i];
                const isRest = match?.isRest ?? true;
                return (
                  <ImageBackground source={{ uri: GOLDEN_PRIMARY }} style={{ flex: 1 }} resizeMode="cover">
                  <View key={day} style={[styles.dayDot, isRest ? styles.dayDotRest : styles.dayDotActive]}>
                    <Text style={[styles.dayDotText, !isRest && { color: SF.bg }]}>{day[0]}</Text>
                  </View>
                  </ImageBackground>
                );
              })}
            </View>
            {workoutDays.slice(0, 2).map((day: any, i: number) => (
              <View key={i} style={styles.dayCard}>
                <Text style={styles.dayCardTitle}>{day.day} — {day.muscleGroups?.join(", ") ?? day.focus ?? "Full Body"}</Text>
                <Text style={styles.dayCardSub}>{day.exercises?.slice(0, 3).map((e: any) => e.name ?? e).join(" · ") ?? ""}{day.exercises?.length > 3 ? ` +${day.exercises.length - 3} more` : ""}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Meal plan overview */}
        {mealPlan && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🥗 Your Nutrition Plan</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: SF.gold }]}>{tdee ?? mealPlan.dailyCalories}</Text>
                <Text style={styles.statLabel}>Daily kcal</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: SF.teal }]}>{mealPlan.proteinTarget ?? "—"}g</Text>
                <Text style={styles.statLabel}>Protein</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: SF.emerald }]}>{mealPlan.carbTarget ?? "—"}g</Text>
                <Text style={styles.statLabel}>Carbs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: SF.orange }]}>{mealPlan.fatTarget ?? "—"}g</Text>
                <Text style={styles.statLabel}>Fats</Text>
              </View>
            </View>
            {firstDayMeals.slice(0, 3).map((meal: any, i: number) => (
              <View key={i} style={styles.mealRow}>
                <View style={styles.mealDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealMeta}>{meal.type} · {meal.calories} kcal · {meal.protein}g protein</Text>
                </View>
              </View>
            ))}
            {firstDayMeals.length > 3 && (
              <Text style={styles.moreText}>+{firstDayMeals.length - 3} more meals in your plan</Text>
            )}
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaHint}>Next: Choose your subscription plan</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.ctaBtnText}>View Subscription Plans →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 48 },
  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, alignItems: "center" },
  badge: { color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 2, marginBottom: 12 },
  title: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 32, textAlign: "center", lineHeight: 40, marginBottom: 12 },
  subtitle: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  card: { marginHorizontal: 16, marginBottom: 16, backgroundColor: SF.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: SF.border },
  cardTitle: { color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 17, marginBottom: 16 },
  photoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  photoCol: { alignItems: "center", flex: 1 },
  arrowCol: { alignItems: "center", paddingHorizontal: 8 },
  photoLabel: { color: SF.muted, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  photo: { width: (W - 32 - 80) / 2, height: ((W - 32 - 80) / 2) * 1.33, borderRadius: 14, borderWidth: 2, borderColor: SF.border },
  photoPlaceholder: { backgroundColor: "#1a0d00", justifyContent: "center", alignItems: "center" },
  photoCaption: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 6, textAlign: "center" },
  bfBadge: { color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 13, textAlign: "center", marginTop: 4 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 16 },
  statBox: { alignItems: "center" },
  statNum: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 26, lineHeight: 32 },
  statLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2, textAlign: "center" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  dayDot: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  dayDotActive: { backgroundColor: SF.gold },
  dayDotRest: { backgroundColor: "#1a0d00", borderWidth: 1, borderColor: SF.border },
  dayDotText: { color: SF.muted, fontFamily: "DMSans_700Bold", fontSize: 12 },
  dayCard: { backgroundColor: "#0A0E14", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: SF.border },
  dayCardTitle: { color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 4 },
  dayCardSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18 },
  mealRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  mealDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SF.gold, marginTop: 5, marginRight: 10 },
  mealName: { color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  mealMeta: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  moreText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", marginTop: 4 },
  ctaContainer: { marginHorizontal: 16, marginTop: 8, alignItems: "center" },
  ctaHint: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginBottom: 12 },
  ctaBtn: { backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 32, width: "100%", alignItems: "center" },
  ctaBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 17 },
});
