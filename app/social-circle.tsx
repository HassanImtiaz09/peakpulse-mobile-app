import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert, FlatList,
  ActivityIndicator, ImageBackground, StyleSheet, Modal, TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useGuestAuth } from "@/lib/guest-auth";
import { useWearable } from "@/lib/wearable-context";
import {
  loadOrCreateSocialCircle,
  shareCircleInvite,
  recordInviteSent,
  removeFriend,
  buildLeaderboard,
  getActiveFriendsCount,
  getCircleStats,
  getDiscountData,
  getMetricDisplay,
  timeAgo,
  type SocialCircleData,
  type FriendProfile,
  type LeaderboardMetric,
  type LeaderboardEntry,
  type DiscountData,
  DISCOUNT_TIERS,
} from "@/lib/social-circle";
import {
  getStreakData,
  type StreakData,
} from "@/lib/streak-tracking";
import { calculateWeeklyProgress, getWeeklyGoals, type WeeklyProgress, type WeeklyGoals } from "@/lib/goal-tracking";

const HERO_BG = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80";

type TabId = "circle" | "leaderboard" | "invite";

const METRIC_OPTIONS: { id: LeaderboardMetric; label: string; emoji: string }[] = [
  { id: "streak", label: "Streak", emoji: "🔥" },
  { id: "steps", label: "Steps", emoji: "👟" },
  { id: "calories", label: "Calories", emoji: "🔥" },
  { id: "workouts", label: "Workouts", emoji: "💪" },
  { id: "distance", label: "Distance", emoji: "📏" },
];

export default function SocialCircleScreen() {
  const router = useRouter();
  const { guestProfile } = useGuestAuth();
  const { stats: wearableData } = useWearable();
  const [activeTab, setActiveTab] = useState<TabId>("circle");
  const [circleData, setCircleData] = useState<SocialCircleData | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [discountData, setDiscountData] = useState<DiscountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboardMetric, setLeaderboardMetric] = useState<LeaderboardMetric>("streak");
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const name = guestProfile?.name ?? "User";
      const [circle, streak, goals, discounts] = await Promise.all([
        loadOrCreateSocialCircle(name),
        getStreakData(),
        getWeeklyGoals(),
        getDiscountData(),
      ]);
      const progress = goals ? calculateWeeklyProgress(goals, {
        avgDailySteps: wearableData.steps,
        avgDailyCalories: wearableData.totalCaloriesBurnt,
        workoutsThisWeek: 0,
      }) : null;
      setCircleData(circle);
      setStreakData(streak);
      setWeeklyProgress(progress);
      setDiscountData(discounts);
    } catch (e) {
      console.warn("[SocialCircle] Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [guestProfile?.name]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleShare = async () => {
    if (!circleData || sharing) return;
    setSharing(true);
    try {
      await shareCircleInvite(circleData.circleCode, guestProfile?.name ?? "A friend");
      await recordInviteSent();
      await loadData();
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    Alert.alert(
      "Remove Friend",
      `Remove ${friendName} from your circle? They won't be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeFriend(friendId);
            setShowFriendModal(false);
            setSelectedFriend(null);
            await loadData();
          },
        },
      ],
    );
  };

  const activeFriends = circleData ? getActiveFriendsCount(circleData.friends) : 0;
  const circleStats = circleData ? getCircleStats(circleData.friends) : null;
  const userName = guestProfile?.name ?? "You";

  const currentUserStats = {
    name: userName,
    streakCount: streakData?.currentStreak ?? 0,
    weeklySteps: weeklyProgress?.steps.current ?? wearableData.steps * 7,
    weeklyCalories: weeklyProgress?.calories.current ?? wearableData.totalCaloriesBurnt * 7,
    weeklyWorkouts: weeklyProgress?.workouts.current ?? 0,
    weeklyDistance: wearableData.distance * 7,
  };

  const leaderboard = circleData
    ? buildLeaderboard(circleData.friends, currentUserStats, leaderboardMetric)
    : [];

  const metricDisplay = getMetricDisplay(leaderboardMetric);

  // ── Render Helpers ────────────────────────────────────────────

  const renderFriendCard = ({ item: friend }: { item: FriendProfile }) => (
    <TouchableOpacity
      style={styles.friendCard}
      onPress={() => { setSelectedFriend(friend); setShowFriendModal(true); }}
      activeOpacity={0.7}
    >
      <View style={styles.friendAvatar}>
        <Text style={{ fontSize: 28 }}>{friend.avatarEmoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.friendName}>{friend.name}</Text>
          {friend.isActive && <View style={styles.activeDot} />}
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          <Text style={styles.friendStat}>🔥 {friend.streakCount}w</Text>
          <Text style={styles.friendStat}>👟 {(friend.weeklySteps / 1000).toFixed(1)}K</Text>
          <Text style={styles.friendStat}>💪 {friend.weeklyWorkouts}</Text>
        </View>
        <Text style={styles.friendLastActive}>{friend.isActive ? "Active now" : timeAgo(friend.lastActive)}</Text>
      </View>
      <Text style={{ color: "#92400E", fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );

  const renderLeaderboardEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isTop3 = item.rank <= 3;
    const rankEmoji = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : "";
    const trendIcon = item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "";
    const trendColor = item.trend === "up" ? "#10B981" : item.trend === "down" ? "#EF4444" : "#92400E";

    return (
      <View style={[
        styles.leaderboardRow,
        item.isCurrentUser && styles.leaderboardRowHighlight,
        index === 0 && { borderTopWidth: 0 },
      ]}>
        <View style={styles.rankBadge}>
          {isTop3 ? (
            <Text style={{ fontSize: 20 }}>{rankEmoji}</Text>
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>
        <Text style={{ fontSize: 22, marginRight: 8 }}>{item.avatarEmoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.leaderboardName, item.isCurrentUser && { color: "#FDE68A" }]}>
            {item.isCurrentUser ? `${item.name} (You)` : item.name}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.leaderboardValue}>{metricDisplay.format(item.value)}</Text>
          {trendIcon ? (
            <Text style={{ color: trendColor, fontSize: 11, marginTop: 2 }}>{trendIcon}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  // ── Main Render ───────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero */}
      <ImageBackground source={{ uri: HERO_BG }} style={{ height: 180 }} resizeMode="cover">
        <View style={styles.heroOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={{ color: "#FFF7ED", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroLabel}>SOCIAL CIRCLE</Text>
          <Text style={styles.heroTitle}>Your Fitness Crew</Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
            <Text style={styles.heroStat}>
              👥 {circleData?.friends.length ?? 0} friends
            </Text>
            <Text style={styles.heroStat}>
              🟢 {activeFriends} active
            </Text>
            {discountData?.activeDiscount && (
              <Text style={[styles.heroStat, { color: "#10B981" }]}>
                🎁 {discountData.activeDiscount.description}
              </Text>
            )}
          </View>
        </View>
      </ImageBackground>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(["circle", "leaderboard", "invite"] as TabId[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "circle" ? "👥 Circle" : tab === "leaderboard" ? "🏆 Leaderboard" : "📨 Invite"}
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
          {/* ── Circle Tab ──────────────────────────────────────── */}
          {activeTab === "circle" && (
            <>
              {/* Circle Stats */}
              {circleStats && circleData && circleData.friends.length > 0 && (
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{circleStats.avgStreak}</Text>
                    <Text style={styles.statLabel}>Avg Streak</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{(circleStats.avgSteps / 1000).toFixed(0)}K</Text>
                    <Text style={styles.statLabel}>Avg Steps</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{circleStats.avgWorkouts}</Text>
                    <Text style={styles.statLabel}>Avg Workouts</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>🔥 {circleStats.topStreak}</Text>
                    <Text style={styles.statLabel}>Top Streak</Text>
                  </View>
                </View>
              )}

              {/* Friends List */}
              <Text style={styles.sectionTitle}>Friends ({circleData?.friends.length ?? 0})</Text>
              {circleData && circleData.friends.length > 0 ? (
                <FlatList
                  data={circleData.friends}
                  keyExtractor={(item) => item.id}
                  renderItem={renderFriendCard}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
                  <Text style={styles.emptyTitle}>No friends yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Invite friends to join your circle and compete together!
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setActiveTab("invite")}>
                    <Text style={styles.primaryBtnText}>Invite Friends</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Discount Rewards */}
              {discountData && discountData.discounts.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.sectionTitle}>Your Rewards</Text>
                  {discountData.discounts.map((d) => (
                    <View key={d.id} style={[styles.discountCard, d.isUsed && { opacity: 0.5 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.discountTitle}>{d.description}</Text>
                        <Text style={styles.discountSub}>
                          Earned from {d.friendName} {d.isUsed ? "• Applied" : "• Available"}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 24 }}>{d.isUsed ? "✅" : "🎁"}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* ── Leaderboard Tab ─────────────────────────────────── */}
          {activeTab === "leaderboard" && (
            <>
              {/* Metric Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {METRIC_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.metricPill, leaderboardMetric === m.id && styles.metricPillActive]}
                      onPress={() => setLeaderboardMetric(m.id)}
                    >
                      <Text style={[styles.metricPillText, leaderboardMetric === m.id && styles.metricPillTextActive]}>
                        {m.emoji} {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Leaderboard */}
              {leaderboard.length > 0 ? (
                <View style={styles.leaderboardContainer}>
                  {/* Top 3 Podium */}
                  <View style={styles.podium}>
                    {leaderboard.slice(0, 3).map((entry, i) => {
                      const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
                      const e = leaderboard[podiumOrder[i]];
                      if (!e) return null;
                      const heights = [100, 130, 80];
                      return (
                        <View key={e.id} style={[styles.podiumItem, { height: heights[i] }]}>
                          <Text style={{ fontSize: 32 }}>{e.avatarEmoji}</Text>
                          <Text style={styles.podiumName} numberOfLines={1}>
                            {e.isCurrentUser ? "You" : e.name.split(" ")[0]}
                          </Text>
                          <Text style={styles.podiumValue}>{metricDisplay.format(e.value)}</Text>
                          <View style={[styles.podiumBar, { height: heights[i] - 60, backgroundColor: i === 1 ? "#F59E0B" : "#92400E" }]} />
                        </View>
                      );
                    })}
                  </View>

                  {/* Full Rankings */}
                  <FlatList
                    data={leaderboard}
                    keyExtractor={(item) => item.id}
                    renderItem={renderLeaderboardEntry}
                    scrollEnabled={false}
                    style={{ marginTop: 16 }}
                  />
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
                  <Text style={styles.emptyTitle}>No competition yet</Text>
                  <Text style={styles.emptySubtitle}>Invite friends to start competing!</Text>
                </View>
              )}
            </>
          )}

          {/* ── Invite Tab ──────────────────────────────────────── */}
          {activeTab === "invite" && (
            <>
              {/* Circle Code Card */}
              <View style={styles.inviteCodeCard}>
                <Text style={styles.inviteCodeLabel}>Your Circle Code</Text>
                <View style={styles.inviteCodeBox}>
                  <Text style={styles.inviteCode}>{circleData?.circleCode ?? "..."}</Text>
                </View>
                <Text style={styles.inviteCodeHint}>
                  Friends enter this code to join your fitness circle
                </Text>
              </View>

              {/* Share Buttons */}
              <View style={{ gap: 10, marginBottom: 20 }}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
                  <Text style={styles.shareBtnText}>
                    {sharing ? "Sharing..." : "📤 Share Invite Link"}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.shareHint}>
                  The link automatically redirects to the App Store (iOS) or Play Store (Android) based on your friend's device
                </Text>
              </View>

              {/* Referral Discount Tiers */}
              <Text style={styles.sectionTitle}>Referral Rewards</Text>
              <Text style={styles.sectionSubtitle}>
                Earn discounts when friends join via your invite link
              </Text>
              {DISCOUNT_TIERS.map((tier, i) => {
                const totalJoined = circleData?.totalFriendsJoined ?? 0;
                const achieved = totalJoined >= tier.friendsRequired;
                return (
                  <View key={i} style={[styles.tierCard, achieved && styles.tierCardAchieved]}>
                    <View style={styles.tierBadge}>
                      <Text style={{ fontSize: 22 }}>{achieved ? "✅" : "🎯"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tierTitle}>{tier.description}</Text>
                      <Text style={styles.tierSub}>
                        Invite {tier.friendsRequired} friend{tier.friendsRequired > 1 ? "s" : ""}
                      </Text>
                    </View>
                    {achieved ? (
                      <View style={styles.tierEarned}>
                        <Text style={styles.tierEarnedText}>Earned</Text>
                      </View>
                    ) : (
                      <View style={styles.tierProgress}>
                        <Text style={styles.tierProgressText}>
                          {tier.friendsRequired - totalJoined} to go
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* How It Works */}
              <View style={styles.howItWorks}>
                <Text style={styles.sectionTitle}>How It Works</Text>
                {[
                  { step: "1", text: "Share your circle invite link with friends and family" },
                  { step: "2", text: "They download PeakPulse from the App Store or Play Store" },
                  { step: "3", text: "They enter your circle code during setup" },
                  { step: "4", text: "They get a FREE 14-day Advanced trial (double the standard!)" },
                  { step: "5", text: "You earn discounts and free months as rewards" },
                  { step: "6", text: "See each other's streaks and compete on leaderboards" },
                ].map((s, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepNum}>{s.step}</Text>
                    </View>
                    <Text style={styles.stepText}>{s.text}</Text>
                  </View>
                ))}
              </View>

              {/* Pending Invites */}
              {circleData && circleData.pendingInvites.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.sectionTitle}>Recent Invites</Text>
                  {circleData.pendingInvites.slice(0, 5).map((inv) => (
                    <View key={inv.id} style={styles.pendingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pendingName}>{inv.name}</Text>
                        <Text style={styles.pendingSent}>{timeAgo(inv.sentAt)}</Text>
                      </View>
                      <View style={[styles.statusBadge, inv.status === "accepted" && { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                        <Text style={[styles.statusText, inv.status === "accepted" && { color: "#10B981" }]}>
                          {inv.status === "accepted" ? "Joined" : inv.status === "expired" ? "Expired" : "Pending"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Invite Stats */}
              <View style={styles.inviteStats}>
                <View style={styles.inviteStatItem}>
                  <Text style={styles.inviteStatValue}>{circleData?.totalInvitesSent ?? 0}</Text>
                  <Text style={styles.inviteStatLabel}>Invites Sent</Text>
                </View>
                <View style={styles.inviteStatItem}>
                  <Text style={styles.inviteStatValue}>{circleData?.totalFriendsJoined ?? 0}</Text>
                  <Text style={styles.inviteStatLabel}>Friends Joined</Text>
                </View>
                <View style={styles.inviteStatItem}>
                  <Text style={styles.inviteStatValue}>{discountData?.discounts.filter((d) => !d.isUsed).length ?? 0}</Text>
                  <Text style={styles.inviteStatLabel}>Rewards Earned</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Friend Detail Modal ──────────────────────────────── */}
      <Modal visible={showFriendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFriend && (
              <>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 56, marginBottom: 8 }}>{selectedFriend.avatarEmoji}</Text>
                  <Text style={styles.modalName}>{selectedFriend.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {selectedFriend.isActive && <View style={[styles.activeDot, { width: 8, height: 8 }]} />}
                    <Text style={styles.modalStatus}>
                      {selectedFriend.isActive ? "Active now" : `Last seen ${timeAgo(selectedFriend.lastActive)}`}
                    </Text>
                  </View>
                </View>

                {/* Friend Stats Grid */}
                <View style={styles.modalStatsGrid}>
                  {[
                    { label: "Streak", value: `${selectedFriend.streakCount}w`, emoji: "🔥" },
                    { label: "Steps", value: `${(selectedFriend.weeklySteps / 1000).toFixed(1)}K`, emoji: "👟" },
                    { label: "Calories", value: `${selectedFriend.weeklyCalories.toLocaleString()}`, emoji: "🔥" },
                    { label: "Workouts", value: `${selectedFriend.weeklyWorkouts}`, emoji: "💪" },
                    { label: "Distance", value: `${selectedFriend.weeklyDistance.toFixed(1)}km`, emoji: "📏" },
                    { label: "Heart Rate", value: `${selectedFriend.avgHeartRate}bpm`, emoji: "❤️" },
                    { label: "Sleep", value: `${selectedFriend.sleepHoursAvg.toFixed(1)}h`, emoji: "🌙" },
                    { label: "Joined", value: timeAgo(selectedFriend.joinedAt), emoji: "📅" },
                  ].map((stat, i) => (
                    <View key={i} style={styles.modalStatItem}>
                      <Text style={{ fontSize: 18 }}>{stat.emoji}</Text>
                      <Text style={styles.modalStatValue}>{stat.value}</Text>
                      <Text style={styles.modalStatLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Milestone */}
                {selectedFriend.currentMilestone ? (
                  <View style={styles.modalMilestone}>
                    <Text style={styles.modalMilestoneText}>
                      Current milestone: {selectedFriend.currentMilestone.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                ) : null}

                {/* Actions */}
                <View style={{ gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: "#DC2626" }]}
                    onPress={() => handleRemoveFriend(selectedFriend.id, selectedFriend.name)}
                  >
                    <Text style={styles.primaryBtnText}>Remove from Circle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: "#1C0E02" }]}
                    onPress={() => { setShowFriendModal(false); setSelectedFriend(null); }}
                  >
                    <Text style={[styles.primaryBtnText, { color: "#FFF7ED" }]}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  heroLabel: { color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5 },
  heroTitle: { color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 24 },
  heroStat: { color: "#FDE68A", fontSize: 12, fontFamily: "DMSans_400Regular" },

  tabBar: {
    flexDirection: "row", backgroundColor: "#150A00", borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.10)",
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#F59E0B" },
  tabText: { color: "#92400E", fontSize: 13, fontFamily: "Outfit_700Bold" },
  tabTextActive: { color: "#FDE68A" },

  sectionTitle: { color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 18, marginBottom: 8 },
  sectionSubtitle: { color: "#92400E", fontSize: 13, marginBottom: 12, lineHeight: 18 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: "#150A00", borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", alignItems: "center",
  },
  statValue: { color: "#FDE68A", fontFamily: "Outfit_800ExtraBold", fontSize: 16 },
  statLabel: { color: "#92400E", fontSize: 10, marginTop: 2 },

  friendCard: {
    backgroundColor: "#150A00", borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.08)",
  },
  friendAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(245,158,11,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  friendName: { color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 },
  friendStat: { color: "#FDE68A", fontSize: 12, fontFamily: "DMSans_400Regular" },
  friendLastActive: { color: "#92400E", fontSize: 11, marginTop: 4 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },

  emptyState: {
    alignItems: "center", padding: 32, backgroundColor: "#150A00",
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  emptyTitle: { color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 18, marginBottom: 6 },
  emptySubtitle: { color: "#92400E", fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 16 },

  primaryBtn: {
    backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, alignItems: "center",
  },
  primaryBtnText: { color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 },

  // Leaderboard
  leaderboardContainer: {
    backgroundColor: "#150A00", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  metricPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#150A00", borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  metricPillActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  metricPillText: { color: "#92400E", fontSize: 13, fontFamily: "Outfit_700Bold" },
  metricPillTextActive: { color: "#FFF7ED" },

  podium: {
    flexDirection: "row", justifyContent: "center", alignItems: "flex-end",
    gap: 8, marginBottom: 8, paddingTop: 16,
  },
  podiumItem: { alignItems: "center", width: 90, justifyContent: "flex-end" },
  podiumName: { color: "#FFF7ED", fontSize: 12, fontFamily: "Outfit_700Bold", marginTop: 4 },
  podiumValue: { color: "#FDE68A", fontSize: 13, fontFamily: "Outfit_800ExtraBold", marginTop: 2 },
  podiumBar: {
    width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8, marginTop: 6,
  },

  leaderboardRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 8,
    borderTopWidth: 1, borderTopColor: "rgba(245,158,11,0.06)",
  },
  leaderboardRowHighlight: {
    backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12,
    marginHorizontal: -8, paddingHorizontal: 8,
  },
  rankBadge: { width: 32, alignItems: "center" },
  rankText: { color: "#92400E", fontFamily: "Outfit_800ExtraBold", fontSize: 16 },
  leaderboardName: { color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 },
  leaderboardValue: { color: "#FDE68A", fontFamily: "Outfit_800ExtraBold", fontSize: 15 },

  // Invite
  inviteCodeCard: {
    backgroundColor: "#150A00", borderRadius: 24, padding: 24,
    borderWidth: 2, borderColor: "rgba(245,158,11,0.18)", marginBottom: 20, alignItems: "center",
  },
  inviteCodeLabel: { color: "#92400E", fontSize: 13, marginBottom: 10 },
  inviteCodeBox: {
    backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 16, borderWidth: 2,
    borderColor: "rgba(245,158,11,0.28)", marginBottom: 10,
  },
  inviteCode: { color: "#FDE68A", fontFamily: "Outfit_800ExtraBold", fontSize: 28, letterSpacing: 3 },
  inviteCodeHint: { color: "#92400E", fontSize: 12, textAlign: "center" },

  shareBtn: {
    backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 16, alignItems: "center",
  },
  shareBtnText: { color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 },
  shareHint: { color: "#92400E", fontSize: 11, textAlign: "center", lineHeight: 16 },

  tierCard: {
    backgroundColor: "#150A00", borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  tierCardAchieved: { backgroundColor: "#052e16", borderColor: "rgba(16,185,129,0.20)" },
  tierBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" },
  tierTitle: { color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 },
  tierSub: { color: "#92400E", fontSize: 12, marginTop: 2 },
  tierEarned: { backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  tierEarnedText: { color: "#10B981", fontFamily: "Outfit_700Bold", fontSize: 12 },
  tierProgress: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  tierProgressText: { color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 12 },

  howItWorks: {
    marginTop: 20, backgroundColor: "#150A00", borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  stepBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: "#F59E0B",
    alignItems: "center", justifyContent: "center",
  },
  stepNum: { color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 13 },
  stepText: { color: "#D1D5DB", fontSize: 13, flex: 1, lineHeight: 18, paddingTop: 4 },

  pendingRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.06)",
  },
  pendingName: { color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 },
  pendingSent: { color: "#92400E", fontSize: 11, marginTop: 2 },
  statusBadge: {
    backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: { color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 11 },

  inviteStats: {
    flexDirection: "row", gap: 8, marginTop: 20,
  },
  inviteStatItem: {
    flex: 1, backgroundColor: "#150A00", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", alignItems: "center",
  },
  inviteStatValue: { color: "#FDE68A", fontFamily: "Outfit_800ExtraBold", fontSize: 22 },
  inviteStatLabel: { color: "#92400E", fontSize: 10, marginTop: 4 },

  // Discount
  discountCard: {
    backgroundColor: "#150A00", borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "rgba(16,185,129,0.15)",
  },
  discountTitle: { color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 },
  discountSub: { color: "#92400E", fontSize: 11, marginTop: 2 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#150A00", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: "85%",
  },
  modalName: { color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22 },
  modalStatus: { color: "#92400E", fontSize: 13 },
  modalStatsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  modalStatItem: {
    width: "23%", backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 14,
    padding: 10, alignItems: "center",
  },
  modalStatValue: { color: "#FDE68A", fontFamily: "Outfit_800ExtraBold", fontSize: 14, marginTop: 4 },
  modalStatLabel: { color: "#92400E", fontSize: 10, marginTop: 2 },
  modalMilestone: {
    marginTop: 12, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12,
    padding: 12, alignItems: "center",
  },
  modalMilestoneText: { color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 13 },
});
