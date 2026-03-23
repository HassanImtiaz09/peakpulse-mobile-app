import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text, View, TouchableOpacity, FlatList, ImageBackground,
  Platform, TextInput, ActivityIndicator, Alert,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import type { WorkoutType, WorkoutData } from "@/lib/health-service";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// ── Workout Type Config (mirrors log-workout.tsx) ──
interface WorkoutTypeConfig {
  type: WorkoutType;
  label: string;
  icon: string;
  color: string;
}

const WORKOUT_TYPES: WorkoutTypeConfig[] = [
  { type: "running", label: "Running", icon: "directions-run", color: "#22C55E" },
  { type: "walking", label: "Walking", icon: "directions-walk", color: "#3B82F6" },
  { type: "cycling", label: "Cycling", icon: "pedal-bike", color: "#F59E0B" },
  { type: "swimming", label: "Swimming", icon: "pool", color: "#06B6D4" },
  { type: "strength_training", label: "Strength", icon: "fitness-center", color: "#EF4444" },
  { type: "hiit", label: "HIIT", icon: "bolt", color: "#F97316" },
  { type: "yoga", label: "Yoga", icon: "self-improvement", color: "#8B5CF6" },
  { type: "pilates", label: "Pilates", icon: "accessibility", color: "#EC4899" },
  { type: "dance", label: "Dance", icon: "music-note", color: "#A78BFA" },
  { type: "elliptical", label: "Elliptical", icon: "directions-run", color: "#14B8A6" },
  { type: "rowing", label: "Rowing", icon: "rowing", color: "#0EA5E9" },
  { type: "stair_climbing", label: "Stairs", icon: "stairs", color: "#FBBF24" },
  { type: "other", label: "Other", icon: "sports", color: "#9CA3AF" },
];

function getTypeConfig(type: WorkoutType): WorkoutTypeConfig {
  return WORKOUT_TYPES.find((w) => w.type === type) ?? WORKOUT_TYPES[WORKOUT_TYPES.length - 1];
}

// ── Storage Key ──
const WORKOUT_HISTORY_KEY = "@workout_log_history";

interface WorkoutLogEntry {
  id: string;
  workout: WorkoutData;
  savedToHealthPlatform: boolean;
  platform: string;
  loggedAt: string;
}

// ── Duration Formatter ──
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTimeDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function isValidDate(str: string): boolean {
  if (!str) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

// ── Main Screen ──
export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allEntries, setAllEntries] = useState<WorkoutLogEntry[]>([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState<WorkoutType | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load workout history
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(WORKOUT_HISTORY_KEY);
      const entries: WorkoutLogEntry[] = raw ? JSON.parse(raw) : [];
      setAllEntries(entries);
    } catch (e) {
      console.warn("[WorkoutHistory] Failed to load:", e);
      setAllEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    let result = allEntries;

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((e) => e.workout.type === typeFilter);
    }

    // Date range filter
    if (dateFrom && isValidDate(dateFrom)) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((e) => new Date(e.workout.startDate) >= from);
    }
    if (dateTo && isValidDate(dateTo)) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.workout.startDate) <= to);
    }

    return result;
  }, [allEntries, typeFilter, dateFrom, dateTo]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = filteredEntries.length;
    const totalCalories = filteredEntries.reduce((a, e) => a + (e.workout.caloriesBurned ?? 0), 0);
    const totalDistance = filteredEntries.reduce((a, e) => a + (e.workout.distanceKm ?? 0), 0);
    const totalMinutes = filteredEntries.reduce((a, e) => a + e.workout.durationMinutes, 0);
    return { total, totalCalories, totalDistance, totalMinutes };
  }, [filteredEntries]);

  // Delete workout
  const deleteWorkout = useCallback(async (id: string) => {
    Alert.alert("Delete Workout", "Are you sure you want to remove this workout from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            const updated = allEntries.filter((e) => e.id !== id);
            await AsyncStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(updated));
            setAllEntries(updated);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch (e) {
            console.warn("[WorkoutHistory] Delete failed:", e);
          }
        },
      },
    ]);
  }, [allEntries]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  const hasActiveFilters = typeFilter !== "all" || dateFrom !== "" || dateTo !== "";

  // ── Render Workout Card ──
  const renderWorkoutCard = useCallback(({ item }: { item: WorkoutLogEntry }) => {
    const config = getTypeConfig(item.workout.type);
    const durationMin = item.workout.durationMinutes;

    return (
      <View style={{
        backgroundColor: "#150A00", borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: "rgba(245,158,11,0.12)",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* Icon */}
          <View style={{
            width: 44, height: 44, borderRadius: 12, backgroundColor: config.color + "20",
            alignItems: "center", justifyContent: "center",
          }}>
            <MaterialIcons name={config.icon as any} size={22} color={config.color} />
          </View>

          {/* Main Info */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>
              {item.workout.title || config.label}
            </Text>
            <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>
              {formatDateDisplay(item.workout.startDate)} at {formatTimeDisplay(item.workout.startDate)}
            </Text>
          </View>

          {/* Health Platform Badge */}
          {item.savedToHealthPlatform && (
            <View style={{
              backgroundColor: "#22C55E20", paddingHorizontal: 6, paddingVertical: 2,
              borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 3,
            }}>
              <MaterialIcons name="check-circle" size={10} color="#22C55E" />
              <Text style={{ color: "#22C55E", fontFamily: "DMSans_500Medium", fontSize: 9 }}>Synced</Text>
            </View>
          )}

          {/* Delete */}
          <TouchableOpacity
            onPress={() => deleteWorkout(item.id)}
            style={{ padding: 6, opacity: 0.6 }}
          >
            <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={{
          flexDirection: "row", marginTop: 10, paddingTop: 10,
          borderTopWidth: 1, borderTopColor: "rgba(245,158,11,0.08)", gap: 16,
        }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>
              {formatDuration(durationMin)}
            </Text>
            <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 9 }}>Duration</Text>
          </View>
          {item.workout.caloriesBurned != null && item.workout.caloriesBurned > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>
                {item.workout.caloriesBurned}
              </Text>
              <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 9 }}>kcal</Text>
            </View>
          )}
          {item.workout.distanceKm != null && item.workout.distanceKm > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>
                {item.workout.distanceKm.toFixed(1)}
              </Text>
              <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 9 }}>km</Text>
            </View>
          )}
          {item.workout.heartRateAvg != null && item.workout.heartRateAvg > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>
                {item.workout.heartRateAvg}
              </Text>
              <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 9 }}>bpm</Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [deleteWorkout]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      <ImageBackground source={{ uri: DASHBOARD_BG }} style={{ flex: 1 }} imageStyle={{ opacity: 0.10 }}>
        <ScreenContainer edges={["top", "left", "right"]} className="flex-1">
          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
            paddingTop: 8, paddingBottom: 12,
          }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 8 }}>
              <MaterialIcons name="arrow-back" size={22} color="#FDE68A" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 18 }}>
                Workout History
              </Text>
              <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                {filteredEntries.length} workout{filteredEntries.length !== 1 ? "s" : ""}
                {hasActiveFilters ? " (filtered)" : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{
                padding: 8, backgroundColor: showFilters ? "#F59E0B20" : "transparent",
                borderRadius: 10,
              }}
            >
              <MaterialIcons name="filter-list" size={22} color={hasActiveFilters ? "#F59E0B" : "#B45309"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/log-workout" as any)}
              style={{ padding: 8, marginLeft: 4 }}
            >
              <MaterialIcons name="add-circle" size={22} color="#F59E0B" />
            </TouchableOpacity>
          </View>

          {/* ═══ Summary Stats Bar ═══ */}
          <View style={{
            flexDirection: "row", marginHorizontal: 16, marginBottom: 12, padding: 12,
            backgroundColor: "#150A00", borderRadius: 12, borderWidth: 1,
            borderColor: "rgba(245,158,11,0.12)", gap: 8,
          }}>
            {[
              { label: "Workouts", value: String(summaryStats.total), icon: "fitness-center" },
              { label: "Calories", value: `${summaryStats.totalCalories.toLocaleString()}`, icon: "local-fire-department" },
              { label: "Distance", value: `${summaryStats.totalDistance.toFixed(1)} km`, icon: "straighten" },
              { label: "Time", value: formatDuration(summaryStats.totalMinutes), icon: "schedule" },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
                <MaterialIcons name={s.icon as any} size={14} color="#F59E0B" />
                <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 13, marginTop: 2 }}>
                  {s.value}
                </Text>
                <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 9 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ═══ Filters Panel ═══ */}
          {showFilters && (
            <View style={{
              marginHorizontal: 16, marginBottom: 12, padding: 14,
              backgroundColor: "#150A00", borderRadius: 14, borderWidth: 1,
              borderColor: "rgba(245,158,11,0.15)",
            }}>
              {/* Type Filter */}
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_600SemiBold", fontSize: 12, marginBottom: 8 }}>
                Workout Type
              </Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[{ type: "all" as const, label: "All", icon: "apps", color: "#F59E0B" }, ...WORKOUT_TYPES]}
                keyExtractor={(item) => item.type}
                contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
                renderItem={({ item }) => {
                  const active = typeFilter === item.type;
                  return (
                    <TouchableOpacity
                      onPress={() => setTypeFilter(item.type as any)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                        backgroundColor: active ? item.color + "30" : "rgba(245,158,11,0.06)",
                        borderWidth: 1, borderColor: active ? item.color + "60" : "rgba(245,158,11,0.10)",
                      }}
                    >
                      <MaterialIcons name={item.icon as any} size={14} color={active ? item.color : "#78350F"} />
                      <Text style={{
                        color: active ? item.color : "#B45309",
                        fontFamily: active ? "DMSans_600SemiBold" : "DMSans_400Regular", fontSize: 11,
                      }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Date Range */}
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_600SemiBold", fontSize: 12, marginTop: 14, marginBottom: 8 }}>
                Date Range
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10, marginBottom: 4 }}>From</Text>
                  <TextInput
                    value={dateFrom}
                    onChangeText={setDateFrom}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#78350F60"
                    style={{
                      backgroundColor: "#0A0500", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
                      color: "#FDE68A", fontFamily: "DMSans_400Regular", fontSize: 12,
                      borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#78350F", fontFamily: "DMSans_400Regular", fontSize: 10, marginBottom: 4 }}>To</Text>
                  <TextInput
                    value={dateTo}
                    onChangeText={setDateTo}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#78350F60"
                    style={{
                      backgroundColor: "#0A0500", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
                      color: "#FDE68A", fontFamily: "DMSans_400Regular", fontSize: 12,
                      borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                    }}
                  />
                </View>
              </View>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <TouchableOpacity
                  onPress={clearFilters}
                  style={{
                    marginTop: 12, alignSelf: "center", flexDirection: "row",
                    alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6,
                    borderRadius: 8, backgroundColor: "rgba(239,68,68,0.10)",
                  }}
                >
                  <MaterialIcons name="clear" size={14} color="#EF4444" />
                  <Text style={{ color: "#EF4444", fontFamily: "DMSans_500Medium", fontSize: 11 }}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ═══ Workout List ═══ */}
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#F59E0B" size="large" />
            </View>
          ) : filteredEntries.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
              <MaterialIcons name="fitness-center" size={48} color="#78350F" />
              <Text style={{
                color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 16, textAlign: "center",
              }}>
                {hasActiveFilters ? "No Workouts Match Filters" : "No Workouts Logged Yet"}
              </Text>
              <Text style={{
                color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 20,
              }}>
                {hasActiveFilters
                  ? "Try adjusting your filters or clearing them to see all workouts."
                  : "Tap the + button above or use the Log Workout screen to record your first workout."}
              </Text>
              {!hasActiveFilters && (
                <TouchableOpacity
                  onPress={() => router.push("/log-workout" as any)}
                  style={{
                    marginTop: 20, backgroundColor: "#F59E0B", paddingHorizontal: 24, paddingVertical: 12,
                    borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6,
                  }}
                >
                  <MaterialIcons name="add" size={18} color="#0A0500" />
                  <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Log Workout</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => item.id}
              renderItem={renderWorkoutCard}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </ScreenContainer>
      </ImageBackground>
    </View>
  );
}
