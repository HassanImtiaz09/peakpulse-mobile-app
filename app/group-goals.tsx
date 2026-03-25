/**
 * Group Goals Screen — collective weekly targets for the entire social circle.
 *
 * Tabs: Active, Create, History
 * Shows group progress with member contributions, progress bars, and celebration.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, ImageBackground, StyleSheet, TextInput, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useGuestAuth } from "@/lib/guest-auth";
import {
  loadOrCreateDemoGroupGoals,
  createGroupGoal,
  getGroupGoals,
  getActiveGroupGoals,
  deleteGroupGoal,
  getMetricLabel,
  getMetricEmoji,
  getMetricUnit,
  formatMetricValue,
  getProgressPercentage,
  getDaysRemaining,
  type GroupGoal,
  type GroupGoalMetric,
} from "@/lib/group-goals";
import { loadOrCreateSocialCircle, type FriendProfile } from "@/lib/social-circle";

const HERO_BG = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80";

type TabId = "active" | "create" | "history";

const METRIC_OPTIONS: GroupGoalMetric[] = ["steps", "calories", "workouts", "distance"];
const DURATION_OPTIONS = [
  { label: "3 Days", value: 3 },
  { label: "7 Days", value: 7 },
  { label: "14 Days", value: 14 },
];
const SUGGESTED_TARGETS: Record<GroupGoalMetric, number[]> = {
  steps: [250000, 500000, 750000, 1000000],
  calories: [10000, 20000, 35000, 50000],
  workouts: [15, 25, 40, 60],
  distance: [100, 200, 350, 500],
};

export default function GroupGoalsScreen() {
  const router = useRouter();
  const { guestProfile } = useGuestAuth();
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [allGoals, setAllGoals] = useState<GroupGoal[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showContribModal, setShowContribModal] = useState<GroupGoal | null>(null);

  // Create form state
  const [selectedMetric, setSelectedMetric] = useState<GroupGoalMetric>("steps");
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [customTarget, setCustomTarget] = useState("");

  const userName = guestProfile?.name ?? "You";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const circleData = await loadOrCreateSocialCircle(userName);
      setFriends(circleData.friends);
      const goals = await loadOrCreateDemoGroupGoals(userName, circleData.friends);
      setAllGoals(goals);
    } catch (e) {
      console.warn("[GroupGoals] Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [userName]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeGoals = allGoals.filter((g) => g.status === "active");
  const completedGoals = allGoals.filter((g) => g.status !== "active");

  const handleCreate = async () => {
    const target = customTarget ? parseInt(customTarget, 10) : SUGGESTED_TARGETS[selectedMetric][1];
    if (!target || target <= 0) {
      Alert.alert("Invalid Target", "Please enter a valid target value.");
      return;
    }
    setCreating(true);
    try {
      await createGroupGoal(selectedMetric, target, selectedDuration, userName, friends);
      Alert.alert(
        "Group Goal Created!",
        `${getMetricEmoji(selectedMetric)} ${target.toLocaleString()} ${getMetricUnit(selectedMetric)} in ${selectedDuration} days — let's go!`,
        [{ text: "View Goal", onPress: () => { setActiveTab("active"); loadData(); } }],
      );
      setCustomTarget("");
    } catch {
      Alert.alert("Error", "Failed to create group goal.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (goal: GroupGoal) => {
    Alert.alert("Delete Goal", "Remove this group goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => { await deleteGroupGoal(goal.id); loadData(); },
      },
    ]);
  };

  // ── Render Helpers ────────────────────────────────────────────

  const renderGoalCard = (goal: GroupGoal) => {
    const pct = getProgressPercentage(goal.currentTotal, goal.target);
    const daysLeft = getDaysRemaining(goal.endDate);
    const isCompleted = goal.status !== "active";
    const isAchieved = goal.isAchieved;

    return (
      <View key={goal.id} style={[styles.goalCard, isAchieved && styles.goalCardAchieved]}>
        {/* Header */}
        <View style={styles.goalHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 24 }}>{getMetricEmoji(goal.metric)}</Text>
            <View>
              <Text style={styles.goalTitle}>{getMetricLabel(goal.metric)} Challenge</Text>
              <Text style={styles.goalSubtitle}>
                {isCompleted
                  ? (isAchieved ? "🎉 Goal Achieved!" : "⏰ Time's Up")
                  : `${daysLeft} days remaining`
                }
              </Text>
            </View>
          </View>
          {!isCompleted && (
            <TouchableOpacity onPress={() => handleDelete(goal)}>
              <Text style={{ color: "#B45309", fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={styles.progressLabel}>
              {formatMetricValue(goal.metric, goal.currentTotal)} / {formatMetricValue(goal.metric, goal.target)} {getMetricUnit(goal.metric)}
            </Text>
            <Text style={[styles.progressPct, isAchieved && { color: "#10B981" }]}>{pct}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill,
              { width: `${pct}%` },
              isAchieved && { backgroundColor: "#10B981" },
            ]} />
          </View>
        </View>

        {/* Top Contributors */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={styles.contribTitle}>Contributors ({goal.contributions.length})</Text>
            <TouchableOpacity onPress={() => setShowContribModal(goal)}>
              <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "700" }}>View All</Text>
            </TouchableOpacity>
          </View>
          {goal.contributions
            .sort((a, b) => b.value - a.value)
            .slice(0, 3)
            .map((contrib, i) => (
              <View key={contrib.userId} style={styles.contribRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 10, color: "#FDE68A", fontWeight: "800", width: 16 }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </Text>
                  <Text style={{ fontSize: 16 }}>{contrib.avatarEmoji}</Text>
                  <Text style={styles.contribName} numberOfLines={1}>{contrib.userName}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.contribValue}>
                    {formatMetricValue(goal.metric, contrib.value)}
                  </Text>
                  <Text style={styles.contribPct}>{contrib.percentage}%</Text>
                </View>
              </View>
            ))}
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
          <Text style={styles.heroLabel}>CIRCLE</Text>
          <Text style={styles.heroTitle}>Group Goals</Text>
          <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
            <Text style={styles.heroStat}>🎯 {activeGoals.length} active</Text>
            <Text style={styles.heroStat}>✅ {completedGoals.filter((g) => g.isAchieved).length} achieved</Text>
            <Text style={styles.heroStat}>👥 {friends.length + 1} members</Text>
          </View>
        </View>
      </ImageBackground>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(["active", "create", "history"] as TabId[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "active" ? `🎯 Active (${activeGoals.length})`
                : tab === "create" ? "➕ Create"
                : `📊 History (${completedGoals.length})`}
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
              {activeGoals.length > 0 ? (
                activeGoals.map(renderGoalCard)
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🎯</Text>
                  <Text style={styles.emptyTitle}>No active group goals</Text>
                  <Text style={styles.emptySubtitle}>
                    Set a collective target for your circle and work towards it together!
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setActiveTab("create")}>
                    <Text style={styles.primaryBtnText}>Create Group Goal</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ── Create Tab ──────────────────────────────────────── */}
          {activeTab === "create" && (
            <>
              <Text style={styles.sectionTitle}>Create Group Goal</Text>
              <Text style={styles.sectionSubtitle}>
                Set a collective target for your entire circle. Everyone contributes!
              </Text>

              {/* Metric Selection */}
              <Text style={styles.fieldLabel}>Goal Metric</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {METRIC_OPTIONS.map((metric) => (
                  <TouchableOpacity
                    key={metric}
                    style={[styles.metricPill, selectedMetric === metric && styles.metricPillActive]}
                    onPress={() => { setSelectedMetric(metric); setCustomTarget(""); }}
                  >
                    <Text style={{ fontSize: 16 }}>{getMetricEmoji(metric)}</Text>
                    <Text style={[styles.metricPillText, selectedMetric === metric && styles.metricPillTextActive]}>
                      {getMetricLabel(metric)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Duration */}
              <Text style={styles.fieldLabel}>Duration</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.durationPill, selectedDuration === opt.value && styles.durationPillActive]}
                    onPress={() => setSelectedDuration(opt.value)}
                  >
                    <Text style={[styles.durationText, selectedDuration === opt.value && styles.durationTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target */}
              <Text style={styles.fieldLabel}>Target ({getMetricUnit(selectedMetric)})</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {SUGGESTED_TARGETS[selectedMetric].map((target) => (
                  <TouchableOpacity
                    key={target}
                    style={[
                      styles.targetPill,
                      customTarget === target.toString() && styles.targetPillActive,
                    ]}
                    onPress={() => setCustomTarget(target.toString())}
                  >
                    <Text style={[
                      styles.targetPillText,
                      customTarget === target.toString() && styles.targetPillTextActive,
                    ]}>
                      {target >= 1000 ? `${(target / 1000).toFixed(0)}K` : target.toString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.targetInput}
                placeholder="Or enter custom target..."
                placeholderTextColor="#B45309"
                keyboardType="numeric"
                value={customTarget}
                onChangeText={setCustomTarget}
              />

              {/* Summary */}
              {customTarget ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Goal Summary</Text>
                  <Text style={styles.summaryText}>
                    {getMetricEmoji(selectedMetric)} {parseInt(customTarget, 10).toLocaleString()} {getMetricUnit(selectedMetric)} in {selectedDuration} days
                  </Text>
                  <Text style={styles.summaryText}>
                    👥 {friends.length + 1} members • ~{formatMetricValue(selectedMetric, Math.round(parseInt(customTarget, 10) / (friends.length + 1)))} per person
                  </Text>
                </View>
              ) : null}

              {/* Create Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 20 }, (creating || !customTarget) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={creating || !customTarget}
              >
                <Text style={styles.primaryBtnText}>
                  {creating ? "Creating..." : "🎯 Create Group Goal"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── History Tab ─────────────────────────────────────── */}
          {activeTab === "history" && (
            <>
              {completedGoals.length > 0 ? (
                completedGoals.map(renderGoalCard)
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text>
                  <Text style={styles.emptyTitle}>No completed goals yet</Text>
                  <Text style={styles.emptySubtitle}>Your group goal history will appear here.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Contributions Modal ──────────────────────────────── */}
      <Modal visible={!!showContribModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {showContribModal ? `${getMetricEmoji(showContribModal.metric)} All Contributors` : ""}
            </Text>
            {showContribModal?.contributions
              .sort((a, b) => b.value - a.value)
              .map((contrib, i) => (
                <View key={contrib.userId} style={styles.modalContribRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 14, color: "#FDE68A", fontWeight: "800", width: 20 }}>
                      #{i + 1}
                    </Text>
                    <Text style={{ fontSize: 20 }}>{contrib.avatarEmoji}</Text>
                    <View>
                      <Text style={styles.modalContribName}>{contrib.userName}</Text>
                      <Text style={styles.modalContribPct}>{contrib.percentage}% of total</Text>
                    </View>
                  </View>
                  <Text style={styles.modalContribValue}>
                    {showContribModal ? formatMetricValue(showContribModal.metric, contrib.value) : ""}
                    {" "}{showContribModal ? getMetricUnit(showContribModal.metric) : ""}
                  </Text>
                </View>
              ))}
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 16, backgroundColor: "#1A2030" }]}
              onPress={() => setShowContribModal(null)}
            >
              <Text style={[styles.primaryBtnText, { color: "#F1F5F9" }]}>Close</Text>
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

  goalCard: {
    backgroundColor: "#141A22", borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  goalCardAchieved: { borderColor: "rgba(16,185,129,0.25)", backgroundColor: "#0A1A0F" },
  goalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
  },
  goalTitle: { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  goalSubtitle: { color: "#B45309", fontSize: 12, marginTop: 2 },

  progressSection: { marginTop: 4 },
  progressLabel: { color: "#F1F5F9", fontSize: 13, fontWeight: "600" },
  progressPct: { color: "#FDE68A", fontSize: 14, fontWeight: "800" },
  progressBarBg: {
    height: 10, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 5, overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 5, backgroundColor: "#F59E0B" },

  contribTitle: { color: "#FDE68A", fontSize: 12, fontWeight: "700" },
  contribRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.06)",
  },
  contribName: { color: "#F1F5F9", fontSize: 13, fontWeight: "600", maxWidth: 120 },
  contribValue: { color: "#FDE68A", fontSize: 13, fontWeight: "700" },
  contribPct: { color: "#B45309", fontSize: 10, marginTop: 2 },

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

  metricPill: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#141A22", borderRadius: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  metricPillActive: { borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.08)" },
  metricPillText: { color: "#B45309", fontSize: 13, fontWeight: "700" },
  metricPillTextActive: { color: "#FDE68A" },

  durationPill: {
    flex: 1, alignItems: "center", paddingVertical: 10, backgroundColor: "#141A22",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  durationPillActive: { borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.08)" },
  durationText: { color: "#B45309", fontSize: 13, fontWeight: "700" },
  durationTextActive: { color: "#FDE68A" },

  targetPill: {
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#141A22",
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
  },
  targetPillActive: { borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.08)" },
  targetPillText: { color: "#B45309", fontSize: 13, fontWeight: "700" },
  targetPillTextActive: { color: "#FDE68A" },

  targetInput: {
    backgroundColor: "#141A22", borderRadius: 12, padding: 14, color: "#F1F5F9",
    fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", marginTop: 8,
  },

  summaryCard: {
    marginTop: 16, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.12)",
  },
  summaryTitle: { color: "#FDE68A", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  summaryText: { color: "#F1F5F9", fontSize: 13, lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#141A22", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: "70%",
  },
  modalTitle: { color: "#F1F5F9", fontSize: 20, fontWeight: "800", marginBottom: 16 },
  modalContribRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.06)",
  },
  modalContribName: { color: "#F1F5F9", fontSize: 14, fontWeight: "700" },
  modalContribPct: { color: "#B45309", fontSize: 11, marginTop: 2 },
  modalContribValue: { color: "#FDE68A", fontSize: 14, fontWeight: "700" },
});
