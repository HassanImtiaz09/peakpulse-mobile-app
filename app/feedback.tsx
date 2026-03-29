import React, { useState, useCallback } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, TextInput,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { GOLDEN_PRIMARY, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
// NanoBanana design tokens
const BG = "#0A0E14";
const SURFACE = "#111827";
const SURFACE2 = "#1E293B";
const FG = "#F1F5F9";
const MUTED = "#64748B";
const GOLD = "#F59E0B";
const GOLD_DIM = "rgba(245,158,11,0.10)";
const GOLD_BORDER = "rgba(245,158,11,0.25)";
const ICE = "#06B6D4";
const MINT = "#10B981";
const ROSE = "#F43F5E";

const FEEDBACK_STORAGE_KEY = "@peakpulse_feedback_history";

type FeedbackType = "bug" | "suggestion" | "question" | "compliment";

interface FeedbackEntry {
  id: string;
  type: FeedbackType;
  category: string;
  subject: string;
  description: string;
  timestamp: string;
  status: "submitted" | "acknowledged";
  userEmail: string;
}

const FEEDBACK_TYPES: Array<{ key: FeedbackType; label: string; icon: string; color: string; desc: string }> = [
  { key: "bug", label: "Report Bug", icon: "bug-report", color: ROSE, desc: "Something isn't working right" },
  { key: "suggestion", label: "Suggestion", icon: "lightbulb", color: GOLD, desc: "Ideas to improve the app" },
  { key: "question", label: "Question", icon: "help", color: ICE, desc: "Need help with a feature" },
  { key: "compliment", label: "Compliment", icon: "favorite", color: MINT, desc: "Tell us what you love" },
];

const CATEGORIES: Record<FeedbackType, string[]> = {
  bug: ["Workout Plans", "Meal Plans", "AI Coach", "Body Scan", "Exercise Demos", "Navigation", "Performance", "Other"],
  suggestion: ["New Feature", "UI/UX Design", "Workout Content", "Nutrition", "AI Features", "Social", "Other"],
  question: ["Getting Started", "Subscription", "Workouts", "Nutrition", "AI Features", "Account", "Other"],
  compliment: ["Overall App", "Workout Plans", "AI Coach", "Design", "Exercise Library", "Other"],
};

export default function FeedbackScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isGuest, guestProfile } = useGuestAuth();

  const [step, setStep] = useState<"type" | "form" | "history" | "success">("type");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<FeedbackEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const userEmail = isAuthenticated ? (user?.email ?? "unknown") : (isGuest ? "guest" : "anonymous");

  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSelectType = (type: FeedbackType) => {
    setFeedbackType(type);
    setCategory("");
    setSubject("");
    setDescription("");
    setStep("form");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!category) { Alert.alert("Missing Category", "Please select a category."); return; }
    if (!subject.trim()) { Alert.alert("Missing Subject", "Please enter a brief subject."); return; }
    if (!description.trim()) { Alert.alert("Missing Description", "Please describe your feedback in detail."); return; }

    setSubmitting(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const entry: FeedbackEntry = {
        id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: feedbackType,
        category,
        subject: subject.trim(),
        description: description.trim(),
        timestamp: new Date().toISOString(),
        status: "submitted",
        userEmail,
      };

      // Save to local history
      const existing = await AsyncStorage.getItem(FEEDBACK_STORAGE_KEY);
      const all: FeedbackEntry[] = existing ? JSON.parse(existing) : [];
      all.unshift(entry);
      // Keep last 50 entries
      const trimmed = all.slice(0, 50);
      await AsyncStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(trimmed));
      setHistory(trimmed);

      // Simulate brief network delay for UX
      await new Promise(r => setTimeout(r, 800));

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } catch (e) {
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const typeColor = FEEDBACK_TYPES.find(t => t.key === feedbackType)?.color ?? GOLD;

  return (
    <ImageBackground source={{ uri: GOLDEN_PRIMARY }} style={{ flex: 1 }} resizeMode="cover">
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 }}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            onPress={() => {
              if (step === "form") setStep("type");
              else if (step === "success") setStep("type");
              else if (step === "history") setStep("type");
              else router.back();
            }}
          >
            <MaterialIcons name="chevron-left" size={24} color={FG} />
            <Text style={{ color: FG, fontFamily: "DMSans_600SemiBold", fontSize: 15 }}>
              {step === "type" ? "Back" : step === "form" ? "Feedback" : step === "history" ? "Feedback" : "Back"}
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => { loadHistory(); setStep("history"); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: SURFACE2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <MaterialIcons name="history" size={16} color={MUTED} />
              <Text style={{ color: MUTED, fontSize: 12, fontFamily: "DMSans_500Medium" }}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Step 1: Select Feedback Type */}
          {step === "type" && (
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 28, marginBottom: 4 }}>Send Feedback</Text>
              <Text style={{ color: MUTED, fontSize: 13, lineHeight: 18, marginBottom: 24 }}>
                Help us improve PeakPulse. Choose the type of feedback you'd like to share.
              </Text>

              {FEEDBACK_TYPES.map(ft => (
                <TouchableOpacity
                  key={ft.key}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 14,
                    backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 12,
                    borderWidth: 1, borderColor: "rgba(30,41,59,0.6)",
                  }}
                  onPress={() => handleSelectType(ft.key)}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${ft.color}15`, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${ft.color}30` }}>
                    <MaterialIcons name={ft.icon as any} size={22} color={ft.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{ft.label}</Text>
                    <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{ft.desc}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={MUTED} />
                </TouchableOpacity>
              ))}

              {/* Quick Stats */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <View style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}>
                  <Text style={{ color: GOLD, fontFamily: "SpaceMono_400Regular", fontSize: 18 }}>{history.length}</Text>
                  <Text style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>Submitted</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}>
                  <Text style={{ color: MINT, fontFamily: "SpaceMono_400Regular", fontSize: 18 }}>{history.filter(h => h.status === "acknowledged").length}</Text>
                  <Text style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>Acknowledged</Text>
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Feedback Form */}
          {step === "form" && (
            <View style={{ paddingHorizontal: 20 }}>
              {/* Type Badge */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${typeColor}15`, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name={FEEDBACK_TYPES.find(t => t.key === feedbackType)?.icon as any} size={18} color={typeColor} />
                </View>
                <Text style={{ color: typeColor, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
                  {FEEDBACK_TYPES.find(t => t.key === feedbackType)?.label}
                </Text>
              </View>

              {/* Category Selection */}
              <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {CATEGORIES[feedbackType].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: category === cat ? typeColor : SURFACE,
                      borderWidth: 1, borderColor: category === cat ? typeColor : "rgba(30,41,59,0.6)",
                    }}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={{ color: category === cat ? FG : MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject */}
              <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Subject</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief summary of your feedback"
                placeholderTextColor={MUTED}
                maxLength={100}
                returnKeyType="next"
                style={{
                  backgroundColor: SURFACE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  color: FG, fontSize: 14, fontFamily: "DMSans_500Medium",
                  borderWidth: 1, borderColor: "rgba(30,41,59,0.6)", marginBottom: 4,
                }}
              />
              <Text style={{ color: MUTED, fontSize: 10, textAlign: "right", marginBottom: 16 }}>{subject.length}/100</Text>

              {/* Description */}
              <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={
                  feedbackType === "bug"
                    ? "What happened? What did you expect? Steps to reproduce..."
                    : feedbackType === "suggestion"
                    ? "Describe your idea and how it would improve the app..."
                    : feedbackType === "question"
                    ? "What do you need help with?"
                    : "What do you love about PeakPulse?"
                }
                placeholderTextColor={MUTED}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
                style={{
                  backgroundColor: SURFACE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  color: FG, fontSize: 14, fontFamily: "DMSans_500Medium", minHeight: 140,
                  borderWidth: 1, borderColor: "rgba(30,41,59,0.6)", marginBottom: 4,
                }}
              />
              <Text style={{ color: MUTED, fontSize: 10, textAlign: "right", marginBottom: 20 }}>{description.length}/1000</Text>

              {/* Device Info Note */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: SURFACE2, borderRadius: 10, padding: 10, marginBottom: 20 }}>
                <MaterialIcons name="info" size={16} color={MUTED} />
                <Text style={{ color: MUTED, fontSize: 11, flex: 1, lineHeight: 16 }}>
                  Device info and app version will be included automatically to help us investigate.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: submitting ? SURFACE2 : typeColor, borderRadius: 16, paddingVertical: 16,
                  alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
                  shadowColor: typeColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
                  opacity: submitting ? 0.7 : 1,
                }}
                onPress={handleSubmit} {...a11yButton("Submit feedback")}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={FG} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={18} color={FG} />
                    <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Submit Feedback</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <View style={{ paddingHorizontal: 20, alignItems: "center", paddingTop: 40 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${MINT}15`, alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 2, borderColor: `${MINT}40` }}>
                <MaterialIcons name="check-circle" size={40} color={MINT} />
              </View>
              <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 26, marginBottom: 8 }}>Thank You!</Text>
              <Text style={{ color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 32, maxWidth: 280 }}>
                Your feedback has been recorded. We review all submissions to improve PeakPulse.
              </Text>

              <TouchableOpacity
                style={{ backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12, shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                onPress={() => setStep("type")}
              >
                <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Submit Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 24 }}
                onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
                <Text style={{ color: MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>Back to Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 4: History */}
          {step === "history" && (
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 24, marginBottom: 16 }}>Feedback History</Text>

              {history.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 40 }}>
                  <MaterialIcons name="inbox" size={48} color={MUTED} />
                  <Text style={{ color: MUTED, fontSize: 14, marginTop: 12 }}>No feedback submitted yet</Text>
                </View>
              ) : (
                history.map(entry => {
                  const ft = FEEDBACK_TYPES.find(t => t.key === entry.type);
                  return (
                    <View
                      key={entry.id}
                      style={{ backgroundColor: SURFACE, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: `${ft?.color ?? MUTED}15`, alignItems: "center", justifyContent: "center" }}>
                            <MaterialIcons name={(ft?.icon ?? "feedback") as any} size={14} color={ft?.color ?? MUTED} />
                          </View>
                          <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{entry.subject}</Text>
                        </View>
                        <View style={{ backgroundColor: entry.status === "acknowledged" ? `${MINT}15` : SURFACE2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: entry.status === "acknowledged" ? MINT : MUTED, fontSize: 9, fontFamily: "DMSans_600SemiBold", textTransform: "uppercase" }}>{entry.status}</Text>
                        </View>
                      </View>
                      <Text style={{ color: MUTED, fontSize: 12, lineHeight: 16 }} numberOfLines={2}>{entry.description}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <Text style={{ color: MUTED, fontSize: 10 }}>{entry.category}</Text>
                        <Text style={{ color: MUTED, fontSize: 10 }}>•</Text>
                        <Text style={{ color: MUTED, fontSize: 10 }}>{new Date(entry.timestamp).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
    </ImageBackground>
  );
}
