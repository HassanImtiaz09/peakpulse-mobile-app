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

const WORKOUT_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/workout_bg-UnSuPAnKQ8SeUHebtV2HTU.png";
const MEAL_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/meal_bg-ULw7hvjMXJuqDPAXt9iqic.png";

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
      <View style={{ flex: 1, backgroundColor: "#080810" }}>
        <ImageBackground source={{ uri: WORKOUT_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.8)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🏋️</Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Unlock Your Plans</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to generate AI-powered workout and meal plans.</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#7C3AED", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#080810" }}>
      {/* Hero Header */}
      <ImageBackground source={{ uri: activeTab === 1 ? MEAL_BG : WORKOUT_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <Text style={{ color: activeTab === 0 ? "#F97316" : "#22C55E", fontWeight: "700", fontSize: 12, letterSpacing: 1 }}>AI-POWERED</Text>
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 26, letterSpacing: -0.5 }}>Your Plans</Text>
        </View>
      </ImageBackground>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, marginTop: 12, marginBottom: 16, gap: 8 }}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === i ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: activeTab === i ? "#7C3AED" : "#1F2937" }}
            onPress={() => setActiveTab(i)}
          >
            <Text style={{ color: activeTab === i ? "#FFFFFF" : "#9CA3AF", fontWeight: "700", fontSize: 13 }}>{tab}</Text>
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
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: daysPerWeek === d ? "#7C3AED" : "#1F2937" }}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={{ color: daysPerWeek === d ? "#FFFFFF" : "#9CA3AF", fontWeight: "700" }}>{d}x</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateWorkout.isPending ? 0.7 : 1 }}
              onPress={() => generateWorkout.mutate({ goal, workoutStyle, daysPerWeek })}
              disabled={generateWorkout.isPending}
            >
              {generateWorkout.isPending ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Generating Plan...</Text>
                </View>
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>✨ Generate Workout Plan</Text>
              )}
            </TouchableOpacity>

            {/* Active Workout Plan */}
            {workoutPlan && (
              <View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Current Plan</Text>
                  <View style={{ backgroundColor: "#22C55E20", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "700" }}>ACTIVE</Text>
                  </View>
                </View>
                {workoutPlan.insight && (
                  <View style={{ backgroundColor: "#7C3AED10", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#7C3AED30" }}>
                    <Text style={{ color: "#A78BFA", fontSize: 13, lineHeight: 18 }}>✨ {String(workoutPlan.insight)}</Text>
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
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: ramadanMode ? "#7C3AED20" : "#13131F", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: ramadanMode ? "#7C3AED" : "#1F2937" }}
                onPress={() => setRamadanMode(v => !v)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🌙</Text>
                  <View>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Ramadan Mode</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 2 }}>Suhoor, Iftar & Isha meals</Text>
                  </View>
                </View>
                <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: ramadanMode ? "#7C3AED" : "#374151", justifyContent: "center", paddingHorizontal: 2 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                </View>
              </TouchableOpacity>
            )}

            {/* AI Disclaimer */}
            <View style={{ backgroundColor: "#FBBF2410", borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "#FBBF2430", flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 14 }}>⚠️</Text>
              <Text style={{ color: "#FCD34D", fontSize: 11, lineHeight: 16, flex: 1 }}>AI-generated plans are for guidance only. Consult a qualified nutritionist or dietitian before making significant dietary changes, especially if you have health conditions.</Text>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: "#22C55E", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateMeal.isPending ? 0.7 : 1 }}
              onPress={() => generateMeal.mutate({ goal: mealGoal, dietaryPreference: dietaryPref, ramadanMode })}
              disabled={generateMeal.isPending}
            >
              {generateMeal.isPending ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Generating Plan...</Text>
                </View>
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>✨ Generate Meal Plan</Text>
              )}
            </TouchableOpacity>

            {mealPlan && (
              <View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Current Meal Plan</Text>
                  <View style={{ backgroundColor: "#22C55E20", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "700" }}>ACTIVE</Text>
                  </View>
                </View>
                {/* Macro summary */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                  <MacroCard label="Calories" value={mealPlan.dailyCalories} unit="kcal" color="#F97316" />
                  <MacroCard label="Protein" value={mealPlan.proteinTarget} unit="g" color="#3B82F6" />
                  <MacroCard label="Carbs" value={mealPlan.carbTarget} unit="g" color="#22C55E" />
                  <MacroCard label="Fat" value={mealPlan.fatTarget} unit="g" color="#FBBF24" />
                </View>
                {mealPlan.insight && (
                  <View style={{ backgroundColor: "#22C55E10", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#22C55E30" }}>
                    <Text style={{ color: "#86EFAC", fontSize: 13, lineHeight: 18 }}>💡 {String(mealPlan.insight)}</Text>
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
  return <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{children}</Text>;
}

function OptionChip({ icon, label, selected, onPress }: any) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: selected ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: selected ? "#7C3AED" : "#1F2937" }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={{ color: selected ? "#FFFFFF" : "#9CA3AF", fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MacroCard({ label, value, unit, color }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: color + "30" }}>
      <Text style={{ color, fontWeight: "800", fontSize: 15 }}>{value ?? "—"}</Text>
      <Text style={{ color: "#6B7280", fontSize: 9, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function WorkoutDayCard({ day, onPress }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: day.isRest ? "#22C55E20" : "#1F2937" }}
      onPress={() => { setExpanded(!expanded); if (!day.isRest) onPress(); }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: day.isRest ? "#22C55E20" : "#7C3AED20", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16 }}>{day.isRest ? "😴" : "💪"}</Text>
          </View>
          <View>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{day.day}</Text>
            <Text style={{ color: day.isRest ? "#22C55E" : "#A78BFA", fontSize: 12 }}>{day.focus}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!day.isRest && <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{day.exercises?.length ?? 0} exercises</Text>}
          {!day.isRest && (
            <View style={{ backgroundColor: "#7C3AED20", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: "#A78BFA", fontSize: 11, fontWeight: "700" }}>START →</Text>
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
    <View style={{ backgroundColor: "#13131F", borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: "#1F2937", overflow: "hidden" }}>
      <TouchableOpacity
        style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#22C55E20", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 16 }}>📅</Text>
          </View>
          <View>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>{day.day}</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{day.meals?.length ?? 0} meals</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#F97316", fontWeight: "800", fontSize: 15 }}>{dayCalories} kcal</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 2 }}>{expanded ? "▲" : "▼"}</Text>
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
    breakfast: "#F97316",
    "morning snack": "#FBBF24",
    lunch: "#22C55E",
    "afternoon snack": "#3B82F6",
    dinner: "#7C3AED",
    snack: "#FBBF24",
  };
  const color = mealTypeColor[(meal.type ?? "").toLowerCase()] ?? "#9CA3AF";

  return (
    <View style={{ backgroundColor: "#0D0D18", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#1F2937" }}>
      {/* Meal Photo */}
      <Image
        source={{ uri: photoUrl }}
        style={{ width: "100%", height: 160 }}
        resizeMode="cover"
      />
      {/* Meal type badge */}
      <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: color, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>{meal.type ?? "Meal"}</Text>
      </View>
      {/* Calorie badge */}
      <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: "#F97316", fontSize: 11, fontWeight: "700" }}>{meal.calories} kcal</Text>
      </View>

      <View style={{ padding: 14 }}>
        {/* Meal name + macros */}
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15, marginBottom: 6 }}>{meal.name}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
          <Text style={{ color: "#3B82F6", fontSize: 12 }}>P: {meal.protein}g</Text>
          <Text style={{ color: "#22C55E", fontSize: 12 }}>C: {meal.carbs}g</Text>
          <Text style={{ color: "#FBBF24", fontSize: 12 }}>F: {meal.fat}g</Text>
          {meal.prepTime && <Text style={{ color: "#9CA3AF", fontSize: 12 }}>⏱ {meal.prepTime}</Text>}
        </View>

        {/* Prep Guide Button */}
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: showPrep ? "#22C55E15" : "#13131F", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: showPrep ? "#22C55E40" : "#2D2D3F" }}
          onPress={() => setShowPrep(!showPrep)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🍳</Text>
            <Text style={{ color: showPrep ? "#86EFAC" : "#9CA3AF", fontWeight: "600", fontSize: 13 }}>How to Prep This Meal</Text>
          </View>
          <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{showPrep ? "▲ Hide" : "▼ Show"}</Text>
        </TouchableOpacity>

        {/* Expandable Prep Section */}
        {showPrep && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {/* Ingredients */}
            {meal.ingredients?.length > 0 && (
              <View style={{ backgroundColor: "#13131F", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>INGREDIENTS</Text>
                {meal.ingredients.map((ing: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E", marginTop: 5 }} />
                    <Text style={{ color: "#E5E7EB", fontSize: 13, flex: 1, lineHeight: 18 }}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Instructions */}
            {meal.instructions?.length > 0 && (
              <View style={{ backgroundColor: "#13131F", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 }}>PREP STEPS</Text>
                {meal.instructions.map((step: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ color: "#E5E7EB", fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Fallback if no prep data */}
            {(!meal.ingredients?.length && !meal.instructions?.length) && (
              <View style={{ backgroundColor: "#13131F", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" }}>
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
