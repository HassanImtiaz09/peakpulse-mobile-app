/**
 * Onboarding Summary Screen — FIXED
 *
 * Changes from original:
 * 1. Promise.all() wrapped in try/catch — prevents silent crash if AsyncStorage
 *    fails or returns malformed JSON.
 * 2. Each JSON.parse() call individually try/catch'd — a bad plan cache no longer
 *    breaks the whole screen.
 * 3. Added loadError state — shows a friendly error card with "Continue Anyway"
 *    and "Go Back & Retry" options instead of a frozen loading screen.
 * 4. Added MaterialIcons import for the error UI.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons"; // FIX: added for error UI
import { ScreenContainer } from "@/components/screen-container";
import { GOLDEN_PRIMARY, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI, SF } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";

const { width: W } = Dimensions.get("window");

export default function OnboardingSummaryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false); // FIX: new error state
  const [workoutPlan, setWorkoutPlan] = useState<any>(null);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [scanPhoto, setScanPhoto] = useState<string | null>(null);
  const [targetTransformation, setTargetTransformation] = useState<any | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);

  useEffect(() => {
    // FIX: Entire block is now wrapped in a .catch() so AsyncStorage failures
    // (e.g. storage full, device lock, first-launch race) show an error UI
    // instead of freezing on the loading spinner forever.
    Promise.all([
      AsyncStorage.getItem("@cached_workout_plan"),
      AsyncStorage.getItem("@cached_meal_plan"),
      AsyncStorage.getItem("@onboarding_scan_photo"),
      AsyncStorage.getItem("@target_transformation"),
      AsyncStorage.getItem("@user_tdee"),
    ])
      .then(([wp, mp, sp, tt, tdeeRaw]) => {
        // FIX: Each JSON.parse is individually try/catch'd.
        // A corrupted cache for one item no longer crashes the whole screen.
        if (wp) {
          try { setWorkoutPlan(JSON.parse(wp)); } catch {}
        }
        if (mp) {
          try { setMealPlan(JSON.parse(mp)); } catch {}
        }
        if (sp) setScanPhoto(sp);
        if (tt) {
          try { setTargetTransformation(JSON.parse(tt)); } catch {}
        }
        if (tdeeRaw) setTdee(parseInt(tdeeRaw, 10));
        setLoading(false);
      })
      .catch(() => {
        // FIX: If AsyncStorage itself fails entirely (rare but possible on
        // low-storage devices), show error UI instead of infinite spinner.
        setLoading(false);
        setLoadError(true);
      });
  }, []);

  function handleContinue() {
    router.replace("/subscription-plans" as any);
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={SF.gold} size="large" />
        <Text style={{ color: SF.muted, marginTop: 16, fontFamily: "DMSans_400Regular", fontSize: 14 }}>
          Loading your plan…
        </Text>
      </View>
    );
  }

  // FIX: Error state — shown instead of an infinite spinner if AsyncStorage fails
  if (loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <MaterialIcons name="error-outline" size={48} color={SF.gold} />
        <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18, marginTop: 16, textAlign: "center" }}>
          Couldn't Load Your Plan
        </Text>
        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
          There was a problem loading your generated plan. You can continue to
          subscription or go back to regenerate.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: SF.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 24 }}
          onPress={handleContinue}
        >
          <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Continue Anyway →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14 }}>← Go Back & Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
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
          <Text style={styles.subtitle}>
            A personalised AI plan built around your body, goals, and lifestyle.
          </Text>
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
                <Text style={styles.statNum}>
                  {workoutDays.reduce((s: number, d: any) => s + (d.exercises?.length ?? 0), 0)}
                </Text>
                <Text style={styles.statLabel}>Total Exercises</Text>
              </View>
            </View>
            <View style={styles.weekRow}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                const match = schedule[i];
                const isRest = match?.isRest ?? true;
                return (
                  <ImageBackground source={{ uri: GOLDEN_PRIMARY }} style={{ flex: 1 }} resizeMode="cover">
                    <View
                      key={day}
                      style={[styles.dayDot, isRest ? styles.dayDotRest : styles.dayDotActive]}
                    >
                      <Text style={[styles.dayDotText, !isRest && { color: SF.bg }]}>{day[0]}</Text>
                    </View>
                  </ImageBackground>
                );
              })}
            </View>
            {workoutDays.slice(0, 2).map((day: any, i: number) => (
              <View key={i} style={styles.dayCard}>
                <Text style={styles.dayCardTitle}>
                  {day.day} — {day.muscleGroups?.join(", ") ?? day.focus ?? "Full Body"}
                </Text>
                <Text style={styles.dayCardSub}>
                  {day.exercises?.slice(0, 3).map((e: any) => e.name ?? e).join(" · ") ?? ""}
                  {day.exercises?.length > 3 ? ` +${day.exercises.length - 3} more` : ""}
                </Text>
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
                  <Text style={styles.mealMeta}>
                    {meal.type} · {meal.calories} kcal · {meal.protein}g protein
                  </Text>
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
  dayCard: { backgroundColor: UI.bg, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: SF.border },
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
