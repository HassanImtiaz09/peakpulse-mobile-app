/**
 * Dashboard Hero Card — Time-of-day adaptive summary card
 *
 * Reads from the DailyState singleton to show a contextual greeting,
 * calorie/macro progress, workout status, and streak info.
 * Adapts its message and accent color based on morning/midday/evening/night.
 */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, Easing } from "react-native-reanimated";
import { getDailyState, type DailyState, type TimeOfDay, getTimeOfDay } from "@/lib/daily-state";
import { getProgressionSummary, type ProgressionSuggestion } from "@/lib/progression-engine";
import { UI } from "@/constants/ui-colors";

// ── Time-of-day theming ──────────────────────────────────────────────────────

interface TimeTheme {
  greeting: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
  bgTint: string;
  message: (state: DailyState) => string;
}

function getTimeTheme(tod: TimeOfDay, displayName: string): TimeTheme {
  switch (tod) {
    case "morning":
      return {
        greeting: `Good Morning, ${displayName}`,
        icon: "wb-sunny",
        accent: "#FBBF24",
        bgTint: "rgba(251,191,36,0.08)",
        message: (s) => {
          if (s.workoutStatus === "completed") return "Workout done early — great start!";
          if (s.mealsLogged > 0) return `${s.mealsLogged} meal${s.mealsLogged > 1 ? "s" : ""} logged. Keep fueling your day.`;
          return "Ready to start your day strong?";
        },
      };
    case "midday":
      return {
        greeting: `Keep Going, ${displayName}`,
        icon: "wb-cloudy",
        accent: "#60A5FA",
        bgTint: "rgba(96,165,250,0.08)",
        message: (s) => {
          if (s.workoutStatus === "completed") return "Workout crushed! Focus on nutrition now.";
          if (s.workoutStatus === "scheduled") return "Your workout is still waiting — let's go!";
          const pct = Math.round(s.calorieProgress * 100);
          if (pct > 0) return `${pct}% of your calorie goal hit. Stay on track.`;
          return "Halfway through the day — keep the momentum.";
        },
      };
    case "evening":
      return {
        greeting: `Almost There, ${displayName}`,
        icon: "nights-stay",
        accent: "#A78BFA",
        bgTint: "rgba(167,139,250,0.08)",
        message: (s) => {
          if (s.workoutStatus === "completed" && s.calorieProgress >= 0.8) return "Workout and nutrition on point today!";
          if (s.workoutStatus === "completed") return "Great workout! Don't forget to log dinner.";
          if (s.workoutStatus === "scheduled") return "Still time for a quick session before bed.";
          return "Wind down and review your day.";
        },
      };
    case "night":
    default:
      return {
        greeting: `Good Night, ${displayName}`,
        icon: "bedtime",
        accent: "#818CF8",
        bgTint: "rgba(129,140,248,0.08)",
        message: (s) => {
          if (s.workoutStatus === "completed") return "Rest well — you earned it today.";
          return "Rest up for tomorrow's goals.";
        },
      };
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface DashboardHeroCardProps {
  displayName: string;
  /** Override time of day for testing */
  timeOverride?: TimeOfDay;
}

export function DashboardHeroCard({ displayName, timeOverride }: DashboardHeroCardProps) {
  const [dailyState, setDailyState] = useState<DailyState | null>(null);
  const [topSuggestion, setTopSuggestion] = useState<ProgressionSuggestion | null>(null);
  const fadeIn = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [state, progression] = await Promise.all([
          getDailyState(),
          getProgressionSummary().catch(() => null),
        ]);
        if (!mounted) return;
        setDailyState(state);
        if (progression?.topSuggestion) setTopSuggestion(progression.topSuggestion);
        fadeIn.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      } catch {
        // Silently fail — card will just not show
      }
    })();
    return () => { mounted = false; };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: (1 - fadeIn.value) * 8 }],
  }));

  if (!dailyState) return null;

  const tod = timeOverride ?? dailyState.timeOfDay;
  const theme = getTimeTheme(tod, displayName);
  const calPct = Math.round(dailyState.calorieProgress * 100);

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.bgTint, borderColor: `${theme.accent}22` }, animatedStyle]}>
      {/* Top accent line */}
      <View style={[styles.accentLine, { backgroundColor: theme.accent }]} />

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${theme.accent}20` }]}>
          <MaterialIcons name={theme.icon as any} size={22} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: UI.fg }]}>{theme.greeting}</Text>
          <Text style={[styles.message, { color: UI.muted }]}>{theme.message(dailyState)}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {/* Calories */}
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: UI.fg }]}>
            {dailyState.caloriesConsumed > 0 ? dailyState.caloriesConsumed.toLocaleString() : "—"}
          </Text>
          <Text style={[styles.statLabel, { color: UI.muted }]}>
            {dailyState.calorieGoal > 0 ? `/ ${dailyState.calorieGoal.toLocaleString()} kcal` : "kcal"}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: UI.border }]} />

        {/* Workout */}
        <View style={styles.statItem}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MaterialIcons
              name={dailyState.workoutStatus === "completed" ? "check-circle" : dailyState.workoutStatus === "scheduled" ? "schedule" : "event-busy"}
              size={16}
              color={dailyState.workoutStatus === "completed" ? UI.green : dailyState.workoutStatus === "scheduled" ? theme.accent : UI.muted}
            />
            <Text style={[styles.statValue, { color: UI.fg }]}>
              {dailyState.workoutStatus === "completed" ? "Done" : dailyState.workoutStatus === "scheduled" ? "Scheduled" : "Rest"}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: UI.muted }]}>
            {dailyState.todayWorkoutName ?? "Workout"}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: UI.border }]} />

        {/* Streak */}
        <View style={styles.statItem}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MaterialIcons name="local-fire-department" size={16} color="#F59E0B" />
            <Text style={[styles.statValue, { color: UI.fg }]}>
              {dailyState.dailyXPStreak > 0 ? dailyState.dailyXPStreak : "—"}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: UI.muted }]}>day streak</Text>
        </View>
      </View>

      {/* Progression tip (if available) */}
      {topSuggestion && topSuggestion.action !== "maintain" && (
        <View style={[styles.tipRow, { backgroundColor: `${theme.accent}10`, borderColor: `${theme.accent}18` }]}>
          <MaterialIcons
            name={topSuggestion.action === "deload" ? "trending-down" : "trending-up"}
            size={16}
            color={topSuggestion.action === "deload" ? UI.orange : UI.green}
          />
          <Text style={[styles.tipText, { color: UI.muted }]} numberOfLines={2}>
            {topSuggestion.message}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentLine: {
    height: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 17,
    fontFamily: "DMSans_700Bold",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    opacity: 0.5,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    lineHeight: 16,
  },
});
