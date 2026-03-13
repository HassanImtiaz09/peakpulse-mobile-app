import React, { useEffect, useState } from "react";
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
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallModal } from "@/components/paywall-modal";

const TIPS_AND_TRICKS = [
  { icon: "💧", tip: "Drink 500ml of water first thing in the morning to kickstart your metabolism and hydration." },
  { icon: "🏋️", tip: "Compound lifts (squat, deadlift, bench) give you the most muscle-building bang for your time — prioritise them." },
  { icon: "😴", tip: "Sleep is when your muscles grow. Aim for 7-9 hours — it's the most underrated recovery tool." },
  { icon: "🥩", tip: "Aim for 1.6-2.2g of protein per kg of bodyweight daily to maximise muscle retention and growth." },
  { icon: "🔥", tip: "Progressive overload is the key to results — add 1 rep or 2.5kg each week to keep your muscles adapting." },
  { icon: "🧠", tip: "Mind-muscle connection matters. Slow down your reps and focus on feeling the target muscle contract." },
  { icon: "📸", tip: "Take progress photos every 2 weeks in the same lighting — the scale lies, photos don't." },
  { icon: "🍽️", tip: "Meal prepping on Sunday saves 45+ minutes per day and makes it 3x easier to hit your calorie targets." },
  { icon: "⏱️", tip: "Rest 60-90 seconds between hypertrophy sets, 2-3 minutes for strength work. Timer matters." },
  { icon: "🚶", tip: "10,000 steps a day burns an extra 300-500 calories without touching your workout recovery." },
  { icon: "🥑", tip: "Don't fear fats — avocado, nuts and olive oil support hormone production including testosterone." },
  { icon: "📊", tip: "Track your workouts. People who log their sessions progress 40% faster than those who don't." },
  { icon: "🧘", tip: "Stress raises cortisol which promotes fat storage. Even 5 minutes of deep breathing post-workout helps." },
  { icon: "🍌", tip: "Eat fast-digesting carbs (banana, white rice) within 30 min post-workout to replenish glycogen." },
  { icon: "💊", tip: "Creatine monohydrate is the most researched supplement in sports science — 3-5g daily is proven to work." },
];
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Aurora Titan — hero backgrounds
const AT_DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg"; // Solar Forge dashboard bg
const AT_PLANS_BG     = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";
const AT_MEALS_BG     = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";
const APP_LOGO        = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// Aurora Titan colour tokens
const SF = {
  bg:        "#0A0500",
  surface:   "#150A00",
  surface2:  "#1F0D00",
  border:    "rgba(245,158,11,0.12)",
  border2:   "rgba(245,158,11,0.20)",
  fg:        "#FFF7ED",
  muted:     "#92400E",
  gold:      "#F59E0B",
  orange:    "#EA580C",
  gold2:     "#FBBF24",
  gold3:     "#FDE68A",
  red:       "#DC2626",
  // Solar Forge aliases for Aurora Titan colour tokens
  emerald:   "#F59E0B",
  emerald2:  "#FBBF24",
  emerald3:  "#FDE68A",
  teal:      "#EA580C",
  teal2:     "#F97316",
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
          <Circle cx={32} cy={32} r={R} stroke="rgba(245,158,11,0.12)" strokeWidth={3.5} fill="none" />
          <AnimatedCircle
            cx={32} cy={32} r={R}
            stroke={SF.emerald} strokeWidth={3.5} fill="none"
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
  const { canAccess } = useSubscription();
  const [paywallFeature, setPaywallFeature] = useState<{ name: string; icon: string; tier: "basic" | "advanced"; desc?: string } | null>(null);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { guestProfile, isGuest, loading: guestLoading } = useGuestAuth();
  const [localProfile, setLocalProfile] = useState<any>(null);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const canUse = isAuthenticated || isGuest;
  const [tipIndex, setTipIndex] = React.useState(0);
  // Rotate tips every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS_AND_TRICKS.length);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
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
    return <View style={{ flex: 1, backgroundColor: SF.bg }} />;
  }

  // ── Welcome / not logged in ──────────────────────────────────────────────
  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <ImageBackground source={{ uri: AT_DASHBOARD_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={styles.welcomeOverlay}>
            <Image source={{ uri: APP_LOGO }} style={styles.welcomeLogo} />
            <Text style={styles.welcomeTitle}>PeakPulse AI</Text>
            <Text style={styles.welcomeSub}>
              Precision performance.{"\n"}Your AI-powered fitness companion.
            </Text>
            <TouchableOpacity style={styles.welcomeBtn} onPress={() => router.push("/login" as any)}>
              <Text style={styles.welcomeBtnText}>Get Started</Text>
              <MaterialIcons name="arrow-forward" size={18} color={SF.bg} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  const gatedNav = (path: string, feature: string, icon: string, tier: "basic" | "advanced", desc?: string) => {
    if (canAccess(feature)) {
      router.push(path as any);
    } else {
      setPaywallFeature({ name: feature.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon, tier, desc });
    }
  };

  // ── Main Dashboard ───────────────────────────────────────────────────────
  return (
    <>
    <PaywallModal
      visible={!!paywallFeature}
      onClose={() => setPaywallFeature(null)}
      featureName={paywallFeature?.name ?? ""}
      featureIcon={paywallFeature?.icon}
      requiredTier={paywallFeature?.tier ?? "basic"}
      description={paywallFeature?.desc}
    />
    <View style={{ flex: 1, backgroundColor: SF.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ flex: 1 }}
      >
        {/* ── Hero Header ── */}
        <ImageBackground
          source={{ uri: AT_DASHBOARD_BG }}
          style={{ width: "100%", height: 300 }}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay}>
            {/* Top bar */}
            <View style={styles.heroTopBar}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>⚡ PEAKPULSE AI</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TouchableOpacity
                  style={[styles.heroProfileBtn, { paddingHorizontal: 10 }]}
                  onPress={() => router.push("/user-guide" as any)}
                >
                  <MaterialIcons name="help-outline" size={16} color={SF.emerald2} />
                  <Text style={styles.heroProfileBtnText}>Guide</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroProfileBtn}
                  onPress={() => router.push("/(tabs)/profile" as any)}
                >
                  <MaterialIcons name="person" size={16} color={SF.emerald2} />
                  <Text style={styles.heroProfileBtnText}>Profile</Text>
                </TouchableOpacity>
              </View>
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
                <Text style={[styles.calorieValue, { color: caloriesRemaining < 200 ? SF.teal : SF.emerald }]}>
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
            <QuickActionCard icon="📊" label="Progress"       onPress={() => gatedNav("/progress-photos", "progress_photos", "📊", "basic", "Track your body transformation with progress photos — Basic plan and above.")} />
            <QuickActionCard icon="🗺️" label="Find Gym"       onPress={() => router.push("/gym-finder" as any)} />
            <QuickActionCard icon="⌚" label="Wearables"      onPress={() => gatedNav("/wearable-sync", "wearable_sync", "⌚", "basic", "Sync your fitness wearable with PeakPulse — Basic plan and above.")} />
          </View>
          <View style={styles.qaRow}>
            <QuickActionCard icon="✅" label="Daily Check-In" onPress={() => router.push("/daily-checkin" as any)} />
            <QuickActionCard icon="🎯" label="Form Check"     onPress={() => gatedNav("/form-checker", "form_checker", "🎯", "advanced", "AI-powered real-time exercise form analysis — Advanced plan exclusive.")} />
            <QuickActionCard icon="👥" label="Community"      onPress={() => gatedNav("/social-feed", "social_feed", "👥", "advanced", "Join the PeakPulse community, share progress, and compete in challenges — Advanced plan only.")} />
          </View>
          <View style={styles.qaRow}>
            <QuickActionCard icon="⚡" label="7-Day Challenge" onPress={() => gatedNav("/challenge-onboarding", "challenges", "⚡", "advanced", "Unlock 7-day fitness challenges and leaderboards — Advanced plan only.")} />
            <QuickActionCard icon="🎁" label="Refer a Friend"  onPress={() => router.push("/referral" as any)} />
            <QuickActionCard icon="⭐" label="Upgrade"         onPress={() => router.push("/subscription" as any)} />
          </View>
        </View>

        {/* ── Today's Workout ── */}
        {workoutPlan?.schedule?.[0] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <ImageBackground
              source={{ uri: AT_PLANS_BG }}
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
                  <MaterialIcons name="arrow-forward" size={16} color={SF.bg} />
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
              source={{ uri: AT_MEALS_BG }}
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
                  <MaterialIcons name="arrow-forward" size={16} color={SF.bg} />
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* ── No plans CTA ── */}
        {!workoutPlan && !mealPlan && (
          <View style={styles.section}>
            <ImageBackground
              source={{ uri: AT_DASHBOARD_BG }}
              style={{ borderRadius: 24, overflow: "hidden" }}
              resizeMode="cover"
            >
              <View style={styles.ctaOverlay}>
                <MaterialIcons name="rocket-launch" size={48} color={SF.emerald} style={{ marginBottom: 12 }} />
                <Text style={styles.ctaTitle}>Ready to Transform?</Text>
                <Text style={styles.ctaSub}>
                  Start with an AI Body Scan to analyse your physique, then get a personalised workout and meal plan.
                </Text>
                <TouchableOpacity
                  style={styles.ctaBtn}
                  onPress={() => router.push("/(tabs)/scan" as any)}
                >
                  <Text style={styles.ctaBtnText}>Start AI Body Scan</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={SF.bg} />
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </View>
        )}

        {/* ── Tips & Tricks ── */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>💡 Tips & Tricks</Text>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              onPress={() => setTipIndex(prev => (prev + 1) % TIPS_AND_TRICKS.length)}
            >
              <MaterialIcons name="refresh" size={14} color={SF.muted} />
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Next tip</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: SF.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: SF.border2, flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border, flexShrink: 0 }}>
              <Text style={{ fontSize: 24 }}>{TIPS_AND_TRICKS[tipIndex].icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22 }}>
                {TIPS_AND_TRICKS[tipIndex].tip}
              </Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 8 }}>
                Tip {tipIndex + 1} of {TIPS_AND_TRICKS.length} · Updates every 5 min
              </Text>
            </View>
          </View>
        </View>

        {/* ── Guest banner ── */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <MaterialIcons name="info-outline" size={20} color={SF.emerald2} />
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
    </>
  );
}

const styles = StyleSheet.create({
  // Welcome screen
  welcomeOverlay: { flex: 1, backgroundColor: "rgba(10,5,0,0.72)", alignItems: "center", justifyContent: "center", padding: 32 },
  welcomeLogo: { width: 80, height: 80, borderRadius: 20, marginBottom: 24 },
  welcomeTitle: { color: SF.fg, fontSize: 38, fontFamily: "Outfit_800ExtraBold", textAlign: "center", letterSpacing: -1 },
  welcomeSub: { color: SF.emerald3, fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 22, fontFamily: "DMSans_400Regular" },
  welcomeBtn: { marginTop: 40, backgroundColor: SF.emerald, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 40, flexDirection: "row", alignItems: "center" },
  welcomeBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 },

  // Hero
  heroOverlay: { flex: 1, backgroundColor: "rgba(10,5,0,0.55)", padding: 20, justifyContent: "space-between" },
  heroTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 44 },
  heroBadge: { backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: SF.border2 },
  heroBadgeText: { color: SF.emerald, fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5 },
  heroProfileBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: SF.border },
  heroProfileBtnText: { color: SF.emerald2, fontFamily: "DMSans_500Medium", fontSize: 13 },
  heroGreeting: { color: SF.emerald3, fontFamily: "DMSans_500Medium", fontSize: 14 },
  heroName: { color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 30, letterSpacing: -0.5, marginTop: 2 },
  heroPill: { backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: SF.border2 },
  heroPillText: { color: SF.emerald2, fontFamily: "DMSans_500Medium", fontSize: 12 },

  // Stats card
  statsCard: { backgroundColor: SF.surface, marginHorizontal: 16, marginTop: -20, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: SF.border, flexDirection: "row", gap: 8 },
  statsDivider: { width: 1, backgroundColor: SF.border },
  ringItem: { alignItems: "center", flex: 1 },
  ringContainer: { width: 64, height: 64, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  ringIcon: { fontSize: 20 },
  ringValue: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 14 },
  ringLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 1 },

  // Calorie card
  calorieCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: SF.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: SF.border },
  calorieHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardEyebrow: { color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 },
  calorieValue: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 22 },
  calorieGoal: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14 },
  progressTrack: { height: 6, backgroundColor: SF.border, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: SF.emerald },
  macroValue: { color: SF.emerald2, fontFamily: "DMSans_700Bold", fontSize: 13 },
  macroLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 18, marginBottom: 12 },

  // Quick actions
  qaRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  qaCard: { flex: 1, backgroundColor: SF.surface, borderRadius: 18, padding: 14, alignItems: "center", gap: 8, borderWidth: 1, borderColor: SF.border },
  qaIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border },
  qaLabel: { color: SF.emerald3, fontFamily: "DMSans_500Medium", fontSize: 11, textAlign: "center" },

  // Plan / meal card
  planCardOverlay: { backgroundColor: "rgba(10,5,0,0.78)", padding: 20 },
  planCardTitle: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 20, marginTop: 4 },
  planCardSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 4 },
  planCardBtn: { backgroundColor: SF.emerald, borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 16, flexDirection: "row", justifyContent: "center", gap: 6 },
  planCardBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 14 },

  // Macro pills
  macroPill: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: SF.border },
  macroPillValue: { color: SF.emerald, fontFamily: "DMSans_700Bold", fontSize: 13 },
  macroPillLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },

  // CTA
  ctaOverlay: { backgroundColor: "rgba(10,5,0,0.82)", padding: 28, alignItems: "center" },
  ctaTitle: { color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 },
  ctaSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  ctaBtn: { backgroundColor: SF.emerald, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8 },
  ctaBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 },

  // Guest banner
  guestBanner: { marginHorizontal: 16, marginTop: 20, backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border, flexDirection: "row", alignItems: "center", gap: 12 },
  guestBannerTitle: { color: SF.emerald2, fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  guestBannerSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  guestBannerBtn: { backgroundColor: SF.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: SF.border2 },
  guestBannerBtnText: { color: SF.emerald, fontFamily: "DMSans_600SemiBold", fontSize: 12 },
});
