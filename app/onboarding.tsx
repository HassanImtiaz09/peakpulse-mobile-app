import React, { useState, useRef } from "react";
import {
  Text, View, TouchableOpacity, TextInput, ImageBackground,
  ScrollView, Dimensions, Animated, Image, ActivityIndicator, Alert, FlatList,
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

// Steps:
// 0-3: intro slides
// 4: name + goal
// 5: workout style
// 6: dietary pref
// 7: days per week
// 8: photo capture
// 9: transformation images (only if goal != maintain)
// 10: plan generation + done

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
  const [scanPhotoUrl, setScanPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPlans, setGeneratingPlans] = useState(false);
  const [analyzingScan, setAnalyzingScan] = useState(false);
  const [transformations, setTransformations] = useState<any[]>([]);
  const [selectedTransformation, setSelectedTransformation] = useState<any | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const upsertProfile = trpc.profile.upsert.useMutation();
  const generateWorkout = trpc.workoutPlan.generate.useMutation();
  const generateMeal = trpc.mealPlan.generate.useMutation();
  const uploadPhoto = trpc.upload.photo.useMutation();
  const analyzeBodyScan = trpc.bodyScan.analyze.useMutation();

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

  async function handlePhotoStepContinue() {
    // Save profile first
    setSaving(true);
    try {
      const profile = { name: name || "Athlete", goal, workoutStyle, dietaryPreference: dietaryPref, daysPerWeek };
      await AsyncStorage.setItem("@guest_profile", JSON.stringify(profile));
      if (isAuthenticated) {
        await upsertProfile.mutateAsync({ goal, workoutStyle, dietaryPreference: dietaryPref, daysPerWeek });
      } else {
        await enterGuestMode(name || "Athlete");
      }
      await AsyncStorage.setItem("@onboarding_complete", "true");
    } catch {
      await AsyncStorage.setItem("@onboarding_complete", "true");
    } finally {
      setSaving(false);
    }

    // If goal is maintain, skip transformation images
    if (goal === "maintain" || !scanPhoto) {
      animateTransition(10);
      return;
    }

    // Upload photo and run body scan analysis
    setAnalyzingScan(true);
    animateTransition(9);
    try {
      // Convert photo URI to base64
      const response = await fetch(scanPhoto);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Upload to S3
      const uploadResult = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });
      setScanPhotoUrl(uploadResult.url);
      await AsyncStorage.setItem("@onboarding_scan_photo", scanPhoto);

      // Run AI body scan analysis
      const scanResult = await analyzeBodyScan.mutateAsync({ photoUrl: uploadResult.url });
      if (scanResult?.transformations?.length) {
        setTransformations(scanResult.transformations);
      }
    } catch (e) {
      // If analysis fails, skip to plan generation
      animateTransition(10);
    } finally {
      setAnalyzingScan(false);
    }
  }

  async function handleGeneratePlansAndGo() {
    setGeneratingPlans(true);
    try {
      const effectiveGoal = selectedTransformation
        ? (selectedTransformation.target_bf <= 12 ? "lose_fat" : selectedTransformation.target_bf <= 15 ? "athletic" : goal)
        : goal;

      const [workoutResult, mealResult] = await Promise.allSettled([
        generateWorkout.mutateAsync({ goal: effectiveGoal, workoutStyle, daysPerWeek, fitnessLevel: "intermediate" }),
        generateMeal.mutateAsync({ goal: effectiveGoal, dietaryPreference: dietaryPref, dailyCalories: 2000 }),
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

  // ── Intro slides (steps 0-3) ─────────────────────────────────────────────
  if (step < 4) {
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
            {/* Progress dots */}
            <View style={{ position: "absolute", top: 62, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {INTRO_SLIDES.map((_, i) => (
                <View key={i} style={{ width: i === step ? 24 : 6, height: 6, borderRadius: 3, backgroundColor: i === step ? slide.accent : "rgba(255,255,255,0.25)" }} />
              ))}
            </View>
            {/* Content */}
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 32, paddingBottom: 52 }}>
              <View style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start", marginBottom: 16, borderWidth: 1, borderColor: SF.border2 }}>
                <Text style={{ color: slide.accent, fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1.5 }}>{slide.icon} {slide.label}</Text>
              </View>
              <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 38, lineHeight: 44, marginBottom: 14 }}>{slide.title}</Text>
              <Text style={{ color: SF.gold3, fontSize: 16, fontFamily: "DMSans_400Regular", lineHeight: 24, marginBottom: 40 }}>{slide.subtitle}</Text>
              <TouchableOpacity
                style={{ backgroundColor: slide.accent, borderRadius: 18, paddingVertical: 18, alignItems: "center", shadowColor: slide.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16 }}
                onPress={() => animateTransition(step + 1)}
              >
                <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 17 }}>
                  {step === 3 ? "Get Started →" : "Next →"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // ── Transformation images screen (step 9) ────────────────────────────────
  if (step === 9) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <ImageBackground source={{ uri: BG.ob2 }} style={{ height: 200 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(10,5,0,0.75)", justifyContent: "flex-end", padding: 24, paddingBottom: 20 }}>
            <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>AI BODY ANALYSIS</Text>
            <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 26 }}>Your Transformation</Text>
          </View>
        </ImageBackground>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {analyzingScan ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <ActivityIndicator color={SF.gold} size="large" />
              <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 20 }}>Analysing your physique...</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                Our AI is generating transformation previews at different body fat percentages. This takes 15-30 seconds.
              </Text>
            </View>
          ) : transformations.length > 0 ? (
            <>
              <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
                Based on your photo, here are AI-generated previews of what you could look like at different body fat levels. Tap the one that matches your goal.
              </Text>
              {transformations.map((t: any, i: number) => {
                const isSelected = selectedTransformation?.target_bf === t.target_bf;
                return (
                  <TouchableOpacity
                    key={i}
                    style={{
                      backgroundColor: isSelected ? "rgba(245,158,11,0.15)" : SF.surface,
                      borderRadius: 20,
                      marginBottom: 16,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? SF.gold : SF.border,
                      overflow: "hidden",
                    }}
                    onPress={() => setSelectedTransformation(t)}
                  >
                    {t.imageUrl ? (
                      <Image source={{ uri: t.imageUrl }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
                    ) : (
                      <View style={{ width: "100%", height: 120, backgroundColor: "rgba(245,158,11,0.05)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 40 }}>🏋️</Text>
                      </View>
                    )}
                    <View style={{ padding: 16 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16 }}>{t.target_bf}% Body Fat</Text>
                        {isSelected && (
                          <View style={{ backgroundColor: SF.gold, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ color: SF.bg, fontFamily: "Outfit_700Bold", fontSize: 11 }}>✓ Selected</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 18 }}>{t.description}</Text>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: SF.border }}>
                          <Text style={{ color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>⏱ {t.estimated_weeks} weeks</Text>
                        </View>
                        <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: SF.border }}>
                          <Text style={{ color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>💪 {t.effort_level}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={{ backgroundColor: SF.gold, borderRadius: 18, paddingVertical: 18, alignItems: "center", marginTop: 8, opacity: !selectedTransformation ? 0.5 : 1, shadowColor: SF.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14 }}
                onPress={() => animateTransition(10)}
                disabled={!selectedTransformation}
              >
                <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 17 }}>
                  {selectedTransformation ? `Build My Plan for ${selectedTransformation.target_bf}% BF →` : "Select a Target to Continue"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 14, alignItems: "center", paddingVertical: 12 }}
                onPress={() => animateTransition(10)}
              >
                <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13 }}>Skip — I'll set my target later</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
              <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 18, textAlign: "center", marginBottom: 8 }}>Analysis unavailable</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 32 }}>
                We couldn't generate transformation images right now. You can try the full Body Scan from the app later.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: SF.gold, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 40, alignItems: "center" }}
                onPress={() => animateTransition(10)}
              >
                <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 17 }}>Continue Anyway →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Plan generation / done screen (step 10) ──────────────────────────────
  if (step === 10) {
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
            {selectedTransformation ? (
              <Text style={{ color: SF.gold3, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 36, fontFamily: "DMSans_400Regular" }}>
                Your target: <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold" }}>{selectedTransformation.target_bf}% body fat</Text> in ~{selectedTransformation.estimated_weeks} weeks.{"\n"}Tap below to generate your personalised AI plan.
              </Text>
            ) : (
              <Text style={{ color: SF.gold3, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 36, fontFamily: "DMSans_400Regular" }}>
                Tap below to generate your personalised AI workout and meal plan — built specifically for your goal.
              </Text>
            )}
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

  // ── Setup steps (steps 4-8) ──────────────────────────────────────────────
  const setupStep = step - 4; // 0-4
  const SETUP_TITLES = ["Your Profile", "Workout Style", "Dietary Preference", "Training Frequency", "AI Body Scan"];
  const SETUP_SUBTITLES = [
    "Tell us about yourself so we can personalise your plan.",
    "How do you prefer to train?",
    "We'll tailor your meal plans to your dietary needs.",
    "How many days per week can you commit to training?",
    "Take a photo for an instant AI physique analysis.",
  ];

  return (
    <View style={{ flex: 1, backgroundColor: SF.bg }}>
      <ImageBackground source={{ uri: BG.plans }} style={{ height: 200 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(10,5,0,0.75)", justifyContent: "flex-end", padding: 24, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", gap: 4, marginBottom: 12 }}>
            {[0,1,2,3,4].map(i => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= setupStep ? SF.gold : "rgba(245,158,11,0.20)" }} />
            ))}
          </View>
          <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>STEP {setupStep + 1} OF 5</Text>
          <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 24 }}>{SETUP_TITLES[setupStep]}</Text>
          <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 4 }}>{SETUP_SUBTITLES[setupStep]}</Text>
        </View>
      </ImageBackground>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 20 }}>

          {/* Step 4: Name + Goal */}
          {step === 4 && (
            <View>
              <Text style={{ color: SF.muted, fontSize: 12, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 8 }}>YOUR NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Alex"
                placeholderTextColor={SF.muted}
                style={{ backgroundColor: SF.surface, borderRadius: 14, padding: 16, color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 16, borderWidth: 1, borderColor: SF.border, marginBottom: 24 }}
                returnKeyType="done"
              />
              <Text style={{ color: SF.muted, fontSize: 12, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 12 }}>YOUR GOAL</Text>
              <View style={{ gap: 10 }}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: goal === g.key ? "rgba(245,158,11,0.15)" : SF.surface, borderRadius: 16, padding: 16, borderWidth: goal === g.key ? 2 : 1, borderColor: goal === g.key ? SF.gold : SF.border }}
                    onPress={() => setGoal(g.key)}
                  >
                    <Text style={{ fontSize: 28 }}>{g.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16 }}>{g.label}</Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>{g.desc}</Text>
                    </View>
                    {goal === g.key && <MaterialIcons name="check-circle" size={22} color={SF.gold} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 5: Workout Style */}
          {step === 5 && (
            <View style={{ gap: 10 }}>
              {WORKOUT_STYLES.map(w => (
                <TouchableOpacity
                  key={w.key}
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: workoutStyle === w.key ? "rgba(245,158,11,0.15)" : SF.surface, borderRadius: 16, padding: 16, borderWidth: workoutStyle === w.key ? 2 : 1, borderColor: workoutStyle === w.key ? SF.gold : SF.border }}
                  onPress={() => setWorkoutStyle(w.key)}
                >
                  <Text style={{ fontSize: 28 }}>{w.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16 }}>{w.label}</Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>{w.desc}</Text>
                  </View>
                  {workoutStyle === w.key && <MaterialIcons name="check-circle" size={22} color={SF.gold} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 6: Dietary Preference */}
          {step === 6 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {DIETARY_PREFS.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={{ width: (SCREEN_W - 68) / 2, backgroundColor: dietaryPref === d.key ? "rgba(245,158,11,0.15)" : SF.surface, borderRadius: 16, padding: 18, alignItems: "center", gap: 8, borderWidth: dietaryPref === d.key ? 2 : 1, borderColor: dietaryPref === d.key ? SF.gold : SF.border }}
                  onPress={() => setDietaryPref(d.key)}
                >
                  <Text style={{ fontSize: 32 }}>{d.icon}</Text>
                  <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 15 }}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 7: Days per week */}
          {step === 7 && (
            <View>
              <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 14, marginBottom: 24, lineHeight: 20 }}>
                Choose how many days per week you can commit to training. We recommend 4 days for optimal results.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
                {[3, 4, 5, 6].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={{ width: (SCREEN_W - 80) / 2, backgroundColor: daysPerWeek === d ? "rgba(245,158,11,0.15)" : SF.surface, borderRadius: 20, paddingVertical: 28, alignItems: "center", borderWidth: daysPerWeek === d ? 2 : 1, borderColor: daysPerWeek === d ? SF.gold : SF.border }}
                    onPress={() => setDaysPerWeek(d)}
                  >
                    <Text style={{ color: daysPerWeek === d ? SF.gold : SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 40 }}>{d}</Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 4 }}>days / week</Text>
                    {d === 4 && <Text style={{ color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 11, marginTop: 4 }}>Recommended</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 8: Photo capture */}
          {step === 8 && (
            <View>
              <Text style={{ color: SF.fg, fontSize: 28, fontFamily: "Outfit_800ExtraBold", marginBottom: 8 }}>AI Body Scan</Text>
              {goal === "maintain" ? (
                <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ color: SF.gold3, fontSize: 14, fontFamily: "DMSans_500Medium", lineHeight: 20 }}>
                    Since your goal is to maintain, we'll skip the transformation preview and go straight to your personalised plan.{"\n\n"}You can still take a photo for progress tracking.
                  </Text>
                </View>
              ) : (
                <Text style={{ color: SF.muted, fontSize: 14, marginBottom: 8, lineHeight: 20, fontFamily: "DMSans_400Regular" }}>
                  Take a photo to get an AI analysis of your physique — body fat estimate and transformation previews at your goal body fat percentage.
                </Text>
              )}
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

      {/* Bottom navigation */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12, flexDirection: "row", gap: 12, backgroundColor: SF.bg }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: SF.surface, borderWidth: 1, borderColor: SF.border }}
          onPress={() => animateTransition(step - 1)}
        >
          <Text style={{ color: SF.muted, fontFamily: "Outfit_700Bold", fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: "center", backgroundColor: SF.gold, opacity: saving || analyzingScan ? 0.7 : 1, shadowColor: SF.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14 }}
          onPress={step === 8 ? handlePhotoStepContinue : () => animateTransition(step + 1)}
          disabled={saving || analyzingScan}
        >
          {saving || analyzingScan ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={SF.bg} size="small" />
              <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>
                {analyzingScan ? "Analysing..." : "Saving..."}
              </Text>
            </View>
          ) : (
            <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>
              {step === 8 ? (scanPhoto ? (goal === "maintain" ? "Continue →" : "Analyse My Physique ⚡") : "Skip for Now →") : "Continue →"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
