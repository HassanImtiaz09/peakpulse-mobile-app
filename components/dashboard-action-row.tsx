/**
 * Dashboard Action Row — Contextual quick-action buttons below the Hero Card.
 *
 * Shows 3–4 action buttons that adapt based on the user's current daily state:
 * - Morning: Log Breakfast, Start Workout, Check Streak
 * - Midday: Log Lunch, Continue Workout, View Progress
 * - Evening: Log Dinner, Review Day, Check Streak
 * - Always: one slot for the most relevant action (e.g., Body Scan if no scan yet)
 */
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { getDailyState, type DailyState, type TimeOfDay } from "@/lib/daily-state";
import { UI } from "@/constants/ui-colors";

// ── Action definitions ───────────────────────────────────────────────────────

interface ActionItem {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  route: string;
  params?: Record<string, string>;
}

function getActions(state: DailyState, hasWorkoutPlan: boolean): ActionItem[] {
  const tod = state.timeOfDay;
  const actions: ActionItem[] = [];

  // Slot 1: Meal action (time-appropriate)
  if (tod === "morning") {
    actions.push({
      id: "log_breakfast",
      label: "Log Breakfast",
      icon: "free-breakfast",
      color: "#FBBF24",
      route: "/(tabs)/meals",
    });
  } else if (tod === "midday") {
    actions.push({
      id: "log_lunch",
      label: "Log Lunch",
      icon: "lunch-dining",
      color: "#60A5FA",
      route: "/(tabs)/meals",
    });
  } else {
    actions.push({
      id: "log_dinner",
      label: "Log Dinner",
      icon: "dinner-dining",
      color: "#A78BFA",
      route: "/(tabs)/meals",
    });
  }

  // Slot 2: Workout action
  if (state.workoutStatus === "completed") {
    actions.push({
      id: "view_progress",
      label: "Progress",
      icon: "insights",
      color: "#22C55E",
      route: "/workout-calendar",
    });
  } else if (hasWorkoutPlan && state.workoutStatus === "scheduled") {
    actions.push({
      id: "start_workout",
      label: "Workout",
      icon: "fitness-center",
      color: "#F59E0B",
      route: "/energy-checkin",
    });
  } else {
    actions.push({
      id: "explore_plans",
      label: "Plans",
      icon: "event-note",
      color: "#14B8A6",
      route: "/(tabs)/plans",
    });
  }

  // Slot 3: Body Scan / AI Coach
  actions.push({
    id: "body_scan",
    label: "Body Scan",
    icon: "center-focus-strong",
    color: "#EC4899",
    route: "/(tabs)/scan",
  });

  // Slot 4: Streak / Social
  if (state.dailyXPStreak > 0) {
    actions.push({
      id: "streak",
      label: `${state.dailyXPStreak}d Streak`,
      icon: "local-fire-department",
      color: "#F97316",
      route: "/streak-details",
    });
  } else {
    actions.push({
      id: "ai_coach",
      label: "AI Coach",
      icon: "psychology",
      color: "#818CF8",
      route: "/ai-coach",
    });
  }

  return actions;
}

// ── Component ────────────────────────────────────────────────────────────────

interface DashboardActionRowProps {
  hasWorkoutPlan: boolean;
  /** Override time of day for testing */
  timeOverride?: TimeOfDay;
}

export function DashboardActionRow({ hasWorkoutPlan, timeOverride }: DashboardActionRowProps) {
  const router = useRouter();
  const [actions, setActions] = useState<ActionItem[]>([]);

  useEffect(() => {
    let mounted = true;
    getDailyState().then((state) => {
      if (!mounted) return;
      if (timeOverride) state = { ...state, timeOfDay: timeOverride };
      setActions(getActions(state, hasWorkoutPlan));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [hasWorkoutPlan, timeOverride]);

  if (actions.length === 0) return null;

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.push(action.route as any);
          }}
        >
          <View style={[styles.iconCircle, { backgroundColor: `${action.color}18` }]}>
            <MaterialIcons name={action.icon as any} size={22} color={action.color} />
          </View>
          <Text style={[styles.label, { color: UI.muted }]} numberOfLines={1}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    textAlign: "center",
  },
});
