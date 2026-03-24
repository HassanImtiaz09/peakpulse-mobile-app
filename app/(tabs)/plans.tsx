import React, { useState, useCallback, useMemo } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator,
  Alert, ImageBackground, Image, Platform,
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
import { YouTubePlayer } from "@/components/youtube-player";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { exportWorkoutPlanPdf } from "@/lib/workout-pdf";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BodyHeatmap } from "@/components/body-heatmap";
import { getTodayTargetMuscles } from "@/lib/muscle-balance";

const WORKOUT_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/yauqLuTRvanJUzsJ.jpg";
const MEAL_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/yauqLuTRvanJUzsJ.jpg";

const MEAL_PHOTO_MAP: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80",
  "morning snack": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80",
  lunch: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  "afternoon snack": "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  dinner: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  snack: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
};

function getMealPhotoUrl(meal: any): string {
  if (meal.photoQuery) {
    const query = encodeURIComponent(meal.photoQuery);
    return `https://source.unsplash.com/400x300/?${query},food`;
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

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
        <ImageBackground source={{ uri: WORKOUT_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.8)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <MaterialIcons name="fitness-center" size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Unlock Your Plans</Text>
            <Text style={{ color: "#B45309", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to get started.</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
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
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero Header with Parallax */}
      <View style={{ width: "100%", height: 140, overflow: "hidden" }}>
        <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height: 240 }, heroImageStyle]}>
          <ImageBackground source={{ uri: activeTab === 1 ? MEAL_BG : WORKOUT_BG }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </Animated.View>
        <Animated.View style={[{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }, heroContentStyle]}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, right: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
            onPress={() => router.push("/user-guide" as any)}
          >
            <MaterialIcons name="help-outline" size={14} color="#FBBF24" />
            <Text style={{ color: "#FBBF24", fontFamily: "DMSans_500Medium", fontSize: 11 }}>Guide</Text>
          </TouchableOpacity>
          <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>AI-POWERED</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 24, letterSpacing: -0.5 }}>Your Plans</Text>
        </Animated.View>
      </View>

      {/* Tab Bar + Exercise Library Button */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, marginTop: 10, marginBottom: 12, gap: 8 }}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === i ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: activeTab === i ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
            onPress={() => setActiveTab(i)}
          >
            <Text style={{ color: activeTab === i ? "#FFF7ED" : "#B45309", fontFamily: "Outfit_700Bold", fontSize: 13 }}>{tab}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", backgroundColor: "#150A00", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexDirection: "row", gap: 4 }}
          onPress={() => router.push("/exercise-library" as any)}
        >
          <MaterialIcons name="menu-book" size={16} color="#F59E0B" />
          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>Library</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexDirection: "row", gap: 4 }}
          onPress={() => router.push("/create-workout" as any)}
        >
          <MaterialIcons name="add-circle-outline" size={16} color="#F59E0B" />
          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>Create</Text>
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

                <View style={{ backgroundColor: "#FBBF2410", borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "#FBBF2430", flexDirection: "row", gap: 8 }}>
                  <MaterialIcons name="warning-amber" size={14} color="#FCD34D" />
                  <Text style={{ color: "#FCD34D", fontSize: 11, lineHeight: 16, flex: 1 }}>AI plans are for guidance. Consult a professional before starting.</Text>
                </View>

                <SectionLabel>Days Per Week</SectionLabel>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                  {DAYS_OPTIONS.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: daysPerWeek === d ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                      onPress={() => setDaysPerWeek(d)}
                    >
                      <Text style={{ color: daysPerWeek === d ? "#FFF7ED" : "#B45309", fontFamily: "Outfit_700Bold" }}>{d}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateWorkout.isPending ? 0.7 : 1 }}
                  onPress={() => generateWorkout.mutate({ goal, workoutStyle, daysPerWeek })}
                  disabled={generateWorkout.isPending}
                >
                  {generateWorkout.isPending ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator color="#FFF7ED" size="small" />
                      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Generating Plan...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="auto-awesome" size={16} color="#FFF7ED" />
                      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Generate Workout Plan</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* ── Plan Summary Bar ── */}
                <View style={{ backgroundColor: "#150A00", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <View style={{ backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: "#4ADE80", fontSize: 10, fontFamily: "Outfit_700Bold" }}>ACTIVE</Text>
                      </View>
                      <Text style={{ color: "#B45309", fontSize: 11 }}>{goalLabel} · {styleLabel} · {daysPerWeek}x/wk</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      {workoutStats && (
                        <Text style={{ color: "#FBBF24", fontSize: 12, fontFamily: "Outfit_700Bold" }}>
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
                      style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 8, padding: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" }}
                    >
                      <MaterialIcons name="picture-as-pdf" size={16} color="#FBBF24" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={resetWeekProgress}
                      style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 8, padding: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" }}
                    >
                      <MaterialIcons name="restart-alt" size={16} color="#FBBF24" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Compact progress bar */}
                {workoutStats && (
                  <View style={{ height: 4, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: workoutStats.pct >= 1 ? "#22C55E" : "#F59E0B", width: `${Math.round(workoutStats.pct * 100)}%` }} />
                  </View>
                )}

                {/* AI Insight */}
                {workoutPlan.insight && (
                  <View style={{ backgroundColor: "#7C3AED10", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                      <MaterialIcons name="auto-awesome" size={14} color="#FBBF24" style={{ marginTop: 2 }} />
                      <Text style={{ color: "#FBBF24", fontSize: 12, lineHeight: 18, flex: 1 }}>{String(workoutPlan.insight)}</Text>
                    </View>
                  </View>
                )}

                {/* ── TODAY'S WORKOUT (highlighted) ── */}
                {todayWorkout && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <MaterialIcons name="today" size={16} color="#FBBF24" />
                      <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Today — {todayName}</Text>
                    </View>

                    {/* Body Diagram — Today's Target Muscles */}
                    {todayMuscles.primary.length > 0 && !todayWorkout.isRest && (
                      <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", alignItems: "center" }}>
                        <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8, letterSpacing: 0.5 }}>TODAY'S TARGET MUSCLES</Text>
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
                    />
                  </>
                )}

                {/* ── REST OF THE WEEK ── */}
                {otherWorkoutDays.length > 0 && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 10 }}>
                      <MaterialIcons name="date-range" size={16} color="#B45309" />
                      <Text style={{ color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Rest of the Week</Text>
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
                      />
                    ))}
                  </>
                )}

                {/* AI Form Check CTA */}
                <TouchableOpacity
                  style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexDirection: "row", alignItems: "center", gap: 14 }}
                  onPress={() => router.push("/form-checker" as any)}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="center-focus-strong" size={22} color="#FFF7ED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>AI Form Check</Text>
                    <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Record a set for AI form analysis</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#F59E0B" />
                </TouchableOpacity>

                {/* Customize / Regenerate (collapsible) */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, paddingVertical: 10 }}
                  onPress={() => setShowCustomize(!showCustomize)}
                >
                  <MaterialIcons name={showCustomize ? "expand-less" : "tune"} size={16} color="#B45309" />
                  <Text style={{ color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 12 }}>{showCustomize ? "Hide Options" : "Customize & Regenerate"}</Text>
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
                          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: daysPerWeek === d ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                          onPress={() => setDaysPerWeek(d)}
                        >
                          <Text style={{ color: daysPerWeek === d ? "#FFF7ED" : "#B45309", fontFamily: "Outfit_700Bold" }}>{d}x</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexDirection: "row", justifyContent: "center", gap: 8, opacity: generateWorkout.isPending ? 0.7 : 1 }}
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
                          <ActivityIndicator color="#F59E0B" size="small" />
                          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Regenerating...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="refresh" size={16} color="#F59E0B" />
                          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Regenerate Workout Plan</Text>
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
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: ramadanMode ? "rgba(245,158,11,0.10)" : "#150A00", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: ramadanMode ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                    onPress={() => setRamadanMode(v => !v)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MaterialIcons name="nightlight-round" size={20} color="#FBBF24" />
                      <View>
                        <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Ramadan Mode</Text>
                        <Text style={{ color: "#B45309", fontSize: 11, marginTop: 2 }}>Suhoor, Iftar & Isha meals</Text>
                      </View>
                    </View>
                    <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: ramadanMode ? "#F59E0B" : "rgba(245,158,11,0.15)", justifyContent: "center", paddingHorizontal: 2 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF7ED", alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                    </View>
                  </TouchableOpacity>
                )}

                <View style={{ backgroundColor: "#FBBF2410", borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "#FBBF2430", flexDirection: "row", gap: 8 }}>
                  <MaterialIcons name="warning-amber" size={14} color="#FCD34D" />
                  <Text style={{ color: "#FCD34D", fontSize: 11, lineHeight: 16, flex: 1 }}>AI plans are for guidance. Consult a nutritionist for major changes.</Text>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: "#FDE68A", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateMeal.isPending ? 0.7 : 1 }}
                  onPress={() => generateMeal.mutate({ goal: mealGoal, dietaryPreference: dietaryPref, ramadanMode, weightKg: activeProfile?.weightKg ?? undefined, heightCm: activeProfile?.heightCm ?? undefined, age: activeProfile?.age ?? undefined, gender: activeProfile?.gender ?? undefined, activityLevel: activeProfile?.activityLevel ?? undefined })}
                  disabled={generateMeal.isPending}
                >
                  {generateMeal.isPending ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator color="#FFF7ED" size="small" />
                      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Generating Plan...</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="auto-awesome" size={16} color="#FFF7ED" />
                      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Generate Meal Plan</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* ── Meal Plan Summary Bar ── */}
                <View style={{ backgroundColor: "#150A00", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: "#4ADE80", fontSize: 10, fontFamily: "Outfit_700Bold" }}>ACTIVE</Text>
                      </View>
                      <Text style={{ color: "#B45309", fontSize: 11 }}>{mealGoalLabel} · {dietLabel}</Text>
                    </View>
                  </View>
                  {/* Macro summary row */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <MacroCard label="Calories" value={mealPlan.dailyCalories} unit="kcal" color="#FBBF24" />
                    <MacroCard label="Protein" value={mealPlan.proteinTarget} unit="g" color="#3B82F6" />
                    <MacroCard label="Carbs" value={mealPlan.carbTarget} unit="g" color="#FDE68A" />
                    <MacroCard label="Fat" value={mealPlan.fatTarget} unit="g" color="#FBBF24" />
                  </View>
                </View>

                {mealPlan.insight && (
                  <View style={{ backgroundColor: "#22C55E10", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#22C55E30" }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                      <MaterialIcons name="lightbulb" size={14} color="#FBBF24" style={{ marginTop: 2 }} />
                      <Text style={{ color: "#FBBF24", fontSize: 12, lineHeight: 18, flex: 1 }}>{String(mealPlan.insight)}</Text>
                    </View>
                  </View>
                )}

                {/* ── TODAY'S MEALS (highlighted) ── */}
                {todayMeals && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <MaterialIcons name="today" size={16} color="#FBBF24" />
                      <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Today — {todayName}</Text>
                    </View>
                    <MealDayCard day={todayMeals} defaultExpanded />
                  </>
                )}

                {/* ── REST OF THE WEEK ── */}
                {otherMealDays.length > 0 && (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 10 }}>
                      <MaterialIcons name="date-range" size={16} color="#B45309" />
                      <Text style={{ color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Rest of the Week</Text>
                    </View>
                    {otherMealDays.map((day: any, i: number) => (
                      <MealDayCard key={i} day={day} />
                    ))}
                  </>
                )}

                {/* Customize / Regenerate (collapsible) */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, paddingVertical: 10 }}
                  onPress={() => setShowMealCustomize(!showMealCustomize)}
                >
                  <MaterialIcons name={showMealCustomize ? "expand-less" : "tune"} size={16} color="#B45309" />
                  <Text style={{ color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 12 }}>{showMealCustomize ? "Hide Options" : "Customize & Regenerate"}</Text>
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
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: ramadanMode ? "rgba(245,158,11,0.10)" : "#150A00", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: ramadanMode ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                        onPress={() => setRamadanMode(v => !v)}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <MaterialIcons name="nightlight-round" size={20} color="#FBBF24" />
                          <View>
                            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Ramadan Mode</Text>
                            <Text style={{ color: "#B45309", fontSize: 11, marginTop: 2 }}>Suhoor, Iftar & Isha meals</Text>
                          </View>
                        </View>
                        <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: ramadanMode ? "#F59E0B" : "rgba(245,158,11,0.15)", justifyContent: "center", paddingHorizontal: 2 }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF7ED", alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                        </View>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexDirection: "row", justifyContent: "center", gap: 8, opacity: generateMeal.isPending ? 0.7 : 1 }}
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
                          <ActivityIndicator color="#F59E0B" size="small" />
                          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Regenerating...</Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="refresh" size={16} color="#F59E0B" />
                          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Regenerate Meal Plan</Text>
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
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{children}</Text>;
}

function OptionChip({ iconName, label, selected, onPress }: { iconName: string; label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: selected ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: selected ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
      onPress={onPress}
    >
      <MaterialIcons name={iconName as any} size={14} color={selected ? "#FFF7ED" : "#B45309"} />
      <Text style={{ color: selected ? "#FFF7ED" : "#B45309", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MacroCard({ label, value, unit, color }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500", borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: color + "30" }}>
      <Text style={{ color, fontFamily: "Outfit_800ExtraBold", fontSize: 14 }}>{value ?? "—"}</Text>
      <Text style={{ color: "#B45309", fontSize: 9, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: "#B45309", fontSize: 9, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function WorkoutDayCard({ day, onPress, isCompleted, onToggleComplete, isToday }: { day: any; onPress: () => void; isCompleted?: boolean; onToggleComplete?: () => void; isToday?: boolean }) {
  const [expanded, setExpanded] = useState(!!isToday);
  return (
    <View style={{ backgroundColor: isCompleted ? "rgba(34,197,94,0.06)" : isToday ? "rgba(245,158,11,0.06)" : "#150A00", borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: isCompleted ? "rgba(34,197,94,0.25)" : isToday ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.10)", overflow: "hidden" }}>
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
                  backgroundColor: isCompleted ? "#22C55E" : "rgba(245,158,11,0.10)",
                  alignItems: "center", justifyContent: "center",
                  borderWidth: isCompleted ? 0 : 1, borderColor: "rgba(245,158,11,0.20)",
                }}
              >
                <MaterialIcons name={isCompleted ? "check" : "fitness-center"} size={16} color={isCompleted ? "#FFF7ED" : "#F59E0B"} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name={day.isRest ? "bedtime" : "fitness-center"} size={16} color={day.isRest ? "#FDE68A" : "#F59E0B"} />
              </View>
            )}
            <View>
              <Text style={{ color: isCompleted ? "#22C55E" : "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, textDecorationLine: isCompleted ? "line-through" : "none" }}>{day.day}</Text>
              <Text style={{ color: isCompleted ? "#4ADE80" : (day.isRest ? "#FDE68A" : "#FBBF24"), fontSize: 12 }}>{isCompleted ? "Completed" : day.focus}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!day.isRest && <Text style={{ color: "#B45309", fontSize: 12 }}>{day.exercises?.length ?? 0} exercises</Text>}
            <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={18} color="#B45309" />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && !day.isRest && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
          <TouchableOpacity
            style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 10, alignItems: "center", marginBottom: 4 }}
            onPress={onPress}
          >
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 13 }}>START WORKOUT →</Text>
          </TouchableOpacity>
          {day.exercises?.map((ex: any, idx: number) => (
            <ExercisePreviewCard key={idx} exercise={ex} />
          ))}
        </View>
      )}

      {expanded && day.isRest && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ color: "#FDE68A", fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 18 }}>
            Rest day — focus on recovery, stretching, and light movement. Your muscles grow during rest!
          </Text>
        </View>
      )}
    </View>
  );
}

function ExercisePreviewCard({ exercise }: { exercise: any }) {
  const [showVideo, setShowVideo] = useState(false);
  const demo = getExerciseDemo(exercise.name ?? "");

  return (
    <View style={{ backgroundColor: "#0A0500", borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)", overflow: "hidden" }}>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{exercise.name}</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <Text style={{ color: "#FBBF24", fontSize: 12 }}>{exercise.sets} sets</Text>
              <Text style={{ color: "#FDE68A", fontSize: 12 }}>{exercise.reps} reps</Text>
              {exercise.rest && <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><MaterialIcons name="timer" size={11} color="#B45309" /><Text style={{ color: "#B45309", fontSize: 12 }}>{exercise.rest}</Text></View>}
            </View>
            {exercise.muscleGroup && (
              <View style={{ marginTop: 4, alignSelf: "flex-start", backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: "#B45309", fontSize: 10 }}>{exercise.muscleGroup}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={{ backgroundColor: showVideo ? "#F59E0B" : "rgba(245,158,11,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" }}
            onPress={() => setShowVideo(!showVideo)}
          >
            <Text style={{ color: showVideo ? "#FFF7ED" : "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>{showVideo ? "Hide" : "Demo"}</Text>
          </TouchableOpacity>
        </View>
        {exercise.notes && (
          <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-start", marginTop: 6 }}><MaterialIcons name="lightbulb" size={11} color="#B45309" style={{ marginTop: 2 }} /><Text style={{ color: "#B45309", fontSize: 11, lineHeight: 15, flex: 1 }}>{exercise.notes}</Text></View>
        )}
      </View>
      {showVideo && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <YouTubePlayer videoId={demo.videoId} cue={demo.cue} gifUrl={demo.gifUrl} height={160} />
        </View>
      )}
    </View>
  );
}

function MealDayCard({ day, defaultExpanded }: { day: any; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const dayCalories = day.meals?.reduce((s: number, m: any) => s + (m.calories ?? 0), 0) ?? 0;
  return (
    <View style={{ backgroundColor: defaultExpanded ? "rgba(245,158,11,0.06)" : "#150A00", borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: defaultExpanded ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.10)", overflow: "hidden" }}>
      <TouchableOpacity
        style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="calendar-today" size={16} color="#F59E0B" />
          </View>
          <View>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>{day.day}</Text>
            <Text style={{ color: "#B45309", fontSize: 12 }}>{day.meals?.length ?? 0} meals</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#FBBF24", fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{dayCalories} kcal</Text>
          <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={18} color="#B45309" style={{ marginTop: 2 }} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
          {day.meals?.map((meal: any, i: number) => (
            <MealCard key={i} meal={meal} />
          ))}
        </View>
      )}
    </View>
  );
}

function MealCard({ meal }: { meal: any }) {
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
    <View style={{ backgroundColor: "#150A00", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
      <Image
        source={{ uri: photoUrl }}
        style={{ width: "100%", height: 140 }}
        resizeMode="cover"
      />
      <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: color, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: "#FFF7ED", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "uppercase" }}>{meal.type ?? "Meal"}</Text>
      </View>
      <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: "#FBBF24", fontSize: 11, fontFamily: "Outfit_700Bold" }}>{meal.calories} kcal</Text>
      </View>

      <View style={{ padding: 14 }}>
        <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 6 }}>{meal.name}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
          <Text style={{ color: "#3B82F6", fontSize: 12 }}>P: {meal.protein}g</Text>
          <Text style={{ color: "#FDE68A", fontSize: 12 }}>C: {meal.carbs}g</Text>
          <Text style={{ color: "#FBBF24", fontSize: 12 }}>F: {meal.fat}g</Text>
          {meal.prepTime && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <MaterialIcons name="timer" size={11} color="#B45309" />
              <Text style={{ color: "#B45309", fontSize: 12 }}>{meal.prepTime}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: showPrep ? "#22C55E15" : "#0A0500", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: showPrep ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.08)" }}
          onPress={() => setShowPrep(!showPrep)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons name="restaurant" size={16} color={showPrep ? "#FBBF24" : "#B45309"} />
            <Text style={{ color: showPrep ? "#FBBF24" : "#B45309", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>How to Prep This Meal</Text>
          </View>
          <MaterialIcons name={showPrep ? "expand-less" : "expand-more"} size={16} color="#B45309" />
        </TouchableOpacity>

        {showPrep && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {meal.ingredients?.length > 0 && (
              <View style={{ backgroundColor: "#0A0500", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>INGREDIENTS</Text>
                {meal.ingredients.map((ing: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FDE68A", marginTop: 5 }} />
                    <Text style={{ color: "#F59E0B", fontSize: 13, flex: 1, lineHeight: 18 }}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}
            {meal.instructions?.length > 0 && (
              <View style={{ backgroundColor: "#0A0500", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>PREP STEPS</Text>
                {meal.instructions.map((step: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Text style={{ color: "#FFF7ED", fontSize: 11, fontFamily: "Outfit_700Bold" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ color: "#F59E0B", fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
            {(!meal.ingredients?.length && !meal.instructions?.length) && (
              <View style={{ backgroundColor: "#0A0500", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#B45309", fontSize: 13, textAlign: "center" }}>
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
