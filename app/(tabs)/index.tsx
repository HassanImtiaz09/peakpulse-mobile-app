import React, { useState, useEffect } from "react";
import Svg, { Circle } from "react-native-svg";
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from "react-native-reanimated";
import { useCalories, type MealEntry } from "@/lib/calorie-context";
import { scheduleAllDefaultReminders } from "@/lib/notifications";
import {
  ScrollView, Text, View, TouchableOpacity, ImageBackground, Image, StyleSheet, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Platinum Pulse — hero backgrounds
const PP_DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/cRektLNCAgCjcXYF.jpg";
const PP_PLANS_BG     = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/CHEQDYQzXvdnkYOs.jpg";
const PP_MEALS_BG     = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/tEVJIlpKDmrAmkng.jpg";
const APP_LOGO        = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/app_logo-iTNC7xURufvjtUp3Y5ns3S.png";

// Platinum Pulse colour tokens
const PP = {
  bg:        "#080B0F",
  surface:   "#0E1218",
  surface2:  "#141A22",
  border:    "rgba(226,232,240,0.08)",
  border2:   "rgba(226,232,240,0.14)",
  fg:        "#F1F5F9",
  muted:     "#64748B",
  silver:    "#E2E8F0",
  silver2:   "#94A3B8",
  silver3:   "#CBD5E1",
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function StatRing({ value, label, icon, progress = 0 }: { value: string; label: string; icon: string; progress?: number }) {
  const animProgress = useSharedValue(0);
  const R = 26;
  const circumference = 2 * Math.PI * R;
  useEffect(() => {
    animProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [progress]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value),
  }));
  return (
    <View style={styles.ringItem}>
      <View style={styles.ringContainer}>
        <Svg width={64} height={64} style={StyleSheet.absoluteFill}>
          <Circle cx={32} cy={32} r={R} stroke="rgba(226,232,240,0.08)" strokeWidth={3.5} fill="none" />
          <AnimatedCircle
            cx={32} cy={32} r={R}
            stroke={PP.silver} strokeWidth={3.5} fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90" origin="32,32"
          />
        </Svg>
        <Text style={styles.ringIcon}>{icon}</Text>
      </View>
      <Text style={styles.ringValue}>{value}</Text>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

function QuickActionCard({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.qaCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.qaIconBox}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
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
  const { totalCalories: todayCalories, calorieGoal, meals: todayMeals } = useCalories();
  const [stats, setStats] = useState({ workouts: 0, streak: 0, meals: 0, photos: 0 });

  useEffect(() => {
    if (Platform.OS !== "web" && canUse) {
      scheduleAllDefaultReminders().catch(() => {});
    }
  }, [canUse]);

  useEffect(() => {
    if (!canUse) return;
    Promise.all([
      AsyncStorage.getItem("@workout_count"),
      AsyncStorage.getItem("@streak_count"),
      AsyncStorage.getItem("@progress_photos"),
    ]).then(([wc, sc, pp]) => {
      setStats({
        workouts: wc ? parseInt(wc) : 0,
        streak: sc ? parseInt(sc) : 0,
        meals: todayMeals.length,
        photos: pp ? JSON.parse(pp).length : 0,
      });
    });
  }, [canUse, todayMeals.length]);

  useEffect(() => {
    if (workoutPlan) {
      AsyncStorage.setItem("@cached_workout_plan", JSON.stringify(workoutPlan)).catch(() => {});
    }
  }, [workoutPlan]);

  const caloriesRemaining = Math.max(0, calorieGoal - todayCalories);
  const calorieProgress = calorieGoal > 0 ? Math.min(todayCalories / calorieGoal, 1) : 0;

  useEffect(() => {
    if (authLoading || guestLoading) return;
    AsyncStorage.getItem("@onboarding_complete").then(val => {
      if (!val) {
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

  if (!onboardingChecked && !authLoading && !guestLoading) {
    return <View style={{ flex: 1, backgroundColor: PP.bg }} />;
  }

  // ── Welcome / not logged in ──────────────────────────────────────────────
  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: PP.bg }}>
        <ImageBackground source={{ uri: PP_DASHBOARD_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={styles.welcomeOverlay}>
            <Image source={{ uri: APP_LOGO }} style={styles.welcomeLogo} />
            <Text style={styles.welcomeTitle}>PeakPulse AI</Text>
            <Text style={styles.welcomeSub}>
              Precision performance.{"\n"}Your AI-powered fitness companion.
            </Text>
            <TouchableOpacity style={styles.welcomeBtn} onPress={() => router.push("/login" as any)}>
              <Text style={styles.welcomeBtnText}>Get Started</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#080B0F" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // ── Main Dashboard ───────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: PP.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ flex: 1 }}
      >
        {/* ── Hero Header ── */}
        <ImageBackground
          source={{ uri: PP_DASHBOARD_BG }}
          style={{ width: "100%", height: 300 }}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            {/* Top bar */}
            <View style={styles.heroTopBar}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>⚡ PEAKPULSE AI</Text>
              </View>
              <TouchableOpacity
                style={styles.heroProfileBtn}
                onPress={() => router.push("/(tabs)/profile" as any)}
              >
                <MaterialIcons name="person" size={16} color={PP.silver2} />
                <Text style={styles.heroProfileBtnText}>Profile</Text>
              </TouchableOpacity>
            </View>
            {/* Greeting */}
            <View style={{ paddingBottom: 24 }}>
              <Text style={styles.heroGreeting}>Good morning,</Text>
              <Text style={styles.heroName}>{displayName}</Text>
              {activeProfile?.goal && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <View style={styles.heroPill}>
                    <Text style={styles.heroPillText}>
                      🎯 {activeProfile.goal === "build_muscle" ? "Build Muscle" : activeProfile.goal === "lose_fat" ? "Lose Fat" : activeProfile.goal}
                    </Text>
                  </View>
                  {activeProfile?.workoutStyle && (
                    <View style={styles.heroPill}>
                      <Text style={styles.heroPillText}>🏋️ {activeProfile.workoutStyle}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </ImageBackground>

        {/* ── Stats Ring Row ── */}
        <View style={styles.statsCard}>
          <StatRing value={String(stats.workouts)} label="Workouts" icon="🏋️" progress={Math.min(stats.workouts / 30, 1)} />
          <View style={styles.statsDivider} />
          <StatRing value={String(stats.streak)} label="Streak" icon="🔥" progress={Math.min(stats.streak / 7, 1)} />
          <View style={styles.statsDivider} />
          <StatRing value={String(stats.meals)} label="Meals" icon="🥗" progress={Math.min(stats.meals / 3, 1)} />
          <View style={styles.statsDivider} />
          <StatRing value={String(stats.photos)} label="Photos" icon="📸" progress={Math.min(stats.photos / 30, 1)} />
        </View>

        {/* ── Calorie Progress ── */}
        {calorieGoal > 0 && (
          <View style={styles.calorieCard}>
            <View style={styles.calorieHeader}>
              <View>
                <Text style={styles.cardEyebrow}>TODAY'S CALORIES</Text>
                <Text style={styles.calorieValue}>
                  {todayCalories}{" "}
                  <Text style={styles.calorieGoal}>/ {calorieGoal} kcal</Text>
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.cardEyebrow}>REMAINING</Text>
                <Text style={[styles.calorieValue, { color: caloriesRemaining < 200 ? "#94A3B8" : PP.silver }]}>
                  {caloriesRemaining} kcal
                </Text>
              </View>
            </View>
            {/* Progress track */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${calorieProgress * 100}%` as any }]} />
            </View>
            {/* Macros */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              {["Protein", "Carbs", "Fat"].map((macro, i) => {
                const vals = [0, 0, 0];
                (todayMeals as MealEntry[]).forEach(m => { vals[0] += m.protein ?? 0; vals[1] += m.carbs ?? 0; vals[2] += m.fat ?? 0; });
                return (
                  <View key={macro} style={{ alignItems: "center" }}>
                    <Text style={styles.macroValue}>{Math.round(vals[i])}g</Text>
                    <Text style={styles.macroLabel}>{macro}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.qaRow}>
            <QuickActionCard icon="📸" label="AI Body Scan"   onPress={() => router.push("/(tabs)/scan" as any)} />
            <QuickActionCard icon="🏋️" label="Start Workout"  onPress={() => router.push("/(tabs)/plans" as any)} />
            <QuickActionCard icon="🥗" label="Log Meal"       onPress={() => router.push("/(tabs)/meals" as any)} />
          </View>
          <View style={styles.qaRow}>
            <QuickActionCard icon="📊" label="Progress"       onPress={() => router.push("/progress-photos" as any)} />
            <QuickActionCard icon="🗺️" label="Find Gym"       onPress={() => router.push("/gym-finder" as any)} />
            <QuickActionCard icon="⌚" label="Wearables"      onPress={() => router.push("/wearable-sync" as any)} />
          </View>
          <View style={styles.qaRow}>
            <QuickActionCard icon="✅" label="Daily Check-In" onPress={() => router.push("/daily-checkin" as any)} />
            <QuickActionCard icon="🎯" label="Form Check"     onPress={() => router.push("/form-checker" as any)} />
            <QuickActionCard icon="👥" label="Community"      onPress={() => router.push("/social-feed" as any)} />
          </View>
          <View style={styles.qaRow}>
            <QuickActionCard icon="⚡" label="7-Day Challenge" onPress={() => router.push("/challenge-onboarding" as any)} />
            <QuickActionCard icon="🎁" label="Refer a Friend"  onPress={() => router.push("/referral" as any)} />
            <QuickActionCard icon="⭐" label="Upgrade"         onPress={() => router.push("/subscription" as any)} />
          </View>
        </View>

        {/* ── Today's Workout ── */}
        {workoutPlan?.schedule?.[0] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <ImageBackground
              source={{ uri: PP_PLANS_BG }}
              style={{ borderRadius: 20, overflow: "hidden" }}
              resizeMode="cover"
            >
              <View style={styles.planCardOverlay}>
                <Text style={styles.cardEyebrow}>{workoutPlan.schedule[0].day?.toUpperCase()}</Text>
                <Text style={styles.planCardTitle}>{workoutPlan.schedule[0].focus}</Text>
                <Text style={styles.planCardSub}>{workoutPlan.schedule[0].exercises?.length ?? 0} exercises</Text>
                <TouchableOpacity
                  style={styles.planCardBtn}
                  onPress={() => router.push("/(tabs)/plans" as any)}
                >
                  <Text style={styles.planCardBtnText}>Start Workout</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#080B0F" />
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* ── Today's Nutrition ── */}
        {(mealPlan as any)?.days?.[0] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Nutrition</Text>
            <ImageBackground
              source={{ uri: PP_MEALS_BG }}
              style={{ borderRadius: 20, overflow: "hidden" }}
              resizeMode="cover"
            >
              <View style={styles.planCardOverlay}>
                <Text style={styles.cardEyebrow}>MEAL PLAN</Text>
                <Text style={styles.planCardTitle}>{(mealPlan as any).days[0].totalCalories} kcal target</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  {[
                    { label: "Protein", value: (mealPlan as any).days[0].protein + "g" },
                    { label: "Carbs",   value: (mealPlan as any).days[0].carbs + "g" },
                    { label: "Fats",    value: (mealPlan as any).days[0].fats + "g" },
                  ].map(m => (
                    <View key={m.label} style={styles.macroPill}>
                      <Text style={styles.macroPillValue}>{m.value}</Text>
                      <Text style={styles.macroPillLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.planCardBtn}
                  onPress={() => router.push("/(tabs)/meals" as any)}
                >
                  <Text style={styles.planCardBtnText}>View Meal Plan</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#080B0F" />
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* ── No plans CTA ── */}
        {!workoutPlan && !mealPlan && (
          <View style={styles.section}>
            <ImageBackground
              source={{ uri: PP_DASHBOARD_BG }}
              style={{ borderRadius: 24, overflow: "hidden" }}
              resizeMode="cover"
            >
              <View style={styles.ctaOverlay}>
                <MaterialIcons name="rocket-launch" size={48} color={PP.silver} style={{ marginBottom: 12 }} />
                <Text style={styles.ctaTitle}>Ready to Transform?</Text>
                <Text style={styles.ctaSub}>
                  Start with an AI Body Scan to analyse your physique, then get a personalised workout and meal plan.
                </Text>
                <TouchableOpacity
                  style={styles.ctaBtn}
                  onPress={() => router.push("/(tabs)/scan" as any)}
                >
                  <Text style={styles.ctaBtnText}>Start AI Body Scan</Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#080B0F" />
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* ── Guest banner ── */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <MaterialIcons name="info-outline" size={20} color={PP.silver2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.guestBannerTitle}>Using as Guest</Text>
              <Text style={styles.guestBannerSub}>Your data is stored locally. Sign in to sync across devices.</Text>
            </View>
            <TouchableOpacity
              style={styles.guestBannerBtn}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={styles.guestBannerBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Welcome screen
  welcomeOverlay: { flex: 1, backgroundColor: "rgba(8,11,15,0.72)", alignItems: "center", justifyContent: "center", padding: 32 },
  welcomeLogo: { width: 80, height: 80, borderRadius: 20, marginBottom: 24 },
  welcomeTitle: { color: PP.fg, fontSize: 38, fontFamily: "Syne_800ExtraBold", textAlign: "center", letterSpacing: -1 },
  welcomeSub: { color: PP.silver2, fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 22, fontFamily: "Inter_400Regular" },
  welcomeBtn: { marginTop: 40, backgroundColor: PP.silver, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 40, flexDirection: "row", alignItems: "center" },
  welcomeBtnText: { color: "#080B0F", fontFamily: "Inter_700Bold", fontSize: 16 },

  // Hero
  heroOverlay: { flex: 1, backgroundColor: "rgba(8,11,15,0.55)", padding: 20, justifyContent: "space-between" },
  heroTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 44 },
  heroBadge: { backgroundColor: "rgba(226,232,240,0.1)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: PP.border2 },
  heroBadgeText: { color: PP.silver, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.5 },
  heroProfileBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(226,232,240,0.08)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: PP.border },
  heroProfileBtnText: { color: PP.silver2, fontFamily: "Inter_500Medium", fontSize: 13 },
  heroGreeting: { color: PP.silver2, fontFamily: "Inter_500Medium", fontSize: 14 },
  heroName: { color: PP.fg, fontFamily: "Syne_800ExtraBold", fontSize: 30, letterSpacing: -0.5, marginTop: 2 },
  heroPill: { backgroundColor: "rgba(226,232,240,0.1)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: PP.border2 },
  heroPillText: { color: PP.silver3, fontFamily: "Inter_500Medium", fontSize: 12 },

  // Stats card
  statsCard: { backgroundColor: PP.surface, marginHorizontal: 16, marginTop: -20, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: PP.border, flexDirection: "row", gap: 8 },
  statsDivider: { width: 1, backgroundColor: PP.border },
  ringItem: { alignItems: "center", flex: 1 },
  ringContainer: { width: 64, height: 64, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  ringIcon: { fontSize: 20 },
  ringValue: { color: PP.fg, fontFamily: "Syne_700Bold", fontSize: 14 },
  ringLabel: { color: PP.muted, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 1 },

  // Calorie card
  calorieCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: PP.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: PP.border },
  calorieHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardEyebrow: { color: PP.muted, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 },
  calorieValue: { color: PP.fg, fontFamily: "Syne_700Bold", fontSize: 22 },
  calorieGoal: { color: PP.muted, fontFamily: "Inter_400Regular", fontSize: 14 },
  progressTrack: { height: 6, backgroundColor: PP.border, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: PP.silver },
  macroValue: { color: PP.silver3, fontFamily: "Inter_700Bold", fontSize: 13 },
  macroLabel: { color: PP.muted, fontFamily: "Inter_400Regular", fontSize: 10 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { color: PP.fg, fontFamily: "Syne_700Bold", fontSize: 18, marginBottom: 12 },

  // Quick actions
  qaRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  qaCard: { flex: 1, backgroundColor: PP.surface, borderRadius: 18, padding: 14, alignItems: "center", gap: 8, borderWidth: 1, borderColor: PP.border },
  qaIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(226,232,240,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: PP.border },
  qaLabel: { color: PP.silver3, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center" },

  // Plan / meal card
  planCardOverlay: { backgroundColor: "rgba(8,11,15,0.78)", padding: 20 },
  planCardTitle: { color: PP.fg, fontFamily: "Syne_700Bold", fontSize: 20, marginTop: 4 },
  planCardSub: { color: PP.muted, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 4 },
  planCardBtn: { backgroundColor: PP.silver, borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 16, flexDirection: "row", justifyContent: "center", gap: 6 },
  planCardBtnText: { color: "#080B0F", fontFamily: "Inter_700Bold", fontSize: 14 },

  // Macro pills
  macroPill: { backgroundColor: "rgba(226,232,240,0.08)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: PP.border },
  macroPillValue: { color: PP.silver, fontFamily: "Inter_700Bold", fontSize: 13 },
  macroPillLabel: { color: PP.muted, fontFamily: "Inter_400Regular", fontSize: 10 },

  // CTA
  ctaOverlay: { backgroundColor: "rgba(8,11,15,0.82)", padding: 28, alignItems: "center" },
  ctaTitle: { color: PP.fg, fontFamily: "Syne_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 },
  ctaSub: { color: PP.muted, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  ctaBtn: { backgroundColor: PP.silver, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8 },
  ctaBtnText: { color: "#080B0F", fontFamily: "Inter_700Bold", fontSize: 16 },

  // Guest banner
  guestBanner: { marginHorizontal: 16, marginTop: 20, backgroundColor: PP.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: PP.border, flexDirection: "row", alignItems: "center", gap: 12 },
  guestBannerTitle: { color: PP.silver3, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  guestBannerSub: { color: PP.muted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  guestBannerBtn: { backgroundColor: PP.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: PP.border2 },
  guestBannerBtnText: { color: PP.silver, fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
