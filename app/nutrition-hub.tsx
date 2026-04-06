import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenErrorBoundary } from "@/components/error-boundary";
import { SF, UI } from "@/constants/ui-colors";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 48 - CARD_GAP) / 2;

interface HubCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  gradient: string[];
  badge?: string;
}

const HUB_SECTIONS: { title: string; cards: HubCard[] }[] = [
  {
    title: "Track & Log",
    cards: [
      {
        id: "log",
        title: "Log a Meal",
        subtitle: "Manual, AI scan, or barcode",
        icon: "add-circle",
        route: "/(tabs)/meals",
        gradient: ["#14B8A6", "#0D9488"],
      },
      {
        id: "timeline",
        title: "Meal Timeline",
        subtitle: "Today's intake at a glance",
        icon: "time",
        route: "/meal-timeline",
        gradient: ["#6366F1", "#4F46E5"],
      },
      {
        id: "barcode",
        title: "Barcode Scanner",
        subtitle: "Scan packaged food labels",
        icon: "barcode",
        route: "/barcode-scanner",
        gradient: ["#8B5CF6", "#7C3AED"],
      },
      {
        id: "receipt",
        title: "Scan Receipt",
        subtitle: "Log from grocery receipts",
        icon: "receipt",
        route: "/scan-receipt",
        gradient: ["#EC4899", "#DB2777"],
      },
    ],
  },
  {
    title: "Plan & Prep",
    cards: [
      {
        id: "mealplan",
        title: "AI Meal Plan",
        subtitle: "Generate a weekly plan",
        icon: "calendar",
        route: "/(tabs)/meals",
        gradient: ["#F59E0B", "#D97706"],
        badge: "AI",
      },
      {
        id: "mealprep",
        title: "Meal Prep",
        subtitle: "Batch prep guides",
        icon: "restaurant",
        route: "/meal-prep",
        gradient: ["#EF4444", "#DC2626"],
      },
    ],
  },
  {
    title: "Analyse & Insights",
    cards: [
      {
        id: "charts",
        title: "Nutrition Charts",
        subtitle: "Macros, trends & goals",
        icon: "stats-chart",
        route: "/nutrition-charts",
        gradient: ["#14B8A6", "#0891B2"],
      },
      {
        id: "gallery",
        title: "Meal Gallery",
        subtitle: "Photo history of meals",
        icon: "images",
        route: "/meal-photo-gallery",
        gradient: ["#A855F7", "#9333EA"],
      },
    ],
  },
  {
    title: "Kitchen & Pantry",
    cards: [
      {
        id: "pantry",
        title: "My Pantry",
        subtitle: "Track ingredients at home",
        icon: "basket",
        route: "/pantry",
        gradient: ["#F97316", "#EA580C"],
      },
    ],
  },
];

function DailySummaryBanner() {
  const [cals, setCals] = useState(0);
  const [goal, setGoal] = useState(2200);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("@daily_calories");
        if (stored) setCals(parseInt(stored, 10));
        const g = await AsyncStorage.getItem("@calorie_goal");
        if (g) setGoal(parseInt(g, 10));
      } catch {}
    })();
  }, []);

  const pct = Math.min(100, Math.round((cals / goal) * 100));
  const remaining = Math.max(0, goal - cals);

  return (
    <View style={styles.summaryBanner}
        accessibilityRole="summary"
        accessibilityLabel="Daily calorie summary">
      <View style={styles.summaryLeft}>
        <Text style={styles.summaryLabel}>Today</Text>
        <Text style={styles.summaryCals}>{cals.toLocaleString()} kcal</Text>
        <Text style={styles.summaryRemaining}>{remaining.toLocaleString()} remaining</Text>
      </View>
      <View style={styles.summaryRight}>
        <View style={styles.progressRing}>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
      </View>
    </View>
  );
}

function HubCardItem({ card, onPress }: { card: HubCard; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <LinearGradient
        colors={card.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {card.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{card.badge}</Text>
          </View>
        )}
        <Ionicons name={card.icon as any} size={28} color="#fff" />
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardSub}>{card.subtitle}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function NutritionHubContent() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back" style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={SF.fg} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Nutrition Hub</Text>
            <Text style={styles.headerSub}>All your food tools in one place</Text>
          </View>
        </View>

        {/* Daily Summary */}
        <DailySummaryBanner />

        {/* Section Cards */}
        {HUB_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.cardGrid}>
              {section.cards.map((card) => (
                <HubCardItem
                  key={card.id}
                  card={card}
                  onPress={() => router.push(card.route as any)}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

export default function NutritionHubScreen() {
  return (
    <ScreenErrorBoundary screenName="nutrition-hub">
      <NutritionHubContent />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SF.bg,
  },
  scroll: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 18,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SF.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "BebasNeue_400Regular",
    color: SF.fg,
    letterSpacing: 1.2,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: SF.muted,
    marginTop: -2,
  },
  summaryBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: SF.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  summaryLeft: { flex: 1 },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: SF.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryCals: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: SF.fg,
    marginTop: 2,
  },
  summaryRemaining: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: SF.muted,
    marginTop: 2,
  },
  summaryRight: { marginLeft: 16 },
  progressRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
  },
  progressPct: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: "#14B8A6",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: SF.fg,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  card: {
    width: CARD_W,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 16,
    minHeight: 120,
    justifyContent: "flex-end",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    marginTop: 10,
  },
  cardSub: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
});
