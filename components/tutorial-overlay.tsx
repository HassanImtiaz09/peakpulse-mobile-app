/**
 * TutorialOverlay
 * A full-screen walkthrough shown once to first-time users after they land on the dashboard.
 * Updated for the 4-tab layout: Home, Train, Nutrition, Profile.
 * Walks through 5 slides covering each tab, key features, and tips.
 * Dismissed permanently via AsyncStorage flag "@tutorial_complete".
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, Modal, ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width: W, height: H } = Dimensions.get("window");

const SF = {
  bg:      "#0A0E14",
  surface: "#141A22",
  border:  "rgba(245,158,11,0.18)",
  fg:      "#F1F5F9",
  muted:   "#64748B",
  gold:    "#F59E0B",
  gold2:   "#FBBF24",
  gold3:   "#FDE68A",
  teal:    "#14B8A6",
  emerald: "#10B981",
  orange:  "#EA580C",
};

interface TutorialSlide {
  iconName: React.ComponentProps<typeof MaterialIcons>["name"];
  tab: string;
  title: string;
  body: string;
  features: { label: string; tier: "free" | "basic" | "pro" }[];
  tip?: string;
}

const SLIDES: TutorialSlide[] = [
  {
    iconName: "dashboard",
    tab: "Home",
    title: "Your Daily Dashboard",
    body: "The Home tab is your command centre. See today's workout, daily calorie progress, weekly goals, and quick insights — all at a glance. Tap the floating button to start your workout instantly.",
    features: [
      { label: "Today's workout card with one-tap start", tier: "free" },
      { label: "Daily calorie & macro progress", tier: "free" },
      { label: "Weekly goal rings", tier: "free" },
      { label: "Quick Insights carousel (streaks, PRs, tips)", tier: "free" },
      { label: "Explore grid for all features", tier: "free" },
    ],
    tip: "Check the Home tab every morning to see your plan for the day.",
  },
  {
    iconName: "fitness-center",
    tab: "Train",
    title: "Your AI Workout Plans",
    body: "The Train tab holds your personalised AI workout schedule. Tap any exercise for instructions, start the Voice Coach Timer for guided sets, and track your progress with analytics and personal records.",
    features: [
      { label: "AI-generated workout plans", tier: "basic" },
      { label: "Voice Coach Timer with audio cues", tier: "basic" },
      { label: "Exercise form demonstrations", tier: "free" },
      { label: "Workout analytics & strength charts", tier: "basic" },
      { label: "Personal records tracking", tier: "free" },
    ],
    tip: "Use the Voice Coach Timer during your workout — it calls out form cues and counts down rest periods for you.",
  },
  {
    iconName: "restaurant",
    tab: "Nutrition",
    title: "Smart Meal Planning",
    body: "The Nutrition tab manages your meals, calories, and pantry. Log meals with the AI calorie scanner, follow your AI meal plan, and use the Smart Pantry to track what's in your kitchen.",
    features: [
      { label: "AI calorie estimation from photos", tier: "free" },
      { label: "AI-generated 7-day meal plans", tier: "basic" },
      { label: "Smart Pantry with expiry alerts", tier: "free" },
      { label: "Macro tracking & daily targets", tier: "free" },
      { label: "Cook Again shortcuts", tier: "free" },
    ],
    tip: "Snap a photo of any meal to instantly estimate calories and macros — no manual entry needed.",
  },
  {
    iconName: "person",
    tab: "Profile",
    title: "Settings & Progress",
    body: "The Profile tab is where you manage your account, view your workout calendar, check body scan history, adjust timer and notification settings, and explore community features.",
    features: [
      { label: "Workout calendar & streak history", tier: "free" },
      { label: "Body scan & progress photos", tier: "basic" },
      { label: "Timer, voice coach & sound settings", tier: "basic" },
      { label: "Notification preferences", tier: "free" },
      { label: "Subscription management", tier: "free" },
    ],
    tip: "Take a progress photo every 2 weeks for the most accurate body composition tracking.",
  },
  {
    iconName: "bolt",
    tab: "Get Started",
    title: "Maximise Your Results",
    body: "Consistency is everything. Complete your daily workout, log your meals, and check in with the AI Coach weekly. Users who log consistently for 4+ weeks see significantly better results.",
    features: [
      { label: "Complete today's workout", tier: "free" },
      { label: "Log all meals daily", tier: "free" },
      { label: "Weekly AI Coach check-in", tier: "basic" },
      { label: "Bi-weekly progress photos", tier: "free" },
      { label: "Enable smart reminders", tier: "free" },
    ],
    tip: "Enable Smart Reminders in Settings to get intelligent nudges based on your schedule and streak.",
  },
];

const TIER_COLORS: Record<string, string> = {
  free:  SF.emerald,
  basic: SF.teal,
  pro:   SF.gold,
};

const TIER_LABELS: Record<string, string> = {
  free:  "FREE",
  basic: "BASIC",
  pro:   "PRO",
};

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function TutorialOverlay({ visible, onDismiss }: Props) {
  const [slideIndex, setSlideIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function goTo(index: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setSlideIndex(index);
  }

  function handleNext() {
    if (slideIndex < SLIDES.length - 1) {
      goTo(slideIndex + 1);
    } else {
      onDismiss();
    }
  }

  function handlePrev() {
    if (slideIndex > 0) goTo(slideIndex - 1);
  }

  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => goTo(i)}>
                <View style={[styles.dot, i === slideIndex && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Icon + tab */}
              <View style={styles.iconRow}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name={slide.iconName} size={26} color={SF.gold} />
                </View>
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{slide.tab.toUpperCase()}</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.slideTitle}>{slide.title}</Text>

              {/* Body */}
              <Text style={styles.slideBody}>{slide.body}</Text>

              {/* Features */}
              <View style={styles.featureBlock}>
                {slide.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <MaterialIcons name="check-circle" size={15} color={TIER_COLORS[f.tier]} />
                    <Text style={styles.featureLabel}>{f.label}</Text>
                    <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[f.tier] + "22", borderColor: TIER_COLORS[f.tier] + "55" }]}>
                      <Text style={[styles.tierBadgeText, { color: TIER_COLORS[f.tier] }]}>{TIER_LABELS[f.tier]}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Tip */}
              {slide.tip && (
                <View style={styles.tipBox}>
                  <MaterialIcons name="lightbulb" size={16} color={SF.gold2} style={{ marginTop: 1 }} />
                  <Text style={styles.tipText}>{slide.tip}</Text>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, slideIndex === 0 && styles.navBtnDisabled]}
              onPress={handlePrev}
              disabled={slideIndex === 0}
            >
              <Text style={[styles.navBtnText, slideIndex === 0 && { color: SF.muted }]}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.counter}>{slideIndex + 1} / {SLIDES.length}</Text>

            <TouchableOpacity style={[styles.navBtn, styles.navBtnPrimary]} onPress={handleNext}>
              <Text style={styles.navBtnPrimaryText}>{isLast ? "Let's Go!" : "Next"}</Text>
            </TouchableOpacity>
          </View>

          {/* Skip */}
          <TouchableOpacity style={styles.skipBtn} onPress={onDismiss}>
            <Text style={styles.skipText}>Skip tutorial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook: returns whether the tutorial should be shown and a dismiss handler.
 * Reads/writes "@tutorial_complete" from AsyncStorage.
 */
export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("@tutorial_complete").then(val => {
      if (!val) setShowTutorial(true);
    });
  }, []);

  async function dismissTutorial() {
    await AsyncStorage.setItem("@tutorial_complete", "true");
    setShowTutorial(false);
  }

  return { showTutorial, dismissTutorial };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  sheet: { backgroundColor: SF.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, paddingBottom: 32, maxHeight: H * 0.88, borderTopWidth: 1, borderColor: SF.border },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 20, paddingHorizontal: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SF.muted },
  dotActive: { width: 24, backgroundColor: SF.gold },
  content: { paddingHorizontal: 24, paddingBottom: 8 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconCircle: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border },
  tabBadge: { backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: SF.border },
  tabBadgeText: { color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5 },
  slideTitle: { color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 24, lineHeight: 30, marginBottom: 10 },
  slideBody: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, marginBottom: 16 },
  featureBlock: { backgroundColor: SF.surface, borderRadius: 14, padding: 14, gap: 10, marginBottom: 14, borderWidth: 1, borderColor: SF.border },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureLabel: { color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1 },
  tierBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  tierBadgeText: { fontFamily: "DMSans_700Bold", fontSize: 9, letterSpacing: 0.8 },
  tipBox: { flexDirection: "row", backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  tipText: { color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginTop: 16 },
  navBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: SF.border },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  navBtnPrimary: { backgroundColor: SF.gold, borderColor: SF.gold },
  navBtnPrimaryText: { color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 14 },
  counter: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13 },
  skipBtn: { alignItems: "center", marginTop: 12 },
  skipText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, textDecorationLine: "underline" },
});
