/**
 * R1/R6: "Explore More" Grid
 * 6-tile grid linking to features that were removed from the dashboard.
 * Replaces deep-scroll sections with a discoverable, compact grid.
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSubscription } from "@/hooks/use-subscription";

const SF = {
  surface: "#111827",
  surface2: "#1E293B",
  fg: "#F1F5F9",
  muted: "#64748B",
  gold: "#F59E0B",
  border: "rgba(30,41,59,0.6)",
};

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

const TILES: GridTile[] = [
  {
    icon: "bar-chart",
    label: "Analytics",
    route: "/workout-analytics",
    color: "#3B82F6",
    bgColor: "rgba(59,130,246,0.12)",
  },
  {
    icon: "camera-alt",
    label: "Body Scan",
    route: "/(tabs)/scan",
    color: "#22D3EE",
    bgColor: "rgba(34,211,238,0.12)",
    feature: "body_scan",
    tier: "basic",
  },
  {
    icon: "trending-up",
    label: "Progress",
    route: "/progress-photos",
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.12)",
    feature: "progress_photos",
    tier: "basic",
  },
  {
    icon: "smart-toy",
    label: "AI Coach",
    route: "/(tabs)/ai-coach",
    color: "#A855F7",
    bgColor: "rgba(168,85,247,0.12)",
    feature: "ai_coaching",
    tier: "pro",
    badge: "PRO",
  },
  {
    icon: "calendar-today",
    label: "Calendar",
    route: "/workout-calendar",
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.12)",
  },
  {
    icon: "location-on",
    label: "Find Gym",
    route: "/gym-finder",
    color: "#EF4444",
    bgColor: "rgba(239,68,68,0.12)",
  },
];

interface ExploreGridProps {
  onPaywall?: (feature: string, icon: string, tier: "basic" | "pro", desc?: string) => void;
}

export function ExploreGrid({ onPaywall }: ExploreGridProps) {
  const router = useRouter();
  const { canAccess } = useSubscription();

  function handlePress(tile: GridTile) {
    if (tile.feature && !canAccess(tile.feature)) {
      onPaywall?.(tile.feature, tile.icon, tile.tier ?? "basic", `Unlock ${tile.label} with a ${tile.tier === "pro" ? "Pro" : "Basic"} subscription.`);
      return;
    }
    router.push(tile.route as any);
  }

  return (
    <View style={styles.grid}>
      {TILES.map((tile) => (
        <TouchableOpacity
          key={tile.label}
          style={styles.tile}
          onPress={() => handlePress(tile)}
          activeOpacity={0.7}
        >
          {tile.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tile.badge}</Text>
            </View>
          )}
          <View style={[styles.iconCircle, { backgroundColor: tile.bgColor }]}>
            <MaterialIcons name={tile.icon as any} size={24} color={tile.color} />
          </View>
          <Text style={styles.tileLabel} numberOfLines={1}>{tile.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  tile: {
    width: "30.5%" as any,
    backgroundColor: SF.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: SF.border,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(168,85,247,0.15)",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.3)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeText: {
    color: "#A855F7",
    fontFamily: "DMSans_700Bold",
    fontSize: 7,
    letterSpacing: 0.8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    color: SF.fg,
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    textAlign: "center",
  },
});
