import React, { useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image, Platform, ImageBackground,
  Modal, Dimensions, PanResponder, Animated,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import * as FileSystem from "expo-file-system/legacy";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";

import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SCAN_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";

const EFFORT_COLORS: Record<string, string> = {
  moderate: "#6EE7B7",
  high: "#34D399",
  very_high: "#4D8C72",
  extreme: "#A855F7",
};

const EFFORT_LABELS: Record<string, string> = {
  moderate: "Moderate",
  high: "High",
  very_high: "Very High",
  extreme: "Extreme",
};

const WORKOUT_STYLES = [
  { key: "gym", label: "Gym", icon: "🏋️", desc: "Full equipment" },
  { key: "home", label: "Home", icon: "🏠", desc: "Minimal gear" },
  { key: "mix", label: "Mix", icon: "🔄", desc: "Gym & home" },
  { key: "calisthenics", label: "Calisthenics", icon: "🤸", desc: "Bodyweight" },
];

const DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", icon: "🍗" },
  { key: "halal", label: "Halal", icon: "☪️" },
  { key: "vegan", label: "Vegan", icon: "🌱" },
  { key: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { key: "keto", label: "Keto", icon: "🥑" },
  { key: "paleo", label: "Paleo", icon: "🥩" },
];

type Step = "upload" | "analyzing" | "results" | "goal_setup" | "generating";

export default function ScanScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isGuest, guestProfile } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [selectedTransform, setSelectedTransform] = useState<number | null>(null);

  // Goal setup state
  const [workoutStyle, setWorkoutStyle] = useState("gym");
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [daysPerWeek, setDaysPerWeek] = useState(4);

  const { data: latestScan, refetch: refetchScan } = trpc.bodyScan.getLatest.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const uploadPhoto = trpc.upload.photo.useMutation();
  const analyzeScan = trpc.bodyScan.analyze.useMutation({
    onSuccess: () => { refetchScan(); setStep("results"); },
    onError: (e) => { Alert.alert("Analysis Failed", e.message); setStep("upload"); },
  });
  const updateProfile = trpc.profile.upsert.useMutation();
  const generateWorkoutPlan = trpc.workoutPlan.generate.useMutation();
  const generateMealPlan = trpc.mealPlan.generate.useMutation();

  async function pickImage(useCamera: boolean) {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed to take photos.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8, allowsEditing: true, aspect: [3, 4],
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8, allowsEditing: true, aspect: [3, 4],
        });
      }
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function startAnalysis() {
    if (!selectedImage) return;
    setStep("analyzing");
    try {
      // Both authenticated and guest users use real AI
      let base64 = "";
      if (Platform.OS === "web") {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(selectedImage, { encoding: FileSystem.EncodingType.Base64 });
      }
      const { url } = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });
      const result = await analyzeScan.mutateAsync({ photoUrl: url });
      if (!isAuthenticated) {
        // Store result locally for guest users
        await AsyncStorage.setItem("@guest_scan", JSON.stringify(result));
        setGuestScanData(result);
        setStep("results");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setStep("upload");
    }
  }

  async function selectTargetAndProceed(bf: number) {
    setSelectedTransform(bf);
    if (isAuthenticated) {
      await updateProfile.mutateAsync({ targetBodyFat: bf });
    } else {
      const existing = await AsyncStorage.getItem("@guest_profile") ?? "{}";
      const profile = JSON.parse(existing);
      await AsyncStorage.setItem("@guest_profile", JSON.stringify({ ...profile, targetBodyFat: bf }));
    }
    setStep("goal_setup");
  }

  async function generatePlans() {
    setStep("generating");
    try {
      if (isAuthenticated) {
        await updateProfile.mutateAsync({ workoutStyle, dietaryPreference: dietaryPref, daysPerWeek });
        await generateWorkoutPlan.mutateAsync({ workoutStyle, daysPerWeek, goal: "lose_fat" });
        await generateMealPlan.mutateAsync({ dietaryPreference: dietaryPref, goal: "lose_fat", dailyCalories: 2000 });
      } else {
        // Guest mode — save prefs locally AND generate real AI plans
        const existing = await AsyncStorage.getItem("@guest_profile") ?? "{}";
        const profile = JSON.parse(existing);
        await AsyncStorage.setItem("@guest_profile", JSON.stringify({
          ...profile, workoutStyle, dietaryPreference: dietaryPref, daysPerWeek,
        }));
        // Generate real AI plans (server routes now open to guests)
        const [workoutResult, mealResult] = await Promise.all([
          generateWorkoutPlan.mutateAsync({ workoutStyle, daysPerWeek, goal: "lose_fat" }),
          generateMealPlan.mutateAsync({ dietaryPreference: dietaryPref, goal: "lose_fat", dailyCalories: 2000 }),
        ]);
        // Store generated plans locally for guest
        await AsyncStorage.setItem("@guest_workout_plan", JSON.stringify(workoutResult));
        await AsyncStorage.setItem("@guest_meal_plan", JSON.stringify(mealResult));
      }
      Alert.alert(
        "Plans Created! 🎉",
        "Your personalized workout and meal plans are ready. Head to the Plans tab to view them.",
        [
          { text: "View Plans", onPress: () => router.push("/(tabs)/plans" as any) },
          { text: "Stay Here" },
        ]
      );
      setStep("results");
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setStep("goal_setup");
    }
  }

  // Get scan data (real or guest)
  // Fullscreen preview state
  const [previewModal, setPreviewModal] = useState<{ visible: boolean; imageUrl: string; bf: number; beforeUrl: string | null } | null>(null);
  const [previewTab, setPreviewTab] = useState<"after" | "compare">("after");
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;

  const [guestScanData, setGuestScanData] = useState<any>(null);
  React.useEffect(() => {
    if (isGuest && step === "results") {
      AsyncStorage.getItem("@guest_scan").then(raw => {
        if (raw) setGuestScanData(JSON.parse(raw));
      });
    }
  }, [isGuest, step]);

  const scan = isAuthenticated ? (latestScan ?? analyzeScan.data) : guestScanData;

  // ── Fullscreen Transformation Preview Modal ──
  function TransformationPreviewModal() {
    if (!previewModal?.visible) return null;
    const { imageUrl, bf, beforeUrl } = previewModal;
    return (
      <Modal
        visible={previewModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModal(null)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: "#000000F0" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 }}>
            <TouchableOpacity onPress={() => setPreviewModal(null)} style={{ backgroundColor: "#FFFFFF20", borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#E6FFF5", fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 18 }}>{bf}% Body Fat Goal</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Tab Switcher */}
          {beforeUrl ? (
            <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 12, padding: 4 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: previewTab === "after" ? "#10B981" : "transparent" }}
                onPress={() => setPreviewTab("after")}
              >
                <Text style={{ color: previewTab === "after" ? "#E6FFF5" : "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 13 }}>AI Transformation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: previewTab === "compare" ? "#10B981" : "transparent" }}
                onPress={() => setPreviewTab("compare")}
              >
                <Text style={{ color: previewTab === "compare" ? "#E6FFF5" : "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Before / After</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Image Display */}
          {previewTab === "after" ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
              <Image
                source={{ uri: imageUrl }}
                style={{ width: screenW - 32, height: screenH * 0.62, borderRadius: 20 }}
                resizeMode="contain"
              />
              <View style={{ marginTop: 20, backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(16,185,129,0.18)" }}>
                <Text style={{ color: "#34D399", fontFamily: "Outfit_700Bold", fontSize: 14, textAlign: "center" }}>AI-Generated Transformation Preview</Text>
                <Text style={{ color: "#4D8C72", fontSize: 12, textAlign: "center", marginTop: 4 }}>This is how you could look at {bf}% body fat with consistent training and nutrition</Text>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Before</Text>
                  <Image
                    source={{ uri: beforeUrl! }}
                    style={{ width: "100%", flex: 1, borderRadius: 16, maxHeight: screenH * 0.55 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "#10B981", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>After ({bf}% BF)</Text>
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: "100%", flex: 1, borderRadius: 16, maxHeight: screenH * 0.55 }}
                    resizeMode="cover"
                  />
                </View>
              </View>
              <Text style={{ color: "#2D6A52", fontSize: 11, textAlign: "center", marginTop: 12, marginBottom: 8 }}>AI-generated preview for motivational purposes only</Text>
            </View>
          )}

          {/* CTA */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <TouchableOpacity
              style={{ backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => { setPreviewModal(null); selectTargetAndProceed(bf); }}
            >
              <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>🎯 Set {bf}% as My Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#060F0A" }}>
        <ImageBackground source={{ uri: SCAN_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📸</Text>
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>AI Body Scan</Text>
            <Text style={{ color: "#4D8C72", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to analyze your physique and visualize your transformation.</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, shadowColor: "#10B981", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#060F0A" }}>
      {/* Fullscreen Preview Modal */}
      <TransformationPreviewModal />

      {/* Hero Header */}
      <ImageBackground source={{ uri: SCAN_BG }} style={{ height: 180 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.65)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <Text style={{ color: "#6EE7B7", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>AI-POWERED ANALYSIS</Text>
          <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>Body Scan</Text>
          <Text style={{ color: "#4D8C72", fontSize: 12, marginTop: 2 }}>Analyze your physique and visualize your transformation</Text>
        </View>
      </ImageBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* ── STEP: Upload ── */}
        {step === "upload" && (
          <View style={{ paddingHorizontal: 20 }}>
            {selectedImage ? (
              <View style={{ marginBottom: 20 }}>
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: "100%", height: 360, borderRadius: 20, backgroundColor: "#0D1F18" }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(100,116,139,0.56)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 12 }}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: "#0D1F18", borderRadius: 20, padding: 32, alignItems: "center", marginBottom: 20, borderWidth: 2, borderColor: "rgba(16,185,129,0.12)", borderStyle: "dashed" }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📸</Text>
                <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 6 }}>Upload a Full-Body Photo</Text>
                <Text style={{ color: "#4D8C72", fontSize: 13, textAlign: "center", lineHeight: 18 }}>
                  For best results, wear fitted clothing and stand in good lighting facing the camera
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#0D1F18", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(16,185,129,0.10)", gap: 6 }}
                onPress={() => pickImage(true)}
              >
                <Text style={{ fontSize: 22 }}>📷</Text>
                <Text style={{ color: "#10B981", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#0D1F18", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(16,185,129,0.10)", gap: 6 }}
                onPress={() => pickImage(false)}
              >
                <Text style={{ fontSize: 22 }}>🖼️</Text>
                <Text style={{ color: "#10B981", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Choose Photo</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <TouchableOpacity
                style={{ backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
                onPress={startAnalysis}
              >
                <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 15 }}>✨ Analyze My Physique</Text>
              </TouchableOpacity>
            )}

            {/* Previous Scan shortcut */}
            {(scan || (isGuest && guestScanData)) && (
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: "#0D1F18", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(16,185,129,0.12)" }}
                onPress={() => setStep("results")}
              >
                <Text style={{ color: "#34D399", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8 }}>LAST SCAN RESULTS</Text>
                <Text style={{ color: "#10B981", fontSize: 12 }}>Tap to view transformations →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── STEP: Analyzing ── */}
        {step === "analyzing" && (
          <View style={{ paddingHorizontal: 20, alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(16,185,129,0.10)", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 20, marginBottom: 8 }}>Analyzing Your Physique</Text>
            <Text style={{ color: "#4D8C72", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Our AI is analyzing your body composition and generating transformation previews...
            </Text>
            <View style={{ marginTop: 32, gap: 10, width: "100%" }}>
              {[
                "Estimating body fat percentage...",
                "Analyzing muscle mass distribution...",
                "Generating transformation visualizations...",
              ].map((s, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0D1F18", borderRadius: 12, padding: 12 }}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={{ color: "#4D8C72", fontSize: 13 }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP: Results ── */}
        {step === "results" && scan && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Body Fat Result */}
            <View style={{ backgroundColor: "#0D1F18", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(16,185,129,0.12)" }}>
              <Text style={{ color: "#34D399", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8 }}>BODY COMPOSITION ANALYSIS</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 40 }}>
                    {scan.estimatedBodyFat?.toFixed(1)}%
                  </Text>
                  <Text style={{ color: "#4D8C72", fontSize: 14 }}>Estimated Body Fat</Text>
                  <Text style={{ color: "#2D6A52", fontSize: 12, marginTop: 4 }}>
                    Range: {scan.confidenceLow?.toFixed(0)}-{scan.confidenceHigh?.toFixed(0)}%
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <View style={{ backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontSize: 32 }}>💪</Text>
                  </View>
                  <Text style={{ color: "#34D399", fontSize: 11, marginTop: 6 }}>
                    Muscle: {scan.muscleMassEstimate}
                  </Text>
                </View>
              </View>
              {scan.analysisNotes && (
                <View style={{ backgroundColor: "#0D1F18", borderRadius: 12, padding: 12, marginTop: 12 }}>
                  <Text style={{ color: "#10B981", fontSize: 13, lineHeight: 18 }}>
                    {String(scan.analysisNotes)}
                  </Text>
                </View>
              )}
            </View>

            {/* Transformation Previews */}
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 4 }}>
              Choose Your Target
            </Text>
            <Text style={{ color: "#4D8C72", fontSize: 12, marginBottom: 12 }}>
              Tap a body fat % to set it as your goal and create a personalized plan
            </Text>

            {scan.transformations?.map((t: any, i: number) => (
              <View
                key={i}
                style={{
                  backgroundColor: "#0D1F18", borderRadius: 16, padding: 14, marginBottom: 10,
                  borderWidth: 2, borderColor: selectedTransform === t.target_bf ? "#10B981" : "rgba(16,185,129,0.10)",
                }}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {/* Tappable image — opens fullscreen preview */}
                  <TouchableOpacity
                    onPress={() => {
                      if (t.imageUrl) {
                        setPreviewTab("after");
                        setPreviewModal({ visible: true, imageUrl: t.imageUrl, bf: t.target_bf, beforeUrl: selectedImage });
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    {t.imageUrl ? (
                      <View>
                        <Image
                          source={{ uri: t.imageUrl }}
                          style={{ width: 90, height: 115, borderRadius: 12, backgroundColor: "#0D1F18" }}
                          resizeMode="cover"
                        />
                        {/* Zoom hint overlay */}
                        <View style={{ position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 3 }}>
                          <Text style={{ color: "#E6FFF5", fontSize: 10 }}>🔍 View</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ width: 90, height: 115, borderRadius: 12, backgroundColor: "#0D1F18", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 28 }}>🏃</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 22 }}>{t.target_bf}% BF</Text>
                      {selectedTransform === t.target_bf && (
                        <View style={{ backgroundColor: "#10B981", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#E6FFF5", fontSize: 10, fontFamily: "Outfit_700Bold" }}>✓ SELECTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: "#4D8C72", fontSize: 12, lineHeight: 16, marginBottom: 8 }}>
                      {String(t.description)}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                      <View style={{ backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: "#4D8C72", fontSize: 11 }}>⏱ {t.estimated_weeks}w</Text>
                      </View>
                      <View style={{ backgroundColor: (EFFORT_COLORS[t.effort_level] ?? "#4D8C72") + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: EFFORT_COLORS[t.effort_level] ?? "#4D8C72", fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>
                          {EFFORT_LABELS[t.effort_level] ?? t.effort_level}
                        </Text>
                      </View>
                    </View>
                    {/* Enlarge preview button */}
                    {t.imageUrl && (
                      <TouchableOpacity
                        style={{ backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(16,185,129,0.22)", alignSelf: "flex-start" }}
                        onPress={() => {
                          setPreviewTab("after");
                          setPreviewModal({ visible: true, imageUrl: t.imageUrl, bf: t.target_bf, beforeUrl: selectedImage });
                        }}
                      >
                        <Text style={{ color: "#34D399", fontSize: 11, fontFamily: "Outfit_700Bold" }}>🔍 Enlarge Preview</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {/* CTA row */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: selectedTransform === t.target_bf ? "#10B981" : "rgba(16,185,129,0.10)", borderRadius: 12, paddingVertical: 10, alignItems: "center" }}
                    onPress={() => selectTargetAndProceed(t.target_bf)}
                  >
                    <Text style={{ color: selectedTransform === t.target_bf ? "#E6FFF5" : "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 13 }}>
                      {selectedTransform === t.target_bf ? "✓ Selected — Create Plan" : "Select This Goal"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={{ backgroundColor: "#0D1F18", borderRadius: 16, paddingVertical: 12, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: "rgba(16,185,129,0.10)" }}
              onPress={() => { setStep("upload"); setSelectedImage(null); }}
            >
              <Text style={{ color: "#4D8C72", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>📷 New Scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: Goal Setup ── */}
        {step === "goal_setup" && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Selected Goal Banner */}
            <View style={{ backgroundColor: "rgba(16,185,129,0.10)", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(16,185,129,0.18)", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ fontSize: 28 }}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#34D399", fontFamily: "Outfit_700Bold", fontSize: 12 }}>TARGET SET</Text>
                <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>{selectedTransform}% Body Fat</Text>
                <Text style={{ color: "#4D8C72", fontSize: 12 }}>Now let's customize your plan</Text>
              </View>
            </View>

            {/* Workout Style */}
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 4 }}>Workout Style</Text>
            <Text style={{ color: "#4D8C72", fontSize: 12, marginBottom: 12 }}>Where do you prefer to work out?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {WORKOUT_STYLES.map(w => (
                <TouchableOpacity
                  key={w.key}
                  style={{
                    width: "47%", backgroundColor: workoutStyle === w.key ? "rgba(16,185,129,0.10)" : "#0D1F18",
                    borderRadius: 14, padding: 14, borderWidth: 2,
                    borderColor: workoutStyle === w.key ? "#10B981" : "rgba(16,185,129,0.10)",
                    alignItems: "center", gap: 4,
                  }}
                  onPress={() => setWorkoutStyle(w.key)}
                >
                  <Text style={{ fontSize: 24 }}>{w.icon}</Text>
                  <Text style={{ color: workoutStyle === w.key ? "#E6FFF5" : "#10B981", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{w.label}</Text>
                  <Text style={{ color: "#4D8C72", fontSize: 11 }}>{w.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Days per week */}
            <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>DAYS PER WEEK</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[3, 4, 5, 6].map(d => (
                <TouchableOpacity
                  key={d}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? "#10B981" : "#0D1F18", borderWidth: 1, borderColor: daysPerWeek === d ? "#10B981" : "rgba(16,185,129,0.10)" }}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={{ color: daysPerWeek === d ? "#E6FFF5" : "#4D8C72", fontFamily: "Outfit_700Bold", fontSize: 16 }}>{d}</Text>
                  <Text style={{ color: daysPerWeek === d ? "#10B981" : "#2D6A52", fontSize: 10 }}>days</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dietary Preference */}
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 4 }}>Dietary Preference</Text>
            <Text style={{ color: "#4D8C72", fontSize: 12, marginBottom: 12 }}>Your meal plan will respect your dietary choices.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {DIETARY_PREFS.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={{
                    width: "30%", backgroundColor: dietaryPref === d.key ? "rgba(16,185,129,0.10)" : "#0D1F18",
                    borderRadius: 12, padding: 12, borderWidth: 2,
                    borderColor: dietaryPref === d.key ? "#10B981" : "rgba(16,185,129,0.10)",
                    alignItems: "center", gap: 4,
                  }}
                  onPress={() => setDietaryPref(d.key)}
                >
                  <Text style={{ fontSize: 20 }}>{d.icon}</Text>
                  <Text style={{ color: dietaryPref === d.key ? "#E6FFF5" : "#4D8C72", fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate CTA */}
            <TouchableOpacity
              style={{ backgroundColor: "#10B981", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12 }}
              onPress={generatePlans}
            >
              <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>🚀 Generate My Workout & Meal Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ borderRadius: 16, paddingVertical: 12, alignItems: "center" }}
              onPress={() => setStep("results")}
            >
              <Text style={{ color: "#2D6A52", fontSize: 14 }}>← Back to results</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: Generating ── */}
        {step === "generating" && (
          <View style={{ paddingHorizontal: 20, alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(16,185,129,0.10)", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
            <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 20, marginBottom: 8 }}>Creating Your Plans</Text>
            <Text style={{ color: "#4D8C72", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              AI is generating your personalized workout and meal plans based on your goals...
            </Text>
            <View style={{ marginTop: 32, gap: 10, width: "100%" }}>
              {[
                "Building your 7-day workout schedule...",
                "Calculating your calorie and macro targets...",
                "Creating personalized meal plan...",
              ].map((s, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0D1F18", borderRadius: 12, padding: 12 }}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={{ color: "#4D8C72", fontSize: 13 }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
