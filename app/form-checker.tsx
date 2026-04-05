/**
 * Exercise Form Checker
 * - Record a video of yourself doing an exercise
 * - AI analyses the video and gives form feedback
 * - Real-time form quality bar (red/amber/green)
 * - Integrated into workout plans
 */
import React, { useState, useRef } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  ImageBackground, Image, Platform, Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { FeatureGate } from "@/components/feature-gate";
import { useSubscription } from "@/hooks/use-subscription";
import { useAiLimit } from "@/components/ai-limit-modal";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { ScreenErrorBoundary } from "@/components/error-boundary";

const WORKOUT_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const EXERCISES_WITH_TIPS: Record<string, { tips: string[]; keyPoints: string[] }> = {
  "Squat": {
    tips: ["Keep chest up and back straight", "Knees track over toes", "Hips below parallel for full range", "Feet shoulder-width apart"],
    keyPoints: ["Spine neutral", "Knee alignment", "Depth", "Foot position"],
  },
  "Deadlift": {
    tips: ["Bar over mid-foot", "Hinge at hips, not knees", "Keep bar close to body", "Lock out at top with glutes"],
    keyPoints: ["Bar path", "Hip hinge", "Back position", "Lockout"],
  },
  "Bench Press": {
    tips: ["Arch back slightly, feet flat", "Bar touches lower chest", "Elbows at 45-75° angle", "Full range of motion"],
    keyPoints: ["Bar path", "Elbow angle", "Wrist position", "Range of motion"],
  },
  "Push-up": {
    tips: ["Body in straight line", "Elbows at 45°", "Full range — chest to floor", "Core tight throughout"],
    keyPoints: ["Body alignment", "Elbow angle", "Range of motion", "Core engagement"],
  },
  "Pull-up": {
    tips: ["Full hang at bottom", "Chin over bar at top", "Avoid kipping/swinging", "Engage lats, not just arms"],
    keyPoints: ["Range of motion", "Lat engagement", "Body control", "Grip width"],
  },
  "Overhead Press": {
    tips: ["Bar starts at upper chest", "Press straight up, not forward", "Squeeze glutes and core", "Full lockout at top"],
    keyPoints: ["Bar path", "Core stability", "Lockout", "Elbow position"],
  },
  "Lunge": {
    tips: ["Front knee over ankle", "Back knee near floor", "Torso upright", "Push through front heel"],
    keyPoints: ["Knee alignment", "Depth", "Balance", "Torso position"],
  },
  "Plank": {
    tips: ["Hips level with shoulders", "Core braced, not sagging", "Head neutral", "Breathe steadily"],
    keyPoints: ["Hip position", "Core engagement", "Head alignment", "Duration"],
  },
};

const DEFAULT_EXERCISE = "Squat";

interface FormScore {
  score: number; // 0-100
  grade: "poor" | "fair" | "good" | "excellent";
  feedback: string[];
  corrections: string[];
  positives: string[];
  exerciseName: string;
}

function getFormColor(score: number): string {
  if (score >= 80) return "#FDE68A";
  if (score >= 55) return "#FBBF24";
  return "#B45309";
}

function getFormLabel(score: number): string {
  if (score >= 80) return "Excellent Form";
  if (score >= 65) return "Good Form";
  if (score >= 45) return "Fair Form";
  return "Needs Work";
}

function getFormEmoji(score: number): string {
  if (score >= 80) return "🟢";
  if (score >= 55) return "🟡";
  return "🔴";
}

export default function FormCheckerScreen() {
  const router = useRouter();
  const { showLimitModal } = useAiLimit();
  const params = useLocalSearchParams<{ exercise?: string }>();
  const exerciseName = params.exercise ?? DEFAULT_EXERCISE;

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [formScore, setFormScore] = useState<FormScore | null>(null);
  const [selectedExercise, setSelectedExercise] = useState(exerciseName);
  const [animatedScore] = useState(new Animated.Value(0));

  const uploadPhoto = trpc.upload.photo.useMutation();
  const analyzeFormMutation = trpc.workout.analyzeForm.useMutation();
  const { canAccess: canAccessFeature } = useSubscription();
  const hasFormCheckAccess = canAccessFeature("form_checker");

  const exerciseTips = EXERCISES_WITH_TIPS[selectedExercise] ?? EXERCISES_WITH_TIPS[DEFAULT_EXERCISE];

  async function recordVideo() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to record your exercise form.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 30,
        quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setFormScore(null);
      }
    } catch (e: any) {
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }
      Alert.alert("Error", e.message);
    }
  }

  async function pickVideo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri);
        setFormScore(null);
      }
    } catch (e: any) {
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }
      Alert.alert("Error", e.message);
    }
  }

  async function analyzeForm() {
    if (!videoUri) return;
    setAnalyzing(true);
    try {
      // For video analysis, we extract a representative frame or use the video thumbnail
      // Since full video AI analysis requires a video URL, we upload the video file
      let base64 = "";
      let mimeType = "video/mp4";

      if (Platform.OS === "web") {
        const resp = await fetch(videoUri);
        const blob = await resp.blob();
        mimeType = blob.type || "video/mp4";
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Read video as base64 (works for short clips up to ~30s)
        try {
          base64 = await FileSystem.readAsStringAsync(videoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch {
          // If video is too large, use a static image analysis approach
          // with exercise-specific AI prompt
          base64 = "";
        }
      }

      // Call the form analysis AI
      const result = await analyzeFormMutation.mutateAsync({
        exerciseName: selectedExercise,
        videoBase64: base64,
        hasVideo: base64.length > 0,
      });

      setFormScore(result);

      // Animate the score bar
      Animated.timing(animatedScore, {
        toValue: result.score,
        duration: 1200,
        useNativeDriver: false,
      }).start();

    } catch (e: any) {
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }
      Alert.alert("Analysis Failed", e.message ?? "Could not analyze form. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  const formColor = formScore ? getFormColor(formScore.score) : "#F59E0B";
  const barWidth = animatedScore.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // Gate form checker behind Advanced tier
  if (!hasFormCheckAccess) {
    return (
      <ScreenErrorBoundary screenName="form-checker">
      <View style={{ flex: 1, backgroundColor: "#0A0E14" }}>
        <View style={{ backgroundColor: "#0A0E14", paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Text style={{ color: "#F1F5F9", fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color: "#F1F5F9", fontFamily: "BebasNeue_400Regular", fontSize: 24, letterSpacing: 3 }}>FORM CHECKER</Text>
            <View style={{ width: 28 }} />
          </View>
        </View>
        <FeatureGate feature="form_checker" message="AI Form Checker analyzes your exercise technique in real-time to prevent injuries and optimize gains. Upgrade to Advanced to unlock.">
          <View style={{ height: 400 }} />
        </FeatureGate>
      </View>
      </ScreenErrorBoundary>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0E14" }}>
      {/* Hero */}
      <ImageBackground source={{ uri: WORKOUT_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, left: 20, width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}
            onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
            <Text style={{ color: "#F1F5F9", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1 }}>AI POWERED</Text>
          <Text style={{ color: "#F1F5F9", fontFamily: "BebasNeue_400Regular", fontSize: 26, letterSpacing: -0.5 }}>Form Checker</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Exercise Selector */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 10 }}>SELECT EXERCISE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {Object.keys(EXERCISES_WITH_TIPS).map(ex => (
                <TouchableOpacity
                  key={ex}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedExercise === ex ? "#F59E0B" : "#141A22", borderWidth: 1, borderColor: selectedExercise === ex ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                  onPress={() => { setSelectedExercise(ex); setFormScore(null); setVideoUri(null); }}
                >
                  <Text style={{ color: selectedExercise === ex ? "#F1F5F9" : "#B45309", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Form Tips */}
        <View style={{ backgroundColor: "#141A22", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 10 }}>📋 {selectedExercise} — Key Form Points</Text>
          {exerciseTips.tips.map((tip, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>
              <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 13 }}>{i + 1}.</Text>
              <Text style={{ color: "#D1D5DB", fontSize: 13, flex: 1, lineHeight: 18 }}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Video Capture */}
        {!videoUri ? (
          <View>
            <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 10 }}>RECORD OR UPLOAD</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 24, alignItems: "center", gap: 8, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
                onPress={recordVideo}
              >
                <Text style={{ fontSize: 32 }}>🎥</Text>
                <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 14 }}>Record Video</Text>
                <Text style={{ color: "#FDE68A", fontSize: 11 }}>Up to 30 seconds</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#141A22", borderRadius: 16, paddingVertical: 24, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                onPress={pickVideo}
              >
                <Text style={{ fontSize: 32 }}>📁</Text>
                <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 14 }}>Upload Video</Text>
                <Text style={{ color: "#B45309", fontSize: 11 }}>From gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={{ backgroundColor: "#141A22", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
              <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8 }}>TIPS FOR BEST RESULTS</Text>
              <Text style={{ color: "#B45309", fontSize: 12, lineHeight: 18 }}>
                • Film from the side for best form analysis{"\n"}
                • Ensure good lighting so your full body is visible{"\n"}
                • Record the full movement — start to finish{"\n"}
                • Keep the camera steady (lean against a wall or use a stand)
              </Text>
            </View>
          </View>
        ) : (
          <View>
            {/* Video Preview */}
            <View style={{ backgroundColor: "#141A22", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", alignItems: "center" }}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>🎬</Text>
              <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 4 }}>Video Ready</Text>
              <Text style={{ color: "#B45309", fontSize: 12, textAlign: "center" }}>
                {selectedExercise} form check — tap Analyse to get AI feedback
              </Text>
              <TouchableOpacity
                style={{ marginTop: 10, backgroundColor: "#EF444420", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}
                onPress={() => { setVideoUri(null); setFormScore(null); }}
              >
                <Text style={{ color: "#B45309", fontSize: 12, fontFamily: "DMSans_600SemiBold" }}>✕ Remove</Text>
              </TouchableOpacity>
            </View>

            {!formScore && (
              <TouchableOpacity
                style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 16, opacity: analyzing ? 0.7 : 1, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
                onPress={analyzeForm}
                disabled={analyzing}
              >
                {analyzing ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator color="#F1F5F9" size="small" />
                    <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 15 }}>Analysing form...</Text>
                  </View>
                ) : (
                  <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 15 }}>🤖 Analyse My Form</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Form Score Result */}
        {formScore && (
          <View>
            {/* Score Card */}
            <View style={{ backgroundColor: "#141A22", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: formColor + "40", shadowColor: formColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <View>
                  <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1 }}>FORM SCORE</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                    <Text style={{ color: formColor, fontFamily: "BebasNeue_400Regular", fontSize: 48 }}>{formScore.score}</Text>
                    <Text style={{ color: "#B45309", fontSize: 18, fontFamily: "DMSans_700Bold" }}>/100</Text>
                  </View>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 48 }}>{getFormEmoji(formScore.score)}</Text>
                  <Text style={{ color: formColor, fontFamily: "DMSans_700Bold", fontSize: 14, marginTop: 4 }}>{getFormLabel(formScore.score)}</Text>
                </View>
              </View>

              {/* Animated Form Bar */}
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: "#B45309", fontSize: 10, fontFamily: "DMSans_700Bold" }}>Poor</Text>
                  <Text style={{ color: "#FBBF24", fontSize: 10, fontFamily: "DMSans_700Bold" }}>Fair</Text>
                  <Text style={{ color: "#FDE68A", fontSize: 10, fontFamily: "DMSans_700Bold" }}>Excellent</Text>
                </View>
                <View style={{ height: 14, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 7, overflow: "hidden" }}>
                  {/* Static colored zones */}
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "45%", backgroundColor: "#EF444430", borderRadius: 7 }} />
                  <View style={{ position: "absolute", left: "45%", top: 0, bottom: 0, width: "35%", backgroundColor: "#F9731630" }} />
                  <View style={{ position: "absolute", left: "80%", top: 0, bottom: 0, right: 0, backgroundColor: "#22C55E30", borderRadius: 7 }} />
                  {/* Animated fill */}
                  <Animated.View style={{ height: 14, width: barWidth, backgroundColor: formColor, borderRadius: 7, shadowColor: formColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }} />
                </View>
                {/* Score markers */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ color: "#451A03", fontSize: 9 }}>0</Text>
                  <Text style={{ color: "#451A03", fontSize: 9 }}>45</Text>
                  <Text style={{ color: "#451A03", fontSize: 9 }}>80</Text>
                  <Text style={{ color: "#451A03", fontSize: 9 }}>100</Text>
                </View>
              </View>
            </View>

            {/* Positives */}
            {formScore.positives?.length > 0 && (
              <View style={{ backgroundColor: "#22C55E10", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#22C55E30" }}>
                <Text style={{ color: "#FDE68A", fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 10 }}>✅ What You're Doing Well</Text>
                {formScore.positives.map((p, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                    <Text style={{ color: "#FDE68A", fontSize: 13 }}>•</Text>
                    <Text style={{ color: "#D1D5DB", fontSize: 13, flex: 1, lineHeight: 18 }}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Corrections */}
            {formScore.corrections?.length > 0 && (
              <View style={{ backgroundColor: "#EF444410", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#EF444430" }}>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 10 }}>⚠️ Form Corrections Needed</Text>
                {formScore.corrections.map((c, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                    <Text style={{ color: "#B45309", fontSize: 13 }}>•</Text>
                    <Text style={{ color: "#D1D5DB", fontSize: 13, flex: 1, lineHeight: 18 }}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* General Feedback */}
            {formScore.feedback?.length > 0 && (
              <View style={{ backgroundColor: "#7C3AED10", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 10 }}>💡 AI Coach Feedback</Text>
                {formScore.feedback.map((f, i) => (
                  <Text key={i} style={{ color: "#D1D5DB", fontSize: 13, lineHeight: 20, marginBottom: 4 }}>{f}</Text>
                ))}
              </View>
            )}

            {/* Try Again */}
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 12 }}
              onPress={() => { setVideoUri(null); setFormScore(null); }}
            >
              <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 14 }}>🎥 Record Another Rep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: "#141A22", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
              onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
              <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>← Back to Workout</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
