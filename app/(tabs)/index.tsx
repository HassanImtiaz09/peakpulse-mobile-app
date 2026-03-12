import React, { useEffect, useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GOALS: Record<string, string> = {
  build_muscle: "Build Muscle",
  lose_fat: "Lose Fat",
  maintain: "Maintain",
  athletic: "Athletic Performance",
};

const WORKOUT_STYLES: Record<string, string> = {
  gym: "Gym",
  home: "Home",
  mix: "Mix",
  calisthenics: "Calisthenics",
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [wearableData, setWearableData] = useState<any>(null);
  const [streak, setStreak] = useState(1);
  const [xp, setXp] = useState(30);

  const { data: profile, refetch: refetchProfile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: insightData, refetch: refetchInsight } = trpc.profile.getDailyInsight.useQuery(undefined, { enabled: isAuthenticated && !!profile });
  const { data: workoutPlan } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: todayMeals } = trpc.mealLog.getToday.useQuery(undefined, { enabled: isAuthenticated });
  const { data: latestScan } = trpc.bodyScan.getLatest.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    loadLocalData();
  }, []);

  async function loadLocalData() {
    try {
      const wd = await AsyncStorage.getItem("wearable_data");
      if (wd) setWearableData(JSON.parse(wd));
      const s = await AsyncStorage.getItem("pp_streak");
      if (s) setStreak(parseInt(s));
      const x = await AsyncStorage.getItem("pp_xp");
      if (x) setXp(parseInt(x));
    } catch {}
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchInsight()]);
    setRefreshing(false);
  };

  const todayCalories = todayMeals?.reduce((sum: number, m: any) => sum + (m.calories ?? 0), 0) ?? 0;
  const calorieGoal = profile?.weightKg ? Math.round(profile.weightKg * 30) : 2000;

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <View className="items-center gap-6">
          <View className="w-20 h-20 rounded-3xl bg-primary/20 items-center justify-center">
            <Text className="text-4xl">⚡</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground text-center">PeakPulse AI</Text>
          <Text className="text-muted text-center text-base leading-6">
            Your AI-powered fitness companion. Transform your body with personalized plans.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#7C3AED", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 }}
            onPress={() => router.push("/login" as any)}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Good morning 👋</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 2 }}>
                {user?.name?.split(" ")[0] ?? "Athlete"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ backgroundColor: "#1A1A2E", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 14 }}>🔥</Text>
                <Text style={{ color: "#F97316", fontWeight: "700", fontSize: 13 }}>{streak} day</Text>
              </View>
              <View style={{ backgroundColor: "#1A1A2E", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 14 }}>⚡</Text>
                <Text style={{ color: "#FBBF24", fontWeight: "700", fontSize: 13 }}>{xp} XP</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Insight Card */}
        <View style={{ marginHorizontal: 20, marginVertical: 12, backgroundColor: "#13131F", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#7C3AED33" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 16 }}>✨</Text>
            <Text style={{ color: "#A78BFA", fontWeight: "700", fontSize: 13 }}>AI Daily Insight</Text>
          </View>
          <Text style={{ color: "#E5E7EB", fontSize: 14, lineHeight: 20 }}>
            {String(insightData?.insight ?? "Loading your personalized coaching tip...")}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginBottom: 12 }}>Today's Stats</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <StatCard
              label="Calories"
              value={wearableData?.calories ?? "—"}
              unit="kcal"
              icon="🔥"
              color="#EF4444"
              onPress={() => router.push("/meals" as any)}
            />
            <StatCard
              label="Steps"
              value={wearableData?.steps ? wearableData.steps.toLocaleString() : "—"}
              unit="steps"
              icon="👟"
              color="#F97316"
              onPress={() => router.push("/wearable-sync" as any)}
            />
            <StatCard
              label="Heart Rate"
              value={wearableData?.heartRate ?? "—"}
              unit="bpm"
              icon="❤️"
              color="#EC4899"
              onPress={() => router.push("/wearable-sync" as any)}
            />
            <StatCard
              label="Sleep"
              value={wearableData?.sleep ?? "—"}
              unit="hrs"
              icon="🌙"
              color="#A78BFA"
              onPress={() => router.push("/wearable-sync" as any)}
            />
          </View>
        </View>

        {/* Calorie Progress */}
        <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "#13131F", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#1F2937" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Calories Today</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{todayCalories} / {calorieGoal} kcal</Text>
          </View>
          <View style={{ height: 8, backgroundColor: "#1F2937", borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: 8, backgroundColor: "#F97316", borderRadius: 4, width: `${Math.min((todayCalories / calorieGoal) * 100, 100)}%` }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <MacroChip label="Protein" value={todayMeals?.reduce((s: number, m: any) => s + (m.protein ?? 0), 0) ?? 0} unit="g" color="#3B82F6" />
            <MacroChip label="Carbs" value={todayMeals?.reduce((s: number, m: any) => s + (m.carbs ?? 0), 0) ?? 0} unit="g" color="#22C55E" />
            <MacroChip label="Fat" value={todayMeals?.reduce((s: number, m: any) => s + (m.fat ?? 0), 0) ?? 0} unit="g" color="#FBBF24" />
          </View>
        </View>

        {/* Body Scan Card */}
        {latestScan && (
          <TouchableOpacity
            style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "#13131F", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#7C3AED33" }}
            onPress={() => router.push("/scan" as any)}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: "#A78BFA", fontWeight: "700", fontSize: 12, marginBottom: 4 }}>LAST BODY SCAN</Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 24 }}>
                  {latestScan.estimatedBodyFat?.toFixed(1)}% <Text style={{ fontSize: 14, fontWeight: "400", color: "#9CA3AF" }}>body fat</Text>
                </Text>
                {profile?.targetBodyFat && (
                  <Text style={{ color: "#22C55E", fontSize: 12, marginTop: 4 }}>
                    Target: {profile.targetBodyFat}% body fat
                  </Text>
                )}
              </View>
              <View style={{ backgroundColor: "#7C3AED20", borderRadius: 16, padding: 12 }}>
                <Text style={{ fontSize: 28 }}>📷</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginBottom: 12 }}>Quick Actions</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <QuickAction icon="🏋️" label="Workout Plan" color="#3B82F6" onPress={() => router.push("/plans" as any)} />
            <QuickAction icon="🥗" label="Meal Plan" color="#22C55E" onPress={() => router.push("/plans" as any)} />
            <QuickAction icon="📷" label="Log Meal" color="#F97316" onPress={() => router.push("/meals" as any)} />
            <QuickAction icon="📈" label="Progress" color="#A78BFA" onPress={() => router.push("/progress-photos" as any)} />
            <QuickAction icon="⌚" label="Wearables" color="#EC4899" onPress={() => router.push("/wearable-sync" as any)} />
            <QuickAction icon="🗺️" label="Find Gyms" color="#FBBF24" onPress={() => router.push("/gym-finder" as any)} />
          </View>
        </View>

        {/* Today's Workout Preview */}
        {workoutPlan && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "#13131F", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#1F2937" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Today's Workout</Text>
              <TouchableOpacity onPress={() => router.push("/plans" as any)}>
                <Text style={{ color: "#7C3AED", fontSize: 12, fontWeight: "600" }}>View All →</Text>
              </TouchableOpacity>
            </View>
            {(() => {
              const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
              const todayPlan = workoutPlan.schedule?.find((d: any) => d.day === dayName);
              if (!todayPlan) return <Text style={{ color: "#9CA3AF", fontSize: 13 }}>No workout scheduled for today</Text>;
              return (
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <View style={{ backgroundColor: todayPlan.isRest ? "#22C55E20" : "#7C3AED20", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: todayPlan.isRest ? "#22C55E" : "#A78BFA", fontSize: 12, fontWeight: "600" }}>
                        {todayPlan.isRest ? "Rest Day" : todayPlan.focus}
                      </Text>
                    </View>
                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{todayPlan.exercises?.length ?? 0} exercises</Text>
                  </View>
                  {!todayPlan.isRest && (
                    <TouchableOpacity
                      style={{ backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 10, alignItems: "center" }}
                      onPress={() => router.push({ pathname: "/active-workout", params: { dayData: JSON.stringify(todayPlan) } } as any)}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>▶ Start Workout</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* Profile Setup Prompt */}
        {!profile && (
          <TouchableOpacity
            style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "#7C3AED20", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#7C3AED40", flexDirection: "row", alignItems: "center", gap: 12 }}
            onPress={() => router.push("/onboarding" as any)}
          >
            <Text style={{ fontSize: 28 }}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Complete Your Profile</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>Set your goals to get personalized AI plans</Text>
            </View>
            <Text style={{ color: "#7C3AED", fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard({ label, value, unit, icon, color, onPress }: any) {
  return (
    <TouchableOpacity
      style={{ flex: 1, minWidth: "45%", backgroundColor: "#13131F", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#1F2937" }}
      onPress={onPress}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "600" }}>{label.toUpperCase()}</Text>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>
        {value === "—" ? <Text style={{ color: "#4B5563", fontSize: 18 }}>—</Text> : value}
      </Text>
      {value !== "—" && <Text style={{ color, fontSize: 11, marginTop: 2 }}>{unit}</Text>}
    </TouchableOpacity>
  );
}

function MacroChip({ label, value, unit, color }: any) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color, fontWeight: "700", fontSize: 14 }}>{Math.round(value)}{unit}</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity
      style={{ flex: 1, minWidth: "30%", backgroundColor: "#13131F", borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#1F2937", gap: 6 }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={{ color: "#E5E7EB", fontSize: 11, fontWeight: "600", textAlign: "center" }}>{label}</Text>
    </TouchableOpacity>
  );
}
