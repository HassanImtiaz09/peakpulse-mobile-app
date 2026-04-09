/**
 * Weekly Progress Report Screen
 *
 * Visual summary card showing:
 *   - Week-over-week workout stats (volume, frequency, duration)
 *   - Nutrition averages with calorie adherence
 *   - Body measurement changes (weight, body fat)
 *   - Streak and XP stats
 *   - Auto-generated highlights
 *
 * Accessible from the Home tab via a "Weekly Report" button.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  buildWeeklyReport,
  getWeekStart,
  getWeekEnd,
  getPreviousWeekStart,
  type WeeklyProgressReport,
} from "@/lib/weekly-progress-report";

// ── Color Constants (matching app theme) ─────────────────────────────────────
const BG = "#0A0E14";
const SURFACE = "#141A22";
const SURFACE2 = "#1A2332";
const FG = "#F1F5F9";
const MUTED = "#64748B";
const BORDER = "#1E293B";
const GOLD = "#F59E0B";
const GOLD_DIM = "rgba(245,158,11,0.12)";
const GOLD_BORDER = "rgba(245,158,11,0.25)";
const EMERALD = "#10B981";
const ICE = "#22D3EE";
const ROSE = "#F472B6";
const RED = "#EF4444";
const BLUE = "#3B82F6";

// ── Trend Arrow Component ────────────────────────────────────────────────────
function TrendArrow({ value, suffix = "%", inverse = false }: { value: number | null; suffix?: string; inverse?: boolean }) {
  if (value === null || value === 0) return <Text style={s.trendNeutral}>—</Text>;
  const isPositive = inverse ? value < 0 : value > 0;
  const color = isPositive ? EMERALD : RED;
  const icon = value > 0 ? "arrow-upward" : "arrow-downward";
  return (
    <View style={s.trendRow}>
      <MaterialIcons name={icon} size={14} color={color} />
      <Text style={[s.trendText, { color }]}>{Math.abs(value)}{suffix}</Text>
    </View>
  );
}

// ── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ icon, iconColor, label, value, subValue, trend, trendSuffix, trendInverse }: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
  trend?: number | null;
  trendSuffix?: string;
  trendInverse?: boolean;
}) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIconWrap, { backgroundColor: `${iconColor}15` }]}>
        <MaterialIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {subValue ? <Text style={s.statSub}>{subValue}</Text> : null}
      {trend !== undefined ? <TrendArrow value={trend ?? null} suffix={trendSuffix} inverse={trendInverse} /> : null}
    </View>
  );
}

// ── Mini Progress Bar ────────────────────────────────────────────────────────
function MiniBar({ progress, color, label }: { progress: number; color: string; label: string }) {
  const clamped = Math.min(Math.max(progress, 0), 100);
  return (
    <View style={s.miniBarWrap}>
      <View style={s.miniBarHeader}>
        <Text style={s.miniBarLabel}>{label}</Text>
        <Text style={[s.miniBarPercent, { color }]}>{Math.round(clamped)}%</Text>
      </View>
      <View style={s.miniBarTrack}>
        <View style={[s.miniBarFill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function WeeklyReportScreen() {
  const router = useRouter();
  const [report, setReport] = useState<WeeklyProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  const loadReport = useCallback(async () => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + weekOffset * 7);
      const data = await buildWeeklyReport(targetDate);
      setReport(data);
    } catch (e) {
      console.warn("Failed to load weekly report:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    setLoading(true);
    loadReport();
  }, [loadReport]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReport();
  }, [loadReport]);

  const formatWeekRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
          <MaterialIcons name="arrow-back" size={24} color={FG} />
        </Pressable>
        <Text style={s.headerTitle}>Weekly Report</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={s.loadingText}>Building your report...</Text>
        </View>
      ) : report ? (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
        >
          {/* Week Navigation */}
          <View style={s.weekNav}>
            <Pressable
              onPress={() => setWeekOffset((o) => o - 1)}
              style={({ pressed }) => [s.weekArrow, pressed && { opacity: 0.6 }]}
            >
              <MaterialIcons name="chevron-left" size={24} color={GOLD} />
            </Pressable>
            <View style={s.weekCenter}>
              <Text style={s.weekLabel}>{weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : `${Math.abs(weekOffset)} Weeks Ago`}</Text>
              <Text style={s.weekRange}>{formatWeekRange(report.weekStart, report.weekEnd)}</Text>
            </View>
            <Pressable
              onPress={() => weekOffset < 0 ? setWeekOffset((o) => o + 1) : null}
              style={({ pressed }) => [s.weekArrow, weekOffset >= 0 && { opacity: 0.3 }, pressed && weekOffset < 0 && { opacity: 0.6 }]}
              disabled={weekOffset >= 0}
            >
              <MaterialIcons name="chevron-right" size={24} color={GOLD} />
            </Pressable>
          </View>

          {/* Highlights */}
          {report.highlights.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <MaterialIcons name="auto-awesome" size={18} color={GOLD} />
                <Text style={s.sectionTitle}>Highlights</Text>
              </View>
              <View style={s.highlightsCard}>
                {report.highlights.map((h, i) => (
                  <View key={i} style={s.highlightRow}>
                    <Text style={s.highlightDot}>•</Text>
                    <Text style={s.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Workout Section */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="fitness-center" size={18} color={GOLD} />
              <Text style={s.sectionTitle}>Workouts</Text>
            </View>
            <View style={s.statGrid}>
              <StatCard
                icon="fitness-center"
                iconColor={GOLD}
                label="Sessions"
                value={`${report.workout.workoutsCompleted}`}
                trend={report.workout.frequencyChange}
                trendSuffix=""
              />
              <StatCard
                icon="trending-up"
                iconColor={EMERALD}
                label="Volume"
                value={report.workout.totalVolumeKg >= 1000
                  ? `${(report.workout.totalVolumeKg / 1000).toFixed(1)}t`
                  : `${report.workout.totalVolumeKg}kg`}
                trend={report.workout.volumeChange}
              />
              <StatCard
                icon="timer"
                iconColor={ICE}
                label="Duration"
                value={`${report.workout.totalMinutes}m`}
                subValue={report.workout.avgSessionMinutes > 0 ? `~${report.workout.avgSessionMinutes}m/session` : undefined}
              />
              <StatCard
                icon="category"
                iconColor={ROSE}
                label="Muscles"
                value={`${report.workout.muscleGroupsHit.length}`}
                subValue={report.workout.muscleGroupsHit.slice(0, 3).join(", ") || "None"}
              />
            </View>
          </View>

          {/* Nutrition Section */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="restaurant" size={18} color={EMERALD} />
              <Text style={s.sectionTitle}>Nutrition</Text>
            </View>
            <View style={s.statGrid}>
              <StatCard
                icon="local-fire-department"
                iconColor={GOLD}
                label="Avg Calories"
                value={`${report.nutrition.avgCalories}`}
                subValue={report.nutrition.calorieGoal ? `of ${report.nutrition.calorieGoal} goal` : undefined}
                trend={report.nutrition.calorieChange}
              />
              <StatCard
                icon="egg"
                iconColor={ROSE}
                label="Avg Protein"
                value={`${report.nutrition.avgProtein}g`}
              />
              <StatCard
                icon="grain"
                iconColor={BLUE}
                label="Avg Carbs"
                value={`${report.nutrition.avgCarbs}g`}
              />
              <StatCard
                icon="water-drop"
                iconColor={ICE}
                label="Avg Fat"
                value={`${report.nutrition.avgFat}g`}
              />
            </View>
            {/* Adherence bar */}
            {report.nutrition.adherencePercent !== null && (
              <View style={s.adherenceWrap}>
                <MiniBar
                  progress={report.nutrition.adherencePercent}
                  color={report.nutrition.adherencePercent >= 90 && report.nutrition.adherencePercent <= 110 ? EMERALD : GOLD}
                  label="Calorie Adherence"
                />
                <MiniBar
                  progress={(report.nutrition.daysLogged / 7) * 100}
                  color={report.nutrition.daysLogged >= 5 ? EMERALD : GOLD}
                  label="Days Logged"
                />
              </View>
            )}
          </View>

          {/* Body Section */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="monitor-weight" size={18} color={ICE} />
              <Text style={s.sectionTitle}>Body</Text>
            </View>
            <View style={s.bodyCard}>
              <View style={s.bodyRow}>
                <View style={s.bodyMetric}>
                  <Text style={s.bodyLabel}>Weight</Text>
                  <Text style={s.bodyValue}>
                    {report.body.currentWeightKg !== null ? `${report.body.currentWeightKg} kg` : "No data"}
                  </Text>
                  {report.body.weightChangeKg !== null && (
                    <TrendArrow value={report.body.weightChangeKg} suffix=" kg" inverse />
                  )}
                </View>
                <View style={s.bodyDivider} />
                <View style={s.bodyMetric}>
                  <Text style={s.bodyLabel}>Body Fat</Text>
                  <Text style={s.bodyValue}>
                    {report.body.latestBodyFat !== null ? `${report.body.latestBodyFat}%` : "No data"}
                  </Text>
                  {report.body.bodyFatChange !== null && (
                    <TrendArrow value={report.body.bodyFatChange} suffix="%" inverse />
                  )}
                </View>
              </View>
              {report.body.previousWeightKg !== null && (
                <Text style={s.bodyNote}>
                  Last week: {report.body.previousWeightKg}kg
                  {report.body.previousBodyFat !== null ? ` · ${report.body.previousBodyFat}% BF` : ""}
                </Text>
              )}
            </View>
          </View>

          {/* Streak & XP Section */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="bolt" size={18} color={GOLD} />
              <Text style={s.sectionTitle}>Streak & XP</Text>
            </View>
            <View style={s.streakCard}>
              <View style={s.streakRow}>
                <View style={s.streakItem}>
                  <Text style={s.streakEmoji}>🔥</Text>
                  <Text style={s.streakNumber}>{report.streak.currentStreak}</Text>
                  <Text style={s.streakLabel}>Week Streak</Text>
                </View>
                <View style={s.streakItem}>
                  <Text style={s.streakEmoji}>⚡</Text>
                  <Text style={s.streakNumber}>{report.streak.dailyStreak}</Text>
                  <Text style={s.streakLabel}>Day Streak</Text>
                </View>
                <View style={s.streakItem}>
                  <Text style={s.streakEmoji}>✨</Text>
                  <Text style={s.streakNumber}>+{report.streak.xpEarnedThisWeek}</Text>
                  <Text style={s.streakLabel}>XP This Week</Text>
                </View>
              </View>
              <View style={s.levelRow}>
                <Text style={s.levelBadge}>Lv.{report.streak.currentLevel}</Text>
                <Text style={s.levelTitle}>{report.streak.levelTitle}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <Text style={s.footer}>
            Generated {new Date(report.generatedAt).toLocaleString()}
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <View style={s.loadingWrap}>
          <MaterialIcons name="error-outline" size={48} color={MUTED} />
          <Text style={s.loadingText}>Could not load report data</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: MUTED },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  // Week navigation
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  weekArrow: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: SURFACE },
  weekCenter: { alignItems: "center", flex: 1 },
  weekLabel: { fontSize: 16, fontWeight: "700", color: GOLD },
  weekRange: { fontSize: 12, color: MUTED, marginTop: 2 },

  // Section
  section: { marginTop: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: FG },

  // Highlights
  highlightsCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  highlightRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  highlightDot: { color: GOLD, fontSize: 16, marginRight: 8, lineHeight: 20 },
  highlightText: { color: FG, fontSize: 14, lineHeight: 20, flex: 1 },

  // Stat grid
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    width: "48%",
    flexGrow: 1,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statLabel: { fontSize: 12, color: MUTED, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: FG },
  statSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  // Trend
  trendRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  trendText: { fontSize: 12, fontWeight: "600" },
  trendNeutral: { fontSize: 12, color: MUTED, marginTop: 4 },

  // Adherence
  adherenceWrap: { marginTop: 12, gap: 10 },

  // Mini bar
  miniBarWrap: { backgroundColor: SURFACE, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: BORDER },
  miniBarHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  miniBarLabel: { fontSize: 12, color: MUTED },
  miniBarPercent: { fontSize: 12, fontWeight: "700" },
  miniBarTrack: { height: 6, backgroundColor: SURFACE2, borderRadius: 3, overflow: "hidden" },
  miniBarFill: { height: 6, borderRadius: 3 },

  // Body
  bodyCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  bodyRow: { flexDirection: "row", alignItems: "center" },
  bodyMetric: { flex: 1, alignItems: "center" },
  bodyLabel: { fontSize: 12, color: MUTED, marginBottom: 4 },
  bodyValue: { fontSize: 22, fontWeight: "800", color: FG },
  bodyDivider: { width: 1, height: 50, backgroundColor: BORDER, marginHorizontal: 16 },
  bodyNote: { fontSize: 11, color: MUTED, textAlign: "center", marginTop: 12 },

  // Streak
  streakCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  streakRow: { flexDirection: "row", justifyContent: "space-around" },
  streakItem: { alignItems: "center" },
  streakEmoji: { fontSize: 24, marginBottom: 4 },
  streakNumber: { fontSize: 22, fontWeight: "800", color: FG },
  streakLabel: { fontSize: 11, color: MUTED, marginTop: 2 },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    gap: 8,
  },
  levelBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: GOLD,
    backgroundColor: GOLD_DIM,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  levelTitle: { fontSize: 14, fontWeight: "600", color: FG },

  // Footer
  footer: { fontSize: 11, color: MUTED, textAlign: "center", marginTop: 24 },
});
