/**
 * Challenge Screen — 7-day step or calorie duels between friends.
 *
 * Tabs: Active, Completed, New Challenge
 * Shows progress comparison, winner announcements, and challenge stats.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert, FlatList,
  ActivityIndicator, ImageBackground, StyleSheet, Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGuestAuth } from "@/lib/guest-auth";
import {
  loadOrCreateDemoChallenges,
  createChallenge,
  getChallengeStats,
  getActiveChallenges,
  getCompletedChallenges,
  getChallengeTypeLabel,
  getChallengeTypeEmoji,
  getChallengeTypeUnit,
  formatChallengeValue,
  getDaysRemaining,
  getProgressPercentage,
  type Challenge,
  type ChallengeType,
  type ChallengeStats,
} from "@/lib/challenge-service";
import {
  loadOrCreateSocialCircle,
  type FriendProfile,
} from "@/lib/social-circle";

const HERO_BG = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80";

type TabId = "active" | "completed" | "new";

export default function ChallengeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ friendId?: string; friendName?: string; friendEmoji?: string }>();
  const { guestProfile } = useGuestAuth();
  const [activeTab, setActiveTab] = useState<TabId>(params.friendId ? "new" : "active");
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // New challenge form
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [selectedType, setSelectedType] = useState<ChallengeType>("steps");
  const [showFriendPicker, setShowFriendPicker] = useState(false);

  const userName = guestProfile?.name ?? "You";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await loadOrCreateDemoChallenges(userName);
      const [active, completed, challengeStats, circleData] = await Promise.all([
        getActiveChallenges(),
        getCompletedChallenges(),
        getChallengeStats(),
        loadOrCreateSocialCircle(userName),
      ]);
      setActiveChallenges(active);
      setCompletedChallenges(completed);
      setStats(challengeStats);
      setFriends(circleData.friends);

      // Pre-select friend if passed via params
      if (params.friendId && circleData.friends.length > 0) {
        const friend = circleData.friends.find((f) => f.id === params.friendId);
        if (friend) setSelectedFriend(friend);
      }
    } catch (e) {
      console.warn("[Challenge] Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [userName, params.friendId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateChallenge = async () => {
    if (!selectedFriend || creating) return;
    setCreating(true);
    try {
      await createChallenge(
        selectedType,
        userName,
        selectedFriend.id,
        selectedFriend.name,
        selectedFriend.avatarEmoji,
      );
      Alert.alert(
        "Challenge Sent!",
        `You challenged ${selectedFriend.name} to a 7-day ${selectedType} duel!`,
        [{ text: "Let's Go!", onPress: () => { setActiveTab("active"); loadData(); } }],
      );
    } catch {
      Alert.alert("Error", "Failed to create challenge. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // ── Render Helpers ────────────────────────────────────────────

  const renderChallengeCard = (challenge: Challenge, isCompleted: boolean) => {
    const isWinner = challenge.winnerId === "current_user";
    const isDraw = challenge.winnerId === null && isCompleted;
    const daysLeft = getDaysRemaining(challenge.endDate);
    const userPct = getProgressPercentage(challenge.challenger.total, challenge.opponent.total);
    const oppPct = getProgressPercentage(challenge.opponent.total, challenge.challenger.total);

    return (
      <View key={challenge.id} style={[styles.challengeCard, isCompleted && isWinner && styles.challengeCardWon]}>
        {/* Header */}
        <View style={styles.challengeHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 20 }}>{getChallengeTypeEmoji(challenge.type)}</Text>
            <View>
              <Text style={styles.challengeType}>{getChallengeTypeLabel(challenge.type)}</Text>
              <Text style={styles.challengeDays}>
                {isCompleted
                  ? (isWinner ? "🏆 You Won!" : isDraw ? "🤝 Draw" : "😤 You Lost")
                  : `${daysLeft} days left`
                }
              </Text>
            </View>
          </View>
          {!isCompleted && (
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>Day {challenge.dayIndex + 1}/7</Text>
            </View>
          )}
        </View>

        {/* VS Section */}
        <View style={styles.vsSection}>
          {/* Challenger (You) */}
          <View style={styles.participant}>
            <Text style={{ fontSize: 28 }}>{challenge.challenger.avatarEmoji}</Text>
            <Text style={styles.participantName} numberOfLines={1}>You</Text>
            <Text style={styles.participantScore}>
              {formatChallengeValue(challenge.type, challenge.challenger.total)}
            </Text>
          </View>

          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Opponent */}
          <View style={styles.participant}>
            <Text style={{ fontSize: 28 }}>{challenge.opponent.avatarEmoji}</Text>
            <Text style={styles.participantName} numberOfLines={1}>{challenge.opponent.name}</Text>
            <Text style={styles.participantScore}>
              {formatChallengeValue(challenge.type, challenge.opponent.total)}
            </Text>
          </View>
        </View>

        {/* Progress Bars */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${userPct}%`, backgroundColor: "#F59E0B" }]} />
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${oppPct}%`, backgroundColor: "#EF4444" }]} />
          </View>
        </View>

        {/* Daily Breakdown */}
        <View style={styles.dailyRow}>
          {challenge.challenger.dailyProgress.map((val, i) => {
            const oppVal = challenge.opponent.dailyProgress[i];
            const isToday = i === challenge.dayIndex && !isCompleted;
            const userWon = val > oppVal;
            return (
              <View key={i} style={[styles.dayCell, isToday && styles.dayCellToday]}>
                <Text style={styles.dayLabel}>D{i + 1}</Text>
                <Text style={[styles.dayValue, userWon && { color: "#F59E0B" }]}>
                  {val > 0 ? (challenge.type === "steps" ? `${(val / 1000).toFixed(0)}K` : val.toString()) : "-"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Main Render ───────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0E14" }}>
      {/* Hero */}
      <ImageBackground source={{ uri: HERO_BG }} style={{ height: 170 }} resizeMode="cover">
        <View style={styles.heroOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={{ color: "#F1F5F9", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroLabel}>CHALLENGES</Text>
          <Text style={styles.heroTitle}>Friend Duels</Text>
          {stats && (
            <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
              <Text style={styles.heroStat}>⚔️ {stats.totalChallenges} total</Text>
              <Text style={styles.heroStat}>🏆 {stats.wins} wins</Text>
              <Text style={styles.heroStat}>🔥 {stats.currentWinStreak} streak</Text>
            </View>
          )}
        </View>
      </ImageBackground>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(["active", "completed", "new"] as TabId[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "active" ? `⚔️ Active (${activeChallenges.length})`
                : tab === "completed" ? `🏆 History (${completedChallenges.length})`
                : "➕ New"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* ── Active Tab ──────────────────────────────────────── */}
          {activeTab === "active" && (
            <>
              {activeChallenges.length > 0 ? (
                activeChallenges.map((c) => renderChallengeCard(c, false))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>⚔️</Text>
                  <Text style={styles.emptyTitle}>No active challenges</Text>
                  <Text style={styles.emptySubtitle}>
                    Challenge a friend to a 7-day step or calorie duel!
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setActiveTab("new")}>
                    <Text style={styles.primaryBtnText}>Start a Challenge</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ── Completed Tab ───────────────────────────────────── */}
          {activeTab === "completed" && (
            <>
              {/* Stats Summary */}
              {stats && stats.totalChallenges > 0 && (
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.wins}</Text>
                    <Text style={styles.statLabel}>Wins</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.losses}</Text>
                    <Text style={styles.statLabel}>Losses</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.draws}</Text>
                    <Text style={styles.statLabel}>Draws</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.longestWinStreak}</Text>
                    <Text style={styles.statLabel}>Best Streak</Text>
                  </View>
                </View>
              )}

              {completedChallenges.length > 0 ? (
                completedChallenges.map((c) => renderChallengeCard(c, true))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text>
                  <Text style={styles.emptyTitle}>No completed challenges</Text>
                  <Text style={styles.emptySubtitle}>Your challenge history will appear here.</Text>
                </View>
              )}
            </>
          )}

          {/* ── New Challenge Tab ───────────────────────────────── */}
          {activeTab === "new" && (
            <>
              <Text style={styles.sectionTitle}>Create a Challenge</Text>
              <Text style={styles.sectionSubtitle}>
                Challenge a friend to a 7-day duel. The person with the highest total at the end wins!
              </Text>

              {/* Challenge Type */}
              <Text style={styles.fieldLabel}>Challenge Type</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {(["steps", "calories"] as ChallengeType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeCard, selectedType === type && styles.typeCardActive]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={{ fontSize: 28 }}>{getChallengeTypeEmoji(type)}</Text>
                    <Text style={[styles.typeLabel, selectedType === type && styles.typeLabelActive]}>
                      {getChallengeTypeLabel(type)}
                    </Text>
                    <Text style={styles.typeUnit}>
                      7-day total {getChallengeTypeUnit(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Select Opponent */}
              <Text style={styles.fieldLabel}>Challenge Opponent</Text>
              <TouchableOpacity
                style={styles.friendSelector}
                onPress={() => setShowFriendPicker(true)}
              >
                {selectedFriend ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 24 }}>{selectedFriend.avatarEmoji}</Text>
                    <View>
                      <Text style={styles.friendSelectorName}>{selectedFriend.name}</Text>
                      <Text style={styles.friendSelectorStat}>
                        🔥 {selectedFriend.streakCount}w streak
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.friendSelectorPlaceholder}>Tap to select a friend</Text>
                )}
                <Text style={{ color: "#B45309", fontSize: 18 }}>›</Text>
              </TouchableOpacity>

              {/* Create Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 24 }, (!selectedFriend || creating) && { opacity: 0.5 }]}
                onPress={handleCreateChallenge}
                disabled={!selectedFriend || creating}
              >
                <Text style={styles.primaryBtnText}>
                  {creating ? "Creating..." : `⚔️ Challenge ${selectedFriend?.name ?? "Friend"}`}
                </Text>
              </TouchableOpacity>

              {/* Challenge Rules */}
              <View style={styles.rulesCard}>
                <Text style={styles.rulesTitle}>Challenge Rules</Text>
                {[
                  "Challenges last exactly 7 days from creation",
                  "Both participants track their daily totals",
                  "The person with the highest cumulative total wins",
                  "If totals are equal, it's a draw",
                  "Win streaks are tracked across challenges",
                ].map((rule, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                    <Text style={{ color: "#F59E0B", fontSize: 12 }}>•</Text>
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Friend Picker Modal ──────────────────────────────── */}
      <Modal visible={showFriendPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Opponent</Text>
            {friends.length > 0 ? (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.friendPickerRow, selectedFriend?.id === item.id && styles.friendPickerRowActive]}
                    onPress={() => { setSelectedFriend(item); setShowFriendPicker(false); }}
                  >
                    <Text style={{ fontSize: 24 }}>{item.avatarEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendPickerName}>{item.name}</Text>
                      <Text style={styles.friendPickerStat}>
                        🔥 {item.streakCount}w • 👟 {(item.weeklySteps / 1000).toFixed(0)}K steps
                      </Text>
                    </View>
                    {selectedFriend?.id === item.id && <Text style={{ color: "#F59E0B" }}>✓</Text>}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
              />
            ) : (
              <View style={{ alignItems: "center", padding: 24 }}>
                <Text style={styles.emptyTitle}>No friends in your circle</Text>
                <Text style={styles.emptySubtitle}>Invite friends first to challenge them!</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 16, backgroundColor: "#1A2030" }]}
              onPress={() => setShowFriendPicker(false)}
            >
              <Text style={[styles.primaryBtnText, { color: "#F1F5F9" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heroOverlay: {
    flex: 1, backgroundColor: "rgba(8,8,16,0.78)", justifyContent: "flex-end",
    padding: 20, paddingTop: 52,
  },
  backBtn: {
    position: "absolute", top: 52, left: 20, backgroundColor: "#FFFFFF20",
    borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center",
  },
  heroLabel: { color: "#FDE68A", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: "#F1F5F9", fontSize: 24, fontWeight: "800" },
  heroStat: { color: "#FDE68A", fontSize: 12 },

  tabBar: {
    flexDirection: "row", backgroundColor: "#141A22", borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.10)",
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#F59E0B" },
  tabText: { color: "#B45309", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#FDE68A" },

  sectionTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  sectionSubtitle: { color: "#B45309", fontSize: 13, marginBottom: 16, lineHeight: 18 },
  fieldLabel: { color: "#FDE68A", fontSize: 13, fontWeight: "700", marginBottom: 8, letterSpacing: 0.5 },

  challengeCard: {
    backgroundColor: "#141A22", borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  challengeCardWon: { borderColor: "rgba(16,185,129,0.25)", backgroundColor: "#0A1A0F" },
  challengeHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
  },
  challengeType: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  challengeDays: { color: "#B45309", fontSize: 12, marginTop: 2 },
  dayBadge: {
    backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  dayBadgeText: { color: "#FDE68A", fontSize: 11, fontWeight: "700" },

  vsSection: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
  },
  participant: { alignItems: "center", width: "35%" },
  participantName: { color: "#F1F5F9", fontSize: 13, fontWeight: "700", marginTop: 4 },
  participantScore: { color: "#FDE68A", fontSize: 18, fontWeight: "800", marginTop: 2 },
  vsCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  vsText: { color: "#F59E0B", fontSize: 14, fontWeight: "800" },

  progressSection: { gap: 6, marginBottom: 12 },
  progressBarContainer: {
    height: 8, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 4, overflow: "hidden",
  },
  progressBar: { height: "100%", borderRadius: 4 },

  dailyRow: { flexDirection: "row", gap: 4 },
  dayCell: {
    flex: 1, alignItems: "center", backgroundColor: "rgba(245,158,11,0.04)",
    borderRadius: 8, paddingVertical: 6,
  },
  dayCellToday: { backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)" },
  dayLabel: { color: "#B45309", fontSize: 9, fontWeight: "700" },
  dayValue: { color: "#F1F5F9", fontSize: 10, fontWeight: "700", marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: "#141A22", borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", alignItems: "center",
  },
  statValue: { color: "#FDE68A", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#B45309", fontSize: 10, marginTop: 2 },

  emptyState: {
    alignItems: "center", padding: 32, backgroundColor: "#141A22",
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  emptyTitle: { color: "#F1F5F9", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  emptySubtitle: { color: "#B45309", fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 16 },

  primaryBtn: {
    backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, alignItems: "center",
  },
  primaryBtnText: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },

  typeCard: {
    flex: 1, backgroundColor: "#141A22", borderRadius: 16, padding: 16,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  typeCardActive: { borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.08)" },
  typeLabel: { color: "#F1F5F9", fontSize: 14, fontWeight: "700", marginTop: 8 },
  typeLabelActive: { color: "#FDE68A" },
  typeUnit: { color: "#B45309", fontSize: 11, marginTop: 4 },

  friendSelector: {
    backgroundColor: "#141A22", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  friendSelectorName: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  friendSelectorStat: { color: "#B45309", fontSize: 12, marginTop: 2 },
  friendSelectorPlaceholder: { color: "#B45309", fontSize: 14 },

  rulesCard: {
    marginTop: 20, backgroundColor: "#141A22", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.08)",
  },
  rulesTitle: { color: "#FDE68A", fontSize: 14, fontWeight: "700", marginBottom: 10 },
  ruleText: { color: "#D1D5DB", fontSize: 12, lineHeight: 16, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#141A22", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: "70%",
  },
  modalTitle: { color: "#F1F5F9", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  friendPickerRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    backgroundColor: "rgba(245,158,11,0.04)", borderRadius: 14,
  },
  friendPickerRowActive: { backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "#F59E0B" },
  friendPickerName: { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  friendPickerStat: { color: "#B45309", fontSize: 12, marginTop: 2 },
});
