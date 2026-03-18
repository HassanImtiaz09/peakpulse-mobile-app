import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Alert, Image,
  Platform, Dimensions, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 40;
const CARD_H = Math.round(CARD_W * (16 / 9));

const SF = {
  bg: "#0A0500", surface: "#150A00", surface2: "#1F0D00",
  border: "rgba(245,158,11,0.12)", border2: "rgba(245,158,11,0.20)",
  fg: "#FFF7ED", muted: "#92400E",
  gold: "#F59E0B", gold2: "#FBBF24", gold3: "#FDE68A",
  green: "#10B981", red: "#F87171",
};

type TemplateStyle = "streak" | "session" | "milestone";

interface ShareData {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalMinutes: number;
  caloriesBurned: number;
  sessionName?: string;
  sessionDuration?: number;
  sessionExercises?: number;
  sessionSets?: number;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getMilestoneText(total: number): string | null {
  const milestones = [10, 25, 50, 100, 150, 200, 250, 300, 365, 500, 750, 1000];
  const hit = milestones.find(m => total === m);
  if (hit) return `${hit} Workouts`;
  return null;
}

// ─── Branded Template Cards ─────────────────────────────────────────────────

const StreakCard = React.forwardRef<View, { data: ShareData }>(({ data }, ref) => (
  <View ref={ref as any} collapsable={false}
    style={{
      width: CARD_W, height: CARD_H, backgroundColor: "#0A0500",
      borderRadius: 28, overflow: "hidden", padding: 0,
    }}
  >
    {/* Top gradient band */}
    <View style={{ height: 6, backgroundColor: SF.gold }} />

    <View style={{ flex: 1, padding: 28, justifyContent: "space-between" }}>
      {/* Header */}
      <View>
        <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 14, letterSpacing: 2 }}>⚡ PEAKPULSE</Text>
        <Text style={{ color: SF.fg, fontWeight: "900", fontSize: 36, marginTop: 8, letterSpacing: -1 }}>
          {data.currentStreak} Day{data.currentStreak !== 1 ? "s" : ""}
        </Text>
        <Text style={{ color: SF.gold2, fontWeight: "700", fontSize: 18, marginTop: 2 }}>Workout Streak 🔥</Text>
      </View>

      {/* Stats grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ width: "46%", backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}>
          <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 28 }}>{data.totalWorkouts}</Text>
          <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>Total Workouts</Text>
        </View>
        <View style={{ width: "46%", backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}>
          <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 28 }}>{data.longestStreak}</Text>
          <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>Longest Streak</Text>
        </View>
        <View style={{ width: "46%", backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}>
          <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 28 }}>{formatDuration(data.totalMinutes)}</Text>
          <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>Total Time</Text>
        </View>
        <View style={{ width: "46%", backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}>
          <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 28 }}>{data.caloriesBurned > 0 ? `${Math.round(data.caloriesBurned / 1000)}k` : "—"}</Text>
          <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>Calories Burned</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "#451A03", fontSize: 12, letterSpacing: 1 }}>peakpulse.ai</Text>
        <Text style={{ color: "#451A03", fontSize: 11 }}>#PeakPulseStreak</Text>
      </View>
    </View>
  </View>
));
StreakCard.displayName = "StreakCard";

const SessionCard = React.forwardRef<View, { data: ShareData }>(({ data }, ref) => (
  <View ref={ref as any} collapsable={false}
    style={{
      width: CARD_W, height: CARD_H, backgroundColor: "#0A0500",
      borderRadius: 28, overflow: "hidden",
    }}
  >
    <View style={{ height: 6, backgroundColor: SF.green }} />
    <View style={{ flex: 1, padding: 28, justifyContent: "space-between" }}>
      <View>
        <Text style={{ color: SF.green, fontWeight: "900", fontSize: 14, letterSpacing: 2 }}>⚡ PEAKPULSE</Text>
        <Text style={{ color: SF.fg, fontWeight: "900", fontSize: 28, marginTop: 8, letterSpacing: -0.5 }}>
          Workout Complete ✅
        </Text>
        {data.sessionName && (
          <Text style={{ color: SF.gold2, fontWeight: "700", fontSize: 16, marginTop: 4 }}>{data.sessionName}</Text>
        )}
      </View>

      <View style={{ gap: 12 }}>
        {/* Session stats */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(16,185,129,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(16,185,129,0.15)" }}>
            <Text style={{ color: SF.green, fontWeight: "900", fontSize: 28 }}>
              {data.sessionDuration ? formatDuration(data.sessionDuration) : "—"}
            </Text>
            <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>Duration</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(16,185,129,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(16,185,129,0.15)" }}>
            <Text style={{ color: SF.green, fontWeight: "900", fontSize: 28 }}>
              {data.sessionExercises ?? "—"}
            </Text>
            <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>Exercises</Text>
          </View>
        </View>

        {/* Streak badge */}
        <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 24 }}>🔥 {data.currentStreak} Day Streak</Text>
            <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>{data.totalWorkouts} total workouts</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "#451A03", fontSize: 12, letterSpacing: 1 }}>peakpulse.ai</Text>
        <Text style={{ color: "#451A03", fontSize: 11 }}>#PeakPulseWorkout</Text>
      </View>
    </View>
  </View>
));
SessionCard.displayName = "SessionCard";

const MilestoneCard = React.forwardRef<View, { data: ShareData; milestone: string }>(({ data, milestone }, ref) => (
  <View ref={ref as any} collapsable={false}
    style={{
      width: CARD_W, height: CARD_H, backgroundColor: "#0A0500",
      borderRadius: 28, overflow: "hidden",
    }}
  >
    <View style={{ height: 6, backgroundColor: "#A855F7" }} />
    <View style={{ flex: 1, padding: 28, justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: "#A855F7", fontWeight: "900", fontSize: 14, letterSpacing: 2 }}>⚡ PEAKPULSE</Text>

      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 64, marginBottom: 8 }}>🏆</Text>
        <Text style={{ color: SF.fg, fontWeight: "900", fontSize: 32, textAlign: "center", letterSpacing: -0.5 }}>
          {milestone}
        </Text>
        <Text style={{ color: "#C084FC", fontWeight: "700", fontSize: 18, marginTop: 4 }}>Milestone Reached!</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 22 }}>{data.currentStreak}🔥</Text>
          <Text style={{ color: SF.muted, fontSize: 10, marginTop: 2 }}>Current Streak</Text>
        </View>
        <View style={{ width: 1, height: 30, backgroundColor: "rgba(245,158,11,0.2)" }} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 22 }}>{formatDuration(data.totalMinutes)}</Text>
          <Text style={{ color: SF.muted, fontSize: 10, marginTop: 2 }}>Total Time</Text>
        </View>
        <View style={{ width: 1, height: 30, backgroundColor: "rgba(245,158,11,0.2)" }} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: SF.gold, fontWeight: "900", fontSize: 22 }}>{data.caloriesBurned > 0 ? `${Math.round(data.caloriesBurned / 1000)}k` : "—"}</Text>
          <Text style={{ color: SF.muted, fontSize: 10, marginTop: 2 }}>Calories</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <Text style={{ color: "#451A03", fontSize: 12, letterSpacing: 1 }}>peakpulse.ai</Text>
        <Text style={{ color: "#451A03", fontSize: 11 }}>#PeakPulseMilestone</Text>
      </View>
    </View>
  </View>
));
MilestoneCard.displayName = "MilestoneCard";

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ShareWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string; sessionName?: string; sessionDuration?: string;
    sessionExercises?: string; sessionSets?: string;
  }>();

  const [shareData, setShareData] = useState<ShareData>({
    currentStreak: 0, longestStreak: 0, totalWorkouts: 0,
    totalMinutes: 0, caloriesBurned: 0,
  });
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>(
    (params.type as TemplateStyle) || "streak"
  );
  const [sharing, setSharing] = useState(false);

  const streakRef = useRef<View>(null);
  const sessionRef = useRef<View>(null);
  const milestoneRef = useRef<View>(null);

  const milestone = useMemo(() => getMilestoneText(shareData.totalWorkouts), [shareData.totalWorkouts]);

  useEffect(() => {
    loadShareData();
  }, []);

  async function loadShareData() {
    try {
      const [sessionsRaw, streakRaw] = await Promise.all([
        AsyncStorage.getItem("@workout_sessions"),
        AsyncStorage.getItem("@workout_streak_data"),
      ]);

      let sessions: any[] = [];
      try { sessions = sessionsRaw ? JSON.parse(sessionsRaw) : []; } catch { /* ignore */ }

      let streakData: any = {};
      try { streakData = streakRaw ? JSON.parse(streakRaw) : {}; } catch { /* ignore */ }

      // Calculate stats from sessions
      const totalWorkouts = sessions.length;
      const totalMinutes = sessions.reduce((sum: number, s: any) => sum + (s.durationMinutes ?? 0), 0);
      const caloriesBurned = sessions.reduce((sum: number, s: any) => sum + (s.caloriesEstimate ?? 0), 0);

      // Calculate streak from session dates
      const dates = sessions
        .map((s: any) => {
          try { return new Date(s.date ?? s.completedAt).toISOString().split("T")[0]; }
          catch { return null; }
        })
        .filter(Boolean) as string[];
      const uniqueDates = [...new Set(dates)].sort().reverse();

      let currentStreak = 0;
      const today = new Date().toISOString().split("T")[0];
      let checkDate = today;
      for (const d of uniqueDates) {
        if (d === checkDate || d === getPrevDay(checkDate)) {
          currentStreak++;
          checkDate = d;
        } else if (d < checkDate) {
          break;
        }
      }

      // Longest streak
      let longest = 0;
      let tempStreak = 0;
      const sortedDates = [...new Set(dates)].sort();
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0 || isNextDay(sortedDates[i - 1], sortedDates[i])) {
          tempStreak++;
          longest = Math.max(longest, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      setShareData({
        currentStreak: streakData.currentStreak ?? currentStreak,
        longestStreak: streakData.longestStreak ?? longest,
        totalWorkouts,
        totalMinutes,
        caloriesBurned,
        sessionName: params.sessionName,
        sessionDuration: params.sessionDuration ? parseInt(params.sessionDuration) : undefined,
        sessionExercises: params.sessionExercises ? parseInt(params.sessionExercises) : undefined,
        sessionSets: params.sessionSets ? parseInt(params.sessionSets) : undefined,
      });

      // Auto-select template
      if (params.type === "session") setSelectedTemplate("session");
      else if (milestone) setSelectedTemplate("milestone");
    } catch (e) {
      console.error("Failed to load share data:", e);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const ref = selectedTemplate === "streak" ? streakRef
        : selectedTemplate === "session" ? sessionRef
        : milestoneRef;

      if (!ref.current) { Alert.alert("Error", "Template not ready"); return; }

      const uri = await captureRef(ref.current, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share your PeakPulse workout",
          UTI: "public.png",
        });
      } else {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to share");
    } finally {
      setSharing(false);
    }
  }

  const templates: Array<{ key: TemplateStyle; label: string; icon: string; available: boolean }> = [
    { key: "streak", label: "Streak", icon: "🔥", available: true },
    { key: "session", label: "Session", icon: "✅", available: !!params.sessionName },
    { key: "milestone", label: "Milestone", icon: "🏆", available: !!milestone },
  ];

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ScrollView style={{ flex: 1, backgroundColor: SF.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <MaterialIcons name="arrow-back" size={24} color={SF.gold} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 22 }}>Share Workout</Text>
              <Text style={{ color: SF.muted, fontSize: 12, marginTop: 2 }}>Choose a template and share to social media</Text>
            </View>
          </View>
        </View>

        {/* Template selector */}
        <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 16 }}>
          {templates.filter(t => t.available).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={{
                flex: 1, backgroundColor: selectedTemplate === t.key ? "rgba(245,158,11,0.12)" : SF.surface,
                borderRadius: 12, padding: 12, alignItems: "center",
                borderWidth: 1, borderColor: selectedTemplate === t.key ? SF.border2 : SF.border,
              }}
              onPress={() => {
                setSelectedTemplate(t.key);
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</Text>
              <Text style={{ color: selectedTemplate === t.key ? SF.gold : SF.muted, fontFamily: "Outfit_700Bold", fontSize: 12 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          {selectedTemplate === "streak" && <StreakCard ref={streakRef} data={shareData} />}
          {selectedTemplate === "session" && <SessionCard ref={sessionRef} data={shareData} />}
          {selectedTemplate === "milestone" && milestone && <MilestoneCard ref={milestoneRef} data={shareData} milestone={milestone} />}
        </View>

        {/* Share button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: SF.gold, borderRadius: 16, paddingVertical: 16, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 8,
              shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12,
              opacity: sharing ? 0.7 : 1,
            }}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color={SF.bg} size="small" />
            ) : (
              <>
                <MaterialIcons name="share" size={20} color={SF.bg} />
                <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Share to Social Media</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Social platform hints */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 10 }}>Share To</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              { name: "Instagram Stories", icon: "📸", color: "#E4405F" },
              { name: "TikTok", icon: "🎵", color: "#000000" },
              { name: "Facebook", icon: "📘", color: "#1877F2" },
              { name: "WhatsApp", icon: "💬", color: "#25D366" },
              { name: "X / Twitter", icon: "🐦", color: "#1DA1F2" },
              { name: "Save Image", icon: "💾", color: "#6B7280" },
            ].map((platform) => (
              <TouchableOpacity
                key={platform.name}
                style={{
                  backgroundColor: SF.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                  flexDirection: "row", alignItems: "center", gap: 6,
                  borderWidth: 1, borderColor: SF.border,
                }}
                onPress={handleShare}
              >
                <Text style={{ fontSize: 16 }}>{platform.icon}</Text>
                <Text style={{ color: SF.fg, fontSize: 12, fontFamily: "Outfit_700Bold" }}>{platform.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tip */}
        <View style={{
          marginHorizontal: 20,
          backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 16,
          padding: 14, borderWidth: 1, borderColor: SF.border,
        }}>
          <Text style={{ color: SF.gold3, fontSize: 12, lineHeight: 18 }}>
            {"💡 "}
            <Text style={{ fontFamily: "Outfit_700Bold" }}>Tip:</Text>
            {" The image is saved to your device when you share. For Instagram Stories, tap \"Share to Social Media\" and select Instagram — the image will be perfectly sized for Stories (9:16)."}
          </Text>
        </View>
      </ScrollView>

      {/* Off-screen renders for templates not currently shown (needed for capture) */}
      <View style={{ position: "absolute", left: -9999, top: -9999 }}>
        {selectedTemplate !== "streak" && <StreakCard ref={streakRef} data={shareData} />}
        {selectedTemplate !== "session" && <SessionCard ref={sessionRef} data={shareData} />}
        {selectedTemplate !== "milestone" && milestone && <MilestoneCard ref={milestoneRef} data={shareData} milestone={milestone} />}
      </View>
    </ScreenContainer>
  );
}

// ─── Date helpers ────────────────────────────────────────────────────────────
function getPrevDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function isNextDay(a: string, b: string): boolean {
  const da = new Date(a);
  da.setDate(da.getDate() + 1);
  return da.toISOString().split("T")[0] === b;
}
