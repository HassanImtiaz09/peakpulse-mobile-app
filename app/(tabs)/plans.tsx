import React, { useState, useCallback, useMemo } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator,
  Alert, ImageBackground, Image, Platform, Modal, TextInput, FlatList, RefreshControl,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, interpolate, Extrapolation,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getExerciseDemo } from "@/lib/exercise-demos";
import { ExerciseDemoPlayer } from "@/components/exercise-demo-player";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { exportWorkoutPlanPdf } from "@/lib/workout-pdf";
import { prefetchExerciseVideos } from "@/lib/gif-cache";
import { prefetchWorkoutGifs } from "@/lib/exercise-gif-cache";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BodyHeatmap } from "@/components/body-heatmap";
import { BodyDiagram, BodyDiagramInline } from "@/components/body-diagram";
// MuscleSvgDiagram/Mini replaced with higher-quality BodyDiagram components
import { getExerciseInfo, type ExerciseInfo } from "@/lib/exercise-data";
import { ExerciseSwapSheet } from "@/components/exercise-swap-sheet";
import { getTodayTargetMuscles } from "@/lib/muscle-balance";
import { usePantry } from "@/lib/pantry-context";
import { useCalories } from "@/lib/calorie-context";
import { PremiumFeatureTeaser } from "@/components/premium-feature-banner";
import { useExerciseCompletion } from "@/lib/exercise-completion-context";
import { EmptyState, EMPTY_STATES } from "@/components/empty-state";
import { useAiLimit } from "@/components/ai-limit-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";

const WORKOUT_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/yauqLuTRvanJUzsJ.jpg";
const MEAL_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/yauqLuTRvanJUzsJ.jpg";

// NanoBanana design tokens
const GOLD = "#F59E0B";
const GOLD_DIM = "rgba(245,158,11,0.12)";
const GOLD_BORDER = "rgba(245,158,11,0.20)";
const BG = "#0A0E14";
const SURFACE = "#141A22";
const FG = "#F1F5F9";
const MUTED = "#64748B";
const CREAM = "#FDE68A";

// Sanitize meal names from AI — remove unicode bullets, dots, and other artifacts
const sanitizeMealName = (name: string | undefined | null): string =>
  (name ?? "Meal")
    .replace(/[\u00b7\u2022\u2023\u25e6\u2043\u2219\u25cf\u25cb\u2013\u2014]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim() || "Meal";

const MEAL_PHOTO_MAP: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80",
  "morning snack": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80",
  lunch: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  "afternoon snack": "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  dinner: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  snack: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  suhoor: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80",
  iftar: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
};

function getMealPhotoUrl(meal: any): string {
  if (meal.photoUrl) return meal.photoUrl;
  if (meal.photoQuery) {
    const query = encodeURIComponent(meal.photoQuery);
    return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80`;
  }
  const type = (meal.type ?? "default").toLowerCase();
  return MEAL_PHOTO_MAP[type] ?? MEAL_PHOTO_MAP.default;
}

// Meal Plan tab moved to Nutrition screen (meals.tsx)

const GOALS = [
  { key: "build_muscle", label: "Build Muscle", iconName: "fitness-center" as const },
  { key: "lose_fat", label: "Lose Fat", iconName: "local-fire-department" as const },
  { key: "maintain", label: "Maintain", iconName: "balance" as const },
  { key: "athletic", label: "Athletic", iconName: "directions-run" as const },
];

const WORKOUT_STYLES = [
  { key: "gym", label: "Gym", iconName: "fitness-center" as const },
  { key: "home", label: "Home", iconName: "home" as const },
  { key: "mix", label: "Mix", iconName: "sync" as const },
  { key: "calisthenics", label: "Calisthenics", iconName: "accessibility-new" as const },
];

const DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", iconName: "restaurant" as const },
  { key: "halal", label: "Halal", iconName: "star-half" as const },
  { key: "vegan", label: "Vegan", iconName: "eco" as const },
  { key: "vegetarian", label: "Vegetarian", iconName: "grass" as const },
  { key: "keto", label: "Keto", iconName: "egg" as const },
  { key: "paleo", label: "Paleo", iconName: "set-meal" as const },
];

const DAYS_OPTIONS = [3, 4, 5, 6];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AI_TIPS = [
  "For muscle building, aim for progressive overload — gradually increase weight or reps each week.",
  "Rest 60–90 seconds between sets for hypertrophy, 2–3 minutes for strength.",
  "Compound movements like squats and deadlifts recruit the most muscle fibres per rep.",
  "Protein intake of 1.6–2.2g per kg of bodyweight supports optimal muscle recovery.",
  "Sleep 7–9 hours — most muscle repair and growth hormone release happens during deep sleep.",
  "Warm up with 5–10 minutes of light cardio to reduce injury risk and improve performance.",
  "Track your workouts to see progress — what gets measured gets improved.",
  "Deload every 4–6 weeks by reducing volume or intensity to prevent overtraining.",
  "Mind-muscle connection matters — focus on the target muscle during each rep.",
  "Stay hydrated: aim for 2–3 litres of water daily, more on training days.",
  "Don’t skip leg day — lower body training boosts testosterone and overall strength.",
  "Eccentric (lowering) phase should be slow and controlled for maximum muscle tension.",
  "Consistency beats perfection — showing up regularly matters more than the perfect programme.",
  "Stretch after workouts to improve flexibility and reduce next-day soreness.",
  "Fuel your workout with carbs 1–2 hours before training for sustained energy.",
];

function getRotatingTip(): string {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const hourBlock = Math.floor(today.getHours() / 6); // changes 4x per day
  return AI_TIPS[(dayOfYear * 4 + hourBlock) % AI_TIPS.length];
}


function getTodayDayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

function PlansScreenContent() {
  const router = useRouter();
  const { showLimitModal } = useAiLimit();
  const { isAuthenticated, user } = useAuth();
  const { isGuest } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;
  // Workout state
  const [goal, setGoal] = useState("build_muscle");
  const [workoutStyle, setWorkoutStyle] = useState("gym");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [showCustomize, setShowCustomize] = useState(false);


  const { items: pantryItems } = usePantry();
  const { calorieGoal, totalCalories } = useCalories();
  const caloriesRemaining = Math.max(0, calorieGoal - totalCalories);

  // Exercise swap state
  const [swapExModal, setSwapExModal] = useState<{ exercise: any; dayFocus: string } | null>(null);
  const [swapExAlts, setSwapExAlts] = useState<any[]>([]);
  const [swapExLoading, setSwapExLoading] = useState(false);
  const exerciseSwap = trpc.exerciseSwap.generate.useMutation();

  // Local muscle-based substitution sheet
  const [localSwapVisible, setLocalSwapVisible] = useState(false);
  const [localSwapExName, setLocalSwapExName] = useState("");



  const { data: dbWorkoutPlan, refetch: refetchWorkout } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });

  const { data: dbProfile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const [localProfile, setLocalProfile] = React.useState<any>(null);
  React.useEffect(() => {
    AsyncStorage.getItem("@guest_profile").then(raw => { if (raw) { try { setLocalProfile(JSON.parse(raw)); } catch {} } });
  }, [isGuest]);
  const activeProfile = isAuthenticated ? dbProfile : localProfile;

  const [localWorkoutPlan, setLocalWorkoutPlan] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);


  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    AsyncStorage.getItem("@workout_completed_days").then(raw => {
      if (raw) try { setCompletedDays(JSON.parse(raw)); } catch {}
    });
  }, []);

  const toggleDayComplete = React.useCallback((dayName: string) => {
    setCompletedDays(prev => {
      const next = { ...prev, [dayName]: !prev[dayName] };
      AsyncStorage.setItem("@workout_completed_days", JSON.stringify(next));
      if (!prev[dayName] && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return next;
    });
  }, []);

  const resetWeekProgress = React.useCallback(() => {
    Alert.alert("Reset Week?", "This will clear all completed workout days for this week.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => {
        setCompletedDays({});
        AsyncStorage.setItem("@workout_completed_days", JSON.stringify({}));
      }},
    ]);
  }, []);

  React.useEffect(() => {
    if (isGuest) {
      AsyncStorage.getItem("@guest_workout_plan").then(raw => {
        if (raw && !localWorkoutPlan) setLocalWorkoutPlan(JSON.parse(raw));
      });
    }
  }, [isGuest]);

  const workoutPlan = isAuthenticated ? dbWorkoutPlan : localWorkoutPlan;

  // Pre-cache GIFs when workout plan is loaded
  React.useEffect(() => {
    if (workoutPlan?.schedule) {
      const allExNames = (workoutPlan.schedule as any[]).flatMap((d: any) =>
        (d.exercises ?? []).map((e: any) => e.name as string)
      );
      if (allExNames.length > 0) {
        prefetchExerciseVideos().catch(() => {});
        prefetchWorkoutGifs(allExNames).catch(() => {});
      }
    }
  }, [workoutPlan?.schedule]);

  const generateWorkout = trpc.workoutPlan.generate.useMutation({
    onSuccess: (data) => {
      if (isAuthenticated) refetchWorkout();
      else setLocalWorkoutPlan(data);
      // Pre-cache videos and GIFs for the new workout plan
      prefetchExerciseVideos().catch(() => {});
      const newExNames = ((data as any)?.schedule ?? []).flatMap((d: any) =>
        (d.exercises ?? []).map((e: any) => e.name as string)
      );
      if (newExNames.length > 0) prefetchWorkoutGifs(newExNames).catch(() => {});
    },
    onError: (e) => { if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; } Alert.alert("Error", e.message); },
  });


  // Derive today's plan
  const todayName = getTodayDayName();
  const todayWorkout = useMemo(() => {
    if (!workoutPlan?.schedule) return null;
    return workoutPlan.schedule.find((d: any) =>
      d.day?.toLowerCase().includes(todayName.toLowerCase())
    ) ?? null;
  }, [workoutPlan, todayName]);

  // Today's target muscles for body diagram
  const todayMuscles = useMemo(() => {
    return getTodayTargetMuscles(workoutPlan?.schedule);
  }, [workoutPlan]);

  const userGender = (activeProfile?.gender ?? "male") as "male" | "female";

  const otherWorkoutDays = useMemo(() => {
    if (!workoutPlan?.schedule) return [];
    return workoutPlan.schedule.filter((d: any) =>
      !d.day?.toLowerCase().includes(todayName.toLowerCase())
    );
  }, [workoutPlan, todayName]);


  // ── Exercise Swap Handler ──
  const handleExerciseSwap = useCallback(async (exercise: any, dayFocus: string) => {
    setSwapExModal({ exercise, dayFocus });
    setSwapExAlts([]);
    setSwapExLoading(true);
    try {
      const result = await exerciseSwap.mutateAsync({
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup ?? dayFocus,
        dayFocus,
        workoutStyle: workoutStyle,
      });
      setSwapExAlts(result.alternatives ?? []);
    } catch (e: any) {
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }
      Alert.alert("Error", e.message);
    } finally {
      setSwapExLoading(false);
    }
  }, [exerciseSwap, workoutStyle]);

  const applyExerciseSwap = useCallback((newExercise: any) => {
    if (!swapExModal || !workoutPlan?.schedule) return;
    const updatedSchedule = workoutPlan.schedule.map((day: any) => ({
      ...day,
      exercises: day.exercises?.map((ex: any) =>
        ex.name === swapExModal.exercise.name
          ? { ...newExercise, sets: newExercise.sets?.includes("x") ? parseInt(newExercise.sets) || ex.sets : (newExercise.sets ?? ex.sets), reps: newExercise.reps ?? ex.reps, rest: newExercise.rest ?? ex.rest }
          : ex
      ),
    }));
    const updatedPlan = { ...workoutPlan, schedule: updatedSchedule };
    if (isAuthenticated) {
      // For authenticated users, we'd need a server update — for now update local state
      setLocalWorkoutPlan(updatedPlan);
    } else {
      setLocalWorkoutPlan(updatedPlan);
      AsyncStorage.setItem("@guest_workout_plan", JSON.stringify(updatedPlan));
    }
    setSwapExModal(null);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Exercise Swapped", `Replaced ${swapExModal.exercise.name} with ${newExercise.name}`);
  }, [swapExModal, workoutPlan, isAuthenticated]);


  // ── Pull-to-refresh handler ─────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Reload profile
      const profileRaw = await AsyncStorage.getItem("@guest_profile");
      if (profileRaw) try { setLocalProfile(JSON.parse(profileRaw)); } catch {}

      // Reload workout plan
      if (isAuthenticated) {
        await refetchWorkout();
      } else {
        const [cached, guest] = await Promise.all([
          AsyncStorage.getItem("@cached_workout_plan"),
          AsyncStorage.getItem("@guest_workout_plan"),
        ]);
        const raw = cached || guest;
        if (raw) try { setLocalWorkoutPlan(JSON.parse(raw)); } catch {}
      }

      // Reload completed days
      const daysRaw = await AsyncStorage.getItem("@workout_completed_days");
      if (daysRaw) try { setCompletedDays(JSON.parse(daysRaw)); } catch {}
    } catch (err) {
      console.warn("Pull-to-refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, refetchWorkout]);

  // Parallax — MUST be above early return to avoid hooks ordering violation
  const scrollY = useSharedValue(0);
  const heroImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, 100], Extrapolation.CLAMP) }],
  }));
  const heroContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 150], [1, 0], Extrapolation.CLAMP),
  }));
  const handleScroll = useCallback((event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, []);

  // Workout progress stats — MUST be above early return to avoid hooks ordering violation
  const workoutStats = useMemo(() => {
    if (!workoutPlan?.schedule) return null;
    const schedule = workoutPlan.schedule;
    const workoutDays = schedule.filter((d: any) => !d.isRest);
    const totalWorkoutDays = workoutDays.length;
    const completedCount = workoutDays.filter((d: any) => completedDays[d.day]).length;
    const pct = totalWorkoutDays > 0 ? completedCount / totalWorkoutDays : 0;
    return { totalWorkoutDays, completedCount, pct };
  }, [workoutPlan, completedDays]);

  // Goal/style labels for summary
  const goalLabel = GOALS.find(g => g.key === goal)?.label ?? goal;
  const styleLabel = WORKOUT_STYLES.find(w => w.key === workoutStyle)?.label ?? workoutStyle;

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <MaterialIcons name="fitness-center" size={48} color={GOLD} style={{ marginBottom: 16 }} />
        <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 28, letterSpacing: 3, textAlign: "center", marginBottom: 8 }}>UNLOCK YOUR PLANS</Text>
        <Text style={{ color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to get started.</Text>
        <TouchableOpacity
          style={{ backgroundColor: GOLD, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 }}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Get Started</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Hero Header — NanoBanana flat dark */}
      <View style={{ backgroundColor: BG, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <MaterialIcons name="chevron-left" size={28} color={FG} />
          </TouchableOpacity>
          <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 24, letterSpacing: 3 }}>WORKOUT PLANS</Text>
          <TouchableOpacity onPress={() => router.push("/user-guide" as any)} style={{ padding: 4 }} {...a11yButton("User guide")}>
            <MaterialIcons name="more-horiz" size={22} color={MUTED} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise Library + Create Buttons */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, marginBottom: 12, gap: 8 }}>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", backgroundColor: SURFACE, borderWidth: 1, borderColor: GOLD_BORDER, flexDirection: "row", gap: 4 }}
          onPress={() => router.push("/exercise-library" as any)}
        >
          <MaterialIcons name="menu-book" size={16} color={GOLD} />
          <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 11 }}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD_BORDER, flexDirection: "row", gap: 4 }}
          onPress={() => router.push("/create-workout" as any)}
        >
          <MaterialIcons name="add-circle-outline" size={16} color={GOLD} />
          <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 11 }}>Create</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GOLD}
            colors={[GOLD]}
            progressBackgroundColor={SURFACE}
          />
        }
      >
        <View style={{ paddingHorizontal: 20 }}>
            {/* If no plan yet, show full generation form */}
            {!workoutPlan ? (
              <>
                <SectionLabel>Your Goal</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {GOALS.map(g => (
                    <OptionChip key={g.key} iconName={g.iconName} label={g.label} selected={goal === g.key} onPress={() => setGoal(g.key)} />
                  ))}
                </View>

                <SectionLabel>Workout Style</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {WORKOUT_STYLES.map(w => (
                    <OptionChip key={w.key} iconName={w.iconName} label={w.label} selected={workoutStyle === w.key} onPress={() => setWorkoutStyle(w.key)} />
                  ))}
                </View>

                <View style={{ backgroundColor: GOLD_DIM, borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: GOLD_BORDER, flexDirection: "row", gap: 8 }}>
                  <MaterialIcons name="warning-amber" size={14} color={CREAM} />
                  <Text style={{ color: CREAM, fontSize: 11, lineHeight: 16, flex: 1 }}>AI plans are for guidance. Consult a professional before starting.</Text>
                </View>

                <SectionLabel>Days Per Week</SectionLabel>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                  {DAYS_OPTIONS.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? GOLD : SURFACE, borderWidth: 1, borderColor: daysPerWeek === d ? GOLD : "rgba(30,41,59,0.6)" }}
                      onPress={() => setDaysPerWeek(d)}
                    >
                      <Text style={{ color: daysPerWeek === d ? BG : MUTED, fontFamily: "SpaceMono_700Bold" }}>{d}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateWorkout.isPending ? 0.7 : 1 }}
                  onPress={() => generateWorkout.mutate({ goal, workoutStyle, daysPerWeek })}
                  disabled={generateWorkout.isPending}
                >
                  {generateWorkout.isPending ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator color={BG} size="small" />
                      <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Generating Plan...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="auto-awesome" size={16} color={BG} />
                      <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Generate Workout Plan</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* ── Plan Summary Bar ── */}
                <View style={{ backgroundColor: SURFACE, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <View style={{ backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: "#4ADE80", fontSize: 10, fontFamily: "DMSans_700Bold" }}>ACTIVE</Text>
                      </View>
                      <Text style={{ color: MUTED, fontSize: 11 }}>{goalLabel} · {styleLabel} · {daysPerWeek}x/wk</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      {workoutStats && (
                        <Text style={{ color: GOLD, fontSize: 12, fontFamily: "SpaceMono_700Bold" }}>
                          {workoutStats.completedCount}/{workoutStats.totalWorkoutDays} done ({Math.round(workoutStats.pct * 100)}%)
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        exportWorkoutPlanPdf(workoutPlan, user?.name || (isGuest ? "Guest" : undefined));
                      }}
                      activeOpacity={0.7}
                      style={{ backgroundColor: GOLD_DIM, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: GOLD_BORDER }}
                    >
                      <MaterialIcons name="picture-as-pdf" size={16} color={GOLD} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={resetWeekProgress}
                      style={{ backgroundColor: GOLD_DIM, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: GOLD_BORDER }}
                    >
                      <MaterialIcons name="restart-alt" size={16} color={GOLD} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Compact progress bar */}
                {workoutStats && (
                  <View style={{ height: 4, backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: workoutStats.pct >= 1 ? "#22C55E" : GOLD, width: `${Math.round(workoutStats.pct * 100)}%` }} />
                  </View>
                )}

                {/* AI Insight */}
                {(
                  <View style={{ backgroundColor: GOLD_DIM, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: GOLD_BORDER }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                      <MaterialIcons name="auto-awesome" size={14} color={GOLD} style={{ marginTop: 2 }} />
                      <Text style={{ color: CREAM, fontSize: 12, lineHeight: 18, flex: 1 }}>{getRotatingTip()}</Text>
                    </View>
                  </View>
                )}

                {/* Premium Features — Highlighted */}
                <View style={{ gap: 10, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{ backgroundColor: "rgba(139,92,246,0.12)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(139,92,246,0.3)", flexDirection: "row", alignItems: "center", gap: 12 }}
                  onPress={() => router.push("/form-checker" as any)}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="center-focus-strong" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#C4B5FD", fontFamily: "DMSans_700Bold", fontSize: 15 }}>AI Form Check</Text>
                    <Text style={{ color: "rgba(196,181,253,0.6)", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Record a set for AI form analysis</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#8B5CF6" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: "rgba(6,182,212,0.12)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(6,182,212,0.3)", flexDirection: "row", alignItems: "center", gap: 12 }}
                  onPress={() => router.push("/ai-coach" as any)}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#06B6D4", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="psychology" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#67E8F9", fontFamily: "DMSans_700Bold", fontSize: 15 }}>Personalised AI Coach</Text>
                    <Text style={{ color: "rgba(103,232,249,0.6)", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Get tailored guidance for your workout plan</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#06B6D4" />
                </TouchableOpacity>
                </View>

                {/* ── TODAY'S WORKOUT (highlighted) ── */}
                {todayWorkout && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <MaterialIcons name="today" size={16} color={GOLD} />
                      <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Today — {todayName}</Text>
                    </View>

                    {/* Body Diagram — Today's Target Muscles (uses same react-native-body-highlighter as Library) */}
                    {todayMuscles.primary.length > 0 && !todayWorkout.isRest && (
                      <View style={{ backgroundColor: GOLD_DIM, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: GOLD_BORDER, alignItems: "center" }}>
                        <Text style={{ color: CREAM, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 8, letterSpacing: 0.5 }}>TODAY'S TARGET MUSCLES</Text>
                        <BodyDiagram
                          primary={todayMuscles.primary}
                          secondary={todayMuscles.secondary}
                          width={140}
                          height={180}
                          showLabels={true}
                          showBothViews={true}
                        />
                      </View>
                    )}
                    <WorkoutDayCard
                      day={todayWorkout}
                      isCompleted={!!completedDays[todayWorkout.day]}
                      onToggleComplete={() => toggleDayComplete(todayWorkout.day)}
                      onPress={() => {
                        if (!todayWorkout.isRest) router.push({ pathname: "/active-workout", params: { dayData: JSON.stringify(todayWorkout) } } as any);
                      }}
                      isToday
                      onExerciseSwap={handleExerciseSwap}
                    />
                  </>
                )}

                {/* ── REST OF THE WEEK ── */}
                {otherWorkoutDays.length > 0 && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 10 }}>
                      <MaterialIcons name="date-range" size={16} color={MUTED} />
                      <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Rest of the Week</Text>
                    </View>
                    {otherWorkoutDays.map((day: any, i: number) => (
                      <WorkoutDayCard
                        key={i}
                        day={day}
                        isCompleted={!!completedDays[day.day]}
                        onToggleComplete={() => toggleDayComplete(day.day)}
                        onPress={() => {
                          if (!day.isRest) router.push({ pathname: "/active-workout", params: { dayData: JSON.stringify(day) } } as any);
                        }}
                        onExerciseSwap={handleExerciseSwap}
                      />
                    ))}
                  </>
                )}


                {/* Customize / Regenerate (collapsible) */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, paddingVertical: 10 }}
                  onPress={() => setShowCustomize(!showCustomize)}
                >
                  <MaterialIcons name={showCustomize ? "expand-less" : "tune"} size={16} color={MUTED} />
                  <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 12 }}>{showCustomize ? "Hide Options" : "Customize & Regenerate"}</Text>
                </TouchableOpacity>

                {showCustomize && (
                  <View style={{ marginTop: 8 }}>
                    <SectionLabel>Your Goal</SectionLabel>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {GOALS.map(g => (
                        <OptionChip key={g.key} iconName={g.iconName} label={g.label} selected={goal === g.key} onPress={() => setGoal(g.key)} />
                      ))}
                    </View>
                    <SectionLabel>Workout Style</SectionLabel>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {WORKOUT_STYLES.map(w => (
                        <OptionChip key={w.key} iconName={w.iconName} label={w.label} selected={workoutStyle === w.key} onPress={() => setWorkoutStyle(w.key)} />
                      ))}
                    </View>
                    <SectionLabel>Days Per Week</SectionLabel>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                      {DAYS_OPTIONS.map(d => (
                        <TouchableOpacity
                          key={d}
                          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? GOLD : SURFACE, borderWidth: 1, borderColor: daysPerWeek === d ? GOLD : "rgba(30,41,59,0.6)" }}
                          onPress={() => setDaysPerWeek(d)}
                        >
                          <Text style={{ color: daysPerWeek === d ? BG : MUTED, fontFamily: "SpaceMono_700Bold" }}>{d}x</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: GOLD_DIM, borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(30,41,59,0.6)", flexDirection: "row", justifyContent: "center", gap: 8, opacity: generateWorkout.isPending ? 0.7 : 1 }}
                      onPress={() => {
                        Alert.alert("Regenerate Workout Plan?", "This will replace your current plan.", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Regenerate", style: "destructive", onPress: () => generateWorkout.mutate({ goal, workoutStyle, daysPerWeek }) },
                        ]);
                      }}
                      disabled={generateWorkout.isPending}
                    >
                      {generateWorkout.isPending ? (
                        <>
                          <ActivityIndicator color={GOLD} size="small" />
                          <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Regenerating...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="refresh" size={16} color={GOLD} />
                          <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Regenerate Workout Plan</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
      </Animated.ScrollView>

      {/* ── Exercise Swap Modal ── */}
      <Modal visible={!!swapExModal} transparent animationType="slide" onRequestClose={() => setSwapExModal(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(30,41,59,0.6)" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#22D3EE", fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1 }}>AI EXERCISE SWAP</Text>
                <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 16, marginTop: 2 }}>Replace: {swapExModal?.exercise?.name}</Text>
                <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Target: {swapExModal?.exercise?.muscleGroup ?? swapExModal?.dayFocus}</Text>
              </View>
              <TouchableOpacity onPress={() => setSwapExModal(null)} style={{ padding: 8 }}>
                <MaterialIcons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>
            {/* Quick local swap button */}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, marginHorizontal: 20, marginTop: 8, backgroundColor: GOLD_DIM, borderRadius: 10, borderWidth: 1, borderColor: GOLD_BORDER }}
              onPress={() => {
                setSwapExModal(null);
                setLocalSwapExName(swapExModal?.exercise?.name ?? "");
                setLocalSwapVisible(true);
              }}
            >
              <MaterialIcons name="accessibility-new" size={16} color={GOLD} />
              <Text style={{ color: GOLD, fontSize: 12, fontWeight: "700" }}>Browse by Muscle Match</Text>
            </TouchableOpacity>
            {swapExLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#22D3EE" />
                <Text style={{ color: MUTED, marginTop: 12, fontSize: 13 }}>AI Coach is finding alternatives...</Text>
              </View>
            ) : (
              <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                {swapExAlts.length === 0 ? (
                  <Text style={{ color: MUTED, textAlign: "center", padding: 20 }}>No alternatives found. Try again.</Text>
                ) : (
                  swapExAlts.map((alt: any, i: number) => (
                    <View key={i} style={{ backgroundColor: BG, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(34,211,238,0.15)" }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{alt.name}</Text>
                          <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                            <Text style={{ color: GOLD, fontSize: 11 }}>{alt.sets}</Text>
                            <Text style={{ color: CREAM, fontSize: 11 }}>{alt.reps} reps</Text>
                            {alt.rest && <Text style={{ color: MUTED, fontSize: 11 }}>{alt.rest}</Text>}
                          </View>
                          {alt.equipment && <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{alt.equipment}</Text>}
                        </View>
                        <TouchableOpacity
                          style={{ backgroundColor: "#22D3EE", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
                          onPress={() => applyExerciseSwap(alt)}
                        >
                          <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Select</Text>
                        </TouchableOpacity>
                      </View>
                      {alt.reason && <Text style={{ color: MUTED, fontSize: 11, marginTop: 6, lineHeight: 16 }}>{alt.reason}</Text>}
                      {alt.notes && <Text style={{ color: "#22D3EE", fontSize: 11, marginTop: 4, lineHeight: 16 }}>{alt.notes}</Text>}
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Local Muscle-Based Swap Sheet ── */}
      <ExerciseSwapSheet
        visible={localSwapVisible}
        exerciseName={localSwapExName}
        onClose={() => setLocalSwapVisible(false)}
        onSwap={(newEx: ExerciseInfo) => {
          setLocalSwapVisible(false);
          applyExerciseSwap({
            name: newEx.name,
            sets: undefined,
            reps: undefined,
            rest: undefined,
            equipment: newEx.equipment,
            muscleGroup: newEx.primaryMuscles[0] ?? "",
          });
        }}
      />

    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{children}</Text>;
}

function OptionChip({ iconName, label, selected, onPress }: { iconName: string; label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: selected ? GOLD : SURFACE, borderWidth: 1, borderColor: selected ? GOLD : "rgba(30,41,59,0.6)" }}
      onPress={onPress}
    >
      <MaterialIcons name={iconName as any} size={14} color={selected ? BG : MUTED} />
      <Text style={{ color: selected ? BG : MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MacroCard({ label, value, unit, color }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: color + "30" }}>
      <Text style={{ color, fontFamily: "SpaceMono_700Bold", fontSize: 14 }}>{value ?? "—"}</Text>
      <Text style={{ color: MUTED, fontSize: 9, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: MUTED, fontSize: 9, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function WorkoutDayCard({ day, onPress, isCompleted, onToggleComplete, isToday, onExerciseSwap }: { day: any; onPress: () => void; isCompleted?: boolean; onToggleComplete?: () => void; isToday?: boolean; onExerciseSwap?: (exercise: any, dayFocus: string) => void }) {
  const [expanded, setExpanded] = useState(!!isToday);
  return (
    <View style={{ backgroundColor: isCompleted ? "rgba(34,197,94,0.06)" : isToday ? GOLD_DIM : SURFACE, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: isCompleted ? "rgba(34,197,94,0.25)" : isToday ? GOLD_BORDER : "rgba(30,41,59,0.6)", overflow: "hidden" }}>
      <TouchableOpacity
        style={{ padding: 14 }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {!day.isRest && onToggleComplete ? (
              <TouchableOpacity
                onPress={onToggleComplete}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: isCompleted ? "#22C55E" : GOLD_DIM,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: isCompleted ? 0 : 1, borderColor: GOLD_BORDER,
                }}
              >
                <MaterialIcons name={isCompleted ? "check" : "fitness-center"} size={16} color={isCompleted ? FG : GOLD} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name={day.isRest ? "bedtime" : "fitness-center"} size={16} color={day.isRest ? CREAM : GOLD} />
              </View>
            )}
            <View>
              <Text style={{ color: isCompleted ? "#22C55E" : FG, fontFamily: "DMSans_700Bold", fontSize: 14, textDecorationLine: isCompleted ? "line-through" : "none" }}>{day.day}</Text>
              <Text style={{ color: isCompleted ? "#4ADE80" : (day.isRest ? CREAM : GOLD), fontSize: 12 }}>{isCompleted ? "Completed" : day.focus}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Inline body diagram in collapsed header for non-rest days */}
            {!day.isRest && !expanded && (() => {
              const pSet = new Set<string>();
              const sSet = new Set<string>();
              (day.exercises ?? []).forEach((ex: any) => {
                const info = getExerciseInfo(ex.name ?? "");
                if (info) {
                  info.primaryMuscles.forEach((m: string) => pSet.add(m));
                  info.secondaryMuscles.forEach((m: string) => sSet.add(m));
                }
              });
              const pArr = Array.from(pSet) as any[];
              const sArr = Array.from(sSet).filter((m) => !pSet.has(m)) as any[];
              if (pArr.length === 0) return null;
              return <BodyDiagramInline primary={pArr} secondary={sArr} />;
            })()}
            {!day.isRest && <Text style={{ color: MUTED, fontSize: 12 }}>{day.exercises?.length ?? 0} exercises</Text>}
            <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={18} color={MUTED} />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && !day.isRest && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
          <TouchableOpacity
            style={{ backgroundColor: GOLD, borderRadius: 12, paddingVertical: 10, alignItems: "center", marginBottom: 4 }}
            onPress={onPress}
          >
            <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>START WORKOUT →</Text>
          </TouchableOpacity>
          {day.exercises?.map((ex: any, idx: number) => (
            <ExercisePreviewCard key={idx} exercise={ex} isToday={isToday} onSwap={onExerciseSwap ? () => onExerciseSwap(ex, day.focus ?? day.day) : undefined} />
          ))}
        </View>
      )}

      {expanded && day.isRest && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ color: CREAM, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 18 }}>
            Rest day — focus on recovery, stretching, and light movement. Your muscles grow during rest!
          </Text>
        </View>
      )}
    </View>
  );
}

function ExercisePreviewCard({ exercise, onSwap, isToday }: { exercise: any; onSwap?: () => void; isToday?: boolean }) {
  const [showVideo, setShowVideo] = useState(false);
  const demo = getExerciseDemo(exercise.name ?? "");
  const { isCompleted, toggleExercise } = useExerciseCompletion();
  const today = new Date().toISOString().split("T")[0];
  const done = isToday ? isCompleted(today, exercise.name ?? "") : false;
  const exInfo = useMemo(() => getExerciseInfo(exercise.name ?? ""), [exercise.name]);

  return (
    <View style={{ backgroundColor: done ? "rgba(16,185,129,0.08)" : SURFACE, borderRadius: 14, borderWidth: 1, borderColor: done ? "rgba(16,185,129,0.3)" : "rgba(30,41,59,0.6)", overflow: "hidden" }}>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1, gap: 10 }}>
            {isToday && (
              <TouchableOpacity
                onPress={() => toggleExercise(today, exercise.name ?? "")}
                style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: done ? "#10B981" : MUTED, backgroundColor: done ? "#10B981" : "transparent", alignItems: "center", justifyContent: "center", marginTop: 2 }}
              >
                {done && <MaterialIcons name="check" size={16} color="#fff" />}
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: done ? "#10B981" : FG, fontFamily: "DMSans_700Bold", fontSize: 14, textDecorationLine: done ? "line-through" : "none" }}>{exercise.name}</Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                <Text style={{ color: GOLD, fontSize: 12 }}>{exercise.sets} sets</Text>
                <Text style={{ color: CREAM, fontSize: 12 }}>{exercise.reps} reps</Text>
                {exercise.rest && <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><MaterialIcons name="timer" size={11} color={MUTED} /><Text style={{ color: MUTED, fontSize: 12 }}>{exercise.rest}</Text></View>}
              </View>
              {exercise.muscleGroup && (
                <View style={{ marginTop: 4, alignSelf: "flex-start", backgroundColor: GOLD_DIM, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: MUTED, fontSize: 10 }}>{exercise.muscleGroup}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {onSwap && (
              <TouchableOpacity
                style={{ backgroundColor: "rgba(34,211,238,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(34,211,238,0.25)", flexDirection: "row", alignItems: "center", gap: 4 }}
                onPress={onSwap}
              >
                <MaterialIcons name="swap-horiz" size={13} color="#22D3EE" />
                <Text style={{ color: "#22D3EE", fontFamily: "DMSans_700Bold", fontSize: 11 }}>Swap</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ backgroundColor: showVideo ? GOLD : GOLD_DIM, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: GOLD_BORDER }}
              onPress={() => setShowVideo(!showVideo)}
            >
              <Text style={{ color: showVideo ? BG : GOLD, fontFamily: "DMSans_700Bold", fontSize: 11 }}>{showVideo ? "Hide" : "Demo"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {exercise.notes && (
          <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-start", marginTop: 6 }}><MaterialIcons name="lightbulb" size={11} color={MUTED} style={{ marginTop: 2 }} /><Text style={{ color: MUTED, fontSize: 11, lineHeight: 15, flex: 1 }}>{exercise.notes}</Text></View>
        )}
      </View>
      {showVideo && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <ExerciseDemoPlayer
            gifAsset={demo.gifAsset}
            cue={demo.cue}
            height={160}
            exerciseName={exercise.name ?? ""}
            onComparePhoto={() => {
              const r = require("expo-router");
              r.router.push({ pathname: "/form-compare", params: { exerciseName: exercise.name ?? "" } });
            }}
          />
        </View>
      )}
    </View>
  );
}

function MealDayCard({ day, defaultExpanded, dayIndex, onMealSwap }: { day: any; defaultExpanded?: boolean; dayIndex?: number; onMealSwap?: (meal: any, dayIndex: number, mealIndex: number) => void }) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const dayCalories = day.meals?.reduce((s: number, m: any) => s + (m.calories ?? 0), 0) ?? 0;
  return (
    <View style={{ backgroundColor: defaultExpanded ? GOLD_DIM : SURFACE, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: defaultExpanded ? GOLD_BORDER : "rgba(30,41,59,0.6)", overflow: "hidden" }}>
      <TouchableOpacity
        style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="calendar-today" size={16} color={GOLD} />
          </View>
          <View>
            <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{day.day}</Text>
            <Text style={{ color: MUTED, fontSize: 12 }}>{day.meals?.length ?? 0} meals</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: GOLD, fontFamily: "SpaceMono_700Bold", fontSize: 15 }}>{dayCalories} kcal</Text>
          <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={18} color={MUTED} style={{ marginTop: 2 }} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
          {day.meals?.map((meal: any, i: number) => (
            <MealCard key={i} meal={meal} onSwap={onMealSwap && dayIndex !== undefined ? () => onMealSwap(meal, dayIndex, i) : undefined} />
          ))}
        </View>
      )}
    </View>
  );
}

function MealCard({ meal, onSwap }: { meal: any; onSwap?: () => void }) {
  const [showPrep, setShowPrep] = useState(false);
  const photoUrl = getMealPhotoUrl(meal);
  const mealTypeColor: Record<string, string> = {
    breakfast: "#FBBF24",
    "morning snack": "#FBBF24",
    lunch: "#FDE68A",
    "afternoon snack": "#3B82F6",
    dinner: "#F59E0B",
    snack: "#FBBF24",
  };
  const color = mealTypeColor[(meal.type ?? "").toLowerCase()] ?? "#B45309";

  return (
    <View style={{ backgroundColor: SURFACE, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}>
      <Image
        source={{ uri: photoUrl }}
        style={{ width: "100%", height: 140 }}
        resizeMode="cover"
      />
      <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: color, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: BG, fontSize: 10, fontFamily: "DMSans_700Bold", textTransform: "uppercase" }}>{meal.type ?? "Meal"}</Text>
      </View>
      <View style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 6 }}>
        {onSwap && (
          <TouchableOpacity
            style={{ backgroundColor: "rgba(34,211,238,0.85)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 3 }}
            onPress={onSwap}
          >
            <MaterialIcons name="swap-horiz" size={12} color="#0A0E14" />
            <Text style={{ color: "#0A0E14", fontSize: 10, fontFamily: "DMSans_700Bold" }}>Swap</Text>
          </TouchableOpacity>
        )}
        <View style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: GOLD, fontSize: 11, fontFamily: "SpaceMono_700Bold" }}>{meal.calories} kcal</Text>
        </View>
      </View>

      <View style={{ padding: 14 }}>
        <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 15, marginBottom: 6 }}>{sanitizeMealName(meal.name)}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
          <Text style={{ color: "#3B82F6", fontSize: 12 }}>P: {meal.protein}g</Text>
          <Text style={{ color: CREAM, fontSize: 12 }}>C: {meal.carbs}g</Text>
          <Text style={{ color: GOLD, fontSize: 12 }}>F: {meal.fat}g</Text>
          {meal.prepTime && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <MaterialIcons name="timer" size={11} color={MUTED} />
              <Text style={{ color: MUTED, fontSize: 12 }}>{meal.prepTime}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: showPrep ? "rgba(34,197,94,0.08)" : SURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: showPrep ? GOLD_BORDER : "rgba(30,41,59,0.6)" }}
          onPress={() => setShowPrep(!showPrep)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons name="restaurant" size={16} color={showPrep ? GOLD : MUTED} />
            <Text style={{ color: showPrep ? GOLD : MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>How to Prep This Meal</Text>
          </View>
          <MaterialIcons name={showPrep ? "expand-less" : "expand-more"} size={16} color={MUTED} />
        </TouchableOpacity>

        {showPrep && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {meal.ingredients?.length > 0 && (
              <View style={{ backgroundColor: BG, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8 }}>INGREDIENTS</Text>
                {(Array.isArray(meal.ingredients) ? meal.ingredients : []).map((ing: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: CREAM, marginTop: 5 }} />
                    <Text style={{ color: GOLD, fontSize: 13, flex: 1, lineHeight: 18 }}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}
            {meal.instructions?.length > 0 && (
              <View style={{ backgroundColor: BG, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8 }}>PREP STEPS</Text>
                {(Array.isArray(meal.instructions) ? meal.instructions : []).map((step: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Text style={{ color: BG, fontSize: 11, fontFamily: "DMSans_700Bold" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ color: FG, fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
            {(!meal.ingredients?.length && !meal.instructions?.length) && (
              <View style={{ backgroundColor: BG, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: MUTED, fontSize: 13, textAlign: "center" }}>
                  Regenerate your meal plan to get detailed prep instructions for each meal.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default function PlansScreen() {
  return (
    <ErrorBoundary fallbackScreen="Plans">
      <PlansScreenContent />
    </ErrorBoundary>
  );
}
