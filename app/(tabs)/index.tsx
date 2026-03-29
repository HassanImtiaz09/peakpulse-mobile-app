/**
 * R1 + R5 + R6: Streamlined Dashboard
 * 6 focused sections replacing 20+ deep-scroll sections.
 * Sections: Hero, Today's Workout, Daily Progress, Weekly Goals, Quick Insights, Explore Grid
 */
import React, { useEffect, useState, useCallback } from "react";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  withTiming, withDelay, withSequence, Easing, interpolate, Extrapolation,
} from "react-native-reanimated";
import { useCalories, type MealEntry } from "@/lib/calorie-context";
import { scheduleAllDefaultReminders } from "@/lib/notifications";
import {
  Text, View, TouchableOpacity, ImageBackground, Image, StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallModal } from "@/components/paywall-modal";
import { TutorialOverlay, useTutorial } from "@/components/tutorial-overlay";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getWeeklyGoals, calculateWeeklyProgress, getWorkoutsThisWeek, isGoalTrackingEnabled, type WeeklyProgress } from "@/lib/goal-tracking";
import { useUserProfile } from "@/lib/user-profile-context";
import { useExerciseCompletion } from "@/lib/exercise-completion-context";
import { useWearable } from "@/lib/wearable-context";
import { getStreakData, type StreakData } from "@/lib/streak-tracking";
import { getPRSummary, type PRSummary } from "@/lib/personal-records";
import { getNextPrompt, dismissPrompt, type DiscoveryPrompt } from "@/lib/feature-discovery";
import { QuickInsightsCarousel } from "@/components/quick-insights-carousel";
import { ExploreGrid } from "@/components/explore-grid";
import { FloatingStartWorkout } from "@/components/floating-start-workout";
import { DiscoveryBanner } from "@/components/discovery-banner";
import { analyzeMuscleBalance, generateSuggestions, generatePlanChanges, type MuscleBalanceReport, type ExerciseSuggestion, type PlanChange } from "@/lib/muscle-balance";
import { BodyHeatmap } from "@/components/body-heatmap";
import { TrendChart, type TrendDataPoint } from "@/components/trend-chart";
import { WearableMetricsPanel } from "@/components/wearable-metrics-panel";
import { PremiumFeatureBanner, PremiumFeatureTeaser } from "@/components/premium-feature-banner";
import { usePantry } from "@/lib/pantry-context";
import { getActiveChallenges, type Challenge } from "@/lib/challenge-service";
import { loadOrCreateSocialCircle, getActiveFriendsCount, type SocialCircleData } from "@/lib/social-circle";

const AT_DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const TIPS_AND_TRICKS = [
  { icon: "water-drop" as const, tip: "Drink 500ml of water first thing in the morning to kickstart your metabolism and hydration." },
  { icon: "fitness-center" as const, tip: "Compound lifts (squat, deadlift, bench) give you the most muscle-building bang for your time \u2014 prioritise them." },
  { icon: "bedtime" as const, tip: "Sleep is when your muscles grow. Aim for 7-9 hours \u2014 it\u2019s the most underrated recovery tool." },
  { icon: "restaurant" as const, tip: "Aim for 1.6-2.2g of protein per kg of bodyweight daily to maximise muscle retention and growth." },
  { icon: "local-fire-department" as const, tip: "Progressive overload is the key to results \u2014 add 1 rep or 2.5kg each week to keep your muscles adapting." },
  { icon: "psychology" as const, tip: "Mind-muscle connection matters. Slow down your reps and focus on feeling the target muscle contract." },
  { icon: "photo-camera" as const, tip: "Take progress photos every 2 weeks in the same lighting \u2014 the scale lies, photos don\u2019t." },
  { icon: "kitchen" as const, tip: "Meal prepping on Sunday saves 45+ minutes per day and makes it 3x easier to hit your calorie targets." },
  { icon: "timer" as const, tip: "Rest 60-90 seconds between hypertrophy sets, 2-3 minutes for strength work. Timer matters." },
  { icon: "directions-walk" as const, tip: "10,000 steps a day burns an extra 300-500 calories without touching your workout recovery." },
  { icon: "eco" as const, tip: "Don\u2019t fear fats \u2014 avocado, nuts and olive oil support hormone production including testosterone." },
  { icon: "trending-up" as const, tip: "Track your workouts. People who log their sessions progress 40% faster than those who don\u2019t." },
  { icon: "self-improvement" as const, tip: "Stress raises cortisol which promotes fat storage. Even 5 minutes of deep breathing post-workout helps." },
  { icon: "bolt" as const, tip: "Eat fast-digesting carbs (banana, white rice) within 30 min post-workout to replenish glycogen." },
  { icon: "science" as const, tip: "Creatine monohydrate is the most researched supplement in sports science \u2014 3-5g daily is proven to work." },
];
const APP_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const SF = {
  bg: "#0A0E14", surface: "#141A22", surface2: "#1A2030",
  surfacePrimary: "#141A22",
  border: "rgba(30,41,59,0.6)", border2: "rgba(30,41,59,0.8)",
  borderPrimary: "rgba(30,41,59,0.9)",
  fg: "#F1F5F9", muted: "#64748B", gold: "#F59E0B", orange: "#EA580C",
  gold2: "#FBBF24", gold3: "#FDE68A", red: "#DC2626",
  emerald: "#F59E0B", emerald2: "#FBBF24", emerald3: "#FDE68A",
  teal: "#EA580C", teal2: "#F97316",
  ice: "#22D3EE", mint: "#10B981", rose: "#F472B6",
  macroProtein: "#60A5FA", macroCarbs: "#FBBF24", macroFat: "#FB923C",
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

// ── Staggered animation wrapper ────────────────────────────────────────
function StaggeredCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  useEffect(() => {
    opacity.value = withDelay(index * 60, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(index * 60, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <AnimatedView style={animStyle}>{children}</AnimatedView>;
}

// ── Section title with gold accent bar ─────────────────────────────────
function SectionTitle({ title, rightElement }: { title: string; rightElement?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: SF.gold }} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {rightElement}
    </View>
  );
}

// ── Compact Goal Ring ──────────────────────────────────────────────────
function GoalRing({ value, label, percentage, color }: { value: string; label: string; percentage: number; color: string }) {
  const R = 22;
  const circumference = 2 * Math.PI * R;
  const pct = Math.min(Math.max(percentage, 0), 100);
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }}>
        <Svg width={52} height={52}>
          <Circle cx={26} cy={26} r={R} stroke={color + "20"} strokeWidth={4} fill="none" />
          <Circle cx={26} cy={26} r={R} stroke={color} strokeWidth={4} fill="none"
            strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
            strokeLinecap="round" transform="rotate(-90 26 26)" />
        </Svg>
        <View style={{ position: "absolute" }}>
          <Text style={{ color, fontFamily: "DMSans_700Bold", fontSize: 11, textAlign: "center" }}>{pct}%</Text>
        </View>
      </View>
      <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 10, marginTop: 3 }}>{label}</Text>
      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>{value}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { canAccess, isTrialActive, daysLeftInTrial, hasUsedTrial, isPaid } = useSubscription();
  const [paywallFeature, setPaywallFeature] = useState<{ name: string; icon: string; tier: "basic" | "pro"; desc?: string } | null>(null);
  const { showTutorial, dismissTutorial } = useTutorial();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { guestProfile, isGuest, loading: guestLoading } = useGuestAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const canUse = isAuthenticated || isGuest;
  const wearableData = useWearable();
  const [goalProgress, setGoalProgress] = useState<WeeklyProgress | null>(null);
  const [goalsEnabled, setGoalsEnabled] = useState(false);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [prSummary, setPrSummary] = useState<PRSummary | null>(null);
  const [muscleReport, setMuscleReport] = useState<MuscleBalanceReport | null>(null);
  const [discoveryPrompt, setDiscoveryPrompt] = useState<DiscoveryPrompt | null>(null);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS_AND_TRICKS.length));
  const { items: pantryItems, getExpiringItems } = usePantry();
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [socialCircle, setSocialCircle] = useState<SocialCircleData | null>(null);

  const [hasLocalWorkoutPlan, setHasLocalWorkoutPlan] = useState(false);
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);

  const exerciseCompletion = useExerciseCompletion();
  const { displayName: savedDisplayName, profilePhotoUri } = useUserProfile();
  const displayName = savedDisplayName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? guestProfile?.name?.split(" ")[0] ?? "Athlete";

  // ── Server-side data ─────
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: workoutPlan } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: mealPlan } = trpc.mealPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });

  const { totalCalories: todayCalories, calorieGoal, meals: todayMeals, setCalorieGoal, macroTargets } = useCalories();

  useEffect(() => {
    AsyncStorage.getItem("@user_tdee").then(raw => {
      if (raw) {
        const tdee = parseInt(raw, 10);
        if (!isNaN(tdee) && tdee > 0 && tdee !== calorieGoal) setCalorieGoal(tdee);
      }
    });
  }, []);

  // Check for locally cached workout plan (guest mode or async generation)
  useEffect(() => {
    const checkLocalPlan = async () => {
      try {
        const [cachedPlan, guestPlan, generatingFlag] = await Promise.all([
          AsyncStorage.getItem("@cached_workout_plan"),
          AsyncStorage.getItem("@guest_workout_plan"),
          AsyncStorage.getItem("@plan_generating"),
        ]);

        if (cachedPlan || guestPlan) {
          setHasLocalWorkoutPlan(true);
          try {
            const plan = JSON.parse(cachedPlan || guestPlan || "{}");
            if (plan?.schedule?.[0] && !workoutPlan) {
              // We have a local plan but server hasn't returned one yet
            }
          } catch {}
        }

        if (generatingFlag === "true") {
          setIsPlanGenerating(true);
          const startTime = Date.now();
          const pollInterval = setInterval(async () => {
            const flag = await AsyncStorage.getItem("@plan_generating");
            const plan = await AsyncStorage.getItem("@cached_workout_plan");
            if (flag !== "true" || plan || Date.now() - startTime > 60000) {
              setIsPlanGenerating(false);
              if (plan) setHasLocalWorkoutPlan(true);
              clearInterval(pollInterval);
            }
          }, 5000);
          return () => clearInterval(pollInterval);
        }
      } catch (err) {
        console.warn("Error checking local workout plan:", err);
      }
    };
    checkLocalPlan();
  }, [workoutPlan]);

  // ── Onboarding guard ─────
  useEffect(() => {
    if (authLoading || guestLoading) return;
    if (isAuthenticated) {
      const timer = setTimeout(() => setOnboardingChecked(true), 800);
      return () => clearTimeout(timer);
    }
    AsyncStorage.getItem("@onboarding_complete").then(val => {
      if (!val) router.replace("/onboarding" as any);
      else setOnboardingChecked(true);
    });
  }, [authLoading, guestLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (profile === null) router.replace("/onboarding" as any);
    else if (profile !== undefined) setOnboardingChecked(true);
  }, [profile, isAuthenticated, authLoading]);

  // ── Load analytics data ─────
  useEffect(() => {
    if (!canUse) return;
    (async () => {
      try {
        const enabled = await isGoalTrackingEnabled();
        setGoalsEnabled(enabled);
        if (enabled) {
          const goals = await getWeeklyGoals();
          const workoutsThisWeek = await getWorkoutsThisWeek();
          const progress = calculateWeeklyProgress(goals, {
            avgDailySteps: wearableData.stats.steps,
            avgDailyCalories: wearableData.stats.totalCaloriesBurnt,
            workoutsThisWeek,
          });
          setGoalProgress(progress);
        }
        const streak = await getStreakData();
        setStreakData(streak);
        const summary = await getPRSummary();
        setPrSummary(summary);
        const report = await analyzeMuscleBalance(7);
        setMuscleReport(report);
        // Social & challenges
        try {
          const challenges = await getActiveChallenges();
          setActiveChallenges(challenges);
          const userName = savedDisplayName ?? user?.name ?? guestProfile?.name ?? "Athlete";
          const circle = await loadOrCreateSocialCircle(userName);
          setSocialCircle(circle);
        } catch {}
      } catch {}
    })();
  }, [canUse, wearableData.stats.steps, wearableData.stats.totalCaloriesBurnt]);

  // ── Load discovery prompt (R2) ─────
  useEffect(() => {
    if (!canUse) return;
    getNextPrompt().then(p => setDiscoveryPrompt(p));
  }, [canUse]);

  useEffect(() => {
    if (Platform.OS !== "web" && canUse) {
      scheduleAllDefaultReminders().catch(() => {});
    }
  }, [canUse]);

  const caloriesRemaining = Math.max(0, calorieGoal - todayCalories);
  const calorieProgress = calorieGoal > 0 ? Math.min(todayCalories / calorieGoal, 1) : 0;
  const activeProfile = isAuthenticated ? profile : guestProfile;

  // Macro values
  const macroVals = [0, 0, 0];
  (todayMeals as MealEntry[]).forEach(m => { macroVals[0] += m.protein ?? 0; macroVals[1] += m.carbs ?? 0; macroVals[2] += m.fat ?? 0; });
  const macroGoals = [macroTargets.protein, macroTargets.carbs, macroTargets.fat];
  const macroColors = [SF.macroProtein, SF.macroCarbs, SF.macroFat];
  const macroLabels = ["Protein", "Carbs", "Fat"];

  // Quick insights data
  const muscleTip = muscleReport && muscleReport.underExercised.length > 0
    ? `Your ${muscleReport.underExercised[0].replace(/_/g, " ")} is undertrained this week`
    : null;
  const recentPR = prSummary && prSummary.recentPRs.length > 0
    ? { exercise: prSummary.recentPRs[0].exercise, weight: prSummary.recentPRs[0].entry.weight, reps: prSummary.recentPRs[0].entry.reps }
    : null;

  if (!onboardingChecked && !authLoading && !guestLoading) {
    return <View style={{ flex: 1, backgroundColor: SF.bg }} />;
  }

  // ── Welcome / not logged in ────────────────────────────────────────────
  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <ImageBackground source={{ uri: AT_DASHBOARD_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={styles.welcomeOverlay}>
            <Image source={{ uri: APP_LOGO }} style={styles.welcomeLogo} />
            <Text style={styles.welcomeTitle}>PeakPulse AI</Text>
            <Text style={styles.welcomeSub}>Precision performance.{"\n"}Your AI-powered fitness companion.</Text>
            <TouchableOpacity style={styles.welcomeBtn} onPress={() => router.push("/login" as any)}>
              <Text style={styles.welcomeBtnText}>Get Started</Text>
              <MaterialIcons name="arrow-forward" size={18} color={SF.bg} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  const gatedNav = (path: string, feature: string, icon: string, tier: "basic" | "pro", desc?: string) => {
    if (canAccess(feature)) router.push(path as any);
    else setPaywallFeature({ name: feature.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon, tier, desc });
  };

  // ── Main Dashboard (R1: 6 Focused Sections) ─────────────────────────
  return (
    <>
      <PaywallModal visible={!!paywallFeature} onClose={() => setPaywallFeature(null)}
        featureName={paywallFeature?.name ?? ""} featureIcon={paywallFeature?.icon}
        requiredTier={paywallFeature?.tier ?? "basic"} description={paywallFeature?.desc} />
      <TutorialOverlay visible={showTutorial} onDismiss={dismissTutorial} />
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          style={{ flex: 1 }}
          scrollEventThrottle={16}
        >
          {/* ═══════════════════════════════════════════════════════════
              SECTION 1: Hero Greeting + Date
              ═══════════════════════════════════════════════════════════ */}
          <View style={styles.heroSection}>
            <View style={styles.heroTopBar}>
              <TouchableOpacity onPress={() => router.push("/user-guide" as any)} style={{ padding: 4 }}>
                <MaterialIcons name="menu" size={24} color={SF.fg} />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                <TouchableOpacity onPress={() => router.push("/notification-settings" as any)} style={{ padding: 4 }}>
                  <MaterialIcons name="notifications-none" size={22} color={SF.muted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                {profilePhotoUri ? (
                  <Image source={{ uri: profilePhotoUri }} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: SF.gold }} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_500Medium", fontSize: 14 }}>
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </Text>
                  <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 34, letterSpacing: 2, marginTop: 2 }}>
                    HI, {displayName.toUpperCase()}
                  </Text>
                  {(activeProfile as any)?.goal && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <View style={styles.heroPill}>
                        <MaterialIcons name="flag" size={12} color={SF.gold} />
                        <Text style={styles.heroPillText}>
                          {(activeProfile as any).goal === "build_muscle" ? "Build Muscle" : (activeProfile as any).goal === "lose_fat" ? "Lose Fat" : (activeProfile as any).goal}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
              {streakData && streakData.currentStreak > 0 && (
                <TouchableOpacity
                  onPress={() => router.push("/streak-details" as any)}
                  style={styles.streakBadge}
                >
                  <MaterialIcons name="local-fire-department" size={18} color={SF.gold} />
                  <Text style={styles.streakBadgeText}>{streakData.currentStreak * 7}d</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── R2: Discovery Banner (contextual feature prompt) ── */}
          {discoveryPrompt && (
            <StaggeredCard index={0}>
              <DiscoveryBanner
                prompt={discoveryPrompt}
                onDismiss={() => {
                  dismissPrompt(discoveryPrompt.id);
                  setDiscoveryPrompt(null);
                }}
              />
            </StaggeredCard>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 2: Today's Workout Card with CTA
              ═══════════════════════════════════════════════════════════ */}
          {workoutPlan?.schedule?.[0] ? (
            <StaggeredCard index={1}>
              <View style={styles.section}>
                <SectionTitle title="Today's Workout" />
                <TouchableOpacity
                  onPress={() => router.push("/active-workout" as any)}
                  activeOpacity={0.85}
                  style={styles.workoutCard}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardEyebrow}>{workoutPlan.schedule[0].day?.toUpperCase()}</Text>
                      <Text style={styles.workoutCardTitle}>{workoutPlan.schedule[0].focus}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4 }}>
                        {workoutPlan.schedule[0].exercises?.length ?? 0} exercises
                      </Text>
                    </View>
                    <View style={styles.workoutPlayBtn}>
                      <MaterialIcons name="play-arrow" size={24} color={SF.bg} />
                    </View>
                  </View>
                  {/* Progress bar */}
                  {(() => {
                    const exList = (workoutPlan.schedule[0].exercises ?? []).map((e: any) => e.name ?? e);
                    const today = new Date().toISOString().split("T")[0];
                    const done = exerciseCompletion.getCompletedCount(today, exList);
                    const total = exList.length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <View style={{ marginTop: 14 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ color: SF.muted, fontFamily: "DMSans_500Medium", fontSize: 11 }}>{done}/{total} exercises</Text>
                          <Text style={{ color: pct === 100 ? SF.mint : SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11 }}>{pct}%</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                          <View style={{ height: 6, borderRadius: 3, width: `${pct}%` as any, backgroundColor: pct === 100 ? SF.mint : SF.gold }} />
                        </View>
                      </View>
                    );
                  })()}
                </TouchableOpacity>
              </View>
            </StaggeredCard>
          ) : (hasLocalWorkoutPlan || isPlanGenerating) ? (
            <StaggeredCard index={1}>
              <View style={styles.section}>
                <SectionTitle title="Today's Workout" />
                <View style={[styles.workoutCard, { alignItems: "center", justifyContent: "center", paddingVertical: 24 }]}>
                  <ActivityIndicator color="#F59E0B" size="small" />
                  <Text style={[styles.workoutCardTitle, { marginTop: 12 }]}>
                    {isPlanGenerating ? "Generating Your Plan..." : "Loading Your Plan..."}
                  </Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4 }}>
                    {isPlanGenerating
                      ? "Our AI is crafting a personalised workout plan for you"
                      : "Your workout plan is ready \u2014 syncing now"}
                  </Text>
                </View>
              </View>
            </StaggeredCard>
          ) : (
            <StaggeredCard index={1}>
              <View style={styles.section}>
                <SectionTitle title="Get Started" />
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/plans" as any)}
                  activeOpacity={0.85}
                  style={styles.workoutCard}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <View style={styles.workoutPlayBtn}>
                      <MaterialIcons name="add" size={24} color={SF.bg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workoutCardTitle}>Create Your First Plan</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4 }}>
                        Get an AI-generated workout plan tailored to your goals
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </StaggeredCard>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 3: Daily Progress (Calories + Macros in one compact row)
              ═══════════════════════════════════════════════════════════ */}
          {calorieGoal > 0 && (
            <StaggeredCard index={2}>
              <TouchableOpacity
                style={styles.dailyProgressCard}
                onPress={() => router.push("/(tabs)/meals" as any)}
                activeOpacity={0.85}
              >
                <View style={styles.dailyProgressHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardEyebrow}>DAILY PROGRESS</Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                      <Text style={styles.calorieValue}>{todayCalories}</Text>
                      <Text style={styles.calorieGoalText}>/ {calorieGoal} kcal</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.calorieRemaining, { color: caloriesRemaining < 200 ? SF.teal : SF.gold }]}>
                      {caloriesRemaining}
                    </Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>remaining</Text>
                  </View>
                </View>
                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${calorieProgress * 100}%` as any, backgroundColor: calorieProgress > 0.8 ? SF.orange : SF.gold }]} />
                </View>
                {/* Compact macros */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                  {macroLabels.map((macro, i) => (
                    <View key={macro} style={{ alignItems: "center", flex: 1 }}>
                      <Text style={[styles.macroValue, { color: macroColors[i] }]}>
                        {Math.round(macroVals[i])}g{macroGoals[i] > 0 ? <Text style={{ color: SF.muted, fontSize: 9 }}> / {macroGoals[i]}g</Text> : null}
                      </Text>
                      <Text style={styles.macroLabel}>{macro}</Text>
                      {macroGoals[i] > 0 && (
                        <View style={{ width: "80%", height: 3, backgroundColor: SF.border, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                          <View style={{ height: 3, borderRadius: 2, backgroundColor: macroColors[i], width: `${Math.min(100, (macroVals[i] / macroGoals[i]) * 100)}%` }} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            </StaggeredCard>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 4: Weekly Goals (compact rings)
              ═══════════════════════════════════════════════════════════ */}
          {goalsEnabled && goalProgress && (
            <StaggeredCard index={3}>
              <View style={styles.section}>
                <SectionTitle
                  title="Weekly Goals"
                  rightElement={
                    <TouchableOpacity onPress={() => router.push("/weekly-goals" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Edit</Text>
                      <MaterialIcons name="chevron-right" size={14} color={SF.orange} />
                    </TouchableOpacity>
                  }
                />
                <View style={styles.goalsCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    <GoalRing
                      value={`${goalProgress.steps.current}`}
                      label="Steps"
                      percentage={goalProgress.steps.percentage}
                      color="#10B981"
                    />
                    <GoalRing
                      value={`${goalProgress.calories.current}`}
                      label="Calories"
                      percentage={goalProgress.calories.percentage}
                      color="#F59E0B"
                    />
                    <GoalRing
                      value={`${goalProgress.workouts.current}/${goalProgress.workouts.target}`}
                      label="Workouts"
                      percentage={goalProgress.workouts.percentage}
                      color="#EF4444"
                    />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 10, gap: 4 }}>
                    <MaterialIcons name="schedule" size={11} color={SF.muted} />
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                      {goalProgress.daysRemaining} day{goalProgress.daysRemaining !== 1 ? "s" : ""} remaining
                    </Text>
                  </View>
                </View>
              </View>
            </StaggeredCard>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 5: Quick Insights Carousel (R6)
              ═══════════════════════════════════════════════════════════ */}
          <StaggeredCard index={4}>
            <View style={styles.section}>
              <SectionTitle title="Quick Insights" />
            </View>
            <QuickInsightsCarousel
              streakDays={streakData ? streakData.currentStreak * 7 : 0}
              recentPR={recentPR}
              muscleTip={muscleTip}
              volumeChange={null}
              totalWorkouts={prSummary?.totalExercisesTracked ?? 0}
            />
          </StaggeredCard>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 6: Explore More Grid
              ═══════════════════════════════════════════════════════════ */}
          <StaggeredCard index={5}>
            <View style={styles.section}>
              <SectionTitle title="Explore" />
            </View>
            <ExploreGrid
              onPaywall={(feature, icon, tier, desc) =>
                setPaywallFeature({ name: feature.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon, tier, desc })
              }
            />
          </StaggeredCard>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 7: Wearable Metrics Panel (compact)
              ═══════════════════════════════════════════════════════════ */}
          <StaggeredCard index={6}>
            <View style={styles.section}>
              <SectionTitle
                title="Wearable Health"
                rightElement={
                  <TouchableOpacity onPress={() => router.push("/wearable-settings" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Details</Text>
                    <MaterialIcons name="chevron-right" size={14} color={SF.orange} />
                  </TouchableOpacity>
                }
              />
              {wearableData.isConnected ? (
                <View style={styles.wearableRow}>
                  <View style={styles.wearableMetric}>
                    <MaterialIcons name="directions-walk" size={18} color="#22C55E" />
                    <Text style={[styles.wearableValue, { color: "#22C55E" }]}>{wearableData.stats.steps.toLocaleString()}</Text>
                    <Text style={styles.wearableLabel}>Steps</Text>
                  </View>
                  <View style={styles.wearableMetric}>
                    <MaterialIcons name="favorite" size={18} color="#EF4444" />
                    <Text style={[styles.wearableValue, { color: "#EF4444" }]}>{wearableData.stats.heartRate}</Text>
                    <Text style={styles.wearableLabel}>BPM</Text>
                  </View>
                  <View style={styles.wearableMetric}>
                    <MaterialIcons name="local-fire-department" size={18} color="#F59E0B" />
                    <Text style={[styles.wearableValue, { color: "#F59E0B" }]}>{wearableData.stats.totalCaloriesBurnt}</Text>
                    <Text style={styles.wearableLabel}>Cal</Text>
                  </View>
                  <View style={styles.wearableMetric}>
                    <MaterialIcons name="bedtime" size={18} color="#8B5CF6" />
                    <Text style={[styles.wearableValue, { color: "#8B5CF6" }]}>{wearableData.stats.sleepHours.toFixed(1)}h</Text>
                    <Text style={styles.wearableLabel}>Sleep</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.wearableConnectCard}
                  onPress={() => router.push("/wearable-settings" as any)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="watch" size={28} color={SF.gold} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>Connect Your Wearable</Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Sync Apple Health, Google Fit, Fitbit & more</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={SF.gold} />
                </TouchableOpacity>
              )}
            </View>
          </StaggeredCard>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 8: Muscle Balance Heatmap
              ═══════════════════════════════════════════════════════════ */}
          {muscleReport && muscleReport.entries.length > 0 && (
            <StaggeredCard index={7}>
              <View style={styles.section}>
                <SectionTitle
                  title="Muscle Balance"
                  rightElement={
                    <TouchableOpacity onPress={() => router.push("/muscle-balance" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Full Report</Text>
                      <MaterialIcons name="chevron-right" size={14} color={SF.orange} />
                    </TouchableOpacity>
                  }
                />
                <View style={styles.heatmapCard}>
                  <BodyHeatmap
                    mode="balance"
                    balanceEntries={muscleReport.entries}
                    width={130}
                    height={200}
                    showLegend
                  />
                  {/* Summary chips */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12, justifyContent: "center" }}>
                    {muscleReport.overExercised.length > 0 && (
                      <View style={[styles.balanceChip, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.25)" }]}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" }} />
                        <Text style={[styles.balanceChipText, { color: "#EF4444" }]}>{muscleReport.overExercised.length} over</Text>
                      </View>
                    )}
                    {muscleReport.optimal.length > 0 && (
                      <View style={[styles.balanceChip, { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.25)" }]}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" }} />
                        <Text style={[styles.balanceChipText, { color: "#22C55E" }]}>{muscleReport.optimal.length} optimal</Text>
                      </View>
                    )}
                    {muscleReport.underExercised.length > 0 && (
                      <View style={[styles.balanceChip, { backgroundColor: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.25)" }]}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#3B82F6" }} />
                        <Text style={[styles.balanceChipText, { color: "#3B82F6" }]}>{muscleReport.underExercised.length} under</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </StaggeredCard>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 9: Personal Records
              ═══════════════════════════════════════════════════════════ */}
          {prSummary && prSummary.topLifts.length > 0 && (
            <StaggeredCard index={8}>
              <View style={styles.section}>
                <SectionTitle
                  title="Personal Records"
                  rightElement={
                    <TouchableOpacity onPress={() => router.push("/personal-records" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>All PRs</Text>
                      <MaterialIcons name="chevron-right" size={14} color={SF.orange} />
                    </TouchableOpacity>
                  }
                />
                <View style={styles.prCard}>
                  {prSummary.topLifts.slice(0, 4).map((lift, i) => (
                    <View key={lift.exercise + i} style={[styles.prRow, i < Math.min(prSummary.topLifts.length, 4) - 1 && { borderBottomWidth: 1, borderBottomColor: SF.border }]}>
                      <View style={styles.prRank}>
                        <Text style={styles.prRankText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prExercise}>{lift.exercise.replace(/\b\w/g, c => c.toUpperCase())}</Text>
                        <Text style={styles.prDate}>{new Date(lift.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.prWeight}>{lift.weight} kg</Text>
                        {prSummary.recentPRs.find(r => r.exercise === lift.exercise) && (
                          <View style={styles.prNewBadge}>
                            <Text style={styles.prNewBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                  {prSummary.totalExercisesTracked > 4 && (
                    <TouchableOpacity
                      onPress={() => router.push("/personal-records" as any)}
                      style={styles.prSeeAll}
                    >
                      <Text style={styles.prSeeAllText}>See all {prSummary.totalExercisesTracked} exercises</Text>
                      <MaterialIcons name="arrow-forward" size={14} color={SF.gold} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </StaggeredCard>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 10: Tips & Tricks
              ═══════════════════════════════════════════════════════════ */}
          <StaggeredCard index={9}>
            <View style={styles.section}>
              <SectionTitle title="Tip of the Day" />
              <View style={styles.tipCard}>
                <View style={styles.tipIconBox}>
                  <MaterialIcons name={TIPS_AND_TRICKS[tipIndex].icon as any} size={22} color={SF.gold} />
                </View>
                <Text style={styles.tipText}>{TIPS_AND_TRICKS[tipIndex].tip}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const next = (tipIndex + 1) % TIPS_AND_TRICKS.length;
                    setTipIndex(next);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.tipNextBtn}
                >
                  <MaterialIcons name="refresh" size={16} color={SF.gold} />
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 12, marginLeft: 4 }}>Next Tip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </StaggeredCard>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 11: Premium Feature Promotions
              ═══════════════════════════════════════════════════════════ */}
          <StaggeredCard index={10}>
            <View style={styles.section}>
              <PremiumFeatureBanner
                feature="ai_body_scan"
                title="AI Body Transformation"
                description="See your future physique with AI-powered body visualisation. Upload a photo and watch yourself transform."
                icon="auto-awesome"
                accentColor="#8B5CF6"
                requiredTier="pro"
              />
              <View style={{ height: 10 }} />
              <PremiumFeatureBanner
                feature="ai_meal_plan"
                title="Smart Meal Plans"
                description="Get personalised meal plans based on your goals, dietary preferences, and calorie targets."
                icon="restaurant-menu"
                accentColor="#22C55E"
                requiredTier="basic"
                compact
              />
              <View style={{ height: 10 }} />
              <PremiumFeatureBanner
                feature="wearable_sync"
                title="Wearable Integration"
                description="Sync with Apple Health, Google Fit, Fitbit, Garmin and more for complete health tracking."
                icon="watch"
                accentColor="#3B82F6"
                requiredTier="basic"
                compact
              />
            </View>
          </StaggeredCard>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 12: My Pantry Quick Access
              ═══════════════════════════════════════════════════════════ */}
          <StaggeredCard index={11}>
            <View style={styles.section}>
              <SectionTitle
                title="My Pantry"
                rightElement={
                  <TouchableOpacity onPress={() => router.push("/pantry" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Open</Text>
                    <MaterialIcons name="chevron-right" size={14} color={SF.orange} />
                  </TouchableOpacity>
                }
              />
              <TouchableOpacity
                style={styles.pantryCard}
                onPress={() => router.push("/pantry" as any)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={[styles.pantryIconBox, { backgroundColor: "rgba(249,115,22,0.12)" }]}>
                    <MaterialIcons name="kitchen" size={26} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
                      {pantryItems.length} Items
                    </Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>
                      {(() => {
                        const expiring = getExpiringItems(3);
                        if (expiring.length > 0) return `${expiring.length} expiring soon`;
                        if (pantryItems.length === 0) return "Add items to get AI meal suggestions";
                        return "Tap for AI meal suggestions";
                      })()}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={SF.muted} />
                </View>
                {/* Quick action row */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    style={styles.pantryQuickBtn}
                    onPress={() => router.push("/barcode-scanner" as any)}
                  >
                    <MaterialIcons name="qr-code-scanner" size={14} color={SF.gold} />
                    <Text style={styles.pantryQuickBtnText}>Scan Barcode</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pantryQuickBtn}
                    onPress={() => router.push("/scan-receipt" as any)}
                  >
                    <MaterialIcons name="receipt-long" size={14} color={SF.gold} />
                    <Text style={styles.pantryQuickBtnText}>Scan Receipt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pantryQuickBtn}
                    onPress={() => router.push("/meal-prep" as any)}
                  >
                    <MaterialIcons name="auto-awesome" size={14} color={SF.gold} />
                    <Text style={styles.pantryQuickBtnText}>Meal Prep</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </StaggeredCard>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 13: Social & Challenges
              ═══════════════════════════════════════════════════════════ */}
          <StaggeredCard index={12}>
            <View style={styles.section}>
              <SectionTitle
                title="Social & Challenges"
                rightElement={
                  <TouchableOpacity onPress={() => router.push("/social-circle" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>My Circle</Text>
                    <MaterialIcons name="chevron-right" size={14} color={SF.orange} />
                  </TouchableOpacity>
                }
              />
              <View style={styles.socialCard}>
                {/* Circle stats row */}
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={styles.socialStatBox}
                    onPress={() => router.push("/social-circle" as any)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="people" size={20} color="#3B82F6" />
                    <Text style={[styles.socialStatValue, { color: "#3B82F6" }]}>
                      {socialCircle ? socialCircle.friends.length : 0}
                    </Text>
                    <Text style={styles.socialStatLabel}>Friends</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.socialStatBox}
                    onPress={() => router.push("/challenge" as any)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="bolt" size={20} color="#F59E0B" />
                    <Text style={[styles.socialStatValue, { color: "#F59E0B" }]}>
                      {activeChallenges.length}
                    </Text>
                    <Text style={styles.socialStatLabel}>Active Duels</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.socialStatBox}
                    onPress={() => router.push("/group-goals" as any)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="groups" size={20} color="#14B8A6" />
                    <Text style={[styles.socialStatValue, { color: "#14B8A6" }]}>
                      {socialCircle ? getActiveFriendsCount(socialCircle.friends) : 0}
                    </Text>
                    <Text style={styles.socialStatLabel}>Active</Text>
                  </TouchableOpacity>
                </View>
                {/* Quick action buttons */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.socialActionBtn, { flex: 1 }]}
                    onPress={() => gatedNav("/social-feed", "social_feed", "group", "pro", "Join the PeakPulse community, share progress, and compete in challenges.")}
                  >
                    <MaterialIcons name="group" size={16} color="#8B5CF6" />
                    <Text style={[styles.socialActionBtnText, { color: "#8B5CF6" }]}>Community</Text>
                    <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.socialActionBtn, { flex: 1 }]}
                    onPress={() => gatedNav("/challenge-onboarding", "challenges", "bolt", "pro", "Unlock 7-day fitness challenges and leaderboards.")}
                  >
                    <MaterialIcons name="emoji-events" size={16} color="#F59E0B" />
                    <Text style={[styles.socialActionBtnText, { color: "#F59E0B" }]}>7-Day Challenge</Text>
                    <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
                  </TouchableOpacity>
                </View>
                {/* Invite CTA */}
                <TouchableOpacity
                  style={styles.socialInviteBtn}
                  onPress={() => router.push("/social-circle" as any)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="person-add" size={16} color={SF.gold} />
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 13, marginLeft: 8 }}>Invite Friends to Your Circle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </StaggeredCard>

          {/* ── No plans CTA ── */}
          {!workoutPlan && !mealPlan && (
            <StaggeredCard index={6}>
              <View style={styles.section}>
                <View style={styles.ctaCard}>
                  <MaterialIcons name="rocket-launch" size={40} color={SF.gold} style={{ marginBottom: 12 }} />
                  <Text style={styles.ctaTitle}>Ready to Transform?</Text>
                  <Text style={styles.ctaSub}>Start with an AI Body Scan to analyse your physique, then get a personalised workout and meal plan.</Text>
                  <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push("/(tabs)/scan" as any)}>
                    <Text style={styles.ctaBtnText}>Start AI Body Scan</Text>
                    <MaterialIcons name="arrow-forward" size={16} color={SF.bg} />
                  </TouchableOpacity>
                </View>
              </View>
            </StaggeredCard>
          )}

          {/* ── Trial / Guest banners ── */}
          {isTrialActive && (
            <View style={styles.trialBanner}>
              <MaterialIcons name="hourglass-top" size={20} color={SF.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.trialBannerTitle}>Pro Trial — {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} left</Text>
                <Text style={styles.trialBannerSub}>Enjoying all Pro features. Subscribe to keep access.</Text>
              </View>
              <TouchableOpacity style={styles.trialBannerBtn} onPress={() => router.push("/subscription" as any)}>
                <Text style={styles.trialBannerBtnText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          )}

          {hasUsedTrial && !isTrialActive && !isPaid && (
            <View style={[styles.trialBanner, styles.trialBannerExpired]}>
              <MaterialIcons name="warning" size={20} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.trialBannerTitle, { color: "#ef4444" }]}>Trial Expired</Text>
                <Text style={styles.trialBannerSub}>Subscribe to restore Pro features.</Text>
              </View>
              <TouchableOpacity style={[styles.trialBannerBtn, { backgroundColor: "#ef4444" }]} onPress={() => router.push("/subscription" as any)}>
                <Text style={styles.trialBannerBtnText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}

          {isGuest && (
            <View style={styles.guestBanner}>
              <MaterialIcons name="info-outline" size={20} color={SF.gold2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.guestBannerTitle}>Using as Guest</Text>
                <Text style={styles.guestBannerSub}>Your data is stored locally. Sign in to sync across devices.</Text>
              </View>
              <TouchableOpacity style={styles.guestBannerBtn} onPress={() => router.push("/login" as any)}>
                <Text style={styles.guestBannerBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.ScrollView>

        {/* ═══════════════════════════════════════════════════════════
            R5: Floating "Start Workout" Button
            ═══════════════════════════════════════════════════════════ */}
        <FloatingStartWorkout />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Hero
  heroSection: { backgroundColor: SF.bg, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  heroTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  heroPill: { backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: SF.border2, flexDirection: "row", alignItems: "center", gap: 4 },
  heroPillText: { color: SF.emerald2, fontFamily: "DMSans_500Medium", fontSize: 12 },
  streakBadge: {
    backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  streakBadgeText: { color: SF.gold, fontFamily: "SpaceMono_700Bold", fontSize: 14 },
  // Welcome
  welcomeOverlay: { flex: 1, backgroundColor: "rgba(10,5,0,0.72)", alignItems: "center", justifyContent: "center", padding: 32 },
  welcomeLogo: { width: 80, height: 80, borderRadius: 20, marginBottom: 24 },
  welcomeTitle: { color: SF.fg, fontSize: 42, fontFamily: "BebasNeue_400Regular", textAlign: "center", letterSpacing: 4 },
  welcomeSub: { color: SF.emerald3, fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 22, fontFamily: "DMSans_400Regular" },
  welcomeBtn: { marginTop: 40, backgroundColor: SF.gold, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 40, flexDirection: "row", alignItems: "center" },
  welcomeBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 },
  // Section
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionTitle: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 22, letterSpacing: 2 },
  // Workout Card
  workoutCard: {
    backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 18,
    borderWidth: 1.5, borderColor: "rgba(245,158,11,0.2)",
  },
  workoutCardTitle: { color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 20, marginTop: 4 },
  workoutPlayBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: SF.gold, alignItems: "center", justifyContent: "center",
  },
  cardEyebrow: { color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 },
  // Daily Progress
  dailyProgressCard: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: SF.border,
  },
  dailyProgressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  calorieValue: { color: SF.fg, fontFamily: "SpaceMono_700Bold", fontSize: 22 },
  calorieGoalText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14 },
  calorieRemaining: { fontFamily: "SpaceMono_700Bold", fontSize: 20 },
  progressTrack: { height: 8, backgroundColor: SF.border, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  macroValue: { fontFamily: "DMSans_700Bold", fontSize: 12 },
  macroLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },
  // Goals
  goalsCard: {
    backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: SF.borderPrimary,
  },
  // CTA
  ctaCard: {
    backgroundColor: SF.surfacePrimary, borderRadius: 24, padding: 28,
    alignItems: "center", borderWidth: 1, borderColor: SF.border,
  },
  ctaTitle: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 28, textAlign: "center", marginBottom: 8, letterSpacing: 2 },
  ctaSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  ctaBtn: { backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8 },
  ctaBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 },
  // Banners
  guestBanner: { marginHorizontal: 16, marginTop: 20, backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border, flexDirection: "row", alignItems: "center", gap: 12 },
  guestBannerTitle: { color: SF.emerald2, fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  guestBannerSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  guestBannerBtn: { backgroundColor: SF.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: SF.border2 },
  guestBannerBtnText: { color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  trialBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 16, backgroundColor: "#1c1000", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#F59E0B40" },
  trialBannerExpired: { backgroundColor: "#1a0000", borderColor: "#ef444440" },
  trialBannerTitle: { color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13, marginBottom: 2 },
  trialBannerSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 16 },
  trialBannerBtn: { backgroundColor: "#F59E0B", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  trialBannerBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 12 },
  // Wearable Metrics
  wearableRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: SF.surfacePrimary, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: SF.border,
  },
  wearableMetric: { alignItems: "center", flex: 1, gap: 4 },
  wearableValue: { fontFamily: "SpaceMono_700Bold", fontSize: 16 },
  wearableLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },
  wearableConnectCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SF.surfacePrimary, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  // Muscle Balance Heatmap
  heatmapCard: {
    backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: SF.border, alignItems: "center",
  },
  balanceChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    borderWidth: 1,
  },
  balanceChipText: { fontFamily: "DMSans_600SemiBold", fontSize: 11 },
  // Personal Records
  prCard: {
    backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 4,
    borderWidth: 1, borderColor: SF.border, overflow: "hidden",
  },
  prRow: {
    flexDirection: "row", alignItems: "center", padding: 12, gap: 12,
  },
  prRank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center",
  },
  prRankText: { color: SF.gold, fontFamily: "SpaceMono_700Bold", fontSize: 12 },
  prExercise: { color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  prDate: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 },
  prWeight: { color: SF.gold, fontFamily: "SpaceMono_700Bold", fontSize: 16 },
  prNewBadge: {
    backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 3,
  },
  prNewBadgeText: { color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 8, letterSpacing: 1 },
  prSeeAll: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, gap: 6,
    borderTopWidth: 1, borderTopColor: SF.border,
  },
  prSeeAllText: { color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  // Tips & Tricks
  tipCard: {
    backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: SF.border,
  },
  tipIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  tipText: { color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 21 },
  tipNextBtn: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-end",
    marginTop: 14, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)",
  },
  // My Pantry
  pantryCard: {
    backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: SF.border,
  },
  pantryIconBox: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(249,115,22,0.25)",
  },
  pantryQuickBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  pantryQuickBtnText: { color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 10 },
  // Social & Challenges
  socialCard: {
    backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: SF.border,
  },
  socialStatBox: {
    flex: 1, alignItems: "center", paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14,
    borderWidth: 1, borderColor: SF.border, gap: 4,
  },
  socialStatValue: { fontFamily: "SpaceMono_700Bold", fontSize: 20 },
  socialStatLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },
  socialActionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1, borderColor: SF.border,
  },
  socialActionBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  proBadge: {
    backgroundColor: "rgba(168,85,247,0.15)", borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  proBadgeText: { color: "#A855F7", fontFamily: "DMSans_700Bold", fontSize: 8, letterSpacing: 0.5 },
  socialInviteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 12, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1, borderColor: "rgba(245,158,11,0.20)",
  },
});
