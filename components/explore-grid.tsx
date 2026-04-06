/**
 * R1/R6: "Explore" Grid — Categorized feature tiles
 * Replaces the old 6-tile grid with a comprehensive, categorized grid
 * that surfaces ALL app features including My Pantry, Wearables, Social, Challenges, etc.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useSubscription } from "@/hooks/use-subscription";
import { UI as SF } from "@/constants/ui-colors";

interface GridTile {
  icon: string;
  label: string;
  route: string;
  color: string;
  bgColor: string;
  feature?: string;
  tier?: "basic" | "pro";
  badge?: string;
}

interface TileCategory {
  title: string;
  icon: string;
  tiles: GridTile[];
}

const CATEGORIES: TileCategory[] = [
  {
    title: "Wearables & Tracking",
    icon: "watch",
    tiles: [
      { icon: "watch", label: "Wearables", route: "/wearable-sync", color: "#06B6D4", bgColor: "rgba(6,182,212,0.12)", feature: "wearable_sync", tier: "basic" },
      { icon: "show-chart", label: "Health Trends", route: "/health-trends", color: "#3B82F6", bgColor: "rgba(59,130,246,0.12)", feature: "health_trends", tier: "basic" },
      { icon: "notifications-active", label: "AI Reminders", route: "/notification-settings", color: "#F59E0B", bgColor: "rgba(245,158,11,0.12)", feature: "ai_reminders", tier: "basic" },
    ],
  },
  {
    title: "Premium AI Features",
    icon: "auto-awesome",
    tiles: [
      { icon: "smart-toy", label: "AI Coach", route: "/(tabs)/ai-coach", color: "#7C3AED", bgColor: "rgba(124,58,237,0.15)", feature: "ai_coach", tier: "pro", badge: "PRO" },
      { icon: "center-focus-strong", label: "Form Check", route: "/form-checker", color: "#DB2777", bgColor: "rgba(219,39,119,0.15)", feature: "form_checker", tier: "pro", badge: "PRO" },
      { icon: "camera-alt", label: "Body Scan", route: "/(tabs)/scan", color: "#0891B2", bgColor: "rgba(8,145,178,0.15)", feature: "body_scan", tier: "pro", badge: "PRO" },
      { icon: "record-voice-over", label: "Voice Coach", route: "/voice-coach-settings", color: "#C026D3", bgColor: "rgba(192,38,211,0.15)", feature: "voice_coach", tier: "pro", badge: "PRO" },
    ],
  },
  {
    title: "Training",
    icon: "fitness-center",
    tiles: [
      { icon: "bar-chart", label: "Analytics", route: "/workout/analytics", color: "#3B82F6", bgColor: "rgba(59,130,246,0.12)" },
      { icon: "emoji-events", label: "Records", route: "/personal-records", color: "#22C55E", bgColor: "rgba(34,197,94,0.12)" },
      { icon: "calendar-today", label: "Calendar", route: "/workout/calendar", color: "#F59E0B", bgColor: "rgba(245,158,11,0.12)" },
      { icon: "view-list", label: "Templates", route: "/workout/templates", color: "#8B5CF6", bgColor: "rgba(139,92,246,0.12)" },
      { icon: "check-circle", label: "Check-In", route: "/daily-checkin", color: "#14B8A6", bgColor: "rgba(20,184,166,0.12)" },
      { icon: "accessibility-new", label: "By Muscle", route: "/browse-by-muscle", color: "#F59E0B", bgColor: "rgba(245,158,11,0.12)" },
    ],
  },
  {
    title: "Progress",
    icon: "trending-up",
    tiles: [
      { icon: "trending-up", label: "Progress Photos", route: "/progress-photos", color: "#10B981", bgColor: "rgba(16,185,129,0.12)", feature: "progress_photos", tier: "basic" },
      { icon: "bar-chart", label: "Weekly Summary", route: "/weekly-summary", color: "#6366F1", bgColor: "rgba(99,102,241,0.12)" },
      { icon: "star", label: "Achievements", route: "/achievements", color: "#FBBF24", bgColor: "rgba(251,191,36,0.12)" },
    ],
  },
  {
    title: "Social & Challenges",
    icon: "people",
    tiles: [
      { icon: "people", label: "Social Circle", route: "/social-circle", color: "#3B82F6", bgColor: "rgba(59,130,246,0.12)" },
      { icon: "group", label: "Community", route: "/social-feed", color: "#8B5CF6", bgColor: "rgba(139,92,246,0.12)", feature: "social_feed", tier: "basic" },
      { icon: "bolt", label: "7-Day Challenge", route: "/challenge-onboarding", color: "#F59E0B", bgColor: "rgba(245,158,11,0.12)", feature: "challenges", tier: "basic" },
      { icon: "sports-martial-arts", label: "Challenges", route: "/challenge", color: "#EF4444", bgColor: "rgba(239,68,68,0.12)" },
      { icon: "groups", label: "Group Goals", route: "/group-goals", color: "#14B8A6", bgColor: "rgba(20,184,166,0.12)" },
      { icon: "card-giftcard", label: "Refer a Friend", route: "/referral", color: "#EC4899", bgColor: "rgba(236,72,153,0.12)" },
    ],
  },
  {
    title: "More",
    icon: "explore",
    tiles: [
      { icon: "location-on", label: "Find Gym", route: "/gym-finder", color: "#EF4444", bgColor: "rgba(239,68,68,0.12)" },
      { icon: "workspace-premium", label: "Upgrade Plan", route: "/paywall", color: "#F59E0B", bgColor: "rgba(245,158,11,0.12)" },
    ],
  },
];

interface ExploreGridProps {
  onPaywall?: (feature: string, icon: string, tier: "basic" | "pro", desc?: string) => void;
}

export function ExploreGrid({ onPaywall }: ExploreGridProps) {
  const router = useRouter();
  const { canAccess } = useSubscription();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  function handlePress(tile: GridTile) {
    if (tile.feature && !canAccess(tile.feature)) {
      onPaywall?.(tile.feature, tile.icon, tile.tier ?? "basic", `Unlock ${tile.label} with a ${tile.tier === "pro" ? "Pro" : "Basic"} subscription.`);
      return;
    }
    router.push(tile.route as any);
  }

  function toggleCategory(title: string) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategory(prev => prev === title ? null : title);
  }

  return (
    <View style={styles.container}>
      {CATEGORIES.map((cat) => {
        const isExpanded = expandedCategory === cat.title;
        const premiumCount = cat.tiles.filter(t => t.feature).length;
        return (
          <View key={cat.title} style={styles.categoryContainer}>
            {/* Category Header */}
            <TouchableOpacity
              style={[styles.categoryHeader, isExpanded && styles.categoryHeaderActive]}
              onPress={() => toggleCategory(cat.title)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryHeaderLeft}>
                <View style={[styles.categoryIconBox, isExpanded && styles.categoryIconBoxActive]}>
                  <MaterialIcons name={cat.icon as any} size={18} color={isExpanded ? SF.bg : SF.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.categoryTitle, isExpanded && { color: SF.gold }]}>{cat.title}</Text>
                    {premiumCount > 0 && (
                      <View style={styles.premiumBadge}>
                        <MaterialIcons name="workspace-premium" size={9} color="#F59E0B" />
                        <Text style={styles.premiumBadgeText}>{premiumCount} Premium</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.categoryCount}>{cat.tiles.length} features</Text>
                </View>
              </View>
              <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={22} color={isExpanded ? SF.gold : SF.muted} />
            </TouchableOpacity>

            {/* Expanded Tiles */}
            {isExpanded && (
              <View style={styles.tilesGrid}>
                {cat.tiles.map((tile) => (
                  <TouchableOpacity
                    key={tile.label}
                    style={styles.tile}
                    onPress={() => handlePress(tile)}
                    activeOpacity={0.7}
                  >
                    {tile.badge && (
                      <View style={[
                        styles.tileBadge,
                        tile.badge === "PRO" ? styles.tileBadgePro : styles.tileBadgeBasic,
                      ]}>
                        <Text style={[
                          styles.tileBadgeText,
                          tile.badge === "PRO" ? { color: "#7C3AED" } : { color: "#F59E0B" },
                        ]}>{tile.badge}</Text>
                      </View>
                    )}
                    <View style={[styles.iconCircle, { backgroundColor: tile.bgColor }]}>
                      <MaterialIcons name={tile.icon as any} size={22} color={tile.color} />
                    </View>
                    <Text style={styles.tileLabel} numberOfLines={1}>{tile.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryContainer: {
    backgroundColor: SF.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SF.border,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  categoryHeaderActive: {
    borderBottomWidth: 1,
    borderBottomColor: SF.border,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.20)",
  },
  categoryIconBoxActive: {
    backgroundColor: SF.gold,
    borderColor: SF.gold,
  },
  categoryTitle: {
    color: SF.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  categoryCount: {
    color: SF.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  premiumBadgeText: {
    color: "#F59E0B",
    fontFamily: "DMSans_600SemiBold",
    fontSize: 8,
    letterSpacing: 0.5,
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
  },
  tile: {
    width: "30%" as any,
    backgroundColor: SF.surface2,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: SF.border,
    position: "relative",
  },
  tileBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tileBadgePro: {
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.4)",
  },
  tileBadgeBasic: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  tileBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
    letterSpacing: 0.8,
  },
  tilePremium: {
    borderWidth: 1.5,
    borderColor: "rgba(139,92,246,0.35)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    color: SF.fg,
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    textAlign: "center",
  },
});
