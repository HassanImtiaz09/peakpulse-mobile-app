import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  FlatList,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { StartWorkoutFAB } from "@/components/start-workout-fab";

/**
 * Today Tab — Simplified Dashboard
 *
 * Redesigned from 20+ sections → 6 focused sections:
 *   1. Hero        — greeting, date, streak badge (compact, single row)
 *   2. Workout     — today's workout card + "Start Workout" CTA
 *   3. Daily Stats — calories / protein / steps in one compact row
 *   4. Insights    — horizontally swipeable Quick Insights carousel
 *   5. Habit Rings — weekly workout completion (compact)
 *   6. Explore     — 4-tile grid linking to key features
 *
 * All other sections (wearables, muscle heatmap, trend charts, PRs,
 * AI Coach promotion, Quick Actions grid, Tips) have been moved to
 * their dedicated screens and are reachable via the Explore grid.
 */

// ── Theme ──────────────────────────────────────────────────────────────────
const C = {
  bg:         "#0D1117",
  surface:    "#111827",
  card:       "#161B22",
  border:     "#1F2937",
  gold:       "#F59E0B",
  goldDim:    "#92400E",
  goldText:   "#FCD34D",
  text:       "#F9FAFB",
  textSub:    "#9CA3AF",
  textMuted:  "#6B7280",
  green:      "#10B981",
  blue:       "#3B82F6",
  red:        "#EF4444",
};

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_PAD = 16;

// ── Types ──────────────────────────────────────────────────────────────────
interface DailyStat {
  label: string;
  value: string;
  unit: string;
  icon: string;
  color: string;
  progress: number; // 0–1
}

interface InsightCard {
  id: string;
  icon: string;
  title: string;
  body: string;
  route: string;
  color: string;
}

interface ExploreItem {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  route: string;
  color: string;
  bgColor: string;
}

// ── Static explore grid items ──────────────────────────────────────────────
const EXPLORE_ITEMS: ExploreItem[] = [
  {
    id: "scan",
    label: "Body Scan",
    sublabel: "AI body analysis",
    icon: "body",
    route: "/scan",
    color: "#A78BFA",
    bgColor: "#1E1B4B",
  },
  {
    id: "progress",
    label: "Progress",
    sublabel: "Photos & trends",
    icon: "camera",
    route: "/progress-photos",
    color: "#34D399",
    bgColor: "#064E3B",
  },
  {
    id: "analytics",
    label: "Analytics",
    sublabel: "Workout stats",
    icon: "analytics",
    route: "/workout-analytics",
    color: "#60A5FA",
    bgColor: "#1E3A5F",
  },
  {
    id: "gym",
    label: "Gym Finder",
    sublabel: "Nearby gyms",
    icon: "location",
    route: "/gym-finder",
    color: "#F87171",
    bgColor: "#450A0A",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function HeroSection({
  name,
  streak,
}: {
  name: string;
  streak: number;
}) {
  return (
    <View style={styles.heroRow}>
      <View style={styles.heroText}>
        <Text style={styles.greetingLabel}>{greeting()}</Text>
        <Text style={styles.greetingName} numberOfLines={1}>
          {name || "Athlete"} 👋
        </Text>
        <Text style={styles.dateLabel}>{todayLabel()}</Text>
      </View>
      {streak > 0 && (
        <TouchableOpacity
          style={styles.streakBadge}
          onPress={() => {}}
          accessibilityLabel={`${streak}-day streak`}
        >
          <Text style={styles.streakFire}>🔥</Text>
          <Text style={styles.streakCount}>{streak}</Text>
          <Text style={styles.streakWord}>streak</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function WorkoutCard({
  workoutName,
  muscleGroup,
  exerciseCount,
  onStart,
}: {
  workoutName: string;
  muscleGroup: string;
  exerciseCount: number;
  onStart: () => void;
}) {
  const noWorkout = !workoutName;
  return (
    <View style={styles.workoutCard}>
      <View style={styles.workoutCardHeader}>
        <View>
          <Text style={styles.workoutCardEyebrow}>TODAY'S WORKOUT</Text>
          <Text style={styles.workoutCardTitle} numberOfLines={2}>
            {noWorkout ? "No workout scheduled" : workoutName}
          </Text>
          {!noWorkout && (
            <Text style={styles.workoutCardSub}>
              {muscleGroup} · {exerciseCount} exercises
            </Text>
          )}
        </View>
        <View style={styles.workoutIconCircle}>
          <Ionicons name="barbell" size={28} color={C.gold} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.startBtn, noWorkout && styles.startBtnDisabled]}
        onPress={onStart}
        disabled={noWorkout}
        accessibilityRole="button"
        accessibilityLabel={noWorkout ? "Generate a workout plan first" : "Start today's workout"}
      >
        <Ionicons name="play" size={18} color={noWorkout ? C.textMuted : "#000"} />
        <Text style={[styles.startBtnText, noWorkout && styles.startBtnTextDisabled]}>
          {noWorkout ? "Generate Plan" : "Start Workout"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function DailyStatsRow({ stats }: { stats: DailyStat[] }) {
  return (
    <View style={styles.statsRow}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={[styles.statPill, i < stats.length - 1 && styles.statPillBorder]}
        >
          <Ionicons name={s.icon as any} size={16} color={s.color} />
          <Text style={styles.statValue}>{s.value}</Text>
          <Text style={styles.statUnit}>{s.unit}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function InsightCarousel({ cards, onPress }: { cards: InsightCard[]; onPress: (route: string) => void }) {
  if (!cards.length) return null;
  return (
    <View>
      <Text style={styles.sectionLabel}>QUICK INSIGHTS</Text>
      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        snapToInterval={SCREEN_W - 80}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.insightCard, { borderLeftColor: item.color }]}
            onPress={() => onPress(item.route)}
            accessibilityRole="button"
          >
            <Ionicons name={item.icon as any} size={22} color={item.color} />
            <Text style={styles.insightTitle}>{item.title}</Text>
            <Text style={styles.insightBody} numberOfLines={2}>{item.body}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function WeeklyHabitRings({ completedDays }: { completedDays: boolean[] }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <View style={styles.weekRow}>
      <Text style={styles.sectionLabel}>THIS WEEK</Text>
      <View style={styles.daysRow}>
        {days.map((d, i) => {
          const done = completedDays[i] ?? false;
          const isToday = i === new Date().getDay() - 1;
          return (
            <View key={i} style={styles.dayItem}>
              <View
                style={[
                  styles.dayRing,
                  done && styles.dayRingDone,
                  isToday && !done && styles.dayRingToday,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#000" />
                ) : (
                  <Text style={[styles.dayRingText, isToday && styles.dayRingTextToday]}>
                    {d}
                  </Text>
                )}
              </View>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{d}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ExploreGrid({ onPress }: { onPress: (route: string) => void }) {
  return (
    <View>
      <Text style={styles.sectionLabel}>EXPLORE</Text>
      <View style={styles.exploreGrid}>
        {EXPLORE_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.exploreTile, { backgroundColor: item.bgColor }]}
            onPress={() => onPress(item.route)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View style={[styles.exploreIconBg, { backgroundColor: item.color + "22" }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={styles.exploreTileLabel}>{item.label}</Text>
            <Text style={styles.exploreTileSub}>{item.sublabel}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function TodayScreen() {
  const router = useRouter();

  const [userName, setUserName]           = useState("");
  const [streak, setStreak]               = useState(0);
  const [workoutName, setWorkoutName]     = useState("");
  const [muscleGroup, setMuscleGroup]     = useState("");
  const [exerciseCount, setExerciseCount] = useState(0);
  const [caloriesIn, setCaloriesIn]       = useState(0);
  const [caloriesTarget, setCaloriesTarget] = useState(2200);
  const [protein, setProtein]             = useState(0);
  const [proteinTarget, setProteinTarget] = useState(160);
  const [steps, setSteps]                 = useState(0);
  const [stepsTarget, setStepsTarget]     = useState(10000);
  const [weekDays, setWeekDays]           = useState<boolean[]>(Array(7).fill(false));

  // Load user profile + today's workout from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const profile   = await AsyncStorage.getItem("userProfile");
        const planData  = await AsyncStorage.getItem("workoutPlan");
        const logData   = await AsyncStorage.getItem("workoutLog");
        const streakVal = await AsyncStorage.getItem("currentStreak");
        const todayLog  = await AsyncStorage.getItem("todayNutrition");

        if (profile) {
          const p = JSON.parse(profile);
          setUserName(p.name ?? p.firstName ?? "");
          setCaloriesTarget(p.tdee ?? p.calorieTarget ?? 2200);
          setProteinTarget(p.proteinTarget ?? 160);
        }
        if (streakVal) setStreak(parseInt(streakVal, 10) || 0);

        // Load today's planned workout
        if (planData) {
          const plan = JSON.parse(planData);
          const dayIdx = new Date().getDay();
          const todayWorkout = Array.isArray(plan) ? plan[dayIdx] : plan?.days?.[dayIdx];
          if (todayWorkout) {
            setWorkoutName(todayWorkout.name ?? todayWorkout.title ?? "");
            setMuscleGroup(todayWorkout.targetMuscle ?? todayWorkout.focus ?? "");
            setExerciseCount(todayWorkout.exercises?.length ?? 0);
          }
        }

        // Build week completion rings
        if (logData) {
          const log = JSON.parse(logData);
          const week = Array(7).fill(false);
          // log is array of { date: ISO, completed: bool }
          if (Array.isArray(log)) {
            log.forEach((entry: any) => {
              if (entry.completed) {
                const d = new Date(entry.date).getDay();
                week[d === 0 ? 6 : d - 1] = true;
              }
            });
          }
          setWeekDays(week);
        }

        // Nutrition log for today
        if (todayLog) {
          const n = JSON.parse(todayLog);
          setCaloriesIn(n.calories ?? 0);
          setProtein(n.protein ?? 0);
        }
      } catch (_) {
        // graceful degradation — show skeleton state
      }
    })();
  }, []);

  const handleStartWorkout = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!workoutName) {
      router.push("/plans");
    } else {
      router.push("/active-workout");
    }
  }, [workoutName, router]);

  const handleNavigate = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  // Daily stats
  const dailyStats: DailyStat[] = [
    {
      label: "Calories",
      value: caloriesIn.toString(),
      unit: `/${caloriesTarget}`,
      icon: "flame",
      color: "#F97316",
      progress: Math.min(caloriesIn / caloriesTarget, 1),
    },
    {
      label: "Protein",
      value: protein.toString(),
      unit: `g/${proteinTarget}g`,
      icon: "fish",
      color: "#60A5FA",
      progress: Math.min(protein / proteinTarget, 1),
    },
    {
      label: "Steps",
      value: steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps.toString(),
      unit: `/${(stepsTarget / 1000).toFixed(0)}k`,
      icon: "footsteps",
      color: "#34D399",
      progress: Math.min(steps / stepsTarget, 1),
    },
  ];

  // Quick Insights carousel — contextual cards
  const insights: InsightCard[] = [
    {
      id: "streak",
      icon: "flame",
      title: `${streak > 0 ? streak + "-day streak!" : "Start your streak"}`,
      body: streak > 0
        ? "You're on a roll. Don't break the chain."
        : "Complete today's workout to start your streak.",
      route: "/streak-details",
      color: "#F97316",
    },
    {
      id: "ai",
      icon: "sparkles",
      title: "AI Coach",
      body: "Ask your AI coach anything about your training, nutrition, or form.",
      route: "/ai-coach",
      color: C.gold,
    },
    {
      id: "muscle",
      icon: "body",
      title: "Muscle Balance",
      body: "Check which muscle groups need more attention this week.",
      route: "/workout-analytics",
      color: "#A78BFA",
    },
    {
      id: "history",
      icon: "calendar",
      title: "Workout Calendar",
      body: "View your training history and consistency over time.",
      route: "/workout-calendar",
      color: "#60A5FA",
    },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1 ─ Hero */}
          <HeroSection name={userName} streak={streak} />

          {/* 2 ─ Today's Workout */}
          <WorkoutCard
            workoutName={workoutName}
            muscleGroup={muscleGroup}
            exerciseCount={exerciseCount}
            onStart={handleStartWorkout}
          />

          {/* 3 ─ Daily Stats */}
          <View style={styles.card}>
            <DailyStatsRow stats={dailyStats} />
          </View>

          {/* 4 ─ Quick Insights Carousel */}
          <InsightCarousel cards={insights} onPress={handleNavigate} />

          {/* 5 ─ Weekly Habit Rings */}
          <View style={styles.card}>
            <WeeklyHabitRings completedDays={weekDays} />
          </View>

          {/* 6 ─ Explore Grid */}
          <View style={styles.card}>
            <ExploreGrid onPress={handleNavigate} />
          </View>

          {/* Extra bottom padding so FAB doesn't cover last card */}
          <View style={{ height: 96 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Persistent floating CTA — always visible above tab bar */}
      <StartWorkoutFAB />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CARD_PAD,
    paddingTop: 12,
    gap: 12,
  },

  // Hero
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  greetingLabel: {
    fontSize: 13,
    color: C.textSub,
    fontFamily: "DMSans_400Regular",
    letterSpacing: 0.3,
  },
  greetingName: {
    fontSize: 24,
    color: C.text,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -0.3,
  },
  dateLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontFamily: "DMSans_400Regular",
  },
  streakBadge: {
    alignItems: "center",
    backgroundColor: C.goldDim + "44",
    borderWidth: 1,
    borderColor: C.gold + "55",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 0,
    minWidth: 64,
  },
  streakFire: {
    fontSize: 20,
  },
  streakCount: {
    fontSize: 18,
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    lineHeight: 22,
  },
  streakWord: {
    fontSize: 10,
    color: C.goldText,
    fontFamily: "DMSans_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Workout card
  workoutCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.gold + "33",
    padding: CARD_PAD,
    gap: 16,
  },
  workoutCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  workoutCardEyebrow: {
    fontSize: 10,
    color: C.gold,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  workoutCardTitle: {
    fontSize: 20,
    color: C.text,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -0.2,
    maxWidth: SCREEN_W - 120,
  },
  workoutCardSub: {
    fontSize: 13,
    color: C.textSub,
    fontFamily: "DMSans_400Regular",
    marginTop: 4,
  },
  workoutIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.gold + "18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.gold + "44",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnDisabled: {
    backgroundColor: C.surface,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: C.border,
  },
  startBtnText: {
    fontSize: 16,
    color: "#000",
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
  startBtnTextDisabled: {
    color: C.textMuted,
  },

  // Stats row
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: CARD_PAD,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  statPillBorder: {
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  statValue: {
    fontSize: 18,
    color: C.text,
    fontFamily: "DMSans_700Bold",
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 11,
    color: C.textMuted,
    fontFamily: "DMSans_400Regular",
  },
  statLabel: {
    fontSize: 11,
    color: C.textSub,
    fontFamily: "DMSans_400Regular",
    letterSpacing: 0.2,
  },

  // Section label
  sectionLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 1.4,
    marginBottom: 12,
  },

  // Carousel
  carouselContent: {
    paddingRight: CARD_PAD,
    gap: 10,
  },
  insightCard: {
    width: SCREEN_W - 80,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    padding: 16,
    gap: 6,
  },
  insightTitle: {
    fontSize: 15,
    color: C.text,
    fontFamily: "DMSans_600SemiBold",
    letterSpacing: -0.1,
  },
  insightBody: {
    fontSize: 13,
    color: C.textSub,
    fontFamily: "DMSans_400Regular",
    lineHeight: 19,
  },

  // Weekly rings
  weekRow: {
    gap: 0,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  dayItem: {
    alignItems: "center",
    gap: 6,
  },
  dayRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayRingDone: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  dayRingToday: {
    borderColor: C.gold,
  },
  dayRingText: {
    fontSize: 12,
    color: C.textMuted,
    fontFamily: "DMSans_500Medium",
  },
  dayRingTextToday: {
    color: C.gold,
  },
  dayLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontFamily: "DMSans_400Regular",
  },
  dayLabelToday: {
    color: C.gold,
  },

  // Explore grid
  exploreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  exploreTile: {
    width: (SCREEN_W - CARD_PAD * 2 - 10) / 2,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF0A",
  },
  exploreIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  exploreTileLabel: {
    fontSize: 15,
    color: C.text,
    fontFamily: "DMSans_600SemiBold",
    letterSpacing: -0.1,
  },
  exploreTileSub: {
    fontSize: 12,
    color: C.textSub,
    fontFamily: "DMSans_400Regular",
  },
});
