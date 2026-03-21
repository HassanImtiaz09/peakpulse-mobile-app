import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Platform,
  ImageBackground, Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { scheduleAllDefaultReminders } from "@/lib/notifications";

const CHALLENGE_KEY = "@seven_day_challenge";
const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

interface DayTask {
  day: number;
  title: string;
  description: string;
  icon: string;
  tasks: string[];
  xp: number;
}

const CHALLENGE_DAYS: DayTask[] = [
  {
    day: 1, title: "Foundation Day", icon: "🏁", xp: 50,
    description: "Set up your profile and complete your first body scan",
    tasks: ["Complete AI body scan", "Set your target body fat %", "Choose workout style"],
  },
  {
    day: 2, title: "First Workout", icon: "💪", xp: 75,
    description: "Complete your first AI-generated workout session",
    tasks: ["Open your workout plan", "Complete at least 1 exercise", "Log your workout"],
  },
  {
    day: 3, title: "Fuel Up", icon: "🥗", xp: 60,
    description: "Log all your meals and hit your calorie target",
    tasks: ["Log breakfast", "Log lunch", "Log dinner", "Stay within 200 kcal of goal"],
  },
  {
    day: 4, title: "Form Check", icon: "🎯", xp: 80,
    description: "Use the AI form checker on one exercise",
    tasks: ["Open Form Checker", "Record yourself doing an exercise", "Get AI form score of 60+"],
  },
  {
    day: 5, title: "Progress Photo", icon: "📸", xp: 70,
    description: "Take your first progress photo and get AI feedback",
    tasks: ["Take a progress photo", "Read your AI body assessment", "Note your starting weight"],
  },
  {
    day: 6, title: "Community", icon: "🤝", xp: 65,
    description: "Join the community and share your first post",
    tasks: ["Open the Social Feed", "Like 3 posts from other members", "Share your Day 1 stats"],
  },
  {
    day: 7, title: "Champion!", icon: "🏆", xp: 100,
    description: "Complete a full workout + meal log to finish the challenge",
    tasks: ["Complete a full workout session", "Log all 3 meals", "Take a Day 7 progress photo"],
  },
];

export default function ChallengeOnboardingScreen() {
  const router = useRouter();
  const [challengeData, setChallengeData] = useState<Record<number, boolean[]>>({});
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    loadChallenge();
    // Pulse animation for active day
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function loadChallenge() {
    const raw = await AsyncStorage.getItem(CHALLENGE_KEY);
    if (raw) setChallengeData(JSON.parse(raw));
  }

  async function toggleTask(day: number, taskIdx: number) {
    const updated = { ...challengeData };
    if (!updated[day]) updated[day] = new Array(CHALLENGE_DAYS[day - 1].tasks.length).fill(false);
    updated[day][taskIdx] = !updated[day][taskIdx];
    setChallengeData(updated);
    await AsyncStorage.setItem(CHALLENGE_KEY, JSON.stringify(updated));
  }

  async function enableNotifications() {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Push notifications are not available on web.");
      return;
    }
    await scheduleAllDefaultReminders();
    setNotifEnabled(true);
    Alert.alert("🔔 Reminders Set!", "You'll get daily workout reminders at 8am, meal log nudges at 12:30pm, and check-in reminders at 7am.");
  }

  function getDayStatus(day: number): "locked" | "active" | "complete" {
    const tasks = challengeData[day] ?? [];
    const dayTasks = CHALLENGE_DAYS[day - 1].tasks;
    if (tasks.filter(Boolean).length === dayTasks.length) return "complete";
    // Day is active if previous day is complete or it's day 1
    if (day === 1) return "active";
    const prevTasks = challengeData[day - 1] ?? [];
    const prevDayTasks = CHALLENGE_DAYS[day - 2].tasks;
    if (prevTasks.filter(Boolean).length === prevDayTasks.length) return "active";
    return "locked";
  }

  function getTotalXP(): number {
    return CHALLENGE_DAYS.reduce((total, day) => {
      const tasks = challengeData[day.day] ?? [];
      const dayTasks = day.tasks;
      if (tasks.filter(Boolean).length === dayTasks.length) return total + day.xp;
      return total;
    }, 0);
  }

  const completedDays = CHALLENGE_DAYS.filter(d => getDayStatus(d.day) === "complete").length;
  const totalXP = getTotalXP();

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero */}
      <ImageBackground source={{ uri: HERO_BG }} style={{ height: 200 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, left: 20, backgroundColor: "#FFFFFF20", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#FFF7ED", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>7-DAY CHALLENGE</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26 }}>Your First Week</Text>
          <Text style={{ color: "#B45309", fontSize: 13, marginTop: 4 }}>Complete 7 days to unlock Advanced free for 1 month</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={{ margin: 20, backgroundColor: "#150A00", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <View>
              <Text style={{ color: "#B45309", fontSize: 12 }}>Progress</Text>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>{completedDays}/7 Days</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "#B45309", fontSize: 12 }}>XP Earned</Text>
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>⚡ {totalXP} XP</Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 4, overflow: "hidden" }}>
            <View style={{ height: 8, backgroundColor: "#FDE68A", borderRadius: 4, width: `${(completedDays / 7) * 100}%` }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            {CHALLENGE_DAYS.map(d => {
              const status = getDayStatus(d.day);
              return (
                <View key={d.day} style={{
                  width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
                  backgroundColor: status === "complete" ? "#FDE68A" : status === "active" ? "#FDE68A" : "rgba(245,158,11,0.10)",
                }}>
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 11 }}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Notification CTA */}
        {!notifEnabled && (
          <TouchableOpacity
            style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)", flexDirection: "row", alignItems: "center", gap: 12 }}
            onPress={enableNotifications}
          >
            <Text style={{ fontSize: 28 }}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Enable Daily Reminders</Text>
              <Text style={{ color: "#B45309", fontSize: 12, marginTop: 2 }}>Daily reminders to keep you on track</Text>
            </View>
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold" }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Day Cards */}
        {CHALLENGE_DAYS.map((day) => {
          const status = getDayStatus(day.day);
          const tasks = challengeData[day.day] ?? [];
          const completedTasks = tasks.filter(Boolean).length;
          const isExpanded = expandedDay === day.day;

          return (
            <View key={day.day} style={{ marginHorizontal: 20, marginBottom: 10 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: status === "complete" ? "#052e16" : status === "active" ? "#150A00" : "#150A00",
                  borderRadius: 16, padding: 16,
                  borderWidth: 2,
                  borderColor: status === "complete" ? "#FDE68A" : status === "active" ? "#FDE68A" : "rgba(245,158,11,0.10)",
                  opacity: status === "locked" ? 0.5 : 1,
                }}
                onPress={() => status !== "locked" && setExpandedDay(isExpanded ? null : day.day)}
                activeOpacity={status === "locked" ? 1 : 0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{
                    width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
                    backgroundColor: status === "complete" ? "rgba(245,158,11,0.10)" : status === "active" ? "#F59E0B20" : "rgba(245,158,11,0.10)",
                  }}>
                    <Text style={{ fontSize: 22 }}>
                      {status === "complete" ? "✅" : status === "locked" ? "🔒" : day.icon}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold" }}>DAY {day.day}</Text>
                      <View style={{ backgroundColor: status === "complete" ? "rgba(245,158,11,0.10)" : "#F59E0B20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: status === "complete" ? "#FDE68A" : "#FDE68A", fontSize: 10, fontFamily: "Outfit_700Bold" }}>+{day.xp} XP</Text>
                      </View>
                    </View>
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>{day.title}</Text>
                    <Text style={{ color: "#B45309", fontSize: 12, marginTop: 2 }}>{completedTasks}/{day.tasks.length} tasks</Text>
                  </View>
                  {status !== "locked" && (
                    <Text style={{ color: "#B45309", fontSize: 18 }}>{isExpanded ? "▲" : "▼"}</Text>
                  )}
                </View>

                {/* Task checklist */}
                {isExpanded && status !== "locked" && (
                  <View style={{ marginTop: 16, gap: 8 }}>
                    <Text style={{ color: "#B45309", fontSize: 12, marginBottom: 4 }}>{day.description}</Text>
                    {day.tasks.map((task, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#150A00", borderRadius: 12 }}
                        onPress={() => toggleTask(day.day, idx)}
                      >
                        <View style={{
                          width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                          borderColor: tasks[idx] ? "#FDE68A" : "rgba(245,158,11,0.15)",
                          backgroundColor: tasks[idx] ? "#FDE68A" : "transparent",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          {tasks[idx] && <Text style={{ color: "#FFF7ED", fontSize: 12, fontFamily: "Outfit_700Bold" }}>✓</Text>}
                        </View>
                        <Text style={{ color: tasks[idx] ? "#B45309" : "#D1D5DB", fontSize: 14, flex: 1, textDecorationLine: tasks[idx] ? "line-through" : "none" }}>
                          {task}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Reward Banner */}
        <View style={{ marginHorizontal: 20, marginTop: 8, backgroundColor: "#F59E0B10", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#F59E0B30" }}>
          <Text style={{ color: "#FDE68A", fontFamily: "Outfit_800ExtraBold", fontSize: 14, textAlign: "center" }}>🏆 Complete All 7 Days</Text>
          <Text style={{ color: "#B45309", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 }}>
            Finish the challenge to unlock <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold" }}>Advanced Plan free for 30 days</Text> + earn the "Week 1 Warrior" badge
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
