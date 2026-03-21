import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image, Platform, ImageBackground,
  Modal, Dimensions, PanResponder,
} from "react-native";
import ReAnimated, {
  useSharedValue, useAnimatedStyle, interpolate, Extrapolation,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import * as ImagePicker from "expo-image-picker";

import * as FileSystem from "expo-file-system/legacy";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";

import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SCAN_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/OdDCyHFnLhvyAyWV.jpg";

const EFFORT_COLORS: Record<string, string> = {
  moderate: "#FDE68A",
  high: "#FBBF24",
  very_high: "#B45309",
  extreme: "#A855F7",
};

const EFFORT_LABELS: Record<string, string> = {
  moderate: "Moderate",
  high: "High",
  very_high: "Very High",
  extreme: "Extreme",
};

const WORKOUT_STYLES = [
  { key: "gym", label: "Gym", iconName: "fitness-center" as const, desc: "Full equipment" },
  { key: "home", label: "Home", iconName: "home" as const, desc: "Minimal gear" },
  { key: "mix", label: "Mix", iconName: "sync" as const, desc: "Gym & home" },
  { key: "calisthenics", label: "Calisthenics", iconName: "accessibility-new" as const, desc: "Bodyweight" },
];

const DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", iconName: "restaurant" as const },
  { key: "halal", label: "Halal", iconName: "verified" as const },
  { key: "vegan", label: "Vegan", iconName: "eco" as const },
  { key: "vegetarian", label: "Vegetarian", iconName: "spa" as const },
  { key: "keto", label: "Keto", iconName: "egg-alt" as const },
  { key: "paleo", label: "Paleo", iconName: "set-meal" as const },
];

type Step = "upload" | "analyzing" | "results" | "goal_setup" | "generating";

export default function ScanScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isGuest, guestProfile } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
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
      setUploadedPhotoUrl(url);
      const result = await analyzeScan.mutateAsync({ photoUrl: url });
      // Save to body_scan_history so the dashboard BF% card picks it up
      if (result?.estimatedBodyFat) {
        const scanEntry = {
          estimatedBodyFat: result.estimatedBodyFat,
          confidenceLow: result.confidenceLow,
          confidenceHigh: result.confidenceHigh,
          analysisNotes: result.analysisNotes,
          date: new Date().toISOString(),
          photoUrl: url,
        };
        const existingRaw = await AsyncStorage.getItem("@body_scan_history");
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        existing.push(scanEntry);
        await AsyncStorage.setItem("@body_scan_history", JSON.stringify(existing));
      }
      if (!isAuthenticated) {
        // Store result locally for guest users (include the uploaded photo URL)
        await AsyncStorage.setItem("@guest_scan", JSON.stringify({ ...result, uploadedPhotoUrl: url }));
        setGuestScanData({ ...result, uploadedPhotoUrl: url });
        setStep("results");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setStep("upload");
    }
  }

  async function selectTargetAndProceed(bf: number) {
    setSelectedTransform(bf);
    // Find the matching transformation to get the imageUrl
    const matchingTransform = scan?.transformations?.find((t: any) => t.target_bf === bf);
    if (matchingTransform) {
      await AsyncStorage.setItem("@target_transformation", JSON.stringify(matchingTransform));
    }
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
              <Text style={{ color: "#FFF7ED", fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 18 }}>{bf}% Body Fat Goal</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Tab Switcher */}
          {beforeUrl ? (
            <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, padding: 4 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: previewTab === "after" ? "#F59E0B" : "transparent" }}
                onPress={() => setPreviewTab("after")}
              >
                <Text style={{ color: previewTab === "after" ? "#FFF7ED" : "#B45309", fontFamily: "Outfit_700Bold", fontSize: 13 }}>AI Transformation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: previewTab === "compare" ? "#F59E0B" : "transparent" }}
                onPress={() => setPreviewTab("compare")}
              >
                <Text style={{ color: previewTab === "compare" ? "#FFF7ED" : "#B45309", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Before / After</Text>
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
              <View style={{ marginTop: 20, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)" }}>
                <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 14, textAlign: "center" }}>AI-Generated Transformation Preview</Text>
                <Text style={{ color: "#B45309", fontSize: 12, textAlign: "center", marginTop: 4 }}>Your potential look with consistent training</Text>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Before</Text>
                  <Image
                    source={{ uri: beforeUrl! }}
                    style={{ width: "100%", flex: 1, borderRadius: 16, maxHeight: screenH * 0.55 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>After ({bf}% BF)</Text>
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: "100%", flex: 1, borderRadius: 16, maxHeight: screenH * 0.55 }}
                    resizeMode="cover"
                  />
                </View>
              </View>
              <Text style={{ color: "#B45309", fontSize: 11, textAlign: "center", marginTop: 12, marginBottom: 8 }}>AI-generated preview for motivational purposes only</Text>
            </View>
          )}

          {/* CTA */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => { setPreviewModal(null); selectTargetAndProceed(bf); }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><MaterialIcons name="gps-fixed" size={16} color="#FFF7ED" /><Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Set {bf}% as My Goal</Text></View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
        <ImageBackground source={{ uri: SCAN_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <MaterialIcons name="photo-camera" size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>AI Body Scan</Text>
            <Text style={{ color: "#B45309", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to get started.</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // 1B: Parallax scroll value for Scan hero
  const scrollY = useSharedValue(0);
  const heroImgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, 100], Extrapolation.CLAMP) }],
  }));
  const heroTxtStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 150], [1, 0], Extrapolation.CLAMP),
  }));
  const onScroll = useCallback((e: any) => { scrollY.value = e.nativeEvent.contentOffset.y; }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Fullscreen Preview Modal */}
      <TransformationPreviewModal />

      {/* Hero Header with Parallax (1B) */}
      <View style={{ width: "100%", height: 180, overflow: "hidden" }}>
        <ReAnimated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height: 280 }, heroImgStyle]}>
          <ImageBackground source={{ uri: SCAN_BG }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </ReAnimated.View>
        <ReAnimated.View style={[{ flex: 1, backgroundColor: "rgba(8,8,16,0.65)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }, heroTxtStyle]}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, right: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
            onPress={() => router.push("/user-guide" as any)}
          >
            <MaterialIcons name="help-outline" size={14} color="#FBBF24" />
            <Text style={{ color: "#FBBF24", fontFamily: "DMSans_500Medium", fontSize: 11 }}>Guide</Text>
          </TouchableOpacity>
          <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>AI-POWERED ANALYSIS</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>Body Scan</Text>
          <Text style={{ color: "#B45309", fontSize: 12, marginTop: 2 }}>Analyze your physique and visualize your transformation</Text>
        </ReAnimated.View>
      </View>
      <ReAnimated.ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false} style={{ flex: 1 }} onScroll={onScroll} scrollEventThrottle={16}>
        {/* Progress Comparison link */}
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginTop: 12, marginBottom: 8, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}
          onPress={() => router.push("/body-scan-compare" as any)}
        >
          <MaterialIcons name="bar-chart" size={22} color="#FBBF24" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Progress Comparison</Text>
            <Text style={{ color: "#B45309", fontSize: 11 }}>Side-by-side body scan comparison with stats</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#FBBF24" />
        </TouchableOpacity>

        {/* ── STEP: Upload ── */}
        {step === "upload" && (
          <View style={{ paddingHorizontal: 20 }}>
            {selectedImage ? (
              <View style={{ marginBottom: 20 }}>
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: "100%", height: 360, borderRadius: 20, backgroundColor: "#150A00" }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(100,116,139,0.56)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 12 }}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: "#150A00", borderRadius: 20, padding: 32, alignItems: "center", marginBottom: 20, borderWidth: 2, borderColor: "rgba(245,158,11,0.12)", borderStyle: "dashed" }}>
                <MaterialIcons name="photo-camera" size={48} color="#F59E0B" style={{ marginBottom: 12 }} />
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 6 }}>Upload a Full-Body Photo</Text>
                <Text style={{ color: "#B45309", fontSize: 13, textAlign: "center", lineHeight: 18 }}>
                  For best results, wear fitted clothing and stand in good lighting facing the camera
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
                onPress={() => pickImage(true)}
              >
                <MaterialIcons name="photo-camera" size={22} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
                onPress={() => pickImage(false)}
              >
                <MaterialIcons name="photo-library" size={22} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Choose Photo</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <TouchableOpacity
                style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
                onPress={startAnalysis}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><MaterialIcons name="auto-awesome" size={16} color="#FFF7ED" /><Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Analyze My Physique</Text></View>
              </TouchableOpacity>
            )}

            {/* Previous Scan shortcut */}
            {(scan || (isGuest && guestScanData)) && (
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: "#150A00", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}
                onPress={() => setStep("results")}
              >
                <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8 }}>LAST SCAN RESULTS</Text>
                <Text style={{ color: "#F59E0B", fontSize: 12 }}>Tap to view transformations →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── STEP: Analyzing ── */}
        {step === "analyzing" && (
          <View style={{ paddingHorizontal: 20, alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <ActivityIndicator size="large" color="#F59E0B" />
            </View>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 20, marginBottom: 8 }}>Analyzing Your Physique</Text>
            <Text style={{ color: "#B45309", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Our AI is analyzing your body composition and generating transformation previews...
            </Text>
            <View style={{ marginTop: 32, gap: 10, width: "100%" }}>
              {[
                "Estimating body fat percentage...",
                "Analyzing muscle mass distribution...",
                "Generating transformation visualizations...",
              ].map((s, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#150A00", borderRadius: 12, padding: 12 }}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={{ color: "#B45309", fontSize: 13 }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP: Results ── */}
        {step === "results" && scan && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Body Fat Result */}
            <View style={{ backgroundColor: "#150A00", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
              <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8 }}>BODY COMPOSITION ANALYSIS</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 40 }}>
                    {scan.estimatedBodyFat?.toFixed(1)}%
                  </Text>
                  <Text style={{ color: "#B45309", fontSize: 14 }}>Estimated Body Fat</Text>
                  <Text style={{ color: "#B45309", fontSize: 12, marginTop: 4 }}>
                    Range: {scan.confidenceLow?.toFixed(0)}-{scan.confidenceHigh?.toFixed(0)}%
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16, padding: 16 }}>
                    <MaterialIcons name="fitness-center" size={32} color="#F59E0B" />
                  </View>
                  <Text style={{ color: "#FBBF24", fontSize: 11, marginTop: 6 }}>
                    Muscle: {scan.muscleMassEstimate}
                  </Text>
                </View>
              </View>
              {scan.analysisNotes && (
                <View style={{ backgroundColor: "#150A00", borderRadius: 12, padding: 12, marginTop: 12 }}>
                  <Text style={{ color: "#F59E0B", fontSize: 13, lineHeight: 18 }}>
                    {String(scan.analysisNotes)}
                  </Text>
                </View>
              )}
            </View>

            {/* Transformation Previews */}
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 4 }}>
              Choose Your Target
            </Text>
            <Text style={{ color: "#B45309", fontSize: 12, marginBottom: 12 }}>
              Tap a body fat % to set it as your goal and create a personalized plan
            </Text>

            {scan.transformations?.map((t: any, i: number) => (
              <View
                key={i}
                style={{
                  backgroundColor: "#150A00", borderRadius: 16, padding: 14, marginBottom: 10,
                  borderWidth: 2, borderColor: selectedTransform === t.target_bf ? "#F59E0B" : "rgba(245,158,11,0.10)",
                }}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {/* Tappable image — opens fullscreen preview */}
                  <TouchableOpacity
                    onPress={() => {
                      if (t.imageUrl) {
                        setPreviewTab("after");
                        setPreviewModal({ visible: true, imageUrl: t.imageUrl, bf: t.target_bf, beforeUrl: uploadedPhotoUrl ?? selectedImage });
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    {t.imageUrl ? (
                      <View>
                        <Image
                          source={{ uri: t.imageUrl }}
                          style={{ width: 90, height: 115, borderRadius: 12, backgroundColor: "#150A00" }}
                          resizeMode="cover"
                        />
                        {/* Zoom hint overlay */}
                        <View style={{ position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 3 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><MaterialIcons name="zoom-in" size={10} color="#FFF7ED" /><Text style={{ color: "#FFF7ED", fontSize: 10 }}>View</Text></View>
                        </View>
                      </View>
                    ) : (
                      <View style={{ width: 90, height: 115, borderRadius: 12, backgroundColor: "#150A00", alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="directions-run" size={28} color="#F59E0B" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22 }}>{t.target_bf}% BF</Text>
                      {selectedTransform === t.target_bf && (
                        <View style={{ backgroundColor: "#F59E0B", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#FFF7ED", fontSize: 10, fontFamily: "Outfit_700Bold" }}>✓ SELECTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: "#B45309", fontSize: 12, lineHeight: 16, marginBottom: 8 }}>
                      {String(t.description)}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                      <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><MaterialIcons name="timer" size={11} color="#B45309" /><Text style={{ color: "#B45309", fontSize: 11 }}>{t.estimated_weeks}w</Text></View>
                      </View>
                      <View style={{ backgroundColor: (EFFORT_COLORS[t.effort_level] ?? "#B45309") + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: EFFORT_COLORS[t.effort_level] ?? "#B45309", fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>
                          {EFFORT_LABELS[t.effort_level] ?? t.effort_level}
                        </Text>
                      </View>
                    </View>
                    {/* Enlarge preview button */}
                    {t.imageUrl && (
                      <TouchableOpacity
                        style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.22)", alignSelf: "flex-start" }}
                        onPress={() => {
                          setPreviewTab("after");
                          setPreviewModal({ visible: true, imageUrl: t.imageUrl, bf: t.target_bf, beforeUrl: uploadedPhotoUrl ?? selectedImage });
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MaterialIcons name="zoom-in" size={12} color="#FBBF24" /><Text style={{ color: "#FBBF24", fontSize: 11, fontFamily: "Outfit_700Bold" }}>Enlarge Preview</Text></View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {/* CTA row */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: selectedTransform === t.target_bf ? "#F59E0B" : "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 10, alignItems: "center" }}
                    onPress={() => selectTargetAndProceed(t.target_bf)}
                  >
                    <Text style={{ color: selectedTransform === t.target_bf ? "#FFF7ED" : "#B45309", fontFamily: "Outfit_700Bold", fontSize: 13 }}>
                      {selectedTransform === t.target_bf ? "✓ Selected — Create Plan" : "Select This Goal"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={{ backgroundColor: "#150A00", borderRadius: 16, paddingVertical: 12, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
              onPress={() => { setStep("upload"); setSelectedImage(null); }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><MaterialIcons name="photo-camera" size={14} color="#B45309" /><Text style={{ color: "#B45309", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>New Scan</Text></View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: Goal Setup ── */}
        {step === "goal_setup" && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Selected Goal Banner */}
            <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="gps-fixed" size={28} color="#FBBF24" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 12 }}>TARGET SET</Text>
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>{selectedTransform}% Body Fat</Text>
                <Text style={{ color: "#B45309", fontSize: 12 }}>Now let's customize your plan</Text>
              </View>
            </View>

            {/* Workout Style */}
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 4 }}>Workout Style</Text>
            <Text style={{ color: "#B45309", fontSize: 12, marginBottom: 12 }}>Where do you prefer to work out?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {WORKOUT_STYLES.map(w => (
                <TouchableOpacity
                  key={w.key}
                  style={{
                    width: "47%", backgroundColor: workoutStyle === w.key ? "rgba(245,158,11,0.10)" : "#150A00",
                    borderRadius: 14, padding: 14, borderWidth: 2,
                    borderColor: workoutStyle === w.key ? "#F59E0B" : "rgba(245,158,11,0.10)",
                    alignItems: "center", gap: 4,
                  }}
                  onPress={() => setWorkoutStyle(w.key)}
                >
                  <MaterialIcons name={w.iconName as any} size={24} color={workoutStyle === w.key ? "#FFF7ED" : "#F59E0B"} />
                  <Text style={{ color: workoutStyle === w.key ? "#FFF7ED" : "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{w.label}</Text>
                  <Text style={{ color: "#B45309", fontSize: 11 }}>{w.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Days per week */}
            <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 8 }}>DAYS PER WEEK</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[3, 4, 5, 6].map(d => (
                <TouchableOpacity
                  key={d}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: daysPerWeek === d ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={{ color: daysPerWeek === d ? "#FFF7ED" : "#B45309", fontFamily: "Outfit_700Bold", fontSize: 16 }}>{d}</Text>
                  <Text style={{ color: daysPerWeek === d ? "#F59E0B" : "#B45309", fontSize: 10 }}>days</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dietary Preference */}
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 4 }}>Dietary Preference</Text>
            <Text style={{ color: "#B45309", fontSize: 12, marginBottom: 12 }}>Your meal plan will respect your dietary choices.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {DIETARY_PREFS.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={{
                    width: "30%", backgroundColor: dietaryPref === d.key ? "rgba(245,158,11,0.10)" : "#150A00",
                    borderRadius: 12, padding: 12, borderWidth: 2,
                    borderColor: dietaryPref === d.key ? "#F59E0B" : "rgba(245,158,11,0.10)",
                    alignItems: "center", gap: 4,
                  }}
                  onPress={() => setDietaryPref(d.key)}
                >
                  <MaterialIcons name={d.iconName as any} size={20} color={dietaryPref === d.key ? "#FFF7ED" : "#F59E0B"} />
                  <Text style={{ color: dietaryPref === d.key ? "#FFF7ED" : "#B45309", fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate CTA */}
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12 }}
              onPress={generatePlans}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><MaterialIcons name="rocket-launch" size={16} color="#FFF7ED" /><Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Generate My Workout & Meal Plans</Text></View>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ borderRadius: 16, paddingVertical: 12, alignItems: "center" }}
              onPress={() => setStep("results")}
            >
              <Text style={{ color: "#B45309", fontSize: 14 }}>← Back to results</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: Generating ── */}
        {step === "generating" && (
          <View style={{ paddingHorizontal: 20, alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <ActivityIndicator size="large" color="#F59E0B" />
            </View>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 20, marginBottom: 8 }}>Creating Your Plans</Text>
            <Text style={{ color: "#B45309", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              AI is generating your personalized workout and meal plans based on your goals...
            </Text>
            <View style={{ marginTop: 32, gap: 10, width: "100%" }}>
              {[
                "Building your 7-day workout schedule...",
                "Calculating your calorie and macro targets...",
                "Creating personalized meal plan...",
              ].map((s, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#150A00", borderRadius: 12, padding: 12 }}>
                  <ActivityIndicator size="small" color="#F59E0B" />
                  <Text style={{ color: "#B45309", fontSize: 13 }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ReAnimated.ScrollView>
    </View>
  );
}
