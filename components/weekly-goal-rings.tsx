/**
 * WeeklyGoalRings — Circular progress indicators for weekly fitness goals.
 *
 * Displays three concentric rings (Steps, Calories, Workouts) that fill
 * based on progress toward the user's weekly targets. Ties into the
 * existing goal-tracking system via AsyncStorage.
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { FadeIn, useSharedValue, useAnimatedProps, withTiming, Easing } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

import { UI, SF } from "@/constants/ui-colors";
import {
  getWeeklyGoals, calculateWeeklyProgress, getWorkoutsThisWeek,
  isGoalTrackingEnabled, type WeeklyProgress, type WeeklyGoals,
} from "@/lib/goal-tracking";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Ring Config ─────────────────────────────────────────────────
interface RingDef {
  key: "steps" | "calories" | "workouts";
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const RINGS: RingDef[] = [
  { key: "steps", label: "Steps", icon: "directions-walk", color: UI.green, bgColor: "rgba(34,197,94,0.12)" },
  { key: "calories", label: "Calories", icon: "local-fire-department", color: UI.gold, bgColor: UI.goldAlpha12 },
  { key: "workouts", label: "Workouts", icon: "fitness-center", color: "#3B82F6", bgColor: "rgba(59,130,246,0.12)" },
];

// ── Component ───────────────────────────────────────────────────
interface WeeklyGoalRingsProps {
  /** Compact mode: smaller rings, no labels */
  compact?: boolean;
  /** Called when user taps to navigate to weekly-goals screen */
  onPress?: () => void;
}

export function WeeklyGoalRings({ compact = false, onPress }: WeeklyGoalRingsProps) {
  const [progress, setProgress] = useState<WeeklyProgress | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadProgress = useCallback(async () => {
    try {
      const [goalEnabled, goals, workouts] = await Promise.all([
        isGoalTrackingEnabled(),
        getWeeklyGoals(),
        getWorkoutsThisWeek(),
      ]);
      setEnabled(goalEnabled);
      if (!goalEnabled) return;

      // For steps/calories, use stored wearable data or defaults
      const stepsRaw = await AsyncStorage.getItem("@wearable_steps_avg");
      const calsRaw = await AsyncStorage.getItem("@wearable_calories_avg");
      const avgSteps = stepsRaw ? parseInt(stepsRaw) : 0;
      const avgCalories = calsRaw ? parseInt(calsRaw) : 0;

      const prog = calculateWeeklyProgress(goals, {
        avgDailySteps: avgSteps,
        avgDailyCalories: avgCalories,
        workoutsThisWeek: workouts,
      });
      setProgress(prog);
    } catch (e) {
      console.warn("[WeeklyGoalRings] Failed to load:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress])
  );

  if (!enabled || !progress) return null;

  const size = compact ? 80 : 110;
  const strokeWidth = compact ? 6 : 8;
  const gap = compact ? 7 : 9;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity
        onPress={() => {
          if (onPress) {
            onPress();
          } else {
            setExpanded(!expanded);
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        activeOpacity={0.8}
        style={{
          backgroundColor: SF.surface,
          borderRadius: 16,
          padding: compact ? 12 : 16,
          borderWidth: 1,
          borderColor: SF.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {/* Rings SVG */}
          <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {RINGS.map((ring, i) => {
                const radius = (size / 2) - strokeWidth / 2 - (i * gap);
                const circumference = 2 * Math.PI * radius;
                const pct = Math.min(100, progress[ring.key].percentage);
                const strokeDashoffset = circumference * (1 - pct / 100);

                return (
                  <React.Fragment key={ring.key}>
                    {/* Background track */}
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={ring.bgColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    {/* Progress arc */}
                    <Circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      stroke={ring.color}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeDasharray={`${circumference} ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      rotation={-90}
                      origin={`${size / 2}, ${size / 2}`}
                    />
                  </React.Fragment>
                );
              })}
            </Svg>
            {/* Center label */}
            <View style={{ position: "absolute", alignItems: "center" }}>
              <Text style={{
                color: SF.fg,
                fontFamily: "DMSans_700Bold",
                fontSize: compact ? 14 : 18,
              }}>
                {Math.round((progress.steps.percentage + progress.calories.percentage + progress.workouts.percentage) / 3)}%
              </Text>
              {!compact && (
                <Text style={{ color: SF.muted, fontSize: 9, fontFamily: "DMSans_400Regular" }}>
                  Weekly
                </Text>
              )}
            </View>
          </View>

          {/* Stats Column */}
          <View style={{ flex: 1, gap: compact ? 4 : 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: compact ? 0 : 2 }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: compact ? 13 : 15 }}>
                Weekly Goals
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ color: SF.muted, fontSize: 10 }}>
                  {progress.daysRemaining}d left
                </Text>
                <MaterialIcons name="chevron-right" size={16} color={SF.muted} />
              </View>
            </View>

            {RINGS.map(ring => {
              const data = progress[ring.key];
              return (
                <View key={ring.key} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name={ring.icon as any} size={14} color={ring.color} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>
                        {ring.label}
                      </Text>
                      <Text style={{ color: data.percentage >= 100 ? ring.color : SF.muted, fontFamily: "DMSans_700Bold", fontSize: 11 }}>
                        {data.percentage >= 100 ? "Done!" : `${data.current}/${data.target}`}
                      </Text>
                    </View>
                    {/* Mini progress bar */}
                    <View style={{
                      height: 3, borderRadius: 1.5, backgroundColor: ring.bgColor, marginTop: 3,
                    }}>
                      <View style={{
                        height: 3, borderRadius: 1.5, backgroundColor: ring.color,
                        width: `${Math.min(100, data.percentage)}%`,
                      }} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Expanded detail (optional) */}
        {expanded && !compact && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: SF.border }}>
            <Text style={{ color: SF.muted, fontSize: 11, textAlign: "center" }}>
              Week: {progress.weekStart} — {progress.weekEnd} · Day {progress.daysElapsed}/7
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Need React import for JSX.Fragment
import React from "react";
