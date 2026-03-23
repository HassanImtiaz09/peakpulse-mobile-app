/**
 * Streak Details Screen
 *
 * Full streak history, milestone gallery, workout heatmap,
 * streak freeze management, and milestone sharing.
 */

import React, { useState, useEffect } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, ImageBackground, Platform, Alert, TextInput, ActivityIndicator,
} from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
  getStreakData, getCurrentMilestone, getNextMilestone, getWeeksToNextMilestone,
  getStreakEmoji, getStreakLabel, getStreakMotivation, getMilestoneProgress,
  MILESTONE_TIERS, canUseFreeze, getFreezesRemaining, activateStreakFreeze,
  isCurrentWeekFrozen,
  type StreakData, type MilestoneTier, type WeekResult, type StreakFreezeData,
} from "@/lib/streak-tracking";
import {
  shareMilestoneCard, type MilestoneCardData,
} from "@/lib/social-card-generator";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";
const WORKOUT_HISTORY_KEY = "@workout_log_history";

// ── Heatmap Helpers ──────────────────────────────────────────────

interface HeatmapDay {
  date: string;       // YYYY-MM-DD
  count: number;      // number of workouts
  dayOfWeek: number;  // 0=Sun, 6=Sat
}

function getHeatmapData(workoutHistory: any[]): { days: HeatmapDay[]; months: { label: string; colStart: number }[] } {
  // Build 13 weeks (91 days) ending today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 90);

  // Count workouts per day
  const countMap: Record<string, number> = {};
  for (const entry of workoutHistory) {
    const d = entry.loggedAt ? entry.loggedAt.substring(0, 10) : "";
    if (d) countMap[d] = (countMap[d] || 0) + 1;
  }

  const days: HeatmapDay[] = [];
  const months: { label: string; colStart: number }[] = [];
  let lastMonth = -1;

  for (let i = 0; i <= 90; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().substring(0, 10);
    const dayOfWeek = d.getDay();
    const month = d.getMonth();

    if (month !== lastMonth) {
      const col = Math.floor(i / 7);
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        colStart: col,
      });
      lastMonth = month;
    }

    days.push({
      date: dateStr,
      count: countMap[dateStr] || 0,
      dayOfWeek,
    });
  }

  return { days, months };
}

function getHeatmapColor(count: number): string {
  if (count === 0) return "rgba(255,255,255,0.04)";
  if (count === 1) return "rgba(245,158,11,0.25)";
  if (count === 2) return "rgba(245,158,11,0.50)";
  return "rgba(245,158,11,0.80)";
}

// ── Milestone Card ────────────────────────────────────────────────

function MilestoneCard({ tier, unlocked, unlockedAt, streakAtUnlock, streakData, onShare }: {
  tier: MilestoneTier;
  unlocked: boolean;
  unlockedAt?: string;
  streakAtUnlock?: number;
  streakData: StreakData;
  onShare: (tier: MilestoneTier) => void;
}) {
  return (
    <View style={{
      backgroundColor: unlocked ? tier.color + "12" : "rgba(255,255,255,0.02)",
      borderRadius: 16, padding: 14, borderWidth: 1,
      borderColor: unlocked ? tier.color + "30" : "rgba(255,255,255,0.05)",
      marginBottom: 10,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: unlocked ? tier.color + "25" : "rgba(255,255,255,0.04)",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 24, opacity: unlocked ? 1 : 0.3 }}>{tier.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{
              color: unlocked ? tier.color : "#78350F",
              fontFamily: "Outfit_700Bold", fontSize: 16,
            }}>
              {tier.name}
            </Text>
            <View style={{
              backgroundColor: unlocked ? tier.color + "30" : "rgba(255,255,255,0.05)",
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
            }}>
              <Text style={{
                color: unlocked ? tier.color : "#78350F",
                fontFamily: "Outfit_700Bold", fontSize: 10,
              }}>
                {tier.badge}
              </Text>
            </View>
            {unlocked && (
              <MaterialIcons name="verified" size={16} color={tier.color} />
            )}
          </View>
          <Text style={{
            color: unlocked ? "#FFF7ED" : "#78350F",
            fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2, lineHeight: 16,
            opacity: unlocked ? 0.8 : 0.5,
          }}>
            {tier.description}
          </Text>
          {unlocked && unlockedAt && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                Unlocked {new Date(unlockedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {streakAtUnlock ? ` at ${streakAtUnlock}-week streak` : ""}
              </Text>
              <TouchableOpacity
                onPress={() => onShare(tier)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 3,
                  backgroundColor: tier.color + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                }}
              >
                <MaterialIcons name="share" size={12} color={tier.color} />
                <Text style={{ color: tier.color, fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>Share</Text>
              </TouchableOpacity>
            </View>
          )}
          {!unlocked && (
            <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 4, opacity: 0.5 }}>
              Requires {tier.weeksRequired} consecutive week{tier.weeksRequired !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Week History Row ──────────────────────────────────────────────

function WeekHistoryRow({ week }: { week: WeekResult }) {
  const weekDate = new Date(week.weekStart + "T00:00:00");
  const weekEnd = new Date(weekDate);
  weekEnd.setDate(weekDate.getDate() + 6);

  return (
    <View style={{
      flexDirection: "row", alignItems: "center", paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.06)",
    }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>
            {weekDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </Text>
          {week.frozen && (
            <View style={{ backgroundColor: "rgba(59,130,246,0.15)", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
              <Text style={{ color: "#3B82F6", fontFamily: "DMSans_600SemiBold", fontSize: 8 }}>FROZEN</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <View style={{ alignItems: "center", width: 32 }}>
          <MaterialIcons
            name={week.stepsHit ? "check-circle" : "cancel"}
            size={16}
            color={week.stepsHit ? "#22C55E" : "#EF4444"}
          />
          <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 8, marginTop: 1 }}>Steps</Text>
        </View>
        <View style={{ alignItems: "center", width: 32 }}>
          <MaterialIcons
            name={week.caloriesHit ? "check-circle" : "cancel"}
            size={16}
            color={week.caloriesHit ? "#22C55E" : "#EF4444"}
          />
          <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 8, marginTop: 1 }}>Cals</Text>
        </View>
        <View style={{ alignItems: "center", width: 32 }}>
          <MaterialIcons
            name={week.workoutsHit ? "check-circle" : "cancel"}
            size={16}
            color={week.workoutsHit ? "#22C55E" : "#EF4444"}
          />
          <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 8, marginTop: 1 }}>Gym</Text>
        </View>
        <View style={{
          width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
          backgroundColor: week.frozen ? "rgba(59,130,246,0.15)" : week.allGoalsMet ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)",
        }}>
          <Text style={{ fontSize: 14 }}>{week.frozen ? "❄️" : week.allGoalsMet ? "🔥" : "❌"}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Workout Heatmap Component ────────────────────────────────────

function WorkoutHeatmap({ workoutHistory }: { workoutHistory: any[] }) {
  const { days, months } = getHeatmapData(workoutHistory);
  const cellSize = 14;
  const cellGap = 3;
  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
  const labelWidth = 28;

  // Build grid: rows = 7 days of week, cols = weeks
  const totalCols = Math.ceil(days.length / 7) + 1;
  const svgWidth = labelWidth + totalCols * (cellSize + cellGap);
  const svgHeight = 7 * (cellSize + cellGap) + 24; // extra for month labels

  // Total workouts in period
  const totalWorkouts = days.reduce((sum, d) => sum + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <View>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Workout Heatmap</Text>
          <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>Past 3 months</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>{totalWorkouts}</Text>
          <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10 }}>workouts in {activeDays} days</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={svgWidth} height={svgHeight}>
          {/* Month labels */}
          {months.map((m, i) => (
            <SvgText
              key={`month-${i}`}
              x={labelWidth + m.colStart * (cellSize + cellGap)}
              y={12}
              fill="#78350F"
              fontSize={9}
              fontWeight="600"
            >
              {m.label}
            </SvgText>
          ))}

          {/* Day labels */}
          {dayLabels.map((label, i) => (
            label ? (
              <SvgText
                key={`day-${i}`}
                x={0}
                y={24 + i * (cellSize + cellGap) + cellSize - 2}
                fill="#78350F"
                fontSize={8}
                fontWeight="500"
              >
                {label}
              </SvgText>
            ) : null
          ))}

          {/* Heatmap cells */}
          {days.map((day, i) => {
            const col = Math.floor(i / 7);
            const row = day.dayOfWeek;
            const x = labelWidth + col * (cellSize + cellGap);
            const y = 20 + row * (cellSize + cellGap);
            return (
              <Rect
                key={day.date}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                rx={3}
                fill={getHeatmapColor(day.count)}
              />
            );
          })}
        </Svg>
      </ScrollView>

      {/* Legend */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
        <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 9 }}>Less</Text>
        {[0, 1, 2, 3].map((level) => (
          <View
            key={level}
            style={{
              width: 12, height: 12, borderRadius: 2,
              backgroundColor: getHeatmapColor(level),
            }}
          />
        ))}
        <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 9 }}>More</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────

export default function StreakDetailsScreen() {
  const router = useRouter();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [activeTab, setActiveTab] = useState<"milestones" | "history" | "heatmap">("milestones");
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [freezeReason, setFreezeReason] = useState("");
  const [freezing, setFreezing] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getStreakData();
      setStreakData(data);
      // Load workout history for heatmap
      try {
        const raw = await AsyncStorage.getItem(WORKOUT_HISTORY_KEY);
        if (raw) setWorkoutHistory(JSON.parse(raw));
      } catch (e) {
        console.warn("[StreakDetails] Failed to load workout history:", e);
      }
    })();
  }, []);

  const handleFreeze = async () => {
    if (!streakData) return;

    Alert.alert(
      "Freeze Your Streak",
      "This will protect your streak for the current week. You get 1 freeze per calendar month. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Freeze Streak",
          style: "destructive",
          onPress: async () => {
            setFreezing(true);
            try {
              const result = await activateStreakFreeze(freezeReason || undefined);
              if (result.success) {
                setStreakData(result.streakData);
                setFreezeReason("");
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Streak Frozen", "Your streak is protected for this week. Stay strong and come back next week!");
              } else {
                Alert.alert("Cannot Freeze", result.error || "Unable to freeze streak at this time.");
              }
            } catch (e) {
              Alert.alert("Error", "Failed to activate streak freeze.");
            } finally {
              setFreezing(false);
            }
          },
        },
      ],
    );
  };

  const handleShareMilestone = async (tier: MilestoneTier) => {
    if (!streakData || sharing) return;
    setSharing(true);
    try {
      const cardData: MilestoneCardData = {
        milestoneName: tier.name,
        milestoneEmoji: tier.emoji,
        milestoneBadge: tier.badge,
        milestoneColor: tier.color,
        milestoneDescription: tier.description,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        totalWeeksCompleted: streakData.totalWeeksCompleted,
      };
      await shareMilestoneCard(cardData);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("[StreakDetails] Share failed:", e);
    } finally {
      setSharing(false);
    }
  };

  if (!streakData) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0500", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  const currentMilestone = getCurrentMilestone(streakData.currentStreak);
  const nextMilestone = getNextMilestone(streakData.currentStreak);
  const weeksToNext = getWeeksToNextMilestone(streakData.currentStreak);
  const milestoneProgress = getMilestoneProgress(streakData.currentStreak);
  const unlockedIds = new Set(streakData.milestones.map((m) => m.tierId));
  const freezeAvailable = canUseFreeze(streakData.freezeData);
  const freezesRemaining = getFreezesRemaining(streakData.freezeData);
  const weekFrozen = isCurrentWeekFrozen(streakData.freezeData);

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero Header */}
      <ImageBackground source={{ uri: DASHBOARD_BG }} style={{ height: 200 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{
              position: "absolute", top: 52, left: 20, width: 36, height: 36, borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center",
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#FFF7ED", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>CONSISTENCY TRACKER</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 28, letterSpacing: -0.5 }}>Goal Streaks</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Current Streak Hero ── */}
        <View style={{
          backgroundColor: streakData.currentStreak > 0 ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)",
          borderRadius: 24, padding: 24, alignItems: "center",
          borderWidth: 1.5, borderColor: streakData.currentStreak > 0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
        }}>
          <Text style={{ fontSize: 52 }}>{getStreakEmoji(streakData.currentStreak)}</Text>
          <Text style={{
            color: streakData.currentStreak > 0 ? "#F59E0B" : "#78350F",
            fontFamily: "Outfit_800ExtraBold", fontSize: 36, marginTop: 8,
          }}>
            {streakData.currentStreak}
          </Text>
          <Text style={{
            color: streakData.currentStreak > 0 ? "#FFF7ED" : "#78350F",
            fontFamily: "Outfit_700Bold", fontSize: 16,
          }}>
            {getStreakLabel(streakData.currentStreak)}
          </Text>
          {currentMilestone && (
            <View style={{
              marginTop: 8, backgroundColor: currentMilestone.color + "25",
              paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
            }}>
              <Text style={{ color: currentMilestone.color, fontFamily: "Outfit_700Bold", fontSize: 12 }}>
                {currentMilestone.emoji} {currentMilestone.name}
              </Text>
            </View>
          )}
          <Text style={{
            color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 12,
            textAlign: "center", marginTop: 10, lineHeight: 18,
          }}>
            {getStreakMotivation(streakData.currentStreak, false)}
          </Text>

          {/* Progress to next milestone */}
          {nextMilestone && (
            <View style={{ width: "100%", marginTop: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                  Next: {nextMilestone.emoji} {nextMilestone.name}
                </Text>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                  {weeksToNext} week{weeksToNext !== 1 ? "s" : ""} away
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 3 }}>
                <View style={{
                  height: 6, borderRadius: 3, backgroundColor: nextMilestone.color,
                  width: `${milestoneProgress}%`,
                }} />
              </View>
            </View>
          )}

          {/* Frozen week indicator */}
          {weekFrozen && (
            <View style={{
              marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: "rgba(59,130,246,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
            }}>
              <Text style={{ fontSize: 16 }}>❄️</Text>
              <Text style={{ color: "#3B82F6", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>
                Streak frozen this week
              </Text>
            </View>
          )}
        </View>

        {/* ── Stats Row ── */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <View style={{
            flex: 1, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: "rgba(245,158,11,0.1)", alignItems: "center",
          }}>
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_800ExtraBold", fontSize: 22 }}>
              {streakData.longestStreak}
            </Text>
            <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 }}>Best Streak</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: "rgba(34,197,94,0.06)", borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: "rgba(34,197,94,0.1)", alignItems: "center",
          }}>
            <Text style={{ color: "#22C55E", fontFamily: "Outfit_800ExtraBold", fontSize: 22 }}>
              {streakData.totalWeeksCompleted}
            </Text>
            <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 }}>Weeks Completed</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: "rgba(139,92,246,0.06)", borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: "rgba(139,92,246,0.1)", alignItems: "center",
          }}>
            <Text style={{ color: "#8B5CF6", fontFamily: "Outfit_800ExtraBold", fontSize: 22 }}>
              {streakData.milestones.length}
            </Text>
            <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 }}>Milestones</Text>
          </View>
        </View>

        {/* ── Streak Freeze Section ── */}
        <View style={{
          marginTop: 16, backgroundColor: "rgba(59,130,246,0.04)", borderRadius: 20, padding: 16,
          borderWidth: 1, borderColor: "rgba(59,130,246,0.12)",
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(59,130,246,0.15)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 18 }}>❄️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Streak Freeze</Text>
              <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                {freezesRemaining > 0 ? "1 freeze available this month" : "Freeze used this month — resets on the 1st"}
              </Text>
            </View>
            <View style={{
              backgroundColor: freezeAvailable && !weekFrozen ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
            }}>
              <Text style={{
                color: freezeAvailable && !weekFrozen ? "#3B82F6" : "#78350F",
                fontFamily: "Outfit_700Bold", fontSize: 11,
              }}>
                {freezesRemaining}/1
              </Text>
            </View>
          </View>

          {streakData.currentStreak > 0 && freezeAvailable && !weekFrozen && (
            <>
              <TextInput
                value={freezeReason}
                onChangeText={setFreezeReason}
                placeholder="Reason (optional): illness, travel, injury..."
                placeholderTextColor="#78350F"
                returnKeyType="done"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12,
                  color: "#FFF7ED", fontFamily: "DMSans_400Regular", fontSize: 13,
                  borderWidth: 1, borderColor: "rgba(59,130,246,0.1)", marginBottom: 10,
                }}
              />
              <TouchableOpacity
                onPress={handleFreeze}
                disabled={freezing}
                style={{
                  backgroundColor: "rgba(59,130,246,0.15)", paddingVertical: 12, borderRadius: 12,
                  alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
                  borderWidth: 1, borderColor: "rgba(59,130,246,0.25)",
                  opacity: freezing ? 0.5 : 1,
                }}
              >
                {freezing ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16 }}>❄️</Text>
                    <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Freeze This Week</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {weekFrozen && (
            <View style={{
              backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 12, padding: 12, marginTop: 4,
              flexDirection: "row", alignItems: "center", gap: 8,
            }}>
              <MaterialIcons name="check-circle" size={16} color="#3B82F6" />
              <Text style={{ color: "#3B82F6", fontFamily: "DMSans_600SemiBold", fontSize: 12, flex: 1 }}>
                This week is frozen. Your streak is protected.
              </Text>
            </View>
          )}

          {streakData.currentStreak === 0 && (
            <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center", marginTop: 4, opacity: 0.6 }}>
              Build a streak first to use the freeze feature.
            </Text>
          )}

          {/* Freeze History */}
          {streakData.freezeData.freezeHistory.length > 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(59,130,246,0.08)" }}>
              <Text style={{ color: "#78350F", fontFamily: "Outfit_700Bold", fontSize: 11, marginBottom: 6 }}>FREEZE HISTORY</Text>
              {streakData.freezeData.freezeHistory.slice(0, 5).map((freeze, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12 }}>❄️</Text>
                  <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 11, flex: 1 }}>
                    Week of {new Date(freeze.weekStart + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {freeze.reason ? ` — ${freeze.reason}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Tab Selector ── */}
        <View style={{
          flexDirection: "row", marginTop: 20, backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: 12, padding: 3,
        }}>
          {(["milestones", "history", "heatmap"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                backgroundColor: activeTab === tab ? "rgba(245,158,11,0.12)" : "transparent",
              }}
            >
              <Text style={{
                color: activeTab === tab ? "#F59E0B" : "#78350F",
                fontFamily: activeTab === tab ? "Outfit_700Bold" : "DMSans_400Regular", fontSize: 12,
              }}>
                {tab === "milestones" ? "Milestones" : tab === "history" ? "History" : "Heatmap"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Milestones Gallery ── */}
        {activeTab === "milestones" && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 12 }}>
              Milestone Gallery
            </Text>
            {MILESTONE_TIERS.map((tier) => {
              const milestone = streakData.milestones.find((m) => m.tierId === tier.id);
              return (
                <MilestoneCard
                  key={tier.id}
                  tier={tier}
                  unlocked={unlockedIds.has(tier.id)}
                  unlockedAt={milestone?.unlockedAt}
                  streakAtUnlock={milestone?.streakAtUnlock}
                  streakData={streakData}
                  onShare={handleShareMilestone}
                />
              );
            })}
          </View>
        )}

        {/* ── Week History ── */}
        {activeTab === "history" && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 12 }}>
              Weekly Goal History
            </Text>
            {streakData.weekHistory.length === 0 ? (
              <View style={{
                backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 24, alignItems: "center",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
              }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_600SemiBold", fontSize: 14, textAlign: "center" }}>
                  No History Yet
                </Text>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", marginTop: 4, opacity: 0.6 }}>
                  Complete your first week with goals enabled to start tracking.
                </Text>
              </View>
            ) : (
              <View style={{
                backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14,
                borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
              }}>
                {/* Header */}
                <View style={{ flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.1)" }}>
                  <Text style={{ flex: 1, color: "#78350F", fontFamily: "Outfit_700Bold", fontSize: 10 }}>WEEK</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ width: 32, color: "#78350F", fontFamily: "Outfit_700Bold", fontSize: 10, textAlign: "center" }}>Steps</Text>
                    <Text style={{ width: 32, color: "#78350F", fontFamily: "Outfit_700Bold", fontSize: 10, textAlign: "center" }}>Cals</Text>
                    <Text style={{ width: 32, color: "#78350F", fontFamily: "Outfit_700Bold", fontSize: 10, textAlign: "center" }}>Gym</Text>
                    <Text style={{ width: 28, color: "#78350F", fontFamily: "Outfit_700Bold", fontSize: 10, textAlign: "center" }}>All</Text>
                  </View>
                </View>
                {streakData.weekHistory.map((week) => (
                  <WeekHistoryRow key={week.weekStart} week={week} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Workout Heatmap ── */}
        {activeTab === "heatmap" && (
          <View style={{
            marginTop: 16, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
          }}>
            {workoutHistory.length === 0 ? (
              <View style={{ alignItems: "center", padding: 24 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_600SemiBold", fontSize: 14, textAlign: "center" }}>
                  No Workouts Logged
                </Text>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", marginTop: 4, opacity: 0.6 }}>
                  Start logging workouts to see your activity heatmap.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/log-workout" as any)}
                  style={{
                    marginTop: 16, backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 20, paddingVertical: 10,
                    borderRadius: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
                  }}
                >
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Log a Workout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <WorkoutHeatmap workoutHistory={workoutHistory} />
            )}
          </View>
        )}

        {/* ── Navigation Link ── */}
        <TouchableOpacity
          onPress={() => router.push("/weekly-goals" as any)}
          style={{
            marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "center",
            gap: 6, paddingVertical: 14, backgroundColor: "rgba(245,158,11,0.06)",
            borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.1)",
          }}
        >
          <MaterialIcons name="flag" size={16} color="#F59E0B" />
          <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Edit Weekly Goals</Text>
          <MaterialIcons name="chevron-right" size={16} color="#F59E0B" />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
