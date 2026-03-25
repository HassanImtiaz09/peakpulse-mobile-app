import React, { useEffect, useState, useCallback } from "react";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  withTiming, withDelay, withSpring, withSequence, withRepeat, Easing, interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useCalories, type MealEntry } from "@/lib/calorie-context";
import { scheduleAllDefaultReminders } from "@/lib/notifications";
import {
  Text, View, TouchableOpacity, ImageBackground, Image, StyleSheet, Platform, Modal, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallModal } from "@/components/paywall-modal";
import { TutorialOverlay, useTutorial } from "@/components/tutorial-overlay";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useWearable } from "@/lib/wearable-context";
import { BodyHeatmap } from "@/components/body-heatmap";
import { analyzeMuscleBalance, generateSuggestions, generatePlanChanges, applyPlanChanges, type MuscleBalanceReport, type ExerciseSuggestion, type PlanChange } from "@/lib/muscle-balance";
import { getWeeklyGoals, calculateWeeklyProgress, getWorkoutsThisWeek, isGoalTrackingEnabled, type WeeklyGoals, type WeeklyProgress } from "@/lib/goal-tracking";
import { shareWeeklySummaryCard, shareMilestoneCard, type WeeklySummaryCardData, type MilestoneCardData } from "@/lib/social-card-generator";
import { TrendChart, PRProgressChart, type TrendDataPoint } from "@/components/trend-chart";
import { getPRSummary, type PRSummary } from "@/lib/personal-records";
import { useUserProfile } from "@/lib/user-profile-context";
import { PremiumFeatureBanner, PremiumFeatureTeaser } from "@/components/premium-feature-banner";
import { useExerciseCompletion } from "@/lib/exercise-completion-context";
import { WearableMetricsPanel } from "@/components/wearable-metrics-panel";

import {
  getStreakData, evaluateWeek, getWeekNeedingEvaluation, getCurrentMilestone,
  getNextMilestone, getWeeksToNextMilestone, getStreakEmoji, getStreakLabel,
  getStreakMotivation, getPendingCelebrations, clearPendingCelebrations,
  markMilestoneCelebrated, MILESTONE_TIERS,
  type StreakData, type MilestoneTier,
} from "@/lib/streak-tracking";

const TIPS_AND_TRICKS = [
  { icon: "water-drop" as const, tip: "Drink 500ml of water first thing in the morning to kickstart your metabolism and hydration." },
  { icon: "fitness-center" as const, tip: "Compound lifts (squat, deadlift, bench) give you the most muscle-building bang for your time — prioritise them." },
  { icon: "bedtime" as const, tip: "Sleep is when your muscles grow. Aim for 7-9 hours — it's the most underrated recovery tool." },
  { icon: "restaurant" as const, tip: "Aim for 1.6-2.2g of protein per kg of bodyweight daily to maximise muscle retention and growth." },
  { icon: "local-fire-department" as const, tip: "Progressive overload is the key to results — add 1 rep or 2.5kg each week to keep your muscles adapting." },
  { icon: "psychology" as const, tip: "Mind-muscle connection matters. Slow down your reps and focus on feeling the target muscle contract." },
  { icon: "photo-camera" as const, tip: "Take progress photos every 2 weeks in the same lighting — the scale lies, photos don't." },
  { icon: "kitchen" as const, tip: "Meal prepping on Sunday saves 45+ minutes per day and makes it 3x easier to hit your calorie targets." },
  { icon: "timer" as const, tip: "Rest 60-90 seconds between hypertrophy sets, 2-3 minutes for strength work. Timer matters." },
  { icon: "directions-walk" as const, tip: "10,000 steps a day burns an extra 300-500 calories without touching your workout recovery." },
  { icon: "eco" as const, tip: "Don't fear fats — avocado, nuts and olive oil support hormone production including testosterone." },
  { icon: "trending-up" as const, tip: "Track your workouts. People who log their sessions progress 40% faster than those who don't." },
  { icon: "self-improvement" as const, tip: "Stress raises cortisol which promotes fat storage. Even 5 minutes of deep breathing post-workout helps." },
  { icon: "bolt" as const, tip: "Eat fast-digesting carbs (banana, white rice) within 30 min post-workout to replenish glycogen." },
  { icon: "science" as const, tip: "Creatine monohydrate is the most researched supplement in sports science — 3-5g daily is proven to work." },
];

// Aurora Titan — hero backgrounds
const AT_DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";
const AT_PLANS_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";
const AT_MEALS_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";
const APP_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// NanoBanana colour tokens — per-screen accent semantics
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
  macroProtein: "#60A5FA",
  macroCarbs: "#FBBF24",
  macroFat: "#FB923C",
};

// Quick Action definitions grouped into categories (3A)
type QuickAction = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  route: string;
  gated: boolean;
  feature?: string;
  tier?: "basic" | "advanced";
  desc?: string;
};
type ActionGroup = {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  actions: QuickAction[];
};
const QUICK_ACTION_GROUPS: ActionGroup[] = [
  {
    title: "Workout",
    icon: "fitness-center",
    actions: [
      { icon: "fitness-center", label: "Start Workout", route: "/(tabs)/plans", gated: false },
      { icon: "edit-note", label: "Log Workout", route: "/log-workout", gated: false },
      { icon: "history", label: "Workout Log", route: "/workout-history", gated: false },
      { icon: "calendar-today", label: "Workout History", route: "/workout-calendar", gated: false },
      { icon: "bookmark", label: "Templates", route: "/workout-templates", gated: false },
      { icon: "center-focus-strong", label: "Form Check", route: "/form-checker", gated: true, feature: "form_checker", tier: "advanced", desc: "AI Form Checker analyzes your exercise technique in real-time — Advanced plan only." },
    ],
  },
  {
    title: "Nutrition",
    icon: "restaurant",
    actions: [
      { icon: "restaurant", label: "Log Meal", route: "/(tabs)/meals", gated: false },
      { icon: "photo-camera", label: "Snap a Meal", route: "/(tabs)/meals", gated: false },
      { icon: "receipt-long", label: "Scan Receipt", route: "/scan-receipt", gated: false },
      { icon: "kitchen", label: "My Pantry", route: "/pantry", gated: false },
      { icon: "photo-library", label: "Meal Timeline", route: "/meal-timeline", gated: false },
      { icon: "auto-awesome", label: "Meal Prep", route: "/meal-prep", gated: false },
    ],
  },
  {
    title: "AI & Insights",
    icon: "smart-toy",
    actions: [
      { icon: "smart-toy", label: "AI Coach", route: "/ai-coach", gated: true, feature: "ai_coaching", tier: "advanced", desc: "Get personalized AI coaching with form analysis and progress insights — Advanced plan only." },
      { icon: "camera-alt", label: "AI Body Scan", route: "/(tabs)/scan", gated: true, feature: "body_scan", tier: "basic", desc: "AI Body Scan analyzes your physique and tracks body composition — Basic plan and above." },
      { icon: "show-chart", label: "Health Trends", route: "/health-trends", gated: false },
      { icon: "notifications-active", label: "AI Reminders", route: "/notification-settings", gated: false },
    ],
  },
  {
    title: "Progress & Goals",
    icon: "trending-up",
    actions: [
      { icon: "check-circle", label: "Daily Check-In", route: "/daily-checkin", gated: false },
      { icon: "flag", label: "Weekly Goals", route: "/weekly-goals", gated: false },
      { icon: "bar-chart", label: "Weekly Summary", route: "/weekly-summary", gated: false },
      { icon: "trending-up", label: "Progress Photos", route: "/progress-photos", gated: true, feature: "progress_photos", tier: "basic", desc: "Track your body transformation with progress photos — Basic plan and above." },
      { icon: "watch", label: "Wearables", route: "/wearable-sync", gated: true, feature: "wearable_sync", tier: "basic", desc: "Sync your fitness wearable with PeakPulse — Basic plan and above." },
    ],
  },
  {
    title: "Social & Challenges",
    icon: "people",
    actions: [
      { icon: "group", label: "Community", route: "/social-feed", gated: true, feature: "social_feed", tier: "advanced", desc: "Join the PeakPulse community — Advanced plan only." },
      { icon: "bolt", label: "7-Day Challenge", route: "/challenge-onboarding", gated: true, feature: "challenges", tier: "advanced", desc: "Unlock 7-day fitness challenges — Advanced plan only." },
      { icon: "sports-martial-arts", label: "Challenges", route: "/challenge", gated: false },
      { icon: "people", label: "Social Circle", route: "/social-circle", gated: false },
      { icon: "groups", label: "Group Goals", route: "/group-goals", gated: false },
      { icon: "card-giftcard", label: "Refer a Friend", route: "/referral", gated: false },
    ],
  },
  {
    title: "More",
    icon: "more-horiz",
    actions: [
      { icon: "location-on", label: "Find Gym", route: "/gym-finder", gated: false },
      { icon: "workspace-premium", label: "Upgrade Plan", route: "/subscription", gated: false },
    ],
  },
];
// Flat list for backward compatibility
const QUICK_ACTIONS_ALL = QUICK_ACTION_GROUPS.flatMap(g => g.actions);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

// Stat ring icon mapping + per-ring accent colors (NanoBanana: gold, ice, mint, rose)
const STAT_RING_META: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  Workouts: { icon: "fitness-center", color: SF.gold },
  Streak: { icon: "local-fire-department", color: SF.ice },
  Meals: { icon: "restaurant", color: SF.mint },
  Photos: { icon: "photo-camera", color: SF.rose },
};

// ── StatRing with pulse animation (6B) ──────────────────────────────────────
function StatRing({ value, label, progress = 0 }: { value: string; label: string; progress?: number }) {
  const animProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const prevValueRef = React.useRef(value);
  const R = 26;
  const circumference = 2 * Math.PI * R;
  const meta = STAT_RING_META[label] ?? { icon: "help-outline" as const, color: SF.gold };
  const iconName = meta.icon;
  const ringColor = meta.color;

  useEffect(() => {
    animProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  // 6B: Pulse on value change
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      pulseScale.value = withSequence(
        withTiming(1.08, { duration: 150 }),
        withTiming(1, { duration: 150 }),
      );
    }
  }, [value]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - animProgress.value) }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  return (
    <AnimatedView style={[styles.ringItem, pulseStyle]}>
      <View style={styles.ringContainer}>
        <Svg width={64} height={64} style={StyleSheet.absoluteFill}>
          <Circle cx={32} cy={32} r={R} stroke="rgba(245,158,11,0.12)" strokeWidth={3.5} fill="none" />
          <AnimatedCircle cx={32} cy={32} r={R} stroke={ringColor} strokeWidth={3.5} fill="none"
            strokeDasharray={circumference} animatedProps={animatedProps} strokeLinecap="round" rotation="-90" origin="32,32" />
        </Svg>
        <MaterialIcons name={iconName} size={20} color={ringColor} />
      </View>
      <Text style={styles.ringValue}>{value}</Text>
      <Text style={styles.ringLabel}>{label}</Text>
    </AnimatedView>
  );
}

// ── QuickActionCard with press scale animation (6C) ─────────────────────────
function QuickActionCard({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.95, { duration: 80 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  }, []);
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <AnimatedView style={[styles.qaCard, animStyle]}>
      <TouchableOpacity
        style={{ alignItems: "center", gap: 8, flex: 1 }}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.qaIconBox}>
          <MaterialIcons name={icon} size={24} color={SF.gold} />
        </View>
        <Text style={styles.qaLabel}>{label}</Text>
      </TouchableOpacity>
    </AnimatedView>
  );
}

// ── Staggered animation wrapper (1C) ────────────────────────────────────────
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

// ── Section title with gold accent bar (4A) ─────────────────────────────────
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

export default function HomeScreen() {
  const router = useRouter();
  const { canAccess, isTrialActive, daysLeftInTrial, hasUsedTrial, isPaid, hasAdvancedAccess } = useSubscription();
  const [paywallFeature, setPaywallFeature] = useState<{ name: string; icon: string; tier: "basic" | "advanced"; desc?: string } | null>(null);
  const { showTutorial, dismissTutorial } = useTutorial();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { guestProfile, isGuest, loading: guestLoading } = useGuestAuth();
  const [localProfile, setLocalProfile] = useState<any>(null);
  const [latestBF, setLatestBF] = useState<{ bf: number; date: string; confidence: string } | null>(null);
  const [targetBF, setTargetBF] = useState<{ target_bf: number; imageUrl?: string } | null>(null);
  const [showTargetImageModal, setShowTargetImageModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null); // 2A: Quick Actions grouped
  const [showAllActions, setShowAllActions] = useState(false); // backward compat
  const canUse = isAuthenticated || isGuest;
  const wearableData = useWearable();
  const [tipIndex, setTipIndex] = React.useState(0);
  const [goalProgress, setGoalProgress] = React.useState<WeeklyProgress | null>(null);
  const [goalsEnabled, setGoalsEnabled] = React.useState(false);
  const [sharingCard, setSharingCard] = React.useState(false);
  const [streakData, setStreakData] = React.useState<StreakData | null>(null);
  const [celebrationMilestone, setCelebrationMilestone] = React.useState<MilestoneTier | null>(null);
  const [showCelebration, setShowCelebration] = React.useState(false);

  // Progress photo streak
  const [progressPhotoStreak, setProgressPhotoStreak] = React.useState(0);

  // Muscle balance state
  const [muscleReport, setMuscleReport] = React.useState<MuscleBalanceReport | null>(null);
  const [suggestions, setSuggestions] = React.useState<ExerciseSuggestion[]>([]);
  const [planChanges, setPlanChanges] = React.useState<PlanChange[]>([]);
  const [balanceWindow, setBalanceWindow] = React.useState<7 | 14 | 30>(7);
  const [applyingChanges, setApplyingChanges] = React.useState(false);
  // Trend chart and PR state
  const [trendData, setTrendData] = React.useState<TrendDataPoint[]>([]);
  const [prSummary, setPrSummary] = React.useState<PRSummary | null>(null);


  // 1A: Parallax scroll value
  const scrollY = useSharedValue(0);

  // Rotate tips every 5 minutes
  
  // Load trend data and PR summary
  React.useEffect(() => {
    async function loadTrendAndPR() {
      try {
        // Load PR summary
        const summary = await getPRSummary();
        setPrSummary(summary);

        // Generate trend data from workout sessions
        const raw = await AsyncStorage.getItem("@workout_sessions_local");
        const sessions: any[] = raw ? JSON.parse(raw) : [];
        if (sessions.length < 2) return;

        // Group sessions by week
        const weekMap = new Map<string, any[]>();
        for (const s of sessions) {
          const d = new Date(s.completedAt);
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          const key = weekStart.toISOString().split("T")[0];
          if (!weekMap.has(key)) weekMap.set(key, []);
          weekMap.get(key)!.push(s);
        }

        // Convert to trend data points
        const points: TrendDataPoint[] = [];
        const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [weekKey, weekSessions] of sortedWeeks.slice(-12)) {
          const d = new Date(weekKey);
          const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          // Simple scoring based on workout count and variety
          const exerciseNames = new Set<string>();
          for (const s of weekSessions) {
            try {
              const exs = JSON.parse(s.completedExercisesJson || "[]");
              exs.forEach((e: string) => exerciseNames.add(e.toLowerCase()));
            } catch {}
          }
          const variety = Math.min(15, exerciseNames.size);
          const overallScore = Math.min(100, Math.round(weekSessions.length * 15 + variety * 3));
          points.push({
            date: weekKey,
            label,
            overCount: Math.max(0, Math.round(variety * 0.2)),
            optimalCount: Math.round(variety * 0.5),
            underCount: Math.max(0, 10 - variety),
            overallScore,
            muscleScores: {},
          });
        }
        setTrendData(points);
      } catch {}
    }
    loadTrendAndPR();
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS_AND_TRICKS.length);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load goal tracking data + streak
  React.useEffect(() => {
    if (!canUse) return;
    (async () => {
      const enabled = await isGoalTrackingEnabled();
      setGoalsEnabled(enabled);
      if (!enabled) return;
      const goals = await getWeeklyGoals();
      const workoutsThisWeek = await getWorkoutsThisWeek();
      const progress = calculateWeeklyProgress(goals, {
        avgDailySteps: wearableData.stats.steps,
        avgDailyCalories: wearableData.stats.totalCaloriesBurnt,
        workoutsThisWeek,
      });
      setGoalProgress(progress);

      // Load streak data
      const streak = await getStreakData();
      setStreakData(streak);

      // Check for weeks needing evaluation
      const weekToEval = getWeekNeedingEvaluation(streak.lastEvaluatedWeek);
      if (weekToEval) {
        const result = await evaluateWeek(weekToEval, {
          stepsPercentage: progress.steps.percentage,
          caloriesPercentage: progress.calories.percentage,
          workoutsPercentage: progress.workouts.percentage,
        });
        setStreakData(result.streakData);
      }

      // Check for pending celebrations
      const pending = await getPendingCelebrations();
      if (pending.length > 0) {
        const tier = MILESTONE_TIERS.find((t) => t.id === pending[0]);
        if (tier) {
          setCelebrationMilestone(tier);
          setShowCelebration(true);
        }
      }
    })();
  }, [canUse, wearableData.stats.steps, wearableData.stats.totalCaloriesBurnt]);

  const exerciseCompletion = useExerciseCompletion();
  const { displayName: savedDisplayName, profilePhotoUri } = useUserProfile();
  const displayName = savedDisplayName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? guestProfile?.name?.split(" ")[0] ?? "Athlete";

  // ── Server-side data (authenticated users — syncs across devices) ─────
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: workoutPlan } = trpc.workoutPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: mealPlan } = trpc.mealPlan.getActive.useQuery(undefined, { enabled: isAuthenticated });
  const { data: progressPhotos } = trpc.progress.getAll.useQuery(undefined, { enabled: isAuthenticated });

  const { totalCalories: todayCalories, calorieGoal, meals: todayMeals, setCalorieGoal, macroTargets } = useCalories();
  useEffect(() => {
    AsyncStorage.getItem("@user_tdee").then(raw => {
      if (raw) {
        const tdee = parseInt(raw, 10);
        if (!isNaN(tdee) && tdee > 0 && tdee !== calorieGoal) {
          setCalorieGoal(tdee);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Onboarding guard ─────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || guestLoading) return;
    if (isAuthenticated) {
      const timer = setTimeout(() => setOnboardingChecked(true), 800);
      return () => clearTimeout(timer);
    }
    AsyncStorage.getItem("@onboarding_complete").then(val => {
      if (!val) {
        router.replace("/onboarding" as any);
      } else {
        setOnboardingChecked(true);
      }
    });
  }, [authLoading, guestLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (profile === null) {
      router.replace("/onboarding" as any);
    } else if (profile !== undefined) {
      setOnboardingChecked(true);
    }
  }, [profile, isAuthenticated, authLoading]);

  // ── Stats ────
  const authStats = React.useMemo(() => {
    if (!isAuthenticated) return null;
    const workouts = workoutPlan?.schedule?.filter((d: any) => !d.isRest).length ?? 0;
    const photos = progressPhotos?.length ?? 0;
    return { workouts, streak: 0, meals: todayMeals.length, photos };
  }, [isAuthenticated, workoutPlan, progressPhotos, todayMeals.length]);

  const [guestStats, setGuestStats] = useState({ workouts: 0, streak: 0, meals: 0, photos: 0 });
  useEffect(() => {
    if (!isGuest) return;
    Promise.all([
      AsyncStorage.getItem("@workout_count"),
      AsyncStorage.getItem("@streak_count"),
      AsyncStorage.getItem("@progress_photos"),
    ]).then(([wc, sc, pp]) => {
      setGuestStats({
        workouts: wc ? parseInt(wc) : 0,
        streak: sc ? parseInt(sc) : 0,
        meals: todayMeals.length,
        photos: pp ? JSON.parse(pp).length : 0,
      });
    });
  }, [isGuest, todayMeals.length]);

  const stats = isAuthenticated ? (authStats ?? { workouts: 0, streak: 0, meals: todayMeals.length, photos: 0 }) : guestStats;

  useEffect(() => {
    if (Platform.OS !== "web" && canUse) {
      scheduleAllDefaultReminders().catch(() => {});
    }
  }, [canUse]);

  const caloriesRemaining = Math.max(0, calorieGoal - todayCalories);
  const calorieProgress = calorieGoal > 0 ? Math.min(todayCalories / calorieGoal, 1) : 0;
  const activeProfile = isAuthenticated ? profile : guestProfile;
  const userGender = ((activeProfile as any)?.gender ?? "male") as "male" | "female";

  // Load muscle balance analysis
  React.useEffect(() => {
    if (!canUse) return;
    (async () => {
      try {
        const report = await analyzeMuscleBalance(balanceWindow);
        setMuscleReport(report);
        const sugg = generateSuggestions(report);
        setSuggestions(sugg);
        if (workoutPlan?.schedule) {
          const changes = generatePlanChanges(report, workoutPlan.schedule);
          setPlanChanges(changes);
        }
      } catch (e) {
        console.warn("[Dashboard] Muscle balance analysis failed:", e);
      }
    })();
  }, [canUse, balanceWindow, workoutPlan]);

  // Load progress photo streak
  useEffect(() => {
    AsyncStorage.getItem("@progress_photos").then(raw => {
      if (!raw) return;
      try {
        const photos = JSON.parse(raw) as any[];
        const dates = photos.map((p: any) => {
          const d = new Date(p.date || p.timestamp || p.createdAt);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        });
        const uniqueDates = [...new Set(dates)].sort().reverse();
        if (uniqueDates.length === 0) return;
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < uniqueDates.length; i++) {
          const expected = new Date(today);
          expected.setDate(today.getDate() - i);
          const expStr = `${expected.getFullYear()}-${String(expected.getMonth()+1).padStart(2,"0")}-${String(expected.getDate()).padStart(2,"0")}`;
          if (uniqueDates.includes(expStr)) streak++;
          else break;
        }
        setProgressPhotoStreak(streak);
      } catch {}
    });
  }, [canUse]);

  useEffect(() => {
    AsyncStorage.getItem("@body_scan_history").then(raw => {
      if (!raw) return;
      try {
        const scans = JSON.parse(raw) as any[];
        if (scans.length > 0) {
          const latest = scans[scans.length - 1];
          setLatestBF({ bf: latest.estimatedBodyFat, date: latest.date ?? latest.createdAt ?? "", confidence: latest.confidenceLow && latest.confidenceHigh ? `${latest.confidenceLow}–${latest.confidenceHigh}%` : "" });
        }
      } catch {}
    });
    AsyncStorage.getItem("@target_transformation").then(raw => {
      if (raw) {
        try { setTargetBF(JSON.parse(raw)); } catch {}
      }
    });
  }, [canUse]);

  // AI Coach pulsing glow animation
  const aiCoachGlow = useSharedValue(0.4);
  useEffect(() => {
    aiCoachGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
    );
  }, []);
  const aiCoachPulseStyle = useAnimatedStyle(() => ({
    shadowOpacity: aiCoachGlow.value,
    transform: [{ scale: interpolate(aiCoachGlow.value, [0.4, 1], [1, 1.04], Extrapolation.CLAMP) }],
  }));

  // 1A: Parallax animated styles
  const heroImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 300], [0, 150], Extrapolation.CLAMP) }],
  }));
  const heroContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 200], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.value, [0, 200], [1, 0.95], Extrapolation.CLAMP) }],
  }));

  const handleScroll = useCallback((event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  }, []);

  if (!onboardingChecked && !authLoading && !guestLoading) {
    return <View style={{ flex: 1, backgroundColor: SF.bg }} />;
  }

  // ── Welcome / not logged in ────────────────────────────────────────────────
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

  const gatedNav = (path: string, feature: string, icon: string, tier: "basic" | "advanced", desc?: string) => {
    if (canAccess(feature)) { router.push(path as any); }
    else { setPaywallFeature({ name: feature.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon, tier, desc }); }
  };

  // 2A: Determine visible quick actions
  const visibleActions = showAllActions ? QUICK_ACTIONS_ALL : QUICK_ACTIONS_ALL.slice(0, 6);
  const actionRows: typeof QUICK_ACTIONS_ALL[] = [];
  for (let i = 0; i < visibleActions.length; i += 3) {
    actionRows.push(visibleActions.slice(i, i + 3));
  }

  // Macro values for calorie card
  const macroVals = [0, 0, 0];
  (todayMeals as MealEntry[]).forEach(m => { macroVals[0] += m.protein ?? 0; macroVals[1] += m.carbs ?? 0; macroVals[2] += m.fat ?? 0; });
  const macroGoals = [macroTargets.protein, macroTargets.carbs, macroTargets.fat];
  const macroColors = [SF.macroProtein, SF.macroCarbs, SF.macroFat];
  const macroLabels = ["Protein", "Carbs", "Fat"];

  // ── Main Dashboard ─────────────────────────────────────────────────────────
  return (
    <>
      <PaywallModal visible={!!paywallFeature} onClose={() => setPaywallFeature(null)}
        featureName={paywallFeature?.name ?? ""} featureIcon={paywallFeature?.icon}
        requiredTier={paywallFeature?.tier ?? "basic"} description={paywallFeature?.desc} />
      <TutorialOverlay visible={showTutorial} onDismiss={dismissTutorial} />
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          style={{ flex: 1 }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* ── Hero Header (NanoBanana: dark, no background image) ── */}
          <View style={{ backgroundColor: SF.bg, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 }}>
            {/* Top bar: hamburger + icons */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <TouchableOpacity onPress={() => router.push("/user-guide" as any)} style={{ padding: 4 }}>
                <MaterialIcons name="menu" size={24} color={SF.fg} />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                <TouchableOpacity onPress={() => {}} style={{ padding: 4 }}>
                  <MaterialIcons name="refresh" size={22} color={SF.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/notification-settings" as any)} style={{ padding: 4 }}>
                  <MaterialIcons name="notifications-none" size={22} color={SF.muted} />
                </TouchableOpacity>
              </View>
            </View>
            {/* Greeting + streak badge */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                {profilePhotoUri ? (
                  <Image source={{ uri: profilePhotoUri }} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: SF.gold }} />
                ) : null}
                <View style={{ flex: 1 }}>
                <Text style={{ color: SF.muted, fontFamily: "DMSans_500Medium", fontSize: 14 }}>Welcome back</Text>
                <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 34, letterSpacing: 2, marginTop: 2 }}>
                  HI, {displayName.toUpperCase()}
                </Text>
                {(activeProfile as any)?.goal && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <View style={styles.heroPill}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MaterialIcons name="flag" size={12} color={SF.gold} />
                        <Text style={styles.heroPillText}>
                          {(activeProfile as any).goal === "build_muscle" ? "Build Muscle" : (activeProfile as any).goal === "lose_fat" ? "Lose Fat" : (activeProfile as any).goal}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
              </View>
              {/* Streak badge */}
              {streakData && streakData.currentStreak > 0 && (
                <View style={{
                  backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 14,
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
                  flexDirection: "row", alignItems: "center", gap: 6,
                }}>
                  <MaterialIcons name="local-fire-department" size={18} color={SF.gold} />
                  <Text style={{ color: SF.gold, fontFamily: "SpaceMono_700Bold", fontSize: 14 }}>
                    {streakData.currentStreak * 7} DAYS
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Today's Workout (moved to top) ── */}
          {workoutPlan?.schedule?.[0] && (
            <StaggeredCard index={0}>
              <View style={styles.section}>
                <SectionTitle title="Today's Workout" />
                <ImageBackground source={{ uri: AT_PLANS_BG }} style={{ borderRadius: 20, overflow: "hidden" }} resizeMode="cover">
                  <View style={styles.planCardOverlay}>
                    <Text style={styles.cardEyebrow}>{workoutPlan.schedule[0].day?.toUpperCase()}</Text>
                    <Text style={styles.planCardTitle}>{workoutPlan.schedule[0].focus}</Text>
                    {(() => {
                      const exList = (workoutPlan.schedule[0].exercises ?? []).map((e: any) => e.name ?? e);
                      const today = new Date().toISOString().split("T")[0];
                      const done = exerciseCompletion.getCompletedCount(today, exList);
                      const total = exList.length;
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                      return (
                        <View style={{ marginTop: 8 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                            <Text style={{ color: SF.muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>{done}/{total} exercises done</Text>
                            <Text style={{ color: pct === 100 ? SF.mint : SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12 }}>{pct}%</Text>
                          </View>
                          <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                            <View style={{ height: 6, borderRadius: 3, width: `${pct}%` as any, backgroundColor: pct === 100 ? SF.mint : SF.gold }} />
                          </View>
                        </View>
                      );
                    })()}
                    <TouchableOpacity style={styles.planCardBtn} onPress={() => router.push("/(tabs)/plans" as any)}>
                      <Text style={styles.planCardBtnText}>{exerciseCompletion.getTodayCompletedCount((workoutPlan.schedule[0].exercises ?? []).map((e: any) => e.name ?? e)) === (workoutPlan.schedule[0].exercises?.length ?? 0) && (workoutPlan.schedule[0].exercises?.length ?? 0) > 0 ? "Workout Complete \u2713" : "Start Workout"}</Text>
                      <MaterialIcons name="arrow-forward" size={16} color={SF.bg} />
                    </TouchableOpacity>
                  </View>
                </ImageBackground>
              </View>
            </StaggeredCard>
          )}

          {/* ── Today's Nutrition (moved to top) ── */}
          {(mealPlan as any)?.days?.[0] && (
            <StaggeredCard index={1}>
              <View style={styles.section}>
                <SectionTitle title="Today's Nutrition" />
                <ImageBackground source={{ uri: AT_MEALS_BG }} style={{ borderRadius: 20, overflow: "hidden" }} resizeMode="cover">
                  <View style={styles.planCardOverlay}>
                    <Text style={styles.cardEyebrow}>MEAL PLAN</Text>
                    <Text style={styles.planCardTitle}>{(mealPlan as any).days[0].totalCalories} kcal target</Text>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                      {[
                        { label: "Protein", value: (mealPlan as any).days[0].protein + "g" },
                        { label: "Carbs", value: (mealPlan as any).days[0].carbs + "g" },
                        { label: "Fats", value: (mealPlan as any).days[0].fats + "g" },
                      ].map(m => (
                        <View key={m.label} style={styles.macroPill}>
                          <Text style={styles.macroPillValue}>{m.value}</Text>
                          <Text style={styles.macroPillLabel}>{m.label}</Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity style={styles.planCardBtn} onPress={() => router.push("/(tabs)/meals" as any)}>
                      <Text style={styles.planCardBtnText}>View Meal Plan</Text>
                      <MaterialIcons name="arrow-forward" size={16} color={SF.bg} />
                    </TouchableOpacity>
                  </View>
                </ImageBackground>
              </View>
            </StaggeredCard>
          )}

          {/* ── Stats Ring Row (1C: staggered index 2, 4B: primary card) ── */}
          <StaggeredCard index={0}>
            <View style={styles.statsCard}>
              <StatRing value={String(stats.workouts)} label="Workouts" progress={Math.min(stats.workouts / 30, 1)} />
              <View style={styles.statsDivider} />
              <StatRing value={String(stats.streak)} label="Streak" progress={Math.min(stats.streak / 7, 1)} />
              <View style={styles.statsDivider} />
              <StatRing value={String(stats.meals)} label="Meals" progress={Math.min(stats.meals / 3, 1)} />
              <View style={styles.statsDivider} />
              <StatRing value={String(stats.photos)} label="Photos" progress={Math.min(stats.photos / 30, 1)} />
            </View>
          </StaggeredCard>

          {/* ── Calorie Progress (1C: staggered index 1, 4B: primary card, 4C: gradient) ── */}
          {calorieGoal > 0 && (
            <StaggeredCard index={1}>
              <View style={styles.calorieCard}>
                <View style={styles.calorieHeader}>
                  <View>
                    <Text style={styles.cardEyebrow}>TODAY'S CALORIES</Text>
                    <Text style={styles.calorieValue}>{todayCalories} <Text style={styles.calorieGoal}>/ {calorieGoal} kcal</Text></Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.cardEyebrow}>REMAINING</Text>
                    <Text style={[styles.calorieValue, { color: caloriesRemaining < 200 ? SF.teal : SF.emerald }]}>{caloriesRemaining} kcal</Text>
                  </View>
                </View>
                {/* 4C: Gradient progress bar */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${calorieProgress * 100}%` as any }]}>
                    <View style={{ flex: 1, borderRadius: 4, backgroundColor: calorieProgress > 0.8 ? SF.orange : SF.gold }} />
                  </View>
                  {calorieGoal > 0 && (
                    <View style={{ position: "absolute", right: 8, top: 0, bottom: 0, justifyContent: "center" }}>
                      <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 8 }}>{Math.round(calorieProgress * 100)}%</Text>
                    </View>
                  )}
                </View>
                {/* 4C: Distinct macro colours with targets */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                  {macroLabels.map((macro, i) => (
                    <View key={macro} style={{ alignItems: "center", flex: 1 }}>
                      <Text style={[styles.macroValue, { color: macroColors[i] }]}>
                        {Math.round(macroVals[i])}g{macroGoals[i] > 0 ? <Text style={{ color: SF.muted, fontSize: 10 }}> / {macroGoals[i]}g</Text> : null}
                      </Text>
                      <Text style={styles.macroLabel}>{macro}</Text>
                      {macroGoals[i] > 0 && (
                        <View style={{ width: "80%", height: 3, backgroundColor: SF.border, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                          <View style={{ height: 3, borderRadius: 2, backgroundColor: macroColors[i], width: `${Math.min(100, (macroVals[i] / macroGoals[i]) * 100)}%` }} />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </StaggeredCard>
          )}

          {/* ── TRANSFORMATION PROGRESS RING (1C: staggered index 2) ── */}
          {latestBF && targetBF && (
            <StaggeredCard index={2}>
              <TouchableOpacity
                style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.gold }}
                activeOpacity={0.85}
                onPress={() => router.push("/(tabs)/scan" as any)}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="track-changes" size={18} color={SF.gold} />
                    <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Transformation Goal</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ color: SF.gold2, fontFamily: "DMSans_500Medium", fontSize: 11 }}>Body Scan</Text>
                    <MaterialIcons name="chevron-right" size={16} color={SF.gold2} />
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                  {/* Progress Ring */}
                  {(() => {
                    const currentBF = latestBF.bf;
                    const targetBFVal = targetBF.target_bf;
                    const startBF = currentBF; // First scan BF as starting point
                    const totalDrop = Math.max(startBF - targetBFVal, 0.1);
                    const dropped = Math.max(startBF - currentBF, 0);
                    const progressPct = totalDrop > 0 ? Math.min(1, dropped / totalDrop) : 0;
                    // If user hasn't made progress yet (first scan), show a small slice
                    const displayPct = progressPct === 0 ? 0.05 : progressPct;
                    const ringSize = 100;
                    const strokeWidth = 10;
                    const radius = (ringSize - strokeWidth) / 2;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference * (1 - displayPct);
                    return (
                      <View style={{ width: ringSize, height: ringSize, alignItems: "center", justifyContent: "center" }}>
                        <Svg width={ringSize} height={ringSize} style={{ transform: [{ rotate: "-90deg" }] }}>
                          <Circle cx={ringSize / 2} cy={ringSize / 2} r={radius} stroke="rgba(245,158,11,0.12)" strokeWidth={strokeWidth} fill="none" />
                          <Circle cx={ringSize / 2} cy={ringSize / 2} r={radius} stroke={SF.gold} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
                        </Svg>
                        <View style={{ position: "absolute", alignItems: "center" }}>
                          <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 22 }}>{Math.round(progressPct * 100)}%</Text>
                          <Text style={{ color: SF.muted, fontSize: 8, fontFamily: "DMSans_500Medium" }}>PROGRESS</Text>
                        </View>
                      </View>
                    );
                  })()}

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                      <Text style={{ color: SF.fg, fontFamily: "SpaceMono_700Bold", fontSize: 20 }}>{latestBF.bf}%</Text>
                      <MaterialIcons name="arrow-forward" size={14} color={SF.gold} />
                      <Text style={{ color: SF.gold, fontFamily: "SpaceMono_700Bold", fontSize: 20 }}>{targetBF.target_bf}%</Text>
                    </View>
                    <Text style={{ color: SF.muted, fontSize: 12, marginTop: 2 }}>
                      {Math.abs(latestBF.bf - targetBF.target_bf).toFixed(1)}% body fat to go
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <View style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: SF.gold2, fontSize: 10, fontFamily: "DMSans_600SemiBold" }}>Current: {latestBF.bf}%</Text>
                      </View>
                      <View style={{ backgroundColor: "rgba(34,211,238,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: SF.ice, fontSize: 10, fontFamily: "DMSans_600SemiBold" }}>Target: {targetBF.target_bf}%</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Target image thumbnail */}
                {targetBF?.imageUrl && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                    <Image source={{ uri: targetBF.imageUrl }} style={{ width: 50, height: 65, borderRadius: 10 }} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.gold2, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Your Goal Physique</Text>
                      <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>AI-generated transformation preview</Text>
                    </View>
                    <MaterialIcons name="zoom-in" size={18} color={SF.gold} />
                  </View>
                )}
              </TouchableOpacity>
            </StaggeredCard>
          )}

          {/* ── BF% Estimate Card (fallback when no target set) ── */}
          {latestBF && !targetBF && (
            <StaggeredCard index={2}>
              <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5 }}>BODY FAT ESTIMATE</Text>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/scan" as any)}>
                    <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Update →</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: SF.gold }}>
                    <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 22 }}>{latestBF.bf}%</Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>BODY FAT</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
                      {latestBF.bf <= 12 ? "Competition Lean" : latestBF.bf <= 15 ? "Athletic & Defined" : latestBF.bf <= 18 ? "Fit & Healthy" : latestBF.bf <= 22 ? "Average Build" : "Above Average"}
                    </Text>
                    {latestBF.confidence ? (
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Range: {latestBF.confidence}</Text>
                    ) : null}

                  </View>
                </View>

                <TouchableOpacity
                  style={{ marginTop: 14, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: SF.border2, flexDirection: "row", justifyContent: "center", gap: 6 }}
                  onPress={() => router.push("/(tabs)/scan" as any)}
                >
                  <MaterialIcons name="camera-alt" size={14} color={SF.gold} />
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Take New Body Scan to Update</Text>
                </TouchableOpacity>
              </View>
            </StaggeredCard>
          )}

          {/* ── Fullscreen Target Image Modal ── */}
          <Modal visible={showTargetImageModal} animationType="fade" transparent statusBarTranslucent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
              {targetBF?.imageUrl && (
                <Image source={{ uri: targetBF.imageUrl }} style={{ flex: 1, width: "100%" }} resizeMode="contain" />
              )}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: 60, paddingHorizontal: 24 }}>
                <View style={{ alignSelf: "center", backgroundColor: "rgba(10,5,0,0.85)", borderRadius: 20, paddingHorizontal: 24, paddingVertical: 16, marginBottom: 20, borderWidth: 2, borderColor: SF.gold }}>
                  <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 28, textAlign: "center" }}>{targetBF?.target_bf}% Body Fat</Text>
                  <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", marginTop: 4 }}>Your AI-generated target physique</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 18, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: SF.gold, flexDirection: "row", justifyContent: "center", gap: 6, opacity: savingToLibrary ? 0.7 : 1 }}
                    onPress={async () => {
                      if (!targetBF?.imageUrl || Platform.OS === "web") {
                        if (Platform.OS === "web") Alert.alert("Not Available", "Saving to photo library is only available on mobile devices.");
                        return;
                      }
                      setSavingToLibrary(true);
                      try {
                        const { status } = await MediaLibrary.requestPermissionsAsync();
                        if (status !== "granted") { Alert.alert("Permission Required", "Please allow access to your photo library to save images."); return; }
                        const ext = targetBF.imageUrl.includes(".png") ? "png" : "jpg";
                        const localUri = FileSystem.cacheDirectory + `target_body_save_${Date.now()}.${ext}`;
                        const download = await FileSystem.downloadAsync(targetBF.imageUrl, localUri);
                        await MediaLibrary.saveToLibraryAsync(download.uri);
                        Alert.alert("Saved!", "Your target body image has been saved to your photo library.");
                      } catch (e: any) { Alert.alert("Save Failed", e.message ?? "Could not save the image."); } finally { setSavingToLibrary(false); }
                    }}
                    disabled={savingToLibrary}
                  >
                    {savingToLibrary ? <ActivityIndicator color={SF.gold} size="small" /> : <MaterialIcons name="save-alt" size={18} color={SF.gold} />}
                    <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 13 }}>{savingToLibrary ? "Saving..." : "Save"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 18, paddingVertical: 14, alignItems: "center", borderWidth: 1.5, borderColor: SF.gold, flexDirection: "row", justifyContent: "center", gap: 6, opacity: sharing ? 0.7 : 1 }}
                    onPress={async () => {
                      if (!targetBF?.imageUrl) return;
                      setSharing(true);
                      try {
                        if (Platform.OS === "web") {
                          const available = await Sharing.isAvailableAsync();
                          if (available) { await Sharing.shareAsync(targetBF.imageUrl, { dialogTitle: "Share your target physique" }); }
                          else { Alert.alert("Sharing not available", "Sharing is not supported on this browser."); }
                        } else {
                          const ext = targetBF.imageUrl.includes(".png") ? "png" : "jpg";
                          const localUri = FileSystem.cacheDirectory + `target_body_${Date.now()}.${ext}`;
                          const download = await FileSystem.downloadAsync(targetBF.imageUrl, localUri);
                          await Sharing.shareAsync(download.uri, { mimeType: ext === "png" ? "image/png" : "image/jpeg", dialogTitle: "Share your AI target physique" });
                        }
                      } catch (e: any) { Alert.alert("Share Failed", e.message ?? "Could not share the image."); } finally { setSharing(false); }
                    }}
                    disabled={sharing}
                  >
                    {sharing ? <ActivityIndicator color={SF.gold} size="small" /> : <MaterialIcons name="share" size={18} color={SF.gold} />}
                    <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 13 }}>{sharing ? "Preparing..." : "Share"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: SF.gold, borderRadius: 18, paddingVertical: 14, alignItems: "center" }}
                    onPress={() => setShowTargetImageModal(false)}
                  >
                    <Text style={{ color: SF.bg, fontFamily: "BebasNeue_400Regular", fontSize: 15 }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ── Wearable Metrics Panel (always visible — shows connect CTA or full metrics) ── */}
          <StaggeredCard index={3}>
            <View style={styles.section}>
              <SectionTitle title="Wearable Metrics" />
              <WearableMetricsPanel />
            </View>
          </StaggeredCard>

          {/* ── Weekly Goal Progress Rings ── */}
          {goalsEnabled && goalProgress && (
            <StaggeredCard index={3}>
              <View style={styles.section}>
                <SectionTitle
                  title="Weekly Goals"
                  rightElement={
                    <TouchableOpacity onPress={() => router.push("/weekly-goals" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Edit Goals</Text>
                      <MaterialIcons name="chevron-right" size={14} color={SF.orange} />
                    </TouchableOpacity>
                  }
                />
                <View style={{
                  backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16,
                  borderWidth: 1.5, borderColor: SF.borderPrimary,
                }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    {/* Steps Ring */}
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <View style={{ width: 68, height: 68, alignItems: "center", justifyContent: "center" }}>
                        <Svg width={68} height={68}>
                          <Circle cx={34} cy={34} r={28} stroke="rgba(34,197,94,0.15)" strokeWidth={5} fill="none" />
                          <Circle cx={34} cy={34} r={28} stroke="#22C55E" strokeWidth={5} fill="none"
                            strokeDasharray={`${(goalProgress.steps.percentage / 100) * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                            strokeLinecap="round" transform="rotate(-90 34 34)" />
                        </Svg>
                        <View style={{ position: "absolute" }}>
                          <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 13, textAlign: "center" }}>{goalProgress.steps.percentage}%</Text>
                        </View>
                      </View>
                      <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 11, marginTop: 4 }}>Steps</Text>
                      <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>{goalProgress.steps.current.toLocaleString()}/{goalProgress.steps.target.toLocaleString()}</Text>
                    </View>
                    {/* Calories Ring */}
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <View style={{ width: 68, height: 68, alignItems: "center", justifyContent: "center" }}>
                        <Svg width={68} height={68}>
                          <Circle cx={34} cy={34} r={28} stroke="rgba(245,158,11,0.15)" strokeWidth={5} fill="none" />
                          <Circle cx={34} cy={34} r={28} stroke="#F59E0B" strokeWidth={5} fill="none"
                            strokeDasharray={`${(goalProgress.calories.percentage / 100) * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                            strokeLinecap="round" transform="rotate(-90 34 34)" />
                        </Svg>
                        <View style={{ position: "absolute" }}>
                          <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 13, textAlign: "center" }}>{goalProgress.calories.percentage}%</Text>
                        </View>
                      </View>
                      <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 11, marginTop: 4 }}>Calories</Text>
                      <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>{goalProgress.calories.current}/{goalProgress.calories.target} kcal</Text>
                    </View>
                    {/* Workouts Ring */}
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <View style={{ width: 68, height: 68, alignItems: "center", justifyContent: "center" }}>
                        <Svg width={68} height={68}>
                          <Circle cx={34} cy={34} r={28} stroke="rgba(239,68,68,0.15)" strokeWidth={5} fill="none" />
                          <Circle cx={34} cy={34} r={28} stroke="#EF4444" strokeWidth={5} fill="none"
                            strokeDasharray={`${(goalProgress.workouts.percentage / 100) * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                            strokeLinecap="round" transform="rotate(-90 34 34)" />
                        </Svg>
                        <View style={{ position: "absolute" }}>
                          <Text style={{ color: "#EF4444", fontFamily: "DMSans_700Bold", fontSize: 13, textAlign: "center" }}>{goalProgress.workouts.percentage}%</Text>
                        </View>
                      </View>
                      <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 11, marginTop: 4 }}>Workouts</Text>
                      <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>{goalProgress.workouts.current}/{goalProgress.workouts.target}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, gap: 4 }}>
                    <MaterialIcons name="schedule" size={12} color="#B45309" />
                    <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                      {goalProgress.daysRemaining} day{goalProgress.daysRemaining !== 1 ? "s" : ""} remaining this week
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push("/weekly-summary" as any)}
                    style={{
                      marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center",
                      gap: 6, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12,
                      paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
                    }}
                  >
                    <MaterialIcons name="bar-chart" size={16} color="#F59E0B" />
                    <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 13 }}>View Weekly Summary</Text>
                    <MaterialIcons name="chevron-right" size={16} color="#F59E0B" />
                  </TouchableOpacity>
                </View>

                {/* ── Streak Badge ── */}
                {streakData && (
                  <TouchableOpacity
                    onPress={() => router.push("/streak-details" as any)}
                    style={{
                      marginTop: 12, backgroundColor: streakData.currentStreak > 0 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
                      borderRadius: 16, padding: 14, borderWidth: 1,
                      borderColor: streakData.currentStreak > 0 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View style={{
                          width: 44, height: 44, borderRadius: 22,
                          backgroundColor: streakData.currentStreak > 0
                            ? (getCurrentMilestone(streakData.currentStreak)?.color ?? "#F59E0B") + "20"
                            : "rgba(255,255,255,0.05)",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Text style={{ fontSize: 22 }}>{getStreakEmoji(streakData.currentStreak)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{
                              color: streakData.currentStreak > 0 ? "#F59E0B" : "#B45309",
                              fontFamily: "DMSans_700Bold", fontSize: 15,
                            }}>
                              {getStreakLabel(streakData.currentStreak)}
                            </Text>
                            {getCurrentMilestone(streakData.currentStreak) && (
                              <View style={{
                                backgroundColor: (getCurrentMilestone(streakData.currentStreak)?.color ?? "#F59E0B") + "30",
                                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                              }}>
                                <Text style={{
                                  color: getCurrentMilestone(streakData.currentStreak)?.color ?? "#F59E0B",
                                  fontFamily: "DMSans_700Bold", fontSize: 9,
                                }}>
                                  {getCurrentMilestone(streakData.currentStreak)?.name}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 }}>
                            {getStreakMotivation(streakData.currentStreak, false)}
                          </Text>
                          {getNextMilestone(streakData.currentStreak) && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                              <View style={{ flex: 1, height: 3, backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 2 }}>
                                <View style={{
                                  height: 3, borderRadius: 2,
                                  backgroundColor: getNextMilestone(streakData.currentStreak)?.color ?? "#F59E0B",
                                  width: `${Math.min(100, Math.round(((streakData.currentStreak - (getCurrentMilestone(streakData.currentStreak)?.weeksRequired ?? 0)) / ((getNextMilestone(streakData.currentStreak)?.weeksRequired ?? 1) - (getCurrentMilestone(streakData.currentStreak)?.weeksRequired ?? 0))) * 100))}%`,
                                }} />
                              </View>
                              <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>
                                {getWeeksToNextMilestone(streakData.currentStreak)}w to {getNextMilestone(streakData.currentStreak)?.name}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <MaterialIcons name="chevron-right" size={18} color="#B45309" />
                    </View>
                    {streakData.longestStreak > 0 && streakData.longestStreak > streakData.currentStreak && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(245,158,11,0.08)" }}>
                        <MaterialIcons name="emoji-events" size={12} color="#B45309" />
                        <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                          Best streak: {streakData.longestStreak} week{streakData.longestStreak !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </StaggeredCard>
          )}

          {/* ── Progress Photos Tile ── */}
          <StaggeredCard index={7}>
            <View style={styles.section}>
              <SectionTitle title="Progress Photos" />
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/scan" as any)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 18,
                  borderWidth: 1.5, borderColor: "rgba(245,158,11,0.2)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 16,
                    backgroundColor: "rgba(245,158,11,0.08)",
                    alignItems: "center", justifyContent: "center",
                    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
                  }}>
                    <MaterialIcons name="photo-camera" size={28} color={SF.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Take Today's Photo</Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>
                      {stats.photos > 0
                        ? `${stats.photos} photo${stats.photos !== 1 ? "s" : ""} taken so far`
                        : "Start tracking your visual transformation"}
                    </Text>
                    {/* Photo streak */}
                    {progressPhotoStreak > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <MaterialIcons name="local-fire-department" size={14} color={SF.gold} />
                        <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12 }}>
                          {progressPhotoStreak} day streak
                        </Text>
                      </View>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={SF.gold} />
                </View>
              </TouchableOpacity>
            </View>
          </StaggeredCard>

          {/* ── AI Coach — Animated Card ── */}
          <StaggeredCard index={8}>
            <View style={styles.section}>
              <SectionTitle title="Your AI Coach" />
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  gatedNav("/ai-coach", "ai_coaching", "smart-toy", "advanced", "Get personalised AI coaching with form analysis and progress insights — Advanced plan only.");
                }}
                activeOpacity={0.85}
                style={{
                  borderRadius: 22, overflow: "hidden",
                  borderWidth: 1.5, borderColor: "rgba(34,211,238,0.3)",
                }}
              >
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: "rgba(34,211,238,0.06)", padding: 16,
                }}>
                  {/* Animated coach avatar with pulsing glow */}
                  <Animated.View
                    style={[{
                      width: 72, height: 72, borderRadius: 36,
                      borderWidth: 2, borderColor: "rgba(34,211,238,0.5)",
                      overflow: "hidden", marginRight: 14,
                      shadowColor: "#22D3EE", shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6, shadowRadius: 12, elevation: 8,
                    }, aiCoachPulseStyle]}
                  >
                    <Image
                      source={{ uri: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/ai-coach-icon-6WEg9FGyntLy9BEaTXyjYs.webp" }}
                      style={{ width: 72, height: 72, borderRadius: 36 }}
                      resizeMode="cover"
                    />
                  </Animated.View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: "#22D3EE", fontFamily: "DMSans_700Bold", fontSize: 17 }}>AI Coach</Text>
                      <View style={{ backgroundColor: "rgba(34,211,238,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: "#22D3EE", fontFamily: "DMSans_700Bold", fontSize: 9 }}>PREMIUM</Text>
                      </View>
                    </View>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 3, lineHeight: 17 }}>
                      Get personalised workout guidance, form tips, and nutrition advice from your AI trainer.
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                      <MaterialIcons name="auto-awesome" size={13} color="#22D3EE" />
                      <Text style={{ color: "#22D3EE", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>Tap to chat with your coach</Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#22D3EE" />
                </View>
              </TouchableOpacity>
            </View>
          </StaggeredCard>

          {/* ── Milestone Celebration Modal ── */}
          {showCelebration && celebrationMilestone && (
            <Modal transparent animationType="fade" visible={showCelebration}>
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 32 }}>
                <View style={{
                  backgroundColor: SF.surface2, borderRadius: 28, padding: 32, alignItems: "center",
                  borderWidth: 2, borderColor: celebrationMilestone.color + "40", width: "100%", maxWidth: 340,
                }}>
                  <Text style={{ fontSize: 56, marginBottom: 12 }}>{celebrationMilestone.emoji}</Text>
                  <Text style={{ color: celebrationMilestone.color, fontFamily: "BebasNeue_400Regular", fontSize: 28, textAlign: "center" }}>
                    {celebrationMilestone.name}
                  </Text>
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 14, marginTop: 4 }}>
                    {celebrationMilestone.badge} STREAK MILESTONE
                  </Text>
                  <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", marginTop: 12, lineHeight: 20 }}>
                    {celebrationMilestone.description}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 24 }}>
                    {["🎉", "⭐", "🏆", "⭐", "🎉"].map((e, i) => (
                      <Text key={i} style={{ fontSize: 20 }}>{e}</Text>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      try {
                        const cardData: MilestoneCardData = {
                          milestoneName: celebrationMilestone.name,
                          milestoneEmoji: celebrationMilestone.emoji,
                          milestoneBadge: celebrationMilestone.badge,
                          milestoneColor: celebrationMilestone.color,
                          milestoneDescription: celebrationMilestone.description,
                          currentStreak: streakData?.currentStreak ?? 0,
                          longestStreak: streakData?.longestStreak ?? 0,
                          totalWeeksCompleted: streakData?.totalWeeksCompleted ?? 0,
                        };
                        await shareMilestoneCard(cardData);
                      } catch (e) {
                        console.warn("[Dashboard] Milestone share failed:", e);
                      }
                    }}
                    style={{
                      marginTop: 24, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 24,
                      paddingVertical: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 6,
                      borderWidth: 1, borderColor: celebrationMilestone.color + "40",
                    }}
                  >
                    <MaterialIcons name="share" size={16} color={celebrationMilestone.color} />
                    <Text style={{ color: celebrationMilestone.color, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Share Achievement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      setShowCelebration(false);
                      await markMilestoneCelebrated(celebrationMilestone.id);
                      await clearPendingCelebrations();
                      setCelebrationMilestone(null);
                      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    style={{
                      marginTop: 10, backgroundColor: celebrationMilestone.color, paddingHorizontal: 32,
                      paddingVertical: 14, borderRadius: 16,
                    }}
                  >
                    <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Celebrate!</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          {/* ── Quick Actions — Grouped Categories ── */}
          <StaggeredCard index={3}>
            <View style={styles.section}>
              <SectionTitle title="Quick Actions" />
              <View style={{ gap: 8 }}>
                {QUICK_ACTION_GROUPS.map((group) => {
                  const isExpanded = expandedGroup === group.title;
                  const hasPremium = group.actions.some(a => a.gated);
                  const premiumCount = group.actions.filter(a => a.gated).length;
                  return (
                    <View key={group.title} style={styles.qaGroupContainer}>
                      {/* Group Header — tappable */}
                      <TouchableOpacity
                        style={[styles.qaGroupHeader, isExpanded && styles.qaGroupHeaderActive]}
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setExpandedGroup(isExpanded ? null : group.title);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.qaGroupHeaderLeft}>
                          <View style={[styles.qaGroupIconBox, isExpanded && styles.qaGroupIconBoxActive]}>
                            <MaterialIcons name={group.icon} size={20} color={isExpanded ? SF.bg : SF.gold} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={[styles.qaGroupTitle, isExpanded && { color: SF.gold }]}>{group.title}</Text>
                              {hasPremium && (
                                <View style={styles.qaGroupPremiumBadge}>
                                  <MaterialIcons name="workspace-premium" size={10} color="#F59E0B" />
                                  <Text style={styles.qaGroupPremiumText}>{premiumCount} Premium</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.qaGroupCount}>{group.actions.length} actions</Text>
                          </View>
                        </View>
                        <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={22} color={isExpanded ? SF.gold : SF.muted} />
                      </TouchableOpacity>

                      {/* Expanded Actions Grid */}
                      {isExpanded && (
                        <View style={styles.qaGroupBody}>
                          {(() => {
                            const rows: QuickAction[][] = [];
                            for (let i = 0; i < group.actions.length; i += 3) rows.push(group.actions.slice(i, i + 3));
                            return rows.map((row, ri) => (
                              <View key={ri} style={styles.qaRow}>
                                {row.map((action) => (
                                  <View key={action.label} style={{ flex: 1, position: "relative" }}>
                                    <QuickActionCard
                                      icon={action.icon}
                                      label={action.label}
                                      onPress={() => {
                                        if (action.gated && action.feature && action.tier) {
                                          gatedNav(action.route, action.feature, action.icon, action.tier, action.desc);
                                        } else {
                                          router.push(action.route as any);
                                        }
                                      }}
                                    />
                                    {action.gated && action.tier && (
                                      <View style={[
                                        styles.qaActionBadge,
                                        action.tier === "advanced" ? styles.qaActionBadgeAdvanced : styles.qaActionBadgeBasic,
                                      ]}>
                                        <Text style={styles.qaActionBadgeText}>
                                          {action.tier === "advanced" ? "ADV" : "BASIC"}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                ))}
                                {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                                  <View key={`empty-${i}`} style={{ flex: 1 }} />
                                ))}
                              </View>
                            ));
                          })()}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </StaggeredCard>

          {/* Today's Workout moved to top */}

          {/* ── Muscle Balance Heatmap ── */}
          {muscleReport && muscleReport.totalWorkouts > 0 && (
            <StaggeredCard index={5}>
              <View style={styles.section}>
                <SectionTitle
                  title="Muscle Balance"
                  rightElement={
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {([7, 14, 30] as const).map((w) => (
                        <TouchableOpacity
                          key={w}
                          onPress={() => setBalanceWindow(w)}
                          style={{
                            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                            backgroundColor: balanceWindow === w ? "rgba(245,158,11,0.2)" : "transparent",
                          }}
                        >
                          <Text style={{
                            color: balanceWindow === w ? "#F59E0B" : "#B45309",
                            fontFamily: "DMSans_600SemiBold", fontSize: 10,
                          }}>{w}d</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  }
                />
                <View style={{
                  backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16,
                  borderWidth: 1.5, borderColor: SF.borderPrimary,
                }}>
                  {/* Heatmap Body Diagram */}
                  <BodyHeatmap
                    gender={userGender}
                    mode="balance"
                    balanceEntries={muscleReport.entries}
                    width={160}
                    height={180}
                    showLabels={false}
                    showLegend={true}
                  />

                  {/* Summary Stats */}
                  <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(245,158,11,0.08)" }}>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: "#EF4444", fontFamily: "DMSans_700Bold", fontSize: 18 }}>{muscleReport.overExercised.length}</Text>
                      <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>Over</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 18 }}>{muscleReport.optimal.length}</Text>
                      <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>Optimal</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 18 }}>{muscleReport.underExercised.length}</Text>
                      <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>Under</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 18 }}>{muscleReport.totalWorkouts}</Text>
                      <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>Workouts</Text>
                    </View>
                  </View>

                  {/* Muscle Detail Bars */}
                  <View style={{ marginTop: 12, gap: 6 }}>
                    {muscleReport.entries
                      .filter(e => e.status !== "none")
                      .sort((a, b) => b.percentage - a.percentage)
                      .slice(0, 8)
                      .map((entry) => {
                        const barColor = entry.status === "over" ? "#EF4444" : entry.status === "optimal" ? "#22C55E" : "#3B82F6";
                        const barWidth = Math.min(entry.percentage, 200);
                        return (
                          <View key={entry.muscle} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ color: "#B45309", fontFamily: "DMSans_500Medium", fontSize: 9, width: 65, textAlign: "right" }}>
                              {entry.muscle.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </Text>
                            <View style={{ flex: 1, height: 6, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 3 }}>
                              <View style={{ height: 6, borderRadius: 3, backgroundColor: barColor, width: `${Math.min(barWidth / 2, 100)}%` as any }} />
                            </View>
                            <Text style={{ color: barColor, fontFamily: "DMSans_600SemiBold", fontSize: 9, width: 32, textAlign: "right" }}>
                              {entry.percentage}%
                            </Text>
                          </View>
                        );
                      })}
                  </View>
                </View>
              </View>
            </StaggeredCard>
          )}

          {/* Today's Nutrition moved to top */}

          {/* ── Suggested Exercises ── */}
          {muscleReport && (suggestions.length > 0 || planChanges.length > 0) && (
            <StaggeredCard index={6}>
              <View style={styles.section}>
                <SectionTitle title="Suggested Changes" />
                <View style={{
                  backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16,
                  borderWidth: 1.5, borderColor: SF.borderPrimary,
                }}>
                  {/* Explanation */}
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                    <MaterialIcons name="auto-awesome" size={14} color="#FBBF24" style={{ marginTop: 2 }} />
                    <Text style={{ color: "#FBBF24", fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 16, flex: 1 }}>
                      Based on your {balanceWindow}-day workout history, here are suggestions to balance your training.
                    </Text>
                  </View>

                  {/* Suggestions */}
                  {suggestions.slice(0, 4).map((s, i) => (
                    <View key={i} style={{
                      backgroundColor: s.priority === "high" ? "rgba(59,130,246,0.08)" : "rgba(239,68,68,0.06)",
                      borderRadius: 12, padding: 12, marginBottom: 8,
                      borderWidth: 1, borderColor: s.priority === "high" ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.12)",
                    }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <MaterialIcons
                          name={s.priority === "high" ? "fitness-center" : "bedtime"}
                          size={14}
                          color={s.priority === "high" ? "#3B82F6" : "#EF4444"}
                        />
                        <Text style={{
                          color: s.priority === "high" ? "#3B82F6" : "#EF4444",
                          fontFamily: "DMSans_700Bold", fontSize: 12,
                        }}>{s.exerciseName}</Text>
                        <View style={{
                          backgroundColor: s.priority === "high" ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.15)",
                          paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: "auto",
                        }}>
                          <Text style={{
                            color: s.priority === "high" ? "#3B82F6" : "#EF4444",
                            fontFamily: "DMSans_600SemiBold", fontSize: 8,
                          }}>{s.priority.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10, lineHeight: 14 }}>
                        {s.reason}
                      </Text>
                    </View>
                  ))}

                  {/* Plan Changes */}
                  {planChanges.length > 0 && (
                    <>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 8 }}>
                        <MaterialIcons name="swap-horiz" size={14} color="#F59E0B" />
                        <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 12 }}>
                          Suggested Plan Changes
                        </Text>
                      </View>
                      {planChanges.slice(0, 3).map((change, i) => (
                        <View key={i} style={{
                          backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, padding: 10, marginBottom: 6,
                          borderWidth: 1, borderColor: "rgba(245,158,11,0.12)",
                        }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <MaterialIcons
                              name={change.type === "replace" ? "swap-horiz" : change.type === "add" ? "add-circle" : "remove-circle"}
                              size={12}
                              color="#FBBF24"
                            />
                            <Text style={{ color: "#FDE68A", fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>
                              {change.dayName}
                            </Text>
                          </View>
                          <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10, lineHeight: 14, marginTop: 2 }}>
                            {change.reason}
                          </Text>
                        </View>
                      ))}

                      {/* Apply Changes Button */}
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 12, alignItems: "center",
                          marginTop: 8, opacity: applyingChanges ? 0.6 : 1,
                        }}
                        disabled={applyingChanges}
                        onPress={() => {
                          Alert.alert(
                            "Apply Suggested Changes?",
                            "This will update your current workout plan with the suggested exercise swaps and additions. You can always regenerate your plan if needed.",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Apply Changes",
                                onPress: async () => {
                                  if (!workoutPlan?.schedule) return;
                                  setApplyingChanges(true);
                                  try {
                                    const newSchedule = applyPlanChanges(workoutPlan.schedule, planChanges);
                                    const updatedPlan = { ...workoutPlan, schedule: newSchedule };
                                    // Save locally for guests
                                    await AsyncStorage.setItem("@guest_workout_plan", JSON.stringify(updatedPlan));
                                    if (Platform.OS !== "web") {
                                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    }
                                    Alert.alert(
                                      "Plan Updated!",
                                      "Your workout plan has been updated with the suggested changes. Check the Plans tab to see the updates.",
                                      [{ text: "OK" }]
                                    );
                                    setPlanChanges([]);
                                  } catch (e) {
                                    Alert.alert("Error", "Failed to apply changes. Please try again.");
                                  } finally {
                                    setApplyingChanges(false);
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {applyingChanges ? (
                            <ActivityIndicator size="small" color={SF.bg} />
                          ) : (
                            <MaterialIcons name="check-circle" size={16} color={SF.bg} />
                          )}
                          <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                            {applyingChanges ? "Applying..." : "Apply to My Plan"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </StaggeredCard>
          )}


          {/* ── Muscle Balance Trend Chart ── */}
          {muscleReport && muscleReport.totalWorkouts >= 2 && (
            <StaggeredCard index={5}>
              <View style={styles.section}>
                <TrendChart
                  data={trendData}
                  title="Muscle Balance Trend"
                  height={200}
                  showMuscleDetail={true}
                />
              </View>
            </StaggeredCard>
          )}

          {/* ── Personal Records ── */}
          {prSummary && prSummary.totalExercisesTracked > 0 && (
            <StaggeredCard index={6}>
              <View style={styles.section}>
                <SectionTitle title="Personal Records" />
                <View style={{ gap: 8 }}>
                  {/* Recent PRs */}
                  {prSummary.recentPRs.length > 0 && (
                    <View style={{ backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <MaterialIcons name="emoji-events" size={14} color="#22C55E" />
                        <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 12 }}>Recent PRs</Text>
                      </View>
                      {prSummary.recentPRs.map((pr, i) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                          <Text style={{ color: SF.fg, fontFamily: "DMSans_500Medium", fontSize: 11 }}>{pr.exercise}</Text>
                          <Text style={{ color: "#22C55E", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>
                            {pr.entry.weight}kg × {pr.entry.reps} ({pr.type})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Top Lifts */}
                  {prSummary.topLifts.length > 0 && (
                    <View style={{ backgroundColor: "rgba(245,158,11,0.04)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <MaterialIcons name="fitness-center" size={14} color={SF.gold} />
                        <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Top Lifts</Text>
                      </View>
                      {prSummary.topLifts.slice(0, 5).map((lift, i) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                          <Text style={{ color: SF.fg, fontFamily: "DMSans_500Medium", fontSize: 11 }}>{lift.exercise}</Text>
                          <Text style={{ color: SF.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{lift.weight}kg</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Stats */}
                  <View style={{ flexDirection: "row", justifyContent: "space-around", paddingTop: 8 }}>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 18 }}>{prSummary.totalExercisesTracked}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Exercises</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 18 }}>{prSummary.totalPREntries}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Entries</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 18 }}>{prSummary.recentPRs.length}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>New PRs</Text>
                    </View>
                  </View>
                </View>
              </View>
            </StaggeredCard>
          )}

          {/* ── No plans CTA ── */}
          {!workoutPlan && !mealPlan && (
            <StaggeredCard index={4}>
              <View style={styles.section}>
                <ImageBackground source={{ uri: AT_DASHBOARD_BG }} style={{ borderRadius: 24, overflow: "hidden" }} resizeMode="cover">
                  <View style={styles.ctaOverlay}>
                    <MaterialIcons name="rocket-launch" size={48} color={SF.emerald} style={{ marginBottom: 12 }} />
                    <Text style={styles.ctaTitle}>Ready to Transform?</Text>
                    <Text style={styles.ctaSub}>Start with an AI Body Scan to analyse your physique, then get a personalised workout and meal plan.</Text>
                    <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push("/(tabs)/scan" as any)}>
                      <Text style={styles.ctaBtnText}>Start AI Body Scan</Text>
                      <MaterialIcons name="arrow-forward" size={16} color={SF.bg} />
                    </TouchableOpacity>
                  </View>
                </ImageBackground>
              </View>
            </StaggeredCard>
          )}

          {/* ── Tips & Tricks (3A: MaterialIcons for tip icons) ── */}
          <StaggeredCard index={6}>
            <View style={styles.section}>
              <SectionTitle
                title="Tips & Tricks"
                rightElement={
                  <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4 }} onPress={() => setTipIndex(prev => (prev + 1) % TIPS_AND_TRICKS.length)}>
                    <MaterialIcons name="refresh" size={14} color={SF.muted} />
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>Next tip</Text>
                  </TouchableOpacity>
                }
              />
              <View style={{ backgroundColor: SF.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: SF.border2, flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border, flexShrink: 0 }}>
                  <MaterialIcons name={TIPS_AND_TRICKS[tipIndex].icon} size={24} color={SF.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22 }}>{TIPS_AND_TRICKS[tipIndex].tip}</Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 8 }}>Tip {tipIndex + 1} of {TIPS_AND_TRICKS.length} · Updates every 5 min</Text>
                </View>
              </View>
            </View>
          </StaggeredCard>

          {/* ── Premium Feature Promotions ── */}
          <StaggeredCard index={7}>
            <View style={{ gap: 10 }}>
              <PremiumFeatureBanner
                feature="body_scan"
                title="AI Body Transformation Tracking"
                description="Track your physique transformation with AI-powered body scans, before/after comparisons, and personalised progress timelines."
                icon="body"
                accentColor="#38BDF8"
                requiredTier="basic"
              />
              <PremiumFeatureBanner
                feature="ai_coaching"
                title="Personalised AI Coach"
                description="Get real-time guidance from your AI fitness coach — exercise form tips, workout adjustments, and motivation tailored to your goals."
                icon="smart-toy"
                accentColor="#F59E0B"
                requiredTier="advanced"
              />
              <PremiumFeatureTeaser
                feature="progress_photos"
                text="Unlock AI Photo Logging to track meals and body progress with your camera"
                requiredTier="basic"
              />
              <PremiumFeatureTeaser
                feature="wearable_sync"
                text="Sync your wearable device for real-time health data integration"
                requiredTier="basic"
              />
            </View>
          </StaggeredCard>

          {/* ── Trial status banner ── */}
          {isTrialActive && (
            <View style={styles.trialBanner}>
              <MaterialIcons name="hourglass-top" size={20} color={SF.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.trialBannerTitle}>Advanced Trial — {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} left</Text>
                <Text style={styles.trialBannerSub}>Enjoying all Advanced features. Subscribe to keep access after the trial.</Text>
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
                <Text style={styles.trialBannerSub}>Subscribe to restore Advanced features.</Text>
              </View>
              <TouchableOpacity style={[styles.trialBannerBtn, { backgroundColor: "#ef4444" }]} onPress={() => router.push("/subscription" as any)}>
                <Text style={styles.trialBannerBtnText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Guest banner ── */}
          {isGuest && (
            <View style={styles.guestBanner}>
              <MaterialIcons name="info-outline" size={20} color={SF.emerald2} />
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  welcomeOverlay: { flex: 1, backgroundColor: "rgba(10,5,0,0.72)", alignItems: "center", justifyContent: "center", padding: 32 },
  welcomeLogo: { width: 80, height: 80, borderRadius: 20, marginBottom: 24 },
  welcomeTitle: { color: SF.fg, fontSize: 42, fontFamily: "BebasNeue_400Regular", textAlign: "center", letterSpacing: 4 },
  welcomeSub: { color: SF.emerald3, fontSize: 15, textAlign: "center", marginTop: 12, lineHeight: 22, fontFamily: "DMSans_400Regular" },
  welcomeBtn: { marginTop: 40, backgroundColor: SF.emerald, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 40, flexDirection: "row", alignItems: "center" },
  welcomeBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 },
  heroOverlay: { flex: 1, backgroundColor: "rgba(10,5,0,0.55)", padding: 20, justifyContent: "space-between" },
  heroTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 44 },
  heroBadge: { backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: SF.border2 },
  heroBadgeText: { color: SF.emerald, fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5 },
  heroProfileBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: SF.border },
  heroProfileBtnText: { color: SF.emerald2, fontFamily: "DMSans_500Medium", fontSize: 13 },
  heroGreeting: { color: SF.emerald3, fontFamily: "DMSans_500Medium", fontSize: 14 },
  heroName: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 34, letterSpacing: 2, marginTop: 2 },
  heroPill: { backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: SF.border2 },
  heroPillText: { color: SF.emerald2, fontFamily: "DMSans_500Medium", fontSize: 12 },
  // 4B: Primary card style (stats, calorie)
  statsCard: { backgroundColor: SF.surfacePrimary, marginHorizontal: 16, marginTop: 4, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: SF.border, flexDirection: "row", gap: 8 },
  statsDivider: { width: 1, backgroundColor: SF.border },
  ringItem: { alignItems: "center", flex: 1 },
  ringContainer: { width: 64, height: 64, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  ringValue: { color: SF.fg, fontFamily: "SpaceMono_700Bold", fontSize: 14 },
  ringLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 1 },
  // 4B: Primary card for calorie
  calorieCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: SF.border },
  calorieHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardEyebrow: { color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 },
  calorieValue: { color: SF.fg, fontFamily: "SpaceMono_700Bold", fontSize: 22 },
  calorieGoal: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14 },
  // 4C: Taller progress bar
  progressTrack: { height: 10, backgroundColor: SF.border, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: 10, borderRadius: 5 },
  macroValue: { fontFamily: "DMSans_700Bold", fontSize: 13 },
  macroLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },
  // 2B: Increased section spacing (24→32)
  section: { paddingHorizontal: 16, marginTop: 32 },
  sectionTitle: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 22, letterSpacing: 2 },
  qaRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  // Secondary card style (quick actions, tips)
  qaCard: { flex: 1, backgroundColor: SF.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: SF.border },
  qaIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border },
  qaLabel: { color: SF.emerald3, fontFamily: "DMSans_500Medium", fontSize: 11, textAlign: "center" },
  // Grouped Quick Actions styles
  qaGroupContainer: { backgroundColor: SF.surface, borderRadius: 16, borderWidth: 1, borderColor: SF.border, overflow: "hidden" as const },
  qaGroupHeader: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 14, paddingVertical: 12 },
  qaGroupHeaderActive: { backgroundColor: "rgba(245,158,11,0.06)", borderBottomWidth: 1, borderBottomColor: SF.border },
  qaGroupHeaderLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, flex: 1 },
  qaGroupIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1, borderColor: SF.border },
  qaGroupIconBoxActive: { backgroundColor: SF.gold, borderColor: SF.gold },
  qaGroupTitle: { color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  qaGroupCount: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 1 },
  qaGroupPremiumBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 3, backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  qaGroupPremiumText: { color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 9, letterSpacing: 0.5 },
  qaGroupBody: { paddingHorizontal: 10, paddingVertical: 10, gap: 0 },
  qaActionBadge: { position: "absolute" as const, top: 4, right: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, zIndex: 1 },
  qaActionBadgeBasic: { backgroundColor: "rgba(34,197,94,0.15)", borderWidth: 1, borderColor: "rgba(34,197,94,0.3)" },
  qaActionBadgeAdvanced: { backgroundColor: "rgba(168,85,247,0.15)", borderWidth: 1, borderColor: "rgba(168,85,247,0.3)" },
  qaActionBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 7, letterSpacing: 0.8, color: "#A855F7" },
  planCardOverlay: { backgroundColor: "rgba(10,5,0,0.78)", padding: 20 },
  planCardTitle: { color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 20, marginTop: 4 },
  planCardSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 4 },
  planCardBtn: { backgroundColor: SF.emerald, borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 16, flexDirection: "row", justifyContent: "center", gap: 6 },
  planCardBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 14 },
  macroPill: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: SF.border },
  macroPillValue: { color: SF.emerald, fontFamily: "DMSans_700Bold", fontSize: 13 },
  macroPillLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },
  ctaOverlay: { backgroundColor: "rgba(10,5,0,0.82)", padding: 28, alignItems: "center" },
  ctaTitle: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 28, textAlign: "center", marginBottom: 8, letterSpacing: 2 },
  ctaSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  ctaBtn: { backgroundColor: SF.emerald, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8 },
  ctaBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 },
  guestBanner: { marginHorizontal: 16, marginTop: 20, marginBottom: 100, backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border, flexDirection: "row", alignItems: "center", gap: 12 },
  guestBannerTitle: { color: SF.emerald2, fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  guestBannerSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  guestBannerBtn: { backgroundColor: SF.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: SF.border2 },
  guestBannerBtnText: { color: SF.emerald, fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  trialBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 100, backgroundColor: "#1c1000", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#F59E0B40" },
  trialBannerExpired: { backgroundColor: "#1a0000", borderColor: "#ef444440" },
  trialBannerTitle: { color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13, marginBottom: 2 },
  trialBannerSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 16 },
  trialBannerBtn: { backgroundColor: "#F59E0B", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  trialBannerBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 12 },
});
