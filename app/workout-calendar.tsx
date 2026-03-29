import { useState, useCallback, useMemo, useRef } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator,
  Platform, Modal, FlatList, Alert, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { GOLDEN_WORKOUT, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI as SF } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
// Solar Forge colour tokens
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface WorkoutSession {
  id?: number;
  dayName?: string;
  focus?: string;
  completedExercisesJson?: string;
  durationMinutes?: number;
  completedAt: string | Date;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  return new Date(d);
}

export default function WorkoutCalendarScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [localSessions, setLocalSessions] = useState<WorkoutSession[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Fetch from server for authenticated users
  const sessionsQuery = trpc.workoutPlan.getAllSessions.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Load local sessions for guests
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("@workout_sessions_local").then((raw) => {
        if (raw) {
          try { setLocalSessions(JSON.parse(raw)); } catch { setLocalSessions([]); }
        }
      });
    }, [])
  );

  const allSessions: WorkoutSession[] = useMemo(() => {
    const server = (sessionsQuery.data ?? []) as WorkoutSession[];
    return [...server, ...localSessions];
  }, [sessionsQuery.data, localSessions]);

  // Build a map of date -> sessions
  const sessionsByDate = useMemo(() => {
    const map: Record<string, WorkoutSession[]> = {};
    for (const s of allSessions) {
      const key = dateKey(parseDate(s.completedAt));
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [allSessions]);

  // Streak calculation
  const { currentStreak, longestStreak, totalWorkouts, thisMonthCount } = useMemo(() => {
    const workoutDates = new Set(Object.keys(sessionsByDate));
    const total = allSessions.length;

    // Current streak: count consecutive days ending today (or yesterday)
    let current = 0;
    const today = new Date();
    let checkDate = new Date(today);
    // Check if today has a workout, if not start from yesterday
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

    return { currentStreak: current, longestStreak: longest, totalWorkouts: total, thisMonthCount: monthCount };
  }, [sessionsByDate, allSessions, currentMonth]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells: Array<{ day: number | null; key: string; isToday: boolean; hasWorkout: boolean; workoutCount: number }> = [];

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      cells.push({ day: null, key: `empty-${i}`, isToday: false, hasWorkout: false, workoutCount: 0 });
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      const sessions = sessionsByDate[dk] ?? [];
      cells.push({ day: d, key: dk, isToday, hasWorkout: sessions.length > 0, workoutCount: sessions.length });
    }

    return cells;
  }, [currentMonth, sessionsByDate]);

  function navigateMonth(delta: number) {
    setCurrentMonth(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  }

  function handleDayPress(dk: string) {
    if (sessionsByDate[dk] && sessionsByDate[dk].length > 0) {
      setSelectedDay(dk);
      setDetailModalVisible(true);
    }
  }

  const selectedSessions = selectedDay ? (sessionsByDate[selectedDay] ?? []) : [];
  const shareCardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  async function handleShare() {
    if (Platform.OS === "web") {
      Alert.alert("Share", "Sharing is available on iOS and Android. Open this screen on your device to share.");
      return;
    }
    try {
      setIsSharing(true);
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share Workout Summary",
      });
    } catch (e: any) {
      Alert.alert("Share Failed", e?.message ?? "Could not generate the share image.");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <ImageBackground source={{ uri: GOLDEN_WORKOUT }} style={{ flex: 1 }} resizeMode="cover">
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ScrollView style={{ flex: 1, backgroundColor: SF.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <MaterialIcons name="arrow-back" size={24} color={SF.gold} />
            </TouchableOpacity>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 24 }}>Workout Calendar</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={handleShare}
              disabled={isSharing}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "rgba(245,158,11,0.12)",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: SF.border2,
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
        </View>

        {/* Streak Stats */}
        <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 16 }}>
          <StatCard icon="🔥" label="Current Streak" value={`${currentStreak} day${currentStreak !== 1 ? "s" : ""}`} />
          <StatCard icon="🏆" label="Longest Streak" value={`${longestStreak} day${longestStreak !== 1 ? "s" : ""}`} />
        </View>
        <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 20 }}>
          <StatCard icon="💪" label="Total Workouts" value={String(totalWorkouts)} />
          <StatCard icon="📅" label="This Month" value={String(thisMonthCount)} />
        </View>

        {/* Social Share Button */}
        <TouchableOpacity
          style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: SF.border2 }}
          onPress={() => router.push("/share-workout" as any)}
        >
          <Text style={{ fontSize: 20 }}>📱</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Share Your Streak</Text>
            <Text style={{ color: SF.muted, fontSize: 11 }}>Branded templates for Instagram, TikTok, WhatsApp & more</Text>
          </View>
          <Text style={{ color: SF.gold, fontSize: 16 }}>→</Text>
        </TouchableOpacity>

        {/* Month Navigation */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16 }}>
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

        {/* Day of week headers */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, marginBottom: 8 }}>
          {DAYS_OF_WEEK.map(d => (
            <View key={d} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: SF.muted, fontSize: 11, fontFamily: "DMSans_500Medium" }}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 }}>
          {calendarDays.map(cell => (
            <TouchableOpacity
              key={cell.key}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 2,
              }}
              disabled={!cell.hasWorkout}
              onPress={() => cell.day ? handleDayPress(cell.key) : undefined}
            >
              {cell.day !== null && (
                <View style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: cell.hasWorkout ? SF.gold : "transparent",
                  borderWidth: cell.isToday && !cell.hasWorkout ? 1.5 : 0,
                  borderColor: cell.isToday ? SF.gold : "transparent",
                }}>
                  <Text style={{
                    color: cell.hasWorkout ? "#0A0E14" : cell.isToday ? SF.gold : SF.fg,
                    fontFamily: cell.hasWorkout ? "DMSans_700Bold" : "DMSans_400Regular",
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

        {/* ── Shareable Summary Card (captured by ViewShot) ── */}
        <View
          ref={shareCardRef}
          collapsable={false}
          style={{ backgroundColor: SF.bg, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
        >
          <View style={{
            backgroundColor: SF.surface,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: SF.border2,
          }}>
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>PEAKPULSE AI</Text>
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
                  <View key={`share-${cell.key}`} style={{ width: `${100/7}%`, alignItems: "center", paddingVertical: 3 }}>
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

        {/* Legend */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 16, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: SF.gold }} />
            <Text style={{ color: SF.muted, fontSize: 11 }}>Workout Day</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: SF.gold }} />
            <Text style={{ color: SF.muted, fontSize: 11 }}>Today</Text>
          </View>
        </View>

        {/* Recent Workouts List */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16, marginBottom: 12 }}>Recent Workouts</Text>
          {allSessions.length === 0 && (
            <View style={{ backgroundColor: SF.surface, borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1, borderColor: SF.border }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🏋️</Text>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 4 }}>No Workouts Yet</Text>
              <Text style={{ color: SF.muted, fontSize: 12, textAlign: "center" }}>Complete your first workout to start building your streak!</Text>
            </View>
          )}
          {allSessions.slice(0, 10).map((session, i) => (
            <SessionCard key={`session-${i}`} session={session} />
          ))}
        </View>

        {sessionsQuery.isLoading && (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator color={SF.gold} />
          </View>
        )}
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: SF.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", paddingBottom: Platform.OS === "ios" ? 34 : 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: SF.border }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18 }}>
                {selectedDay ? formatDisplayDate(selectedDay) : ""}
              </Text>
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

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: SF.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: SF.border,
      alignItems: "center",
    }}>
      <Text style={{ fontSize: 22, marginBottom: 4 }}>{icon}</Text>
      <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18 }}>{value}</Text>
      <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>{label}</Text>
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
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: SF.border,
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
              {session.durationMinutes} min
            </Text>
          ) : null}
        </View>
      </View>
      {expanded && exercises.length > 0 && (
        <View style={{ marginTop: 10, gap: 4 }}>
          <Text style={{ color: SF.muted, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 4 }}>EXERCISES COMPLETED</Text>
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

function formatDisplayDate(dk: string): string {
  const [y, m, d] = dk.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
