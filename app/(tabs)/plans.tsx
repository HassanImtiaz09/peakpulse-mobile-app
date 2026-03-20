import React, { useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator,
  Alert, ImageBackground, Image, Platform,
} from "react-native";
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

const WORKOUT_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/yauqLuTRvanJUzsJ.jpg";
const MEAL_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/yauqLuTRvanJUzsJ.jpg";

// Unsplash food photo URLs by meal type / keyword — used as fallback when AI doesn't return a photo
const MEAL_PHOTO_MAP: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80",
  "morning snack": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80",
  lunch: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  "afternoon snack": "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  dinner: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  snack: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
};

// Build a food photo URL from a search query using Unsplash source
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
  { key: "build_muscle", label: "Build Muscle", icon: "💪" },
  { key: "lose_fat", label: "Lose Fat", icon: "🔥" },
  { key: "maintain", label: "Maintain", icon: "⚖️" },
  { key: "athletic", label: "Athletic", icon: "🏃" },
];

const WORKOUT_STYLES = [
  { key: "gym", label: "Gym", icon: "🏋️" },
  { key: "home", label: "Home", icon: "🏠" },
  { key: "mix", label: "Mix", icon: "🔄" },
  { key: "calisthenics", label: "Calisthenics", icon: "🤸" },
];

const DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", icon: "🍗" },
  { key: "halal", label: "Halal", icon: "☪️" },
  { key: "vegan", label: "Vegan", icon: "🌱" },
  { key: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { key: "keto", label: "Keto", icon: "🥑" },
  { key: "paleo", label: "Paleo", icon: "🥩" },
];

const DAYS_OPTIONS = [3, 4, 5, 6];

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

  // Meal plan state
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [mealGoal, setMealGoal] = useState("build_muscle");
  const [ramadanMode, setRamadanMode] = useState(false);

  const { data: dbWorkoutPlan, refetch: refetchWorkout } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: dbMealPlan, refetch: refetchMeal } = trpc.mealPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: dbProfile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const [localProfile, setLocalProfile] = React.useState<any>(null);
  React.useEffect(() => {
    AsyncStorage.getItem("@guest_profile").then(raw => { if (raw) { try { setLocalProfile(JSON.parse(raw)); } catch {} } });
  }, [isGuest]);
  const activeProfile = isAuthenticated ? dbProfile : localProfile;

  // Local state for guest-generated plans (not saved to DB)
  const [localWorkoutPlan, setLocalWorkoutPlan] = useState<any>(null);
  const [localMealPlan, setLocalMealPlan] = useState<any>(null);

  // Workout completion tracking
  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>({});

  // Load completed days from AsyncStorage
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

  // Load guest plans from AsyncStorage on mount (set by scan flow)
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

  // Use DB plan for authenticated users, local state for guests
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

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
        <ImageBackground source={{ uri: WORKOUT_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.8)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🏋️</Text>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Unlock Your Plans</Text>
            <Text style={{ color: "#92400E", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to generate AI-powered workout and meal plans.</Text>
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

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero Header */}
      <ImageBackground source={{ uri: activeTab === 1 ? MEAL_BG : WORKOUT_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, right: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
            onPress={() => router.push("/user-guide" as any)}
          >
            <Text style={{ color: "#FBBF24", fontSize: 13 }}>?</Text>
            <Text style={{ color: "#FBBF24", fontFamily: "DMSans_500Medium", fontSize: 11 }}>Guide</Text>
          </TouchableOpacity>
          <Text style={{ color: activeTab === 0 ? "#FBBF24" : "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>AI-POWERED</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>Your Plans</Text>
        </View>
      </ImageBackground>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, marginTop: 12, marginBottom: 16, gap: 8 }}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === i ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: activeTab === i ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
            onPress={() => setActiveTab(i)}
          >
            <Text style={{ color: activeTab === i ? "#FFF7ED" : "#92400E", fontFamily: "Outfit_700Bold", fontSize: 13 }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* ── Workout Tab ── */}
        {activeTab === 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <SectionLabel>Your Goal</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {GOALS.map(g => (
                <OptionChip key={g.key} icon={g.icon} label={g.label} selected={goal === g.key} onPress={() => setGoal(g.key)} />
              ))}
            </View>

            <SectionLabel>Workout Style</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {WORKOUT_STYLES.map(w => (
                <OptionChip key={w.key} icon={w.icon} label={w.label} selected={workoutStyle === w.key} onPress={() => setWorkoutStyle(w.key)} />
              ))}
            </View>

            {/* AI Disclaimer for Workout */}
            <View style={{ backgroundColor: "#FBBF2410", borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "#FBBF2430", flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 14 }}>⚠️</Text>
              <Text style={{ color: "#FCD34D", fontSize: 11, lineHeight: 16, flex: 1 }}>AI-generated plans are for guidance only. Consult a fitness professional before starting a new exercise programme, especially if you have injuries or health conditions.</Text>
            </View>

            <SectionLabel>Days Per Week</SectionLabel>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
              {DAYS_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: daysPerWeek === d ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={{ color: daysPerWeek === d ? "#FFF7ED" : "#92400E", fontFamily: "Outfit_700Bold" }}>{d}x</Text>
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
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>✨ Generate Workout Plan</Text>
              )}
            </TouchableOpacity>

            {/* Active Workout Plan */}
            {workoutPlan && (
              <View>
                {/* Weekly Progress Ring */}
                {(() => {
                  const schedule = workoutPlan.schedule ?? [];
                  const workoutDays = schedule.filter((d: any) => !d.isRest);
                  const totalWorkoutDays = workoutDays.length;
                  const completedCount = workoutDays.filter((d: any) => completedDays[d.day]).length;
                  const pct = totalWorkoutDays > 0 ? completedCount / totalWorkoutDays : 0;
                  const size = 100;
                  const strokeWidth = 8;
                  const radius = (size - strokeWidth) / 2;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference * (1 - pct);
                  return (
                    <View style={{ backgroundColor: "#150A00", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                        {/* Progress Ring */}
                        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
                          <Svg width={size} height={size}>
                            <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(245,158,11,0.10)" strokeWidth={strokeWidth} fill="none" />
                            <Circle cx={size / 2} cy={size / 2} r={radius} stroke={pct >= 1 ? "#22C55E" : "#F59E0B"} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={strokeDashoffset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
                          </Svg>
                          <View style={{ position: "absolute", alignItems: "center" }}>
                            <Text style={{ color: pct >= 1 ? "#22C55E" : "#FBBF24", fontFamily: "Outfit_800ExtraBold", fontSize: 22 }}>{Math.round(pct * 100)}%</Text>
                          </View>
                        </View>
                        {/* Stats */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 4 }}>Weekly Progress</Text>
                          <Text style={{ color: "#FBBF24", fontSize: 13, marginBottom: 2 }}>{completedCount} of {totalWorkoutDays} workouts done</Text>
                          <Text style={{ color: "#92400E", fontSize: 11, lineHeight: 16 }}>
                            {pct >= 1 ? "All workouts complete! Great week!" : pct >= 0.5 ? "Over halfway — keep going!" : "Tap a day below to mark it done."}
                          </Text>
                          <TouchableOpacity onPress={resetWeekProgress} style={{ marginTop: 8, alignSelf: "flex-start" }}>
                            <Text style={{ color: "#78350F", fontSize: 11, fontFamily: "Outfit_700Bold" }}>Reset Week</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Current Plan</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        exportWorkoutPlanPdf(workoutPlan, user?.name || (isGuest ? "Guest" : undefined));
                      }}
                      activeOpacity={0.7}
                      style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" }}
                    >
                      <Text style={{ fontSize: 12 }}>📄</Text>
                      <Text style={{ color: "#FBBF24", fontSize: 11, fontFamily: "Outfit_700Bold" }}>Export PDF</Text>
                    </TouchableOpacity>
                    <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: "#FDE68A", fontSize: 11, fontFamily: "Outfit_700Bold" }}>ACTIVE</Text>
                    </View>
                  </View>
                </View>
                {/* Regenerate Workout Plan Button */}
                <TouchableOpacity
                  style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexDirection: "row", justifyContent: "center", gap: 8, opacity: generateWorkout.isPending ? 0.7 : 1 }}
                  onPress={() => {
                    Alert.alert(
                      "Regenerate Workout Plan?",
                      "This will replace your current workout plan with a new AI-generated one based on your selected preferences.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Regenerate",
                          style: "destructive",
                          onPress: () => generateWorkout.mutate({ goal, workoutStyle, daysPerWeek }),
                        },
                      ]
                    );
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
                      <Text style={{ fontSize: 14 }}>🔄</Text>
                      <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Regenerate Workout Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
                {workoutPlan.insight && (
                  <View style={{ backgroundColor: "#7C3AED10", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                    <Text style={{ color: "#FBBF24", fontSize: 13, lineHeight: 18 }}>✨ {String(workoutPlan.insight)}</Text>
                  </View>
                )}
                {workoutPlan.schedule?.map((day: any, i: number) => (
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
                {/* AI Form Check CTA */}
                <TouchableOpacity
                  style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexDirection: "row", alignItems: "center", gap: 14 }}
                  onPress={() => router.push("/form-checker" as any)}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 22 }}>🎯</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>AI Form Check</Text>
                    <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Record a set — AI analyses your technique instantly</Text>
                  </View>
                  <Text style={{ color: "#F59E0B", fontSize: 18 }}>→</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Meal Plan Tab ── */}
        {activeTab === 1 && (
          <View style={{ paddingHorizontal: 20 }}>
            <SectionLabel>Your Goal</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {GOALS.map(g => (
                <OptionChip key={g.key} icon={g.icon} label={g.label} selected={mealGoal === g.key} onPress={() => setMealGoal(g.key)} />
              ))}
            </View>

            <SectionLabel>Dietary Preference</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {DIETARY_PREFS.map(d => (
                <OptionChip key={d.key} icon={d.icon} label={d.label} selected={dietaryPref === d.key} onPress={() => setDietaryPref(d.key)} />
              ))}
            </View>

            {/* Ramadan Mode Toggle */}
            {(dietaryPref === "halal" || ramadanMode) && (
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: ramadanMode ? "rgba(245,158,11,0.10)" : "#150A00", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: ramadanMode ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                onPress={() => setRamadanMode(v => !v)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🌙</Text>
                  <View>
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Ramadan Mode</Text>
                    <Text style={{ color: "#92400E", fontSize: 11, marginTop: 2 }}>Suhoor, Iftar & Isha meals</Text>
                  </View>
                </View>
                <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: ramadanMode ? "#F59E0B" : "rgba(245,158,11,0.15)", justifyContent: "center", paddingHorizontal: 2 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF7ED", alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                </View>
              </TouchableOpacity>
            )}

            {/* AI Disclaimer */}
            <View style={{ backgroundColor: "#FBBF2410", borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "#FBBF2430", flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 14 }}>⚠️</Text>
              <Text style={{ color: "#FCD34D", fontSize: 11, lineHeight: 16, flex: 1 }}>AI-generated plans are for guidance only. Consult a qualified nutritionist or dietitian before making significant dietary changes, especially if you have health conditions.</Text>
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
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>✨ Generate Meal Plan</Text>
              )}
            </TouchableOpacity>

            {mealPlan && (
              <View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Current Meal Plan</Text>
                  <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#FDE68A", fontSize: 11, fontFamily: "Outfit_700Bold" }}>ACTIVE</Text>
                  </View>
                </View>
                {/* Regenerate Meal Plan Button */}
                <TouchableOpacity
                  style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexDirection: "row", justifyContent: "center", gap: 8, opacity: generateMeal.isPending ? 0.7 : 1 }}
                  onPress={() => {
                    Alert.alert(
                      "Regenerate Meal Plan?",
                      "This will replace your current meal plan with a new AI-generated one based on your selected preferences.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Regenerate",
                          style: "destructive",
                          onPress: () => generateMeal.mutate({ goal: mealGoal, dietaryPreference: dietaryPref, ramadanMode, weightKg: activeProfile?.weightKg ?? undefined, heightCm: activeProfile?.heightCm ?? undefined, age: activeProfile?.age ?? undefined, gender: activeProfile?.gender ?? undefined, activityLevel: activeProfile?.activityLevel ?? undefined }),
                        },
                      ]
                    );
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
                      <Text style={{ fontSize: 14 }}>🔄</Text>
                      <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Regenerate Meal Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
                {/* Macro summary */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                  <MacroCard label="Calories" value={mealPlan.dailyCalories} unit="kcal" color="#FBBF24" />
                  <MacroCard label="Protein" value={mealPlan.proteinTarget} unit="g" color="#3B82F6" />
                  <MacroCard label="Carbs" value={mealPlan.carbTarget} unit="g" color="#FDE68A" />
                  <MacroCard label="Fat" value={mealPlan.fatTarget} unit="g" color="#FBBF24" />
                </View>
                {mealPlan.insight && (
                  <View style={{ backgroundColor: "#22C55E10", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#22C55E30" }}>
                    <Text style={{ color: "#FBBF24", fontSize: 13, lineHeight: 18 }}>💡 {String(mealPlan.insight)}</Text>
                  </View>
                )}
                {mealPlan.days?.map((day: any, i: number) => (
                  <MealDayCard key={i} day={day} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{children}</Text>;
}

function OptionChip({ icon, label, selected, onPress }: any) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: selected ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: selected ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ color: selected ? "#FFF7ED" : "#92400E", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MacroCard({ label, value, unit, color }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: color + "30" }}>
      <Text style={{ color, fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{value ?? "—"}</Text>
      <Text style={{ color: "#78350F", fontSize: 9, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: "#92400E", fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function WorkoutDayCard({ day, onPress, isCompleted, onToggleComplete }: { day: any; onPress: () => void; isCompleted?: boolean; onToggleComplete?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ backgroundColor: isCompleted ? "rgba(34,197,94,0.06)" : "#150A00", borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: isCompleted ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.10)", overflow: "hidden" }}>
      <TouchableOpacity
        style={{ padding: 14 }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* Completion checkbox */}
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
                <Text style={{ fontSize: 16 }}>{isCompleted ? "✓" : "💪"}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>{day.isRest ? "😴" : "💪"}</Text>
              </View>
            )}
            <View>
              <Text style={{ color: isCompleted ? "#22C55E" : "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, textDecorationLine: isCompleted ? "line-through" : "none" }}>{day.day}</Text>
              <Text style={{ color: isCompleted ? "#4ADE80" : (day.isRest ? "#FDE68A" : "#FBBF24"), fontSize: 12 }}>{isCompleted ? "Completed ✔" : day.focus}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!day.isRest && <Text style={{ color: "#92400E", fontSize: 12 }}>{day.exercises?.length ?? 0} exercises</Text>}
            <Text style={{ color: "#92400E", fontSize: 14 }}>{expanded ? "▲" : "▼"}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded exercise list with video previews */}
      {expanded && !day.isRest && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
          {/* Start Workout button */}
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

// ── Exercise Preview Card with Video Demo ──
function ExercisePreviewCard({ exercise }: { exercise: any }) {
  const [showVideo, setShowVideo] = useState(false);
  const demo = getExerciseDemo(exercise.name ?? "");

  return (
    <View style={{ backgroundColor: "#0A0500", borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)", overflow: "hidden" }}>
      {/* Exercise info header */}
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{exercise.name}</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <Text style={{ color: "#FBBF24", fontSize: 12 }}>{exercise.sets} sets</Text>
              <Text style={{ color: "#FDE68A", fontSize: 12 }}>{exercise.reps} reps</Text>
              {exercise.rest && <Text style={{ color: "#92400E", fontSize: 12 }}>⏱ {exercise.rest}</Text>}</View>
            {exercise.muscleGroup && (
              <View style={{ marginTop: 4, alignSelf: "flex-start", backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: "#92400E", fontSize: 10 }}>{exercise.muscleGroup}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={{ backgroundColor: showVideo ? "#F59E0B" : "rgba(245,158,11,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" }}
            onPress={() => setShowVideo(!showVideo)}
          >
            <Text style={{ color: showVideo ? "#FFF7ED" : "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>{showVideo ? "▲ Hide" : "▶ Demo"}</Text>
          </TouchableOpacity>
        </View>
        {exercise.notes && (
          <Text style={{ color: "#78350F", fontSize: 11, marginTop: 6, lineHeight: 15 }}>💡 {exercise.notes}</Text>
        )}
      </View>

      {/* Video preview */}
      {showVideo && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <YouTubePlayer videoId={demo.videoId} cue={demo.cue} height={160} />
        </View>
      )}
    </View>
  );
}

// ExerciseMiniVideo replaced by inline YouTubePlayer component

// ── Meal Day Card ──
function MealDayCard({ day }: any) {
  const [expanded, setExpanded] = useState(false);
  const dayCalories = day.meals?.reduce((s: number, m: any) => s + (m.calories ?? 0), 0) ?? 0;
  return (
    <View style={{ backgroundColor: "#150A00", borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", overflow: "hidden" }}>
      <TouchableOpacity
        style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16 }}>📅</Text>
          </View>
          <View>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>{day.day}</Text>
            <Text style={{ color: "#92400E", fontSize: 12 }}>{day.meals?.length ?? 0} meals</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#FBBF24", fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{dayCalories} kcal</Text>
          <Text style={{ color: "#92400E", fontSize: 14, marginTop: 2 }}>{expanded ? "▲" : "▼"}</Text>
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

// ── Individual Meal Card with Photo + Prep Instructions ──
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
  const color = mealTypeColor[(meal.type ?? "").toLowerCase()] ?? "#92400E";

  return (
    <View style={{ backgroundColor: "#150A00", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
      {/* Meal Photo */}
      <Image
        source={{ uri: photoUrl }}
        style={{ width: "100%", height: 160 }}
        resizeMode="cover"
      />
      {/* Meal type badge */}
      <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: color, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: "#FFF7ED", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "uppercase" }}>{meal.type ?? "Meal"}</Text>
      </View>
      {/* Calorie badge */}
      <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: "#FBBF24", fontSize: 11, fontFamily: "Outfit_700Bold" }}>{meal.calories} kcal</Text>
      </View>

      <View style={{ padding: 14 }}>
        {/* Meal name + macros */}
        <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 6 }}>{meal.name}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
          <Text style={{ color: "#3B82F6", fontSize: 12 }}>P: {meal.protein}g</Text>
          <Text style={{ color: "#FDE68A", fontSize: 12 }}>C: {meal.carbs}g</Text>
          <Text style={{ color: "#FBBF24", fontSize: 12 }}>F: {meal.fat}g</Text>
          {meal.prepTime && <Text style={{ color: "#92400E", fontSize: 12 }}>⏱ {meal.prepTime}</Text>}
        </View>

        {/* Prep Guide Button */}
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: showPrep ? "#22C55E15" : "#150A00", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: showPrep ? "rgba(245,158,11,0.18)" : "#2D2D3F" }}
          onPress={() => setShowPrep(!showPrep)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🍳</Text>
            <Text style={{ color: showPrep ? "#FBBF24" : "#92400E", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>How to Prep This Meal</Text>
          </View>
          <Text style={{ color: "#92400E", fontSize: 12 }}>{showPrep ? "▲ Hide" : "▼ Show"}</Text>
        </TouchableOpacity>

        {/* Expandable Prep Section */}
        {showPrep && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {/* Ingredients */}
            {meal.ingredients?.length > 0 && (
              <View style={{ backgroundColor: "#150A00", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>INGREDIENTS</Text>
                {meal.ingredients.map((ing: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FDE68A", marginTop: 5 }} />
                    <Text style={{ color: "#F59E0B", fontSize: 13, flex: 1, lineHeight: 18 }}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Instructions */}
            {meal.instructions?.length > 0 && (
              <View style={{ backgroundColor: "#150A00", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>PREP STEPS</Text>
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

            {/* Fallback if no prep data */}
            {(!meal.ingredients?.length && !meal.instructions?.length) && (
              <View style={{ backgroundColor: "#150A00", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#92400E", fontSize: 13, textAlign: "center" }}>
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
