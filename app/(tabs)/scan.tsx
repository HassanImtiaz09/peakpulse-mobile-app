import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image, Platform, ImageBackground,
  Modal, Dimensions, PanResponder, Share,
} from "react-native";
import ReAnimated, {
  useSharedValue, useAnimatedStyle, interpolate, Extrapolation,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import * as FileSystem from "expo-file-system/legacy";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";

import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FeatureGate } from "@/components/feature-gate";
import { useSubscription } from "@/hooks/use-subscription";
import { PremiumFeatureBanner, PremiumFeatureTeaser } from "@/components/premium-feature-banner";
import { recordProgressPhotoTaken } from "@/lib/feature-discovery";

const SCAN_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/OdDCyHFnLhvyAyWV.jpg";

// NanoBanana scan-screen accent: ice-blue (#22D3EE)
const ICE = "#22D3EE";
const ICE_DIM = "rgba(34,211,238,0.12)";
const ICE_BORDER = "rgba(34,211,238,0.25)";
const BG = "#0A0E14";
const SURFACE = "#141A22";
const FG = "#F1F5F9";
const MUTED = "#64748B";

const EFFORT_COLORS: Record<string, string> = {
  moderate: "#FDE68A",
  high: "#FBBF24",
  very_high: "#F59E0B",
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

interface ProgressPhoto {
  uri: string;
  date: string;
  note?: string;
}

export default function ScanScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isGuest, guestProfile } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;
  const { canAccess } = useSubscription();
  const hasBodyScanAccess = canAccess("body_scan");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [selectedTransform, setSelectedTransform] = useState<number | null>(null);

  // Progress tracking state
  const [targetTransformation, setTargetTransformation] = useState<any>(null);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [showProgressSection, setShowProgressSection] = useState(true);
  const [showSliderComparison, setShowSliderComparison] = useState(false);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const sliderX = useSharedValue(Dimensions.get("window").width / 2);

  // Load target transformation and progress photos
  React.useEffect(() => {
    AsyncStorage.getItem("@target_transformation").then(raw => {
      if (raw) setTargetTransformation(JSON.parse(raw));
    });
    AsyncStorage.getItem("@progress_photos").then(raw => {
      if (raw) setProgressPhotos(JSON.parse(raw));
    });
  }, [step]);

  async function takeProgressPhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to take progress photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8, allowsEditing: true, aspect: [3, 4],
      });
      if (!result.canceled && result.assets[0]) {
        const newPhoto: ProgressPhoto = {
          uri: result.assets[0].uri,
          date: new Date().toISOString(),
        };
        const updated = [...progressPhotos, newPhoto];
        setProgressPhotos(updated);
        await AsyncStorage.setItem("@progress_photos", JSON.stringify(updated));
        if (Platform.OS !== "web") {
          const Haptics = require("expo-haptics");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Progress Photo Saved", "Your progress photo has been added to your timeline.");
        recordProgressPhotoTaken().catch(() => {});
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function pickProgressPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8, allowsEditing: true, aspect: [3, 4],
      });
      if (!result.canceled && result.assets[0]) {
        const newPhoto: ProgressPhoto = {
          uri: result.assets[0].uri,
          date: new Date().toISOString(),
        };
        const updated = [...progressPhotos, newPhoto];
        setProgressPhotos(updated);
        await AsyncStorage.setItem("@progress_photos", JSON.stringify(updated));
        Alert.alert("Progress Photo Saved", "Your progress photo has been added to your timeline.");
        recordProgressPhotoTaken().catch(() => {});
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

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
      // Set generating flag so dashboard shows spinner instead of "Get Started" CTA
      await AsyncStorage.setItem("@plan_generating", "true");

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

      // Clear generating flag now that plans are saved
      await AsyncStorage.removeItem("@plan_generating");

      Alert.alert(
        "Plans Created! \uD83C\uDF89",
        "Your personalized workout and meal plans are ready. Head to the Plans tab to view them.",     [
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
  const [previewTab, setPreviewTab] = useState<"after" | "compare" | "face">("after");
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
              <Text style={{ color: FG, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 18 }}>{bf}% Body Fat Goal</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Tab Switcher */}
          {beforeUrl ? (
            <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 16, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, padding: 4 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: previewTab === "after" ? "#F59E0B" : "transparent" }}
                onPress={() => setPreviewTab("after")}
              >
                <Text style={{ color: previewTab === "after" ? FG : MUTED, fontFamily: "DMSans_700Bold", fontSize: 13 }}>AI Transformation</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: previewTab === "compare" ? "#F59E0B" : "transparent" }}
                onPress={() => setPreviewTab("compare")}
              >
                <Text style={{ color: previewTab === "compare" ? FG : MUTED, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Body</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: previewTab === "face" ? "#F59E0B" : "transparent" }}
                onPress={() => setPreviewTab("face")}
              >
                <Text style={{ color: previewTab === "face" ? FG : MUTED, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Face</Text>
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
                <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 14, textAlign: "center" }}>AI-Generated Transformation Preview</Text>
                <Text style={{ color: MUTED, fontSize: 12, textAlign: "center", marginTop: 4 }}>Your potential look with consistent training</Text>
              </View>
            </View>
          ) : previewTab === "face" ? (
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              {/* Face Zoom Header */}
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}>
                  <MaterialIcons name="face" size={16} color="#FBBF24" />
                  <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 12 }}>Face Comparison</Text>
                </View>
              </View>
              {/* Side-by-side face crops */}
              <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                {/* Before face */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Before</Text>
                  <View style={{ width: "100%", aspectRatio: 0.8, borderRadius: 20, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(148,163,184,0.25)" }}>
                    <Image
                      source={{ uri: beforeUrl! }}
                      style={{ width: "200%", height: "200%", position: "absolute", top: "-10%", left: "-50%" }}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={{ marginTop: 8, backgroundColor: "rgba(148,163,184,0.08)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 11 }}>Current</Text>
                  </View>
                </View>
                {/* After face */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>After</Text>
                  <View style={{ width: "100%", aspectRatio: 0.8, borderRadius: 20, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(245,158,11,0.35)" }}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: "200%", height: "200%", position: "absolute", top: "-10%", left: "-50%" }}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={{ marginTop: 8, backgroundColor: "rgba(245,158,11,0.10)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 11 }}>{bf}% BF</Text>
                  </View>
                </View>
              </View>
              {/* Face change description */}
              <View style={{ marginTop: 16, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 4 }}>What changes in the face?</Text>
                <Text style={{ color: MUTED, fontSize: 11, lineHeight: 16 }}>
                  {bf >= 20
                    ? "Subtle reduction in facial puffiness with a slightly more defined jawline."
                    : bf >= 15
                    ? "Noticeable jawline definition with emerging cheekbone visibility and reduced under-chin softness."
                    : bf >= 12
                    ? "Sharp jawline with prominent cheekbones, significantly leaner facial appearance."
                    : "Chiseled, angular jawline with very prominent cheekbones and virtually no under-chin fat."}
                </Text>
              </View>
              <Text style={{ color: MUTED, fontSize: 10, textAlign: "center", marginTop: 10, marginBottom: 4 }}>Face region is cropped and enlarged from the full transformation image</Text>
            </View>
          ) : (
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Before</Text>
                  <Image
                    source={{ uri: beforeUrl! }}
                    style={{ width: "100%", flex: 1, borderRadius: 16, maxHeight: screenH * 0.55 }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>After ({bf}% BF)</Text>
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: "100%", flex: 1, borderRadius: 16, maxHeight: screenH * 0.55 }}
                    resizeMode="cover"
                  />
                </View>
              </View>
              <Text style={{ color: MUTED, fontSize: 11, textAlign: "center", marginTop: 12, marginBottom: 8 }}>AI-generated preview for motivational purposes only</Text>
            </View>
          )}

          {/* CTA */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => { setPreviewModal(null); selectTargetAndProceed(bf); }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><MaterialIcons name="gps-fixed" size={16} color={FG} /><Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>Set {bf}% as My Goal</Text></View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ImageBackground source={{ uri: SCAN_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <MaterialIcons name="photo-camera" size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
            <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 22, textAlign: "center", marginBottom: 8 }}>AI Body Scan</Text>
            <Text style={{ color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to get started.</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>Get Started →</Text>
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
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Fullscreen Preview Modal */}
      <TransformationPreviewModal />

      {/* Feature gate for body scan — shows upgrade overlay for free users */}
      {!hasBodyScanAccess && (
        <FeatureGate feature="body_scan" message="AI Body Scan analyzes your physique and tracks body composition changes over time. Upgrade to Basic or higher to unlock.">
          <View style={{ height: 400 }} />
        </FeatureGate>
      )}

      {/* Hero Header — NanoBanana ice-blue, no background image */}
      <View style={{ backgroundColor: BG, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <MaterialIcons name="chevron-left" size={28} color={FG} />
          </TouchableOpacity>
          <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 24, letterSpacing: 3 }}>AI BODY SCAN</Text>
          <TouchableOpacity onPress={() => router.push("/user-guide" as any)} style={{ padding: 4 }}>
            <MaterialIcons name="help-outline" size={22} color={MUTED} />
          </TouchableOpacity>
        </View>
      </View>
      <ReAnimated.ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} style={{ flex: 1 }} onScroll={onScroll} scrollEventThrottle={16}>
        {/* Progress Comparison link */}
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginTop: 4, marginBottom: 8, backgroundColor: ICE_DIM, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: ICE_BORDER }}
          onPress={() => router.push("/body-scan-compare" as any)}
        >
          <MaterialIcons name="bar-chart" size={22} color={ICE} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: FG, fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>Progress Comparison</Text>
            <Text style={{ color: MUTED, fontSize: 11 }}>Side-by-side body scan comparison with stats</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={ICE} />
        </TouchableOpacity>

        {/* ── STEP: Upload ── */}
        {step === "upload" && (
          <View style={{ paddingHorizontal: 20 }}>
            {selectedImage ? (
              <View style={{ marginBottom: 20 }}>
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: "100%", height: 360, borderRadius: 20, backgroundColor: SURFACE }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(100,116,139,0.56)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 12 }}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: SURFACE, borderRadius: 20, padding: 32, alignItems: "center", marginBottom: 20, borderWidth: 2, borderColor: ICE_BORDER, borderStyle: "dashed" }}>
                <MaterialIcons name="photo-camera" size={48} color={ICE} style={{ marginBottom: 12 }} />
                <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 16, marginBottom: 6 }}>Upload a Full-Body Photo</Text>
                <Text style={{ color: MUTED, fontSize: 13, textAlign: "center", lineHeight: 18 }}>
                  For best results, wear fitted clothing and stand in good lighting facing the camera
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: ICE_BORDER, gap: 6 }}
                onPress={() => pickImage(true)}
              >
                <MaterialIcons name="photo-camera" size={22} color={ICE} />
                <Text style={{ color: ICE, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: ICE_BORDER, gap: 6 }}
                onPress={() => pickImage(false)}
              >
                <MaterialIcons name="photo-library" size={22} color={ICE} />
                <Text style={{ color: ICE, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Choose Photo</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <TouchableOpacity
                style={{ backgroundColor: ICE, borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
                onPress={startAnalysis}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><MaterialIcons name="auto-awesome" size={16} color={BG} /><Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Analyze My Physique</Text></View>
              </TouchableOpacity>
            )}

            {/* Previous Scan shortcut */}
            {(scan || (isGuest && guestScanData)) && (
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: ICE_BORDER }}
                onPress={() => setStep("results")}
              >
                <Text style={{ color: ICE, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 8 }}>LAST SCAN RESULTS</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>Tap to view transformations →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── STEP: Analyzing ── */}
        {step === "analyzing" && (
          <View style={{ paddingHorizontal: 20, alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: ICE_DIM, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <ActivityIndicator size="large" color={ICE} />
            </View>
            <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 24, letterSpacing: 2, marginBottom: 8 }}>ANALYZING YOUR PHYSIQUE</Text>
            <Text style={{ color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Our AI is analyzing your body composition and generating transformation previews...
            </Text>
            <View style={{ marginTop: 32, gap: 10, width: "100%" }}>
              {[
                "Estimating body fat percentage...",
                "Analyzing muscle mass distribution...",
                "Generating transformation visualizations...",
              ].map((s, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: SURFACE, borderRadius: 12, padding: 12 }}>
                  <ActivityIndicator size="small" color={ICE} />
                  <Text style={{ color: MUTED, fontSize: 13 }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP: Results ── */}
        {step === "results" && scan && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Body Fat Result */}
            {/* Body Fat + Weight side-by-side cards (NanoBanana layout) */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: ICE_BORDER }}>
                <Text style={{ color: MUTED, fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 4 }}>Body Fat</Text>
                <Text style={{ color: ICE, fontFamily: "SpaceMono_700Bold", fontSize: 32 }}>
                  {scan.estimatedBodyFat?.toFixed(1)}%
                </Text>
                <Text style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>
                  Range: {scan.confidenceLow?.toFixed(0)}-{scan.confidenceHigh?.toFixed(0)}%
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: ICE_BORDER }}>
                <Text style={{ color: MUTED, fontFamily: "DMSans_500Medium", fontSize: 11, marginBottom: 4 }}>Weight</Text>
                <Text style={{ color: ICE, fontFamily: "SpaceMono_700Bold", fontSize: 32 }}>
                  {scan.muscleMassEstimate ?? "--"}
                </Text>
                <Text style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>Muscle estimate</Text>
              </View>
            </View>

            <View style={{ backgroundColor: SURFACE, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: ICE_BORDER }}>
              <Text style={{ color: ICE, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>BODY COMPOSITION ANALYSIS</Text>
              {scan.analysisNotes && (
                <View style={{ backgroundColor: BG, borderRadius: 12, padding: 12, marginTop: 12 }}>
                  <Text style={{ color: MUTED, fontSize: 13, lineHeight: 18 }}>
                    {String(scan.analysisNotes)}
                  </Text>
                </View>
              )}
            </View>

            {/* Transformation Previews */}
            <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 22, letterSpacing: 2, marginBottom: 4 }}>
              AI TRANSFORMATION TARGET
            </Text>
            <Text style={{ color: MUTED, fontSize: 12, marginBottom: 12 }}>
              Tap a body fat % to set it as your goal and create a personalized plan
            </Text>

            {scan.transformations?.map((t: any, i: number) => (
              <View
                key={i}
                style={{
                  backgroundColor: SURFACE, borderRadius: 16, padding: 14, marginBottom: 10,
                  borderWidth: 2, borderColor: selectedTransform === t.target_bf ? ICE : "rgba(30,41,59,0.6)",
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
                          style={{ width: 90, height: 115, borderRadius: 12, backgroundColor: SURFACE }}
                          resizeMode="cover"
                        />
                        {/* Zoom hint overlay */}
                        <View style={{ position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 3 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><MaterialIcons name="zoom-in" size={10} color={FG} /><Text style={{ color: FG, fontSize: 10 }}>View</Text></View>
                        </View>
                      </View>
                    ) : (
                      <View style={{ width: 90, height: 115, borderRadius: 12, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="directions-run" size={28} color="#F59E0B" />
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ color: FG, fontFamily: "SpaceMono_700Bold", fontSize: 22 }}>{t.target_bf}% BF</Text>
                      {selectedTransform === t.target_bf && (
                        <View style={{ backgroundColor: ICE, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: BG, fontSize: 10, fontFamily: "DMSans_700Bold" }}>SELECTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: MUTED, fontSize: 12, lineHeight: 16, marginBottom: 8 }}>
                      {String(t.description)}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                      <View style={{ backgroundColor: ICE_DIM, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><MaterialIcons name="timer" size={11} color={ICE} /><Text style={{ color: ICE, fontSize: 11 }}>{t.estimated_weeks}w</Text></View>
                      </View>
                      <View style={{ backgroundColor: (EFFORT_COLORS[t.effort_level] ?? MUTED) + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: EFFORT_COLORS[t.effort_level] ?? MUTED, fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>
                          {EFFORT_LABELS[t.effort_level] ?? t.effort_level}
                        </Text>
                      </View>
                    </View>
                    {/* Enlarge preview button */}
                    {t.imageUrl && (
                      <TouchableOpacity
                        style={{ backgroundColor: ICE_DIM, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: ICE_BORDER, alignSelf: "flex-start" }}
                        onPress={() => {
                          setPreviewTab("after");
                          setPreviewModal({ visible: true, imageUrl: t.imageUrl, bf: t.target_bf, beforeUrl: uploadedPhotoUrl ?? selectedImage });
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MaterialIcons name="zoom-in" size={12} color={ICE} /><Text style={{ color: ICE, fontSize: 11, fontFamily: "DMSans_700Bold" }}>Enlarge Preview</Text></View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {/* CTA row */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: selectedTransform === t.target_bf ? ICE : ICE_DIM, borderRadius: 12, paddingVertical: 10, alignItems: "center" }}
                    onPress={() => selectTargetAndProceed(t.target_bf)}
                  >
                    <Text style={{ color: selectedTransform === t.target_bf ? BG : ICE, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                      {selectedTransform === t.target_bf ? "Selected — Create Plan" : "Select This Goal"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={{ backgroundColor: SURFACE, borderRadius: 16, paddingVertical: 12, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: ICE_BORDER }}
              onPress={() => { setStep("upload"); setSelectedImage(null); }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><MaterialIcons name="photo-camera" size={14} color={ICE} /><Text style={{ color: ICE, fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>New Scan</Text></View>
            </TouchableOpacity>

            {/* ── PROGRESS TRACKING SECTION ── */}
            {targetTransformation && (
              <View style={{ marginTop: 24 }}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}
                  onPress={() => setShowProgressSection(v => !v)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="trending-up" size={20} color={ICE} />
                    <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 22, letterSpacing: 2 }}>YOUR PROGRESS</Text>
                  </View>
                  <MaterialIcons name={showProgressSection ? "expand-less" : "expand-more"} size={24} color={MUTED} />
                </TouchableOpacity>

                {showProgressSection && (
                  <View style={{ gap: 12 }}>
                    {/* Goal Card */}
                    <View style={{ backgroundColor: SURFACE, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: ICE_BORDER }}>
                      <Text style={{ color: ICE, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>TRANSFORMATION GOAL</Text>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        {targetTransformation.imageUrl && (
                          <Image
                            source={{ uri: targetTransformation.imageUrl }}
                            style={{ width: 80, height: 100, borderRadius: 12, backgroundColor: SURFACE }}
                            resizeMode="cover"
                          />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: FG, fontFamily: "SpaceMono_700Bold", fontSize: 24 }}>{targetTransformation.target_bf}% BF</Text>
                          <Text style={{ color: MUTED, fontSize: 12, lineHeight: 16, marginTop: 4 }}>{targetTransformation.description}</Text>
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                            <View style={{ backgroundColor: ICE_DIM, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                              <Text style={{ color: ICE, fontSize: 11 }}>{targetTransformation.estimated_weeks}w timeline</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      {/* Progress bar */}
                      {scan?.estimatedBodyFat && (
                        <View style={{ marginTop: 14 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                            <Text style={{ color: MUTED, fontSize: 11 }}>Current: {scan.estimatedBodyFat?.toFixed(1)}%</Text>
                            <Text style={{ color: ICE, fontSize: 11 }}>Target: {targetTransformation.target_bf}%</Text>
                          </View>
                          <View style={{ height: 8, backgroundColor: BG, borderRadius: 4, overflow: "hidden" }}>
                            <View style={{
                              height: 8, borderRadius: 4, backgroundColor: ICE,
                              width: `${Math.min(100, Math.max(5, ((scan.estimatedBodyFat - targetTransformation.target_bf) > 0 ? (1 - (scan.estimatedBodyFat - targetTransformation.target_bf) / scan.estimatedBodyFat) * 100 : 100)))}%`,
                            }} />
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Take Progress Photo CTA */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: ICE, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                        onPress={takeProgressPhoto}
                      >
                        <MaterialIcons name="photo-camera" size={18} color={BG} />
                        <Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Take Progress Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: SURFACE, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", borderWidth: 1, borderColor: ICE_BORDER }}
                        onPress={pickProgressPhoto}
                      >
                        <MaterialIcons name="photo-library" size={18} color={ICE} />
                      </TouchableOpacity>
                    </View>

                    {/* ── BEFORE & AFTER COMPARISON ── */}
                    {progressPhotos.length >= 2 && (
                      <View style={{ backgroundColor: SURFACE, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: ICE_BORDER }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <MaterialIcons name="compare" size={18} color={ICE} />
                          <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Before & After</Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {/* BEFORE — first photo */}
                          <View style={{ flex: 1, alignItems: "center" }}>
                            <View style={{ position: "relative", width: "100%" }}>
                              <Image
                                source={{ uri: progressPhotos[0].uri }}
                                style={{ width: "100%", height: 180, borderRadius: 14, backgroundColor: BG }}
                                resizeMode="cover"
                              />
                              <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ color: "#F87171", fontFamily: "DMSans_700Bold", fontSize: 10 }}>BEFORE</Text>
                              </View>
                            </View>
                            <Text style={{ color: MUTED, fontSize: 10, marginTop: 6 }}>
                              {new Date(progressPhotos[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </Text>
                          </View>
                          {/* AFTER — latest photo */}
                          <View style={{ flex: 1, alignItems: "center" }}>
                            <View style={{ position: "relative", width: "100%" }}>
                              <Image
                                source={{ uri: progressPhotos[progressPhotos.length - 1].uri }}
                                style={{ width: "100%", height: 180, borderRadius: 14, backgroundColor: BG }}
                                resizeMode="cover"
                              />
                              <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.75)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ color: "#4ADE80", fontFamily: "DMSans_700Bold", fontSize: 10 }}>LATEST</Text>
                              </View>
                            </View>
                            <Text style={{ color: MUTED, fontSize: 10, marginTop: 6 }}>
                              {new Date(progressPhotos[progressPhotos.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </Text>
                          </View>
                        </View>
                        {/* Days elapsed */}
                        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10, gap: 6 }}>
                          <MaterialIcons name="schedule" size={13} color={MUTED} />
                          <Text style={{ color: MUTED, fontSize: 11 }}>
                            {Math.max(1, Math.round((new Date(progressPhotos[progressPhotos.length - 1].date).getTime() - new Date(progressPhotos[0].date).getTime()) / (1000 * 60 * 60 * 24)))} days of progress
                          </Text>
                        </View>
                        {/* Full-screen slider button */}
                        <TouchableOpacity
                          onPress={() => {
                            sliderX.value = Dimensions.get("window").width / 2;
                            setShowSliderComparison(true);
                          }}
                          style={{
                            marginTop: 12, backgroundColor: ICE_DIM, borderRadius: 12,
                            paddingVertical: 10, alignItems: "center",
                            borderWidth: 1, borderColor: ICE_BORDER,
                            flexDirection: "row", justifyContent: "center", gap: 6,
                          }}
                        >
                          <MaterialIcons name="fullscreen" size={18} color={ICE} />
                          <Text style={{ color: ICE, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Full-Screen Slider Compare</Text>
                        </TouchableOpacity>
                        {/* Share before/after */}
                        <TouchableOpacity
                          onPress={() => {
                            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowShareOverlay(true);
                          }}
                          style={{
                            marginTop: 8, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12,
                            paddingVertical: 10, alignItems: "center",
                            borderWidth: 1, borderColor: "rgba(245,158,11,0.25)",
                            flexDirection: "row", justifyContent: "center", gap: 6,
                          }}
                        >
                          <MaterialIcons name="share" size={18} color="#F59E0B" />
                          <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 13 }}>Share Progress</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Progress Photo Timeline */}
                    {progressPhotos.length > 0 && (
                      <View style={{ backgroundColor: SURFACE, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Progress Timeline</Text>
                          <Text style={{ color: MUTED, fontSize: 12 }}>{progressPhotos.length} photo{progressPhotos.length !== 1 ? "s" : ""}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                          {progressPhotos.slice().reverse().map((photo, i) => (
                            <View key={i} style={{ marginHorizontal: 4, alignItems: "center" }}>
                              <Image
                                source={{ uri: photo.uri }}
                                style={{ width: 80, height: 106, borderRadius: 12, backgroundColor: BG }}
                                resizeMode="cover"
                              />
                              <Text style={{ color: MUTED, fontSize: 9, marginTop: 4 }}>
                                {new Date(photo.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                {/* Premium Feature Teasers */}
                <View style={{ gap: 8, marginTop: 10 }}>
                  <PremiumFeatureBanner
                    feature="body_scan"
                    title="AI Body Transformation Tracking"
                    description="Unlock AI-powered body composition analysis, progress photo reminders, and before/after comparisons to visualise your transformation."
                    icon="body"
                    accentColor="#22D3EE"
                    requiredTier="basic"
                  />
                  <PremiumFeatureTeaser
                    feature="progress_photos"
                    text="Set up daily or weekly photo reminders to track your progress"
                    requiredTier="basic"
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── STEP: Goal Setup ── */}
        {step === "goal_setup" && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Selected Goal Banner */}
            <View style={{ backgroundColor: ICE_DIM, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: ICE_BORDER, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="gps-fixed" size={28} color={ICE} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: ICE, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1 }}>TARGET SET</Text>
                <Text style={{ color: FG, fontFamily: "SpaceMono_700Bold", fontSize: 20 }}>{selectedTransform}% Body Fat</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>Now let's customize your plan</Text>
              </View>
            </View>

            {/* Workout Style */}
            <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 20, letterSpacing: 2, marginBottom: 4 }}>WORKOUT STYLE</Text>
            <Text style={{ color: MUTED, fontSize: 12, marginBottom: 12 }}>Where do you prefer to work out?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {WORKOUT_STYLES.map(w => (
                <TouchableOpacity
                  key={w.key}
                  style={{
                    width: "47%", backgroundColor: workoutStyle === w.key ? ICE_DIM : SURFACE,
                    borderRadius: 14, padding: 14, borderWidth: 2,
                    borderColor: workoutStyle === w.key ? ICE : "rgba(30,41,59,0.6)",
                    alignItems: "center", gap: 4,
                  }}
                  onPress={() => setWorkoutStyle(w.key)}
                >
                  <MaterialIcons name={w.iconName as any} size={24} color={workoutStyle === w.key ? FG : ICE} />
                  <Text style={{ color: workoutStyle === w.key ? FG : ICE, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{w.label}</Text>
                  <Text style={{ color: MUTED, fontSize: 11 }}>{w.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Days per week */}
            <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", marginBottom: 8, letterSpacing: 1 }}>DAYS PER WEEK</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[3, 4, 5, 6].map(d => (
                <TouchableOpacity
                  key={d}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? ICE : SURFACE, borderWidth: 1, borderColor: daysPerWeek === d ? ICE : "rgba(30,41,59,0.6)" }}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={{ color: daysPerWeek === d ? BG : MUTED, fontFamily: "SpaceMono_700Bold", fontSize: 16 }}>{d}</Text>
                  <Text style={{ color: daysPerWeek === d ? BG : MUTED, fontSize: 10 }}>days</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dietary Preference */}
            <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 20, letterSpacing: 2, marginBottom: 4 }}>DIETARY PREFERENCE</Text>
            <Text style={{ color: MUTED, fontSize: 12, marginBottom: 12 }}>Your meal plan will respect your dietary choices.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {DIETARY_PREFS.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={{
                    width: "30%", backgroundColor: dietaryPref === d.key ? ICE_DIM : SURFACE,
                    borderRadius: 12, padding: 12, borderWidth: 2,
                    borderColor: dietaryPref === d.key ? ICE : "rgba(30,41,59,0.6)",
                    alignItems: "center", gap: 4,
                  }}
                  onPress={() => setDietaryPref(d.key)}
                >
                  <MaterialIcons name={d.iconName as any} size={20} color={dietaryPref === d.key ? FG : ICE} />
                  <Text style={{ color: dietaryPref === d.key ? FG : MUTED, fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate CTA */}
            <TouchableOpacity
              style={{ backgroundColor: ICE, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12 }}
              onPress={generatePlans}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><MaterialIcons name="rocket-launch" size={16} color={BG} /><Text style={{ color: BG, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Generate My Workout & Meal Plans</Text></View>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ borderRadius: 16, paddingVertical: 12, alignItems: "center" }}
              onPress={() => setStep("results")}
            >
              <Text style={{ color: MUTED, fontSize: 14 }}>← Back to results</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: Generating ── */}
        {step === "generating" && (
          <View style={{ paddingHorizontal: 20, alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: ICE_DIM, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <ActivityIndicator size="large" color={ICE} />
            </View>
            <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 24, letterSpacing: 2, marginBottom: 8 }}>CREATING YOUR PLANS</Text>
            <Text style={{ color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              AI is generating your personalized workout and meal plans based on your goals...
            </Text>
            <View style={{ marginTop: 32, gap: 10, width: "100%" }}>
              {[
                "Building your 7-day workout schedule...",
                "Calculating your calorie and macro targets...",
                "Creating personalized meal plan...",
              ].map((s, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: SURFACE, borderRadius: 12, padding: 12 }}>
                  <ActivityIndicator size="small" color={ICE} />
                  <Text style={{ color: MUTED, fontSize: 13 }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ReAnimated.ScrollView>

      {/* ── SHARE PROGRESS OVERLAY ── */}
      {showShareOverlay && progressPhotos.length >= 2 && (
        <Modal visible={showShareOverlay} animationType="slide" transparent>
          <ShareProgressOverlay
            beforeUri={progressPhotos[0].uri}
            afterUri={progressPhotos[progressPhotos.length - 1].uri}
            beforeDate={progressPhotos[0].date}
            afterDate={progressPhotos[progressPhotos.length - 1].date}
            bodyFatStart={targetTransformation?.current_bf}
            bodyFatCurrent={targetTransformation?.current_bf}
            bodyFatTarget={targetTransformation?.target_bf}
            daysElapsed={Math.max(1, Math.round((new Date(progressPhotos[progressPhotos.length - 1].date).getTime() - new Date(progressPhotos[0].date).getTime()) / (1000 * 60 * 60 * 24)))}
            onClose={() => setShowShareOverlay(false)}
          />
        </Modal>
      )}

      {/* ── FULL-SCREEN BEFORE/AFTER SLIDER ── */}
      {showSliderComparison && progressPhotos.length >= 2 && (
        <Modal visible={showSliderComparison} animationType="fade" transparent={false}>
          <BeforeAfterSlider
            beforeUri={progressPhotos[0].uri}
            afterUri={progressPhotos[progressPhotos.length - 1].uri}
            beforeDate={progressPhotos[0].date}
            afterDate={progressPhotos[progressPhotos.length - 1].date}
            onClose={() => setShowSliderComparison(false)}
          />
        </Modal>
      )}
    </View>
  );
}

/* ── Before/After Slider Component ── */
function BeforeAfterSlider({
  beforeUri, afterUri, beforeDate, afterDate, onClose,
}: {
  beforeUri: string; afterUri: string;
  beforeDate: string; afterDate: string;
  onClose: () => void;
}) {
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
  const sliderPos = useSharedValue(SCREEN_W / 2);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(20, Math.min(SCREEN_W - 20, gestureState.moveX));
        sliderPos.value = newX;
      },
    })
  ).current;

  const clipStyle = useAnimatedStyle(() => ({
    width: sliderPos.value,
    overflow: "hidden" as const,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    left: sliderPos.value - 20,
  }));

  const lineStyle = useAnimatedStyle(() => ({
    left: sliderPos.value - 1,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* After image (full width, underneath) */}
      <Image
        source={{ uri: afterUri }}
        style={{ position: "absolute", width: SCREEN_W, height: SCREEN_H }}
        resizeMode="cover"
      />

      {/* Before image (clipped by slider) */}
      <ReAnimated.View style={[{ position: "absolute", height: SCREEN_H }, clipStyle]}>
        <Image
          source={{ uri: beforeUri }}
          style={{ width: SCREEN_W, height: SCREEN_H }}
          resizeMode="cover"
        />
      </ReAnimated.View>

      {/* Slider line */}
      <ReAnimated.View
        style={[{
          position: "absolute", top: 0, width: 2, height: SCREEN_H,
          backgroundColor: "#fff",
        }, lineStyle]}
      />

      {/* Slider handle (draggable area) */}
      <ReAnimated.View
        {...panResponder.panHandlers}
        style={[{
          position: "absolute", top: SCREEN_H / 2 - 30, width: 40, height: 60,
          alignItems: "center", justifyContent: "center",
        }, handleStyle]}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)",
          alignItems: "center", justifyContent: "center",
          shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 6,
          elevation: 8,
        }}>
          <MaterialIcons name="swap-horiz" size={22} color="#000" />
        </View>
      </ReAnimated.View>

      {/* Labels */}
      <View style={{ position: "absolute", top: 60, left: 16 }}>
        <View style={{ backgroundColor: "rgba(248,113,113,0.9)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 12 }}>BEFORE</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
            {new Date(beforeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </View>
      </View>
      <View style={{ position: "absolute", top: 60, right: 16 }}>
        <View style={{ backgroundColor: "rgba(74,222,128,0.9)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 12 }}>LATEST</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
            {new Date(afterDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </View>
      </View>

      {/* Instruction */}
      <View style={{ position: "absolute", bottom: 120, left: 0, right: 0, alignItems: "center" }}>
        <View style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontFamily: "DMSans_500Medium", fontSize: 13 }}>
            Drag the slider to compare
          </Text>
        </View>
      </View>

      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        style={{
          position: "absolute", top: 56, right: 16,
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.7)",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <MaterialIcons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Days elapsed */}
      <View style={{ position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontFamily: "DMSans_400Regular", fontSize: 12 }}>
          {Math.max(1, Math.round((new Date(afterDate).getTime() - new Date(beforeDate).getTime()) / (1000 * 60 * 60 * 24)))} days of progress
        </Text>
      </View>
    </View>
  );
}

/* ── Share Progress Overlay ── */
function ShareProgressOverlay({
  beforeUri, afterUri, beforeDate, afterDate,
  bodyFatStart, bodyFatCurrent, bodyFatTarget, daysElapsed, onClose,
}: {
  beforeUri: string; afterUri: string;
  beforeDate: string; afterDate: string;
  bodyFatStart?: number; bodyFatCurrent?: number; bodyFatTarget?: number;
  daysElapsed: number; onClose: () => void;
}) {
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [statsOverlay, setStatsOverlay] = useState(true);
  const [sharing, setSharing] = useState(false);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handleShare = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSharing(true);
    try {
      // Build a text-based share message with stats
      let msg = `My PeakPulse Transformation\n\n`;
      msg += `Before: ${fmtDate(beforeDate)}\n`;
      msg += `After: ${fmtDate(afterDate)}\n`;
      msg += `${daysElapsed} days of progress\n`;
      if (statsOverlay && bodyFatStart && bodyFatCurrent) {
        msg += `\nBody Fat: ${bodyFatStart}% \u2192 ${bodyFatCurrent}%`;
        if (bodyFatTarget) msg += ` (Target: ${bodyFatTarget}%)`;
        msg += `\n`;
      }
      if (watermarkEnabled) {
        msg += `\n#PeakPulse #FitnessTransformation #BodyTransformation`;
      }
      await Share.share({ message: msg });
    } catch {}
    setSharing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 }}>
        <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 18 }}>Share Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        {/* Preview card */}
        <View style={{ backgroundColor: "#141A22", borderRadius: 24, overflow: "hidden", borderWidth: 2, borderColor: "rgba(245,158,11,0.25)" }}>
          {/* Photos side by side */}
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1, position: "relative" }}>
              <Image source={{ uri: beforeUri }} style={{ width: "100%", height: 240 }} resizeMode="cover" />
              <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(248,113,113,0.9)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 10 }}>BEFORE</Text>
              </View>
              <View style={{ position: "absolute", bottom: 8, left: 10, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 9 }}>{fmtDate(beforeDate)}</Text>
              </View>
            </View>
            <View style={{ width: 2, backgroundColor: "#F59E0B" }} />
            <View style={{ flex: 1, position: "relative" }}>
              <Image source={{ uri: afterUri }} style={{ width: "100%", height: 240 }} resizeMode="cover" />
              <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(74,222,128,0.9)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 10 }}>AFTER</Text>
              </View>
              <View style={{ position: "absolute", bottom: 8, left: 10, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 9 }}>{fmtDate(afterDate)}</Text>
              </View>
            </View>
          </View>

          {/* Stats overlay */}
          {statsOverlay && (
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <MaterialIcons name="schedule" size={14} color="#F59E0B" />
                <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 14 }}>{daysElapsed} Days of Progress</Text>
              </View>
              {bodyFatStart && bodyFatCurrent ? (
                <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 4 }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#64748B", fontSize: 10, fontFamily: "DMSans_500Medium" }}>START</Text>
                    <Text style={{ color: "#F87171", fontFamily: "SpaceMono_700Bold", fontSize: 20 }}>{bodyFatStart}%</Text>
                  </View>
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="arrow-forward" size={18} color="#64748B" />
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#64748B", fontSize: 10, fontFamily: "DMSans_500Medium" }}>CURRENT</Text>
                    <Text style={{ color: "#22D3EE", fontFamily: "SpaceMono_700Bold", fontSize: 20 }}>{bodyFatCurrent}%</Text>
                  </View>
                  {bodyFatTarget ? (
                    <>
                      <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="arrow-forward" size={18} color="#64748B" />
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <Text style={{ color: "#64748B", fontSize: 10, fontFamily: "DMSans_500Medium" }}>TARGET</Text>
                        <Text style={{ color: "#F59E0B", fontFamily: "SpaceMono_700Bold", fontSize: 20 }}>{bodyFatTarget}%</Text>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}

          {/* Watermark */}
          {watermarkEnabled && (
            <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(245,158,11,0.1)", alignItems: "center" }}>
              <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 3 }}>PEAKPULSE AI</Text>
              <Text style={{ color: "#64748B", fontSize: 9, marginTop: 2 }}>Precision Performance</Text>
            </View>
          )}
        </View>

        {/* Options */}
        <View style={{ marginTop: 20, gap: 12 }}>
          <Text style={{ color: "#64748B", fontFamily: "DMSans_600SemiBold", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>CUSTOMIZE</Text>

          {/* Watermark toggle */}
          <TouchableOpacity
            onPress={() => setWatermarkEnabled(!watermarkEnabled)}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              backgroundColor: "#141A22", borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: "rgba(30,41,59,0.6)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <MaterialIcons name="branding-watermark" size={20} color={watermarkEnabled ? "#F59E0B" : "#64748B"} />
              <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>PeakPulse Watermark</Text>
            </View>
            <View style={{
              width: 44, height: 24, borderRadius: 12,
              backgroundColor: watermarkEnabled ? "#F59E0B" : "rgba(255,255,255,0.1)",
              justifyContent: "center", paddingHorizontal: 2,
            }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff",
                alignSelf: watermarkEnabled ? "flex-end" : "flex-start",
              }} />
            </View>
          </TouchableOpacity>

          {/* Stats overlay toggle */}
          <TouchableOpacity
            onPress={() => setStatsOverlay(!statsOverlay)}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              backgroundColor: "#141A22", borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: "rgba(30,41,59,0.6)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <MaterialIcons name="analytics" size={20} color={statsOverlay ? "#22D3EE" : "#64748B"} />
              <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>Progress Stats</Text>
            </View>
            <View style={{
              width: 44, height: 24, borderRadius: 12,
              backgroundColor: statsOverlay ? "#22D3EE" : "rgba(255,255,255,0.1)",
              justifyContent: "center", paddingHorizontal: 2,
            }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff",
                alignSelf: statsOverlay ? "flex-end" : "flex-start",
              }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Share button */}
        <TouchableOpacity
          onPress={handleShare}
          disabled={sharing}
          style={{
            marginTop: 24, backgroundColor: "#F59E0B", borderRadius: 16,
            paddingVertical: 16, alignItems: "center",
            flexDirection: "row", justifyContent: "center", gap: 8,
            opacity: sharing ? 0.6 : 1,
          }}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#0A0E14" />
          ) : (
            <>
              <MaterialIcons name="share" size={20} color="#0A0E14" />
              <Text style={{ color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 16 }}>Share Transformation</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Copy text button */}
        <TouchableOpacity
          onPress={async () => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            let msg = `My PeakPulse Transformation - ${daysElapsed} days\n`;
            if (bodyFatStart && bodyFatCurrent) msg += `Body Fat: ${bodyFatStart}% \u2192 ${bodyFatCurrent}%\n`;
            msg += `#PeakPulse #FitnessTransformation`;
            try {
              const Clipboard = await import("expo-clipboard");
              await Clipboard.setStringAsync(msg);
              Alert.alert("Copied!", "Progress text copied to clipboard.");
            } catch {
              Alert.alert("Info", "Use the Share button to share your progress.");
            }
          }}
          style={{
            marginTop: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14,
            paddingVertical: 12, alignItems: "center",
            flexDirection: "row", justifyContent: "center", gap: 6,
            borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <MaterialIcons name="content-copy" size={16} color="#64748B" />
          <Text style={{ color: "#64748B", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Copy Text to Clipboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
