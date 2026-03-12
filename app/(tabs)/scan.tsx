import React, { useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";

const EFFORT_COLORS: Record<string, string> = {
  moderate: "#22C55E",
  high: "#F97316",
  very_high: "#EF4444",
  extreme: "#A855F7",
};

const EFFORT_LABELS: Record<string, string> = {
  moderate: "Moderate",
  high: "High",
  very_high: "Very High",
  extreme: "Extreme",
};

export default function ScanScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTransform, setSelectedTransform] = useState<number | null>(null);
  const [step, setStep] = useState<"upload" | "analyzing" | "results">("upload");

  const { data: latestScan, refetch: refetchScan } = trpc.bodyScan.getLatest.useQuery(undefined, { enabled: isAuthenticated });

  const uploadPhoto = trpc.upload.photo.useMutation();
  const analyzeScan = trpc.bodyScan.analyze.useMutation({
    onSuccess: () => {
      refetchScan();
      setStep("results");
    },
    onError: (e) => {
      Alert.alert("Analysis Failed", e.message);
      setStep("upload");
    },
  });

  const updateProfile = trpc.profile.upsert.useMutation();

  async function pickImage(useCamera: boolean) {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed to take photos.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [3, 4] });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [3, 4] });
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
      await analyzeScan.mutateAsync({ photoUrl: url });
    } catch (e: any) {
      Alert.alert("Error", e.message);
      setStep("upload");
    }
  }

  async function selectTargetBF(bf: number) {
    setSelectedTransform(bf);
    await updateProfile.mutateAsync({ targetBodyFat: bf });
    Alert.alert(
      "Goal Set! 🎯",
      `Your target body fat is now ${bf}%. Head to Plans to generate a personalized workout and meal plan.`,
      [
        { text: "Generate Plans", onPress: () => router.push("/plans" as any) },
        { text: "OK" },
      ]
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">Please log in to use AI Body Scan</Text>
      </ScreenContainer>
    );
  }

  const scan = latestScan ?? analyzeScan.data;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800" }}>AI Body Scan</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 2 }}>Analyze your physique and visualize your transformation</Text>
        </View>

        {/* Upload Step */}
        {step === "upload" && (
          <View style={{ paddingHorizontal: 20 }}>
            {selectedImage ? (
              <View style={{ marginBottom: 20 }}>
                <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 360, borderRadius: 20, backgroundColor: "#13131F" }} resizeMode="cover" />
                <TouchableOpacity
                  style={{ position: "absolute", top: 12, right: 12, backgroundColor: "#EF444490", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: "#13131F", borderRadius: 20, padding: 32, alignItems: "center", marginBottom: 20, borderWidth: 2, borderColor: "#7C3AED30", borderStyle: "dashed" }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📸</Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginBottom: 6 }}>Upload a Full-Body Photo</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", lineHeight: 18 }}>
                  For best results, wear fitted clothing and stand in good lighting facing the camera
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#1F2937", gap: 6 }}
                onPress={() => pickImage(true)}
              >
                <Text style={{ fontSize: 22 }}>📷</Text>
                <Text style={{ color: "#E5E7EB", fontWeight: "600", fontSize: 13 }}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#1F2937", gap: 6 }}
                onPress={() => pickImage(false)}
              >
                <Text style={{ fontSize: 22 }}>🖼️</Text>
                <Text style={{ color: "#E5E7EB", fontWeight: "600", fontSize: 13 }}>Choose Photo</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <TouchableOpacity
                style={{ backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}
                onPress={startAnalysis}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>✨ Analyze My Physique</Text>
              </TouchableOpacity>
            )}

            {/* Previous Scan */}
            {scan && step === "upload" && (
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: "#13131F", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#7C3AED30" }}
                onPress={() => setStep("results")}
              >
                <Text style={{ color: "#A78BFA", fontWeight: "700", fontSize: 12, marginBottom: 8 }}>LAST SCAN RESULTS</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 28 }}>{scan.estimatedBodyFat?.toFixed(1)}%</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Body Fat</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Range: {scan.confidenceLow?.toFixed(0)}-{scan.confidenceHigh?.toFixed(0)}%</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}>Muscle: {scan.muscleMassEstimate}</Text>
                  </View>
                </View>
                <Text style={{ color: "#7C3AED", fontSize: 12, marginTop: 8 }}>Tap to view transformations →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Analyzing Step */}
        {step === "analyzing" && (
          <View style={{ paddingHorizontal: 20, alignItems: "center", paddingTop: 60 }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: "#7C3AED20", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <ActivityIndicator size="large" color="#7C3AED" />
            </View>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 20, marginBottom: 8 }}>Analyzing Your Physique</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
              Our AI is analyzing your body composition and generating transformation previews...
            </Text>
            <View style={{ marginTop: 32, gap: 10, width: "100%" }}>
              {["Estimating body fat percentage...", "Analyzing muscle mass distribution...", "Generating transformation visualizations..."].map((step, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#13131F", borderRadius: 12, padding: 12 }}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={{ color: "#9CA3AF", fontSize: 13 }}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Results Step */}
        {step === "results" && scan && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Body Fat Result */}
            <View style={{ backgroundColor: "#13131F", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#7C3AED30" }}>
              <Text style={{ color: "#A78BFA", fontWeight: "700", fontSize: 12, marginBottom: 8 }}>BODY COMPOSITION ANALYSIS</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 40 }}>{scan.estimatedBodyFat?.toFixed(1)}%</Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Estimated Body Fat</Text>
                  <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>Range: {scan.confidenceLow?.toFixed(0)}-{scan.confidenceHigh?.toFixed(0)}%</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <View style={{ backgroundColor: "#7C3AED20", borderRadius: 16, padding: 16 }}>
                    <Text style={{ fontSize: 32 }}>💪</Text>
                  </View>
                  <Text style={{ color: "#A78BFA", fontSize: 11, marginTop: 6 }}>Muscle: {scan.muscleMassEstimate}</Text>
                </View>
              </View>
              {scan.analysisNotes && (
                <View style={{ backgroundColor: "#0D0D18", borderRadius: 12, padding: 12, marginTop: 12 }}>
                  <Text style={{ color: "#E5E7EB", fontSize: 13, lineHeight: 18 }}>{String(scan.analysisNotes)}</Text>
                </View>
              )}
            </View>

            {/* Transformation Previews */}
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginBottom: 4 }}>Transformation Previews</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 12 }}>Tap a target to set it as your goal</Text>

            {scan.transformations?.map((t: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: selectedTransform === t.target_bf ? "#7C3AED" : "#1F2937" }}
                onPress={() => selectTargetBF(t.target_bf)}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {t.imageUrl ? (
                    <Image source={{ uri: t.imageUrl }} style={{ width: 80, height: 100, borderRadius: 12, backgroundColor: "#0D0D18" }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: 80, height: 100, borderRadius: 12, backgroundColor: "#0D0D18", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 28 }}>🏃</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 22 }}>{t.target_bf}% BF</Text>
                      {selectedTransform === t.target_bf && (
                        <View style={{ backgroundColor: "#7C3AED", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>✓ GOAL</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: "#9CA3AF", fontSize: 12, lineHeight: 16, marginBottom: 8 }}>{String(t.description)}</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ backgroundColor: "#1F2937", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: "#9CA3AF", fontSize: 11 }}>⏱ {t.estimated_weeks}w</Text>
                      </View>
                      <View style={{ backgroundColor: EFFORT_COLORS[t.effort_level] + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: EFFORT_COLORS[t.effort_level], fontSize: 11, fontWeight: "600" }}>
                          {EFFORT_LABELS[t.effort_level] ?? t.effort_level}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={{ backgroundColor: "#13131F", borderRadius: 16, paddingVertical: 12, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: "#1F2937" }}
              onPress={() => { setStep("upload"); setSelectedImage(null); }}
            >
              <Text style={{ color: "#9CA3AF", fontWeight: "600", fontSize: 14 }}>📷 New Scan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
