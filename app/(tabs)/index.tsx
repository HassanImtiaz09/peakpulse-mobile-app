import React, { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ImageBackground, Image, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DASHBOARD_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/dashboard_bg-RoFjMvrdRjaYMAUAfupKpm.png";
const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/hero_bg-YtJxLGZKqRBrxqD3Cfsn7p.png";
const APP_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/app_logo-iTNC7xURufvjtUp3Y5ns3S.png";

function StatRing({ value, label, color, icon }: { value: string; label: string; color: string; icon: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <View style={{
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 3, borderColor: color,
        alignItems: "center", justifyContent: "center",
        backgroundColor: color + "15",
        marginBottom: 6,
      }}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>{value}</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function QuickActionCard({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{
        flex: 1, backgroundColor: "#13131F", borderRadius: 18,
        padding: 16, alignItems: "center", gap: 8,
        borderWidth: 1, borderColor: color + "30",
      }}
      onPress={onPress}
    >
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: color + "20", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </View>
      <Text style={{ color: "#E5E7EB", fontSize: 12, fontWeight: "600", textAlign: "center" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { guestProfile, isGuest, loading: guestLoading } = useGuestAuth();
  const [localProfile, setLocalProfile] = useState<any>(null);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const canUse = isAuthenticated || isGuest;
  const displayName = user?.name?.split(" ")[0] ?? guestProfile?.name?.split(" ")[0] ?? "Athlete";

  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: workoutPlan } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: mealPlan } = trpc.mealPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });

  // Check if onboarding has been completed on first launch
  useEffect(() => {
    if (authLoading || guestLoading) return;
    AsyncStorage.getItem("@onboarding_complete").then(val => {
      if (!val) {
        // First launch — redirect to onboarding
        router.replace("/onboarding" as any);
      } else {
        setOnboardingChecked(true);
      }
    });
  }, [authLoading, guestLoading]);

  useEffect(() => {
    if (isGuest) {
      AsyncStorage.getItem("@guest_profile").then(raw => {
        if (raw) setLocalProfile(JSON.parse(raw));
      });
    }
  }, [isGuest]);

  const activeProfile = isAuthenticated ? profile : localProfile;

  // Show nothing while checking onboarding status
  if (!onboardingChecked && !authLoading && !guestLoading) {
    return <View style={{ flex: 1, backgroundColor: "#080810" }} />;
  }

  // Not logged in — show welcome/onboarding screen
  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#080810" }}>
        <ImageBackground source={{ uri: HERO_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Image source={{ uri: APP_LOGO }} style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 20 }} />
            <Text style={{
              color: "#FFFFFF", fontSize: 36, fontWeight: "900", textAlign: "center", letterSpacing: -0.5,
              textShadowColor: "#7C3AED", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
            }}>
              PeakPulse AI
            </Text>
            <Text style={{ color: "#C4B5FD", fontSize: 15, textAlign: "center", marginTop: 10, lineHeight: 22 }}>
              Your AI-powered fitness companion.{"\n"}Transform your body with personalized plans.
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 40, backgroundColor: "#7C3AED",
                borderRadius: 20, paddingVertical: 16, paddingHorizontal: 48,
                shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16,
                elevation: 10,
              }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 17 }}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#080810" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        style={{ flex: 1 }}
      >
        {/* Hero Header */}
        <ImageBackground
          source={{ uri: DASHBOARD_BG }}
          style={{ width: "100%", height: 280 }}
          resizeMode="cover"
        >
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.6)", padding: 20, justifyContent: "flex-end" }}>
            {/* Top bar */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", position: "absolute", top: 52, left: 20, right: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Image source={{ uri: APP_LOGO }} style={{ width: 36, height: 36, borderRadius: 10 }} />
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18, letterSpacing: -0.3 }}>PeakPulse</Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: "rgba(124,58,237,0.3)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "rgba(124,58,237,0.5)" }}
                onPress={() => router.push("/(tabs)/profile" as any)}
              >
                <Text style={{ color: "#C4B5FD", fontWeight: "600", fontSize: 13 }}>Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Greeting */}
            <View style={{ paddingBottom: 20 }}>
              <Text style={{ color: "#C4B5FD", fontSize: 14, fontWeight: "600" }}>Good morning,</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "900", letterSpacing: -0.5 }}>
                {displayName} 💪
              </Text>
              {activeProfile?.goal && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <View style={{ backgroundColor: "#7C3AED40", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#7C3AED60" }}>
                    <Text style={{ color: "#C4B5FD", fontSize: 12, fontWeight: "600" }}>
                      🎯 {activeProfile.goal === "build_muscle" ? "Build Muscle" : activeProfile.goal === "lose_fat" ? "Lose Fat" : activeProfile.goal}
                    </Text>
                  </View>
                  {activeProfile?.workoutStyle && (
                    <View style={{ backgroundColor: "#06402440", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#22C55E40" }}>
                      <Text style={{ color: "#86EFAC", fontSize: 12, fontWeight: "600" }}>
                        🏋️ {activeProfile.workoutStyle}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </ImageBackground>

        {/* Stats Row */}
        <View style={{ backgroundColor: "#0D0D18", marginHorizontal: 16, marginTop: -20, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#1F2937", flexDirection: "row", gap: 8 }}>
          <StatRing value="0" label="Workouts" color="#7C3AED" icon="🏋️" />
          <View style={{ width: 1, backgroundColor: "#1F2937" }} />
          <StatRing value="0" label="Streak" color="#F97316" icon="🔥" />
          <View style={{ width: 1, backgroundColor: "#1F2937" }} />
          <StatRing value="0" label="Meals" color="#22C55E" icon="🥗" />
          <View style={{ width: 1, backgroundColor: "#1F2937" }} />
          <StatRing value="0" label="Photos" color="#06B6D4" icon="📸" />
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 12 }}>Quick Actions</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <QuickActionCard icon="📸" label="AI Body Scan" color="#7C3AED" onPress={() => router.push("/(tabs)/scan" as any)} />
            <QuickActionCard icon="🏋️" label="Start Workout" color="#F97316" onPress={() => router.push("/(tabs)/plans" as any)} />
            <QuickActionCard icon="🥗" label="Log Meal" color="#22C55E" onPress={() => router.push("/(tabs)/meals" as any)} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <QuickActionCard icon="📊" label="Progress" color="#06B6D4" onPress={() => router.push("/progress-photos" as any)} />
            <QuickActionCard icon="🗺️" label="Find Gym" color="#EC4899" onPress={() => router.push("/gym-finder" as any)} />
            <QuickActionCard icon="⌚" label="Wearables" color="#EAB308" onPress={() => router.push("/wearable-sync" as any)} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <QuickActionCard icon="📸" label="Daily Check-In" color="#8B5CF6" onPress={() => router.push("/daily-checkin" as any)} />
            <QuickActionCard icon="🎯" label="Form Check" color="#10B981" onPress={() => router.push("/form-checker" as any)} />
            <QuickActionCard icon="👥" label="Community" color="#F43F5E" onPress={() => router.push("/social-feed" as any)} />
          </View>
        </View>

        {/* Today's Workout */}
        {workoutPlan?.schedule?.[0] && (
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 12 }}>Today's Workout</Text>
            <ImageBackground
              source={{ uri: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/workout_bg-UnSuPAnKQ8SeUHebtV2HTU.png" }}
              style={{ borderRadius: 20, overflow: "hidden" }}
              resizeMode="cover"
            >
              <View style={{ backgroundColor: "rgba(8,8,16,0.75)", padding: 20 }}>
                <Text style={{ color: "#F97316", fontWeight: "700", fontSize: 12, letterSpacing: 1 }}>
                  {workoutPlan.schedule[0].day?.toUpperCase()}
                </Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 20, marginTop: 4 }}>
                  {workoutPlan.schedule[0].focus}
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 4 }}>
                  {workoutPlan.schedule[0].exercises?.length ?? 0} exercises
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: "#F97316", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 16 }}
                  onPress={() => router.push("/(tabs)/plans" as any)}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Start Workout →</Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* Today's Meals */}
        {(mealPlan as any)?.days?.[0] && (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 12 }}>Today's Nutrition</Text>
            <ImageBackground
              source={{ uri: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/meal_bg-ULw7hvjMXJuqDPAXt9iqic.png" }}
              style={{ borderRadius: 20, overflow: "hidden" }}
              resizeMode="cover"
            >
              <View style={{ backgroundColor: "rgba(8,8,16,0.78)", padding: 20 }}>
                <Text style={{ color: "#22C55E", fontWeight: "700", fontSize: 12, letterSpacing: 1 }}>MEAL PLAN</Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginTop: 4 }}>
                  {(mealPlan as any).days[0].totalCalories} kcal target
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                  {[
                    { label: "Protein", value: (mealPlan as any).days[0].protein + "g", color: "#7C3AED" },
                    { label: "Carbs", value: (mealPlan as any).days[0].carbs + "g", color: "#22C55E" },
                    { label: "Fats", value: (mealPlan as any).days[0].fats + "g", color: "#F97316" },
                  ].map(m => (
                    <View key={m.label} style={{ backgroundColor: m.color + "20", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: m.color + "40" }}>
                      <Text style={{ color: m.color, fontWeight: "700", fontSize: 13 }}>{m.value}</Text>
                      <Text style={{ color: "#9CA3AF", fontSize: 10 }}>{m.label}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: "#22C55E", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 16 }}
                  onPress={() => router.push("/(tabs)/meals" as any)}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>View Meal Plan →</Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* No plans yet — CTA */}
        {!workoutPlan && !mealPlan && (
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <ImageBackground
              source={{ uri: HERO_BG }}
              style={{ borderRadius: 24, overflow: "hidden" }}
              resizeMode="cover"
            >
              <View style={{ backgroundColor: "rgba(8,8,16,0.8)", padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🚀</Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 20, textAlign: "center", marginBottom: 8 }}>
                  Ready to Transform?
                </Text>
                <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
                  Start with an AI Body Scan to analyze your physique, then get a personalized workout and meal plan.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32,
                    shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12,
                  }}
                  onPress={() => router.push("/(tabs)/scan" as any)}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>📸 Start AI Body Scan</Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* Guest mode banner */}
        {isGuest && (
          <View style={{ marginHorizontal: 16, marginTop: 20, backgroundColor: "#1F1A00", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EAB30840", flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 24 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FDE68A", fontWeight: "700", fontSize: 13 }}>Using as Guest</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                Your data is stored locally. Sign in to sync across devices.
              </Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: "#EAB308", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: "#000000", fontWeight: "700", fontSize: 12 }}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
