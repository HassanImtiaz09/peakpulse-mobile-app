/**
 * Streak Details Screen
 *
 * Full streak history, milestone gallery, and weekly goal completion log.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, ImageBackground, FlatList, Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  getStreakData, getCurrentMilestone, getNextMilestone, getWeeksToNextMilestone,
  getStreakEmoji, getStreakLabel, getStreakMotivation, getMilestoneProgress,
  MILESTONE_TIERS, type StreakData, type MilestoneTier, type WeekResult,
} from "@/lib/streak-tracking";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// ── Milestone Card ────────────────────────────────────────────────

function MilestoneCard({ tier, unlocked, unlockedAt, streakAtUnlock }: {
  tier: MilestoneTier;
  unlocked: boolean;
  unlockedAt?: string;
  streakAtUnlock?: number;
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
            <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 4 }}>
              Unlocked {new Date(unlockedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {streakAtUnlock ? ` at ${streakAtUnlock}-week streak` : ""}
            </Text>
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
        <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>
          {weekDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </Text>
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
          backgroundColor: week.allGoalsMet ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)",
        }}>
          <Text style={{ fontSize: 14 }}>{week.allGoalsMet ? "🔥" : "❌"}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────

export default function StreakDetailsScreen() {
  const router = useRouter();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [activeTab, setActiveTab] = useState<"milestones" | "history">("milestones");

  useEffect(() => {
    (async () => {
      const data = await getStreakData();
      setStreakData(data);
    })();
  }, []);

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

        {/* ── Tab Selector ── */}
        <View style={{
          flexDirection: "row", marginTop: 20, backgroundColor: "rgba(255,255,255,0.03)",
          borderRadius: 12, padding: 3,
        }}>
          {(["milestones", "history"] as const).map((tab) => (
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
                fontFamily: activeTab === tab ? "Outfit_700Bold" : "DMSans_400Regular", fontSize: 13,
              }}>
                {tab === "milestones" ? "Milestones" : "Week History"}
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
