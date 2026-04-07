/**
 * Progress Dashboard â Unified view of weight, body fat, and check-in trends.
 *
 * Aggregates data from:
 *   - Server: progressCheckin.list (for authenticated users)
 *   - AsyncStorage: progress_checkin_history (fallback)
 *   - Server: goals.active (target goal)
 *
 * Shows:
 *   1. Summary cards (current weight, BF%, goal, check-ins count)
 *   2. Weight trend line chart
 *   3. Body fat % trend line chart
 *   4. Check-in history list
 */
import React, { useEffect, useState, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path, Circle, Line, Rect, G } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { UI as SF } from "@/constants/ui-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { ScreenErrorBoundary } from "@/components/error-boundary";
import ProgressGraph from "@/components/progress-graph";

const { width: W } = Dimensions.get("window");
const CHART_W = W - 80;
const CHART_H = 160;
const PAD = { top: 20, right: 16, bottom: 24, left: 44 };

// âââ Mini Line Chart âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function TrendLine({
  data,
  label,
  unit,
  color,
  targetValue,
}: {
  data: { date: string; value: number }[];
  label: string;
  unit: string;
  color: string;
  targetValue?: number;
}) {
  const sorted = useMemo(() =>
    [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [data]
  );

  if (sorted.length < 2) {
    return (
      <View style={styles.chartCard}
          accessibilityRole="image"
          accessibilityLabel="Progress chart">
        <Text style={styles.chartLabel}>{label}</Text>
        <View style={styles.emptyChart}>
          <MaterialIcons name="show-chart" size={32} color={SF.muted} />
          <Text style={styles.emptyText}>
            {sorted.length === 0 ? "No data yet" : "Need 2+ check-ins for a trend"}
          </Text>
        </View>
      </View>
    );
  }

  const values = sorted.map((d) => d.value);
  const allValues = targetValue ? [...values, targetValue] : values;
  const minV = Math.min(...allValues) * 0.95;
  const maxV = Math.max(...allValues) * 1.05;
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD.left + (i / (sorted.length - 1)) * (CHART_W - PAD.left - PAD.right);
  const toY = (v: number) => PAD.top + (1 - (v - minV) / range) * (CHART_H - PAD.top - PAD.bottom);

  const pathD = sorted
    .map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`)
    .join(" ");

  // Y-axis labels (3 ticks)
  const yTicks = [minV, minV + range / 2, maxV];

  // X-axis labels (first, middle, last)
  const xLabels = [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]];

  const latest = sorted[sorted.length - 1].value;
  const first = sorted[0].value;
  const change = latest - first;
  const changeStr = (change >= 0 ? "+" : "") + change.toFixed(1) + unit;

  return (
    <View style={styles.chartCard}
          accessibilityRole="image"
          accessibilityLabel="Progress chart">
      <View style={styles.chartHeader}>
        <Text style={styles.chartLabel}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.chartValue, { color }]}>{latest.toFixed(1)}{unit}</Text>
          <Text style={[styles.chartChange, { color: change <= 0 ? "#10B981" : "#F59E0B" }]}>
            {changeStr}
          </Text>
        </View>
      </View>
      <Svg width={CHART_W} height={CHART_H}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <G key={i}>
            <Line
              x1={PAD.left} y1={toY(tick)} x2={CHART_W - PAD.right} y2={toY(tick)}
              stroke="rgba(255,255,255,0.06)" strokeWidth={1}
            />
            <Svg>
              <Rect x={0} y={toY(tick) - 8} width={PAD.left - 6} height={16} fill="transparent" />
            </Svg>
          </G>
        ))}
        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <G key={"yl" + i}>
            <Circle cx={0} cy={0} r={0}>
              {/* Placeholder â RN SVG text positioning via foreignObject is unreliable */}
            </Circle>
          </G>
        ))}
        {/* Target line */}
        {targetValue != null && (
          <Line
            x1={PAD.left} y1={toY(targetValue)}
            x2={CHART_W - PAD.right} y2={toY(targetValue)}
            stroke="#8B5CF6" strokeWidth={1.5} strokeDasharray="6,4"
          />
        )}
        {/* Trend line */}
        <Path d={pathD} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {sorted.map((d, i) => (
          <Circle key={i} cx={toX(i)} cy={toY(d.value)} r={4} fill={color} stroke={SF.surface} strokeWidth={2} />
        ))}
      </Svg>
      {/* Y-axis text overlay (RN Text for reliable rendering) */}
      <View style={styles.yAxisOverlay}>
        {yTicks.map((tick, i) => (
          <Text key={i} style={[styles.axisText, { top: toY(tick) - 6 }]}>
            {tick.toFixed(tick < 100 ? 1 : 0)}
          </Text>
        ))}
      </View>
      {/* X-axis labels */}
      <View style={styles.xAxisRow}>
        {xLabels.map((d, i) => (
          <Text key={i} style={styles.axisText}>
            {new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </Text>
        ))}
      </View>
      {targetValue != null && (
        <View style={styles.targetLabel}>
          <View style={{ width: 12, height: 2, backgroundColor: "#8B5CF6", borderRadius: 1 }} />
          <Text style={[styles.axisText, { color: "#8B5CF6" }]}>Target: {targetValue}%</Text>
        </View>
      )}
    </View>
  );
}

// âââ Main Screen âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function ProgressDashboard() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  

  // Server queries
  const { data: serverCheckins } = trpc.progressCheckin.list.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated }
  );
  const { data: serverGoal } = trpc.goals.active.useQuery(undefined, { enabled: isAuthenticated });

  // Load local history as fallback
  

  // Merge data â prefer server, fall back to local
  const checkins = useMemo(() => {
    if (serverCheckins && serverCheckins.length > 0) {
      return serverCheckins.map((c: any) => ({
        date: c.createdAt,
        weightKg: c.weightKg,
        bodyFatEstimate: c.bodyFatEstimate,
        progressRating: c.progressRating,
        summary: c.summary,
      }));
    }
    return localHistory.map((c: any) => ({
      date: c.date,
      weightKg: c.weightKg,
      bodyFatEstimate: c.bodyFatEstimate,
      progressRating: c.progressRating ?? null,
      summary: c.summary ?? null,
    }));
  }, [serverCheckins, localHistory]);

  const weightData = checkins
    .filter((c: any) => c.weightKg != null)
    .map((c: any) => ({ date: c.date, value: c.weightKg }));

  const bfData = checkins
    .filter((c: any) => c.bodyFatEstimate != null)
    .map((c: any) => ({ date: c.date, value: c.bodyFatEstimate }));

  const targetBf = serverGoal?.targetBodyFat ?? null;
  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : null;
  const latestBf = bfData.length > 0 ? bfData[bfData.length - 1].value : null;

  return (
    <ScreenErrorBoundary screenName="progress-dashboard">
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back" style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={SF.fg} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Progress Dashboard</Text>
          <TouchableOpacity onPress={() => router.push("/progress-checkin" as any)} style={styles.addBtn}>
            <MaterialIcons name="add-a-photo" size={20} color={SF.gold} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <MaterialIcons name="monitor-weight" size={20} color="#3B82F6" />
              <Text style={styles.summaryValue}>{latestWeight ? latestWeight.toFixed(1) + " kg" : "--"}</Text>
              <Text style={styles.summaryLabel}>Weight</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialIcons name="speed" size={20} color="#F59E0B" />
              <Text style={styles.summaryValue}>{latestBf ? latestBf.toFixed(1) + "%" : "--"}</Text>
              <Text style={styles.summaryLabel}>Body Fat</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialIcons name="flag" size={20} color="#8B5CF6" />
              <Text style={styles.summaryValue}>{targetBf ? targetBf + "%" : "--"}</Text>
              <Text style={styles.summaryLabel}>Target BF</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialIcons name="camera-alt" size={20} color="#10B981" />
              <Text style={styles.summaryValue}>{checkins.length}</Text>
              <Text style={styles.summaryLabel}>Check-ins</Text>
            </View>
          </View>

          {/* Weight Trend */}
          
        {/* ── Combined Progress Graph ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Over Time</Text>
          <ProgressGraph targetBodyFat={targetBf ?? undefined} />
        </View>

<View style={styles.section}>
            <TrendLine data={weightData} label="Weight" unit=" kg" color="#3B82F6" />
          </View>

          {/* Body Fat Trend */}
          <View style={styles.section}>
            <TrendLine
              data={bfData}
              label="Body Fat %"
              unit="%"
              color="#F59E0B"
              targetValue={targetBf ?? undefined}
            />
          </View>

          {/* Recent Check-ins */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Check-ins</Text>
            {checkins.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="photo-camera" size={40} color={SF.muted} />
                <Text style={styles.emptyStateText}>No check-ins yet</Text>
                <Text style={[styles.emptyStateText, { fontSize: 13, marginTop: 4 }]}>
                  Take your first progress photo to start tracking
                </Text>
              </View>
            ) : (
              checkins.slice(0, 10).map((c: any, i: number) => (
                <View key={i} style={styles.checkinRow}>
                  <View style={styles.checkinDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkinDate}>
                      {new Date(c.date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                      {c.weightKg != null && (
                        <Text style={styles.checkinStat}>{c.weightKg.toFixed(1)} kg</Text>
                      )}
                      {c.bodyFatEstimate != null && (
                        <Text style={styles.checkinStat}>{c.bodyFatEstimate.toFixed(1)}% BF</Text>
                      )}
                    </View>
                    {c.summary && (
                      <Text style={styles.checkinSummary} numberOfLines={2}>{c.summary}</Text>
                    )}
                  </View>
                  {c.progressRating && (
                    <View style={[styles.ratingBadge, {
                      backgroundColor: c.progressRating === "excellent" ? "rgba(16,185,129,0.15)"
                        : c.progressRating === "good" ? "rgba(59,130,246,0.15)"
                        : "rgba(245,158,11,0.15)",
                    }]}>
                      <Text style={[styles.ratingText, {
                        color: c.progressRating === "excellent" ? "#10B981"
                          : c.progressRating === "good" ? "#3B82F6"
                          : "#F59E0B",
                      }]}>
                        {c.progressRating}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}

// âââ Styles ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SF.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: SF.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: SF.fg, fontSize: 18, fontWeight: "700", fontFamily: "DMSans_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.1)", alignItems: "center", justifyContent: "center" },

  summaryRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  summaryCard: {
    flex: 1, backgroundColor: SF.surface, borderRadius: 16, borderWidth: 1, borderColor: SF.border,
    padding: 12, alignItems: "center", gap: 4,
  },
  summaryValue: { color: SF.fg, fontSize: 16, fontWeight: "700", fontFamily: "DMSans_700Bold" },
  summaryLabel: { color: SF.muted, fontSize: 11, fontFamily: "DMSans_400Regular" },

  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { color: SF.fg, fontSize: 16, fontWeight: "700", fontFamily: "DMSans_700Bold", marginBottom: 12 },

  chartCard: {
    backgroundColor: SF.surface, borderRadius: 20, borderWidth: 1, borderColor: SF.border,
    padding: 16, position: "relative",
  },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  chartLabel: { color: SF.fg, fontSize: 15, fontWeight: "700", fontFamily: "DMSans_700Bold" },
  chartValue: { fontSize: 18, fontWeight: "700", fontFamily: "DMSans_700Bold" },
  chartChange: { fontSize: 13, fontWeight: "600" },
  yAxisOverlay: { position: "absolute", left: 16, top: 56, width: PAD.left - 6 },
  axisText: { color: SF.muted, fontSize: 10, fontFamily: "DMSans_400Regular" },
  xAxisRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: PAD.left - 16, marginTop: 4 },
  targetLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  emptyChart: { height: CHART_H, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { color: SF.muted, fontSize: 13, fontFamily: "DMSans_400Regular" },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  emptyStateText: { color: SF.muted, fontSize: 15, fontFamily: "DMSans_400Regular" },

  checkinRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)",
  },
  checkinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#8B5CF6", marginTop: 6 },
  checkinDate: { color: SF.fg, fontSize: 14, fontWeight: "600", fontFamily: "DMSans_600SemiBold" },
  checkinStat: { color: SF.muted, fontSize: 13, fontFamily: "DMSans_400Regular" },
  checkinSummary: { color: SF.muted, fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 4, lineHeight: 18 },
  ratingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" as any, fontFamily: "DMSans_700Bold" },
});
