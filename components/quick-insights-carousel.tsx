/**
 * R6: Quick Insights Carousel
 * Horizontally swipeable cards that surface different features each session.
 * Replaces 15+ deep-scroll sections with a compact, rotating carousel.
 */
import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UI as SF } from "@/constants/ui-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_GAP = 10;

interface InsightCard {
  id: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  title: string;
  subtitle: string;
  route: string;
  cta: string;
}

interface QuickInsightsCarouselProps {
  streakDays?: number;
  recentPR?: { exercise: string; weight: number; reps: number } | null;
  muscleTip?: string | null;
  volumeChange?: number | null;
  totalWorkouts?: number;
}

export function QuickInsightsCarousel({
  streakDays = 0,
  recentPR,
  muscleTip,
  volumeChange,
  totalWorkouts = 0,
}: QuickInsightsCarouselProps) {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const cards: InsightCard[] = [];

  // Streak card
  if (streakDays > 0) {
    cards.push({
      id: "streak",
      icon: "local-fire-department",
      iconColor: "#F97316",
      bgColor: "rgba(249,115,22,0.08)",
      borderColor: "rgba(249,115,22,0.20)",
      title: `${streakDays}-Day Streak`,
      subtitle: streakDays >= 7 ? "Incredible consistency! Keep the momentum." : "You're building a great habit!",
      route: "/workout-calendar",
      cta: "View History",
    });
  }

  // Recent PR card
  if (recentPR) {
    cards.push({
      id: "pr",
      icon: "emoji-events",
      iconColor: "#22C55E",
      bgColor: "rgba(34,197,94,0.08)",
      borderColor: "rgba(34,197,94,0.20)",
      title: `New PR: ${recentPR.exercise}`,
      subtitle: `${recentPR.weight}kg × ${recentPR.reps} reps`,
      route: "/workout-analytics",
      cta: "View Records",
    });
  }

  // Muscle balance tip
  if (muscleTip) {
    cards.push({
      id: "muscle",
      icon: "accessibility-new",
      iconColor: SF.blue,
      bgColor: "rgba(59,130,246,0.08)",
      borderColor: "rgba(59,130,246,0.20)",
      title: "Muscle Balance Tip",
      subtitle: muscleTip,
      route: "/workout-analytics",
      cta: "View Balance",
    });
  }

  // Volume change card
  if (volumeChange !== null && volumeChange !== undefined && totalWorkouts >= 3) {
    const isUp = volumeChange > 0;
    cards.push({
      id: "volume",
      icon: isUp ? "trending-up" : "trending-down",
      iconColor: isUp ? SF.emerald : SF.red,
      bgColor: isUp ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
      borderColor: isUp ? "rgba(16,185,129,0.20)" : "rgba(239,68,68,0.20)",
      title: `Volume ${isUp ? "Up" : "Down"} ${Math.abs(volumeChange)}%`,
      subtitle: isUp ? "Great progress this week!" : "Consider increasing your training load.",
      route: "/workout-analytics",
      cta: "View Analytics",
    });
  }

  // AI Coach suggestion
  cards.push({
    id: "ai-coach",
    icon: "smart-toy",
    iconColor: SF.purple,
    bgColor: "rgba(168,85,247,0.08)",
    borderColor: "rgba(168,85,247,0.20)",
    title: "AI Coach",
    subtitle: "Get personalised tips and form advice from your AI coach.",
    route: "/(tabs)/ai-coach",
    cta: "Ask Coach",
  });

  // Voice coaching
  cards.push({
    id: "voice-coach",
    icon: "record-voice-over",
    iconColor: SF.gold,
    bgColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.20)",
    title: "Voice Coaching",
    subtitle: "Enable audio cues during your workout for hands-free guidance.",
    route: "/voice-coach-settings",
    cta: "Configure",
  });

  if (cards.length === 0) return null;

  const renderCard = ({ item }: { item: InsightCard }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}
      onPress={() => router.push(item.route as any)}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
          <MaterialIcons name={item.icon as any} size={22} color={item.iconColor} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.ctaText, { color: item.iconColor }]}>{item.cta}</Text>
        <MaterialIcons name="arrow-forward" size={14} color={item.iconColor} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
      />
      {/* Pagination dots */}
      {cards.length > 1 && (
        <View style={styles.dots}>
          {cards.map((c, i) => (
            <View key={c.id} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    justifyContent: "space-between",
    minHeight: 120,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: "#F1F5F9",
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#94A3B8",
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    alignSelf: "flex-end",
  },
  ctaText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(100,116,139,0.3)",
  },
  dotActive: {
    backgroundColor: "#F59E0B",
    width: 16,
  },
});
