import React, { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image,
  TextInput, Platform, KeyboardAvoidingView, StyleSheet, Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { ScreenErrorBoundary } from "@/components/error-boundary";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Step = "upload" | "metrics" | "analyzing" | "results";

interface AnalysisResult {
  summary: string;
  bodyFatEstimate?: number;
  details: string[];
  improvements: string[];
  recommendation: string;
  progressRating?: string;
}

export default function ProgressCheckinScreen() {
  const SF = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [step, setStep] = useState<Step>("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentWeight, setCurrentWeight] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Onboarding baseline data
  const [baselinePhoto, setBaselinePhoto] = useState<string | null>(null);
  const [baselineBodyFat, setBaselineBodyFat] = useState<number | null>(null);
  const [targetBodyFat, setTargetBodyFat] = useState<number | null>(null);
  const [targetImageUrl, setTargetImageUrl] = useState<string | null>(null);
  const [previousWeight, setPreviousWeight] = useState<string | null>(null);

  const uploadPhoto = trpc.upload.photo.useMutation();
  const analyzeProgress = trpc.progress.analyzeProgress.useMutation();
  const checkinSave = trpc.progressCheckin.save.useMutation();
  const { data: serverGoal } = trpc.goals.active.useQuery(undefined, { enabled: isAuthenticated });

  // Load baseline data on mount
  useEffect(() => {
    (async () => {
      try {
        // Server-first: prefer server goal data for authenticated users
        if (serverGoal) {
          setTargetBodyFat(serverGoal.targetBodyFat); setTargetImageUrl(serverGoal.imageUrl || "");
          setBaselinePhoto(serverGoal.originalPhotoUrl || null);
          setBaselineBodyFat(serverGoal.originalBodyFat || null);
          setTargetBodyFat(serverGoal.targetBodyFat);
        } else {
          const targetRaw = await AsyncStorage.getItem("target_transformation");
          if (targetRaw) {
          const target = JSON.parse(targetRaw);
          setTargetBodyFat(target.target_bf);
          setTargetImageUrl(target.imageUrl);
          }
        }
        const scanHistoryRaw = await AsyncStorage.getItem("body_scan_history");
        if (scanHistoryRaw) {
          const scans = JSON.parse(scanHistoryRaw);
          if (scans.length > 0) {
            setBaselinePhoto(scans[0].photoUrl || null);
            setBaselineBodyFat(scans[0].estimatedBodyFat || null);
          }
        }
        if (!scanHistoryRaw) {
          const guestRaw = await AsyncStorage.getItem("guest_scan");
          if (guestRaw) {
            const g = JSON.parse(guestRaw);
            setBaselinePhoto(g.uploadedPhotoUrl || null);
            setBaselineBodyFat(g.estimated_body_fat || null);
          }
        }
        const prevW = await AsyncStorage.getItem("last_progress_weight");
        if (prevW) setPreviousWeight(prevW);
      } catch {}
    })();
  }, []);

  async function pickImage(useCamera: boolean) {
    const permResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert("Permission needed", "Please allow access to continue.");
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [3, 4] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [3, 4], mediaTypes: "images" });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setStep("metrics");
    }
  }

  async function submitAnalysis() {
    if (!selectedImage) return;
    setStep("analyzing");
    try {
      // Upload current progress photo
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

      // Call enhanced analyzeProgress
      const result = await analyzeProgress.mutateAsync({
        currentPhotoUrl: url,
        baselinePhotoUrl: baselinePhoto || undefined,
        weightKg: currentWeight ? parseFloat(currentWeight) : undefined,
        baselineBodyFat: baselineBodyFat || undefined,
        targetBodyFat: targetBodyFat || undefined,
      });

      setAnalysisResult(result as any);

      // Save progress data
      const now = new Date().toISOString();
      await AsyncStorage.setItem("last_progress_photo_date", now);
      if (currentWeight) await AsyncStorage.setItem("last_progress_weight", currentWeight);

      // Append to progress history
      const historyRaw = await AsyncStorage.getItem("progress_checkin_history");
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      history.push({
        date: now,
        photoUrl: url,
        weightKg: currentWeight ? parseFloat(currentWeight) : null,
        bodyFatEstimate: (result as any).bodyFatEstimate || null,
      });
      await AsyncStorage.setItem("progress_checkin_history", JSON.stringify(history));

      // Persist check-in server-side for data durability
      if (isAuthenticated) {
        try {
          await checkinSave.mutateAsync({
            photoUrl: url,
            weightKg: currentWeight ? parseFloat(currentWeight) : undefined,
            bodyFatEstimate: (result as any).bodyFatEstimate ?? undefined,
            progressRating: (result as any).progressRating ?? undefined,
            summary: (result as any).summary ?? undefined,
            analysisJson: JSON.stringify(result),
          });
        } catch { /* best-effort; AsyncStorage is the fallback */ }
      }

      setStep("results");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Analysis failed. Please try again.");
      setStep("metrics");
    }
  }

  // ────── RENDER ──────

  if (step === "upload") {
    return (
      <ScreenErrorBoundary screenName="progress-checkin">
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Baseline info card */}
          {baselinePhoto && targetImageUrl && (
            <View style={{ flexDirection: "row", backgroundColor: SF.surface, borderRadius: 16, padding: 12, marginBottom: 24, borderWidth: 1, borderColor: SF.border }}>
              <Image source={{ uri: baselinePhoto }} style={{ width: 56, height: 72, borderRadius: 10 }} resizeMode="cover" />
              <View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: SF.muted }}>Your journey</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: SF.text, marginTop: 2 }}>
                  {baselineBodyFat ? `${baselineBodyFat}%` : "Start"} \u{2192} {targetBodyFat ? `${targetBodyFat}%` : "Goal"} body fat
                </Text>
                {previousWeight && (
                  <Text style={{ fontSize: 11, color: SF.muted, marginTop: 2 }}>Last weigh-in: {previousWeight} kg</Text>
                )}
              </View>
              <Image source={{ uri: targetImageUrl }} style={{ width: 56, height: 72, borderRadius: 10, borderWidth: 1, borderColor: "rgba(16,185,129,0.3)" }} resizeMode="cover" />
            </View>
          )}

          <Text style={{ fontSize: 22, fontWeight: "800", color: SF.text, textAlign: "center", marginBottom: 8 }}>
            Take a Progress Photo
          </Text>
          <Text style={{ fontSize: 14, color: SF.muted, textAlign: "center", marginBottom: 32, lineHeight: 20 }}>
            Stand in the same position as your initial scan for the most accurate comparison.
          </Text>

          {/* Camera option */}
          <TouchableOpacity
            onPress={() => pickImage(true)}
            style={{ backgroundColor: "#10B981", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", marginBottom: 12 }}
            activeOpacity={0.85}
          >
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="photo-camera" size={24} color="#fff" />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Take Photo Now</Text>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Use your camera for a new shot</Text>
            </View>
          </TouchableOpacity>

          {/* Gallery option */}
          <TouchableOpacity
            onPress={() => pickImage(false)}
            style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: SF.border }}
            activeOpacity={0.85}
          >
            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: SF.surface, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="photo-library" size={24} color={SF.text} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: SF.text }}>Choose from Gallery</Text>
              <Text style={{ fontSize: 12, color: SF.muted }}>Select an existing photo</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
      </ScreenErrorBoundary>
    );
  }

  if (step === "metrics") {
    return (
      <ScreenContainer>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {/* Photo preview */}
            {selectedImage && (
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Image
                  source={{ uri: selectedImage }}
                  style={{ width: SCREEN_WIDTH - 80, height: (SCREEN_WIDTH - 80) * 1.33, borderRadius: 16 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => { setSelectedImage(null); setStep("upload"); }}
                  style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, padding: 6 }}
                >
                  <MaterialIcons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <Text style={{ fontSize: 18, fontWeight: "700", color: SF.text, marginBottom: 4 }}>
              Enter Your Metrics
            </Text>
            <Text style={{ fontSize: 13, color: SF.muted, marginBottom: 20 }}>
              Adding your weight helps AI provide more accurate progress insights.
            </Text>

            {/* Weight input */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: SF.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Current Weight (kg)
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="monitor-weight" size={22} color="#10B981" />
                <TextInput
                  style={{
                    flex: 1, marginLeft: 12, fontSize: 24, fontWeight: "700", color: SF.text,
                    padding: 0,
                  }}
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                  keyboardType="decimal-pad"
                  placeholder={previousWeight || "e.g. 75.5"}
                  placeholderTextColor={SF.muted}
                />
                <Text style={{ fontSize: 16, color: SF.muted, fontWeight: "600" }}>kg</Text>
              </View>
            </View>

            {/* Optional: note about comparison */}
            {baselineBodyFat && targetBodyFat && (
              <View style={{ backgroundColor: "rgba(139,92,246,0.08)", borderRadius: 12, padding: 12, marginBottom: 20, flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="insights" size={18} color="#8B5CF6" />
                <Text style={{ fontSize: 12, color: "#8B5CF6", marginLeft: 8, flex: 1, fontWeight: "500" }}>
                  AI will compare against your {baselineBodyFat}% baseline and {targetBodyFat}% goal
                </Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={submitAnalysis}
              style={{ backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="auto-awesome" size={20} color="#fff" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Analyse My Progress</Text>
            </TouchableOpacity>

            {/* Skip weight */}
            <TouchableOpacity onPress={submitAnalysis} style={{ alignItems: "center", marginTop: 12 }}>
              <Text style={{ fontSize: 13, color: SF.muted }}>Skip weight and analyse photo only</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  if (step === "analyzing") {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={{ fontSize: 18, fontWeight: "700", color: SF.text, marginTop: 20 }}>Analysing Your Progress</Text>
          <Text style={{ fontSize: 13, color: SF.muted, marginTop: 8, textAlign: "center" }}>
            AI is comparing your photo against your baseline and goal...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // ────── RESULTS ──────
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Summary card */}
        {analysisResult && (
          <>
            <View style={{ backgroundColor: SF.surface, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: SF.border, marginBottom: 20 }}>
              <View style={{ height: 4, backgroundColor: "#10B981" }} />
              <View style={{ padding: 20 }}>
                {/* Rating badge */}
                {analysisResult.progressRating && (
                  <View style={{ alignSelf: "center", backgroundColor: "rgba(16,185,129,0.12)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 14 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#10B981" }}>{analysisResult.progressRating}</Text>
                  </View>
                )}

                <Text style={{ fontSize: 16, fontWeight: "700", color: SF.text, textAlign: "center", marginBottom: 12 }}>
                  {analysisResult.summary}
                </Text>

                {/* BF estimate + weight */}
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginBottom: 16 }}>
                  {analysisResult.bodyFatEstimate && (
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 24, fontWeight: "800", color: "#10B981" }}>{analysisResult.bodyFatEstimate}%</Text>
                      <Text style={{ fontSize: 11, color: SF.muted }}>Est. Body Fat</Text>
                    </View>
                  )}
                  {currentWeight && (
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 24, fontWeight: "800", color: SF.text }}>{currentWeight}</Text>
                      <Text style={{ fontSize: 11, color: SF.muted }}>Weight (kg)</Text>
                    </View>
                  )}
                  {targetBodyFat && (
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 24, fontWeight: "800", color: "#8B5CF6" }}>{targetBodyFat}%</Text>
                      <Text style={{ fontSize: 11, color: SF.muted }}>Target BF</Text>
                    </View>
                  )}
                </View>

                {/* Progress bar toward goal */}
                {baselineBodyFat && targetBodyFat && analysisResult.bodyFatEstimate && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, color: SF.muted }}>Start: {baselineBodyFat}%</Text>
                      <Text style={{ fontSize: 10, color: "#10B981" }}>Goal: {targetBodyFat}%</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: SF.surface, borderRadius: 4, overflow: "hidden" }}>
                      <View style={{
                        height: "100%",
                        borderRadius: 4,
                        backgroundColor: "#10B981",
                        width: `${Math.min(100, Math.max(5, ((baselineBodyFat - analysisResult.bodyFatEstimate) / (baselineBodyFat - targetBodyFat)) * 100))}%`,
                      }} />
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Details */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: SF.text, marginBottom: 10 }}>Observations</Text>
              {analysisResult.details.map((d, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 8 }}>
                  <MaterialIcons name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 13, color: SF.muted, marginLeft: 8, flex: 1, lineHeight: 19 }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Improvements */}
            <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: SF.border, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: SF.text, marginBottom: 10 }}>Areas to Focus On</Text>
              {analysisResult.improvements.map((imp, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 8 }}>
                  <MaterialIcons name="trending-up" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 13, color: SF.muted, marginLeft: 8, flex: 1, lineHeight: 19 }}>{imp}</Text>
                </View>
              ))}
            </View>

            {/* Recommendation */}
            <View style={{ backgroundColor: "rgba(139,92,246,0.08)", borderRadius: 16, padding: 16, marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <MaterialIcons name="lightbulb" size={18} color="#8B5CF6" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#8B5CF6", marginLeft: 6 }}>AI Recommendation</Text>
              </View>
              <Text style={{ fontSize: 13, color: SF.text, lineHeight: 20 }}>{analysisResult.recommendation}</Text>
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 10 }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Back to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setSelectedImage(null); setCurrentWeight(""); setAnalysisResult(null); setStep("upload"); }}
              style={{ alignItems: "center", paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 13, color: SF.muted }}>Take Another Photo</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
