import React, { useState, useRef } from "react";
import {
  Text, View, TouchableOpacity, TextInput, ImageBackground,
  ScrollView, Dimensions, Animated, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGuestAuth } from "@/lib/guest-auth";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";
const WORKOUT_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";
const MEAL_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";
const SCAN_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";

const INTRO_SLIDES = [
  {
    bg: HERO_BG,
    icon: "⚡",
    title: "Welcome to\nPeakPulse AI",
    subtitle: "Your AI-powered fitness companion. Transform your body with science-backed plans.",
    accent: "#10B981",
  },
  {
    bg: SCAN_BG,
    icon: "📸",
    title: "AI Body\nTransformation",
    subtitle: "Take a photo and see exactly how you'll look at your target body fat percentage.",
    accent: "#3B82F6",
  },
  {
    bg: WORKOUT_BG,
    icon: "💪",
    title: "Personalized\nWorkout Plans",
    subtitle: "AI generates gym, home, or calisthenics plans tailored to your goal and schedule.",
    accent: "#34D399",
  },
  {
    bg: MEAL_BG,
    icon: "🥗",
    title: "Smart Meal\nPlanning",
    subtitle: "Halal, vegan, keto and more — AI creates meal plans with prep guides and calorie tracking.",
    accent: "#6EE7B7",
  },
];

const GOALS = [
  { key: "build_muscle", label: "Build Muscle", icon: "💪", desc: "Gain lean muscle mass" },
  { key: "lose_fat", label: "Lose Fat", icon: "🔥", desc: "Burn fat, get lean" },
  { key: "maintain", label: "Maintain", icon: "⚖️", desc: "Stay at current level" },
  { key: "athletic", label: "Athletic", icon: "🏃", desc: "Improve performance" },
];

const WORKOUT_STYLES = [
  { key: "gym", label: "Gym", icon: "🏋️", desc: "Full gym equipment" },
  { key: "home", label: "Home", icon: "🏠", desc: "Minimal equipment" },
  { key: "mix", label: "Mix", icon: "🔄", desc: "Both gym & home" },
  { key: "calisthenics", label: "Calisthenics", icon: "🤸", desc: "Bodyweight only" },
];

const DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", icon: "🍗" },
  { key: "halal", label: "Halal", icon: "☪️" },
  { key: "vegan", label: "Vegan", icon: "🌱" },
  { key: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { key: "keto", label: "Keto", icon: "🥑" },
  { key: "paleo", label: "Paleo", icon: "🥩" },
];

// Total steps: 0-3 = intro slides, 4 = name, 5 = goal, 6 = workout style, 7 = dietary, 8 = done
const TOTAL_STEPS = 9;

export default function OnboardingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { enterGuestMode, isGuest } = useGuestAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("lose_fat");
  const [workoutStyle, setWorkoutStyle] = useState("gym");
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const upsertProfile = trpc.profile.upsert.useMutation();

  function animateTransition(nextStep: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const profile = { name: name || "Athlete", goal, workoutStyle, dietaryPreference: dietaryPref, daysPerWeek };
      // Save locally for all users
      await AsyncStorage.setItem("@guest_profile", JSON.stringify(profile));
      // Also save to server if authenticated
      if (isAuthenticated) {
        await upsertProfile.mutateAsync({
          goal,
          workoutStyle,
          dietaryPreference: dietaryPref,
          daysPerWeek,
        });
      } else {
        // Set guest profile in context
        await enterGuestMode(name || "Athlete");
      }
      // Mark onboarding as complete
      await AsyncStorage.setItem("@onboarding_complete", "true");
      animateTransition(8);
    } catch {
      // Even if server save fails, proceed locally
      await AsyncStorage.setItem("@onboarding_complete", "true");
      animateTransition(8);
    } finally {
      setSaving(false);
    }
  }

  async function handleDone() {
    router.replace("/(tabs)" as any);
  }

  const isIntroSlide = step < 4;
  const progressSteps = TOTAL_STEPS - 4; // 5 setup steps
  const currentSetupStep = step - 4; // 0-indexed setup step

  // ── Intro Slides (0-3) ──
  if (isIntroSlide) {
    const slide = INTRO_SLIDES[step];
    return (
      <View style={{ flex: 1, backgroundColor: "#060F0A" }}>
        <ImageBackground source={{ uri: slide.bg }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)" }}>
            {/* Skip button */}
            <TouchableOpacity
              style={{ position: "absolute", top: 56, right: 24, zIndex: 10, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
              onPress={async () => {
                await AsyncStorage.setItem("@onboarding_complete", "true");
                router.replace("/(tabs)" as any);
              }}
            >
              <Text style={{ color: "#E6FFF5", fontSize: 13, fontFamily: "DMSans_600SemiBold" }}>Skip</Text>
            </TouchableOpacity>

            {/* Dot indicators */}
            <View style={{ position: "absolute", top: 60, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {INTRO_SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={{ width: i === step ? 24 : 6, height: 6, borderRadius: 3, backgroundColor: i === step ? slide.accent : "rgba(255,255,255,0.3)" }}
                />
              ))}
            </View>

            {/* Content */}
            <View style={{ flex: 1, justifyContent: "flex-end", padding: 32, paddingBottom: 60 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: slide.accent + "30", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: slide.accent + "50" }}>
                <Text style={{ fontSize: 36 }}>{slide.icon}</Text>
              </View>
              <Text style={{ color: slide.accent, fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>PeakPulse AI</Text>
              <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 36, lineHeight: 42, marginBottom: 16 }}>{slide.title}</Text>
              <Text style={{ color: "#D1D5DB", fontSize: 16, lineHeight: 24, marginBottom: 40 }}>{slide.subtitle}</Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                {step > 0 && (
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}
                    onPress={() => animateTransition(step - 1)}
                  >
                    <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16 }}>← Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{ flex: step > 0 ? 2 : 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: slide.accent, shadowColor: slide.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16 }}
                  onPress={() => animateTransition(step + 1)}
                >
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>
                    {step === INTRO_SLIDES.length - 1 ? "Let's Set Up →" : "Next →"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // ── Done Screen (step 8) ──
  if (step === 8) {
    return (
      <View style={{ flex: 1, backgroundColor: "#060F0A" }}>
        <ImageBackground source={{ uri: HERO_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.8)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <View style={{ width: 100, height: 100, borderRadius: 30, backgroundColor: "rgba(16,185,129,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 2, borderColor: "#10B981" }}>
              <Text style={{ fontSize: 52 }}>🎉</Text>
            </View>
            <Text style={{ color: "#10B981", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>YOU'RE ALL SET</Text>
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 32, textAlign: "center", marginBottom: 12 }}>
              Welcome,{"\n"}{name || "Athlete"}!
            </Text>
            <Text style={{ color: "#4D8C72", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 40 }}>
              Your profile is ready. Head to the Body Scan tab to take your first photo and generate your personalized plans.
            </Text>
            <View style={{ width: "100%", gap: 10, marginBottom: 32 }}>
              {["AI body scan & transformation preview", "Personalized workout plan", "Custom meal plan with prep guides", "Progress photo tracking"].map((f, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0D1F18", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(16,185,129,0.12)" }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#E6FFF5", fontSize: 12, fontFamily: "Outfit_700Bold" }}>✓</Text>
                  </View>
                  <Text style={{ color: "#10B981", fontSize: 14 }}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={{ width: "100%", backgroundColor: "#10B981", paddingVertical: 18, borderRadius: 18, alignItems: "center", shadowColor: "#10B981", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16 }}
              onPress={handleDone}
            >
              <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 18 }}>Start Your Journey ⚡</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // ── Setup Steps (4-7) ──
  return (
    <View style={{ flex: 1, backgroundColor: "#060F0A" }}>
      <ImageBackground source={{ uri: WORKOUT_BG }} style={{ height: 200 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", justifyContent: "flex-end", padding: 24, paddingBottom: 20 }}>
          {/* Progress bar */}
          <View style={{ flexDirection: "row", gap: 4, marginBottom: 12 }}>
            {[4, 5, 6, 7].map((s) => (
              <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: s <= step ? "#10B981" : "rgba(255,255,255,0.2)" }} />
            ))}
          </View>
          <Text style={{ color: "#34D399", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1 }}>
            STEP {currentSetupStep + 1} OF 4
          </Text>
        </View>
      </ImageBackground>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Step 4: Name */}
          {step === 4 && (
            <View>
              <Text style={{ color: "#E6FFF5", fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>What's your name?</Text>
              <Text style={{ color: "#4D8C72", fontSize: 14, marginBottom: 28, lineHeight: 20 }}>We'll personalise your experience just for you.</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#1A4A38"
                autoFocus={Platform.OS !== "web"}
                returnKeyType="done"
                style={{ backgroundColor: "#0D1F18", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, color: "#E6FFF5", fontSize: 18, borderWidth: 1, borderColor: "#2D2D3F", marginBottom: 8 }}
              />
              <Text style={{ color: "#2D6A52", fontSize: 12, marginBottom: 32 }}>You can change this later in your profile.</Text>
            </View>
          )}

          {/* Step 5: Goal */}
          {step === 5 && (
            <View>
              <Text style={{ color: "#E6FFF5", fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>What's your goal?</Text>
              <Text style={{ color: "#4D8C72", fontSize: 14, marginBottom: 24, lineHeight: 20 }}>We'll tailor your workout and nutrition plan to match.</Text>
              <View style={{ gap: 10 }}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: goal === g.key ? "#7C3AED15" : "#0D1F18", borderRadius: 18, padding: 18, borderWidth: 2, borderColor: goal === g.key ? "#10B981" : "rgba(16,185,129,0.10)" }}
                    onPress={() => setGoal(g.key)}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: goal === g.key ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.10)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16 }}>{g.label}</Text>
                      <Text style={{ color: "#4D8C72", fontSize: 12, marginTop: 2 }}>{g.desc}</Text>
                    </View>
                    {goal === g.key && (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#E6FFF5", fontSize: 12, fontFamily: "Outfit_700Bold" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 6: Workout Style */}
          {step === 6 && (
            <View>
              <Text style={{ color: "#E6FFF5", fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>Workout Style</Text>
              <Text style={{ color: "#4D8C72", fontSize: 14, marginBottom: 24, lineHeight: 20 }}>Where do you prefer to work out?</Text>
              <View style={{ gap: 10, marginBottom: 24 }}>
                {WORKOUT_STYLES.map(w => (
                  <TouchableOpacity
                    key={w.key}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: workoutStyle === w.key ? "#F9731615" : "#0D1F18", borderRadius: 18, padding: 18, borderWidth: 2, borderColor: workoutStyle === w.key ? "#34D399" : "rgba(16,185,129,0.10)" }}
                    onPress={() => setWorkoutStyle(w.key)}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: workoutStyle === w.key ? "#F9731630" : "rgba(16,185,129,0.10)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 24 }}>{w.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16 }}>{w.label}</Text>
                      <Text style={{ color: "#4D8C72", fontSize: 12, marginTop: 2 }}>{w.desc}</Text>
                    </View>
                    {workoutStyle === w.key && (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#34D399", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#E6FFF5", fontSize: 12, fontFamily: "Outfit_700Bold" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 10 }}>DAYS PER WEEK</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[3, 4, 5, 6].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: daysPerWeek === d ? "#34D399" : "#0D1F18", borderWidth: 1, borderColor: daysPerWeek === d ? "#34D399" : "rgba(16,185,129,0.10)" }}
                    onPress={() => setDaysPerWeek(d)}
                  >
                    <Text style={{ color: daysPerWeek === d ? "#E6FFF5" : "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 18 }}>{d}</Text>
                    <Text style={{ color: daysPerWeek === d ? "#FED7AA" : "#2D6A52", fontSize: 10 }}>days</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 7: Dietary */}
          {step === 7 && (
            <View>
              <Text style={{ color: "#E6FFF5", fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>Dietary Preference</Text>
              <Text style={{ color: "#4D8C72", fontSize: 14, marginBottom: 24, lineHeight: 20 }}>Your meal plans will respect your dietary choices.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {DIETARY_PREFS.map(d => (
                  <TouchableOpacity
                    key={d.key}
                    style={{ width: "47%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: dietaryPref === d.key ? "#22C55E15" : "#0D1F18", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: dietaryPref === d.key ? "#6EE7B7" : "rgba(16,185,129,0.10)" }}
                    onPress={() => setDietaryPref(d.key)}
                  >
                    <Text style={{ fontSize: 24 }}>{d.icon}</Text>
                    <Text style={{ color: dietaryPref === d.key ? "#E6FFF5" : "#4D8C72", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>{d.label}</Text>
                    {dietaryPref === d.key && (
                      <View style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: "#6EE7B7", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#E6FFF5", fontSize: 10, fontFamily: "Outfit_700Bold" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Bottom Navigation */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12, flexDirection: "row", gap: 12, backgroundColor: "#060F0A" }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: "#0D1F18", borderWidth: 1, borderColor: "rgba(16,185,129,0.10)" }}
          onPress={() => animateTransition(step - 1)}
        >
          <Text style={{ color: "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: "#10B981", opacity: saving ? 0.7 : 1, shadowColor: "#10B981", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 }}
          onPress={step === 7 ? handleFinish : () => animateTransition(step + 1)}
          disabled={saving}
        >
          <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>
            {step === 7 ? (saving ? "Saving..." : "Finish Setup ✓") : "Continue →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
