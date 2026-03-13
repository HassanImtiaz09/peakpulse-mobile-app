import React, { useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator,
  Alert, ImageBackground, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WORKOUT_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";
const MEAL_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";

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
  const { isAuthenticated } = useAuth();
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

  // Local state for guest-generated plans (not saved to DB)
  const [localWorkoutPlan, setLocalWorkoutPlan] = useState<any>(null);
  const [localMealPlan, setLocalMealPlan] = useState<any>(null);

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
      <View style={{ flex: 1, backgroundColor: "#060F0A" }}>
        <ImageBackground source={{ uri: WORKOUT_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.8)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🏋️</Text>
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Unlock Your Plans</Text>
            <Text style={{ color: "#4D8C72", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to generate AI-powered workout and meal plans.</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#10B981", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, shadowColor: "#10B981", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#060F0A" }}>
      {/* Hero Header */}
      <ImageBackground source={{ uri: activeTab === 1 ? MEAL_BG : WORKOUT_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <Text style={{ color: activeTab === 0 ? "#34D399" : "#6EE7B7", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>AI-POWERED</Text>
          <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>Your Plans</Text>
        </View>
      </ImageBackground>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, marginTop: 12, marginBottom: 16, gap: 8 }}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === i ? "#10B981" : "#0D1F18", borderWidth: 1, borderColor: activeTab === i ? "#10B981" : "rgba(16,185,129,0.10)" }}
            onPress={() => setActiveTab(i)}
          >
            <Text style={{ color: activeTab === i ? "#E6FFF5" : "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 13 }}>{tab}</Text>
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
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? "#10B981" : "#0D1F18", borderWidth: 1, borderColor: daysPerWeek === d ? "#10B981" : "rgba(16,185,129,0.10)" }}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={{ color: daysPerWeek === d ? "#E6FFF5" : "#4D8C72", fontFamily: "Outfit_700Bold" }}>{d}x</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateWorkout.isPending ? 0.7 : 1 }}
              onPress={() => generateWorkout.mutate({ goal, workoutStyle, daysPerWeek })}
              disabled={generateWorkout.isPending}
            >
              {generateWorkout.isPending ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color="#E6FFF5" size="small" />
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Generating Plan...</Text>
                </View>
              ) : (
                <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 15 }}>✨ Generate Workout Plan</Text>
              )}
            </TouchableOpacity>

            {/* Active Workout Plan */}
            {workoutPlan && (
              <View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Current Plan</Text>
                  <View style={{ backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#6EE7B7", fontSize: 11, fontFamily: "Outfit_700Bold" }}>ACTIVE</Text>
                  </View>
                </View>
                {workoutPlan.insight && (
                  <View style={{ backgroundColor: "#7C3AED10", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(16,185,129,0.12)" }}>
                    <Text style={{ color: "#34D399", fontSize: 13, lineHeight: 18 }}>✨ {String(workoutPlan.insight)}</Text>
                  </View>
                )}
                {workoutPlan.schedule?.map((day: any, i: number) => (
                  <WorkoutDayCard key={i} day={day} onPress={() => {
                    if (!day.isRest) router.push({ pathname: "/active-workout", params: { dayData: JSON.stringify(day) } } as any);
                  }} />
                ))}
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
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: ramadanMode ? "rgba(16,185,129,0.10)" : "#0D1F18", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: ramadanMode ? "#10B981" : "rgba(16,185,129,0.10)" }}
                onPress={() => setRamadanMode(v => !v)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🌙</Text>
                  <View>
                    <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Ramadan Mode</Text>
                    <Text style={{ color: "#4D8C72", fontSize: 11, marginTop: 2 }}>Suhoor, Iftar & Isha meals</Text>
                  </View>
                </View>
                <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: ramadanMode ? "#10B981" : "rgba(16,185,129,0.15)", justifyContent: "center", paddingHorizontal: 2 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#E6FFF5", alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                </View>
              </TouchableOpacity>
            )}

            {/* AI Disclaimer */}
            <View style={{ backgroundColor: "#FBBF2410", borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "#FBBF2430", flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 14 }}>⚠️</Text>
              <Text style={{ color: "#FCD34D", fontSize: 11, lineHeight: 16, flex: 1 }}>AI-generated plans are for guidance only. Consult a qualified nutritionist or dietitian before making significant dietary changes, especially if you have health conditions.</Text>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: "#6EE7B7", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateMeal.isPending ? 0.7 : 1 }}
              onPress={() => generateMeal.mutate({ goal: mealGoal, dietaryPreference: dietaryPref, ramadanMode })}
              disabled={generateMeal.isPending}
            >
              {generateMeal.isPending ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color="#E6FFF5" size="small" />
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Generating Plan...</Text>
                </View>
              ) : (
                <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 15 }}>✨ Generate Meal Plan</Text>
              )}
            </TouchableOpacity>

            {mealPlan && (
              <View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Current Meal Plan</Text>
                  <View style={{ backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#6EE7B7", fontSize: 11, fontFamily: "Outfit_700Bold" }}>ACTIVE</Text>
                  </View>
                </View>
                {/* Macro summary */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                  <MacroCard label="Calories" value={mealPlan.dailyCalories} unit="kcal" color="#34D399" />
                  <MacroCard label="Protein" value={mealPlan.proteinTarget} unit="g" color="#3B82F6" />
                  <MacroCard label="Carbs" value={mealPlan.carbTarget} unit="g" color="#6EE7B7" />
                  <MacroCard label="Fat" value={mealPlan.fatTarget} unit="g" color="#34D399" />
                </View>
                {mealPlan.insight && (
                  <View style={{ backgroundColor: "#22C55E10", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#22C55E30" }}>
                    <Text style={{ color: "#34D399", fontSize: 13, lineHeight: 18 }}>💡 {String(mealPlan.insight)}</Text>
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
  return <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{children}</Text>;
}

function OptionChip({ icon, label, selected, onPress }: any) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: selected ? "#10B981" : "#0D1F18", borderWidth: 1, borderColor: selected ? "#10B981" : "rgba(16,185,129,0.10)" }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ color: selected ? "#E6FFF5" : "#4D8C72", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MacroCard({ label, value, unit, color }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: "#0D1F18", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: color + "30" }}>
      <Text style={{ color, fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{value ?? "—"}</Text>
      <Text style={{ color: "#2D6A52", fontSize: 9, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: "#4D8C72", fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function WorkoutDayCard({ day, onPress }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={{ backgroundColor: "#0D1F18", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: day.isRest ? "rgba(16,185,129,0.10)" : "rgba(16,185,129,0.10)" }}
      onPress={() => { setExpanded(!expanded); if (!day.isRest) onPress(); }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: day.isRest ? "rgba(16,185,129,0.10)" : "rgba(16,185,129,0.10)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16 }}>{day.isRest ? "😴" : "💪"}</Text>
          </View>
          <View>
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{day.day}</Text>
            <Text style={{ color: day.isRest ? "#6EE7B7" : "#34D399", fontSize: 12 }}>{day.focus}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!day.isRest && <Text style={{ color: "#4D8C72", fontSize: 12 }}>{day.exercises?.length ?? 0} exercises</Text>}
          {!day.isRest && (
            <View style={{ backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: "#34D399", fontSize: 11, fontFamily: "Outfit_700Bold" }}>START →</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Meal Day Card ──
function MealDayCard({ day }: any) {
  const [expanded, setExpanded] = useState(false);
  const dayCalories = day.meals?.reduce((s: number, m: any) => s + (m.calories ?? 0), 0) ?? 0;
  return (
    <View style={{ backgroundColor: "#0D1F18", borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: "rgba(16,185,129,0.10)", overflow: "hidden" }}>
      <TouchableOpacity
        style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(16,185,129,0.10)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16 }}>📅</Text>
          </View>
          <View>
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 15 }}>{day.day}</Text>
            <Text style={{ color: "#4D8C72", fontSize: 12 }}>{day.meals?.length ?? 0} meals</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#34D399", fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{dayCalories} kcal</Text>
          <Text style={{ color: "#4D8C72", fontSize: 14, marginTop: 2 }}>{expanded ? "▲" : "▼"}</Text>
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
    breakfast: "#34D399",
    "morning snack": "#34D399",
    lunch: "#6EE7B7",
    "afternoon snack": "#3B82F6",
    dinner: "#10B981",
    snack: "#34D399",
  };
  const color = mealTypeColor[(meal.type ?? "").toLowerCase()] ?? "#4D8C72";

  return (
    <View style={{ backgroundColor: "#0D1F18", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(16,185,129,0.10)" }}>
      {/* Meal Photo */}
      <Image
        source={{ uri: photoUrl }}
        style={{ width: "100%", height: 160 }}
        resizeMode="cover"
      />
      {/* Meal type badge */}
      <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: color, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: "#E6FFF5", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "uppercase" }}>{meal.type ?? "Meal"}</Text>
      </View>
      {/* Calorie badge */}
      <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: "#34D399", fontSize: 11, fontFamily: "Outfit_700Bold" }}>{meal.calories} kcal</Text>
      </View>

      <View style={{ padding: 14 }}>
        {/* Meal name + macros */}
        <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 6 }}>{meal.name}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
          <Text style={{ color: "#3B82F6", fontSize: 12 }}>P: {meal.protein}g</Text>
          <Text style={{ color: "#6EE7B7", fontSize: 12 }}>C: {meal.carbs}g</Text>
          <Text style={{ color: "#34D399", fontSize: 12 }}>F: {meal.fat}g</Text>
          {meal.prepTime && <Text style={{ color: "#4D8C72", fontSize: 12 }}>⏱ {meal.prepTime}</Text>}
        </View>

        {/* Prep Guide Button */}
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: showPrep ? "#22C55E15" : "#0D1F18", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: showPrep ? "rgba(16,185,129,0.18)" : "#2D2D3F" }}
          onPress={() => setShowPrep(!showPrep)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🍳</Text>
            <Text style={{ color: showPrep ? "#34D399" : "#4D8C72", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>How to Prep This Meal</Text>
          </View>
          <Text style={{ color: "#4D8C72", fontSize: 12 }}>{showPrep ? "▲ Hide" : "▼ Show"}</Text>
        </TouchableOpacity>

        {/* Expandable Prep Section */}
        {showPrep && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {/* Ingredients */}
            {meal.ingredients?.length > 0 && (
              <View style={{ backgroundColor: "#0D1F18", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>INGREDIENTS</Text>
                {meal.ingredients.map((ing: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#6EE7B7", marginTop: 5 }} />
                    <Text style={{ color: "#10B981", fontSize: 13, flex: 1, lineHeight: 18 }}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Instructions */}
            {meal.instructions?.length > 0 && (
              <View style={{ backgroundColor: "#0D1F18", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>PREP STEPS</Text>
                {meal.instructions.map((step: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Text style={{ color: "#E6FFF5", fontSize: 11, fontFamily: "Outfit_700Bold" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ color: "#10B981", fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Fallback if no prep data */}
            {(!meal.ingredients?.length && !meal.instructions?.length) && (
              <View style={{ backgroundColor: "#0D1F18", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#4D8C72", fontSize: 13, textAlign: "center" }}>
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
