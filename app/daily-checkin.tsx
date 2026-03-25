import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  ImageBackground,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";
import { useGuestAuth } from "@/lib/guest-auth";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/golden-challenge-bg-2DXBpSZwN3LCroCHSRyD4K.webp";

interface CheckIn {
  date: string;
  photoUri?: string;
  photoUrl?: string;
  weightKg?: number;
  bodyFatPercent?: number;
  estimatedBF?: number;
  trend?: string;
  motivationalMessage?: string;
  tips?: string[];
  notes?: string;
}

const STREAK_REWARDS = [
  { days: 3, reward: "🔥 3-Day Streak", desc: "You're building momentum!" },
  { days: 7, reward: "⚡ 7-Day Warrior", desc: "One week of consistency!" },
  { days: 14, reward: "💪 2-Week Champion", desc: "Habit is forming!" },
  { days: 30, reward: "🏆 30-Day Legend", desc: "Incredible dedication!" },
  { days: 60, reward: "👑 60-Day Elite", desc: "You're unstoppable!" },
  { days: 90, reward: "🌟 90-Day Master", desc: "True transformation!" },
];

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getStreakMessage(streak: number) {
  if (streak === 0) return "Start your streak today! 💪";
  if (streak === 1) return "Day 1 complete! Keep going! 🔥";
  if (streak < 7) return `${streak}-day streak! You're on fire! 🔥`;
  if (streak < 14) return `${streak} days strong! Amazing consistency! ⚡`;
  if (streak < 30) return `${streak} days! You're a champion! 🏆`;
  return `${streak} days! You're an absolute legend! 👑`;
}

export default function DailyCheckInScreen() {
  const router = useRouter();
  const { isGuest, guestProfile } = useGuestAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [streak, setStreak] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadPhoto = trpc.upload.photo.useMutation();
  const assessPhoto = trpc.dailyCheckIn.assessPhoto.useMutation();
  const saveCheckIn = trpc.dailyCheckIn.saveCheckIn.useMutation();

  useEffect(() => {
    loadCheckIns();
  }, []);

  const loadCheckIns = async () => {
    try {
      const stored = await AsyncStorage.getItem("peakpulse_checkins");
      if (stored) {
        const data: CheckIn[] = JSON.parse(stored);
        setCheckIns(data);
        const today = getTodayKey();
        const todayEntry = data.find((c) => c.date === today);
        setTodayCheckIn(todayEntry ?? null);
        // Calculate streak
        let s = 0;
        const sortedDates = data.map((c) => c.date).sort().reverse();
        const today2 = new Date();
        for (let i = 0; i < sortedDates.length; i++) {
          const expected = new Date(today2);
          expected.setDate(expected.getDate() - i);
          const expectedStr = expected.toISOString().split("T")[0];
          if (sortedDates[i] === expectedStr) s++;
          else break;
        }
        setStreak(s);
      }
    } catch (e) {
      console.warn("Failed to load check-ins:", e);
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedPhoto(result.assets[0].uri);
      if (result.assets[0].base64) {
        analysePhoto(result.assets[0].base64, result.assets[0].uri);
      }
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera Permission", "Please allow camera access to take your daily photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedPhoto(result.assets[0].uri);
      if (result.assets[0].base64) {
        analysePhoto(result.assets[0].base64, result.assets[0].uri);
      }
    }
  };

  const analysePhoto = async (base64: string, uri: string) => {
    setAnalysing(true);
    try {
      // Upload photo first
      setUploading(true);
      const uploadResult = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });
      setUploading(false);

      // Get previous BF% for comparison
      const prevBF = checkIns.length > 0 ? checkIns[checkIns.length - 1].estimatedBF : undefined;
      const profile = guestProfile;
      const goal = (profile as any)?.goal ?? "general fitness";

      // AI assessment
      const result = await assessPhoto.mutateAsync({
        photoUrl: uploadResult.url,
        previousBF: prevBF,
        goal,
      });
      setAnalysisResult({ ...result, uploadedUrl: uploadResult.url });
    } catch (e) {
      setUploading(false);
      Alert.alert("Analysis Failed", "Could not analyse the photo. Please try again.");
    } finally {
      setAnalysing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPhoto && !weight) {
      Alert.alert("Add Data", "Please take a photo or enter your weight to log today's check-in.");
      return;
    }
    setSaving(true);
    try {
      const today = getTodayKey();
      const newCheckIn: CheckIn = {
        date: today,
        photoUri: selectedPhoto ?? undefined,
        photoUrl: analysisResult?.uploadedUrl,
        weightKg: weight ? parseFloat(weight) : undefined,
        estimatedBF: analysisResult?.estimatedBF,
        trend: analysisResult?.trend,
        motivationalMessage: analysisResult?.motivationalMessage,
        tips: analysisResult?.tips,
        notes: notes.trim() || undefined,
      };

      // Save to AsyncStorage
      const updated = [...checkIns.filter((c) => c.date !== today), newCheckIn];
      await AsyncStorage.setItem("peakpulse_checkins", JSON.stringify(updated));
      setCheckIns(updated);
      setTodayCheckIn(newCheckIn);

      // Save to DB if authenticated
      if (isGuest || guestProfile) {
        try {
          await saveCheckIn.mutateAsync({
            photoUrl: analysisResult?.uploadedUrl,
            weightKg: weight ? parseFloat(weight) : undefined,
            bodyFatPercent: analysisResult?.estimatedBF,
            notes: notes.trim() || undefined,
          });
        } catch (e) {
          // DB save failed but local save succeeded
        }
      }

      // Check streak
      const newStreak = streak + (todayCheckIn ? 0 : 1);
      setStreak(newStreak);

      const reward = STREAK_REWARDS.find((r) => r.days === newStreak);
      if (reward) {
        Alert.alert(`${reward.reward}`, `${reward.desc}\n\n${analysisResult?.motivationalMessage ?? "Keep up the great work!"}`);
      } else {
        Alert.alert(
          "Check-in Saved! 🎉",
          analysisResult?.motivationalMessage ?? "Great job logging your progress today! Consistency is the key to transformation.",
          [{ text: "Awesome!", style: "default" }]
        );
      }

      setSelectedPhoto(null);
      setWeight("");
      setNotes("");
      setAnalysisResult(null);
    } catch (e) {
      Alert.alert("Error", "Could not save check-in. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const trendColor = analysisResult?.trend === "improving" ? "#22c55e" : analysisResult?.trend === "declining" ? "#ef4444" : "#f59e0b";
  const trendIcon = analysisResult?.trend === "improving" ? "📈" : analysisResult?.trend === "declining" ? "📉" : "➡️";

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-black">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: HERO_BG }} style={styles.hero}>
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>DAILY CHECK-IN</Text>
              <Text style={styles.heroTitle}>Track Your{"\n"}Transformation</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          {/* Streak Banner */}
          <View style={styles.streakBanner}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakCount}>{streak}-Day Streak</Text>
              <Text style={styles.streakMessage}>{getStreakMessage(streak)}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>+10 XP</Text>
            </View>
          </View>

          {/* Streak Milestones */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestonesScroll}>
            {STREAK_REWARDS.map((r) => (
              <View key={r.days} style={[styles.milestoneChip, streak >= r.days && styles.milestoneChipAchieved]}>
                <Text style={styles.milestoneEmoji}>{r.reward.split(" ")[0]}</Text>
                <Text style={styles.milestoneDays}>{r.days}d</Text>
              </View>
            ))}
          </ScrollView>

          {/* Today's Status */}
          {todayCheckIn ? (
            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <Text style={styles.todayTitle}>✅ Today's Check-in Complete</Text>
                <Text style={styles.todayDate}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</Text>
              </View>
              {todayCheckIn.photoUri && (
                <Image source={{ uri: todayCheckIn.photoUri }} style={styles.todayPhoto} />
              )}
              {todayCheckIn.estimatedBF && (
                <View style={styles.todayStats}>
                  <View style={styles.todayStat}>
                    <Text style={styles.todayStatValue}>{todayCheckIn.estimatedBF}%</Text>
                    <Text style={styles.todayStatLabel}>Est. Body Fat</Text>
                  </View>
                  {todayCheckIn.weightKg && (
                    <View style={styles.todayStat}>
                      <Text style={styles.todayStatValue}>{todayCheckIn.weightKg} kg</Text>
                      <Text style={styles.todayStatLabel}>Weight</Text>
                    </View>
                  )}
                </View>
              )}
              {todayCheckIn.motivationalMessage && (
                <View style={styles.motivationBox}>
                  <Text style={styles.motivationText}>💬 {todayCheckIn.motivationalMessage}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.updateBtn} onPress={() => setTodayCheckIn(null)}>
                <Text style={styles.updateBtnText}>Update Today's Check-in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Check-in Form */
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Today's Check-in</Text>
              <Text style={styles.formDate}>
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </Text>

              {/* Photo Section */}
              <View style={styles.photoSection}>
                {selectedPhoto ? (
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
                    {(uploading || analysing) && (
                      <View style={styles.photoOverlay}>
                        <ActivityIndicator color="#7c3aed" size="large" />
                        <Text style={styles.photoOverlayText}>
                          {uploading ? "Uploading..." : "AI Analysing..."}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderEmoji}>📸</Text>
                    <Text style={styles.photoPlaceholderText}>Add today's progress photo</Text>
                    <Text style={styles.photoPlaceholderSub}>AI estimates body fat % and gives feedback</Text>
                  </View>
                )}
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                    <Text style={styles.photoBtnText}>📷 Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                    <Text style={styles.photoBtnText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* AI Analysis Result */}
              {analysisResult && !analysing && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>🤖 AI Analysis</Text>
                  <View style={styles.analysisStats}>
                    <View style={styles.analysisStat}>
                      <Text style={styles.analysisStatValue}>{analysisResult.estimatedBF ?? "--"}%</Text>
                      <Text style={styles.analysisStatLabel}>Est. Body Fat</Text>
                    </View>
                    <View style={styles.analysisStat}>
                      <Text style={[styles.analysisStatValue, { color: trendColor }]}>{trendIcon} {analysisResult.trend ?? "stable"}</Text>
                      <Text style={styles.analysisStatLabel}>Trend</Text>
                    </View>
                  </View>
                  <View style={styles.motivationBox}>
                    <Text style={styles.motivationText}>💬 {analysisResult.motivationalMessage}</Text>
                  </View>
                  {analysisResult.tips && analysisResult.tips.length > 0 && (
                    <View style={styles.tipsSection}>
                      <Text style={styles.tipsTitle}>💡 Tips for You</Text>
                      {analysisResult.tips.map((tip: string, i: number) => (
                        <Text key={i} style={styles.tipItem}>• {tip}</Text>
                      ))}
                    </View>
                  )}
                  {analysisResult.bodyComposition && (
                    <View style={styles.bodyCompSection}>
                      {analysisResult.bodyComposition.areasImproving?.length > 0 && (
                        <View style={styles.bodyCompRow}>
                          <Text style={styles.bodyCompLabel}>✅ Improving:</Text>
                          <Text style={styles.bodyCompValue}>{analysisResult.bodyComposition.areasImproving.join(", ")}</Text>
                        </View>
                      )}
                      {analysisResult.bodyComposition.areasToFocus?.length > 0 && (
                        <View style={styles.bodyCompRow}>
                          <Text style={styles.bodyCompLabel}>🎯 Focus on:</Text>
                          <Text style={styles.bodyCompValue}>{analysisResult.bodyComposition.areasToFocus.join(", ")}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Weight Input */}
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 75.5"
                placeholderTextColor="#6b7280"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="How are you feeling today? Any observations?"
                placeholderTextColor="#6b7280"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, (saving || analysing) && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving || analysing}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>✅ Save Check-in (+10 XP)</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* History */}
          {checkIns.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Check-in History</Text>
              {[...checkIns].reverse().slice(0, 10).map((c, i) => (
                <View key={i} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    {c.photoUri ? (
                      <Image source={{ uri: c.photoUri }} style={styles.historyThumb} />
                    ) : (
                      <View style={[styles.historyThumb, styles.historyThumbEmpty]}>
                        <Text style={{ fontSize: 18 }}>📊</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.historyDate}>
                        {new Date(c.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </Text>
                      {c.weightKg && <Text style={styles.historyWeight}>{c.weightKg} kg</Text>}
                    </View>
                  </View>
                  {c.estimatedBF && (
                    <View style={styles.historyBF}>
                      <Text style={styles.historyBFValue}>{c.estimatedBF}%</Text>
                      <Text style={styles.historyBFLabel}>BF</Text>
                    </View>
                  )}
                  {c.trend && (
                    <Text style={{ fontSize: 18 }}>
                      {c.trend === "improving" ? "📈" : c.trend === "declining" ? "📉" : "➡️"}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { height: 220 },
  heroOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", padding: 20, justifyContent: "space-between" },
  backBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: "#fff", fontSize: 16 },
  heroContent: { paddingBottom: 16 },
  heroLabel: { color: "#a78bfa", fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 2, marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 30, fontFamily: "BebasNeue_400Regular", lineHeight: 38 },
  body: { backgroundColor: "#0a0a0a", padding: 16, paddingBottom: 80 },
  streakBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a0a00", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#92400e", gap: 12 },
  streakEmoji: { fontSize: 32 },
  streakCount: { color: "#fbbf24", fontSize: 18, fontFamily: "BebasNeue_400Regular" },
  streakMessage: { color: "#d97706", fontSize: 13, marginTop: 2 },
  streakBadge: { backgroundColor: "#92400e", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  streakBadgeText: { color: "#fbbf24", fontSize: 12, fontFamily: "DMSans_700Bold" },
  milestonesScroll: { marginBottom: 20 },
  milestoneChip: { backgroundColor: "#1f2937", borderRadius: 10, padding: 10, marginRight: 8, alignItems: "center", minWidth: 56, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" },
  milestoneChipAchieved: { backgroundColor: "#1a0a00", borderColor: "#92400e" },
  milestoneEmoji: { fontSize: 20, marginBottom: 4 },
  milestoneDays: { color: "#9ca3af", fontSize: 11, fontFamily: "DMSans_600SemiBold" },
  todayCard: { backgroundColor: "#111827", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#22c55e" },
  todayHeader: { marginBottom: 14 },
  todayTitle: { color: "#22c55e", fontSize: 16, fontFamily: "DMSans_700Bold" },
  todayDate: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  todayPhoto: { width: "100%", height: 200, borderRadius: 12, marginBottom: 14 },
  todayStats: { flexDirection: "row", gap: 12, marginBottom: 14 },
  todayStat: { flex: 1, backgroundColor: "#1f2937", borderRadius: 10, padding: 12, alignItems: "center" },
  todayStatValue: { color: "#a78bfa", fontSize: 22, fontFamily: "BebasNeue_400Regular" },
  todayStatLabel: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  motivationBox: { backgroundColor: "#0f2010", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#166534" },
  motivationText: { color: "#86efac", fontSize: 13, lineHeight: 20 },
  updateBtn: { backgroundColor: "#1f2937", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  updateBtnText: { color: "#9ca3af", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  formCard: { backgroundColor: "#111827", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#1f2937" },
  formTitle: { color: "#fff", fontSize: 18, fontFamily: "DMSans_700Bold", marginBottom: 4 },
  formDate: { color: "#6b7280", fontSize: 13, marginBottom: 16 },
  photoSection: { marginBottom: 16 },
  photoPreviewContainer: { position: "relative", marginBottom: 10 },
  photoPreview: { width: "100%", height: 220, borderRadius: 12 },
  photoOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  photoOverlayText: { color: "#fff", fontSize: 14, marginTop: 8 },
  photoPlaceholder: { backgroundColor: "#1f2937", borderRadius: 12, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", borderStyle: "dashed" },
  photoPlaceholderEmoji: { fontSize: 36, marginBottom: 8 },
  photoPlaceholderText: { color: "#9ca3af", fontSize: 15, fontFamily: "DMSans_600SemiBold", marginBottom: 4 },
  photoPlaceholderSub: { color: "#6b7280", fontSize: 12, textAlign: "center", paddingHorizontal: 20 },
  photoButtons: { flexDirection: "row", gap: 10 },
  photoBtn: { flex: 1, backgroundColor: "#1f2937", borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" },
  photoBtnText: { color: "#e5e7eb", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  analysisCard: { backgroundColor: "#0f172a", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#1e3a5f" },
  analysisTitle: { color: "#60a5fa", fontSize: 15, fontFamily: "DMSans_700Bold", marginBottom: 12 },
  analysisStats: { flexDirection: "row", gap: 12, marginBottom: 12 },
  analysisStat: { flex: 1, backgroundColor: "#1e2a3a", borderRadius: 10, padding: 10, alignItems: "center" },
  analysisStatValue: { color: "#a78bfa", fontSize: 20, fontFamily: "BebasNeue_400Regular" },
  analysisStatLabel: { color: "#6b7280", fontSize: 11, marginTop: 2 },
  tipsSection: { marginTop: 10 },
  tipsTitle: { color: "#fbbf24", fontSize: 13, fontFamily: "DMSans_700Bold", marginBottom: 6 },
  tipItem: { color: "#d1d5db", fontSize: 13, lineHeight: 22 },
  bodyCompSection: { marginTop: 10, backgroundColor: "#0a1628", borderRadius: 8, padding: 10 },
  bodyCompRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  bodyCompLabel: { color: "#9ca3af", fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  bodyCompValue: { color: "#e5e7eb", fontSize: 12, flex: 1 },
  inputLabel: { color: "#9ca3af", fontSize: 13, fontFamily: "DMSans_600SemiBold", marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#1f2937", borderRadius: 10, padding: 12, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" },
  notesInput: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: { backgroundColor: "#7c3aed", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "BebasNeue_400Regular" },
  historySection: { marginTop: 8 },
  historyTitle: { color: "#fff", fontSize: 18, fontFamily: "DMSans_700Bold", marginBottom: 14 },
  historyItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#111827", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1f2937" },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  historyThumb: { width: 48, height: 48, borderRadius: 8 },
  historyThumbEmpty: { backgroundColor: "#1f2937", alignItems: "center", justifyContent: "center" },
  historyDate: { color: "#fff", fontSize: 14, fontFamily: "DMSans_600SemiBold" },
  historyWeight: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  historyBF: { alignItems: "center", marginRight: 12 },
  historyBFValue: { color: "#a78bfa", fontSize: 16, fontFamily: "DMSans_700Bold" },
  historyBFLabel: { color: "#6b7280", fontSize: 10 },
});
