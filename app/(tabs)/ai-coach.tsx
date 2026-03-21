/**
 * AI Coach Screen
 * - Analyses form history + progress photos + profile
 * - Gives personalised weekly plan, tips, and milestone tracking
 * - Conversational AI chat with context-aware coaching
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, ImageBackground, KeyboardAvoidingView,
  Platform, FlatList, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const SF = {
  bg:      "#0A0500",
  surface: "#150A00",
  surface2:"#1F0D00",
  border:  "rgba(245,158,11,0.12)",
  border2: "rgba(245,158,11,0.22)",
  fg:      "#FFF7ED",
  muted: "#B45309",
  gold:    "#F59E0B",
  gold2:   "#FBBF24",
  gold3:   "#FDE68A",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTED_QUESTIONS = [
  "What's my biggest form weakness right now?",
  "How do I speed up fat loss safely?",
  "Am I training too much or too little?",
  "What should I eat before a workout?",
  "How do I break through a plateau?",
];

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? SF.gold3 : score >= 60 ? SF.gold2 : SF.gold;
  const label = score >= 80 ? "Elite" : score >= 60 ? "Strong" : score >= 40 ? "Building" : "Starting";
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: color, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color, fontFamily: "Outfit_800ExtraBold", fontSize: 30 }}>{score}</Text>
        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10 }}>/ 100</Text>
      </View>
      <Text style={{ color, fontFamily: "Outfit_700Bold", fontSize: 13, marginTop: 6 }}>{label}</Text>
    </View>
  );
}

export default function AICoachScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isGuest } = useGuestAuth();
  const [activeTab, setActiveTab] = useState<"insights" | "chat">("insights");
  const [insights, setInsights] = useState<any | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const chatListRef = useRef<FlatList>(null);

  const getInsightsMutation = trpc.aiCoach.getInsights.useMutation();
  const chatMutation = trpc.aiCoach.chat.useMutation();
  const { data: dbProfile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });

  // Load all data needed for coaching
  useEffect(() => {
    loadCoachingData();
  }, [isAuthenticated, isGuest]);

  async function loadCoachingData() {
    try {
      const [formRaw, scanRaw, guestRaw, workoutCountRaw, streakRaw, targetRaw] = await Promise.all([
        AsyncStorage.getItem("@form_check_history"),
        AsyncStorage.getItem("@body_scan_history"),
        AsyncStorage.getItem("@guest_profile"),
        AsyncStorage.getItem("@workout_count"),
        AsyncStorage.getItem("@streak_count"),
        AsyncStorage.getItem("@target_transformation"),
      ]);

      const guestProfile = guestRaw ? JSON.parse(guestRaw) : null;
      const activeProfile = isAuthenticated ? dbProfile : guestProfile;
      const targetTrans = targetRaw ? JSON.parse(targetRaw) : null;
      const scanHistory = scanRaw ? JSON.parse(scanRaw) : [];
      const latestScan = scanHistory.length > 0 ? scanHistory[scanHistory.length - 1] : null;

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
      };
      setProfile(profileData);
    } catch {}
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
      // Cache insights
      await AsyncStorage.setItem("@ai_coach_insights", JSON.stringify({ ...result, generatedAt: new Date().toISOString() }));
    } catch (e: any) {
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
          // Use cache if less than 24h old
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
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const result = await chatMutation.mutateAsync({
        message: msg,
        history: chatMessages.slice(-8),
        profile: {
          goal: profile.goal,
          currentBF: profile.currentBF,
          targetBF: profile.targetBF,
          workoutsCompleted: profile.workoutsCompleted,
        },
      });
      const updated: ChatMessage[] = [...newMessages, { role: "assistant", content: result.reply }];
      setChatMessages(updated);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      const updated: ChatMessage[] = [...newMessages, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again." }];
      setChatMessages(updated);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: SF.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Hero */}
      <ImageBackground source={{ uri: HERO_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,5,0,0.78)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5 }}>🤖 PEAKPULSE</Text>
          <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 28, letterSpacing: -0.5 }}>AI Coach</Text>
          <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>
            Form analysis · Progress insights · Personalised tips
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
            <Text style={{ color: activeTab === tab ? SF.bg : SF.muted, fontFamily: "Outfit_700Bold", fontSize: 13 }}>
              {tab === "insights" ? "📊 Insights" : "💬 Chat"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Insights Tab ── */}
      {activeTab === "insights" && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {!insights ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 64, marginBottom: 20 }}>🤖</Text>
              <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 10 }}>
                Ready for Your Coaching Report?
              </Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 32, paddingHorizontal: 20 }}>
                Your AI Coach will analyse your form history, progress photos, and profile to give you a personalised action plan.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: SF.gold, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 40, shadowColor: SF.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, opacity: loadingInsights ? 0.7 : 1 }}
                onPress={generateInsights}
                disabled={loadingInsights}
              >
                {loadingInsights ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator color={SF.bg} size="small" />
                    <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Analysing your data...</Text>
                  </View>
                ) : (
                  <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>⚡ Generate My Coaching Report</Text>
                )}
              </TouchableOpacity>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 16, textAlign: "center" }}>
                Uses your form checks, body scans, and workout history
              </Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Overall Score */}
              <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: SF.border2, alignItems: "center" }}>
                <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 16 }}>OVERALL COACHING SCORE</Text>
                <ScoreRing score={insights.overallScore ?? 70} />
                <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 16, textAlign: "center", marginTop: 16, lineHeight: 22 }}>
                  {insights.headline ?? "Keep pushing — you're making progress"}
                </Text>
                <TouchableOpacity
                  style={{ marginTop: 16, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: SF.border2 }}
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
                  <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>🎯 FORM ANALYSIS</Text>
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22, marginBottom: 14 }}>
                    {insights.formAnalysis.summary}
                  </Text>
                  {insights.formAnalysis.strengths?.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: SF.gold3, fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8 }}>✅ Strengths</Text>
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
                      <Text style={{ color: "#EF4444", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 8 }}>⚠️ Priority Fixes</Text>
                      {insights.formAnalysis.topIssues.map((issue: string, i: number) => (
                        <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                          <Text style={{ color: "#EF4444", fontSize: 13 }}>•</Text>
                          <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1, lineHeight: 18 }}>{issue}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {insights.formAnalysis.priorityExercise && (
                    <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: SF.border2 }}>
                      <Text style={{ color: SF.gold2, fontFamily: "Outfit_700Bold", fontSize: 13 }}>
                        🏋️ Focus Exercise: {insights.formAnalysis.priorityExercise}
                      </Text>
                      <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4, lineHeight: 18 }}>
                        {insights.formAnalysis.priorityReason}
                      </Text>
                      <TouchableOpacity
                        style={{ marginTop: 10, backgroundColor: SF.gold, borderRadius: 10, paddingVertical: 8, alignItems: "center" }}
                        onPress={() => router.push({ pathname: "/form-checker", params: { exercise: insights.formAnalysis.priorityExercise } } as any)}
                      >
                        <Text style={{ color: SF.bg, fontFamily: "Outfit_700Bold", fontSize: 12 }}>Check My {insights.formAnalysis.priorityExercise} Form →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Progress Analysis */}
              {insights.progressAnalysis && (
                <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>📈 PROGRESS ANALYSIS</Text>
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
                        <Text style={{ color: SF.gold2, fontFamily: "Outfit_800ExtraBold", fontSize: 14 }}>{stat.value}</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2, textAlign: "center" }}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Personalised Tips */}
              {insights.personalizedTips?.length > 0 && (
                <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>💡 PERSONALISED TIPS</Text>
                  {insights.personalizedTips.map((tip: any, i: number) => (
                    <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 20 }}>{tip.icon ?? "💡"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: SF.gold2, fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 3 }}>{tip.category}</Text>
                        <Text style={{ color: SF.fg, fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 19 }}>{tip.tip}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Weekly Focus Plan */}
              {insights.weeklyPlan?.length > 0 && (
                <View style={{ backgroundColor: SF.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border }}>
                  <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>📅 THIS WEEK'S FOCUS</Text>
                  {insights.weeklyPlan.map((day: any, i: number) => (
                    <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                      <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border2 }}>
                        <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 10, textAlign: "center" }}>{day.day?.slice(0, 3)?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: SF.fg, fontFamily: "Outfit_700Bold", fontSize: 14 }}>{day.focus}</Text>
                        <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 3, lineHeight: 17 }}>{day.tip}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Next Milestone */}
              {insights.nextMilestone && (
                <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: SF.border2 }}>
                  <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>🏆 NEXT MILESTONE</Text>
                  <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 18, marginBottom: 6 }}>{insights.nextMilestone.title}</Text>
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
                <Text style={{ color: SF.bg, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>💬 Ask Your AI Coach</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Chat Tab ── */}
      {activeTab === "chat" && (
        <View style={{ flex: 1 }}>
          {chatMessages.length === 0 ? (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 20 }}>
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Text style={{ fontSize: 56, marginBottom: 12 }}>🤖</Text>
                <Text style={{ color: SF.fg, fontFamily: "Outfit_800ExtraBold", fontSize: 20, textAlign: "center", marginBottom: 8 }}>
                  Ask Me Anything
                </Text>
                <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 }}>
                  I know your goals, your form history, and your progress. Ask me anything about training, nutrition, or recovery.
                </Text>
              </View>
              <Text style={{ color: SF.gold, fontFamily: "Outfit_700Bold", fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>SUGGESTED QUESTIONS</Text>
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
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: item.role === "user" ? "row-reverse" : "row", marginBottom: 12, alignItems: "flex-end", gap: 8 }}>
                  {item.role === "assistant" && (
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: SF.gold, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 16 }}>🤖</Text>
                    </View>
                  )}
                  <View style={{ maxWidth: "78%", backgroundColor: item.role === "user" ? SF.gold : SF.surface, borderRadius: 16, borderBottomRightRadius: item.role === "user" ? 4 : 16, borderBottomLeftRadius: item.role === "assistant" ? 4 : 16, padding: 12, borderWidth: item.role === "assistant" ? 1 : 0, borderColor: SF.border2 }}>
                    <Text style={{ color: item.role === "user" ? SF.bg : SF.fg, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
                  </View>
                </View>
              )}
              ListFooterComponent={chatLoading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 40, marginBottom: 12 }}>
                  <ActivityIndicator color={SF.gold} size="small" />
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12 }}>Coach is thinking...</Text>
                </View>
              ) : null}
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
