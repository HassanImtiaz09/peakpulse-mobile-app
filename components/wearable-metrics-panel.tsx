/**
 * WearableMetricsPanel — Dashboard tab component showing detailed
 * health metrics from Apple Health / Google Fit integration.
 *
 * Displays: Steps, Heart Rate, Calories, Sleep, Distance, Active Minutes,
 * VO2 Max, HRV, Blood Oxygen, Stand Hours.
 *
 * Includes a "Connect" CTA when no wearable is connected.
 */
import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useWearable, type WearableStats, type DailyWearableEntry } from "@/lib/wearable-context";
import * as Haptics from "expo-haptics";
import { UI, C } from "@/constants/ui-colors";

// ── Colour Tokens ────────────────────────────────────────────────
type MetricTab = "overview" | "heart" | "activity" | "sleep";

interface MetricCardProps {
  icon: string;
  color: string;
  label: string;
  value: string;
  unit: string;
  subtext?: string;
  progress?: number; // 0-1
}

function MetricCard({ icon, color, label, value, unit, subtext, progress }: MetricCardProps) {
  return (
    <View style={s.metricCard}>
      <View style={[s.metricIconBox, { backgroundColor: color + "15" }]}>
        <MaterialIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={s.metricLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <Text style={[s.metricValue, { color }]}>{value}</Text>
        <Text style={s.metricUnit}>{unit}</Text>
      </View>
      {progress !== undefined && (
        <View style={s.metricProgress}>
          <View style={[s.metricProgressFill, { width: `${Math.min(100, progress * 100)}%` as any, backgroundColor: color }]} />
        </View>
      )}
      {subtext && <Text style={s.metricSubtext}>{subtext}</Text>}
    </View>
  );
}

function MiniRing({ value, max, color, size = 56, label }: { value: number; max: number; color: string; size?: number; label: string }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const dashoffset = circumference * (1 - pct);

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color + "20"} strokeWidth={strokeWidth} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashoffset} />
        </Svg>
        <View style={{ position: "absolute" }}>
          <Text style={{ color, fontFamily: "DMSans_700Bold", fontSize: 12, textAlign: "center" }}>
            {Math.round(pct * 100)}%
          </Text>
        </View>
      </View>
      <Text style={{ color: C.fg, fontFamily: "DMSans_600SemiBold", fontSize: 10, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

// ── 7-day sparkline (simple bar chart) ───────────────────────────
function WeeklySparkline({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(...data, 1);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ color: C.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 11, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 48 }}>
        {data.map((val, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <View style={{
              width: "100%", borderRadius: 4,
              height: Math.max(4, (val / max) * 44),
              backgroundColor: i === data.length - 1 ? color : color + "60",
            }} />
            <Text style={{ color: C.muted, fontSize: 8, marginTop: 3, fontFamily: "DMSans_500Medium" }}>{days[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function WearableMetricsPanel() {
  const router = useRouter();
  const wearable = useWearable();
  const [activeTab, setActiveTab] = useState<MetricTab>("overview");
  const [syncing, setSyncing] = useState(false);

  const { stats, history, isConnected, healthSourceName, isHealthPlatformAvailable: platformAvailable } = wearable;

  // Compute 7-day data from history
  const weeklyData = useMemo(() => {
    const last7 = history.slice(-7);
    const pad = (arr: number[], len: number) => {
      while (arr.length < len) arr.unshift(0);
      return arr;
    };
    return {
      steps: pad(last7.map(d => d.stats.steps), 7),
      calories: pad(last7.map(d => d.stats.totalCaloriesBurnt), 7),
      sleep: pad(last7.map(d => d.stats.sleepHours), 7),
      heartRate: pad(last7.map(d => d.stats.heartRate), 7),
      activeMinutes: pad(last7.map(d => d.stats.activeMinutes), 7),
    };
  }, [history]);

  const weeklyAvg = wearable.getWeeklyAverage();

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await wearable.syncFromHealthPlatform();
    } catch {}
    setSyncing(false);
  }, [syncing, wearable]);

  // ── Not Connected State ────────────────────────────────────────
  if (!isConnected) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons name="watch" size={20} color={C.gold} />
            <Text style={s.headerTitle}>Wearable Integration</Text>
          </View>
        </View>

        <View style={s.emptyState}>
          <View style={s.emptyIconBox}>
            <MaterialIcons name="watch" size={48} color={C.gold} />
          </View>
          <Text style={s.emptyTitle}>Connect Your Wearable</Text>
          <Text style={s.emptySubtitle}>
            Sync with your health platform to see real-time metrics, trends, and insights right on your dashboard.
          </Text>

          {/* Wearable Integration Dropdown */}
          <View style={{ width: "100%", marginTop: 20, gap: 6 }}>
            <Text style={{ color: C.gold2, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>SELECT YOUR PLATFORM</Text>

            {/* Apple Health */}
            <TouchableOpacity
              style={s.connectBtn}
              onPress={() => router.push("/wearable-sync" as any)}
            >
              <MaterialIcons name="favorite" size={18} color="#FF2D55" />
              <View style={{ flex: 1 }}>
                <Text style={s.connectBtnText}>Apple Health</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Apple Watch, iPhone sensors</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={C.muted} />
            </TouchableOpacity>

            {/* Google Fit / Health Connect */}
            <TouchableOpacity
              style={s.connectBtn}
              onPress={() => router.push("/wearable-sync" as any)}
            >
              <MaterialIcons name="fitness-center" size={18} color={C.green} />
              <View style={{ flex: 1 }}>
                <Text style={s.connectBtnText}>Google Fit / Health Connect</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Pixel Watch, Samsung, Wear OS</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={C.muted} />
            </TouchableOpacity>

            {/* Fitbit */}
            <TouchableOpacity
              style={s.connectBtn}
              onPress={() => router.push("/wearable-sync" as any)}
            >
              <MaterialIcons name="watch" size={18} color="#00B0B9" />
              <View style={{ flex: 1 }}>
                <Text style={s.connectBtnText}>Fitbit</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Charge, Versa, Sense, Inspire</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={C.muted} />
            </TouchableOpacity>

            {/* Garmin */}
            <TouchableOpacity
              style={s.connectBtn}
              onPress={() => router.push("/wearable-sync" as any)}
            >
              <MaterialIcons name="explore" size={18} color="#007CC3" />
              <View style={{ flex: 1 }}>
                <Text style={s.connectBtnText}>Garmin Connect</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Forerunner, Venu, Fenix, Vivoactive</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={C.muted} />
            </TouchableOpacity>

            {/* Samsung Health */}
            <TouchableOpacity
              style={s.connectBtn}
              onPress={() => router.push("/wearable-sync" as any)}
            >
              <MaterialIcons name="phone-android" size={18} color="#1428A0" />
              <View style={{ flex: 1 }}>
                <Text style={s.connectBtnText}>Samsung Health</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Galaxy Watch, Galaxy Ring</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={C.muted} />
            </TouchableOpacity>

            {/* WHOOP */}
            <TouchableOpacity
              style={s.connectBtn}
              onPress={() => router.push("/wearable-sync" as any)}
            >
              <MaterialIcons name="speed" size={18} color={UI.gold} />
              <View style={{ flex: 1 }}>
                <Text style={s.connectBtnText}>WHOOP</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>WHOOP 4.0, recovery & strain</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={C.muted} />
            </TouchableOpacity>

            {/* Oura */}
            <TouchableOpacity
              style={[s.connectBtn, { borderColor: C.gold + "30" }]}
              onPress={() => router.push("/wearable-sync" as any)}
            >
              <MaterialIcons name="circle" size={18} color="#C0C0C0" />
              <View style={{ flex: 1 }}>
                <Text style={s.connectBtnText}>Oura Ring</Text>
                <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Sleep, readiness, activity</Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={C.muted} />
            </TouchableOpacity>
          </View>

          <View style={s.infoRow}>
            <MaterialIcons name="info-outline" size={12} color={C.muted} />
            <Text style={s.infoText}>
              All platforms sync via Apple HealthKit (iOS) or Google Health Connect (Android). Data refreshes automatically every 15 minutes.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Connected State ────────────────────────────────────────────
  const tabs: { id: MetricTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "heart", label: "Heart", icon: "favorite" },
    { id: "activity", label: "Activity", icon: "directions-run" },
    { id: "sleep", label: "Sleep", icon: "bedtime" },
  ];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <MaterialIcons name="watch" size={20} color={C.gold} />
          <Text style={s.headerTitle}>Wearable Integration</Text>
          <View style={s.sourceBadge}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
            <Text style={s.sourceText}>{healthSourceName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSync} style={s.syncBtn} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color={C.gold} />
          ) : (
            <MaterialIcons name="sync" size={18} color={C.gold} />
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <MaterialIcons name={tab.icon as any} size={14} color={activeTab === tab.id ? C.gold : C.muted} />
            <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <View style={s.tabContent}>
          {/* Activity Rings */}
          <View style={s.ringsRow}>
            <MiniRing value={stats.steps} max={10000} color={C.green} label="Steps" />
            <MiniRing value={stats.activeCalories} max={500} color={C.orange} label="Active Cal" />
            <MiniRing value={stats.activeMinutes} max={60} color={C.cyan} label="Active Min" />
            <MiniRing value={stats.standHours} max={12} color={C.blue} label="Stand Hrs" />
          </View>

          {/* Key Metrics Grid */}
          <View style={s.metricsGrid}>
            <MetricCard icon="directions-walk" color={C.green} label="Steps" value={stats.steps.toLocaleString()} unit="steps"
              progress={stats.steps / 10000} subtext={`Goal: 10,000`} />
            <MetricCard icon="favorite" color={C.red} label="Heart Rate" value={String(stats.heartRate)} unit="bpm"
              subtext={stats.restingHeartRate ? `Resting: ${stats.restingHeartRate} bpm` : undefined} />
            <MetricCard icon="local-fire-department" color={C.orange} label="Calories" value={String(stats.totalCaloriesBurnt)} unit="kcal"
              subtext={`Active: ${stats.activeCalories} kcal`} />
            <MetricCard icon="bedtime" color={C.purple} label="Sleep" value={String(stats.sleepHours)} unit="hrs"
              subtext={`Quality: ${stats.sleepQuality}`} />
          </View>

          {/* Weekly Steps Sparkline */}
          <WeeklySparkline data={weeklyData.steps} color={C.green} label="Steps This Week" />

          {/* 7-Day Averages */}
          <View style={s.avgRow}>
            <View style={s.avgCard}>
              <Text style={s.avgValue}>{weeklyAvg.avgSteps.toLocaleString()}</Text>
              <Text style={s.avgLabel}>Avg Steps</Text>
            </View>
            <View style={s.avgCard}>
              <Text style={s.avgValue}>{weeklyAvg.avgCalories}</Text>
              <Text style={s.avgLabel}>Avg Calories</Text>
            </View>
            <View style={s.avgCard}>
              <Text style={s.avgValue}>{weeklyAvg.avgSleep.toFixed(1)}h</Text>
              <Text style={s.avgLabel}>Avg Sleep</Text>
            </View>
            <View style={s.avgCard}>
              <Text style={s.avgValue}>{weeklyAvg.avgHR}</Text>
              <Text style={s.avgLabel}>Avg HR</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Heart Tab ── */}
      {activeTab === "heart" && (
        <View style={s.tabContent}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={[s.bigMetricCircle, { borderColor: C.red + "40" }]}>
              <MaterialIcons name="favorite" size={24} color={C.red} />
              <Text style={[s.bigMetricValue, { color: C.red }]}>{stats.heartRate}</Text>
              <Text style={s.bigMetricUnit}>BPM</Text>
            </View>
          </View>

          <View style={s.metricsGrid}>
            <MetricCard icon="favorite-border" color={C.red} label="Resting HR"
              value={stats.restingHeartRate ? String(stats.restingHeartRate) : "--"} unit="bpm"
              subtext="Lower is better" />
            <MetricCard icon="show-chart" color={C.purple} label="HRV"
              value={stats.hrv ? String(stats.hrv) : "--"} unit="ms"
              subtext="Heart rate variability" />
            <MetricCard icon="air" color={C.cyan} label="VO2 Max"
              value={stats.vo2Max ? String(stats.vo2Max) : "--"} unit="mL/kg/min"
              subtext="Cardio fitness" />
            <MetricCard icon="bloodtype" color={C.orange} label="Blood O2"
              value={stats.bloodOxygen ? `${stats.bloodOxygen}` : "--"} unit="%"
              subtext="Oxygen saturation" />
          </View>

          <WeeklySparkline data={weeklyData.heartRate} color={C.red} label="Heart Rate This Week" />
        </View>
      )}

      {/* ── Activity Tab ── */}
      {activeTab === "activity" && (
        <View style={s.tabContent}>
          <View style={s.ringsRow}>
            <MiniRing value={stats.steps} max={10000} color={C.green} size={64} label="Steps" />
            <MiniRing value={stats.activeCalories} max={500} color={C.orange} size={64} label="Active Cal" />
            <MiniRing value={stats.activeMinutes} max={60} color={C.cyan} size={64} label="Active Min" />
          </View>

          <View style={s.metricsGrid}>
            <MetricCard icon="directions-walk" color={C.green} label="Steps" value={stats.steps.toLocaleString()} unit=""
              progress={stats.steps / 10000} subtext={`${Math.round((stats.steps / 10000) * 100)}% of goal`} />
            <MetricCard icon="straighten" color={C.blue} label="Distance" value={String(stats.distance)} unit="km" />
            <MetricCard icon="local-fire-department" color={C.orange} label="Active Cal" value={String(stats.activeCalories)} unit="kcal" />
            <MetricCard icon="self-improvement" color={C.teal} label="Active Min" value={String(stats.activeMinutes)} unit="min"
              progress={stats.activeMinutes / 60} />
          </View>

          <WeeklySparkline data={weeklyData.calories} color={C.orange} label="Calories Burned This Week" />
          <WeeklySparkline data={weeklyData.activeMinutes} color={C.cyan} label="Active Minutes This Week" />
        </View>
      )}

      {/* ── Sleep Tab ── */}
      {activeTab === "sleep" && (
        <View style={s.tabContent}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={[s.bigMetricCircle, { borderColor: C.purple + "40" }]}>
              <MaterialIcons name="bedtime" size={24} color={C.purple} />
              <Text style={[s.bigMetricValue, { color: C.purple }]}>{stats.sleepHours}</Text>
              <Text style={s.bigMetricUnit}>hours</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View style={[s.sleepQualityBadge, {
              backgroundColor: stats.sleepQuality === "excellent" ? C.green + "15"
                : stats.sleepQuality === "good" ? C.blue + "15"
                : stats.sleepQuality === "fair" ? C.gold + "15" : C.red + "15",
              borderColor: stats.sleepQuality === "excellent" ? C.green + "30"
                : stats.sleepQuality === "good" ? C.blue + "30"
                : stats.sleepQuality === "fair" ? C.gold + "30" : C.red + "30",
            }]}>
              <Text style={{
                color: stats.sleepQuality === "excellent" ? C.green
                  : stats.sleepQuality === "good" ? C.blue
                  : stats.sleepQuality === "fair" ? C.gold : C.red,
                fontFamily: "DMSans_700Bold", fontSize: 13,
              }}>
                {stats.sleepQuality.charAt(0).toUpperCase() + stats.sleepQuality.slice(1)} Quality
              </Text>
            </View>
            <View style={s.sleepGoalBadge}>
              <Text style={{ color: C.muted, fontFamily: "DMSans_500Medium", fontSize: 12 }}>
                Goal: 7-9 hrs
              </Text>
            </View>
          </View>

          <View style={s.metricsGrid}>
            <MetricCard icon="hotel" color={C.purple} label="Duration" value={String(stats.sleepHours)} unit="hrs"
              progress={stats.sleepHours / 8} subtext="Target: 8 hrs" />
            <MetricCard icon="show-chart" color={C.blue} label="HRV (Sleep)" value={stats.hrv ? String(stats.hrv) : "--"} unit="ms"
              subtext="Recovery indicator" />
          </View>

          <WeeklySparkline data={weeklyData.sleep} color={C.purple} label="Sleep This Week" />
        </View>
      )}

      {/* Footer: View Full Details */}
      <TouchableOpacity
        style={s.footerBtn}
        onPress={() => router.push("/wearable-sync" as any)}
      >
        <MaterialIcons name="settings" size={14} color={C.gold} />
        <Text style={s.footerBtnText}>Manage Wearable Connections</Text>
        <MaterialIcons name="chevron-right" size={14} color={C.gold} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.footerBtn, { borderColor: C.blue + "20" }]}
        onPress={() => router.push("/health-trends" as any)}
      >
        <MaterialIcons name="show-chart" size={14} color={C.blue} />
        <Text style={[s.footerBtnText, { color: C.blue }]}>View Health Trends</Text>
        <MaterialIcons name="chevron-right" size={14} color={C.blue} />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: C.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceText: {
    color: C.green,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
  },
  syncBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.gold + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 4,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  tabActive: {
    backgroundColor: C.gold + "15",
  },
  tabText: {
    color: C.muted,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  tabTextActive: {
    color: C.gold,
  },
  tabContent: {
    padding: 16,
    paddingTop: 12,
  },
  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "48%" as any,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  metricIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricLabel: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
  },
  metricUnit: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  metricProgress: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  metricProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  metricSubtext: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    marginTop: 4,
  },
  avgRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  avgCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  avgValue: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  avgLabel: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
    marginTop: 2,
  },
  bigMetricCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  bigMetricValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    marginTop: 2,
  },
  bigMetricUnit: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  sleepQualityBadge: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  sleepGoalBadge: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.gold + "08",
    borderWidth: 1,
    borderColor: C.gold + "20",
  },
  footerBtnText: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  // Empty state
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.gold + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: C.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  connectBtnText: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  infoText: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
