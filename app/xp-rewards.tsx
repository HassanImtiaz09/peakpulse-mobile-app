/**
 * XP Rewards Screen
 *
 * Dedicated screen showing:
 *   - Current level, XP bar, and level title
 *   - Badge collection grid (earned / locked)
 *   - Level milestones roadmap with progress
 *   - Full XP history log
 *
 * Accessible by tapping the XP bar on the Home tab.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { ShareMilestoneButton } from "@/components/share-milestone-button";
import { useXP } from "@/lib/xp-context";
import { buildLevelUpShareData, buildBadgeShareData } from "@/lib/milestone-share";
import {
  LEVEL_TITLES,
  STREAK_BADGE_DEFS,
  XP_REWARDS,
  getXPForLevel,
  getLevelFromXP,
  getLevelInfo,
  getLevelTitle,
  loadXPHistory,
  type XPHistoryEntry,
  type StreakBadge,
} from "@/lib/xp-engine";

// ── Colors ──────────────────────────────────────────────────────────────
const BG = "#0A0A0F";
const SURFACE = "#111827";
const SURFACE2 = "#1A1F2E";
const GOLD = "#F59E0B";
const GOLD_DIM = "rgba(245,158,11,0.12)";
const GOLD_BORDER = "rgba(245,158,11,0.25)";
const FG = "#F1F5F9";
const MUTED = "#64748B";
const BORDER = "rgba(30,41,59,0.6)";
const LOCKED = "#374151";
const LOCKED_TEXT = "#4B5563";

// ── Action Icon Map ─────────────────────────────────────────────────────
const ACTION_ICONS: Record<string, string> = {
  meal_logged: "restaurant",
  workout_completed: "fitness-center",
  progress_photo: "camera-alt",
  body_scan: "monitor-weight",
  daily_checkin: "check-circle",
  streak_day: "local-fire-department",
  streak_milestone: "military-tech",
  first_meal_of_day: "wb-sunny",
  all_macros_hit: "verified",
  weekly_goal_met: "emoji-events",
};

export default function XPRewardsScreen() {
  const router = useRouter();
  const { state, refresh } = useXP();
  const [fullHistory, setFullHistory] = useState<XPHistoryEntry[]>([]);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    refresh();
    loadXPHistory(100).then(setFullHistory).catch(() => {});
  }, []);

  useEffect(() => {
    if (state?.levelInfo) {
      progressWidth.value = withTiming(state.levelInfo.progress, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [state?.levelInfo?.progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  if (!state) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading XP data...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const { levelInfo, data, badges } = state;
  const allBadges = STREAK_BADGE_DEFS.map((def) => ({
    ...def,
    earned: data.earnedBadges.includes(def.days),
  }));

  // Build level milestones
  const milestoneLevels = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => a - b);

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      containerClassName="bg-background"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <MaterialIcons name="arrow-back" size={24} color={FG} />
          </Pressable>
          <Text style={styles.headerTitle}>XP Rewards</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Level Hero Card ── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroCard}>
          <View style={styles.levelCircle}>
            <Text style={styles.levelNumber}>{levelInfo.level}</Text>
            <Text style={styles.levelLabel}>LEVEL</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{levelInfo.title}</Text>
            <Text style={styles.heroXP}>{data.totalXP.toLocaleString()} XP</Text>
            <View style={styles.heroProgressTrack}>
              <Animated.View style={[styles.heroProgressFill, progressStyle]} />
            </View>
            <Text style={styles.heroProgressLabel}>
              {data.totalXP - levelInfo.minXP} / {levelInfo.maxXP - levelInfo.minXP} XP to Level {levelInfo.level + 1}
            </Text>
            <View style={{ marginTop: 8 }}>
              <ShareMilestoneButton
                label="Share Level"
                color={GOLD}
                data={buildLevelUpShareData(
                  levelInfo.level,
                  levelInfo.title,
                  data.totalXP,
                  data.dailyStreak,
                )}
              />
            </View>
          </View>
        </Animated.View>

        {/* ── Daily Streak ── */}
        <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.streakCard}>
          <View style={styles.streakIcon}>
            <Text style={{ fontSize: 28 }}>🔥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>{data.dailyStreak}-Day Streak</Text>
            <Text style={styles.streakSubtitle}>
              {data.dailyStreak > 0
                ? `Keep going! Next badge at ${getNextBadgeMilestone(data.dailyStreak, data.earnedBadges)} days.`
                : "Log a meal or workout to start your streak!"}
            </Text>
          </View>
        </Animated.View>

        {/* ── Badge Collection ── */}
        <Animated.View entering={FadeIn.duration(400).delay(200)}>
          <Text style={styles.sectionTitle}>Badge Collection</Text>
          <View style={styles.badgeGrid}>
            {allBadges.map((badge) => (
              <View
                key={badge.days}
                style={[
                  styles.badgeCard,
                  badge.earned
                    ? { borderColor: badge.color, backgroundColor: `${badge.color}10` }
                    : { borderColor: LOCKED, backgroundColor: SURFACE },
                ]}
              >
                <View
                  style={[
                    styles.badgeIconCircle,
                    { backgroundColor: badge.earned ? `${badge.color}20` : LOCKED },
                  ]}
                >
                  <MaterialIcons
                    name={badge.icon as any}
                    size={24}
                    color={badge.earned ? badge.color : LOCKED_TEXT}
                  />
                </View>
                <Text
                  style={[
                    styles.badgeName,
                    { color: badge.earned ? FG : LOCKED_TEXT },
                  ]}
                >
                  {badge.name}
                </Text>
                <Text
                  style={[
                    styles.badgeDays,
                    { color: badge.earned ? badge.color : LOCKED_TEXT },
                  ]}
                >
                  {badge.days}-day streak
                </Text>
                {badge.earned && (
                  <View style={styles.badgeActions}>
                    <View style={[styles.earnedTag, { backgroundColor: `${badge.color}20` }]}>
                      <MaterialIcons name="check-circle" size={12} color={badge.color} />
                      <Text style={[styles.earnedText, { color: badge.color }]}>Earned</Text>
                    </View>
                    <ShareMilestoneButton
                      compact
                      color={badge.color}
                      data={buildBadgeShareData(
                        badge.days,
                        badge.name,
                        badge.color,
                        badge.icon,
                        data.totalXP,
                        data.dailyStreak,
                      )}
                    />
                  </View>
                )}
                {!badge.earned && (
                  <View style={styles.lockedTag}>
                    <MaterialIcons name="lock" size={12} color={LOCKED_TEXT} />
                    <Text style={styles.lockedText}>Locked</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Level Milestones ── */}
        <Animated.View entering={FadeIn.duration(400).delay(300)}>
          <Text style={styles.sectionTitle}>Level Milestones</Text>
          <View style={styles.milestonesContainer}>
            {milestoneLevels.map((lvl, idx) => {
              const reached = levelInfo.level >= lvl;
              const isCurrent = levelInfo.level >= lvl && (idx === milestoneLevels.length - 1 || levelInfo.level < milestoneLevels[idx + 1]);
              const xpNeeded = getXPForLevel(lvl);
              return (
                <View key={lvl} style={styles.milestoneRow}>
                  {/* Timeline line */}
                  <View style={styles.timelineCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        reached
                          ? { backgroundColor: GOLD, borderColor: GOLD }
                          : { backgroundColor: LOCKED, borderColor: LOCKED },
                        isCurrent && { borderColor: GOLD, borderWidth: 3, backgroundColor: BG },
                      ]}
                    />
                    {idx < milestoneLevels.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: reached ? GOLD_DIM : LOCKED },
                        ]}
                      />
                    )}
                  </View>
                  {/* Content */}
                  <View
                    style={[
                      styles.milestoneContent,
                      isCurrent && { borderColor: GOLD_BORDER, backgroundColor: GOLD_DIM },
                    ]}
                  >
                    <View style={styles.milestoneHeader}>
                      <Text style={[styles.milestoneLevel, reached && { color: GOLD }]}>
                        Level {lvl}
                      </Text>
                      <Text style={[styles.milestoneTitle, reached && { color: FG }]}>
                        {LEVEL_TITLES[lvl]}
                      </Text>
                    </View>
                    <Text style={styles.milestoneXP}>
                      {xpNeeded.toLocaleString()} XP
                      {reached && " ✓"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── XP Actions Reference ── */}
        <Animated.View entering={FadeIn.duration(400).delay(400)}>
          <Text style={styles.sectionTitle}>How to Earn XP</Text>
          <View style={styles.actionsCard}>
            {Object.entries(XP_REWARDS)
              .filter(([key]) => key !== "streak_day" && key !== "streak_milestone")
              .map(([key, reward]) => (
                <View key={key} style={styles.actionRow}>
                  <View style={styles.actionIconWrap}>
                    <MaterialIcons
                      name={(ACTION_ICONS[key] || "star") as any}
                      size={18}
                      color={GOLD}
                    />
                  </View>
                  <Text style={styles.actionLabel}>{reward.label}</Text>
                  <Text style={styles.actionXP}>+{reward.xp} XP</Text>
                </View>
              ))}
          </View>
        </Animated.View>

        {/* ── XP History ── */}
        <Animated.View entering={FadeIn.duration(400).delay(500)}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {fullHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <MaterialIcons name="history" size={32} color={MUTED} />
              <Text style={styles.emptyHistoryText}>
                No XP earned yet. Start logging meals or completing workouts!
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {fullHistory.slice(0, 30).map((entry, idx) => {
                const date = new Date(entry.timestamp);
                const timeStr = formatRelativeTime(date);
                return (
                  <View key={`${entry.timestamp}-${idx}`} style={styles.historyRow}>
                    <View style={styles.historyIconWrap}>
                      <MaterialIcons
                        name={(ACTION_ICONS[entry.action] || "star") as any}
                        size={16}
                        color={GOLD}
                      />
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyLabel}>{entry.label}</Text>
                      <Text style={styles.historyTime}>{timeStr}</Text>
                    </View>
                    <Text style={styles.historyXP}>+{entry.xp}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getNextBadgeMilestone(currentStreak: number, earnedBadges: number[]): number {
  const milestones = [3, 7, 14, 30, 60, 100];
  for (const m of milestones) {
    if (!earnedBadges.includes(m) && currentStreak < m) return m;
  }
  return 100;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: MUTED, fontSize: 14, fontFamily: "DMSans_400Regular" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: FG, fontSize: 18, fontFamily: "DMSans_700Bold" },

  // Hero Card
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    marginBottom: 14,
    gap: 16,
  },
  levelCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: GOLD_DIM,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNumber: { color: GOLD, fontSize: 24, fontFamily: "DMSans_700Bold", lineHeight: 28 },
  levelLabel: { color: GOLD, fontSize: 9, fontFamily: "DMSans_600SemiBold", letterSpacing: 1.5 },
  heroInfo: { flex: 1 },
  heroTitle: { color: FG, fontSize: 18, fontFamily: "DMSans_700Bold" },
  heroXP: { color: GOLD, fontSize: 13, fontFamily: "DMSans_600SemiBold", marginTop: 2 },
  heroProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(245,158,11,0.10)",
    overflow: "hidden",
    marginTop: 8,
  },
  heroProgressFill: { height: 8, borderRadius: 4, backgroundColor: GOLD },
  heroProgressLabel: { color: MUTED, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 4 },

  // Streak Card
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
    gap: 12,
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakTitle: { color: FG, fontSize: 16, fontFamily: "DMSans_700Bold" },
  streakSubtitle: { color: MUTED, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 },

  // Section
  sectionTitle: {
    color: FG,
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    marginBottom: 12,
    marginTop: 4,
  },

  // Badge Grid
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  badgeCard: {
    width: "47%" as any,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: { fontSize: 14, fontFamily: "DMSans_700Bold" },
  badgeDays: { fontSize: 11, fontFamily: "DMSans_400Regular" },
  badgeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  earnedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  earnedText: { fontSize: 10, fontFamily: "DMSans_600SemiBold" },
  lockedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(55,65,81,0.3)",
  },
  lockedText: { color: LOCKED_TEXT, fontSize: 10, fontFamily: "DMSans_600SemiBold" },

  // Milestones
  milestonesContainer: { marginBottom: 20 },
  milestoneRow: { flexDirection: "row", minHeight: 56 },
  timelineCol: { width: 32, alignItems: "center" },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginTop: 4,
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },
  milestoneContent: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 8,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  milestoneHeader: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  milestoneLevel: { color: MUTED, fontSize: 12, fontFamily: "DMSans_700Bold" },
  milestoneTitle: { color: MUTED, fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  milestoneXP: { color: MUTED, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 4 },

  // Actions Reference
  actionsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
    gap: 10,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: GOLD_DIM,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { flex: 1, color: FG, fontSize: 13, fontFamily: "DMSans_500Medium" },
  actionXP: { color: GOLD, fontSize: 13, fontFamily: "DMSans_700Bold" },

  // History
  emptyHistory: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 20,
  },
  emptyHistoryText: { color: MUTED, fontSize: 13, fontFamily: "DMSans_400Regular", textAlign: "center" },
  historyList: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    marginBottom: 20,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    gap: 10,
  },
  historyIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: GOLD_DIM,
    alignItems: "center",
    justifyContent: "center",
  },
  historyContent: { flex: 1 },
  historyLabel: { color: FG, fontSize: 13, fontFamily: "DMSans_500Medium" },
  historyTime: { color: MUTED, fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 1 },
  historyXP: { color: GOLD, fontSize: 13, fontFamily: "DMSans_700Bold" },
});
