/**
 * R1 + R5 + R6: Streamlined Dashboard
 * 6 focused sections replacing 20+ deep-scroll sections.
 * Sections: Hero, Today's Workout, Daily Progress, Weekly Goals, Quick Insights, Explore Grid
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  withTiming, withDelay, withSequence, Easing, interpolate, Extrapolation,
} from "react-native-reanimated";
import { useCalories, type MealEntry } from "@/lib/calorie-context";
import { scheduleAllDefaultReminders } from "@/lib/notifications";
import {
  Text, View, TouchableOpacity, ImageBackground, Image, StyleSheet, Platform, ActivityIndicator, RefreshControl,
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
import { BodyDiagramInteractive, type MuscleGroup } from "@/components/body-diagram";
import { TrendChart, type TrendDataPoint } from "@/components/trend-chart";
import { WearableMetricsPanel } from "@/components/wearable-metrics-panel";
import { PremiumFeatureBanner, PremiumFeatureTeaser } from "@/components/premium-feature-banner";
import { usePantry } from "@/lib/pantry-context";
import { getActiveChallenges, type Challenge } from "@/lib/challenge-service";
import { loadOrCreateSocialCircle, getActiveFriendsCount, type SocialCircleData } from "@/lib/social-circle";
import { loadTDEEBreakdown, type TDEEBreakdown } from "@/lib/tdee-calculator";
import { loadWorkoutLogs, type WorkoutLogEntry } from "@/lib/workout-analytics";
import { getHistoricalMeals } from "@/lib/calorie-context";
import { UI as SF } from "@/constants/ui-colors";
import { ErrorBoundary } from "@/components/error-boundary";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, A11Y_LABELS } from "@/lib/accessibility";

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

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

// ââ Staggered animation wrapper ââââââââââââââââââââââââââââââââââââââââ
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

// ââ Section title with gold accent bar âââââââââââââââââââââââââââââââââ
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

// ââ Compact Goal Ring ââââââââââââââââââââââââââââââââââââââââââââââââââ
function GoalRing({ value, label, percentage, color }: { value: string; label: string; percentage: number; color: string }) {
  const R = 22;
  const circumference = 2 * Math.PI * R;
  const pct = Math.min(Math.max(percentage, 0), 100);
  return (
    <View style={{ alignItems: "center", flex: 1 }} {...a11yProgress(label, pct, 100)}>
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

function HomeScreenContent() {
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
  const [localWorkoutPlan, setLocalWorkoutPlan] = useState<any>(null);
  const [tdeeBreakdown, setTdeeBreakdown] = useState<TDEEBreakdown | null>(null);
  const [showTdeeBreakdown, setShowTdeeBreakdown] = useState(false);
  const [weeklyAvgCalories, setWeeklyAvgCalories] = useState<number | null>(null);
  const [weeklyDaysLogged, setWeeklyDaysLogged] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSessions, setRecentSessions] = useState<WorkoutLogEntry[]>([]);
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);
  const [targetTransform, setTargetTransform] = useState<{target_bf: number; imageUrl: string; description?: string} | null>(null);
  const [originalScanPhoto, setOriginalScanPhoto] = useState<string | null>(null);
  const [originalBodyFat, setOriginalBodyFat] = useState<number | null>(null);
  const [lastProgressDate, setLastProgressDate] = useState<string | null>(null);
  const streakCelebrationOpacity = useSharedValue(0);
  const streakCelebrationScale = useSharedValue(0.5);

  const exerciseCompletion = useExerciseCompletion();
  const { displayName: savedDisplayName, profilePhotoUri } = useUserProfile();
  const displayName = savedDisplayName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? guestProfile?.name?.split(" ")[0] ?? "Athlete";

  // ââ Server-side data âââââ
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: workoutPlan } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: mealPlan } = trpc.mealPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });

  const { totalCalories: todayCalories, calorieGoal, meals: todayMeals, setCalorieGoal, macroTargets } = useCalories();

  // ââ Smart day matching: find today's workout from the schedule ââ
  const todayWorkout = useMemo(() => {
    const plan = workoutPlan ?? localWorkoutPlan;
    if (!plan?.schedule?.length) return null;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = dayNames[new Date().getDay()];
    const match = plan.schedule.find((d: any) => {
      const dayStr = (d.day ?? "").toLowerCase();
      return dayStr === todayName.toLowerCase() || dayStr.startsWith(todayName.toLowerCase().slice(0, 3));
    });
    return match ?? plan.schedule[0];
  }, [workoutPlan, localWorkoutPlan]);

  // ââ Rest day detection ââ
  const isRestDay = useMemo(() => {
    if (!todayWorkout) return false;
    const focus = (todayWorkout.focus ?? "").toLowerCase();
    const exercises = todayWorkout.exercises ?? [];
    return focus.includes("rest") || focus.includes("recovery") || focus.includes("off") || exercises.length === 0;
  }, [todayWorkout]);

  // ââ Stretching suggestions for rest days ââ
  const STRETCHING_ROUTINES = [
    { name: "Full Body Stretch", duration: "15 min", icon: "self-improvement" as const, description: "Gentle stretches for all major muscle groups" },
    { name: "Foam Rolling", duration: "10 min", icon: "sports-gymnastics" as const, description: "Myofascial release for tight muscles" },
    { name: "Yoga Flow", duration: "20 min", icon: "spa" as const, description: "Sun salutations and restorative poses" },
    { name: "Mobility Drills", duration: "12 min", icon: "accessibility-new" as const, description: "Joint circles, hip openers, shoulder work" },
  ];

  useEffect(() => {
    // Read TDEE from both keys to handle race conditions between onboarding and CalorieProvider
    Promise.all([
      AsyncStorage.getItem("@user_tdee"),
      AsyncStorage.getItem("@peakpulse_calorie_goal"),
    ]).then(([tdeeRaw, goalRaw]) => {
      const tdee = tdeeRaw ? parseInt(tdeeRaw, 10) : NaN;
      const goal = goalRaw ? parseInt(goalRaw, 10) : NaN;
      const best = !isNaN(tdee) && tdee > 0 ? tdee : (!isNaN(goal) && goal > 0 ? goal : 0);
      if (best > 0 && best !== calorieGoal) {
        setCalorieGoal(best);
      }
    });
    // Load TDEE breakdown for display
    loadTDEEBreakdown().then(b => { if (b) setTdeeBreakdown(b); });
    // Calculate 7-day rolling calorie average
    getHistoricalMeals(7).then(history => {
      let totalCals = 0;
      let daysWithData = 0;
      for (const meals of Object.values(history)) {
        const dayCals = meals.reduce((s, m) => s + (m.calories || 0), 0);
        if (dayCals > 0) {
          totalCals += dayCals;
          daysWithData++;
        }
      }
      setWeeklyDaysLogged(daysWithData);
      if (daysWithData > 0) setWeeklyAvgCalories(Math.round(totalCals / daysWithData));
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
            if (plan?.schedule?.[0]) {
              setLocalWorkoutPlan(plan);
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

  // ââ Onboarding guard âââââ
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

  // ââ Load analytics data âââââ
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
        // Trigger streak celebration for 7-day milestones
        if (streak.currentStreak > 0 && streak.currentStreak % 7 === 0) {
          const celebratedKey = `@streak_celebrated_${streak.currentStreak}`;
          const alreadyCelebrated = await AsyncStorage.getItem(celebratedKey);
          if (!alreadyCelebrated) {
            setShowStreakCelebration(true);
            await AsyncStorage.setItem(celebratedKey, "true");
          }
        }
        const summary = await getPRSummary();
        setPrSummary(summary);
        // Load body scan goal data for home visualization
        try {
          const targetRaw = await AsyncStorage.getItem("target_transformation");
          if (targetRaw) setTargetTransform(JSON.parse(targetRaw));
          const scanHistoryRaw = await AsyncStorage.getItem("body_scan_history");
          if (scanHistoryRaw) {
            const scans = JSON.parse(scanHistoryRaw);
            if (scans.length > 0) {
              const firstScan = scans[0];
              setOriginalScanPhoto(firstScan.photoUrl || null);
              setOriginalBodyFat(firstScan.estimatedBodyFat || null);
            }
          }
          // Check for guest scan data too
          if (!scanHistoryRaw) {
            const guestRaw = await AsyncStorage.getItem("guest_scan");
            if (guestRaw) {
              const guestScan = JSON.parse(guestRaw);
              setOriginalScanPhoto(guestScan.uploadedPhotoUrl || null);
              setOriginalBodyFat(guestScan.estimated_body_fat || null);
            }
          }
          const lastProgress = await AsyncStorage.getItem("last_progress_photo_date");
          if (lastProgress) setLastProgressDate(lastProgress);
        } catch (e) { /* silently fail */ }
        // Load last 3 workout sessions
        try {
          const logs = await loadWorkoutLogs();
          const sorted = logs
            .filter(l => l.workout?.startDate)
            .sort((a, b) => new Date(b.workout.startDate).getTime() - new Date(a.workout.startDate).getTime());
          setRecentSessions(sorted.slice(0, 3));
        } catch {}
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

  // ââ Load discovery prompt (R2) âââââ
  useEffect(() => {
    if (!canUse) return;
    getNextPrompt().then(p => setDiscoveryPrompt(p));
  }, [canUse]);

  useEffect(() => {
    if (Platform.OS !== "web" && canUse) {
      scheduleAllDefaultReminders().catch(() => {});
    }
  }, [canUse]);

  // ââ Pull-to-refresh handler âââââ
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Reload TDEE / calorie goal
      const [tdeeRaw, goalRaw] = await Promise.all([
        AsyncStorage.getItem("@user_tdee"),
        AsyncStorage.getItem("@peakpulse_calorie_goal"),
      ]);
      const tdee = tdeeRaw ? parseInt(tdeeRaw, 10) : NaN;
      const goal = goalRaw ? parseInt(goalRaw, 10) : NaN;
      const best = !isNaN(tdee) && tdee > 0 ? tdee : (!isNaN(goal) && goal > 0 ? goal : 0);
      if (best > 0 && best !== calorieGoal) setCalorieGoal(best);

      // Reload TDEE breakdown
      const b = await loadTDEEBreakdown();
      if (b) setTdeeBreakdown(b);

      // Reload 7-day rolling calorie average
      const history = await getHistoricalMeals(7);
      let totalCals = 0;
      let daysWithData = 0;
      for (const meals of Object.values(history)) {
        const dayCals = meals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
        if (dayCals > 0) { totalCals += dayCals; daysWithData++; }
      }
      setWeeklyDaysLogged(daysWithData);
      if (daysWithData > 0) setWeeklyAvgCalories(Math.round(totalCals / daysWithData));

      // Reload local workout plan
      const [cachedPlan, guestPlan] = await Promise.all([
        AsyncStorage.getItem("@cached_workout_plan"),
        AsyncStorage.getItem("@guest_workout_plan"),
      ]);
      if (cachedPlan || guestPlan) {
        setHasLocalWorkoutPlan(true);
        try {
          const plan = JSON.parse(cachedPlan || guestPlan || "{}");
          if (plan?.schedule?.[0]) setLocalWorkoutPlan(plan);
        } catch {}
      }

      // Reload analytics: goals, streak, PRs, muscle balance, social
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
      // Reload recent sessions
      try {
        const logs = await loadWorkoutLogs();
        const sorted = logs
          .filter(l => l.workout?.startDate)
          .sort((a, b) => new Date(b.workout.startDate).getTime() - new Date(a.workout.startDate).getTime());
        setRecentSessions(sorted.slice(0, 3));
      } catch {}
      try {
        const challenges = await getActiveChallenges();
        setActiveChallenges(challenges);
        const userName = savedDisplayName ?? user?.name ?? guestProfile?.name ?? "Athlete";
        const circle = await loadOrCreateSocialCircle(userName);
        setSocialCircle(circle);
      } catch {}

      // Reload discovery prompt
      const p = await getNextPrompt();
      setDiscoveryPrompt(p);
    } catch (err) {
      console.warn("Pull-to-refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [calorieGoal, wearableData.stats.steps, wearableData.stats.totalCaloriesBurnt, savedDisplayName, user?.name, guestProfile?.name]);

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

  // ââ Welcome / not logged in ââââââââââââââââââââââââââââââââââââââââââââ
  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <ImageBackground source={{ uri: AT_DASHBOARD_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={styles.welcomeOverlay}>
            <Image source={{ uri: APP_LOGO }} style={styles.welcomeLogo} />
            <Text style={styles.welcomeTitle}>PeakPulse AI</Text>
            <Text style={styles.welcomeSub}>Precision performance.{"\n"}Your AI-powered fitness companion.</Text>
            <TouchableOpacity style={styles.welcomeBtn} onPress={() => router.push("/login" as any)} {...a11yButton("Get Started", "Sign in or create an account")}>
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

  // ââ Main Dashboard (R1: 6 Focused Sections) âââââââââââââââââââââââââ
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={SF.gold}
              colors={[SF.gold]}
              progressBackgroundColor={SF.surface}
            />
          }
        >
          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 1: Hero Greeting + Date
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
          <View style={styles.heroSection}>
            <View style={styles.heroTopBar}>
              <TouchableOpacity onPress={() => router.push("/user-guide" as any)} style={{ padding: 4 }} {...a11yButton(A11Y_LABELS.menuButton)}>
                <MaterialIcons name="menu" size={24} color={SF.fg} />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                <TouchableOpacity onPress={() => router.push("/notification-settings" as any)} style={{ padding: 4 }} {...a11yButton("Notification settings")}>
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
                  {...a11yButton(A11Y_LABELS.streakBadge(streakData!.currentStreak))}
                >
                  <MaterialIcons name="local-fire-department" size={18} color={SF.gold} />
                  <Text style={styles.streakBadgeText}>{streakData.currentStreak * 7}d</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ââ R2: Discovery Banner (contextual feature prompt) ââ */}
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

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 2: Today's Workout Card with CTA (or Rest Day Recovery Card)
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
          {todayWorkout && isRestDay ? (
            /* ââ REST DAY RECOVERY CARD ââ */
            <StaggeredCard index={1}>
              <View style={styles.section}>
                <SectionTitle title="Recovery Day" />
                <View style={[styles.workoutCard, { borderColor: "rgba(34,197,94,0.25)" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <View style={[styles.workoutPlayBtn, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                      <MaterialIcons name="spa" size={24} color="#22C55E" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.workoutCardTitle, { color: "#22C55E" }]}>Rest & Recover</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>
                        Your muscles grow during rest. Try some light stretching today.
                      </Text>
                    </View>
                  </View>
                  {/* Stretching Suggestions */}
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>SUGGESTED ACTIVITIES</Text>
                  {STRETCHING_ROUTINES.map((routine, i) => (
                    <TouchableOpacity
                      key={routine.name}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 12,
                        paddingVertical: 10,
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: SF.border,
                      }}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(34,197,94,0.08)", alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name={routine.icon} size={18} color="#22C55E" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{routine.name}</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 1 }}>{routine.description}</Text>
                      </View>
                      <Text style={{ color: SF.muted, fontFamily: "SpaceMono_700Bold", fontSize: 11 }}>{routine.duration}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </StaggeredCard>
          ) : todayWorkout && !isRestDay ? (
            <StaggeredCard index={1}>
              <View style={styles.section}>
                <SectionTitle title="Today's Target Muscles" />
                <TouchableOpacity
                  onPress={() => {
                    router.push({ pathname: "/active-workout", params: { dayData: JSON.stringify(todayWorkout) } } as any);
                  }}
                  activeOpacity={0.85}
                  style={styles.workoutCard}
                  {...a11yButton(A11Y_LABELS.startWorkout, "Open today's workout")}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workoutCardTitle}>{todayWorkout.focus}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4 }}>
                        {todayWorkout.exercises?.length ?? 0} exercises
                      </Text>
                    </View>
                    <View style={styles.workoutPlayBtn}>
                      <MaterialIcons name="play-arrow" size={24} color={SF.bg} />
                    </View>
                  </View>
                  {/* Progress bar */}
                  {(() => {
                    const exList = (todayWorkout.exercises ?? []).map((e: any) => e.name ?? e);
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
          ) : (isPlanGenerating) ? (
            <StaggeredCard index={1}>
              <View style={styles.section}>
                <SectionTitle title="Today's Target Muscles" />
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
                  onPress={() => router.push("/plans" as any)}
                  activeOpacity={0.85}
                  style={styles.workoutCard}
                  {...a11yButton("Create your first workout plan")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>                   <View style={styles.workoutPlayBtn}>
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

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 2b: Last 3 Sessions
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
          {recentSessions.length > 0 && (
            <StaggeredCard index={1}>
              <View style={styles.section}>
                <SectionTitle title="Recent Sessions" />
                {recentSessions.map((session, i) => {
                  const w = session.workout;
                  const dateStr = w.startDate ? new Date(w.startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "";
                  const durationMin = w.durationMinutes ?? 0;
                  const completedExercises = w.completedExercisesJson ? JSON.parse(w.completedExercisesJson) : [];
                  const exCount = Array.isArray(completedExercises) ? completedExercises.length : 0;
                  return (
                    <View
                      key={`session-${i}`}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 12,
                        paddingVertical: 12,
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: SF.border,
                      }}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="fitness-center" size={18} color={SF.gold} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
                          {w.focus ?? w.dayName ?? `Session ${i + 1}`}
                        </Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 1 }}>
                          {dateStr}{durationMin > 0 ? ` \u00B7 ${durationMin} min` : ""} \u00B7 {exCount} exercises
                        </Text>
                      </View>
                      {w.completedAt && (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(34,197,94,0.15)", alignItems: "center", justifyContent: "center" }}>
                          <MaterialIcons name="check" size={14} color="#22C55E" />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </StaggeredCard>
          )}

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 3: Daily Progress (Calories + Macros in one compact row)
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
          {calorieGoal > 0 && (
            <StaggeredCard index={2}>
              <TouchableOpacity
                style={styles.dailyProgressCard}
                onPress={() => router.push("/(tabs)/meals" as any)}
                activeOpacity={0.85}
                {...a11yButton(A11Y_LABELS.calorieProgress(todayCalories, calorieGoal), "View meal details")}
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

                {/* Weekly Average */}
                {weeklyAvgCalories !== null && (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: SF.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="date-range" size={14} color={SF.muted} />
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>7-Day Average</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                      <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{weeklyAvgCalories}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>kcal/day</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9, marginLeft: 4 }}>({weeklyDaysLogged}d logged)</Text>
                    </View>
                  </View>
                )}

                {/* TDEE Breakdown toggle */}
                {tdeeBreakdown && (
                  <TouchableOpacity
                    onPress={() => { setShowTdeeBreakdown(!showTdeeBreakdown); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 10, paddingVertical: 6 }}
                  >
                    <MaterialIcons name="science" size={13} color={SF.gold} />
                    <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>
                      {showTdeeBreakdown ? "Hide" : "How your target was calculated"}
                    </Text>
                    <MaterialIcons name={showTdeeBreakdown ? "expand-less" : "expand-more"} size={16} color={SF.gold} />
                  </TouchableOpacity>
                )}

                {/* TDEE Breakdown detail */}
                {showTdeeBreakdown && tdeeBreakdown && (
                  <View style={{ marginTop: 8, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: SF.border }}>
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Basal Metabolic Rate (BMR)</Text>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{tdeeBreakdown.bmr} kcal</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Activity: {tdeeBreakdown.activityLabel}</Text>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Ã {tdeeBreakdown.activityMultiplier}</Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: SF.border }} />
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Maintenance TDEE</Text>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{tdeeBreakdown.maintenanceTdee} kcal</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Goal: {tdeeBreakdown.goalLabel}</Text>
                        <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11 }}>{tdeeBreakdown.goalAdjustmentDesc}</Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: SF.border }} />
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Your Daily Target</Text>
                        <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{tdeeBreakdown.adjustedTdee} kcal</Text>
                      </View>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9, textAlign: "center", marginTop: 2 }}>
                        Mifflin-St Jeor equation Â· {tdeeBreakdown.inputs.weightKg}kg Â· {tdeeBreakdown.inputs.heightCm}cm Â· {tdeeBreakdown.inputs.age}y Â· {tdeeBreakdown.inputs.gender}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </StaggeredCard>
          )}


          {/* ______________________________________________________________________________________
              SECTION 3b: Your Goal Visualization (AI body transformation from onboarding)
          ________________________________________________________________________________________ */}
          {targetTransform && targetTransform.imageUrl && (
            <StaggeredCard index={3}>
              <View style={styles.section}>
                <SectionTitle title="Your Goal" />
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push("/(tabs)/scan" as any)}
                  style={{
                    marginHorizontal: 20,
                    borderRadius: 20,
                    overflow: "hidden",
                    backgroundColor: SF.surface,
                    borderWidth: 1.5,
                    borderColor: "rgba(139,92,246,0.3)",
                  }}
                >
                  {/* Before / After comparison */}
                  <View style={{ flexDirection: "row" }}>
                    {/* Current / Original photo */}
                    <View style={{ flex: 1, alignItems: "center", padding: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: SF.secondaryText, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                        Starting Point
                      </Text>
                      {originalScanPhoto ? (
                        <Image
                          source={{ uri: originalScanPhoto }}
                          style={{ width: "100%", height: 160, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ width: "100%", height: 160, borderRadius: 12, backgroundColor: SF.inputBg, alignItems: "center", justifyContent: "center" }}>
                          <MaterialIcons name="person" size={40} color={SF.secondaryText} />
                        </View>
                      )}
                      {originalBodyFat && (
                        <Text style={{ fontSize: 12, fontWeight: "600", color: SF.secondaryText, marginTop: 6 }}>
                          {originalBodyFat}% body fat
                        </Text>
                      )}
                    </View>

                    {/* Arrow */}
                    <View style={{ justifyContent: "center", paddingHorizontal: 4 }}>
                      <MaterialIcons name="arrow-forward" size={24} color="#8B5CF6" />
                    </View>

                    {/* Target AI image */}
                    <View style={{ flex: 1, alignItems: "center", padding: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#8B5CF6", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                        Your Target
                      </Text>
                      <Image
                        source={{ uri: targetTransform.imageUrl }}
                        style={{ width: "100%", height: 160, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(139,92,246,0.25)" }}
                        resizeMode="cover"
                      />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#8B5CF6", marginTop: 6 }}>
                        {targetTransform.target_bf}% body fat
                      </Text>
                    </View>
                  </View>

                  {/* Motivational footer */}
                  <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4, alignItems: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: SF.text, textAlign: "center" }}>
                      {originalBodyFat && targetTransform.target_bf
                        ? `${Math.abs(originalBodyFat - targetTransform.target_bf).toFixed(1)}% body fat to go — you’ve got this!`
                        : "Tap to view your full transformation journey"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </StaggeredCard>
          )}

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
          {/* ______________________________________________________________________________________
              SECTION 4: Progress Tracker (consecutive engagement)
          ________________________________________________________________________________________ */}
          <StaggeredCard index={3}>
            <View style={styles.section}>
              <SectionTitle title="Progress Tracker" />
              <View style={{
                backgroundColor: SF.surface,
                borderRadius: 20,
                padding: 20,
                marginHorizontal: 20,
                borderWidth: 1,
                borderColor: SF.border,
              }}>
                {/* Streak flame header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Text style={{ fontSize: 40 }}>{streakData && streakData.currentStreak > 0 ? "\u{1F525}" : "\u{1F4AA}"}</Text>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 32, fontWeight: "800", color: streakData && streakData.currentStreak > 0 ? "#F97316" : SF.text }}>
                      {streakData ? streakData.currentStreak : 0}
                    </Text>
                    <Text style={{ fontSize: 13, color: SF.muted, fontWeight: "600" }}>
                      week streak
                    </Text>
                  </View>
                </View>

                {/* Streak dots - last 7 weeks */}
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const weeksDone = streakData ? streakData.currentStreak : 0;
                    const filled = i < Math.min(weeksDone, 7);
                    return (
                      <View
                        key={i}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: filled ? "#F97316" : SF.surface,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: filled ? 0 : 1,
                          borderColor: SF.border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: filled ? "#fff" : SF.muted }}>
                          W{i + 1}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Stats row */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: SF.border }}>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: SF.text }}>
                      {streakData ? streakData.longestStreak : 0}
                    </Text>
                    <Text style={{ fontSize: 11, color: SF.muted, fontWeight: "500" }}>Best Streak</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: SF.border }} />
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: SF.text }}>
                      {streakData ? streakData.totalWeeksCompleted : 0}
                    </Text>
                    <Text style={{ fontSize: 11, color: SF.muted, fontWeight: "500" }}>Weeks Completed</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: SF.border }} />
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: SF.text }}>
                      {streakData ? streakData.milestones.length : 0}
                    </Text>
                    <Text style={{ fontSize: 11, color: SF.muted, fontWeight: "500" }}>Milestones</Text>
                  </View>
                </View>

                {/* Motivational message */}
                <Text style={{ textAlign: "center", fontSize: 13, color: SF.muted, fontStyle: "italic", marginTop: 14 }}>
                  {streakData && streakData.currentStreak >= 4 ? "You're on fire! Keep the momentum going!" :
                   streakData && streakData.currentStreak >= 2 ? "Great consistency! Building strong habits." :
                   "Start your streak — log a workout today!"}
                </Text>
              </View>
            </View>
          </StaggeredCard>
          {/* SECTION 5: Quick Insights Carousel (R6) */}
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

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 6: Explore More Grid
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              MORE SECTIONS TOGGLE
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
          <StaggeredCard index={6}>
            <TouchableOpacity
              onPress={() => { setShowMore(!showMore); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 8, paddingVertical: 14, marginHorizontal: 20, marginTop: 4, marginBottom: 8,
                borderRadius: 14, backgroundColor: SF.surface, borderWidth: 1, borderColor: SF.border,
              }}
              {...a11yButton(showMore ? "Show less" : "Show more sections", "Toggle additional dashboard sections")}
            >
              <MaterialIcons name={showMore ? "expand-less" : "expand-more"} size={20} color={SF.gold} />
              <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
                {showMore ? "Show Less" : "More"}
              </Text>
            </TouchableOpacity>
          </StaggeredCard>

          {showMore && (<>
          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 7: Wearable Metrics Panel (compact)
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 8: Muscle Balance Heatmap
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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
                  <BodyDiagramInteractive
                    primary={muscleReport.overExercised.concat(muscleReport.optimal) as MuscleGroup[]}
                    secondary={muscleReport.underExercised as MuscleGroup[]}
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

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 9: Personal Records
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 10: Tips & Tricks
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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
                  {...a11yButton("Next tip", "Show another fitness tip")}
                >
                  <MaterialIcons name="refresh" size={16} color={SF.gold} />
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 12, marginLeft: 4 }}>Next Tip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </StaggeredCard>

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 11: Premium Feature Promotions
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 12: My Pantry Quick Access
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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
                    {...a11yButton("Scan barcode", "Add pantry items by scanning barcode")}
                  >
                    <MaterialIcons name="qr-code-scanner" size={14} color={SF.gold} />
                    <Text style={styles.pantryQuickBtnText}>Scan Barcode</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pantryQuickBtn}
                    onPress={() => router.push("/scan-receipt" as any)}
                    {...a11yButton("Scan receipt", "Add pantry items from a receipt photo")}
                  >
                    <MaterialIcons name="receipt-long" size={14} color={SF.gold} />
                    <Text style={styles.pantryQuickBtnText}>Scan Receipt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pantryQuickBtn}
                    onPress={() => router.push("/meal-prep" as any)}
                    {...a11yButton("Meal prep", "Get AI meal prep suggestions")}
                  >
                    <MaterialIcons name="auto-awesome" size={14} color={SF.gold} />
                    <Text style={styles.pantryQuickBtnText}>Meal Prep</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </StaggeredCard>

          {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
              SECTION 13: Social & Challenges
              âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
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
          </>)}


          {/* ______________________ Progress Check-In ______________________ */}
          <StaggeredCard index={6}>
            <View style={styles.section}>
              <SectionTitle title="Progress Check-In" />
              <View style={{
                marginHorizontal: 20,
                borderRadius: 20,
                backgroundColor: SF.surface,
                borderWidth: 1,
                borderColor: SF.border,
                overflow: "hidden",
              }}>
                {/* Top accent */}
                <View style={{ height: 3, backgroundColor: "#10B981" }} />
                <View style={{ padding: 20 }}>
                  {/* Header with icon */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(16,185,129,0.12)", alignItems: "center", justifyContent: "center" }}>
                      <MaterialIcons name="photo-camera" size={24} color="#10B981" />
                    </View>
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: SF.text }}>
                        Track Your Progress
                      </Text>
                      <Text style={{ fontSize: 12, color: SF.secondaryText, marginTop: 2 }}>
                        {lastProgressDate
                          ? `Last check-in: ${new Date(lastProgressDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                          : "Take your first progress photo"}
                      </Text>
                    </View>
                    {lastProgressDate && (() => {
                      const daysSince = Math.floor((Date.now() - new Date(lastProgressDate).getTime()) / 86400000);
                      return daysSince >= 7 ? (
                        <View style={{ backgroundColor: "rgba(239,68,68,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#EF4444" }}>DUE</Text>
                        </View>
                      ) : null;
                    })()}
                  </View>

                  {/* Info text */}
                  <Text style={{ fontSize: 13, lineHeight: 19, color: SF.secondaryText, marginBottom: 16 }}>
                    Upload a progress photo with your current weight and AI will compare against your starting point{targetTransform ? ` and ${targetTransform.target_bf}% body fat goal` : ""} to track your transformation.
                  </Text>

                  {/* Mini before/target preview if available */}
                  {originalScanPhoto && targetTransform?.imageUrl && (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16, padding: 10, backgroundColor: SF.inputBg, borderRadius: 12 }}>
                      <Image source={{ uri: originalScanPhoto }} style={{ width: 44, height: 56, borderRadius: 8 }} resizeMode="cover" />
                      <View style={{ alignItems: "center" }}>
                        <MaterialIcons name="trending-flat" size={16} color={SF.secondaryText} />
                        <Text style={{ fontSize: 9, color: SF.secondaryText, fontWeight: "600" }}>NOW</Text>
                      </View>
                      <View style={{ width: 2, height: 30, backgroundColor: SF.border }} />
                      <View style={{ alignItems: "center" }}>
                        <MaterialIcons name="flag" size={14} color="#10B981" />
                        <Text style={{ fontSize: 9, color: "#10B981", fontWeight: "600" }}>GOAL</Text>
                      </View>
                      <Image source={{ uri: targetTransform.imageUrl }} style={{ width: 44, height: 56, borderRadius: 8, borderWidth: 1, borderColor: "rgba(16,185,129,0.3)" }} resizeMode="cover" />
                    </View>
                  )}

                  {/* CTA button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#10B981",
                      paddingVertical: 13,
                      borderRadius: 14,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
                    }}
                    onPress={() => router.push("/progress-checkin" as any)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add-a-photo" size={18} color="#fff" />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                      {lastProgressDate ? "Log Progress Photo" : "Take First Progress Photo"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </StaggeredCard>


          {/* ââ Trial / Guest banners ââ */}
          {isTrialActive && (
            <View style={styles.trialBanner}>
              <MaterialIcons name="hourglass-top" size={20} color={SF.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.trialBannerTitle}>Pro Trial â {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} left</Text>
                <Text style={styles.trialBannerSub}>Enjoying all Pro features. Subscribe to keep access.</Text>
              </View>
              <TouchableOpacity style={styles.trialBannerBtn} onPress={() => router.push("/subscription" as any)} {...a11yButton("Subscribe to Pro")}>
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
              <TouchableOpacity style={styles.guestBannerBtn} onPress={() => router.push("/login" as any)} {...a11yButton("Sign In", "Sign in to sync data across devices")}>
                <Text style={styles.guestBannerBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.ScrollView>

        {/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
            R5: Floating "Start Workout" Button
            âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
        <FloatingStartWorkout />

        {/* âââ STREAK CELEBRATION OVERLAY âââ */}
        {showStreakCelebration && (
          <StreakCelebration
            streakDays={streakData?.currentStreak ?? 7}
            onDismiss={() => setShowStreakCelebration(false)}
          />
        )}
      </View>
    </>
  );
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   Streak Celebration Component â Fire-burst animation overlay
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
function StreakCelebration({ streakDays, onDismiss }: { streakDays: number; onDismiss: () => void }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const fireScale = useSharedValue(0.5);
  const fireRotation = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) });
    fireScale.value = withSequence(
      withTiming(1.3, { duration: 300, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200 }),
    );
    fireRotation.value = withSequence(
      withTiming(-5, { duration: 100 }),
      withTiming(5, { duration: 100 }),
      withTiming(-3, { duration: 100 }),
      withTiming(3, { duration: 100 }),
      withTiming(0, { duration: 100 }),
    );

    // Auto-dismiss after 3.5s
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 });
      scale.value = withTiming(0.8, { duration: 400 });
      setTimeout(onDismiss, 450);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fireStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fireScale.value },
      { rotate: `${fireRotation.value}deg` },
    ],
  }));

  // Fire particle positions (pre-computed)
  const particles = [
    { x: -60, y: -80, delay: 0, size: 20 },
    { x: 50, y: -90, delay: 50, size: 16 },
    { x: -40, y: -110, delay: 100, size: 14 },
    { x: 70, y: -70, delay: 150, size: 18 },
    { x: -20, y: -100, delay: 200, size: 12 },
    { x: 30, y: -120, delay: 80, size: 15 },
    { x: -70, y: -60, delay: 120, size: 13 },
    { x: 60, y: -100, delay: 180, size: 17 },
  ];

  return (
    <Animated.View
      style={[
        {
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.75)",
          alignItems: "center", justifyContent: "center",
          zIndex: 999,
        },
        overlayStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          opacity.value = withTiming(0, { duration: 300 });
          scale.value = withTiming(0.8, { duration: 300 });
          setTimeout(onDismiss, 350);
        }}
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        {/* Fire particles */}
        {particles.map((p, i) => (
          <FireParticle key={i} x={p.x} y={p.y} delay={p.delay} size={p.size} />
        ))}

        <Animated.View style={[{ alignItems: "center" }, cardStyle]}>
          {/* Main fire icon */}
          <Animated.View style={fireStyle}>
            <Text style={{ fontSize: 72 }}>{"\uD83D\uDD25"}</Text>
          </Animated.View>

          {/* Streak count */}
          <Text style={{
            color: "#F59E0B", fontFamily: "BebasNeue_400Regular",
            fontSize: 64, letterSpacing: 4, marginTop: 8,
          }}>
            {streakDays} DAYS
          </Text>

          <Text style={{
            color: "#FBBF24", fontFamily: "DMSans_700Bold",
            fontSize: 20, marginTop: 4,
          }}>
            Streak Milestone!
          </Text>

          <Text style={{
            color: "rgba(255,255,255,0.6)", fontFamily: "DMSans_400Regular",
            fontSize: 14, marginTop: 12, textAlign: "center",
            maxWidth: 260, lineHeight: 20,
          }}>
            You've been crushing it for {streakDays} days straight. Keep the momentum going!
          </Text>

          <Text style={{
            color: "rgba(255,255,255,0.3)", fontFamily: "DMSans_400Regular",
            fontSize: 11, marginTop: 24,
          }}>
            Tap to dismiss
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* Fire particle sub-component */
function FireParticle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  const translateY = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const particleScale = useSharedValue(0.3);

  useEffect(() => {
    const timer = setTimeout(() => {
      particleOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 800 }),
      );
      translateY.value = withTiming(-60, { duration: 1000, easing: Easing.out(Easing.quad) });
      particleScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(0.4, { duration: 700 }),
      );
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: x,
    top: y,
    opacity: particleOpacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: particleScale.value },
    ],
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: size }}>{"\uD83D\uDD25"}</Text>
    </Animated.View>
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

export default function HomeScreen() {
  return (
    <ErrorBoundary fallbackScreen="Dashboard">
      <HomeScreenContent />
    </ErrorBoundary>
  );
}
