/**
 * R5: Floating "Start Workout" Button (FAB)
 * Persistent CTA above the tab bar on Home and Train tabs.
 * Shows today's workout focus and navigates to active-workout.
 */
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UI } from "@/constants/ui-colors";

const GOLD = UI.gold;
const GOLD_DARK = UI.secondaryLight;
const BG_DARK = UI.bg;

interface FloatingStartWorkoutProps {
  /** Override the label text */
  label?: string;
  /** Override the sub-label (e.g. "Upper Body") */
  focusLabel?: string;
}

export function FloatingStartWorkout({ label, focusLabel }: FloatingStartWorkoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [todayFocus, setTodayFocus] = useState<string | null>(null);
  const [hasWorkout, setHasWorkout] = useState(false);

  useEffect(() => {
    loadTodayWorkout();
  }, []);

  async function loadTodayWorkout() {
    try {
      const raw = await AsyncStorage.getItem("@guest_workout_plan");
      if (!raw) { setHasWorkout(false); return; }
      const plan = JSON.parse(raw);
      if (!plan?.schedule) { setHasWorkout(false); return; }
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = dayNames[new Date().getDay()];
      const todayPlan = plan.schedule.find((d: any) =>
        d.day?.toLowerCase() === today
      );
      if (todayPlan && todayPlan.exercises?.length > 0) {
        setHasWorkout(true);
        // Extract focus from day name or first exercise muscle group
        const focus = todayPlan.focus || todayPlan.day || "Workout";
        setTodayFocus(focus);
      } else {
        setHasWorkout(false);
        setTodayFocus(null);
      }
    } catch {
      setHasWorkout(false);
    }
  }

  function handlePress() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/active-workout" as any);
  }

  const bottomOffset = Platform.OS === "web" ? 80 : 72 + Math.max(insets.bottom, 8);
  const displayLabel = label || (hasWorkout ? "Start Workout" : "Start Workout");
  const displayFocus = focusLabel || todayFocus;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View style={styles.iconCircle}>
          <MaterialIcons name="play-arrow" size={22} color={BG_DARK} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.fabLabel}>{displayLabel}</Text>
          {displayFocus && (
            <Text style={styles.fabFocus} numberOfLines={1}>{displayFocus}</Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={20} color="rgba(10,14,20,0.5)" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 10,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    minWidth: 200,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(10,14,20,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  fabLabel: {
    color: BG_DARK,
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  fabFocus: {
    color: GOLD_DARK,
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    marginTop: 1,
    opacity: 0.8,
  },
});
