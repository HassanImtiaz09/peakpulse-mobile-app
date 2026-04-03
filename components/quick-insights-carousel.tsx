import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaFrame } from "@/lib/safe-frame";
import { useColors } from "@/lib/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 64;
const CARD_GAP = 12;

interface InsightCard {
  id: string;
  emoji: string;
  accentColor: string;
  accentBg: string;
  title: string;
  value: string;
  subtitle: string;
  route: string;
  cta: string;
  isPremium?: boolean;
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
  const SF = useColors();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isUp = volumeChange ? volumeChange > 0 : false;

  const cards: InsightCard[] = [
    {
      id: "streak",
      emoji: streakDays >= 7 ? "\u{1F525}" : "\u{1F4AA}",
      accentColor: "#F97316",
      accentBg: "#FFF7ED",
      title: "Streak",
      value: `${streakDays}-Day`,
      subtitle: streakDays >= 7
        ? "Incredible consistency! Keep going."
        : streakDays > 0
        ? "Building momentum. Stay consistent!"
        : "Start your streak today!",
      route: "/(tabs)/plans",
      cta: "View Plans",
    },
    ...(recentPR
      ? [
          {
            id: "pr",
            emoji: "\u{1F3C6}",
            accentColor: "#EAB308",
            accentBg: "#FEFCE8",
            title: "New PR!",
            value: recentPR.exercise,
            subtitle: `${recentPR.weight}kg x ${recentPR.reps} reps — Personal best!`,
            route: "/workout/analytics",
            cta: "View Records",
          },
        ]
      : []),
    ...(volumeChange !== null && volumeChange !== undefined
      ? [
          {
            id: "volume",
            emoji: isUp ? "\u{1F4C8}" : "\u{1F4C9}",
            accentColor: isUp ? "#22C55E" : "#EF4444",
            accentBg: isUp ? "#F0FDF4" : "#FEF2F2",
            title: "Weekly Volume",
            value: `${isUp ? "+" : ""}${Math.abs(volumeChange)}%`,
            subtitle: isUp
              ? "Great progress this week!"
              : "Consider increasing training load.",
            route: "/workout/analytics",
            cta: "View Analytics",
          },
        ]
      : []),
    {
      id: "workouts",
      emoji: "\u{1F3CB}",
      accentColor: "#8B5CF6",
      accentBg: "#F5F3FF",
      title: "Total Workouts",
      value: `${totalWorkouts}`,
      subtitle: totalWorkouts > 20
        ? "You're a dedicated athlete!"
        : "Every workout counts. Keep pushing!",
      route: "/workout/analytics",
      cta: "View History",
    },
    {
      id: "ai-coach",
      emoji: "\u{1F916}",
      accentColor: "#06B6D4",
      accentBg: "#ECFEFF",
      title: "AI Coach",
      value: "Premium",
      subtitle: "Get personalised tips and form advice.",
      route: "/(tabs)/ai-coach",
      cta: "Ask Coach",
      isPremium: true,
    },
    {
      id: "voice-coach",
      emoji: "\u{1F399}",
      accentColor: "#EC4899",
      accentBg: "#FDF2F8",
      title: "Voice Coaching",
      value: "Premium",
      subtitle: "Audio cues for hands-free guidance.",
      route: "/voice-coach-settings",
      cta: "Configure",
      isPremium: true,
    },
  ];

  const renderCard = ({ item, index }: { item: InsightCard; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(item.route as any)}
      style={{
        width: CARD_WIDTH,
        marginRight: CARD_GAP,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: SF.surface,
        borderWidth: 1.5,
        borderColor: item.isPremium ? item.accentColor + "40" : SF.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      {/* Top accent bar */}
      <View
        style={{
          height: 4,
          backgroundColor: item.accentColor,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      />

      <View style={{ padding: 20 }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: item.accentBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: SF.secondaryText, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: item.accentColor }}>
                {item.value}
              </Text>
            </View>
          </View>
          {item.isPremium && (
            <View
              style={{
                backgroundColor: item.accentColor + "18",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: item.accentColor, textTransform: "uppercase" }}>
                Premium
              </Text>
            </View>
          )}
        </View>

        {/* Subtitle */}
        <Text style={{ fontSize: 14, lineHeight: 20, color: SF.secondaryText, marginBottom: 16 }}>
          {item.subtitle}
        </Text>

        {/* CTA button */}
        <TouchableOpacity
          onPress={() => router.push(item.route as any)}
          style={{
            backgroundColor: item.accentColor + "14",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: item.accentColor }}>
            {item.cta}
          </Text>
          <MaterialIcons name="arrow-forward" size={14} color={item.accentColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
      />
      {/* Pagination dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 14 }}>
        {cards.map((card, i) => (
          <View
            key={card.id}
            style={{
              width: i === activeIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === activeIndex ? card.accentColor : SF.border,
              transition: "width 0.2s",
            }}
          />
        ))}
      </View>
    </View>
  );
}
