import React, { useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const TABS = ["Workout", "Meal Plan", "Meal Prep"];

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
  const [activeTab, setActiveTab] = useState(0);

  // Workout state
  const [goal, setGoal] = useState("build_muscle");
  const [workoutStyle, setWorkoutStyle] = useState("gym");
  const [daysPerWeek, setDaysPerWeek] = useState(4);

  // Meal plan state
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [mealGoal, setMealGoal] = useState("build_muscle");

  // Meal prep state
  const [prepDiet, setPrepDiet] = useState("omnivore");
  const [prepServings, setPrepServings] = useState(4);

  const { data: workoutPlan, refetch: refetchWorkout } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: mealPlan, refetch: refetchMeal } = trpc.mealPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });

  const generateWorkout = trpc.workoutPlan.generate.useMutation({
    onSuccess: () => refetchWorkout(),
    onError: (e) => Alert.alert("Error", e.message),
  });

  const generateMeal = trpc.mealPlan.generate.useMutation({
    onSuccess: () => refetchMeal(),
    onError: (e) => Alert.alert("Error", e.message),
  });

  const generatePrep = trpc.mealPrep.generate.useMutation({
    onError: (e) => Alert.alert("Error", e.message),
  });

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">Please log in to access your plans</Text>
        <TouchableOpacity
          style={{ backgroundColor: "#7C3AED", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 }}
          onPress={() => router.push("/login" as any)}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Log In</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800" }}>AI Plans</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 2 }}>Personalized by AI for your goals</Text>
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, marginBottom: 16, gap: 8 }}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === i ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: activeTab === i ? "#7C3AED" : "#1F2937" }}
            onPress={() => setActiveTab(i)}
          >
            <Text style={{ color: activeTab === i ? "#FFFFFF" : "#9CA3AF", fontWeight: "700", fontSize: 12 }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
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

            <TouchableOpacity
              style={{ backgroundColor: "#22C55E", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generateMeal.isPending ? 0.7 : 1 }}
              onPress={() => generateMeal.mutate({ goal: mealGoal, dietaryPreference: dietaryPref })}
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
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <MacroCard label="Calories" value={mealPlan.dailyCalories} unit="kcal" color="#F97316" />
                  <MacroCard label="Protein" value={mealPlan.proteinTarget} unit="g" color="#3B82F6" />
                  <MacroCard label="Carbs" value={mealPlan.carbTarget} unit="g" color="#22C55E" />
                  <MacroCard label="Fat" value={mealPlan.fatTarget} unit="g" color="#FBBF24" />
                </View>
                {mealPlan.days?.map((day: any, i: number) => (
                  <MealDayCard key={i} day={day} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Meal Prep Tab ── */}
        {activeTab === 2 && (
          <View style={{ paddingHorizontal: 20 }}>
            <SectionLabel>Dietary Preference</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {DIETARY_PREFS.map(d => (
                <OptionChip key={d.key} icon={d.icon} label={d.label} selected={prepDiet === d.key} onPress={() => setPrepDiet(d.key)} />
              ))}
            </View>

            <SectionLabel>Servings Per Recipe</SectionLabel>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
              {[2, 4, 6, 8].map(s => (
                <TouchableOpacity
                  key={s}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: prepServings === s ? "#F97316" : "#13131F", borderWidth: 1, borderColor: prepServings === s ? "#F97316" : "#1F2937" }}
                  onPress={() => setPrepServings(s)}
                >
                  <Text style={{ color: prepServings === s ? "#FFFFFF" : "#9CA3AF", fontWeight: "700" }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: "#F97316", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 24, opacity: generatePrep.isPending ? 0.7 : 1 }}
              onPress={() => generatePrep.mutate({ dietaryPreference: prepDiet, servings: prepServings })}
              disabled={generatePrep.isPending}
            >
              {generatePrep.isPending ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Generating Prep Plan...</Text>
                </View>
              ) : (
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>🍳 Generate Meal Prep Plan</Text>
              )}
            </TouchableOpacity>

            {generatePrep.data && (
              <View>
                <View style={{ backgroundColor: "#F9731620", borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#F9731640" }}>
                  <Text style={{ color: "#FED7AA", fontSize: 13 }}>⏱ Prep time: {generatePrep.data.prepTime}</Text>
                </View>
                {generatePrep.data.recipes?.map((recipe: any, i: number) => (
                  <MealPrepCard key={i} recipe={recipe} />
                ))}
                {generatePrep.data.shoppingList?.length > 0 && (
                  <View style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "#1F2937" }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14, marginBottom: 10 }}>🛒 Shopping List</Text>
                    {generatePrep.data.shoppingList.map((item: string, i: number) => (
                      <Text key={i} style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 4 }}>• {item}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
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

function MealDayCard({ day }: any) {
  const [expanded, setExpanded] = useState(false);
  const dayCalories = day.meals?.reduce((s: number, m: any) => s + (m.calories ?? 0), 0) ?? 0;
  return (
    <TouchableOpacity
      style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1F2937" }}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{day.day}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: "#F97316", fontSize: 12, fontWeight: "600" }}>{dayCalories} kcal</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 14 }}>{expanded ? "▲" : "▼"}</Text>
        </View>
      </View>
      {expanded && (
        <View style={{ marginTop: 10, gap: 6 }}>
          {day.meals?.map((meal: any, i: number) => (
            <View key={i} style={{ backgroundColor: "#0D0D18", borderRadius: 10, padding: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#9CA3AF", fontSize: 10, textTransform: "uppercase", marginBottom: 2 }}>{meal.type}</Text>
                  <Text style={{ color: "#E5E7EB", fontWeight: "600", fontSize: 13 }}>{meal.name}</Text>
                  {meal.prepTime && <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>⏱ {meal.prepTime}</Text>}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: "#F97316", fontWeight: "700", fontSize: 13 }}>{meal.calories} kcal</Text>
                  <Text style={{ color: "#6B7280", fontSize: 10 }}>P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

function MealPrepCard({ recipe }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1F2937" }}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{recipe.name}</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{recipe.servings} servings • {recipe.mealType}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#F97316", fontWeight: "700", fontSize: 13 }}>{recipe.calories} kcal</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 14 }}>{expanded ? "▲" : "▼"}</Text>
        </View>
      </View>
      {expanded && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 4 }}>INGREDIENTS</Text>
          {recipe.ingredients?.map((ing: string, i: number) => (
            <Text key={i} style={{ color: "#E5E7EB", fontSize: 12, marginBottom: 2 }}>• {ing}</Text>
          ))}
          <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginTop: 10, marginBottom: 4 }}>INSTRUCTIONS</Text>
          {recipe.instructions?.map((step: string, i: number) => (
            <Text key={i} style={{ color: "#E5E7EB", fontSize: 12, marginBottom: 4 }}>{i + 1}. {step}</Text>
          ))}
          <View style={{ backgroundColor: "#22C55E10", borderRadius: 8, padding: 8, marginTop: 8 }}>
            <Text style={{ color: "#22C55E", fontSize: 11 }}>📦 {recipe.storageInstructions}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function MacroCard({ label, value, unit, color }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#1F2937" }}>
      <Text style={{ color, fontWeight: "800", fontSize: 16 }}>{value}</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 9, marginTop: 2 }}>{unit}</Text>
      <Text style={{ color: "#6B7280", fontSize: 9, marginTop: 1 }}>{label}</Text>
    </View>
  );
}
