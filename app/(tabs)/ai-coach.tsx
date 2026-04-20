/**
 * AI Coach Screen — Enhanced with Claude AI + Health Integration
 *
 * Features:
 * - Claude-powered coaching with Gemini fallback
 * - Health data context (steps, HR, sleep, HRV, VO2max)
 * - Typing animation while AI is thinking
 * - Coach personality avatar (not generic robot emoji)
 * - Thumbs up/down feedback on assistant messages
 * - Source badge (Claude / Gemini / Template)
 * - Morning briefing card auto-fetched on mount
 * - Contextual coaching triggers (post-workout, re-engagement)
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, ImageBackground, KeyboardAvoidingView,
  Platform, FlatList, Alert, Image, Animated as RNAnimated,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { useWearable } from "@/lib/wearable-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FeatureGate } from "@/components/feature-gate";
import { useSubscription } from "@/hooks/use-subscription";
import { UI, SF } from "@/constants/ui-colors";
import { useAiLimit } from "@/components/ai-limit-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { a11yButton, a11yHeader } from "@/lib/accessibility";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";
const COACH_AVATAR = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/ai-coach-icon_c7090906.png";

// ── Types ────────────────────────────────────────────────────────────────────
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  source?: "claude" | "gemini" | "template";
  feedback?: "up" | "down" | null;
  id: string;
};

const SUGGESTED_QUESTIONS = [
  "What's my biggest form weakness right now?",
  "How do I speed up fat loss safely?",
  "Am I training too much or too little?",
  "What should I eat before a workout?",
  "How do I break through a plateau?",
  "Analyze my sleep and recovery data",
  "What does my HRV tell you about my readiness?",
];

// ── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  const dot1 = useRef(new RNAnimated.Value(0.3)).current;
  const dot2 = useRef(new RNAnimated.Value(0.3)).current;
  const dot3 = useRef(new RNAnimated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: RNAnimated.Value, delay: number) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          RNAnimated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, overflow: "hidden" }}>
        <Image source={{ uri: COACH_AVATAR }} style={{ width: 32, height: 32 }} />
      </View>
      <View style={{ backgroundColor: SF.surface, borderRadius: 16, borderBottomLeftRadius: 4, padding: 14, borderWidth: 1, borderColor: SF.border2, flexDirection: "row", gap: 6, alignItems: "center" }}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <RNAnimated.View
            key={i}
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SF.gold, opacity: dot }}
          />
        ))}
      </View>
    </View>
  );
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? SF.gold3 : score >= 60 ? SF.gold2 : SF.gold;
  const label = score >= 80 ? "Elite" : score >= 60 ? "Strong" : score >= 40 ? "Building" : "Starting";
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: color, backgroundColor: "rgba(20,184,166,0.08)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color, fontFamily: "SpaceMono_700Bold", fontSize: 30 }}>{score}</Text>
        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>/ 100</Text>
      </View>
      <Text style={{ color, fontFamily: "DMSans_700Bold", fontSize: 13, marginTop: 6 }}>{label}</Text>
    </View>
  );
}

// ── Source Badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const label = source === "claude" ? "Claude AI" : source === "gemini" ? "Gemini" : "Template";
  const badgeColor = source === "claude" ? "#D97706" : source === "gemini" ? "#6366F1" : SF.muted;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: badgeColor }} />
      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>{label}</Text>
    </View>
  );
}

// ── Feedback Buttons ─────────────────────────────────────────────────────────
function FeedbackButtons({ feedback, onFeedback }: { feedback?: "up" | "down" | null; onFeedback: (type: "up" | "down") => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
      <TouchableOpacity
        onPress={() => onFeedback("up")}
        style={{ padding: 4, opacity: feedback === "down" ? 0.3 : 1 }}
        {...a11yButton("Helpful response")}
      >
        <MaterialIcons name="thumb-up" size={14} color={feedback === "up" ? SF.gold : SF.muted} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onFeedback("down")}
        style={{ padding: 4, opacity: feedback === "up" ? 0.3 : 1 }}
        {...a11yButton("Not helpful")}
      >
        <MaterialIcons name="thumb-down" size={14} color={feedback === "down" ? UI.red : SF.muted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Morning Briefing Card ────────────────────────────────────────────────────
function MorningBriefingCard({ briefing, loading, onRefresh }: {
  briefing: { message: string; personality: string; suggestions?: string[]; source?: string } | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (!briefing && !loading) return null;

  const personalityIcon = briefing?.personality === "motivator" ? "🔥" : briefing?.personality === "analyst" ? "📊" : "🧠";
  const personalityLabel = briefing?.personality === "motivator" ? "Motivator" : briefing?.personality === "analyst" ? "Analyst" : "Mentor";

  return (
    <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border2, marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image source={{ uri: COACH_AVATAR }} style={{ width: 28, height: 28, borderRadius: 8 }} />
          <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5 }}>DAILY BRIEFING</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} disabled={loading} style={{ padding: 4 }}>
          <MaterialIcons name="refresh" size={18} color={loading ? SF.muted : SF.gold2} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <ActivityIndicator color={SF.gold} size="small" />
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 8 }}>Analyzing your data...</Text>
        </View>
      ) : briefing ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Text style={{ fontSize: 14 }}>{personalityIcon}</Text>
            <Text style={{ color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{personalityLabel} Mode</Text>
            {briefing.source && <SourceBadge source={briefing.source} />}
          </View>
          <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22 }}>
            {briefing.message}
          </Text>
          {briefing.suggestions && briefing.suggestions.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {briefing.suggestions.map((s, i) => (
                <View key={i} style={{ backgroundColor: "rgba(217,119,6,0.10)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: SF.border2 }}>
                  <Text style={{ color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
function AICoachScreenContent() {
  const router = useRouter();
  const { showLimitModal } = useAiLimit();
  const { user, isAuthenticated } = useAuth();
  const { isGuest } = useGuestAuth();
  const wearableData = useWearable();
  const [activeTab, setActiveTab] = useState<"insights" | "chat">("insights");
  const [insights, setInsights] = useState<any | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [briefing, setBriefing] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const chatListRef = useRef<FlatList>(null);
  const { canAccess: canAccessFeature } = useSubscription();
  const hasCoachAccess = canAccessFeature("ai_coaching");

  const getInsightsMutation = trpc.aiCoach.getInsights.useMutation();
  const chatMutation = trpc.aiCoach.chat.useMutation();
  const contextMutation = trpc.aiCoach.getContextMessage.useMutation();
  const { data: dbProfile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });

  // Build full profile with health data
  const buildFullProfile = useCallback(() => {
    const stats = wearableData.stats;
    return {
      ...profile,
      name: user?.name ?? profile.name,
      // Health data from wearable context
      steps: stats.steps || undefined,
      heartRate: stats.heartRate || undefined,
      sleepHours: stats.sleepHours || undefined,
      sleepQuality: stats.sleepQuality !== "fair" ? stats.sleepQuality : undefined,
      activeCalories: stats.activeCalories || undefined,
      vo2Max: stats.vo2Max,
      hrv: stats.hrv,
      activeMinutes: stats.activeMinutes || undefined,
    };
  }, [profile, wearableData.stats, user?.name]);

  // Load coaching data
  useEffect(() => {
    loadCoachingData();
  }, [isAuthenticated, isGuest]);

  async function loadCoachingData() {
    try {
      const [formRaw, scanRaw, guestRaw, workoutCountRaw, streakRaw, targetRaw, mealsRaw] = await Promise.all([
        AsyncStorage.getItem("@form_check_history"),
        AsyncStorage.getItem("@body_scan_history"),
        AsyncStorage.getItem("@guest_profile"),
        AsyncStorage.getItem("@workout_count"),
        AsyncStorage.getItem("@streak_count"),
        AsyncStorage.getItem("@target_transformation"),
        AsyncStorage.getItem("@meal_log"),
      ]);

      const guestProfile = guestRaw ? JSON.parse(guestRaw) : null;
      const activeProfile = isAuthenticated ? dbProfile : guestProfile;
      const targetTrans = targetRaw ? JSON.parse(targetRaw) : null;
      const scanHistory = scanRaw ? JSON.parse(scanRaw) : [];
      const latestScan = scanHistory.length > 0 ? scanHistory[scanHistory.length - 1] : null;
      const formHistory = formRaw ? JSON.parse(formRaw) : [];
      const meals = mealsRaw ? JSON.parse(mealsRaw) : [];

      // Calculate recent form scores summary
      const recentForms = formHistory.slice(-5);
      const recentFormScores = recentForms.length > 0
        ? recentForms.map((f: any) => `${f.exerciseName ?? f.exercise ?? "?"}: ${f.score ?? 0}`).join(", ")
        : undefined;

      // Calculate form weaknesses
      const weakForms = formHistory.filter((f: any) => (f.score ?? 0) < 65);
      const formWeaknesses = weakForms.length > 0
        ? [...new Set(weakForms.map((f: any) => f.exerciseName ?? f.exercise))].slice(0, 3).join(", ")
        : undefined;

      // Recent meals summary
      const recentMeals = meals.length > 0
        ? meals.slice(-3).map((m: any) => m.name ?? "meal").join(", ")
        : undefined;

      const profileData = {
        goal: activeProfile?.goal ?? "general fitness",
        weightKg: activeProfile?.weightKg ?? guestProfile?.weightKg,
        heightCm: activeProfile?.heightCm ?? guestProfile?.heightCm,
        age: activeProfile?.age ?? guestProfile?.age,
        gender: activeProfile?.gender ?? guestProfile?.gender,
        currentBF: latestScan?.estimatedBodyFat ?? activeProfile?.bodyFatPercent,
        targetBF: targetTrans?.target_bf,
        workoutsCompleted: workoutCountRaw ? parseInt(workoutCountRaw) : 0,
        streakDays: streakRaw ? parseInt(streakRaw) : 0,
        totalMeals: meals.length,
        totalScans: scanHistory.length,
        recentFormScores,
        formWeaknesses,
        recentMeals,
      };
      setProfile(profileData);
    } catch {}
  }

  // Fetch morning briefing on mount
  useEffect(() => {
    fetchBriefing();
  }, []);

  async function fetchBriefing() {
    // Check cache first
    try {
      const cachedRaw = await AsyncStorage.getItem("@coach_briefing");
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        const age = Date.now() - new Date(cached.fetchedAt ?? 0).getTime();
        if (age < 6 * 60 * 60 * 1000) { // 6 hour cache
          setBriefing(cached);
          return;
        }
      }
    } catch {}

    setBriefingLoading(true);
    try {
      const stats = wearableData.stats;
      const result = await contextMutation.mutateAsync({
        trigger: "morning_briefing",
        context: {
          name: user?.name ?? undefined,
          goal: profile.goal,
          currentBF: profile.currentBF,
          targetBF: profile.targetBF,
          steps: stats.steps || undefined,
          heartRate: stats.heartRate || undefined,
          sleepHours: stats.sleepHours || undefined,
          sleepQuality: stats.sleepQuality !== "fair" ? stats.sleepQuality : undefined,
          activeCalories: stats.activeCalories || undefined,
          vo2Max: stats.vo2Max ?? undefined,
          hrv: stats.hrv ?? undefined,
          activeMinutes: stats.activeMinutes || undefined,
          workoutsCompleted: profile.workoutsCompleted,
          streakDays: profile.streakDays,
        },
      });
      const briefingData = { ...result, fetchedAt: new Date().toISOString() };
      setBriefing(briefingData);
      await AsyncStorage.setItem("@coach_briefing", JSON.stringify(briefingData));
    } catch (e: any) {
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED")) { showLimitModal(e.message); }
    } finally {
      setBriefingLoading(false);
    }
  }

  async function generateInsights() {
    setLoadingInsights(true);
    try {
      const [formRaw, scanRaw, targetRaw] = await Promise.all([
        AsyncStorage.getItem("@form_check_history"),
        AsyncStorage.getItem("@body_scan_history"),
        AsyncStorage.getItem("@target_transformation"),
      ]);

      const formHistory = formRaw ? JSON.parse(formRaw) : [];
      const scanHistory = scanRaw ? JSON.parse(scanRaw) : [];
      const targetTrans = targetRaw ? JSON.parse(targetRaw) : null;
      const latestScan = scanHistory.length > 0 ? scanHistory[scanHistory.length - 1] : null;

      const result = await getInsightsMutation.mutateAsync({
        formHistory: formHistory.slice(-10).map((f: any) => ({
          exercise: f.exercise ?? f.exerciseName ?? "Unknown",
          score: f.score ?? 0,
          date: f.date ?? f.createdAt ?? new Date().toISOString(),
          corrections: f.corrections ?? [],
        })),
        progressPhotos: scanHistory.slice(-10).map((s: any) => ({
          date: s.date ?? s.createdAt ?? new Date().toISOString(),
          estimatedBF: s.estimatedBodyFat,
          trend: s.trend,
        })),
        profile: {
          goal: profile.goal,
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          age: profile.age,
          gender: profile.gender,
          currentBF: latestScan?.estimatedBodyFat ?? profile.currentBF,
          targetBF: targetTrans?.target_bf ?? profile.targetBF,
          workoutsCompleted: profile.workoutsCompleted,
          streakDays: profile.streakDays,
        },
      });

      setInsights(result);
      await AsyncStorage.setItem("@ai_coach_insights", JSON.stringify({ ...result, generatedAt: new Date().toISOString() }));
    } catch (e: any) {
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }
      Alert.alert("Error", e.message ?? "Could not generate insights. Please try again.");
    } finally {
      setLoadingInsights(false);
    }
  }

  // Load cached insights on mount
  useEffect(() => {
    AsyncStorage.getItem("@ai_coach_insights").then(raw => {
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          const age = Date.now() - new Date(cached.generatedAt ?? 0).getTime();
          if (age < 24 * 60 * 60 * 1000) setInsights(cached);
        } catch {}
      }
    });
  }, []);

  async function sendChat(text?: string) {
    const msg = (text ?? chatInput).trim();
    if (!msg) return;
    setChatInput("");
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: msg, id: `user_${msgId}` }];
    setChatMessages(newMessages);
    setChatLoading(true);
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const fullProfile = buildFullProfile();
      const result = await chatMutation.mutateAsync({
        message: msg,
        history: chatMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        profile: fullProfile,
      });
      const updated: ChatMessage[] = [
        ...newMessages,
        { role: "assistant", content: result.reply, source: result.source as any, feedback: null, id: `asst_${msgId}` },
      ];
      setChatMessages(updated);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      const updated: ChatMessage[] = [
        ...newMessages,
        { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again.", source: "template", feedback: null, id: `err_${msgId}` },
      ];
      setChatMessages(updated);
    } finally {
      setChatLoading(false);
    }
  }

  function handleFeedback(messageId: string, type: "up" | "down") {
    setChatMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, feedback: m.feedback === type ? null : type } : m
    ));
  }

  // If user doesn't have AI coaching access, show the gate
  if (!hasCoachAccess) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg }}>
        <View style={{ backgroundColor: SF.bg, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <MaterialIcons name="chevron-left" size={28} color={SF.fg} />
            </TouchableOpacity>
            <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 24, letterSpacing: 3 }}>AI COACH</Text>
            <View style={{ width: 28 }} />
          </View>
        </View>
        <FeatureGate feature="ai_coaching" message="Get personalized AI coaching with form analysis, progress insights, and contextual tips. Upgrade to Advanced to unlock.">
          <View style={{ height: 400 }} />
        </FeatureGate>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: SF.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Hero */}
      <ImageBackground source={{ uri: HERO_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,5,0,0.78)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Image source={{ uri: COACH_AVATAR }} style={{ width: 28, height: 28, borderRadius: 6 }} />
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5 }}>FYTNOVA COACH</Text>
          </View>
          <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 28, letterSpacing: 2, marginTop: 4 }}>
            AI COACHING
          </Text>
          <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>
            Powered by Claude AI · Health-aware · Personalised
          </Text>
        </View>
      </ImageBackground>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
        {(["insights", "chat"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === tab ? SF.gold : SF.surface, borderWidth: 1, borderColor: activeTab === tab ? SF.gold : SF.border }}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={{ color: activeTab === tab ? SF.bg : SF.muted, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
              {tab === "insights" ? "📊 Insights" : "💬 Chat"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Insights Tab ── */}
      {activeTab === "insights" && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Morning Briefing */}
          <MorningBriefingCard briefing={briefing} loading={briefingLoading} onRefresh={fetchBriefing} />

          {/* Health Data Summary (if synced) */}
          {wearableData.stats.dataSource !== "none" && wearableData.stats.steps > 0 && (
            <View style={{ backgroundColor: SF.surface, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: SF.border2 }}>
              <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>HEALTH DATA SYNCED</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  { label: "Steps", value: wearableData.stats.steps.toLocaleString(), icon: "🚶" },
                  wearableData.stats.heartRate > 0 ? { label: "HR", value: `${wearableData.stats.heartRate} bpm`, icon: "❤️" } : null,
                  wearableData.stats.sleepHours > 0 ? { label: "Sleep", value: `${wearableData.stats.sleepHours}h`, icon: "😴" } : null,
                  wearableData.stats.hrv ? { label: "HRV", value: `${wearableData.stats.hrv}ms`, icon: "📈" } : null,
                  wearableData.stats.activeCalories > 0 ? { label: "Active Cal", value: `${wearableData.stats.activeCalories}`, icon: "🔥" } : null,
                ].filter(Boolean).map((stat, i) => (
                  <View key={i} style={{ backgroundColor: SF.surface2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: SF.border }}>
                    <Text style={{ fontSize: 12 }}>{stat!.icon}</Text>
                    <Text style={{ color: SF.fg, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{stat!.value}</Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 9 }}>{stat!.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 8 }}>
                Coach uses this data for personalized advice
              </Text>
            </View>
          )}

          {!insights ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Image source={{ uri: COACH_AVATAR }} style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 20 }} />
              <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 22, textAlign: "center", marginBottom: 10 }}>
                Ready for Your Coaching Report?
              </Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 32, paddingHorizontal: 20 }}>
                Your AI Coach will analyse your form history, progress photos, health data, and profile to give you a personalised action plan.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: SF.gold, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 40, shadowColor: SF.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, opacity: loadingInsights ? 0.7 : 1 }}
                onPress={generateInsights}
                disabled={loadingInsights}
              >
                {loadingInsights ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator color={SF.bg} size="small" />
                    <Text style={{ color: SF.bg, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>Analysing your data...</Text>
                  </View>
                ) : (
                  <Text style={{ color: SF.bg, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>⚡ Generate My Coaching Report</Text>
                )}
              </TouchableOpacity>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 16, textAlign: "center" }}>
                Uses your form checks, body scans, health data, and workout history
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Overall Score */}
              <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: SF.border2, alignItems: "center" }}>
                <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 16 }}>OVERALL COACHING SCORE</Text>
                <ScoreRing score={insights.overallScore ?? 70} />
                <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16, textAlign: "center", marginTop: 16, lineHeight: 22 }}>
                  {insights.headline ?? "Keep pushing — you're making progress"}
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 16, backgroundColor: "rgba(20,184,166,0.10)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: SF.border2 }}
                  onPress={generateInsights}
                  disabled={loadingInsights}
                >
                  {loadingInsights ? (
                    <ActivityIndicator color={SF.gold} size="small" />
                  ) : (
                    <Text style={{ color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>🔄 Refresh Analysis</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Form Analysis */}
              {insights.formAnalysis && (
                <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>🎯 FORM ANALYSIS</Text>
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, marginBottom: 14 }}>
                    {insights.formAnalysis.summary}
                  </Text>
                  {insights.formAnalysis.strengths?.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: SF.gold3, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 8 }}>✅ Strengths</Text>
                      {insights.formAnalysis.strengths.map((s: string, i: number) => (
                        <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                          <Text style={{ color: SF.gold3, fontSize: 13 }}>•</Text>
                          <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1, lineHeight: 18 }}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {insights.formAnalysis.topIssues?.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: UI.red, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 8 }}>⚠️ Priority Fixes</Text>
                      {insights.formAnalysis.topIssues.map((issue: string, i: number) => (
                        <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                          <Text style={{ color: UI.red, fontSize: 13 }}>•</Text>
                          <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1, lineHeight: 18 }}>{issue}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {insights.formAnalysis.priorityExercise && (
                    <View style={{ backgroundColor: "rgba(20,184,166,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: SF.border2 }}>
                      <Text style={{ color: SF.gold2, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                        🏋️ Focus Exercise: {insights.formAnalysis.priorityExercise}
                      </Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                        {insights.formAnalysis.priorityReason}
                      </Text>
                      <TouchableOpacity
                        style={{ marginTop: 10, backgroundColor: SF.gold, borderRadius: 10, paddingVertical: 8, alignItems: "center" }}
                        onPress={() => router.push({ pathname: "/form-checker", params: { exercise: insights.formAnalysis.priorityExercise } } as any)}
                      >
                        <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Check My {insights.formAnalysis.priorityExercise} Form →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Progress Analysis */}
              {insights.progressAnalysis && (
                <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>📈 PROGRESS ANALYSIS</Text>
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, marginBottom: 14 }}>
                    {insights.progressAnalysis.summary}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {[
                      { label: "Trend", value: insights.progressAnalysis.trend ?? "stable", icon: insights.progressAnalysis.trend === "improving" ? "📈" : "➡️" },
                      { label: "Weeks to Goal", value: `${insights.progressAnalysis.estimatedWeeksToGoal ?? "?"}w`, icon: "⏱" },
                      { label: "BF/week", value: `${insights.progressAnalysis.weeklyBFLoss ?? 0}%`, icon: "🔥" },
                    ].map((stat, i) => (
                      <View key={i} style={{ flex: 1, backgroundColor: SF.surface2, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: SF.border }}>
                        <Text style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</Text>
                        <Text style={{ color: SF.gold2, fontFamily: "BebasNeue_400Regular", fontSize: 14 }}>{stat.value}</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2, textAlign: "center" }}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Personalised Tips */}
              {insights.personalizedTips?.length > 0 && (
                <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>💡 PERSONALISED TIPS</Text>
                  {insights.personalizedTips.map((tip: any, i: number) => (
                    <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(20,184,166,0.10)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 20 }}>{tip.icon ?? "💡"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: SF.gold2, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 3 }}>{tip.category}</Text>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 19 }}>{tip.tip}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Weekly Focus Plan */}
              {insights.weeklyPlan?.length > 0 && (
                <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>📅 THIS WEEK'S FOCUS</Text>
                  {insights.weeklyPlan.map((day: any, i: number) => (
                    <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                      <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "rgba(20,184,166,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border2 }}>
                        <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 10, textAlign: "center" }}>{day.day?.slice(0, 3)?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{day.focus}</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 3, lineHeight: 17 }}>{day.tip}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Next Milestone */}
              {insights.nextMilestone && (
                <View style={{ backgroundColor: "rgba(20,184,166,0.08)", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border2 }}>
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>🏆 NEXT MILESTONE</Text>
                  <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 18, marginBottom: 6 }}>{insights.nextMilestone.title}</Text>
                  <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 10 }}>{insights.nextMilestone.description}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="schedule" size={14} color={SF.gold2} />
                    <Text style={{ color: SF.gold2, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Estimated: {insights.nextMilestone.estimatedDate}</Text>
                  </View>
                </View>
              )}

              {/* Chat CTA */}
              <TouchableOpacity
                style={{ backgroundColor: SF.gold, borderRadius: 18, paddingVertical: 16, alignItems: "center", shadowColor: SF.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 }}
                onPress={() => setActiveTab("chat")}
              >
                <Text style={{ color: SF.bg, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>💬 Ask Your AI Coach</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Chat Tab ── */}
      {activeTab === "chat" && (
        <View style={{ flex: 1 }}>
          {chatMessages.length === 0 ? (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Image source={{ uri: COACH_AVATAR }} style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 12 }} />
                <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 20, textAlign: "center", marginBottom: 8 }}>
                  Ask Me Anything
                </Text>
                <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 }}>
                  I know your goals, your form history, your health data, and your progress. Ask me anything about training, nutrition, or recovery.
                </Text>
              </View>
              <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>SUGGESTED QUESTIONS</Text>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={{ backgroundColor: SF.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: SF.border2, flexDirection: "row", alignItems: "center", gap: 10 }}
                  onPress={() => sendChat(q)}
                >
                  <Text style={{ color: SF.gold, fontSize: 16 }}>💬</Text>
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1, lineHeight: 18 }}>{q}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={SF.muted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <FlatList
              ref={chatListRef}
              data={chatMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: item.role === "user" ? "row-reverse" : "row", marginBottom: 12, alignItems: "flex-end", gap: 8 }}>
                  {item.role === "assistant" && (
                    <View style={{ width: 32, height: 32, borderRadius: 10, overflow: "hidden" }}>
                      <Image source={{ uri: COACH_AVATAR }} style={{ width: 32, height: 32 }} />
                    </View>
                  )}
                  <View style={{ maxWidth: "78%" }}>
                    <View style={{ backgroundColor: item.role === "user" ? SF.gold : SF.surface, borderRadius: 16, borderBottomRightRadius: item.role === "user" ? 4 : 16, borderBottomLeftRadius: item.role === "assistant" ? 4 : 16, padding: 12, borderWidth: item.role === "assistant" ? 1 : 0, borderColor: SF.border2 }}>
                      <Text style={{ color: item.role === "user" ? SF.bg : SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
                    </View>
                    {item.role === "assistant" && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4, paddingLeft: 4 }}>
                        <SourceBadge source={item.source} />
                        <FeedbackButtons feedback={item.feedback} onFeedback={(type) => handleFeedback(item.id, type)} />
                      </View>
                    )}
                  </View>
                </View>
              )}
              ListFooterComponent={chatLoading ? <TypingIndicator /> : null}
            />
          )}

          {/* Chat Input */}
          <View style={{ padding: 16, paddingBottom: Platform.OS === "ios" ? 32 : 16, backgroundColor: SF.surface, borderTopWidth: 1, borderTopColor: SF.border }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
              <TextInput
                style={{ flex: 1, backgroundColor: SF.surface2, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, borderWidth: 1, borderColor: SF.border2, maxHeight: 100 }}
                placeholder="Ask your AI coach..."
                placeholderTextColor={SF.muted}
                value={chatInput}
                onChangeText={setChatInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => sendChat()}
              />
              <TouchableOpacity
                style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: chatInput.trim() ? SF.gold : SF.surface2, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: chatInput.trim() ? SF.gold : SF.border }}
                onPress={() => sendChat()}
                disabled={!chatInput.trim() || chatLoading}
              >
                <MaterialIcons name="send" size={20} color={chatInput.trim() ? SF.bg : SF.muted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export default function AICoachScreen() {
  return (
    <ErrorBoundary fallbackScreen="AI Coach">
      <AICoachScreenContent />
    </ErrorBoundary>
  );
}
