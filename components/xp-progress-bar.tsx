/**
 * XPProgressBar — Compact XP level bar for the Home tab hero section.
 * Shows current level, XP progress within level, and streak badges.
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useXP } from "@/lib/xp-context";
import { STREAK_BADGE_DEFS } from "@/lib/xp-engine";
import { UI } from "@/constants/ui-colors";

const GOLD = UI.gold;
const GOLD_DIM = UI.goldAlpha12;
const FG = UI.fg;
const MUTED = "#64748B";
const SURFACE = "#111827";
const BORDER = UI.border;

export function XPProgressBar() {
  const { state } = useXP();
  const router = useRouter();
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (state?.levelInfo) {
      progressWidth.value = withTiming(state.levelInfo.progress, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [state?.levelInfo?.progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  if (!state) return null;

  const { levelInfo, data, badges } = state;
  const earnedBadges = badges.filter((b) => data.earnedBadges.includes(b.days));

  return (
    <Pressable
      onPress={() => router.push("/xp-rewards" as any)}
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Level + XP row */}
      <View style={styles.headerRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv.{levelInfo.level}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>{levelInfo.title}</Text>
            <Text style={styles.xpText}>
              {data.totalXP} XP
            </Text>
          </View>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round(levelInfo.progress * 100)}% to Lv.{levelInfo.level + 1}
          </Text>
        </View>
      </View>

      {/* Streak + Badges row */}
      {(data.dailyStreak > 0 || earnedBadges.length > 0) && (
        <View style={styles.badgeRow}>
          {data.dailyStreak > 0 && (
            <View style={styles.streakChip}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{data.dailyStreak}d streak</Text>
            </View>
          )}
          {earnedBadges.slice(-3).map((badge) => (
            <View key={badge.days} style={styles.badgeChip}>
              <Text style={styles.badgeEmoji}>{badge.icon}</Text>
              <Text style={styles.badgeLabel}>{badge.name}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: GOLD_DIM,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: UI.borderGold2,
  },
  levelText: {
    color: GOLD,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  titleText: {
    color: FG,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  xpText: {
    color: GOLD,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: UI.goldAlpha10,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  progressLabel: {
    color: MUTED,
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239,68,68,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakText: {
    color: UI.red,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GOLD_DIM,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeLabel: {
    color: GOLD,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
});
