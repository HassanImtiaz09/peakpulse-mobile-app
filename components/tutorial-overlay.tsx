/**
 * TutorialOverlay
 * A full-screen walkthrough shown once to first-time users after they land on the dashboard.
 * Walks through 6 slides covering each tab and key features, with plan tier callouts.
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
  bg:      "#0A0500",
  surface: "#150A00",
  border:  "rgba(245,158,11,0.18)",
  fg:      "#FFF7ED",
  muted: "#B45309",
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
  features: { label: string; tier: "free" | "basic" | "basic+" | "advanced" }[];
  tip?: string;
}

const SLIDES: TutorialSlide[] = [
  {
    iconName: "dashboard",
    tab: "Dashboard",
    title: "Your Command Centre",
    body: "The dashboard gives you a live snapshot of your day — calories consumed, workouts logged, streak, and your latest body fat estimate from your progress photos.",
    features: [
      { label: "Daily calorie & macro tracking", tier: "free" },
      { label: "Workout & streak stats", tier: "free" },
      { label: "BF% estimate from photos", tier: "basic+" },
      { label: "AI Coach quick access", tier: "basic+" },
    ],
    tip: "Check the dashboard every morning to set your intention for the day.",
  },
  {
    iconName: "fitness-center",
    tab: "Plans",
    title: "Your AI Workout & Meal Plans",
    body: "The Plans tab holds your personalised AI workout schedule and 7-day meal plan. Tap any exercise to see instructions, or swap any meal for an AI-generated alternative.",
    features: [
      { label: "AI Workout Plan", tier: "free" },
      { label: "AI Meal Plan with macros", tier: "free" },
      { label: "Meal Swap AI", tier: "basic+" },
      { label: "Unlimited plan regeneration", tier: "basic+" },
    ],
    tip: "Tap 'AI Form Check' in the workout section to analyse your exercise form with your camera.",
  },
  {
    iconName: "photo-camera",
    tab: "Progress",
    title: "Track Your Transformation",
    body: "Upload progress photos regularly. The AI analyses each photo and estimates your body fat percentage. Use the drag-to-reveal slider to compare any two months side by side.",
    features: [
      { label: "Progress photo upload", tier: "free" },
      { label: "AI BF% estimation", tier: "basic+" },
      { label: "Before/after comparison slider", tier: "basic+" },
      { label: "Unlimited photos + collage export", tier: "advanced" },
    ],
    tip: "Take photos in the same spot, same lighting, every 2 weeks for the most accurate comparison.",
  },
  {
    iconName: "smart-toy",
    tab: "AI Coach",
    title: "Your Personal AI Coach",
    body: "The AI Coach analyses your form history, progress trend, and workout data to give you weekly insights, personalised tips, and a focused training plan. Chat with it anytime.",
    features: [
      { label: "Weekly progress insights", tier: "basic+" },
      { label: "Form score trend analysis", tier: "basic+" },
      { label: "Personalised tips & weekly focus", tier: "basic+" },
      { label: "Conversational AI coaching chat", tier: "basic+" },
    ],
    tip: "Access AI Coach from the dedicated tab at the bottom of the screen.",
  },
  {
    iconName: "videocam",
    tab: "Form Check",
    title: "Real-Time Form Analysis",
    body: "Upload a video or photo of any exercise and the AI scores your form, identifies corrections, and tells you exactly what to fix. Available in the Plans tab and Body Scan section.",
    features: [
      { label: "Form score (0–100)", tier: "basic+" },
      { label: "Exercise-specific corrections", tier: "basic+" },
      { label: "Form history timeline", tier: "advanced" },
      { label: "AI Coach form integration", tier: "advanced" },
    ],
    tip: "Start with your main compound lifts — squat, deadlift, bench press.",
  },
  {
    iconName: "bolt",
    tab: "Get the Most",
    title: "Maximise Your Results",
    body: "Consistency is everything. Log meals daily, take a progress photo every 2 weeks, complete your workouts, and check in with your AI Coach weekly for the fastest transformation.",
    features: [
      { label: "Daily calorie logging", tier: "free" },
      { label: "Bi-weekly progress photos", tier: "free" },
      { label: "Weekly AI Coach check-in", tier: "basic+" },
      { label: "Form check every session", tier: "basic+" },
    ],
    tip: "Users who log consistently for 4+ weeks see 3× better results than those who don't.",
  },
];

const TIER_COLORS: Record<string, string> = {
  free:       SF.muted,
  basic:      SF.teal,
  "basic+":   SF.emerald,
  advanced:   SF.gold,
};

const TIER_LABELS: Record<string, string> = {
  free:       "FREE",
  basic:      "BASIC",
  "basic+":   "BASIC & ADVANCED",
  advanced:   "ADVANCED",
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
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border }}>
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
                  <Text style={styles.tipIcon}>💡</Text>
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
              <Text style={[styles.navBtnText, slideIndex === 0 && { color: SF.muted }]}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.counter}>{slideIndex + 1} / {SLIDES.length}</Text>

            <TouchableOpacity style={[styles.navBtn, styles.navBtnPrimary]} onPress={handleNext}>
              <Text style={styles.navBtnPrimaryText}>{isLast ? "Let's Go! ⚡" : "Next →"}</Text>
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
  slideIcon: { fontSize: 40 }, // kept for compat
  tabBadge: { backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: SF.border },
  tabBadgeText: { color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5 },
  slideTitle: { color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 24, lineHeight: 30, marginBottom: 10 },
  slideBody: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, marginBottom: 16 },
  featureBlock: { backgroundColor: SF.surface, borderRadius: 14, padding: 14, gap: 10, marginBottom: 14, borderWidth: 1, borderColor: SF.border },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureLabel: { color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1 },
  tierBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  tierBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 9, letterSpacing: 0.8 },
  tipBox: { flexDirection: "row", backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  tipIcon: { fontSize: 16, marginTop: 1 },
  tipText: { color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginTop: 16 },
  navBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: SF.border },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: SF.fg, fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  navBtnPrimary: { backgroundColor: SF.gold, borderColor: SF.gold },
  navBtnPrimaryText: { color: SF.bg, fontFamily: "Outfit_700Bold", fontSize: 14 },
  counter: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13 },
  skipBtn: { alignItems: "center", marginTop: 12 },
  skipText: { color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, textDecorationLine: "underline" },
});
