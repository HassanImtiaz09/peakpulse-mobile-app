import { useState, useCallback, useMemo, useRef } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator,
  Platform, Modal, FlatList, Alert, ImageBackground, Dimensions,
} from "react-native";
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

import { GOLDEN_WORKOUT } from "@/constants/golden-backgrounds";
import { UI as SF } from "@/constants/ui-colors";
import { a11yButton, a11yHeader } from "@/lib/accessibility";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Types ─────────────────────────────────────────────────────────
interface WorkoutSession {
  id?: number;
  dayName?: string;
  focus?: string;
  completedExercisesJson?: string;
  durationMinutes?: number;
  completedAt: string | Date;
}

interface WorkoutLogEntry {
  id: string;
  workout: { type: string; title?: string; durationMinutes: number; caloriesBurned?: number; startDate: string };
  loggedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  return new Date(d);
}

function formatDisplayDate(dk: string): string {
  const [y, m, d] = dk.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Heatmap Data Builder (13 weeks) ──────────────────────────────
interface HeatmapDay {
  date: string;
  count: number;
  dayOfWeek: number; // 0=Mon, 6=Sun (ISO)
  weekIndex: number;
}

function buildHeatmapData(sessionsByDate: Record<string, any[]>): { days: HeatmapDay[]; months: { label: string; colStart: number }[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 90); // 13 weeks

  const days: HeatmapDay[] = [];
  const monthLabels: { label: string; colStart: number }[] = [];
  let lastMonth = -1;

  for (let i = 0; i <= 90; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dk = dateKey(d);
    let dow = d.getDay() - 1; // Mon=0
    if (dow < 0) dow = 6;
    const weekIdx = Math.floor(i / 7);

    days.push({
      date: dk,
      count: (sessionsByDate[dk] ?? []).length,
      dayOfWeek: dow,
      weekIndex: weekIdx,
    });

    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ label: MONTHS_SHORT[d.getMonth()], colStart: weekIdx });
      lastMonth = d.getMonth();
    }
  }

  return { days, months: monthLabels };
}

function heatmapColor(count: number): string {
  if (count === 0) return "rgba(245,158,11,0.06)";
  if (count === 1) return "rgba(245,158,11,0.3)";
  if (count === 2) return "rgba(245,158,11,0.55)";
  return "#F59E0B"; // 3+
}

// ══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════
export default function WorkoutCalendarScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [localSessions, setLocalSessions] = useState<WorkoutSession[]>([]);
  const [logEntries, setLogEntries] = useState<WorkoutLogEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "heatmap">("calendar");

  // Fetch from server for authenticated users
  const sessionsQuery = trpc.workoutPlan.getAllSessions.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Load local sessions + log history for guests
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("@workout_sessions_local").then((raw) => {
        if (raw) {
          try { setLocalSessions(JSON.parse(raw)); } catch { setLocalSessions([]); }
        }
      });
      AsyncStorage.getItem("@workout_log_history").then((raw) => {
        if (raw) {
          try { setLogEntries(JSON.parse(raw)); } catch { setLogEntries([]); }
        }
      });
    }, [])
  );

  // Merge all workout data into a unified date map
  const allSessions: WorkoutSession[] = useMemo(() => {
    const server = (sessionsQuery.data ?? []) as WorkoutSession[];
    return [...server, ...localSessions];
  }, [sessionsQuery.data, localSessions]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, WorkoutSession[]> = {};
    for (const s of allSessions) {
      const key = dateKey(parseDate(s.completedAt));
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    // Also merge log entries
    for (const entry of logEntries) {
      const key = entry.loggedAt ? entry.loggedAt.substring(0, 10) : dateKey(new Date(entry.workout.startDate));
      if (!map[key]) map[key] = [];
      // Convert to WorkoutSession shape
      map[key].push({
        dayName: entry.workout.title || entry.workout.type,
        durationMinutes: entry.workout.durationMinutes,
        completedAt: entry.loggedAt || entry.workout.startDate,
      });
    }
    return map;
  }, [allSessions, logEntries]);

  // ── Streak Calculation ──────────────────────────────────────────
  const { currentStreak, longestStreak, totalWorkouts, thisMonthCount, activeDays } = useMemo(() => {
    const workoutDates = new Set(Object.keys(sessionsByDate));
    const total = Object.values(sessionsByDate).reduce((sum, arr) => sum + arr.length, 0);

    // Current streak: consecutive days ending today (or yesterday)
    let current = 0;
    const today = new Date();
    let checkDate = new Date(today);
    if (!workoutDates.has(dateKey(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (workoutDates.has(dateKey(checkDate))) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Longest streak
    const sortedDates = Array.from(workoutDates).sort();
    let longest = 0;
    let streak = 0;
    let prevDate: Date | null = null;
    for (const ds of sortedDates) {
      const d = new Date(ds + "T00:00:00");
      if (prevDate) {
        const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (Math.abs(diff - 1) < 0.1) {
          streak++;
        } else {
          streak = 1;
        }
      } else {
        streak = 1;
      }
      if (streak > longest) longest = streak;
      prevDate = d;
    }

    // This month count
    const monthKey = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}`;
    let monthCount = 0;
    for (const dk of Object.keys(sessionsByDate)) {
      if (dk.startsWith(monthKey)) monthCount += sessionsByDate[dk].length;
    }

    return {
      currentStreak: current,
      longestStreak: longest,
      totalWorkouts: total,
      thisMonthCount: monthCount,
      activeDays: workoutDates.size,
    };
  }, [sessionsByDate, currentMonth]);

  // ── Calendar Grid ───────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDow = firstDay.getDay() - 1; // Mon=0
    if (startDow < 0) startDow = 6;

    const cells: Array<{ day: number | null; key: string; isToday: boolean; hasWorkout: boolean; workoutCount: number; isFuture: boolean }> = [];

    for (let i = 0; i < startDow; i++) {
      cells.push({ day: null, key: `empty-${i}`, isToday: false, hasWorkout: false, workoutCount: 0, isFuture: false });
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      const cellDate = new Date(year, month, d);
      const isFuture = cellDate > today;
      const sessions = sessionsByDate[dk] ?? [];
      cells.push({ day: d, key: dk, isToday, hasWorkout: sessions.length > 0, workoutCount: sessions.length, isFuture });
    }

    return cells;
  }, [currentMonth, sessionsByDate]);

  // ── Heatmap Data ────────────────────────────────────────────────
  const heatmapData = useMemo(() => buildHeatmapData(sessionsByDate), [sessionsByDate]);

  // ── Month Navigation ────────────────────────────────────────────
  function navigateMonth(delta: number) {
    setCurrentMonth(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handleDayPress(dk: string) {
    if (sessionsByDate[dk] && sessionsByDate[dk].length > 0) {
      setSelectedDay(dk);
      setDetailModalVisible(true);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }

  const selectedSessions = selectedDay ? (sessionsByDate[selectedDay] ?? []) : [];
  const shareCardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    if (Platform.OS === "web") {
      Alert.alert("Share", "Sharing is available on iOS and Android.");
      return;
    }
    try {
      setIsSharing(true);
      const uri = await captureRef(shareCardRef, { format: "png", quality: 1, result: "tmpfile" });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share Workout Summary" });
    } catch (e: any) {
      Alert.alert("Share Failed", e?.message ?? "Could not generate the share image.");
    } finally {
      setIsSharing(false);
    }
  }

  // ── Streak Motivation ───────────────────────────────────────────
  const streakMessage = useMemo(() => {
    if (currentStreak === 0) return "Start your streak today!";
    if (currentStreak === 1) return "Great start! Keep it going tomorrow.";
    if (currentStreak < 7) return `${currentStreak} days strong! Push for a full week.`;
    if (currentStreak < 14) return `Over a week! You're building a habit.`;
    if (currentStreak < 30) return `${currentStreak} days! You're unstoppable.`;
    return `${currentStreak} days! Legendary consistency.`;
  }, [currentStreak]);

  return (
    <ImageBackground source={{ uri: GOLDEN_WORKOUT }} style={{ flex: 1 }} imageStyle={{ opacity: 0.08 }}>
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-transparent">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }} {...a11yButton("Go back")}>
              <MaterialIcons name="arrow-back" size={24} color={SF.gold} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 22 }} {...a11yHeader("Workout Calendar")}>
                Workout Calendar
              </Text>
              <Text style={{ color: SF.muted, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                {streakMessage}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleShare}
              disabled={isSharing}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 7,
                borderWidth: 1, borderColor: SF.borderGold,
                opacity: isSharing ? 0.6 : 1,
              }}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={SF.gold} />
              ) : (
                <MaterialIcons name="share" size={16} color={SF.gold} />
              )}
              <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12 }}>
                {isSharing ? "..." : "Share"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Streak Stats Row ── */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 8, marginTop: 8 }}>
          <StatCard icon="local-fire-department" iconColor="#EF4444" label="Current" value={`${currentStreak}d`} highlight={currentStreak > 0} />
          <StatCard icon="emoji-events" iconColor="#F59E0B" label="Best" value={`${longestStreak}d`} />
          <StatCard icon="fitness-center" iconColor="#3B82F6" label="Total" value={String(totalWorkouts)} />
          <StatCard icon="calendar-today" iconColor="#22C55E" label="This Mo." value={String(thisMonthCount)} />
        </Animated.View>

        {/* ── Tab Switcher ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={{ flexDirection: "row", marginHorizontal: 20, marginTop: 8, marginBottom: 16, backgroundColor: SF.surface, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: SF.border }}>
          <TouchableOpacity
            onPress={() => setActiveTab("calendar")}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
              backgroundColor: activeTab === "calendar" ? "rgba(245,158,11,0.15)" : "transparent",
            }}
          >
            <Text style={{ color: activeTab === "calendar" ? SF.gold : SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("heatmap")}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
              backgroundColor: activeTab === "heatmap" ? "rgba(245,158,11,0.15)" : "transparent",
            }}
          >
            <Text style={{ color: activeTab === "heatmap" ? SF.gold : SF.muted, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
              Activity
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {activeTab === "calendar" ? (
          <>
            {/* ── Month Navigation ── */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 }}>
              <TouchableOpacity onPress={() => navigateMonth(-1)} style={{ padding: 8 }}>
                <MaterialIcons name="chevron-left" size={28} color={SF.gold} />
              </TouchableOpacity>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18 }}>
                {MONTHS[currentMonth.month]} {currentMonth.year}
              </Text>
              <TouchableOpacity onPress={() => navigateMonth(1)} style={{ padding: 8 }}>
                <MaterialIcons name="chevron-right" size={28} color={SF.gold} />
              </TouchableOpacity>
            </View>

            {/* ── Day of Week Headers ── */}
            <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom: 6 }}>
              {DAYS_OF_WEEK.map(d => (
                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "DMSans_500Medium" }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* ── Calendar Grid ── */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 }}>
              {calendarDays.map(cell => (
                <TouchableOpacity
                  key={cell.key}
                  style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 }}
                  disabled={!cell.hasWorkout}
                  onPress={() => cell.day ? handleDayPress(cell.key) : undefined}
                >
                  {cell.day !== null && (
                    <View style={{
                      width: 38, height: 38, borderRadius: 19,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: cell.hasWorkout
                        ? (cell.workoutCount >= 2 ? SF.gold : "rgba(245,158,11,0.65)")
                        : "transparent",
                      borderWidth: cell.isToday && !cell.hasWorkout ? 1.5 : 0,
                      borderColor: cell.isToday ? SF.gold : "transparent",
                      opacity: cell.isFuture ? 0.3 : 1,
                    }}>
                      <Text style={{
                        color: cell.hasWorkout ? "#0A0E14" : cell.isToday ? SF.gold : SF.fg,
                        fontFamily: cell.hasWorkout || cell.isToday ? "DMSans_700Bold" : "DMSans_400Regular",
                        fontSize: 14,
                      }}>
                        {cell.day}
                      </Text>
                      {cell.workoutCount > 1 && (
                        <View style={{ position: "absolute", bottom: 2, flexDirection: "row", gap: 2 }}>
                          {Array.from({ length: Math.min(cell.workoutCount, 3) }).map((_, i) => (
                            <View key={i} style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#0A0E14" }} />
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Legend ── */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 12, paddingHorizontal: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "rgba(245,158,11,0.65)" }} />
                <Text style={{ color: SF.muted, fontSize: 11 }}>1 workout</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: SF.gold }} />
                <Text style={{ color: SF.muted, fontSize: 11 }}>2+ workouts</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: SF.gold }} />
                <Text style={{ color: SF.muted, fontSize: 11 }}>Today</Text>
              </View>
            </View>
          </>
        ) : (
          /* ── Activity Heatmap (GitHub-style) ── */
          <View style={{ paddingHorizontal: 20 }}>
            {/* Month labels */}
            <View style={{ flexDirection: "row", marginBottom: 4, paddingLeft: 28 }}>
              {heatmapData.months.map((m, i) => (
                <Text key={`hm-${i}`} style={{
                  color: SF.muted, fontSize: 10, fontFamily: "DMSans_500Medium",
                  position: "absolute", left: 28 + m.colStart * ((SCREEN_WIDTH - 68) / 13),
                }}>
                  {m.label}
                </Text>
              ))}
            </View>

            {/* Heatmap grid */}
            <View style={{ flexDirection: "row", marginTop: 16 }}>
              {/* Day labels */}
              <View style={{ width: 24, marginRight: 4, justifyContent: "space-between" }}>
                {["M", "", "W", "", "F", "", "S"].map((label, i) => (
                  <Text key={`dl-${i}`} style={{ color: SF.muted, fontSize: 9, fontFamily: "DMSans_400Regular", height: 12, lineHeight: 12 }}>
                    {label}
                  </Text>
                ))}
              </View>

              {/* Grid */}
              <View style={{ flex: 1, flexDirection: "row", gap: 2 }}>
                {Array.from({ length: 13 }).map((_, weekIdx) => (
                  <View key={`week-${weekIdx}`} style={{ flex: 1, gap: 2 }}>
                    {Array.from({ length: 7 }).map((_, dayIdx) => {
                      const day = heatmapData.days.find(d => d.weekIndex === weekIdx && d.dayOfWeek === dayIdx);
                      return (
                        <TouchableOpacity
                          key={`hm-${weekIdx}-${dayIdx}`}
                          style={{
                            aspectRatio: 1,
                            borderRadius: 3,
                            backgroundColor: day ? heatmapColor(day.count) : "rgba(245,158,11,0.03)",
                          }}
                          disabled={!day || day.count === 0}
                          onPress={() => day && day.count > 0 ? handleDayPress(day.date) : undefined}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            {/* Heatmap legend */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 8 }}>
              <Text style={{ color: SF.muted, fontSize: 10, marginRight: 4 }}>Less</Text>
              {[0, 1, 2, 3].map(n => (
                <View key={`hl-${n}`} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: heatmapColor(n) }} />
              ))}
              <Text style={{ color: SF.muted, fontSize: 10, marginLeft: 4 }}>More</Text>
            </View>

            {/* Activity summary */}
            <View style={{
              marginTop: 16, backgroundColor: SF.surface, borderRadius: 14, padding: 16,
              borderWidth: 1, borderColor: SF.border,
            }}>
              <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>
                LAST 13 WEEKS
              </Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 24 }}>
                    {heatmapData.days.filter(d => d.count > 0).length}
                  </Text>
                  <Text style={{ color: SF.muted, fontSize: 10 }}>Active Days</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: SF.gold2, fontFamily: "DMSans_700Bold", fontSize: 24 }}>
                    {heatmapData.days.reduce((sum, d) => sum + d.count, 0)}
                  </Text>
                  <Text style={{ color: SF.muted, fontSize: 10 }}>Workouts</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: SF.gold3, fontFamily: "DMSans_700Bold", fontSize: 24 }}>
                    {Math.round((heatmapData.days.filter(d => d.count > 0).length / 91) * 100)}%
                  </Text>
                  <Text style={{ color: SF.muted, fontSize: 10 }}>Consistency</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Social Share Link ── */}
        <TouchableOpacity
          style={{
            marginHorizontal: 20, marginTop: 20, backgroundColor: "rgba(245,158,11,0.08)",
            borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
            borderWidth: 1, borderColor: SF.borderGold,
          }}
          onPress={() => router.push("/share-workout" as any)}
        >
          <MaterialIcons name="share" size={20} color={SF.gold} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Share Your Streak</Text>
            <Text style={{ color: SF.muted, fontSize: 11 }}>Branded templates for Instagram, TikTok & more</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={SF.gold} />
        </TouchableOpacity>

        {/* ── Shareable Summary Card (off-screen capture) ── */}
        <View
          ref={shareCardRef}
          collapsable={false}
          style={{ backgroundColor: SF.bg, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
        >
          <View style={{
            backgroundColor: SF.surface, borderRadius: 20, padding: 20,
            borderWidth: 1, borderColor: SF.border,
          }}>
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>
              PEAKPULSE AI
            </Text>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18, marginBottom: 4 }}>
              {MONTHS[currentMonth.month]} {currentMonth.year} Summary
            </Text>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 28 }}>{thisMonthCount}</Text>
                <Text style={{ color: SF.muted, fontSize: 10 }}>Workouts</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: SF.gold2, fontFamily: "DMSans_700Bold", fontSize: 28 }}>{currentStreak}</Text>
                <Text style={{ color: SF.muted, fontSize: 10 }}>Day Streak</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: SF.gold3, fontFamily: "DMSans_700Bold", fontSize: 28 }}>{longestStreak}</Text>
                <Text style={{ color: SF.muted, fontSize: 10 }}>Best Streak</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 28 }}>{totalWorkouts}</Text>
                <Text style={{ color: SF.muted, fontSize: 10 }}>All Time</Text>
              </View>
            </View>

            {/* Mini calendar in share card */}
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                {DAYS_OF_WEEK.map(d => (
                  <View key={`share-hdr-${d}`} style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ color: SF.muted, fontSize: 8 }}>{d}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {calendarDays.map(cell => (
                  <View key={`share-${cell.key}`} style={{ width: `${100 / 7}%`, alignItems: "center", paddingVertical: 3 }}>
                    {cell.day !== null ? (
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        alignItems: "center", justifyContent: "center",
                        backgroundColor: cell.hasWorkout ? SF.gold : "transparent",
                      }}>
                        <Text style={{
                          color: cell.hasWorkout ? "#0A0E14" : SF.muted,
                          fontSize: 10,
                          fontFamily: cell.hasWorkout ? "DMSans_700Bold" : "DMSans_400Regular",
                        }}>{cell.day}</Text>
                      </View>
                    ) : <View style={{ width: 24, height: 24 }} />}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── Recent Workouts ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Recent Workouts</Text>
            <TouchableOpacity onPress={() => router.push("/workout-history" as any)}>
              <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>See All</Text>
            </TouchableOpacity>
          </View>
          {allSessions.length === 0 && logEntries.length === 0 && (
            <View style={{ backgroundColor: SF.surface, borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1, borderColor: SF.border }}>
              <MaterialIcons name="fitness-center" size={32} color={SF.muted} style={{ marginBottom: 8 }} />
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 4 }}>No Workouts Yet</Text>
              <Text style={{ color: SF.muted, fontSize: 12, textAlign: "center" }}>
                Complete your first workout to start building your streak!
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/log-workout" as any)}
                style={{
                  marginTop: 12, backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 10,
                  paddingHorizontal: 16, paddingVertical: 8,
                }}
              >
                <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Log a Workout</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Show last 5 sessions */}
          {[...allSessions].sort((a, b) => parseDate(b.completedAt).getTime() - parseDate(a.completedAt).getTime()).slice(0, 5).map((session, i) => (
            <SessionCard key={`recent-${i}`} session={session} />
          ))}
        </View>

        {sessionsQuery.isLoading && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator color={SF.gold} />
          </View>
        )}
      </ScrollView>

      {/* ── Day Detail Modal ── */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: SF.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: "70%", paddingBottom: Platform.OS === "ios" ? 34 : 20,
          }}>
            <View style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              padding: 20, borderBottomWidth: 1, borderBottomColor: SF.border,
            }}>
              <View>
                <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18 }}>
                  {selectedDay ? formatDisplayDate(selectedDay) : ""}
                </Text>
                <Text style={{ color: SF.gold, fontSize: 12, marginTop: 2 }}>
                  {selectedSessions.length} workout{selectedSessions.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={SF.muted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedSessions}
              keyExtractor={(_, i) => `detail-${i}`}
              contentContainerStyle={{ padding: 20, gap: 12 }}
              renderItem={({ item }) => <SessionCard session={item} expanded />}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
    </ImageBackground>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

function StatCard({ icon, iconColor, label, value, highlight = false }: {
  icon: string; iconColor: string; label: string; value: string; highlight?: boolean;
}) {
  return (
    <View style={{
      flex: 1, backgroundColor: highlight ? "rgba(245,158,11,0.10)" : SF.surface,
      borderRadius: 12, padding: 10, alignItems: "center",
      borderWidth: 1, borderColor: highlight ? SF.borderGold : SF.border,
    }}>
      <MaterialIcons name={icon as any} size={18} color={iconColor} />
      <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16, marginTop: 2 }}>{value}</Text>
      <Text style={{ color: SF.muted, fontSize: 10, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function SessionCard({ session, expanded = false }: { session: WorkoutSession; expanded?: boolean }) {
  const date = parseDate(session.completedAt);
  const exercises: string[] = (() => {
    try { return JSON.parse(session.completedExercisesJson ?? "[]"); }
    catch { return []; }
  })();

  return (
    <View style={{
      backgroundColor: expanded ? "rgba(245,158,11,0.06)" : SF.surface,
      borderRadius: 14, padding: 14, borderWidth: 1, borderColor: SF.border,
      marginBottom: expanded ? 0 : 8,
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
            {session.dayName ?? "Workout"}
          </Text>
          {session.focus ? (
            <Text style={{ color: SF.gold, fontSize: 12, marginTop: 2 }}>{session.focus}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: SF.muted, fontSize: 11 }}>
            {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </Text>
          {session.durationMinutes ? (
            <Text style={{ color: SF.gold3, fontSize: 11, marginTop: 2 }}>
              {formatDuration(session.durationMinutes)}
            </Text>
          ) : null}
        </View>
      </View>
      {expanded && exercises.length > 0 && (
        <View style={{ marginTop: 10, gap: 4 }}>
          <Text style={{ color: SF.muted, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 4 }}>
            EXERCISES COMPLETED
          </Text>
          {exercises.map((ex, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: SF.gold }} />
              <Text style={{ color: SF.fg, fontSize: 13 }}>{ex}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
