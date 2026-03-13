import React, { useState } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";

const SF = {
  bg:      "#0A0500",
  surface: "#150A00",
  border:  "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg:      "#FFF7ED",
  muted:   "#92400E",
  gold:    "#F59E0B",
  gold2:   "#FBBF24",
  gold3:   "#FDE68A",
  orange:  "#EA580C",
  red:     "#DC2626",
};

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const GUIDE_SECTIONS = [
  {
    icon: "🏠",
    title: "Dashboard",
    color: SF.gold,
    steps: [
      "Your Dashboard is the command centre — it shows your daily calorie progress, workout streak, and quick actions.",
      "Tap any Quick Action card to jump straight to that feature.",
      "The Tips & Tricks tile at the bottom rotates every 5 minutes with expert advice.",
      "Tap your name in the hero header to go to your Profile and update your goals.",
    ],
  },
  {
    icon: "📸",
    title: "AI Body Scan",
    color: SF.orange,
    steps: [
      "Tap the Body Scan tab to take or upload a full-body photo.",
      "Stand in good lighting, wear fitted clothing, and face the camera directly for best results.",
      "The AI will estimate your body fat percentage and muscle mass within seconds.",
      "You'll see transformation previews showing what you could look like at different body fat levels.",
      "Tap a transformation to set it as your target — your workout and meal plans will be tailored to it.",
      "Progress photos are saved automatically so you can track your transformation over time.",
    ],
  },
  {
    icon: "🏋️",
    title: "Workout Plans",
    color: SF.red,
    steps: [
      "The Plans tab shows your AI-generated workout schedule for the week.",
      "Tap any day to see the full exercise list with sets, reps, and rest periods.",
      "Use the Form Checker (Quick Actions on Dashboard) to get AI feedback on your exercise technique.",
      "Tap 'Log Workout' after completing a session to track your progress.",
      "Your plan adapts to your goal — Build Muscle, Lose Fat, Athletic, or Maintain.",
      "Change your workout style (Gym / Home / Calisthenics) in Profile → Edit Profile.",
    ],
  },
  {
    icon: "🥗",
    title: "Meal Plans & Nutrition",
    color: SF.gold2,
    steps: [
      "The Meals tab has two sections: Today's Log and the AI Meal Plan.",
      "Tap '+ Log' on any suggested meal to add it to your daily calorie count.",
      "Tap '⇄ Swap' to replace a meal with a calorie-equivalent alternative that suits your preferences.",
      "After swapping, tap 'How to Prep' to see the full step-by-step recipe.",
      "Use the AI Estimator tab to take a photo of any food and get an instant calorie breakdown.",
      "Your daily calorie goal is set automatically based on your goal and body stats.",
    ],
  },
  {
    icon: "👤",
    title: "Profile & Settings",
    color: SF.gold3,
    steps: [
      "The Profile tab shows your stats, achievements, and app settings.",
      "Tap 'Edit Profile' to update your name, goal, workout style, and dietary preference.",
      "Notification Preferences lets you set custom reminder times for workouts and meals.",
      "Wearable Sync connects your Apple Watch or Fitbit to import step and heart rate data.",
      "Gym Finder uses your location to show nearby gyms with ratings and opening hours.",
      "Upgrade to Premium in the Subscription section to unlock unlimited AI scans and advanced analytics.",
    ],
  },
  {
    icon: "👥",
    title: "Community & Challenges",
    color: SF.orange,
    steps: [
      "The Social Feed (Quick Actions → Community) shows progress posts from other PeakPulse users.",
      "Share your own progress by tapping the '+' button in the feed.",
      "Join the 7-Day Challenge (Quick Actions → 7-Day Challenge) for a structured beginner programme.",
      "Refer a friend (Quick Actions → Refer a Friend) to earn Premium credits.",
      "Daily Check-In (Quick Actions → Daily Check-In) logs your mood, energy, and sleep for trend analysis.",
    ],
  },
  {
    icon: "💡",
    title: "Pro Tips for Best Results",
    color: SF.gold,
    steps: [
      "Complete your AI Body Scan on Day 1 to set a baseline — repeat every 4 weeks to track progress.",
      "Log every meal, even snacks — consistency in tracking is the #1 predictor of success.",
      "Follow the workout plan for at least 4 weeks before changing it — results take time.",
      "Use the Meal Swap feature when you can't find an ingredient — the alternatives are nutritionally equivalent.",
      "Enable workout and meal reminders in Notification Preferences to build a consistent habit.",
      "Take progress photos in the same lighting and pose every week — small changes add up.",
    ],
  },
];

export default function UserGuideScreen() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  return (
    <View style={{ flex: 1, backgroundColor: SF.bg }}>
      <ImageBackground source={{ uri: HERO_BG }} style={{ height: 180 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(10,5,0,0.78)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, left: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border2 }}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color={SF.gold} />
          </TouchableOpacity>
          <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>PEAKPULSE AI</Text>
          <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 28 }}>User Guide</Text>
          <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 4 }}>
            Everything you need to get the most out of the app
          </Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Quick start banner */}
        <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: SF.border2, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <Text style={{ fontSize: 28 }}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 4 }}>Quick Start</Text>
            <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 20 }}>
              1. Take an AI Body Scan → 2. Generate your plans → 3. Log your first meal → 4. Complete your first workout. That's it — the AI handles the rest.
            </Text>
          </View>
        </View>

        {/* Guide sections */}
        {GUIDE_SECTIONS.map((section, idx) => {
          const isOpen = expandedSection === idx;
          return (
            <View key={idx} style={{ marginBottom: 10 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: isOpen ? "rgba(245,158,11,0.12)" : SF.surface,
                  borderRadius: isOpen ? 0 : 16,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  borderBottomLeftRadius: isOpen ? 0 : 16,
                  borderBottomRightRadius: isOpen ? 0 : 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isOpen ? SF.border2 : SF.border,
                  borderBottomWidth: isOpen ? 0 : 1,
                }}
                onPress={() => setExpandedSection(isOpen ? null : idx)}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ fontSize: 22 }}>{section.icon}</Text>
                </View>
                <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16, flex: 1 }}>{section.title}</Text>
                <MaterialIcons name={isOpen ? "expand-less" : "expand-more"} size={22} color={SF.muted} />
              </TouchableOpacity>

              {isOpen && (
                <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 16, borderWidth: 1, borderTopWidth: 0, borderColor: SF.border2, gap: 12 }}>
                  {section.steps.map((step, si) => (
                    <View key={si} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: SF.gold, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <Text style={{ color: SF.bg, fontFamily: "Outfit_700Bold", fontSize: 11 }}>{si + 1}</Text>
                      </View>
                      <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 21, flex: 1 }}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={{ marginTop: 20, backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border, alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 28 }}>🔥</Text>
          <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 15, textAlign: "center" }}>You're ready to transform.</Text>
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Consistency beats perfection. Show up every day and let the AI guide you.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: SF.gold, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>Let's Go ⚡</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
