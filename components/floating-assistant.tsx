/**
 * FloatingAssistant — Persistent AI companion FAB + expandable chat dialog
 *
 * Free tier:  template greetings, basic chat, navigation guidance
 * Premium:    AI-powered greetings, deep context-aware coaching, form memory, body/meal insights
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  Modal, Dimensions, Platform, ActivityIndicator,
  KeyboardAvoidingView, Keyboard, StyleSheet, Alert,
  AppState,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  Easing, interpolate, runOnJS,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { trpc } from "@/lib/trpc";
import { useSubscription } from "@/hooks/use-subscription";
import { getGreeting, type GreetingData } from "@/lib/assistant-greetings";
import { classifyIntent, type NavigationIntent } from "@/lib/assistant-navigation";

const { width: W, height: H } = Dimensions.get("window");

const SF = {
  bg: "#0A0E14",
  surface: "#141A22",
  surface2: "#1F0D00",
  border: "rgba(245,158,11,0.12)",
  border2: "rgba(245,158,11,0.22)",
  fg: "#F1F5F9",
  muted: "#B45309",
  gold: "#F59E0B",
  gold2: "#FBBF24",
  gold3: "#FDE68A",
  goldDim: "rgba(245,158,11,0.10)",
};

type ChatMessage = { role: "user" | "assistant"; content: string; isNav?: boolean };

const QUICK_ACTION_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  "My meals": "restaurant",
  "My workouts": "fitness-center",
  "Body scan": "photo-camera",
  "Check my form": "center-focus-strong",
  "Workout history": "calendar-today",
  "AI Coach": "smart-toy",
};

const QUICK_ACTIONS = [
  { label: "My meals", icon: "restaurant" },
  { label: "My workouts", icon: "fitness-center" },
  { label: "Body scan", icon: "photo-camera" },
  { label: "Check my form", icon: "center-focus-strong" },
  { label: "Workout history", icon: "calendar-today" },
  { label: "AI Coach", icon: "smart-toy" },
];

// Screens where the FAB should be hidden
const HIDDEN_SCREENS = [
  "/onboarding", "/subscription-plans", "/subscription",
  "/oauth/callback", "/ai-coach",
];

export function FloatingAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const subscription = useSubscription();
  const chatMutation = trpc.aiCoach.chat.useMutation();

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [showGreeting, setShowGreeting] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatListRef = useRef<FlatList>(null);
  const lastActiveRef = useRef<number>(Date.now());

  // Animation values
  const fabScale = useSharedValue(1);
  const greetingOpacity = useSharedValue(0);
  const greetingTranslateY = useSharedValue(10);
  const pulseAnim = useSharedValue(0);

  // Load profile data for context
  useEffect(() => {
    loadProfileData();
  }, []);

  async function loadProfileData() {
    try {
      const [guestRaw, workoutCountRaw, streakRaw, scanRaw, mealRaw, wearableRaw, calorieRaw, pantryRaw, workoutPlanRaw] = await Promise.all([
        AsyncStorage.getItem("@guest_profile"),
        AsyncStorage.getItem("@workout_count"),
        AsyncStorage.getItem("@streak_count"),
        AsyncStorage.getItem("@body_scan_history"),
        AsyncStorage.getItem("@meal_log"),
        AsyncStorage.getItem("@wearable_stats"),
        AsyncStorage.getItem("@calorie_data"),
        AsyncStorage.getItem("@pantry_items"),
        AsyncStorage.getItem("@workout_plan"),
      ]);
      const guestProfile = guestRaw ? JSON.parse(guestRaw) : {};
      const scanHistory = scanRaw ? JSON.parse(scanRaw) : [];
      const mealLog = mealRaw ? JSON.parse(mealRaw) : [];
      const wearableStats = wearableRaw ? JSON.parse(wearableRaw) : null;
      const calorieData = calorieRaw ? JSON.parse(calorieRaw) : null;
      const pantryItems = pantryRaw ? JSON.parse(pantryRaw) : [];
      const workoutPlan = workoutPlanRaw ? JSON.parse(workoutPlanRaw) : null;

      // Count today's meals
      const today = new Date().toISOString().split("T")[0];
      const todayMeals = mealLog.filter((m: any) => m.date?.startsWith(today));
      // Count expiring pantry items (within 3 days)
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      const expiringCount = pantryItems.filter((p: any) => {
        if (!p.expiryDate) return false;
        const exp = new Date(p.expiryDate).getTime();
        return exp > now && exp - now < threeDays;
      }).length;
      // Check if there's a workout scheduled today
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const todayDay = dayNames[new Date().getDay()];
      const hasWorkoutToday = workoutPlan?.schedule?.some((s: any) => s.day?.toLowerCase().includes(todayDay)) ?? false;

      setProfile({
        name: guestProfile?.name ?? "there",
        goal: guestProfile?.goal ?? "general fitness",
        weightKg: guestProfile?.weightKg,
        workoutsCompleted: workoutCountRaw ? parseInt(workoutCountRaw) : 0,
        streakDays: streakRaw ? parseInt(streakRaw) : 0,
        totalScans: scanHistory.length,
        totalMeals: mealLog.length,
        lastScanBF: scanHistory.length > 0 ? scanHistory[scanHistory.length - 1]?.estimatedBodyFat : null,
        todayCalories: calorieData?.todayCalories ?? todayMeals.reduce((s: number, m: any) => s + (m.calories ?? 0), 0),
        calorieGoal: calorieData?.calorieGoal ?? null,
        todayMealsLogged: todayMeals.length,
        hasWorkoutToday,
        wearableSteps: wearableStats?.steps ?? 0,
        wearableCaloriesBurnt: wearableStats?.totalCaloriesBurnt ?? 0,
        wearableSleepHours: wearableStats?.sleepHours ?? 0,
        pantryExpiringCount: expiringCount,
      });
    } catch {}
  }

  // Generate greeting on mount
  useEffect(() => {
    generateGreeting();
  }, []);

  async function generateGreeting() {
    try {
      const data: GreetingData = {
        name: profile.name ?? "there",
        streakDays: profile.streakDays ?? 0,
        workoutsCompleted: profile.workoutsCompleted ?? 0,
        totalScans: profile.totalScans ?? 0,
        totalMeals: profile.totalMeals ?? 0,
        lastScanBF: profile.lastScanBF,
        goal: profile.goal ?? "general fitness",
        todayCalories: profile.todayCalories,
        calorieGoal: profile.calorieGoal,
        todayMealsLogged: profile.todayMealsLogged,
        hasWorkoutToday: profile.hasWorkoutToday,
        wearableSteps: profile.wearableSteps,
        wearableCaloriesBurnt: profile.wearableCaloriesBurnt,
        wearableSleepHours: profile.wearableSleepHours,
        pantryExpiringCount: profile.pantryExpiringCount,
      };
      const greetingText = getGreeting(data);
      setGreeting(greetingText);

      // Show greeting bubble after a short delay
      setTimeout(() => {
        setShowGreeting(true);
        greetingOpacity.value = withTiming(1, { duration: 400 });
        greetingTranslateY.value = withTiming(0, { duration: 400 });

        // Auto-hide after 5 seconds
        setTimeout(() => {
          greetingOpacity.value = withTiming(0, { duration: 300 });
          greetingTranslateY.value = withTiming(10, { duration: 300 });
          setTimeout(() => setShowGreeting(false), 300);
        }, 5000);
      }, 1500);
    } catch {}
  }

  // Pulse animation for the FAB
  useEffect(() => {
    const interval = setInterval(() => {
      pulseAnim.value = withTiming(1, { duration: 1000 }, () => {
        pulseAnim.value = withTiming(0, { duration: 1000 });
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Proactive nudge: detect when user returns after inactivity
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const now = Date.now();
        const elapsed = now - lastActiveRef.current;
        const hoursAway = elapsed / (1000 * 60 * 60);
        // If user was away for 4+ hours, show a welcome-back nudge
        if (hoursAway >= 4 && profile.name) {
          const nudges = [
            `Welcome back, ${profile.name.split(" ")[0]}! ${profile.streakDays > 0 ? `Your ${profile.streakDays}-day streak is still alive!` : "Ready to get back on track?"}`,
            `Hey ${profile.name.split(" ")[0]}! ${hoursAway > 24 ? "Missed you! Let's pick up where you left off." : "Good to see you again!"}`,
            `${profile.name.split(" ")[0]}! ${profile.workoutsCompleted > 0 ? `${profile.workoutsCompleted} workouts done so far. Time for the next one?` : "Your fitness journey continues!"}`,
          ];
          const nudge = nudges[Math.floor(Math.random() * nudges.length)];
          setGreeting(nudge);
          setShowGreeting(true);
          greetingOpacity.value = withTiming(1, { duration: 400 });
          greetingTranslateY.value = withTiming(0, { duration: 400 });
          setTimeout(() => {
            greetingOpacity.value = withTiming(0, { duration: 300 });
            greetingTranslateY.value = withTiming(10, { duration: 300 });
            setTimeout(() => setShowGreeting(false), 300);
          }, 6000);
        }
        lastActiveRef.current = now;
      } else if (state === "background") {
        lastActiveRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [profile]);

  // Text-to-speech for assistant responses
  function speakResponse(text: string) {
    if (Platform.OS === "web") return;
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(text, {
      rate: 0.95,
      pitch: 1.05,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  function stopSpeaking() {
    Speech.stop();
    setIsSpeaking(false);
  }

  const handleOpen = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGreeting(false);
    setIsOpen(true);
    fabScale.value = withSpring(0.9, {}, () => {
      fabScale.value = withSpring(1);
    });
    // Refresh profile data when opening
    loadProfileData();
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Send message
  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    Keyboard.dismiss();

    // Check for navigation intent first
    const navIntent = classifyIntent(msg);
    if (navIntent) {
      const navMsg: ChatMessage = { role: "user", content: msg };
      const navReply: ChatMessage = {
        role: "assistant",
        content: `Taking you to ${navIntent.label}...`,
        isNav: true,
      };
      setMessages(prev => [...prev, navMsg, navReply]);
      setTimeout(() => {
        setIsOpen(false);
        router.push(navIntent.route as any);
      }, 600);
      return;
    }

    // Regular chat
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Build context based on subscription tier
      const isPremium = subscription.hasAdvancedAccess;
      const contextProfile: any = {
        goal: profile.goal,
        workoutsCompleted: profile.workoutsCompleted,
      };

      if (isPremium) {
        // Premium users get full context
        contextProfile.currentBF = profile.lastScanBF;
        contextProfile.streakDays = profile.streakDays;
        contextProfile.totalMeals = profile.totalMeals;
        contextProfile.totalScans = profile.totalScans;

        // Load form history for premium
        try {
          const formRaw = await AsyncStorage.getItem("@form_check_history");
          if (formRaw) {
            const formHistory = JSON.parse(formRaw);
            const recentForms = formHistory.slice(-5);
            contextProfile.recentFormScores = recentForms.map((f: any) =>
              `${f.exercise ?? "Unknown"}: ${f.score ?? 0}/100`
            ).join(", ");
          }
        } catch {}

        // Load recent meal data for premium
        try {
          const mealRaw = await AsyncStorage.getItem("@meal_log");
          if (mealRaw) {
            const meals = JSON.parse(mealRaw);
            const recentMeals = meals.slice(-3);
            contextProfile.recentMeals = recentMeals.map((m: any) =>
              `${m.name ?? "meal"}: ${m.calories ?? "?"}cal`
            ).join(", ");
          }
        } catch {}
      }

      const result = await chatMutation.mutateAsync({
        message: msg,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        profile: contextProfile,
      });

      const updated: ChatMessage[] = [...newMessages, { role: "assistant", content: result.reply }];
      setMessages(updated);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      const fallback: ChatMessage[] = [
        ...newMessages,
        { role: "assistant", content: "Sorry, I couldn't respond right now. Try again in a moment." },
      ];
      setMessages(fallback);
    } finally {
      setLoading(false);
    }
  }

  // Animated styles
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 0.5, 1], [0, 0.3, 0]),
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [1, 1.6]) }],
  }));

  const greetingAnimStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [{ translateY: greetingTranslateY.value }],
  }));

  // Hide on certain screens
  if (HIDDEN_SCREENS.some(s => pathname.startsWith(s))) return null;

  const isPremium = subscription.hasAdvancedAccess;

  return (
    <>
      {/* Greeting Bubble */}
      {showGreeting && greeting && !isOpen && (
        <Animated.View style={[styles.greetingBubble, greetingAnimStyle]}>
          <TouchableOpacity
            onPress={handleOpen}
            activeOpacity={0.9}
            style={styles.greetingInner}
          >
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.greetingTap}>Tap to chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.greetingClose}
            onPress={() => {
              greetingOpacity.value = withTiming(0, { duration: 200 });
              setTimeout(() => setShowGreeting(false), 200);
            }}
          >
            <MaterialIcons name="close" size={14} color={SF.muted} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* FAB */}
      {!isOpen && (
        <Animated.View style={[styles.fabContainer, fabAnimStyle]}>
          {/* Pulse ring */}
          <Animated.View style={[styles.pulseRing, pulseStyle]} />
          <TouchableOpacity
            style={styles.fab}
            onPress={handleOpen}
            activeOpacity={0.85}
          >
            <Text style={styles.fabIcon}>✨</Text>
          </TouchableOpacity>
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Chat Dialog Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleClose} activeOpacity={1} />

          <View style={styles.chatContainer}>
            {/* Header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.chatAvatar}>
                  <Text style={{ fontSize: 20 }}>✨</Text>
                </View>
                <View>
                  <Text style={styles.chatTitle}>PeakPulse AI</Text>
                  <Text style={styles.chatSubtitle}>
                    {isPremium ? "Premium Coach • Full Context" : "Your Fitness Companion"}
                  </Text>
                </View>
              </View>
              <View style={styles.chatHeaderRight}>
                {isPremium && (
                  <TouchableOpacity
                    style={styles.deepInsightsBtn}
                    onPress={() => {
                      setIsOpen(false);
                      router.push("/ai-coach" as any);
                    }}
                  >
                    <Text style={styles.deepInsightsBtnText}>📊 Deep Insights</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={22} color={SF.fg} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
                <Text style={styles.emptyTitle}>
                  Hey{profile.name ? `, ${profile.name}` : ""}!
                </Text>
                <Text style={styles.emptySubtitle}>
                  {isPremium
                    ? "I have full access to your form history, body scans, and meal logs. Ask me anything!"
                    : "Ask me about workouts, nutrition, or tap a quick action below."}
                </Text>

                {/* Quick Actions */}
                <View style={styles.quickActionsGrid}>
                  {QUICK_ACTIONS.map((action, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.quickActionChip}
                      onPress={() => sendMessage(action.label)}
                    >
                      <MaterialIcons name={action.icon as any} size={16} color={SF.gold2} />
                      <Text style={styles.quickActionText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {!isPremium && (
                  <TouchableOpacity
                    style={styles.upgradeBanner}
                    onPress={() => {
                      setIsOpen(false);
                      router.push("/subscription" as any);
                    }}
                  >
                    <Text style={styles.upgradeBannerText}>
                      ⭐ Upgrade for AI-powered greetings, form memory, and deep coaching insights
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                ref={chatListRef}
                data={messages}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={styles.messagesList}
                renderItem={({ item }) => (
                  <View style={[
                    styles.messageBubbleRow,
                    item.role === "user" ? styles.userRow : styles.assistantRow,
                  ]}>
                    {item.role === "assistant" && (
                      <View style={styles.msgAvatar}>
                        <Text style={{ fontSize: 14 }}>✨</Text>
                      </View>
                    )}
                    <View style={[
                      styles.messageBubble,
                      item.role === "user" ? styles.userBubble : styles.assistantBubble,
                      item.isNav && styles.navBubble,
                    ]}>
                      <Text style={[
                        styles.messageText,
                        item.role === "user" ? styles.userText : styles.assistantText,
                      ]}>
                        {item.content}
                      </Text>
                    </View>
                  </View>
                )}
                ListFooterComponent={loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={SF.gold} size="small" />
                    <Text style={styles.loadingText}>Thinking...</Text>
                  </View>
                ) : null}
              />
            )}

            {/* Input Bar */}
            <View style={styles.inputBar}>
              {/* Voice / Stop Speaking button */}
              {isSpeaking ? (
                <TouchableOpacity
                  style={styles.voiceBtn}
                  onPress={stopSpeaking}
                >
                  <MaterialIcons name="volume-off" size={20} color={SF.gold} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.voiceBtn}
                  onPress={() => {
                    // Read out the last assistant message
                    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
                    if (lastAssistant) speakResponse(lastAssistant.content);
                    else speakResponse("Hi! Ask me anything about your fitness journey.");
                  }}
                >
                  <MaterialIcons name="volume-up" size={20} color={SF.muted} />
                </TouchableOpacity>
              )}
              <TextInput
                style={styles.textInput}
                placeholder="Ask me anything..."
                placeholderTextColor={SF.muted}
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => sendMessage()}
              />
              <TouchableOpacity
                style={[styles.sendBtn, input.trim() ? styles.sendBtnActive : {}]}
                onPress={() => sendMessage()}
                disabled={!input.trim() || loading}
              >
                <MaterialIcons
                  name="send"
                  size={20}
                  color={input.trim() ? SF.bg : SF.muted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // FAB
  fabContainer: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 80 : 100,
    right: 16,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SF.gold,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245,158,11,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: SF.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.40)",
  },
  fabIcon: {
    fontSize: 22,
  },
  premiumBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  premiumBadgeText: {
    color: "#FFF",
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
    letterSpacing: 0.5,
  },

  // Greeting Bubble
  greetingBubble: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 145 : 165,
    right: 16,
    zIndex: 999,
    maxWidth: W * 0.7,
  },
  greetingInner: {
    backgroundColor: SF.surface,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: SF.border2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  greetingText: {
    color: SF.fg,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  greetingTap: {
    color: SF.gold,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    marginTop: 6,
  },
  greetingClose: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: SF.surface2,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 0.15,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  chatContainer: {
    flex: 0.85,
    backgroundColor: SF.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },

  // Header
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: SF.border,
    backgroundColor: SF.surface,
  },
  chatHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SF.goldDim,
    borderWidth: 1,
    borderColor: SF.border2,
    alignItems: "center",
    justifyContent: "center",
  },
  chatTitle: {
    color: SF.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  chatSubtitle: {
    color: SF.gold,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  chatHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deepInsightsBtn: {
    backgroundColor: SF.goldDim,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: SF.border2,
  },
  deepInsightsBtnText: {
    color: SF.gold2,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    color: SF.fg,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: SF.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  quickActionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: SF.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: SF.border2,
  },
  quickActionText: {
    color: SF.fg,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },

  // Upgrade banner
  upgradeBanner: {
    backgroundColor: SF.goldDim,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: SF.border2,
    marginHorizontal: 16,
  },
  upgradeBannerText: {
    color: SF.gold2,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  // Messages
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  userRow: {
    flexDirection: "row-reverse",
  },
  assistantRow: {
    flexDirection: "row",
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SF.goldDim,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "78%",
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: SF.gold,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: SF.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: SF.border2,
  },
  navBubble: {
    backgroundColor: SF.goldDim,
    borderColor: SF.gold,
  },
  messageText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: SF.bg,
  },
  assistantText: {
    color: SF.fg,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 36,
    marginBottom: 12,
  },
  loadingText: {
    color: SF.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: SF.surface,
    borderTopWidth: 1,
    borderTopColor: SF.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: SF.surface2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: SF.fg,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    borderWidth: 1,
    borderColor: SF.border2,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SF.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: SF.border,
  },
  sendBtnActive: {
    backgroundColor: SF.gold,
    borderColor: SF.gold,
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: SF.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: SF.border,
  },
});
