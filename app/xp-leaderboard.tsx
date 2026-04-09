/**
 * XP Leaderboard — Weekly/Monthly/All-Time leaderboard comparing
 * user's XP against anonymized community averages.
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ImageBackground, Platform, ActivityIndicator, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { GOLDEN_SOCIAL, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI, C } from "@/constants/ui-colors";
import { useXP } from "@/lib/xp-context";
import {
  getLeaderboard,
  getLeaderboardInsight,
  type LeaderboardData,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardInsight,
} from "@/lib/xp-leaderboard";

// ── Period Tabs ──────────────────────────────────────────────────────────

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "weekly", label: "This Week" },
  { id: "monthly", label: "This Month" },
  { id: "all_time", label: "All Time" },
];

export default function XPLeaderboardScreen() {
  const router = useRouter();
  const { state } = useXP();
  const userXP = state?.data.totalXP ?? 0;
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [insight, setInsight] = useState<LeaderboardInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const lb = await getLeaderboard(period, userXP, "You");
        if (mounted) {
          setData(lb);
          setInsight(getLeaderboardInsight(lb, userXP));
        }
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [period, userXP]);

  const handlePeriodChange = useCallback((p: LeaderboardPeriod) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(p);
  }, []);

  const renderEntry = useCallback(({ item }: { item: LeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;
    const rankEmoji = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : null;

    return (
      <View style={[
        styles.entryRow,
        item.isCurrentUser && styles.entryRowUser,
        isTop3 && styles.entryRowTop3,
      ]}>
        {/* Rank */}
        <View style={styles.rankCol}>
          {rankEmoji ? (
            <Text style={{ fontSize: 20 }}>{rankEmoji}</Text>
          ) : (
            <Text style={[styles.rankText, item.isCurrentUser && styles.rankTextUser]}>
              {item.rank}
            </Text>
          )}
        </View>

        {/* Avatar + Name */}
        <View style={styles.nameCol}>
          <Text style={{ fontSize: 20 }}>{item.avatar}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.entryName, item.isCurrentUser && styles.entryNameUser]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.entryLevel}>Lv. {item.level}</Text>
          </View>
        </View>

        {/* XP */}
        <View style={styles.xpCol}>
          <Text style={[styles.entryXP, item.isCurrentUser && styles.entryXPUser]}>
            {item.xp.toLocaleString()}
          </Text>
          <Text style={styles.entryXPLabel}>XP</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <ImageBackground source={{ uri: GOLDEN_SOCIAL }} style={{ flex: 1 }} resizeMode="cover">
      <View style={GOLDEN_OVERLAY_STYLE}>
        <ScreenContainer edges={["top", "left", "right"]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color={C.fg} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Leaderboard</Text>
              <Text style={styles.headerSub}>See how you compare</Text>
            </View>
          </View>

          {/* Period Tabs */}
          <View style={styles.periodBar}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.periodTab, period === p.id && styles.periodTabActive]}
                onPress={() => handlePeriodChange(p.id)}
              >
                <Text style={[styles.periodText, period === p.id && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={C.gold} />
            </View>
          ) : data ? (
            <FlatList
              data={data.entries}
              renderItem={renderEntry}
              keyExtractor={(item) => `${item.rank}-${item.name}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListHeaderComponent={() => (
                <View>
                  {/* User Stats Card */}
                  <View style={styles.statsCard}>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>#{data.userRank}</Text>
                        <Text style={styles.statLabel}>Your Rank</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>Top {Math.max(1, 100 - data.userPercentile)}%</Text>
                        <Text style={styles.statLabel}>Percentile</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{userXP.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Your XP</Text>
                      </View>
                    </View>

                    {/* Community Averages */}
                    <View style={styles.avgRow}>
                      <View style={styles.avgItem}>
                        <Text style={styles.avgLabel}>Community Avg</Text>
                        <Text style={styles.avgValue}>{data.communityAvg.toLocaleString()} XP</Text>
                      </View>
                      <View style={styles.avgItem}>
                        <Text style={styles.avgLabel}>Community Median</Text>
                        <Text style={styles.avgValue}>{data.communityMedian.toLocaleString()} XP</Text>
                      </View>
                      <View style={styles.avgItem}>
                        <Text style={styles.avgLabel}>Participants</Text>
                        <Text style={styles.avgValue}>{data.totalParticipants}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Insight Banner */}
                  {insight && (
                    <View style={[
                      styles.insightBanner,
                      insight.type === "top" && styles.insightTop,
                      insight.type === "ahead" && styles.insightAhead,
                      insight.type === "behind" && styles.insightBehind,
                    ]}>
                      <Text style={{ fontSize: 24 }}>{insight.emoji}</Text>
                      <Text style={styles.insightText}>{insight.message}</Text>
                    </View>
                  )}

                  {/* Rankings Header */}
                  <View style={styles.rankingsHeader}>
                    <Text style={styles.rankingsTitle}>Rankings</Text>
                    <Text style={styles.rankingsCount}>{data.totalParticipants} participants</Text>
                  </View>
                </View>
              )}
            />
          ) : null}
        </ScreenContainer>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 12, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: UI.goldAlpha10, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: C.fg, fontSize: 20, fontWeight: "800" },
  headerSub: { color: C.muted, fontSize: 11, marginTop: 1 },
  // Period Tabs
  periodBar: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.surface, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: C.border,
  },
  periodTab: {
    flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: UI.borderGold,
  },
  periodText: { color: C.muted, fontSize: 13, fontWeight: "600" },
  periodTextActive: { color: C.gold, fontWeight: "700" },
  // Stats Card
  statsCard: {
    marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
  },
  statItem: { alignItems: "center" },
  statValue: { color: C.gold, fontSize: 20, fontWeight: "800" },
  statLabel: { color: C.muted, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: C.border },
  avgRow: {
    flexDirection: "row", justifyContent: "space-around", marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  avgItem: { alignItems: "center" },
  avgLabel: { color: C.muted, fontSize: 10 },
  avgValue: { color: C.fg, fontSize: 12, fontWeight: "700", marginTop: 2 },
  // Insight Banner
  insightBanner: {
    flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  insightTop: { borderColor: "#F59E0B40" },
  insightAhead: { borderColor: "#22C55E40" },
  insightBehind: { borderColor: "#3B82F640" },
  insightText: { flex: 1, color: C.fg, fontSize: 13, lineHeight: 18 },
  // Rankings Header
  rankingsHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 8,
  },
  rankingsTitle: { color: C.fg, fontSize: 16, fontWeight: "700" },
  rankingsCount: { color: C.muted, fontSize: 12 },
  // Entry Row
  entryRow: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16,
    backgroundColor: C.surface, borderRadius: 12, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: C.border,
  },
  entryRowUser: {
    backgroundColor: UI.dim, borderColor: UI.goldAlpha30,
  },
  entryRowTop3: {
    borderColor: UI.goldAlpha20,
  },
  rankCol: { width: 36, alignItems: "center" },
  rankText: { color: C.muted, fontSize: 14, fontWeight: "700" },
  rankTextUser: { color: C.gold },
  nameCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 4 },
  entryName: { color: C.fg, fontSize: 14, fontWeight: "600" },
  entryNameUser: { color: C.gold, fontWeight: "800" },
  entryLevel: { color: C.muted, fontSize: 11, marginTop: 1 },
  xpCol: { alignItems: "flex-end", marginLeft: 8 },
  entryXP: { color: C.fg, fontSize: 15, fontWeight: "700" },
  entryXPUser: { color: C.gold },
  entryXPLabel: { color: C.muted, fontSize: 10 },
});
