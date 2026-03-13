import React, { useState, useRef } from "react";
import {
  Text, View, TouchableOpacity, TextInput, ImageBackground,
  ScrollView, Dimensions, Animated, Image, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGuestAuth } from "@/lib/guest-auth";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import * as ImagePicker from "expo-image-picker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width: SCREEN_W } = Dimensions.get("window");

const SF = {
  bg:      "#0A0500",
  surface: "#150A00",
  border:  "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg:      "#FFF7ED",
  muted:   "#92400E",
  gold:    "#F59E0B",
  orange:  "#EA580C",
  red:     "#DC2626",
  gold2:   "#FBBF24",
  gold3:   "#FDE68A",
};

const BG = {
  ob1:       "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PDBtTuXlWnSZfekS.jpg",
  ob2:       "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/lquEenOvAGapUHhN.jpg",
  ob3:       "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/xdwOctNUTosKnrdo.jpg",
  ob4:       "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/XGrGjAUrPFOSTMFi.jpg",
  plans:     "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/yauqLuTRvanJUzsJ.jpg",
  dashboard: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg",
};

const INTRO_SLIDES = [
  { bg: BG.ob1, icon: "⚡", label: "WELCOME",        title: "Welcome to\nPeakPulse AI",  subtitle: "Your AI-powered fitness companion. Transform your body with science-backed plans.", accent: SF.gold },
  { bg: BG.ob2, icon: "📸", label: "AI BODY SCAN",   title: "See Your\nTransformation",  subtitle: "Take a photo and get an AI analysis of your physique. See exactly how you will look at your goal.", accent: SF.orange },
  { bg: BG.ob3, icon: "💪", label: "WORKOUT PLANS",  title: "Forge Your\nBest Body",     subtitle: "AI generates gym, home, or calisthenics plans tailored to your goal and schedule.", accent: SF.red },
  { bg: BG.ob4, icon: "🥗", label: "SMART NUTRITION",title: "Fuel Like\na Champion",     subtitle: "Halal, vegan, keto and more — AI creates meal plans with prep guides and calorie tracking.", accent: SF.gold2 },
];

const GOALS = [
  { key: "build_muscle", label: "Build Muscle", icon: "💪", desc: "Gain lean muscle mass" },
  { key: "lose_fat",     label: "Lose Fat",     icon: "🔥", desc: "Burn fat, get lean" },
  { key: "maintain",     label: "Maintain",     icon: "⚖️", desc: "Stay at current level" },
  { key: "athletic",     label: "Athletic",     icon: "🏃", desc: "Improve performance" },
];
const WORKOUT_STYLES = [
  { key: "gym",          label: "Gym",          icon: "🏋️", desc: "Full gym equipment" },
  { key: "home",         label: "Home",         icon: "🏠", desc: "Minimal equipment" },
  { key: "mix",          label: "Mix",          icon: "🔄", desc: "Both gym & home" },
  { key: "calisthenics", label: "Calisthenics", icon: "🤸", desc: "Bodyweight only" },
];
const DIETARY_PREFS = [
  { key: "omnivore",   label: "Omnivore",   icon: "🍗" },
  { key: "halal",      label: "Halal",      icon: "☪️" },
  { key: "vegan",      label: "Vegan",      icon: "🌱" },
  { key: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { key: "keto",       label: "Keto",       icon: "🥑" },
  { key: "paleo",      label: "Paleo",      icon: "🥩" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { enterGuestMode } = useGuestAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("lose_fat");
  const [workoutStyle, setWorkoutStyle] = useState("gym");
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [scanPhoto, setScanPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPlans, setGeneratingPlans] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const upsertProfile = trpc.profile.upsert.useMutation();
  const generateWorkout = trpc.workoutPlan.generate.useMutation();
  const generateMeal = trpc.mealPlan.generate.useMutation();

  function animateTransition(nextStep: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera Permission", "Please allow camera access to take your body scan photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (!result.canceled) setScanPhoto(result.assets[0].uri);
  }

  async function handlePickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (!result.canceled) setScanPhoto(result.assets[0].uri);
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const profile = { name: name || "Athlete", goal, workoutStyle, dietaryPreference: dietaryPref, daysPerWeek };
      await AsyncStorage.setItem("@guest_profile", JSON.stringify(profile));
      if (isAuthenticated) {
        await upsertProfile.mutateAsync({ goal, workoutStyle, dietaryPreference: dietaryPref, daysPerWeek });
      } else {
        await enterGuestMode(name || "Athlete");
      }
      if (scanPhoto) await AsyncStorage.setItem("@onboarding_scan_photo", scanPhoto);
      await AsyncStorage.setItem("@onboarding_complete", "true");
      animateTransition(9);
    } catch {
      await AsyncStorage.setItem("@onboarding_complete", "true");
      animateTransition(9);
    } finally {
      setSaving(false);
    }
  }

  async function handleGeneratePlansAndGo() {
    setGeneratingPlans(true);
    try {
      const [workoutResult, mealResult] = await Promise.allSettled([
        generateWorkout.mutateAsync({ goal, workoutStyle, daysPerWeek, fitnessLevel: "intermediate" }),
        generateMeal.mutateAsync({ goal, dietaryPreference: dietaryPref, dailyCalories: 2000 }),
      ]);
      if (workoutResult.status === "fulfilled") {
        await AsyncStorage.setItem("@cached_workout_plan", JSON.stringify(workoutResult.value));
      }
      if (mealResult.status === "fulfilled") {
        await AsyncStorage.setItem("@cached_meal_plan", JSON.stringify(mealResult.value));
      }
    } catch {
      // Plans generated on demand from tabs if this fails
    } finally {
      setGeneratingPlans(false);
      router.replace("/(tabs)" as any);
    }
  }

  const isIntroSlide = step < 4;
  const currentSetupStep = step - 4;

  if (isIntroSlide) {
    const slide = INTRO_SLIDES[step];
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <ImageBackground source={{ uri: slide.bg }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(10,5,0,0.62)" }}>
            <TouchableOpacity
              style={{ position: "absolute", top: 56, right: 24, zIndex: 10, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: SF.border2 }}
              onPress={async () => { await AsyncStorage.setItem("@onboarding_complete", "true"); router.replace("/(tabs)" as any); }}
            >
              <Text style={{ color: SF.gold3, fontSize: 13, fontFamily: "DMSans_600SemiBold" }}>Skip</Text>
            </TouchableOpacity>
            <View style={{ position: "absolute", top: 62, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {INTRO_SLIDES.map((_, i) => (
                <View key={i} style={{ width: i === step ? 28 : 6, height: 6, borderRadius: 3, backgroundColor: i === step ? slide.accent : "rgba(245,158,11,0.25)" }} />
              ))}
            </View>
            <View style={{ flex: 1, justifyContent: "flex-end", padding: 32, paddingBottom: 56 }}>
              <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: slide.accent + "25", alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1.5, borderColor: slide.accent + "60" }}>
                <Text style={{ fontSize: 38 }}>{slide.icon}</Text>
              </View>
              <Text style={{ color: slide.accent, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 2.5, marginBottom: 10, textTransform: "uppercase" }}>{slide.label}</Text>
              <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 38, lineHeight: 44, marginBottom: 16 }}>{slide.title}</Text>
              <Text style={{ color: SF.gold3, fontSize: 16, lineHeight: 24, marginBottom: 44, fontFamily: "DMSans_400Regular" }}>{slide.subtitle}</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {step > 0 && (
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 16, borderRadius: 18, alignItems: "center", backgroundColor: "rgba(245,158,11,0.08)", borderWidth: 1, borderColor: SF.border2 }}
                    onPress={() => animateTransition(step - 1)}
                  >
                    <Text style={{ color: SF.gold3, fontFamily: "Outfit_700Bold", fontSize: 16 }}>← Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{ flex: step > 0 ? 2 : 1, paddingVertical: 16, borderRadius: 18, alignItems: "center", backgroundColor: slide.accent, shadowColor: slide.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 18 }}
                  onPress={() => animateTransition(step + 1)}
                >
                  <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>
                    {step === INTRO_SLIDES.length - 1 ? "Set Up My Profile →" : "Next →"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (step === 9) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <ImageBackground source={{ uri: BG.dashboard }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(10,5,0,0.82)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <View style={{ width: 100, height: 100, borderRadius: 30, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 24, borderWidth: 2, borderColor: SF.gold }}>
              <Text style={{ fontSize: 52 }}>🔥</Text>
            </View>
            <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 2.5, marginBottom: 10 }}>YOU ARE ALL SET</Text>
            <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 32, textAlign: "center", marginBottom: 12 }}>
              {"Welcome,\n"}{name || "Athlete"}{"!"}
            </Text>
            <Text style={{ color: SF.gold3, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 36, fontFamily: "DMSans_400Regular" }}>
              Tap below to generate your personalised AI workout and meal plan — built specifically for your goal.
            </Text>
            <View style={{ width: "100%", gap: 10, marginBottom: 36 }}>
              {[
                { icon: "🏋️", text: workoutStyle + " workout plan — " + daysPerWeek + " days/week" },
                { icon: "🥗", text: dietaryPref + " meal plan with prep guides" },
                { icon: "📸", text: scanPhoto ? "Body scan photo saved — AI analysis ready" : "AI body scan available in Body Scan tab" },
                { icon: "📊", text: "Progress tracking & calorie monitoring" },
              ].map((f, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ fontSize: 20 }}>{f.icon}</Text>
                  <Text style={{ color: SF.gold2, fontSize: 14, fontFamily: "DMSans_500Medium", flex: 1 }}>{f.text}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={{ width: "100%", backgroundColor: SF.gold, paddingVertical: 18, borderRadius: 18, alignItems: "center", shadowColor: SF.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 18, opacity: generatingPlans ? 0.7 : 1 }}
              onPress={handleGeneratePlansAndGo}
              disabled={generatingPlans}
            >
              {generatingPlans ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ActivityIndicator color={SF.bg} size="small" />
                  <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 17 }}>Generating Your Plans...</Text>
                </View>
              ) : (
                <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 18 }}>Generate My Plans ⚡</Text>
              )}
            </TouchableOpacity>
            {generatingPlans && (
              <Text style={{ color: SF.muted, fontSize: 12, textAlign: "center", marginTop: 14, fontFamily: "DMSans_400Regular" }}>
                {"AI is crafting your personalised workout and meal plan...\nThis takes about 10-15 seconds."}
              </Text>
            )}
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: SF.bg }}>
      <ImageBackground source={{ uri: BG.plans }} style={{ height: 200 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(10,5,0,0.75)", justifyContent: "flex-end", padding: 24, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", gap: 4, marginBottom: 12 }}>
            {[4, 5, 6, 7, 8].map((s) => (
              <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: s <= step ? SF.gold : "rgba(245,158,11,0.18)" }} />
            ))}
          </View>
          <Text style={{ color: SF.gold, fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1.5 }}>
            {"STEP " + (currentSetupStep + 1) + " OF 5"}
          </Text>
        </View>
      </ImageBackground>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {step === 4 && (
            <View>
              <Text style={{ color: SF.fg, fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>{"What's your name?"}</Text>
              <Text style={{ color: SF.muted, fontSize: 14, marginBottom: 28, lineHeight: 20, fontFamily: "DMSans_400Regular" }}>{"We'll personalise your experience and cheer you on."}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={SF.muted}
                style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 18, color: SF.fg, fontFamily: "DMSans_500Medium", fontSize: 18, borderWidth: 1, borderColor: SF.border2 }}
                returnKeyType="done"
              />
            </View>
          )}

          {step === 5 && (
            <View>
              <Text style={{ color: SF.fg, fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>{"What's your goal?"}</Text>
              <Text style={{ color: SF.muted, fontSize: 14, marginBottom: 24, lineHeight: 20, fontFamily: "DMSans_400Regular" }}>Your AI plans will be built around this.</Text>
              <View style={{ gap: 10 }}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: goal === g.key ? "rgba(245,158,11,0.12)" : SF.surface, borderRadius: 18, padding: 18, borderWidth: 2, borderColor: goal === g.key ? SF.gold : SF.border }}
                    onPress={() => setGoal(g.key)}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: goal === g.key ? "rgba(245,158,11,0.20)" : "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16 }}>{g.label}</Text>
                      <Text style={{ color: SF.muted, fontSize: 12, marginTop: 2, fontFamily: "DMSans_400Regular" }}>{g.desc}</Text>
                    </View>
                    {goal === g.key && (
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: SF.gold, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: SF.bg, fontSize: 13, fontFamily: "Outfit_700Bold" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 6 && (
            <View>
              <Text style={{ color: SF.fg, fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>Workout Style</Text>
              <Text style={{ color: SF.muted, fontSize: 14, marginBottom: 24, lineHeight: 20, fontFamily: "DMSans_400Regular" }}>Where do you prefer to train?</Text>
              <View style={{ gap: 10 }}>
                {WORKOUT_STYLES.map(w => (
                  <TouchableOpacity
                    key={w.key}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: workoutStyle === w.key ? "rgba(234,88,12,0.12)" : SF.surface, borderRadius: 18, padding: 18, borderWidth: 2, borderColor: workoutStyle === w.key ? SF.orange : SF.border }}
                    onPress={() => setWorkoutStyle(w.key)}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: workoutStyle === w.key ? "rgba(234,88,12,0.20)" : "rgba(234,88,12,0.08)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 24 }}>{w.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16 }}>{w.label}</Text>
                      <Text style={{ color: SF.muted, fontSize: 12, marginTop: 2, fontFamily: "DMSans_400Regular" }}>{w.desc}</Text>
                    </View>
                    {workoutStyle === w.key && (
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: SF.orange, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: SF.fg, fontSize: 13, fontFamily: "Outfit_700Bold" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1.2, marginTop: 20, marginBottom: 10 }}>DAYS PER WEEK</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[3, 4, 5, 6].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: daysPerWeek === d ? SF.gold : SF.surface, borderWidth: 1, borderColor: daysPerWeek === d ? SF.gold : SF.border }}
                    onPress={() => setDaysPerWeek(d)}
                  >
                    <Text style={{ color: daysPerWeek === d ? SF.bg : SF.muted, fontFamily: "Outfit_700Bold", fontSize: 18 }}>{d}</Text>
                    <Text style={{ color: daysPerWeek === d ? SF.bg : SF.muted, fontSize: 10, fontFamily: "DMSans_400Regular" }}>days</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 7 && (
            <View>
              <Text style={{ color: SF.fg, fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>Dietary Preference</Text>
              <Text style={{ color: SF.muted, fontSize: 14, marginBottom: 24, lineHeight: 20, fontFamily: "DMSans_400Regular" }}>Your meal plans will respect your dietary choices.</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {DIETARY_PREFS.map(d => (
                  <TouchableOpacity
                    key={d.key}
                    style={{ width: "47%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: dietaryPref === d.key ? "rgba(220,38,38,0.12)" : SF.surface, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: dietaryPref === d.key ? SF.red : SF.border }}
                    onPress={() => setDietaryPref(d.key)}
                  >
                    <Text style={{ fontSize: 24 }}>{d.icon}</Text>
                    <Text style={{ color: dietaryPref === d.key ? SF.fg : SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>{d.label}</Text>
                    {dietaryPref === d.key && (
                      <View style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: SF.red, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: SF.fg, fontSize: 10, fontFamily: "Outfit_700Bold" }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 8 && (
            <View>
              <Text style={{ color: SF.fg, fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>AI Body Scan</Text>
              <Text style={{ color: SF.muted, fontSize: 14, marginBottom: 8, lineHeight: 20, fontFamily: "DMSans_400Regular" }}>
                Take a photo now to get an instant AI analysis of your physique — body fat estimate, muscle symmetry, and a transformation preview.
              </Text>
              <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: SF.border }}>
                <Text style={{ color: SF.gold3, fontSize: 12, fontFamily: "DMSans_500Medium", lineHeight: 18 }}>
                  {"💡 Best results: stand in good lighting, wear fitted clothing, face the camera directly. You can skip this and do it later from the Body Scan tab."}
                </Text>
              </View>
              {scanPhoto ? (
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <Image source={{ uri: scanPhoto }} style={{ width: SCREEN_W - 48, height: (SCREEN_W - 48) * 1.33, borderRadius: 20, borderWidth: 2, borderColor: SF.gold }} resizeMode="cover" />
                  <TouchableOpacity
                    style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: SF.surface, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: SF.border2 }}
                    onPress={() => setScanPhoto(null)}
                  >
                    <MaterialIcons name="refresh" size={18} color={SF.gold} />
                    <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 12, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: SF.gold, borderRadius: 18, padding: 20, shadowColor: SF.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14 }}
                    onPress={handleTakePhoto}
                  >
                    <MaterialIcons name="camera-alt" size={28} color={SF.bg} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 17 }}>Take Photo Now</Text>
                      <Text style={{ color: SF.bg + "BB", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Use your camera for best results</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={SF.bg} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: SF.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: SF.border2 }}
                    onPress={handlePickFromLibrary}
                  >
                    <MaterialIcons name="photo-library" size={28} color={SF.gold2} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 17 }}>Choose from Library</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>Select an existing photo</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={SF.muted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12, flexDirection: "row", gap: 12, backgroundColor: SF.bg }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: SF.surface, borderWidth: 1, borderColor: SF.border }}
          onPress={() => animateTransition(step - 1)}
        >
          <Text style={{ color: SF.muted, fontFamily: "Outfit_700Bold", fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: SF.gold, opacity: saving ? 0.7 : 1, shadowColor: SF.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14 }}
          onPress={step === 8 ? handleFinish : () => animateTransition(step + 1)}
          disabled={saving}
        >
          <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>
            {step === 8 ? (saving ? "Saving..." : scanPhoto ? "Continue ✓" : "Skip for Now →") : "Continue →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
