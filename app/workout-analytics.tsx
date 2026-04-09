/**
 * Workout Analytics Screen
 *
 * Charts showing workout volume, frequency, and strength progression over time.
 * Tab-based navigation between Volume, Frequency, Strength, and Muscles views.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Dimensions,
  StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  getVolumeOverTime, getFrequencyByWeek, getStrengthProgression,
  getMuscleDistribution, getAnalyticsSummary, getExercisesWithHistory,
  type TimePeriod, type VolumeDataPoint, type FrequencyDataPoint,
  type StrengthDataPoint, type MuscleDistribution, type AnalyticsSummary,
} from "@/lib/workout-analytics";
import { UI, C } from "@/constants/ui-colors";
import { EmptyState, EMPTY_STATES } from "@/components/empty-state";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { ScreenErrorBoundary } from "@/components/error-boundary";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 48;
const CHART_H = 180;

type Tab = "volume" | "frequency" | "strength" | "muscles";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "volume", label: "Volume", icon: "bar-chart" },
  { key: "frequency", label: "Frequency", icon: "calendar-today" },
  { key: "strength", label: "Strength", icon: "trending-up" },
  { key: "muscles", label: "Muscles", icon: "fitness-center" },
];

const PERIODS: { key: TimePeriod; label: string }[] = [
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "all", label: "All" },
];

export default function WorkoutAnalyticsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("volume");
  const [period, setPeriod] = useState<TimePeriod>("1m");
  const [loading, setLoading] = useState(true);

  // Data
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
  const [frequencyData, setFrequencyData] = useState<FrequencyDataPoint[]>([]);
  const [strengthData, setStrengthData] = useState<StrengthDataPoint[]>([]);
  const [muscleData, setMuscleData] = useState<MuscleDistribution[]>([]);
  const [exerciseList, setExerciseList] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, exList] = await Promise.all([
        getAnalyticsSummary(),
        getExercisesWithHistory(),
      ]);
      setSummary(sum);
      setExerciseList(exList);
      if (!selectedExercise && exList.length > 0) {
        setSelectedExercise(exList[0]);
      }

      // Load tab-specific data
      if (tab === "volume") {
        const data = await getVolumeOverTime(period);
        setVolumeData(data);
      } else if (tab === "frequency") {
        const data = await getFrequencyByWeek(period);
        setFrequencyData(data);
      } else if (tab === "strength") {
        const ex = selectedExercise || exList[0] || "";
        if (ex) {
          const data = await getStrengthProgression(ex, period);
          setStrengthData(data);
        }
      } else if (tab === "muscles") {
        const data = await getMuscleDistribution(period);
        setMuscleData(data);
      }
    } catch (e) {
      console.warn("[Analytics] Failed to load:", e);
    }
    setLoading(false);
  }, [tab, period, selectedExercise]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleTabChange(t: Tab) {
    setTab(t);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function handlePeriodChange(p: TimePeriod) {
    setPeriod(p);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function formatVolume(v: number): string {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  }

  return (
    <ScreenErrorBoundary screenName="workout-analytics">
    <ScreenContainer>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
          <MaterialIcons name="arrow-back" size={20} color={C.fg} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Analytics</Text>
          <Text style={s.headerSub}>Workout Performance</Text>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={loadData}>
          <MaterialIcons name="refresh" size={18} color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {summary && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{summary.totalWorkouts}</Text>
            <Text style={s.summaryLabel}>Workouts</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{formatVolume(summary.totalVolume)}</Text>
            <Text style={s.summaryLabel}>Total Volume</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{summary.currentStreak}</Text>
            <Text style={s.summaryLabel}>Day Streak</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{summary.workoutsThisWeek}</Text>
            <Text style={s.summaryLabel}>This Week</Text>
            {summary.weekOverWeekChange !== 0 && (
              <View style={[s.changeBadge, { backgroundColor: summary.weekOverWeekChange > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }]}>
                <Text style={[s.changeText, { color: summary.weekOverWeekChange > 0 ? C.green : C.red }]}>
                  {summary.weekOverWeekChange > 0 ? "+" : ""}{summary.weekOverWeekChange}%
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, tab === t.key && s.tabItemActive]}
            onPress={() => handleTabChange(t.key)}
          >
            <MaterialIcons name={t.icon as any} size={16} color={tab === t.key ? C.gold : C.muted} />
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period Selector */}
      <View style={s.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[s.periodChip, period === p.key && s.periodChipActive]}
            onPress={() => handlePeriodChange(p.key)}
          >
            <Text style={[s.periodText, period === p.key && s.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={s.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {/* Volume Chart */}
            {tab === "volume" && (
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>VOLUME OVER TIME</Text>
                <Text style={s.chartSubtitle}>Total weight × reps per session</Text>
                {volumeData.length === 0 ? (
                  <EmptyState {...EMPTY_STATES.analytics} compact />
                ) : (
                  <>
                    <View style={s.barChart}>
                      {(() => {
                        const maxVol = Math.max(...volumeData.map((d) => d.totalVolume), 1);
                        const displayData = volumeData.slice(-12); // Show last 12 sessions
                        const barWidth = Math.max(16, Math.min(32, (CHART_W - 20) / displayData.length - 4));
                        return displayData.map((d, i) => (
                          <View key={i} style={s.barCol}>
                            <Text style={s.barValue}>{formatVolume(d.totalVolume)}</Text>
                            <View style={[s.bar, { height: Math.max(4, (d.totalVolume / maxVol) * CHART_H), width: barWidth }]} />
                            <Text style={s.barLabel} numberOfLines={1}>{d.label}</Text>
                          </View>
                        ));
                      })()}
                    </View>
                    <View style={s.chartStats}>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{formatVolume(volumeData.reduce((a, b) => a + b.totalVolume, 0))}</Text>
                        <Text style={s.statLabel}>Total Volume</Text>
                      </View>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{formatVolume(Math.round(volumeData.reduce((a, b) => a + b.totalVolume, 0) / volumeData.length))}</Text>
                        <Text style={s.statLabel}>Avg / Session</Text>
                      </View>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{volumeData.length}</Text>
                        <Text style={s.statLabel}>Sessions</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Frequency Chart */}
            {tab === "frequency" && (
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>WORKOUT FREQUENCY</Text>
                <Text style={s.chartSubtitle}>Sessions per week</Text>
                {frequencyData.length === 0 ? (
                  <View style={s.emptyState}>
                    <MaterialIcons name="calendar-today" size={40} color={C.muted} />
                    <Text style={s.emptyText}>No frequency data yet</Text>
                    <Text style={s.emptySubtext}>Work out regularly to see frequency trends</Text>
                  </View>
                ) : (
                  <>
                    <View style={s.barChart}>
                      {(() => {
                        const maxSessions = Math.max(...frequencyData.map((d) => d.sessions), 1);
                        const displayData = frequencyData.slice(-12);
                        const barWidth = Math.max(16, Math.min(32, (CHART_W - 20) / displayData.length - 4));
                        return displayData.map((d, i) => (
                          <View key={i} style={s.barCol}>
                            <Text style={s.barValue}>{d.sessions}</Text>
                            <View style={[s.bar, s.barBlue, { height: Math.max(4, (d.sessions / maxSessions) * CHART_H), width: barWidth }]} />
                            <Text style={s.barLabel} numberOfLines={1}>{d.weekLabel}</Text>
                          </View>
                        ));
                      })()}
                    </View>
                    <View style={s.chartStats}>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{frequencyData.reduce((a, b) => a + b.sessions, 0)}</Text>
                        <Text style={s.statLabel}>Total Sessions</Text>
                      </View>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{(frequencyData.reduce((a, b) => a + b.sessions, 0) / Math.max(frequencyData.length, 1)).toFixed(1)}</Text>
                        <Text style={s.statLabel}>Avg / Week</Text>
                      </View>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{Math.max(...frequencyData.map((d) => d.sessions))}</Text>
                        <Text style={s.statLabel}>Best Week</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Strength Chart */}
            {tab === "strength" && (
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>STRENGTH PROGRESSION</Text>
                <Text style={s.chartSubtitle}>Estimated 1RM over time</Text>

                {/* Exercise Picker */}
                {exerciseList.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.exercisePicker} contentContainerStyle={{ gap: 6 }}>
                    {exerciseList.slice(0, 15).map((ex) => (
                      <TouchableOpacity
                        key={ex}
                        style={[s.exercisePickerChip, selectedExercise === ex && s.exercisePickerChipActive]}
                        onPress={() => setSelectedExercise(ex)}
                      >
                        <Text style={[s.exercisePickerText, selectedExercise === ex && s.exercisePickerTextActive]} numberOfLines={1}>
                          {ex.replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {strengthData.length === 0 ? (
                  <View style={s.emptyState}>
                    <MaterialIcons name="trending-up" size={40} color={C.muted} />
                    <Text style={s.emptyText}>No strength data yet</Text>
                    <Text style={s.emptySubtext}>Log weights during workouts to track progression</Text>
                  </View>
                ) : (
                  <>
                    {/* Line chart approximation using bars */}
                    <View style={s.lineChart}>
                      {(() => {
                        const max1RM = Math.max(...strengthData.map((d) => d.estimated1RM), 1);
                        const displayData = strengthData.slice(-15);
                        return displayData.map((d, i) => {
                          const h = Math.max(4, (d.estimated1RM / max1RM) * CHART_H);
                          return (
                            <View key={i} style={s.lineCol}>
                              <View style={[s.linePoint, { bottom: h - 4 }]} />
                              <View style={[s.lineStem, { height: h }]} />
                              <Text style={s.lineLabel} numberOfLines={1}>{d.label}</Text>
                            </View>
                          );
                        });
                      })()}
                    </View>
                    <View style={s.chartStats}>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{Math.max(...strengthData.map((d) => d.estimated1RM)).toFixed(0)}</Text>
                        <Text style={s.statLabel}>Best 1RM</Text>
                      </View>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{Math.max(...strengthData.map((d) => d.weight)).toFixed(0)}</Text>
                        <Text style={s.statLabel}>Max Weight</Text>
                      </View>
                      <View style={s.statItem}>
                        <Text style={s.statValue}>{strengthData.length}</Text>
                        <Text style={s.statLabel}>Entries</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Muscle Distribution */}
            {tab === "muscles" && (
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>MUSCLE DISTRIBUTION</Text>
                <Text style={s.chartSubtitle}>Sets per muscle group</Text>
                {muscleData.length === 0 ? (
                  <View style={s.emptyState}>
                    <MaterialIcons name="fitness-center" size={40} color={C.muted} />
                    <Text style={s.emptyText}>No muscle data yet</Text>
                    <Text style={s.emptySubtext}>Complete workouts to see muscle distribution</Text>
                  </View>
                ) : (
                  <View style={s.muscleList}>
                    {muscleData.slice(0, 12).map((m, i) => {
                      const maxSets = muscleData[0]?.sets ?? 1;
                      const barWidth = Math.max(8, (m.sets / maxSets) * 100);
                      const colors = [C.gold, C.blue, C.green, C.purple, C.gold2, C.red];
                      const color = colors[i % colors.length];
                      return (
                        <View key={m.muscle} style={s.muscleRow}>
                          <Text style={s.muscleName}>{m.muscle}</Text>
                          <View style={s.muscleBarBg}>
                            <View style={[s.muscleBarFill, { width: `${barWidth}%`, backgroundColor: color }]} />
                          </View>
                          <Text style={s.muscleSets}>{m.sets} sets</Text>
                          <Text style={s.musclePct}>{m.percentage}%</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
    </ScreenErrorBoundary>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: C.fg,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 22,
  },
  headerSub: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },

  // Summary
  summaryRow: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 12,
  },
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    minWidth: 90,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryValue: {
    color: C.gold,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 26,
    lineHeight: 30,
  },
  summaryLabel: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    marginTop: 2,
  },
  changeBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 4,
  },
  changeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: UI.borderGold,
  },
  tabLabel: {
    color: C.muted,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  tabLabelActive: {
    color: C.gold,
  },

  // Period
  periodRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 12,
    gap: 6,
  },
  periodChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: UI.goldAlpha6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  periodChipActive: {
    backgroundColor: UI.borderGold,
    borderColor: C.gold,
  },
  periodText: {
    color: C.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  periodTextActive: {
    color: C.gold,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },

  // Chart Card
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  chartTitle: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  chartSubtitle: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    marginBottom: 16,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  emptySubtext: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },

  // Bar chart
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: CHART_H + 40,
    gap: 4,
    marginBottom: 16,
  },
  barCol: {
    alignItems: "center",
    gap: 4,
  },
  bar: {
    backgroundColor: C.gold,
    borderRadius: 4,
    minHeight: 4,
  },
  barBlue: {
    backgroundColor: C.blue,
  },
  barValue: {
    color: C.gold2,
    fontFamily: "DMSans_700Bold",
    fontSize: 8,
  },
  barLabel: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 8,
    maxWidth: 36,
    textAlign: "center",
  },

  // Line chart
  lineChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: CHART_H + 40,
    gap: 4,
    marginBottom: 16,
  },
  lineCol: {
    alignItems: "center",
    flex: 1,
    position: "relative",
    height: CHART_H,
    justifyContent: "flex-end",
  },
  linePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
    position: "absolute",
    zIndex: 1,
  },
  lineStem: {
    width: 2,
    backgroundColor: "rgba(34,197,94,0.3)",
    borderRadius: 1,
  },
  lineLabel: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 7,
    marginTop: 4,
    maxWidth: 30,
    textAlign: "center",
  },

  // Chart stats
  chartStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: UI.dim,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: C.fg,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 22,
    lineHeight: 26,
  },
  statLabel: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
  },

  // Exercise picker
  exercisePicker: {
    marginBottom: 12,
  },
  exercisePickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: UI.goldAlpha6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  exercisePickerChipActive: {
    backgroundColor: UI.borderGold,
    borderColor: C.gold,
  },
  exercisePickerText: {
    color: C.muted,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    textTransform: "capitalize",
  },
  exercisePickerTextActive: {
    color: C.gold,
  },

  // Muscle distribution
  muscleList: {
    gap: 10,
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  muscleName: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    width: 80,
  },
  muscleBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: UI.dim,
    borderRadius: 4,
    overflow: "hidden",
  },
  muscleBarFill: {
    height: 8,
    borderRadius: 4,
  },
  muscleSets: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    width: 40,
    textAlign: "right",
  },
  musclePct: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    width: 30,
    textAlign: "right",
  },
});
