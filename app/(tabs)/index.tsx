import React, { useEffect, useState, useCallback } from "react";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  withTiming, withDelay, withSpring, withSequence, Easing, interpolate,
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

// Aurora Titan colour tokens
const SF = {
  bg: "#0A0500", surface: "#1C0E02", surface2: "#1F0D00",
  surfacePrimary: "#1C0E02", // primary card surface (slightly lighter)
  border: "rgba(245,158,11,0.12)", border2: "rgba(245,158,11,0.20)",
  borderPrimary: "rgba(245,158,11,0.25)", // primary card border (higher opacity)
  fg: "#FFF7ED", muted: "#B45309", gold: "#F59E0B", orange: "#EA580C",
  gold2: "#FBBF24", gold3: "#FDE68A", red: "#DC2626",
  emerald: "#F59E0B", emerald2: "#FBBF24", emerald3: "#FDE68A",
  teal: "#EA580C", teal2: "#F97316",
  // Macro colours (4C)
  macroProtein: "#60A5FA", // blue-tinted
  macroCarbs: "#FBBF24",   // warm amber
  macroFat: "#FB923C",     // rose-orange
};

// Quick Action definitions with MaterialIcons (3A)
const QUICK_ACTIONS_ALL = [
  { icon: "camera-alt" as const, label: "AI Body Scan", route: "/(tabs)/scan", gated: false },
  { icon: "fitness-center" as const, label: "Start Workout", route: "/(tabs)/plans", gated: false },
  { icon: "restaurant" as const, label: "Log Meal", route: "/(tabs)/meals", gated: false },
  { icon: "photo-camera" as const, label: "Snap a Meal", route: "/(tabs)/meals", gated: false },
  { icon: "trending-up" as const, label: "Progress", route: "/progress-photos", gated: true, feature: "progress_photos", tier: "basic" as const, desc: "Track your body transformation with progress photos — Basic plan and above." },
  { icon: "smart-toy" as const, label: "AI Coach", route: "/ai-coach", gated: false },
  { icon: "check-circle" as const, label: "Daily Check-In", route: "/daily-checkin", gated: false },
  // Below the fold (hidden by default)
  { icon: "kitchen" as const, label: "My Pantry", route: "/pantry", gated: false },
  { icon: "center-focus-strong" as const, label: "Form Check", route: "/form-checker", gated: false },
  { icon: "location-on" as const, label: "Find Gym", route: "/gym-finder", gated: false },
  { icon: "watch" as const, label: "Wearables", route: "/wearable-sync", gated: true, feature: "wearable_sync", tier: "basic" as const, desc: "Sync your fitness wearable with PeakPulse — Basic plan and above." },
  { icon: "group" as const, label: "Community", route: "/social-feed", gated: true, feature: "social_feed", tier: "advanced" as const, desc: "Join the PeakPulse community — Advanced plan only." },
  { icon: "bolt" as const, label: "7-Day Challenge", route: "/challenge-onboarding", gated: true, feature: "challenges", tier: "advanced" as const, desc: "Unlock 7-day fitness challenges — Advanced plan only." },
  { icon: "card-giftcard" as const, label: "Refer a Friend", route: "/referral", gated: false },
  { icon: "workspace-premium" as const, label: "Upgrade", route: "/subscription", gated: false },
  { icon: "calendar-today" as const, label: "Workout History", route: "/workout-calendar", gated: false },
  { icon: "notifications-active" as const, label: "AI Reminders", route: "/notification-settings", gated: false },
  { icon: "receipt-long" as const, label: "Scan Receipt", route: "/scan-receipt", gated: false },
  { icon: "photo-library" as const, label: "Meal Timeline", route: "/meal-timeline", gated: false },
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

// Stat ring icon mapping (3A: emoji → MaterialIcons)
const STAT_RING_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Workouts: "fitness-center",
  Streak: "local-fire-department",
  Meals: "restaurant",
  Photos: "photo-camera",
};

// ── StatRing with pulse animation (6B) ──────────────────────────────────────
function StatRing({ value, label, progress = 0 }: { value: string; label: string; progress?: number }) {
  const animProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const prevValueRef = React.useRef(value);
  const R = 26;
  const circumference = 2 * Math.PI * R;
  const iconName = STAT_RING_ICONS[label] ?? "help-outline";

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
          <AnimatedCircle cx={32} cy={32} r={R} stroke={SF.emerald} strokeWidth={3.5} fill="none"
            strokeDasharray={circumference} animatedProps={animatedProps} strokeLinecap="round" rotation="-90" origin="32,32" />
        </Svg>
        <MaterialIcons name={iconName} size={20} color={SF.gold} />
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
  const [showAllActions, setShowAllActions] = useState(false); // 2A: Quick Actions collapse
  const canUse = isAuthenticated || isGuest;
  const wearableData = useWearable();
  const [tipIndex, setTipIndex] = React.useState(0);

  // 1A: Parallax scroll value
  const scrollY = useSharedValue(0);

  // Rotate tips every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS_AND_TRICKS.length);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const displayName = user?.name?.split(" ")[0] ?? guestProfile?.name?.split(" ")[0] ?? "Athlete";

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
          {/* ── Hero Header with Parallax (1A) ── */}
          <View style={{ width: "100%", height: 300, overflow: "hidden" }}>
            <AnimatedView style={[{ position: "absolute", top: 0, left: 0, right: 0, height: 450 }, heroImageStyle]}>
              <ImageBackground source={{ uri: AT_DASHBOARD_BG }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </AnimatedView>
            <AnimatedView style={[styles.heroOverlay, heroContentStyle]}>
              <View style={styles.heroTopBar}>
                <View style={styles.heroBadge}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialIcons name="bolt" size={12} color={SF.emerald} />
                    <Text style={styles.heroBadgeText}>PEAKPULSE AI</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TouchableOpacity style={[styles.heroProfileBtn, { paddingHorizontal: 10 }]} onPress={() => router.push("/user-guide" as any)}>
                    <MaterialIcons name="help-outline" size={16} color={SF.emerald2} />
                    <Text style={styles.heroProfileBtnText}>Guide</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.heroProfileBtn} onPress={() => router.push("/(tabs)/profile" as any)}>
                    <MaterialIcons name="person" size={16} color={SF.emerald2} />
                    <Text style={styles.heroProfileBtnText}>Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ paddingBottom: 24 }}>
                <Text style={styles.heroGreeting}>Good morning,</Text>
                <Text style={styles.heroName}>{displayName}</Text>
                {(activeProfile as any)?.goal && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <View style={styles.heroPill}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MaterialIcons name="flag" size={12} color={SF.emerald2} />
                        <Text style={styles.heroPillText}>
                          {(activeProfile as any).goal === "build_muscle" ? "Build Muscle" : (activeProfile as any).goal === "lose_fat" ? "Lose Fat" : (activeProfile as any).goal}
                        </Text>
                      </View>
                    </View>
                    {(activeProfile as any)?.workoutStyle && (
                      <View style={styles.heroPill}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MaterialIcons name="fitness-center" size={12} color={SF.emerald2} />
                          <Text style={styles.heroPillText}>{(activeProfile as any).workoutStyle}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </AnimatedView>
          </View>

          {/* ── Stats Ring Row (1C: staggered index 0, 4B: primary card) ── */}
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

          {/* ── BF% Estimate Card (1C: staggered index 2) ── */}
          {latestBF && (
            <StaggeredCard index={2}>
              <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5 }}>BODY FAT ESTIMATE</Text>
                  <TouchableOpacity onPress={() => router.push("/(tabs)/scan" as any)}>
                    <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Update →</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: SF.gold }}>
                    <Text style={{ color: SF.gold, fontFamily: "Outfit_800ExtraBold", fontSize: 22 }}>{latestBF.bf}%</Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>BODY FAT</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16 }}>
                      {latestBF.bf <= 12 ? "Competition Lean" : latestBF.bf <= 15 ? "Athletic & Defined" : latestBF.bf <= 18 ? "Fit & Healthy" : latestBF.bf <= 22 ? "Average Build" : "Above Average"}
                    </Text>
                    {latestBF.confidence ? (
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Range: {latestBF.confidence}</Text>
                    ) : null}
                    {targetBF && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <MaterialIcons name="flag" size={13} color={SF.gold2} />
                        <Text style={{ color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Target: {targetBF.target_bf}% BF</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12 }}>({Math.abs(latestBF.bf - targetBF.target_bf).toFixed(1)}% to go)</Text>
                      </View>
                    )}
                  </View>
                </View>
                {/* Target Body Image Preview */}
                {targetBF?.imageUrl && (
                  <TouchableOpacity
                    style={{ marginTop: 14, borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: SF.gold }}
                    activeOpacity={0.85}
                    onPress={() => setShowTargetImageModal(true)}
                  >
                    <Image source={{ uri: targetBF.imageUrl }} style={{ width: "100%", height: 180 }} resizeMode="cover" />
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(10,5,0,0.80)", paddingVertical: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <MaterialIcons name="flag" size={14} color={SF.gold} />
                        <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 13 }}>Your Goal: {targetBF.target_bf}% BF</Text>
                      </View>
                      <Text style={{ color: SF.gold2, fontFamily: "DMSans_500Medium", fontSize: 11 }}>Tap to expand</Text>
                    </View>
                  </TouchableOpacity>
                )}
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
                  <Text style={{ color: SF.gold, fontFamily: "Outfit_800ExtraBold", fontSize: 28, textAlign: "center" }}>{targetBF?.target_bf}% Body Fat</Text>
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
                    <Text style={{ color: SF.gold, fontFamily: "Outfit_800ExtraBold", fontSize: 13 }}>{savingToLibrary ? "Saving..." : "Save"}</Text>
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
                    <Text style={{ color: SF.gold, fontFamily: "Outfit_800ExtraBold", fontSize: 13 }}>{sharing ? "Preparing..." : "Share"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: SF.gold, borderRadius: 18, paddingVertical: 14, alignItems: "center" }}
                    onPress={() => setShowTargetImageModal(false)}
                  >
                    <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ── Wearable Stats Widget ── */}
          {wearableData.isConnected && (
            <StaggeredCard index={3}>
              <View style={styles.section}>
                <SectionTitle title="Wearable Stats" />
                <TouchableOpacity
                  onPress={() => router.push("/wearable-sync" as any)}
                  style={{ backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: SF.borderPrimary }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <MaterialIcons name="watch" size={16} color={SF.emerald} />
                    <Text style={{ color: SF.emerald2, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>{wearableData.stats.connectedDevice}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>Tap for details</Text>
                    <MaterialIcons name="chevron-right" size={14} color={SF.muted} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    <View style={{ alignItems: "center" }}>
                      <MaterialIcons name="directions-walk" size={20} color="#22C55E" />
                      <Text style={{ color: "#22C55E", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 2 }}>{wearableData.stats.steps.toLocaleString()}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Steps</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <MaterialIcons name="favorite" size={20} color="#EF4444" />
                      <Text style={{ color: "#EF4444", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 2 }}>{wearableData.stats.heartRate}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>BPM</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <MaterialIcons name="local-fire-department" size={20} color="#F59E0B" />
                      <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 2 }}>{wearableData.stats.totalCaloriesBurnt}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Burnt</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <MaterialIcons name="bedtime" size={20} color="#8B5CF6" />
                      <Text style={{ color: "#8B5CF6", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 2 }}>{wearableData.stats.sleepHours}h</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Sleep</Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <MaterialIcons name="straighten" size={20} color="#3B82F6" />
                      <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 2 }}>{wearableData.stats.distance}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>km</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </StaggeredCard>
          )}

          {/* ── Quick Actions (2A: collapsible, 3A: MaterialIcons) ── */}
          <StaggeredCard index={3}>
            <View style={styles.section}>
              <SectionTitle
                title="Quick Actions"
                rightElement={
                  QUICK_ACTIONS_ALL.length > 6 ? (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      onPress={() => setShowAllActions(!showAllActions)}
                    >
                      <Text style={{ color: SF.orange, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>
                        {showAllActions ? "Show Less" : `See All (${QUICK_ACTIONS_ALL.length})`}
                      </Text>
                      <MaterialIcons name={showAllActions ? "expand-less" : "expand-more"} size={16} color={SF.orange} />
                    </TouchableOpacity>
                  ) : undefined
                }
              />
              {actionRows.map((row, ri) => (
                <View key={ri} style={styles.qaRow}>
                  {row.map((action) => (
                    <QuickActionCard
                      key={action.label}
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
                  ))}
                  {/* Fill empty slots in last row */}
                  {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                    <View key={`empty-${i}`} style={{ flex: 1 }} />
                  ))}
                </View>
              ))}
            </View>
          </StaggeredCard>

          {/* ── Today's Workout ── */}
          {workoutPlan?.schedule?.[0] && (
            <StaggeredCard index={4}>
              <View style={styles.section}>
                <SectionTitle title="Today's Workout" />
                <ImageBackground source={{ uri: AT_PLANS_BG }} style={{ borderRadius: 20, overflow: "hidden" }} resizeMode="cover">
                  <View style={styles.planCardOverlay}>
                    <Text style={styles.cardEyebrow}>{workoutPlan.schedule[0].day?.toUpperCase()}</Text>
                    <Text style={styles.planCardTitle}>{workoutPlan.schedule[0].focus}</Text>
                    <Text style={styles.planCardSub}>{workoutPlan.schedule[0].exercises?.length ?? 0} exercises</Text>
                    <TouchableOpacity style={styles.planCardBtn} onPress={() => router.push("/(tabs)/plans" as any)}>
                      <Text style={styles.planCardBtnText}>Start Workout</Text>
                      <MaterialIcons name="arrow-forward" size={16} color={SF.bg} />
                    </TouchableOpacity>
                  </View>
                </ImageBackground>
              </View>
            </StaggeredCard>
          )}

          {/* ── Today's Nutrition ── */}
          {(mealPlan as any)?.days?.[0] && (
            <StaggeredCard index={5}>
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
  welcomeTitle: { color: SF.fg, fontSize: 38, fontFamily: "Outfit_800ExtraBold", textAlign: "center", letterSpacing: -1 },
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
  heroName: { color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 30, letterSpacing: -0.5, marginTop: 2 },
  heroPill: { backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: SF.border2 },
  heroPillText: { color: SF.emerald2, fontFamily: "DMSans_500Medium", fontSize: 12 },
  // 4B: Primary card style (stats, calorie)
  statsCard: { backgroundColor: SF.surfacePrimary, marginHorizontal: 16, marginTop: -20, borderRadius: 24, padding: 20, borderWidth: 1.5, borderColor: SF.borderPrimary, flexDirection: "row", gap: 8, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  statsDivider: { width: 1, backgroundColor: SF.border },
  ringItem: { alignItems: "center", flex: 1 },
  ringContainer: { width: 64, height: 64, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  ringValue: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 14 },
  ringLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 1 },
  // 4B: Primary card for calorie
  calorieCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: SF.surfacePrimary, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: SF.borderPrimary, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  calorieHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardEyebrow: { color: SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 },
  calorieValue: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 22 },
  calorieGoal: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14 },
  // 4C: Taller progress bar
  progressTrack: { height: 10, backgroundColor: SF.border, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: 10, borderRadius: 5 },
  macroValue: { fontFamily: "DMSans_700Bold", fontSize: 13 },
  macroLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },
  // 2B: Increased section spacing (24→32)
  section: { paddingHorizontal: 16, marginTop: 32 },
  sectionTitle: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 18 },
  qaRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  // Secondary card style (quick actions, tips)
  qaCard: { flex: 1, backgroundColor: SF.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: SF.border },
  qaIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border },
  qaLabel: { color: SF.emerald3, fontFamily: "DMSans_500Medium", fontSize: 11, textAlign: "center" },
  planCardOverlay: { backgroundColor: "rgba(10,5,0,0.78)", padding: 20 },
  planCardTitle: { color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 20, marginTop: 4 },
  planCardSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 4 },
  planCardBtn: { backgroundColor: SF.emerald, borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 16, flexDirection: "row", justifyContent: "center", gap: 6 },
  planCardBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 14 },
  macroPill: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: SF.border },
  macroPillValue: { color: SF.emerald, fontFamily: "DMSans_700Bold", fontSize: 13 },
  macroPillLabel: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 },
  ctaOverlay: { backgroundColor: "rgba(10,5,0,0.82)", padding: 28, alignItems: "center" },
  ctaTitle: { color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 },
  ctaSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  ctaBtn: { backgroundColor: SF.emerald, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", gap: 8 },
  ctaBtnText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 16 },
  guestBanner: { marginHorizontal: 16, marginTop: 20, backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border, flexDirection: "row", alignItems: "center", gap: 12 },
  guestBannerTitle: { color: SF.emerald2, fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  guestBannerSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  guestBannerBtn: { backgroundColor: SF.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: SF.border2 },
  guestBannerBtnText: { color: SF.emerald, fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  trialBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 16, backgroundColor: "#1c1000", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#F59E0B40" },
  trialBannerExpired: { backgroundColor: "#1a0000", borderColor: "#ef444440" },
  trialBannerTitle: { color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13, marginBottom: 2 },
  trialBannerSub: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 16 },
  trialBannerBtn: { backgroundColor: "#F59E0B", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  trialBannerBtnText: { color: "#0A0500", fontFamily: "DMSans_700Bold", fontSize: 12 },
});
