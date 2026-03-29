/**
 * Achievements Gallery — Visual gallery of earned badges, challenge trophies,
 * and milestone achievements.
 *
 * Sections: All, Fitness, Nutrition, Social, Challenges
 * Each badge has a locked/unlocked state, progress bar, and rarity tier.
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GOLDEN_SOCIAL, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { C } from "@/constants/ui-colors";

// ── Types ────────────────────────────────────────────────────────────
type BadgeCategory = "all" | "fitness" | "nutrition" | "social" | "challenges";
type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: Exclude<BadgeCategory, "all">;
  rarity: BadgeRarity;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0-1
  progressLabel?: string;
  requirement: string;
}

interface Trophy {
  id: string;
  name: string;
  emoji: string;
  description: string;
  wonAt: string;
  opponentName: string;
  challengeType: string;
}

// ── Colour Tokens ────────────────────────────────────────────────────
const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: "#94A3B8",
  uncommon: "#22C55E",
  rare: "#3B82F6",
  epic: "#8B5CF6",
  legendary: "#F59E0B",
};

const RARITY_LABELS: Record<BadgeRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

// ── Badge Definitions ────────────────────────────────────────────────
const ALL_BADGES: Badge[] = [
  // Fitness
  { id: "first_workout", name: "First Steps", description: "Complete your first workout", emoji: "🏋️", category: "fitness", rarity: "common", unlocked: true, unlockedAt: "2025-12-01", progress: 1, requirement: "Complete 1 workout" },
  { id: "week_warrior", name: "Week Warrior", description: "Work out 5 days in a single week", emoji: "⚡", category: "fitness", rarity: "uncommon", unlocked: true, unlockedAt: "2025-12-15", progress: 1, requirement: "5 workouts in 1 week" },
  { id: "iron_will", name: "Iron Will", description: "Complete 30 workouts total", emoji: "🔥", category: "fitness", rarity: "rare", unlocked: true, unlockedAt: "2026-01-20", progress: 1, requirement: "30 total workouts" },
  { id: "century_club", name: "Century Club", description: "Complete 100 workouts", emoji: "💯", category: "fitness", rarity: "epic", unlocked: false, progress: 0.47, progressLabel: "47/100", requirement: "100 total workouts" },
  { id: "step_master", name: "Step Master", description: "Walk 10,000 steps in a single day", emoji: "👟", category: "fitness", rarity: "common", unlocked: true, unlockedAt: "2025-12-05", progress: 1, requirement: "10K steps in one day" },
  { id: "marathon_walker", name: "Marathon Walker", description: "Walk a cumulative marathon distance", emoji: "🏃", category: "fitness", rarity: "rare", unlocked: false, progress: 0.68, progressLabel: "28.6/42.2 km", requirement: "42.2 km total distance" },
  { id: "early_bird", name: "Early Bird", description: "Complete 10 workouts before 7 AM", emoji: "🌅", category: "fitness", rarity: "uncommon", unlocked: true, unlockedAt: "2026-02-10", progress: 1, requirement: "10 early morning workouts" },
  { id: "night_owl", name: "Night Owl", description: "Complete 10 workouts after 8 PM", emoji: "🦉", category: "fitness", rarity: "uncommon", unlocked: false, progress: 0.3, progressLabel: "3/10", requirement: "10 evening workouts" },
  { id: "beast_mode", name: "Beast Mode", description: "Burn 1000+ calories in a single workout", emoji: "🦁", category: "fitness", rarity: "legendary", unlocked: false, progress: 0.0, requirement: "1000 cal in one session" },
  { id: "streak_7", name: "7-Day Streak", description: "Work out 7 days in a row", emoji: "🔥", category: "fitness", rarity: "uncommon", unlocked: true, unlockedAt: "2026-01-10", progress: 1, requirement: "7-day workout streak" },
  { id: "streak_30", name: "30-Day Streak", description: "Work out 30 days in a row", emoji: "🌋", category: "fitness", rarity: "epic", unlocked: false, progress: 0.53, progressLabel: "16/30", requirement: "30-day workout streak" },
  { id: "streak_100", name: "Centurion", description: "Maintain a 100-day workout streak", emoji: "👑", category: "fitness", rarity: "legendary", unlocked: false, progress: 0.16, progressLabel: "16/100", requirement: "100-day workout streak" },

  // Nutrition
  { id: "first_log", name: "Food Logger", description: "Log your first meal", emoji: "🍽️", category: "nutrition", rarity: "common", unlocked: true, unlockedAt: "2025-12-01", progress: 1, requirement: "Log 1 meal" },
  { id: "calorie_counter", name: "Calorie Counter", description: "Hit your calorie goal 7 days in a row", emoji: "🎯", category: "nutrition", rarity: "uncommon", unlocked: true, unlockedAt: "2026-01-05", progress: 1, requirement: "7-day calorie streak" },
  { id: "protein_king", name: "Protein King", description: "Hit 150g+ protein for 14 days straight", emoji: "🥩", category: "nutrition", rarity: "rare", unlocked: false, progress: 0.57, progressLabel: "8/14 days", requirement: "14-day protein streak" },
  { id: "hydration_hero", name: "Hydration Hero", description: "Drink 3L+ water for 30 days", emoji: "💧", category: "nutrition", rarity: "epic", unlocked: false, progress: 0.4, progressLabel: "12/30 days", requirement: "30-day hydration streak" },
  { id: "meal_prep_pro", name: "Meal Prep Pro", description: "Log all 3 meals for 30 days", emoji: "🥗", category: "nutrition", rarity: "rare", unlocked: false, progress: 0.33, progressLabel: "10/30 days", requirement: "30 complete logging days" },
  { id: "clean_eater", name: "Clean Eater", description: "Stay within macros for 7 consecutive days", emoji: "🥦", category: "nutrition", rarity: "uncommon", unlocked: true, unlockedAt: "2026-02-20", progress: 1, requirement: "7-day macro compliance" },

  // Social
  { id: "social_butterfly", name: "Social Butterfly", description: "Add 5 friends to your circle", emoji: "🦋", category: "social", rarity: "uncommon", unlocked: true, unlockedAt: "2026-01-15", progress: 1, requirement: "5 friends in circle" },
  { id: "motivator", name: "Motivator", description: "Send 50 messages in circle chat", emoji: "💬", category: "social", rarity: "rare", unlocked: false, progress: 0.24, progressLabel: "12/50", requirement: "50 chat messages" },
  { id: "influencer", name: "Influencer", description: "Invite 10 friends who join the app", emoji: "📣", category: "social", rarity: "epic", unlocked: false, progress: 0.2, progressLabel: "2/10", requirement: "10 successful invites" },
  { id: "first_share", name: "Show Off", description: "Share your first progress photo", emoji: "📸", category: "social", rarity: "common", unlocked: true, unlockedAt: "2026-01-20", progress: 1, requirement: "Share 1 progress photo" },
  { id: "leaderboard_top", name: "Top Dog", description: "Reach #1 on any leaderboard", emoji: "🥇", category: "social", rarity: "rare", unlocked: true, unlockedAt: "2026-02-01", progress: 1, requirement: "#1 on leaderboard" },

  // Challenges
  { id: "first_challenge", name: "Challenger", description: "Complete your first challenge", emoji: "⚔️", category: "challenges", rarity: "common", unlocked: true, unlockedAt: "2026-01-25", progress: 1, requirement: "Complete 1 challenge" },
  { id: "challenge_win_3", name: "Triple Threat", description: "Win 3 challenges", emoji: "🏆", category: "challenges", rarity: "uncommon", unlocked: true, unlockedAt: "2026-02-15", progress: 1, requirement: "Win 3 challenges" },
  { id: "challenge_win_10", name: "Champion", description: "Win 10 challenges", emoji: "👑", category: "challenges", rarity: "rare", unlocked: false, progress: 0.5, progressLabel: "5/10", requirement: "Win 10 challenges" },
  { id: "undefeated_5", name: "Undefeated", description: "Win 5 challenges in a row", emoji: "🛡️", category: "challenges", rarity: "epic", unlocked: false, progress: 0.6, progressLabel: "3/5", requirement: "5-win streak" },
  { id: "challenge_master", name: "Challenge Master", description: "Complete 25 total challenges", emoji: "⭐", category: "challenges", rarity: "legendary", unlocked: false, progress: 0.28, progressLabel: "7/25", requirement: "25 total challenges" },
];

const DEMO_TROPHIES: Trophy[] = [
  { id: "t1", name: "Step Showdown", emoji: "🏆", description: "Won the 7-day step challenge", wonAt: "2026-02-15", opponentName: "Alex M.", challengeType: "steps" },
  { id: "t2", name: "Calorie Crusher", emoji: "🏆", description: "Won the calorie burn challenge", wonAt: "2026-02-01", opponentName: "Sarah K.", challengeType: "calories" },
  { id: "t3", name: "Workout Warrior", emoji: "🏆", description: "Won the workout completion challenge", wonAt: "2026-01-25", opponentName: "James T.", challengeType: "workouts" },
  { id: "t4", name: "Distance King", emoji: "🏆", description: "Won the distance challenge", wonAt: "2026-03-10", opponentName: "Mike R.", challengeType: "distance" },
  { id: "t5", name: "Streak Survivor", emoji: "🏆", description: "Won the streak challenge", wonAt: "2026-03-20", opponentName: "Lisa W.", challengeType: "streak" },
];

const CATEGORIES: { id: BadgeCategory; label: string; emoji: string }[] = [
  { id: "all", label: "All", emoji: "🏅" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "nutrition", label: "Nutrition", emoji: "🥗" },
  { id: "social", label: "Social", emoji: "👥" },
  { id: "challenges", label: "Challenges", emoji: "⚔️" },
];

const ACHIEVEMENTS_KEY = "@achievements_data";

export default function AchievementsScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<BadgeCategory>("all");
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showTrophies, setShowTrophies] = useState(false);
  const [badges, setBadges] = useState<Badge[]>(ALL_BADGES);
  const [trophies, setTrophies] = useState<Trophy[]>(DEMO_TROPHIES);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.badges) setBadges(data.badges);
          if (data.trophies) setTrophies(data.trophies);
        }
      } catch {}
    })();
  }, []);

  const filteredBadges = useMemo(() => {
    if (activeCategory === "all") return badges;
    return badges.filter((b) => b.category === activeCategory);
  }, [badges, activeCategory]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;
  const completionPct = Math.round((unlockedCount / totalCount) * 100);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Share.share({
        message: `🏅 PeakPulse Achievements: ${unlockedCount}/${totalCount} badges unlocked (${completionPct}%)! 🏆 ${trophies.length} challenge trophies earned. #PeakPulse #FitnessGoals`,
      });
    } catch {}
  }, [unlockedCount, totalCount, completionPct, trophies.length]);

  const renderBadge = (badge: Badge) => {
    const rarityColor = RARITY_COLORS[badge.rarity];
    return (
      <TouchableOpacity
        key={badge.id}
        style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedBadge(badge);
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.badgeEmojiBox, { borderColor: badge.unlocked ? rarityColor : C.muted + "30" }]}>
          <Text style={[styles.badgeEmoji, !badge.unlocked && { opacity: 0.3 }]}>{badge.emoji}</Text>
          {!badge.unlocked && (
            <View style={styles.lockOverlay}>
              <MaterialIcons name="lock" size={14} color={C.muted} />
            </View>
          )}
        </View>
        <Text style={[styles.badgeName, !badge.unlocked && { color: C.muted }]} numberOfLines={1}>{badge.name}</Text>
        <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
        {!badge.unlocked && badge.progress > 0 && (
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${badge.progress * 100}%`, backgroundColor: rarityColor }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
              <Text style={styles.headerSub}>{unlockedCount}/{totalCount} unlocked · {trophies.length} trophies</Text>
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
                  <Text style={styles.progressPct}>{completionPct}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.progressTitle}>Achievement Progress</Text>
                  <Text style={styles.progressSub}>{unlockedCount} of {totalCount} badges earned</Text>
                  <View style={styles.overallBarBg}>
                    <View style={[styles.overallBarFill, { width: `${completionPct}%` }]} />
                  </View>
                </View>
              </View>

              {/* Rarity Breakdown */}
              <View style={styles.rarityRow}>
                {(["common", "uncommon", "rare", "epic", "legendary"] as BadgeRarity[]).map((r) => {
                  const count = badges.filter((b) => b.rarity === r && b.unlocked).length;
                  const total = badges.filter((b) => b.rarity === r).length;
                  return (
                    <View key={r} style={styles.rarityItem}>
                      <View style={[styles.rarityColorDot, { backgroundColor: RARITY_COLORS[r] }]} />
                      <Text style={styles.rarityLabel}>{RARITY_LABELS[r]}</Text>
                      <Text style={[styles.rarityCount, { color: RARITY_COLORS[r] }]}>{count}/{total}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Trophy Case Toggle */}
            <TouchableOpacity
              style={styles.trophyToggle}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTrophies(!showTrophies);
              }}
            >
              <Text style={{ fontSize: 20 }}>🏆</Text>
              <Text style={styles.trophyToggleText}>Challenge Trophies ({trophies.length})</Text>
              <MaterialIcons name={showTrophies ? "expand-less" : "expand-more"} size={20} color={C.gold} />
            </TouchableOpacity>

            {/* Trophy Case */}
            {showTrophies && (
              <View style={styles.trophyCase}>
                {trophies.map((trophy) => (
                  <View key={trophy.id} style={styles.trophyCard}>
                    <Text style={{ fontSize: 32 }}>{trophy.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trophyName}>{trophy.name}</Text>
                      <Text style={styles.trophyDesc}>{trophy.description}</Text>
                      <Text style={styles.trophyMeta}>vs {trophy.opponentName} · {new Date(trophy.wonAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))}
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
              {filteredBadges.map(renderBadge)}
            </View>
          </ScrollView>

          {/* Badge Detail Modal */}
          <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {selectedBadge && (
                  <>
                    <View style={[styles.modalEmojiBox, { borderColor: RARITY_COLORS[selectedBadge.rarity] }]}>
                      <Text style={{ fontSize: 48 }}>{selectedBadge.emoji}</Text>
                    </View>
                    <Text style={styles.modalName}>{selectedBadge.name}</Text>
                    <View style={[styles.modalRarityBadge, { backgroundColor: RARITY_COLORS[selectedBadge.rarity] + "20" }]}>
                      <Text style={[styles.modalRarityText, { color: RARITY_COLORS[selectedBadge.rarity] }]}>
                        {RARITY_LABELS[selectedBadge.rarity]}
                      </Text>
                    </View>
                    <Text style={styles.modalDesc}>{selectedBadge.description}</Text>
                    <Text style={styles.modalReq}>Requirement: {selectedBadge.requirement}</Text>

                    {selectedBadge.unlocked ? (
                      <View style={styles.modalUnlockedBadge}>
                        <MaterialIcons name="check-circle" size={16} color={C.green} />
                        <Text style={{ color: C.green, fontSize: 13, fontWeight: "600" }}>
                          Unlocked {selectedBadge.unlockedAt ? new Date(selectedBadge.unlockedAt).toLocaleDateString() : ""}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ width: "100%", marginTop: 16 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ color: C.muted, fontSize: 12 }}>Progress</Text>
                          <Text style={{ color: RARITY_COLORS[selectedBadge.rarity], fontSize: 12, fontWeight: "700" }}>
                            {selectedBadge.progressLabel ?? `${Math.round(selectedBadge.progress * 100)}%`}
                          </Text>
                        </View>
                        <View style={styles.modalProgressBg}>
                          <View style={[styles.modalProgressFill, { width: `${selectedBadge.progress * 100}%`, backgroundColor: RARITY_COLORS[selectedBadge.rarity] }]} />
                        </View>
                      </View>
                    )}

                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedBadge(null)}>
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
    backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: C.fg, fontSize: 20, fontWeight: "800" },
  headerSub: { color: C.muted, fontSize: 11, marginTop: 1 },
  shareBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center",
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
    height: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 3, marginTop: 8,
  },
  overallBarFill: { height: 6, backgroundColor: C.gold, borderRadius: 3 },
  rarityRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  rarityItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  rarityColorDot: { width: 8, height: 8, borderRadius: 4 },
  rarityLabel: { color: C.muted, fontSize: 11 },
  rarityCount: { fontSize: 11, fontWeight: "700" },
  // Trophy Toggle
  trophyToggle: {
    flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16,
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  trophyToggleText: { flex: 1, color: C.fg, fontSize: 14, fontWeight: "700" },
  // Trophy Case
  trophyCase: { marginHorizontal: 16, gap: 8, marginBottom: 12 },
  trophyCard: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.surface,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  trophyName: { color: C.gold2, fontSize: 14, fontWeight: "700" },
  trophyDesc: { color: C.fg, fontSize: 12, marginTop: 2 },
  trophyMeta: { color: C.muted, fontSize: 10, marginTop: 3 },
  // Category Tabs
  catBar: { marginBottom: 12 },
  catTab: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  catTabActive: { backgroundColor: "rgba(245,158,11,0.15)", borderColor: C.gold },
  catTabText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  catTabTextActive: { color: C.gold },
  // Badge Grid
  badgeGrid: {
    flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12,
    gap: 10, justifyContent: "flex-start",
  },
  badgeCard: {
    width: "30%", backgroundColor: C.surface, borderRadius: 14, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: C.border, gap: 6,
  },
  badgeCardLocked: { opacity: 0.7 },
  badgeEmojiBox: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.05)",
  },
  badgeEmoji: { fontSize: 22 },
  lockOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 24, backgroundColor: "rgba(10,14,20,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  badgeName: { color: C.fg, fontSize: 11, fontWeight: "700", textAlign: "center" },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  progressBarBg: {
    width: "100%", height: 3, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 2,
  },
  progressBarFill: { height: 3, borderRadius: 2 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center",
    alignItems: "center", padding: 30,
  },
  modalContent: {
    width: "100%", backgroundColor: "#141A22", borderRadius: 20, padding: 24,
    alignItems: "center", borderWidth: 1, borderColor: C.border,
  },
  modalEmojiBox: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 3,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.05)",
    marginBottom: 16,
  },
  modalName: { color: C.fg, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  modalRarityBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  modalRarityText: { fontSize: 12, fontWeight: "700" },
  modalDesc: { color: C.fg, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 8 },
  modalReq: { color: C.muted, fontSize: 12, marginBottom: 4 },
  modalUnlockedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16,
    backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  modalProgressBg: {
    height: 8, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 4,
  },
  modalProgressFill: { height: 8, borderRadius: 4 },
  modalCloseBtn: {
    marginTop: 20, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 12,
    paddingHorizontal: 30, paddingVertical: 12,
  },
  modalCloseBtnText: { color: C.gold, fontSize: 14, fontWeight: "700" },
});
