/**
 * Achievements Gallery — Real-time tracked achievements with progress bars,
 * unlock animations, and tier-based categorization.
 *
 * Uses lib/achievements.ts for real counter-based progress tracking.
 * Sections: All, Fitness, Nutrition, Wellness, Social
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal,
  ImageBackground, Platform, Share, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { GOLDEN_SOCIAL, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI, C } from "@/constants/ui-colors";
import {
  getAllAchievements,
  getAchievementStats,
  groupByCategory,
  getProgressLabel,
  TIER_COLORS,
  TIER_LABELS,
  type AchievementWithProgress,
  type AchievementCategory,
  type AchievementTier,
} from "@/lib/achievements";
import { AchievementUnlock } from "@/components/achievement-unlock";
import { ShareMilestoneButton } from "@/components/share-milestone-button";

// ── Types ────────────────────────────────────────────────────────────
type FilterCategory = "all" | AchievementCategory;

const CATEGORIES: { id: FilterCategory; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "🏅" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "nutrition", label: "Nutrition", emoji: "🥗" },
  { id: "wellness", label: "Wellness", emoji: "🧘" },
  { id: "social", label: "Social", emoji: "👥" },
];

export default function AchievementsScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getAllAchievements();
        if (mounted) setAchievements(data);
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => getAchievementStats(achievements), [achievements]);

  const filteredAchievements = useMemo(() => {
    if (activeCategory === "all") return achievements;
    return achievements.filter((a) => a.category === activeCategory);
  }, [achievements, activeCategory]);

  // Sort: unlocked first (newest first), then locked by progress desc
  const sortedAchievements = useMemo(() => {
    const unlocked = filteredAchievements.filter((a) => a.unlocked)
      .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""));
    const locked = filteredAchievements.filter((a) => !a.unlocked)
      .sort((a, b) => b.progressPct - a.progressPct);
    return [...unlocked, ...locked];
  }, [filteredAchievements]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Share.share({
        message: `🏅 FytNova Achievements: ${stats.unlocked}/${stats.total} unlocked (${stats.pct}%)! Total XP earned: ${stats.totalXPEarned} ⚡ #FytNova #FitnessGoals`,
      });
    } catch {}
  }, [stats]);

  const tierColor = (tier: AchievementTier) => TIER_COLORS[tier];

  const renderAchievement = (item: AchievementWithProgress) => {
    const color = tierColor(item.tier);
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.badgeCard, !item.unlocked && styles.badgeCardLocked]}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedAchievement(item);
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.badgeEmojiBox, { borderColor: item.unlocked ? color : C.muted + "30" }]}>
          <Text style={[styles.badgeEmoji, !item.unlocked && { opacity: 0.3 }]}>{item.emoji}</Text>
          {!item.unlocked && (
            <View style={styles.lockOverlay}>
              <MaterialIcons name="lock" size={14} color={C.muted} />
            </View>
          )}
        </View>
        <Text style={[styles.badgeName, !item.unlocked && { color: C.muted }]} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.tierDot, { backgroundColor: color }]} />
        {!item.unlocked && (
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${item.progressPct * 100}%`, backgroundColor: color }]} />
          </View>
        )}
        {!item.unlocked && (
          <Text style={styles.progressLabel}>
            {getProgressLabel(item.currentCount, item.threshold)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <ImageBackground source={{ uri: GOLDEN_SOCIAL }} style={{ flex: 1 }} resizeMode="cover">
        <View style={GOLDEN_OVERLAY_STYLE}>
          <ScreenContainer edges={["top", "left", "right"]}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={C.gold} />
              <Text style={{ color: C.muted, marginTop: 12, fontSize: 14 }}>Loading achievements...</Text>
            </View>
          </ScreenContainer>
        </View>
      </ImageBackground>
    );
  }

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
              <Text style={styles.headerTitle}>Achievements</Text>
              <Text style={styles.headerSub}>{stats.unlocked}/{stats.total} unlocked · {stats.totalXPEarned} XP earned</Text>
            </View>
            <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
              <MaterialIcons name="share" size={20} color={C.gold} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Overall Progress */}
            <View style={styles.progressCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View style={styles.progressCircle}>
                  <Text style={styles.progressPct}>{stats.pct}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.progressTitle}>Achievement Progress</Text>
                  <Text style={styles.progressSub}>{stats.unlocked} of {stats.total} achievements earned</Text>
                  <View style={styles.overallBarBg}>
                    <View style={[styles.overallBarFill, { width: `${stats.pct}%` }]} />
                  </View>
                </View>
              </View>

              {/* Tier Breakdown */}
              <View style={styles.tierRow}>
                {(["bronze", "silver", "gold", "platinum", "diamond"] as AchievementTier[]).map((t) => {
                  const count = achievements.filter((a) => a.tier === t && a.unlocked).length;
                  const total = achievements.filter((a) => a.tier === t).length;
                  return (
                    <View key={t} style={styles.tierItem}>
                      <View style={[styles.tierColorDot, { backgroundColor: TIER_COLORS[t] }]} />
                      <Text style={styles.tierLabel}>{TIER_LABELS[t]}</Text>
                      <Text style={[styles.tierCount, { color: TIER_COLORS[t] }]}>{count}/{total}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Next to Unlock */}
            {stats.nextToUnlock && (
              <View style={styles.nextCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 28 }}>{stats.nextToUnlock.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.gold, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>NEXT ACHIEVEMENT</Text>
                    <Text style={{ color: C.fg, fontSize: 14, fontWeight: "700", marginTop: 2 }}>{stats.nextToUnlock.name}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{stats.nextToUnlock.description}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ color: C.muted, fontSize: 11 }}>Progress</Text>
                    <Text style={{ color: tierColor(stats.nextToUnlock.tier), fontSize: 11, fontWeight: "700" }}>
                      {getProgressLabel(stats.nextToUnlock.currentCount, stats.nextToUnlock.threshold)}
                    </Text>
                  </View>
                  <View style={styles.nextBarBg}>
                    <View style={[styles.nextBarFill, { width: `${stats.nextToUnlock.progressPct * 100}%`, backgroundColor: tierColor(stats.nextToUnlock.tier) }]} />
                  </View>
                </View>
              </View>
            )}

            {/* Category Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catTab, activeCategory === cat.id && styles.catTabActive]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                  <Text style={[styles.catTabText, activeCategory === cat.id && styles.catTabTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Badge Grid */}
            <View style={styles.badgeGrid}>
              {sortedAchievements.map(renderAchievement)}
            </View>
          </ScrollView>

          {/* Achievement Detail Modal */}
          <Modal visible={!!selectedAchievement} transparent animationType="fade" onRequestClose={() => setSelectedAchievement(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {selectedAchievement && (
                  <>
                    <View style={[styles.modalEmojiBox, { borderColor: tierColor(selectedAchievement.tier) }]}>
                      <Text style={{ fontSize: 48 }}>{selectedAchievement.emoji}</Text>
                    </View>
                    <Text style={styles.modalName}>{selectedAchievement.name}</Text>
                    <View style={[styles.modalTierBadge, { backgroundColor: tierColor(selectedAchievement.tier) + "20" }]}>
                      <Text style={[styles.modalTierText, { color: tierColor(selectedAchievement.tier) }]}>
                        {TIER_LABELS[selectedAchievement.tier]}
                      </Text>
                    </View>
                    <Text style={styles.modalDesc}>{selectedAchievement.description}</Text>

                    {/* XP Reward */}
                    <View style={styles.xpRow}>
                      <MaterialIcons name="bolt" size={16} color={UI.gold2} />
                      <Text style={styles.xpText}>+{selectedAchievement.xpReward} XP</Text>
                    </View>

                    {selectedAchievement.unlocked ? (
                      <View style={{ alignItems: "center", gap: 10, marginTop: 12 }}>
                        <View style={styles.modalUnlockedBadge}>
                          <MaterialIcons name="check-circle" size={16} color={C.green} />
                          <Text style={{ color: C.green, fontSize: 13, fontWeight: "600" }}>
                            Unlocked {selectedAchievement.unlockedAt ? new Date(selectedAchievement.unlockedAt).toLocaleDateString() : ""}
                          </Text>
                        </View>
                        <ShareMilestoneButton
                          data={{
                            type: "achievement",
                            title: selectedAchievement.name,
                            subtitle: selectedAchievement.description,
                            totalXP: selectedAchievement.xpReward,
                            streakDays: 0,
                            badgeIcon: selectedAchievement.emoji,
                          }}
                          compact
                          label="Share"
                        />
                      </View>
                    ) : (
                      <View style={{ width: "100%", marginTop: 16 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ color: C.muted, fontSize: 12 }}>Progress</Text>
                          <Text style={{ color: tierColor(selectedAchievement.tier), fontSize: 12, fontWeight: "700" }}>
                            {getProgressLabel(selectedAchievement.currentCount, selectedAchievement.threshold)}
                          </Text>
                        </View>
                        <View style={styles.modalProgressBg}>
                          <View style={[styles.modalProgressFill, { width: `${selectedAchievement.progressPct * 100}%`, backgroundColor: tierColor(selectedAchievement.tier) }]} />
                        </View>
                      </View>
                    )}

                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedAchievement(null)}>
                      <Text style={styles.modalCloseBtnText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </Modal>
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
  shareBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: UI.goldAlpha10, alignItems: "center", justifyContent: "center",
  },
  // Progress Card
  progressCard: {
    marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  progressCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3,
    borderColor: C.gold, alignItems: "center", justifyContent: "center",
  },
  progressPct: { color: C.gold, fontSize: 18, fontWeight: "800" },
  progressTitle: { color: C.fg, fontSize: 15, fontWeight: "700" },
  progressSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  overallBarBg: {
    height: 6, backgroundColor: UI.goldAlpha10, borderRadius: 3, marginTop: 8,
  },
  overallBarFill: { height: 6, backgroundColor: C.gold, borderRadius: 3 },
  tierRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  tierItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  tierColorDot: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { color: C.muted, fontSize: 11 },
  tierCount: { fontSize: 11, fontWeight: "700" },
  // Next Achievement
  nextCard: {
    marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: UI.goldAlpha20, marginBottom: 12,
  },
  nextBarBg: {
    height: 6, backgroundColor: UI.goldAlpha10, borderRadius: 3,
  },
  nextBarFill: { height: 6, borderRadius: 3 },
  // Category Tabs
  catBar: { marginBottom: 12 },
  catTab: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  catTabActive: { backgroundColor: UI.borderGold, borderColor: C.gold },
  catTabText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  catTabTextActive: { color: C.gold },
  // Badge Grid
  badgeGrid: {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12,
    gap: 10, justifyContent: "flex-start",
  },
  badgeCard: {
    width: "30%", backgroundColor: C.surface, borderRadius: 14, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: C.border, gap: 4,
  },
  badgeCardLocked: { opacity: 0.7 },
  badgeEmojiBox: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: UI.goldAlpha5,
  },
  badgeEmoji: { fontSize: 22 },
  lockOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 24, backgroundColor: "rgba(10,14,20,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  badgeName: { color: C.fg, fontSize: 11, fontWeight: "700", textAlign: "center" },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  progressBarBg: {
    width: "100%", height: 3, backgroundColor: UI.goldAlpha10, borderRadius: 2,
  },
  progressBarFill: { height: 3, borderRadius: 2 },
  progressLabel: { color: C.muted, fontSize: 9, fontWeight: "600" },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center",
    alignItems: "center", padding: 30,
  },
  modalContent: {
    width: "100%", backgroundColor: UI.surface, borderRadius: 20, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  modalEmojiBox: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 3,
    alignItems: "center", justifyContent: "center", backgroundColor: UI.goldAlpha5,
    marginBottom: 16,
  },
  modalName: { color: C.fg, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  modalTierBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  modalTierText: { fontSize: 12, fontWeight: "700" },
  modalDesc: { color: C.fg, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 8 },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  xpText: { color: UI.gold2, fontSize: 14, fontWeight: "700" },
  modalUnlockedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  modalProgressBg: {
    height: 8, backgroundColor: UI.goldAlpha10, borderRadius: 4,
  },
  modalProgressFill: { height: 8, borderRadius: 4 },
  modalCloseBtn: {
    marginTop: 20, backgroundColor: UI.goldAlpha12, borderRadius: 12,
    paddingHorizontal: 30, paddingVertical: 12,
  },
  modalCloseBtnText: { color: C.gold, fontSize: 14, fontWeight: "700" },
});
