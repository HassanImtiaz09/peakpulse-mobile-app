import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, ImageBackground,
  ActivityIndicator, Dimensions, Platform, TextInput,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import Svg, { Path, Circle, Line, Rect, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { useWearable } from "@/lib/wearable-context";
import {
  fetchHealthHistory,
  type DailyHealthSummary,
} from "@/lib/health-service";
import {
  generateAndShareHealthReport, printHealthReport, getReportPreferences,
  saveReportPreferences, ALL_REPORT_METRICS, DEFAULT_SELECTED_METRICS,
  type ReportMetricKey,
} from "@/lib/health-report-generator";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { ScreenErrorBoundary } from "@/components/error-boundary";
import { UI } from "@/constants/ui-colors";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// ── Chart Configuration ──────────────────────────────────────────
type MetricKey = "steps" | "heartRate" | "activeCalories" | "sleepHours" | "distance" | "hrv";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  icon: string;
  decimals: number;
  formatValue: (v: number) => string;
}

const METRICS: MetricConfig[] = [
  {
    key: "steps",
    label: "Steps",
    unit: "steps",
    color: UI.green,
    icon: "directions-walk",
    decimals: 0,
    formatValue: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`,
  },
  {
    key: "heartRate",
    label: "Heart Rate",
    unit: "bpm",
    color: UI.red,
    icon: "favorite",
    decimals: 0,
    formatValue: (v) => `${Math.round(v)}`,
  },
  {
    key: "activeCalories",
    label: "Calories Burnt",
    unit: "kcal",
    color: UI.gold,
    icon: "local-fire-department",
    decimals: 0,
    formatValue: (v) => `${Math.round(v)}`,
  },
  {
    key: "sleepHours",
    label: "Sleep",
    unit: "hours",
    color: "#8B5CF6",
    icon: "bedtime",
    decimals: 1,
    formatValue: (v) => `${v.toFixed(1)}`,
  },
  {
    key: "distance",
    label: "Distance",
    unit: "km",
    color: "#3B82F6",
    icon: "straighten",
    decimals: 1,
    formatValue: (v) => `${v.toFixed(1)}`,
  },
  {
    key: "hrv",
    label: "HRV",
    unit: "ms",
    color: UI.rose,
    icon: "monitor-heart",
    decimals: 0,
    formatValue: (v) => `${Math.round(v)}`,
  },
];

// ── Chart Component ──────────────────────────────────────────────
const CHART_PADDING = { top: 16, right: 12, bottom: 28, left: 44 };

interface ChartProps {
  data: DailyHealthSummary[];
  metricKey: MetricKey;
  color: string;
  formatValue: (v: number) => string;
  decimals: number;
}

function HealthChart({ data, metricKey, color, formatValue, decimals }: ChartProps) {
  const screenWidth = Dimensions.get("window").width - 40; // 20px padding each side
  const chartWidth = screenWidth - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = 160;
  const totalHeight = chartHeight + CHART_PADDING.top + CHART_PADDING.bottom;
  const totalWidth = screenWidth;

  const values = data.map((d) => {
    const val = d[metricKey];
    return typeof val === "number" && val !== null ? val : 0;
  });

  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values.filter((v) => v > 0), 0);
  const range = maxVal - minVal || 1;

  // Scale values to chart coordinates
  const points = values.map((v, i) => ({
    x: CHART_PADDING.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: CHART_PADDING.top + chartHeight - ((v - minVal) / range) * chartHeight,
    value: v,
    date: data[i].date,
  }));

  // Build smooth path
  const linePath = points.length > 1
    ? points.reduce((path, p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cpx = (prev.x + p.x) / 2;
        return `${path} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
      }, "")
    : "";

  // Area fill path
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${CHART_PADDING.top + chartHeight} L ${points[0].x} ${CHART_PADDING.top + chartHeight} Z`
    : "";

  // Grid lines (4 horizontal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: CHART_PADDING.top + chartHeight * (1 - pct),
    label: formatValue(minVal + range * pct),
  }));

  // X-axis labels (show every nth label)
  const labelInterval = data.length <= 7 ? 1 : data.length <= 14 ? 2 : 5;
  const xLabels = data
    .map((d, i) => ({
      x: CHART_PADDING.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
      label: formatDateLabel(d.date, data.length),
      show: i % labelInterval === 0 || i === data.length - 1,
    }))
    .filter((l) => l.show);

  const gradientId = `grad-${metricKey}`;

  return (
    <Svg width={totalWidth} height={totalHeight}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {gridLines.map((gl, i) => (
        <React.Fragment key={i}>
          <Line
            x1={CHART_PADDING.left}
            y1={gl.y}
            x2={CHART_PADDING.left + chartWidth}
            y2={gl.y}
            stroke={UI.dim}
            strokeWidth={1}
          />
          <SvgText
            x={CHART_PADDING.left - 6}
            y={gl.y + 4}
            fontSize={9}
            fill={UI.secondaryLight}
            textAnchor="end"
          >
            {gl.label}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Area fill */}
      {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}

      {/* Line */}
      {linePath ? <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" /> : null}

      {/* Data points */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={color} stroke={UI.bg} strokeWidth={1.5} />
      ))}

      {/* X-axis labels */}
      {xLabels.map((xl, i) => (
        <SvgText
          key={i}
          x={xl.x}
          y={CHART_PADDING.top + chartHeight + 18}
          fontSize={9}
          fill={UI.secondaryLight}
          textAnchor="middle"
        >
          {xl.label}
        </SvgText>
      ))}
    </Svg>
  );
}

function formatDateLabel(dateStr: string, totalDays: number): string {
  const date = new Date(dateStr + "T00:00:00");
  if (totalDays <= 7) {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// ── Stat Summary Card ────────────────────────────────────────────
function StatSummary({
  data,
  metricKey,
  config,
}: {
  data: DailyHealthSummary[];
  metricKey: MetricKey;
  config: MetricConfig;
}) {
  const values = data.map((d) => {
    const val = d[metricKey];
    return typeof val === "number" && val !== null ? val : 0;
  }).filter((v) => v > 0);

  if (values.length === 0) {
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
        <Text style={{ color: UI.secondaryLight, fontSize: 12 }}>No data available</Text>
      </View>
    );
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  // Trend: compare last 3 days average to first 3 days average
  const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.slice(-3).length);
  const earlyAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, values.slice(0, 3).length);
  const trendPct = earlyAvg > 0 ? ((recentAvg - earlyAvg) / earlyAvg) * 100 : 0;
  const trendUp = trendPct > 2;
  const trendDown = trendPct < -2;

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingHorizontal: 4 }}>
      <View style={{ alignItems: "center", flex: 1 }}>
        <Text style={{ color: config.color, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
          {config.formatValue(avg)}
        </Text>
        <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Average</Text>
      </View>
      <View style={{ alignItems: "center", flex: 1 }}>
        <Text style={{ color: UI.green, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
          {config.formatValue(max)}
        </Text>
        <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Best</Text>
      </View>
      <View style={{ alignItems: "center", flex: 1 }}>
        <Text style={{ color: UI.gold, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
          {config.formatValue(min)}
        </Text>
        <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Lowest</Text>
      </View>
      <View style={{ alignItems: "center", flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <MaterialIcons
            name={trendUp ? "trending-up" : trendDown ? "trending-down" : "trending-flat"}
            size={14}
            color={trendUp ? UI.green : trendDown ? UI.red : UI.secondaryLight}
          />
          <Text
            style={{
              color: trendUp ? UI.green : trendDown ? UI.red : UI.secondaryLight,
              fontFamily: "DMSans_700Bold",
              fontSize: 14,
            }}
          >
            {Math.abs(trendPct).toFixed(0)}%
          </Text>
        </View>
        <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 9 }}>Trend</Text>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function HealthTrendsScreen() {
  const router = useRouter();
  const { isConnected, stats } = useWearable();
  const [period, setPeriod] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DailyHealthSummary[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("steps");
  const [exporting, setExporting] = useState(false);
  const [showReportConfig, setShowReportConfig] = useState(false);
  const [reportMetrics, setReportMetrics] = useState<ReportMetricKey[]>([...DEFAULT_SELECTED_METRICS]);
  const [personalNotes, setPersonalNotes] = useState("");
  const [reportPrefsLoaded, setReportPrefsLoaded] = useState(false);

  // Load saved report preferences
  useEffect(() => {
    (async () => {
      try {
        const prefs = await getReportPreferences();
        setReportMetrics(prefs.selectedMetrics);
        setPersonalNotes(prefs.personalNotes);
      } catch {} finally {
        setReportPrefsLoaded(true);
      }
    })();
  }, []);

  const toggleReportMetric = useCallback((key: ReportMetricKey) => {
    setReportMetrics((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      return next.length === 0 ? prev : next; // must have at least 1
    });
  }, []);

  const handleExport = useCallback(async (mode: "share" | "print") => {
    setExporting(true);
    try {
      await saveReportPreferences(reportMetrics, personalNotes);
      const config = { period, selectedMetrics: reportMetrics, personalNotes: personalNotes.trim() || undefined };
      if (mode === "share") {
        await generateAndShareHealthReport(config);
      } else {
        await printHealthReport(config);
      }
    } catch (e) {
      console.warn("[HealthTrends] Export failed:", e);
    } finally {
      setExporting(false);
    }
  }, [period, reportMetrics, personalNotes]);

  const loadData = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const history = await fetchHealthHistory(days);
      setData(history);
    } catch (e) {
      console.warn("[HealthTrends] Failed to load history:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const currentConfig = useMemo(
    () => METRICS.find((m) => m.key === selectedMetric) ?? METRICS[0],
    [selectedMetric],
  );

  return (
    <ScreenErrorBoundary screenName="health-trends">
    <View style={{ flex: 1, backgroundColor: UI.bg }}>
      {/* Hero Header */}
      <ImageBackground source={{ uri: DASHBOARD_BG }} style={{ height: 150 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{
              position: "absolute", top: 52, left: 20, width: 36, height: 36, borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center",
            }}
            onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
            <Text style={{ color: UI.fg, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: UI.gold2, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1 }}>ANALYTICS</Text>
          <Text style={{ color: UI.fg, fontFamily: "BebasNeue_400Regular", fontSize: 26, letterSpacing: -0.5 }}>Health Trends</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={{
          flexDirection: "row", backgroundColor: UI.surface, borderRadius: 14, padding: 4,
          marginBottom: 16, borderWidth: 1, borderColor: UI.borderGold,
        }}>
          {([7, 30] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                backgroundColor: period === p ? UI.gold : "transparent",
              }}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={{
                  color: period === p ? UI.bg : UI.secondaryLight,
                  fontFamily: "DMSans_700Bold",
                  fontSize: 14,
                }}
              >
                {p === 7 ? "7 Days" : "30 Days"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metric Selector Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        >
          {METRICS.map((m) => {
            const isActive = selectedMetric === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: isActive ? m.color + "20" : UI.surface,
                  borderWidth: 1,
                  borderColor: isActive ? m.color + "50" : UI.goldAlpha10,
                }}
                onPress={() => setSelectedMetric(m.key)}
              >
                <MaterialIcons name={m.icon as any} size={16} color={isActive ? m.color : UI.secondaryLight} />
                <Text
                  style={{
                    color: isActive ? m.color : UI.secondaryLight,
                    fontFamily: isActive ? "DMSans_700Bold" : "DMSans_500Medium",
                    fontSize: 12,
                  }}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Chart Card */}
        <View style={{
          backgroundColor: UI.surface,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1.5,
          borderColor: currentConfig.color + "30",
        }}>
          {/* Chart Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MaterialIcons name={currentConfig.icon as any} size={20} color={currentConfig.color} />
            <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>
              {currentConfig.label}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 11 }}>
              {period === 7 ? "Past 7 Days" : "Past 30 Days"}
            </Text>
          </View>

          {/* Chart */}
          {loading ? (
            <View style={{ height: 200, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={currentConfig.color} size="large" />
              <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 8 }}>
                Loading health data...
              </Text>
            </View>
          ) : data.length > 0 ? (
            <>
              <HealthChart
                data={data}
                metricKey={selectedMetric}
                color={currentConfig.color}
                formatValue={currentConfig.formatValue}
                decimals={currentConfig.decimals}
              />
              <StatSummary data={data} metricKey={selectedMetric} config={currentConfig} />
            </>
          ) : (
            <View style={{ height: 200, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="show-chart" size={40} color={UI.secondaryLight} />
              <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_500Medium", fontSize: 14, marginTop: 8 }}>
                No data available
              </Text>
              <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4, textAlign: "center" }}>
                Connect a wearable or health platform to see your trends.
              </Text>
            </View>
          )}
        </View>

        {/* All Metrics Overview */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View style={{ width: 3, height: 16, backgroundColor: UI.gold, borderRadius: 2 }} />
            <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>
              {period === 7 ? "7-Day" : "30-Day"} Summary
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {METRICS.map((m) => {
            const values = data
              .map((d) => {
                const val = d[m.key];
                return typeof val === "number" && val !== null ? val : 0;
              })
              .filter((v) => v > 0);

            const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            const todayVal = data.length > 0 ? (data[data.length - 1][m.key] ?? 0) : 0;
            const todayNum = typeof todayVal === "number" ? todayVal : 0;

            return (
              <TouchableOpacity
                key={m.key}
                style={{
                  width: "47%",
                  backgroundColor: selectedMetric === m.key ? m.color + "12" : UI.surface,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: selectedMetric === m.key ? m.color + "40" : UI.goldAlpha10,
                }}
                onPress={() => setSelectedMetric(m.key)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <MaterialIcons name={m.icon as any} size={16} color={m.color} />
                  <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{m.label}</Text>
                </View>
                <Text style={{ color: m.color, fontFamily: "DMSans_700Bold", fontSize: 22 }}>
                  {m.formatValue(todayNum)}
                </Text>
                <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                  Today
                </Text>
                <View style={{ height: 1, backgroundColor: UI.dim, marginVertical: 8 }} />
                <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                  {m.formatValue(avg)}
                </Text>
                <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 10 }}>
                  {period}-Day Avg
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Data Source Info */}
        <View style={{
          backgroundColor: UI.surface, borderRadius: 16, padding: 16, marginTop: 16,
          borderWidth: 1, borderColor: UI.goldAlpha10,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <MaterialIcons name="info-outline" size={18} color={UI.gold} />
            <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Data Source</Text>
          </View>
          <Text style={{ color: UI.secondaryLight, fontSize: 12, lineHeight: 18 }}>
            {stats.dataSource === "healthkit"
              ? "Data is sourced from Apple HealthKit. Trends include all data written by your wearable devices."
              : stats.dataSource === "healthconnect"
              ? "Data is sourced from Google Health Connect. Trends include all data written by your wearable devices."
              : "Showing simulated data for preview. Connect Apple Health or Health Connect on a real device for actual trends."}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 12, backgroundColor: UI.goldAlpha10, borderRadius: 12,
              paddingVertical: 10, alignItems: "center",
            }}
            onPress={() => router.push("/wearable-sync" as any)}
          >
            <Text style={{ color: UI.gold, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>
              Manage Wearable Connections
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Export Health Report ═══ */}
        <View style={{
          backgroundColor: UI.surface, borderRadius: 16, padding: 16, marginTop: 16,
          borderWidth: 1, borderColor: UI.goldAlpha20,
        }}>
          <TouchableOpacity
            onPress={() => setShowReportConfig(!showReportConfig)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="picture-as-pdf" size={18} color={UI.gold} />
              <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Export Health Report</Text>
            </View>
            <MaterialIcons name={showReportConfig ? "expand-less" : "expand-more"} size={20} color={UI.secondaryLight} />
          </TouchableOpacity>

          <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 8, marginBottom: showReportConfig ? 14 : 0, lineHeight: 18 }}>
            Generate a customised PDF report to share with your trainer, physio, or doctor.
          </Text>

          {showReportConfig && (
            <View>
              {/* Metric Selection */}
              <Text style={{ color: UI.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 12, marginBottom: 8 }}>
                Select Metrics to Include
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {ALL_REPORT_METRICS.map((m) => {
                  const active = reportMetrics.includes(m.key);
                  return (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => toggleReportMetric(m.key)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                        backgroundColor: active ? "#F59E0B20" : UI.goldAlpha6,
                        borderWidth: 1, borderColor: active ? "#F59E0B60" : UI.goldAlpha10,
                      }}
                    >
                      <MaterialIcons name={active ? "check-box" : "check-box-outline-blank"} size={14} color={active ? UI.gold : UI.secondaryLight} />
                      <Text style={{
                        color: active ? UI.gold3 : UI.secondaryLight,
                        fontFamily: active ? "DMSans_600SemiBold" : "DMSans_400Regular", fontSize: 11,
                      }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Personal Notes */}
              <Text style={{ color: UI.gold3, fontFamily: "DMSans_600SemiBold", fontSize: 12, marginBottom: 8 }}>
                Notes for Healthcare Provider
              </Text>
              <TextInput
                value={personalNotes}
                onChangeText={setPersonalNotes}
                placeholder="Add notes for your trainer, physio, or doctor (e.g., current goals, injuries, medications)..."
                placeholderTextColor="#B4530960"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  backgroundColor: UI.bg, borderRadius: 10, padding: 12,
                  color: UI.gold3, fontFamily: "DMSans_400Regular", fontSize: 12,
                  borderWidth: 1, borderColor: UI.borderGold,
                  minHeight: 80, lineHeight: 18,
                }}
              />
              <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 4, marginBottom: 14 }}>
                These notes will appear at the top of your PDF report.
              </Text>
            </View>
          )}

          {/* Export Buttons */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: showReportConfig ? 0 : 12 }}>
            <TouchableOpacity
              style={{
                flex: 1, backgroundColor: UI.gold, borderRadius: 12,
                paddingVertical: 12, alignItems: "center", flexDirection: "row",
                justifyContent: "center", gap: 6, opacity: exporting ? 0.6 : 1,
              }}
              disabled={exporting}
              onPress={() => handleExport("share")}
            >
              {exporting ? (
                <ActivityIndicator color={UI.bg} size="small" />
              ) : (
                <MaterialIcons name="share" size={16} color={UI.bg} />
              )}
              <Text style={{ color: UI.bg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                {exporting ? "Generating..." : `Share ${period}-Day Report`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: UI.goldAlpha10, borderRadius: 12,
                paddingVertical: 12, paddingHorizontal: 16, alignItems: "center",
                justifyContent: "center", borderWidth: 1, borderColor: UI.goldAlpha20,
              }}
              disabled={exporting}
              onPress={() => handleExport("print")}
            >
              <MaterialIcons name="print" size={18} color={UI.gold} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
    </ScreenErrorBoundary>
  );
}
