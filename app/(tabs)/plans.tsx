import React, { useState, useCallback, useMemo } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator,
  Alert, ImageBackground, Image, Platform, Modal, TextInput, FlatList,
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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BodyHeatmap } from "@/components/body-heatmap";
import { getTodayTargetMuscles } from "@/lib/muscle-balance";
import { usePantry } from "@/lib/pantry-context";
import { useCalories } from "@/lib/calorie-context";
import { PremiumFeatureTeaser } from "@/components/premium-feature-banner";

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

const TABS = ["Workout", "Meal Plan"];

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

function getTodayDayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

export default function PlansScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { isGuest } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;
  const [activeTab, setActiveTab] = useState(0);

  // Workout state
  const [goal, setGoal] = useState("build_muscle");
  const [workoutStyle, setWorkoutStyle] = useState("gym");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [showCustomize, setShowCustomize] = useState(false);

  // Meal plan state
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [mealGoal, setMealGoal] = useState("build_muscle");
  const [ramadanMode, setRamadanMode] = useState(false);
  const [showMealCustomize, setShowMealCustomize] = useState(false);

  const { items: pantryItems } = usePantry();
  const pantryNames = useMemo(() => pantryItems.map(p => p.name), [pantryItems]);
  const { calorieGoal, totalCalories } = useCalories();
  const caloriesRemaining = Math.max(0, calorieGoal - totalCalories);

  // Exercise swap state
  const [swapExModal, setSwapExModal] = useState<{ exercise: any; dayFocus: string } | null>(null);
  const [swapExAlts, setSwapExAlts] = useState<any[]>([]);
  const [swapExLoading, setSwapExLoading] = useState(false);
  const exerciseSwap = trpc.exerciseSwap.generate.useMutation();

  // Meal swap state
  const [swapMealModal, setSwapMealModal] = useState<{ meal: any; dayIndex: number; mealIndex: number } | null>(null);
  const [swapMealAlts, setSwapMealAlts] = useState<any[]>([]);
  const [swapMealLoading, setSwapMealLoading] = useState(false);
  const [includeBeyondPantry, setIncludeBeyondPantry] = useState(true);
  const mealSwap = trpc.mealSwapWithPantry.generate.useMutation();

  const { data: dbWorkoutPlan, refetch: refetchWorkout } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: dbMealPlan, refetch: refetchMeal } = trpc.mealPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: dbProfile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const [localProfile, setLocalProfile] = React.useState<any>(null);
  React.useEffect(() => {
    AsyncStorage.getItem("@guest_profile").then(raw => { if (raw) { try { setLocalProfile(JSON.parse(raw)); } catch {} } });
  }, [isGuest]);
  const activeProfile = isAuthenticated ? dbProfile : localProfile;

  const [localWorkoutPlan, setLocalWorkoutPlan] = useState<any>(null);
  const [localMealPlan, setLocalMealPlan] = useState<any>(null);

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
      AsyncStorage.getItem("@guest_meal_plan").then(raw => {
        if (raw && !localMealPlan) setLocalMealPlan(JSON.parse(raw));
      });
    }
  }, [isGuest]);

  const workoutPlan = isAuthenticated ? dbWorkoutPlan : localWorkoutPlan;
  const mealPlan = isAuthenticated ? dbMealPlan : localMealPlan;

  const generateWorkout = trpc.workoutPlan.generate.useMutation({
    onSuccess: (data) => {
      if (isAuthenticated) refetchWorkout();
      else setLocalWorkoutPlan(data);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const generateMeal = trpc.mealPlan.generate.useMutation({
    onSuccess: (data) => {
      if (isAuthenticated) refetchMeal();
      else setLocalMealPlan(data);
    },
    onError: (e) => Alert.alert("Error", e.message),
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

  const todayMeals = useMemo(() => {
    if (!mealPlan?.days) return null;
    return mealPlan.days.find((d: any) =>
      d.day?.toLowerCase().includes(todayName.toLowerCase())
    ) ?? null;
  }, [mealPlan, todayName]);

  const otherMealDays = useMemo(() => {
    if (!mealPlan?.days) return [];
    return mealPlan.days.filter((d: any) =>
      !d.day?.toLowerCase().includes(todayName.toLowerCase())
    );
  }, [mealPlan, todayName]);

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

  // ── Compute daily calorie target from meal plan ──
  const dailyCalorieTarget = useMemo(() => {
    // Use the calorie goal from calorie context, or derive from profile
    if (calorieGoal && calorieGoal > 0) return calorieGoal;
    return activeProfile?.calorieTarget ?? 2000;
  }, [calorieGoal, activeProfile]);

  // ── Meal Swap Handler ──
  const handleMealSwap = useCallback(async (meal: any, dayIndex: number, mealIndex: number) => {
    setSwapMealModal({ meal, dayIndex, mealIndex });
    setSwapMealAlts([]);
    setSwapMealLoading(true);
    // Calculate remaining calories for this day excluding the meal being swapped
    const dayMeals = mealPlan?.days?.[dayIndex]?.meals ?? [];
    const otherMealsCals = dayMeals.reduce((s: number, m: any, i: number) => i === mealIndex ? s : s + (m.calories ?? 0), 0);
    const remainingForSlot = Math.max(0, dailyCalorieTarget - otherMealsCals);
    try {
      const result = await mealSwap.mutateAsync({
        mealName: meal.name,
        mealType: meal.type ?? "meal",
        calories: meal.calories ?? 400,
        protein: meal.protein ?? 30,
        carbs: meal.carbs ?? 40,
        fat: meal.fat ?? 15,
        dietaryPreference: dietaryPref,
        pantryItems: pantryNames,
        includeBeyondPantry,
        dailyCalorieTarget,
        remainingCalories: remainingForSlot,
      });
      setSwapMealAlts(result.alternatives ?? []);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSwapMealLoading(false);
    }
  }, [mealSwap, dietaryPref, pantryNames, includeBeyondPantry, dailyCalorieTarget, mealPlan]);

  const applyMealSwap = useCallback((newMeal: any) => {
    if (!swapMealModal || !mealPlan?.days) return;
    // Check if this swap would exceed daily calorie limit
    const dayMeals = mealPlan.days[swapMealModal.dayIndex]?.meals ?? [];
    const otherMealsCals = dayMeals.reduce((s: number, m: any, i: number) => i === swapMealModal.mealIndex ? s : s + (m.calories ?? 0), 0);
    const newDayTotal = otherMealsCals + (newMeal.calories ?? 0);
    if (newDayTotal > dailyCalorieTarget) {
      Alert.alert(
        "Exceeds Daily Limit",
        `This swap would bring today's total to ${newDayTotal} kcal (target: ${dailyCalorieTarget} kcal). Swap anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Swap Anyway", style: "destructive", onPress: () => doApplyMealSwap(newMeal) },
        ]
      );
      return;
    }
    doApplyMealSwap(newMeal);
  }, [swapMealModal, mealPlan, isAuthenticated, dailyCalorieTarget]);

  const doApplyMealSwap = useCallback((newMeal: any) => {
    if (!swapMealModal || !mealPlan?.days) return;
    const updatedDays = mealPlan.days.map((day: any, di: number) => {
      if (di !== swapMealModal.dayIndex) return day;
      return {
        ...day,
        meals: day.meals?.map((m: any, mi: number) =>
          mi === swapMealModal.mealIndex ? { ...newMeal, type: swapMealModal.meal.type } : m
        ),
      };
    });
    const updatedPlan = { ...mealPlan, days: updatedDays };
    if (isAuthenticated) {
      setLocalMealPlan(updatedPlan);
    } else {
      setLocalMealPlan(updatedPlan);
      AsyncStorage.setItem("@guest_meal_plan", JSON.stringify(updatedPlan));
    }
    setSwapMealModal(null);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Meal Swapped", `Replaced with ${newMeal.name}`);
  }, [swapMealModal, mealPlan, isAuthenticated]);

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

  // Parallax
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

  // Workout progress stats
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
  const dietLabel = DIETARY_PREFS.find(d => d.key === dietaryPref)?.label ?? dietaryPref;
  const mealGoalLabel = GOALS.find(g => g.key === mealGoal)?.label ?? mealGoal;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Hero Header — NanoBanana flat dark */}
      <View style={{ backgroundColor: BG, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <MaterialIcons name="chevron-left" size={28} color={FG} />
          </TouchableOpacity>
          <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 24, letterSpacing: 3 }}>WORKOUT PLANS</Text>
          <TouchableOpacity onPress={() => router.push("/user-guide" as any)} style={{ padding: 4 }}>
            <MaterialIcons name="more-horiz" size={22} color={MUTED} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar + Exercise Library Button */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, marginBottom: 12, gap: 8 }}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === i ? GOLD : SURFACE, borderWidth: 1, borderColor: activeTab === i ? GOLD : "rgba(30,41,59,0.6)" }}
            onPress={() => setActiveTab(i)}
          >
            <Text style={{ color: activeTab === i ? BG : MUTED, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{tab}</Text>
          </TouchableOpacity>
        ))}
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
      >
        {/* ── Workout Tab ── */}
        {activeTab === 0 && (
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
                {workoutPlan.insight && (
                  <View style={{ backgroundColor: GOLD_DIM, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: GOLD_BORDER }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                      <MaterialIcons name="auto-awesome" size={14} color={GOLD} style={{ marginTop: 2 }} />
                      <Text style={{ color: CREAM, fontSize: 12, lineHeight: 18, flex: 1 }}>{String(workoutPlan.insight)}</Text>
                    </View>
                  </View>
                )}

                {/* ── TODAY'S WORKOUT (highlighted) ── */}
                {todayWorkout && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <MaterialIcons name="today" size={16} color={GOLD} />
                      <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Today — {todayName}</Text>
                    </View>

                    {/* Body Diagram — Today's Target Muscles */}
                    {todayMuscles.primary.length > 0 && !todayWorkout.isRest && (
                      <View style={{ backgroundColor: GOLD_DIM, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: GOLD_BORDER, alignItems: "center" }}>
                        <Text style={{ color: CREAM, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 8, letterSpacing: 0.5 }}>TODAY'S TARGET MUSCLES</Text>
                        <BodyHeatmap
                          gender={userGender}
                          mode="target"
                          targetPrimary={todayMuscles.primary}
                          targetSecondary={todayMuscles.secondary}
                          width={160}
                          height={180}
                          showLabels={true}
                          showLegend={false}
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

                {/* AI Form Check CTA */}
                <TouchableOpacity
                  style={{ backgroundColor: GOLD_DIM, borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: GOLD_BORDER, flexDirection: "row", alignItems: "center", gap: 14 }}
                  onPress={() => router.push("/form-checker" as any)}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="center-focus-strong" size={22} color={BG} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>AI Form Check</Text>
                    <Text style={{ color: MUTED, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Record a set for AI form analysis</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={GOLD} />
                </TouchableOpacity>

                {/* Premium Feature Teasers */}
                <View style={{ gap: 8, marginTop: 10 }}>
                  <PremiumFeatureTeaser
                    feature="ai_coaching"
                    text="Get personalised AI Coach guidance for your workout plan"
                    requiredTier="advanced"
                  />
                  <PremiumFeatureTeaser
                    feature="form_checker"
                    text="Unlock AI Form Check to perfect your exercise technique"
                    requiredTier="advanced"
                  />
                </View>

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
        )}

        {/* ── Meal Plan Tab ── */}
        {activeTab === 1 && (
          <View style={{ paddingHorizontal: 20 }}>
            {!mealPlan ? (
              <>
                <SectionLabel>Your Goal</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {GOALS.map(g => (
                    <OptionChip key={g.key} iconName={g.iconName} label={g.label} selected={mealGoal === g.key} onPress={() => setMealGoal(g.key)} />
                  ))}
                </View>

                <SectionLabel>Dietary Preference</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                  {DIETARY_PREFS.map(d => (
                    <OptionChip key={d.key} iconName={d.iconName} label={d.label} selected={dietaryPref === d.key} onPress={() => setDietaryPref(d.key)} />
                  ))}
                </View>

                {(dietaryPref === "halal" || ramadanMode) && (
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: ramadanMode ? "rgba(245,158,11,0.10)" : SURFACE, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: ramadanMode ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                    onPress={() => setRamadanMode(v => !v)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MaterialIcons name="nightlight-round" size={20} color={GOLD} />
                      <View>
                        <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Ramadan Mode</Text>
                        <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>Suhoor, Iftar & Isha meals</Text>
                      </View>
                    </View>
                    <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: ramadanMode ? GOLD : GOLD_DIM, justifyContent: "center", paddingHorizontal: 2 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: FG, alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                    </View>
                  </TouchableOpacity>
                )}

                <View style={{ backgroundColor: GOLD_DIM, borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: GOLD_BORDER, flexDirection: "row", gap: 8 }}>
                  <MaterialIcons name="warning-amber" size={14} color={CREAM} />
                  <Text style={{ color: CREAM, fontSize: 11, lineHeight: 16, flex: 1 }}>AI plans are for guidance. Consult a nutritionist for major changes.</Text>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateMeal.isPending ? 0.7 : 1 }}
                  onPress={() => generateMeal.mutate({ goal: mealGoal, dietaryPreference: dietaryPref, ramadanMode, weightKg: activeProfile?.weightKg ?? undefined, heightCm: activeProfile?.heightCm ?? undefined, age: activeProfile?.age ?? undefined, gender: activeProfile?.gender ?? undefined, activityLevel: activeProfile?.activityLevel ?? undefined })}
                  disabled={generateMeal.isPending}
                >
                  {generateMeal.isPending ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator color={BG} size="small" />
                      <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Generating Plan...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="auto-awesome" size={16} color={BG} />
                      <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Generate Meal Plan</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* ── Meal Plan Summary Bar ── */}
                <View style={{ backgroundColor: SURFACE, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: "#4ADE80", fontSize: 10, fontFamily: "DMSans_700Bold" }}>ACTIVE</Text>
                      </View>
                      <Text style={{ color: MUTED, fontSize: 11 }}>{mealGoalLabel} · {dietLabel}</Text>
                    </View>
                  </View>
                  {/* Macro summary row */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <MacroCard label="Calories" value={mealPlan.dailyCalories} unit="kcal" color={GOLD} />
                    <MacroCard label="Protein" value={mealPlan.proteinTarget} unit="g" color="#3B82F6" />
                    <MacroCard label="Carbs" value={mealPlan.carbTarget} unit="g" color={CREAM} />
                    <MacroCard label="Fat" value={mealPlan.fatTarget} unit="g" color={GOLD} />
                  </View>
                </View>

                {mealPlan.insight && (
                  <View style={{ backgroundColor: "#22C55E10", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#22C55E30" }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                      <MaterialIcons name="lightbulb" size={14} color={GOLD} style={{ marginTop: 2 }} />
                      <Text style={{ color: GOLD, fontSize: 12, lineHeight: 18, flex: 1 }}>{String(mealPlan.insight)}</Text>
                    </View>
                  </View>
                )}

                {/* ── TODAY'S MEALS (highlighted) ── */}
                {todayMeals && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <MaterialIcons name="today" size={16} color={GOLD} />
                      <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Today — {todayName}</Text>
                    </View>
                    <MealDayCard day={todayMeals} defaultExpanded dayIndex={mealPlan.days?.findIndex((d: any) => d.day?.toLowerCase().includes(todayName.toLowerCase())) ?? 0} onMealSwap={handleMealSwap} />
                  </>
                )}

                {/* ── REST OF THE WEEK ── */}
                {otherMealDays.length > 0 && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 10 }}>
                      <MaterialIcons name="date-range" size={16} color={MUTED} />
                      <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Rest of the Week</Text>
                    </View>
                    {otherMealDays.map((day: any, i: number) => {
                      const actualIndex = mealPlan.days?.findIndex((d: any) => d.day === day.day) ?? i;
                      return <MealDayCard key={i} day={day} dayIndex={actualIndex} onMealSwap={handleMealSwap} />;
                    })}
                  </>
                )}

                {/* Premium Feature Teasers */}
                <View style={{ gap: 8, marginTop: 10 }}>
                  <PremiumFeatureTeaser
                    feature="pantry"
                    text="Unlock Smart Pantry to get meals customised to your ingredients"
                    requiredTier="basic"
                  />
                  <PremiumFeatureTeaser
                    feature="progress_photos"
                    text="AI Photo Logging — snap your meal and auto-track calories"
                    requiredTier="basic"
                  />
                </View>

                {/* Customize / Regenerate (collapsible) */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, paddingVertical: 10 }}
                  onPress={() => setShowMealCustomize(!showMealCustomize)}
                >
                  <MaterialIcons name={showMealCustomize ? "expand-less" : "tune"} size={16} color={MUTED} />
                  <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 12 }}>{showMealCustomize ? "Hide Options" : "Customize & Regenerate"}</Text>
                </TouchableOpacity>

                {showMealCustomize && (
                  <View style={{ marginTop: 8 }}>
                    <SectionLabel>Your Goal</SectionLabel>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {GOALS.map(g => (
                        <OptionChip key={g.key} iconName={g.iconName} label={g.label} selected={mealGoal === g.key} onPress={() => setMealGoal(g.key)} />
                      ))}
                    </View>
                    <SectionLabel>Dietary Preference</SectionLabel>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {DIETARY_PREFS.map(d => (
                        <OptionChip key={d.key} iconName={d.iconName} label={d.label} selected={dietaryPref === d.key} onPress={() => setDietaryPref(d.key)} />
                      ))}
                    </View>
                    {(dietaryPref === "halal" || ramadanMode) && (
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: ramadanMode ? "rgba(245,158,11,0.10)" : SURFACE, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: ramadanMode ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                        onPress={() => setRamadanMode(v => !v)}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <MaterialIcons name="nightlight-round" size={20} color={GOLD} />
                          <View>
                            <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Ramadan Mode</Text>
                            <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>Suhoor, Iftar & Isha meals</Text>
                          </View>
                        </View>
                        <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: ramadanMode ? GOLD : GOLD_DIM, justifyContent: "center", paddingHorizontal: 2 }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: FG, alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                        </View>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: GOLD_BORDER, flexDirection: "row", justifyContent: "center", gap: 8, opacity: generateMeal.isPending ? 0.7 : 1 }}
                      onPress={() => {
                        Alert.alert("Regenerate Meal Plan?", "This will replace your current plan.", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Regenerate", style: "destructive", onPress: () => generateMeal.mutate({ goal: mealGoal, dietaryPreference: dietaryPref, ramadanMode, weightKg: activeProfile?.weightKg ?? undefined, heightCm: activeProfile?.heightCm ?? undefined, age: activeProfile?.age ?? undefined, gender: activeProfile?.gender ?? undefined, activityLevel: activeProfile?.activityLevel ?? undefined }) },
                        ]);
                      }}
                      disabled={generateMeal.isPending}
                    >
                      {generateMeal.isPending ? (
                        <>
                          <ActivityIndicator color={GOLD} size="small" />
                          <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Regenerating...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="refresh" size={16} color={GOLD} />
                          <Text style={{ color: GOLD, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Regenerate Meal Plan</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        )}
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

      {/* ── Meal Swap Modal ── */}
      <Modal visible={!!swapMealModal} transparent animationType="slide" onRequestClose={() => setSwapMealModal(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", paddingBottom: 40 }}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(30,41,59,0.6)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#22D3EE", fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1 }}>AI MEAL SWAP</Text>
                  <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 16, marginTop: 2 }}>Replace: {swapMealModal?.meal?.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setSwapMealModal(null)} style={{ padding: 8 }}>
                  <MaterialIcons name="close" size={22} color={MUTED} />
                </TouchableOpacity>
              </View>
              {/* Daily calorie budget banner */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, backgroundColor: BG, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: GOLD_BORDER }}>
                <MaterialIcons name="local-fire-department" size={16} color={GOLD} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: FG, fontSize: 12, fontFamily: "DMSans_600SemiBold" }}>Daily Budget: {dailyCalorieTarget} kcal</Text>
                  <View style={{ height: 4, backgroundColor: "rgba(30,41,59,0.6)", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: totalCalories > dailyCalorieTarget ? "#F87171" : GOLD, width: `${Math.min(100, (totalCalories / dailyCalorieTarget) * 100)}%` }} />
                  </View>
                  <Text style={{ color: MUTED, fontSize: 10, marginTop: 3 }}>{totalCalories} / {dailyCalorieTarget} kcal consumed today</Text>
                </View>
              </View>
              {/* Pantry toggle */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, backgroundColor: BG, borderRadius: 12, padding: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="kitchen" size={16} color={GOLD} />
                  <View>
                    <Text style={{ color: FG, fontSize: 13, fontFamily: "DMSans_600SemiBold" }}>Use Pantry Items</Text>
                    <Text style={{ color: MUTED, fontSize: 11 }}>{pantryNames.length} items available</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: includeBeyondPantry ? "#22D3EE" : GOLD_DIM, justifyContent: "center", paddingHorizontal: 2 }}
                  onPress={() => setIncludeBeyondPantry(v => !v)}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: FG, alignSelf: includeBeyondPantry ? "flex-end" : "flex-start" }} />
                </TouchableOpacity>
              </View>
              <Text style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>{includeBeyondPantry ? "Showing pantry + other alternatives" : "Only showing pantry-based alternatives"}</Text>
            </View>
            {swapMealLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#22D3EE" />
                <Text style={{ color: MUTED, marginTop: 12, fontSize: 13 }}>AI is finding meal alternatives...</Text>
              </View>
            ) : (
              <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                {swapMealAlts.length === 0 ? (
                  <Text style={{ color: MUTED, textAlign: "center", padding: 20 }}>No alternatives found. Try again.</Text>
                ) : (
                  swapMealAlts.map((alt: any, i: number) => {
                    const exceedsLimit = alt.exceedsLimit || false;
                    const mealPhotoUrl = getMealPhotoUrl({ name: alt.name, type: alt.photoQuery ?? alt.name });
                    return (
                      <View key={i} style={{ backgroundColor: BG, borderRadius: 14, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: exceedsLimit ? "rgba(248,113,113,0.3)" : alt.usesPantry ? "rgba(34,211,238,0.25)" : "rgba(30,41,59,0.6)" }}>
                        {/* Meal image */}
                        <Image
                          source={{ uri: mealPhotoUrl }}
                          style={{ width: "100%", height: 100 }}
                          resizeMode="cover"
                        />
                        {exceedsLimit && (
                          <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(248,113,113,0.9)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <MaterialIcons name="warning" size={10} color="#0A0E14" />
                            <Text style={{ color: "#0A0E14", fontSize: 9, fontFamily: "DMSans_700Bold" }}>EXCEEDS LIMIT</Text>
                          </View>
                        )}
                        {alt.usesPantry && (
                          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "rgba(34,211,238,0.85)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ color: "#0A0E14", fontSize: 9, fontFamily: "DMSans_700Bold" }}>PANTRY</Text>
                          </View>
                        )}
                        <View style={{ padding: 14 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{alt.name}</Text>
                              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                                <Text style={{ color: exceedsLimit ? "#F87171" : GOLD, fontSize: 11, fontFamily: "SpaceMono_700Bold" }}>{alt.calories} kcal</Text>
                                <Text style={{ color: "#3B82F6", fontSize: 11 }}>P:{alt.protein}g</Text>
                                <Text style={{ color: CREAM, fontSize: 11 }}>C:{alt.carbs}g</Text>
                                <Text style={{ color: GOLD, fontSize: 11 }}>F:{alt.fat}g</Text>
                              </View>
                              {alt.prepTime && <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>⏱ {alt.prepTime}</Text>}
                            </View>
                            <TouchableOpacity
                              style={{ backgroundColor: exceedsLimit ? "rgba(248,113,113,0.8)" : "#22D3EE", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
                              onPress={() => applyMealSwap(alt)}
                            >
                              <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Select</Text>
                            </TouchableOpacity>
                          </View>
                          {alt.description && <Text style={{ color: MUTED, fontSize: 11, marginTop: 6, lineHeight: 16 }}>{alt.description}</Text>}
                          {alt.pantryItemsUsed?.length > 0 && (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                              {alt.pantryItemsUsed.map((item: string, j: number) => (
                                <View key={j} style={{ backgroundColor: "rgba(34,211,238,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <Text style={{ color: "#22D3EE", fontSize: 10 }}>{item}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
            <ExercisePreviewCard key={idx} exercise={ex} onSwap={onExerciseSwap ? () => onExerciseSwap(ex, day.focus ?? day.day) : undefined} />
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

function ExercisePreviewCard({ exercise, onSwap }: { exercise: any; onSwap?: () => void }) {
  const [showVideo, setShowVideo] = useState(false);
  const demo = getExerciseDemo(exercise.name ?? "");

  return (
    <View style={{ backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)", overflow: "hidden" }}>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{exercise.name}</Text>
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
        <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 15, marginBottom: 6 }}>{meal.name}</Text>
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
                {meal.ingredients.map((ing: string, i: number) => (
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
                {meal.instructions.map((step: string, i: number) => (
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
