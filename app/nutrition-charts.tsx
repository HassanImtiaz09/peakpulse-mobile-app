/**
 * Nutrition Charts — daily/weekly calorie and macro trend visualisation.
 * Uses pure RN + Svg for lightweight, cross-platform charts.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Rect, Circle, Text as SvgText, Line, G, Path } from "react-native-svg";
import { getHistoricalMeals, type MealEntry } from "@/lib/calorie-context";
import { useCalories } from "@/lib/calorie-context";

import { GOLDEN_PANTRY, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
type ViewMode = "daily" | "weekly";

interface DaySummary {
  date: string;
  label: string;
  shortLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${d.getDate()} ${month}`;
}

function formatShortLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return DAYS_OF_WEEK[d.getDay()];
}

export default function NutritionChartsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { calorieGoal } = useCalories();

  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DaySummary[]>([]);
  const [weeklyData, setWeeklyData] = useState<DaySummary[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load last 7 days for daily view
      const history7 = await getHistoricalMeals(7);
      const daily: DaySummary[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const meals = history7[key] || [];
        daily.push({
          date: key,
          label: formatDateLabel(key),
          shortLabel: formatShortLabel(key),
          calories: meals.reduce((s: number, m: MealEntry) => s + (m.calories || 0), 0),
          protein: meals.reduce((s: number, m: MealEntry) => s + (m.protein || 0), 0),
          carbs: meals.reduce((s: number, m: MealEntry) => s + (m.carbs || 0), 0),
          fat: meals.reduce((s: number, m: MealEntry) => s + (m.fat || 0), 0),
          mealCount: meals.length,
        });
      }
      setDailyData(daily);

      // Load last 28 days for weekly view (4 weeks)
      const history28 = await getHistoricalMeals(28);
      const weekly: DaySummary[] = [];
      for (let w = 3; w >= 0; w--) {
        let cal = 0, prot = 0, carb = 0, f = 0, count = 0;
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() - w * 7);
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart);
          d.setDate(d.getDate() + i);
          const key = d.toISOString().split("T")[0];
          const meals = history28[key] || [];
          cal += meals.reduce((s: number, m: MealEntry) => s + (m.calories || 0), 0);
          prot += meals.reduce((s: number, m: MealEntry) => s + (m.protein || 0), 0);
          carb += meals.reduce((s: number, m: MealEntry) => s + (m.carbs || 0), 0);
          f += meals.reduce((s: number, m: MealEntry) => s + (m.fat || 0), 0);
          count += meals.length;
        }
        const startLabel = formatDateLabel(weekStart.toISOString().split("T")[0]);
        const endLabel = formatDateLabel(weekEnd.toISOString().split("T")[0]);
        weekly.push({
          date: weekStart.toISOString().split("T")[0],
          label: `${startLabel} – ${endLabel}`,
          shortLabel: `W${4 - w}`,
          calories: Math.round(cal / 7),
          protein: Math.round(prot / 7),
          carbs: Math.round(carb / 7),
          fat: Math.round(f / 7),
          mealCount: count,
        });
      }
      setWeeklyData(weekly);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const data = viewMode === "daily" ? dailyData : weeklyData;
  const maxCal = Math.max(...data.map(d => d.calories), calorieGoal, 1);

  // Today's macro breakdown (from daily data, last item)
  const todayData = dailyData[dailyData.length - 1];
  const totalMacroG = (todayData?.protein || 0) + (todayData?.carbs || 0) + (todayData?.fat || 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nutrition Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}>
        {/* View mode toggle */}
        <View style={styles.toggleRow}>
          {(["daily", "weekly"] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
                {mode === "daily" ? "7-Day" : "4-Week"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#F59E0B" size="large" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Calorie Bar Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                {viewMode === "daily" ? "Daily Calories" : "Avg Daily Calories (per week)"}
              </Text>
              <Text style={styles.chartSubtitle}>
                Goal: {calorieGoal} kcal/day
              </Text>
              <View style={{ marginTop: 12 }}>
                <Svg width="100%" height={200} viewBox={`0 0 ${data.length * 52 + 20} 200`}>
                  {/* Goal line */}
                  <Line
                    x1={0}
                    y1={180 - (calorieGoal / maxCal) * 160}
                    x2={data.length * 52 + 20}
                    y2={180 - (calorieGoal / maxCal) * 160}
                    stroke="#F59E0B"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                    opacity={0.5}
                  />
                  {data.map((d, i) => {
                    const barH = Math.max(2, (d.calories / maxCal) * 160);
                    const x = i * 52 + 16;
                    const overGoal = d.calories > calorieGoal;
                    return (
                      <G key={d.date}>
                        {/* Bar */}
                        <Rect
                          x={x}
                          y={180 - barH}
                          width={32}
                          height={barH}
                          rx={6}
                          fill={overGoal ? "#EF4444" : "#F59E0B"}
                          opacity={0.85}
                        />
                        {/* Calorie value */}
                        <SvgText
                          x={x + 16}
                          y={180 - barH - 6}
                          textAnchor="middle"
                          fill="#F1F5F9"
                          fontSize={9}
                          fontWeight="bold"
                        >
                          {d.calories > 0 ? d.calories : ""}
                        </SvgText>
                        {/* Day label */}
                        <SvgText
                          x={x + 16}
                          y={196}
                          textAnchor="middle"
                          fill="#B45309"
                          fontSize={9}
                          fontWeight="600"
                        >
                          {d.shortLabel}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </View>
            </View>

            {/* Macro Stacked Bar Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                {viewMode === "daily" ? "Daily Macros (g)" : "Avg Daily Macros (g)"}
              </Text>
              <View style={styles.macroLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
                  <Text style={styles.legendText}>Protein</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#FDE68A" }]} />
                  <Text style={styles.legendText}>Carbs</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#FBBF24" }]} />
                  <Text style={styles.legendText}>Fat</Text>
                </View>
              </View>
              <View style={{ marginTop: 8 }}>
                {data.map((d, i) => {
                  const totalG = d.protein + d.carbs + d.fat;
                  const maxG = Math.max(...data.map(x => x.protein + x.carbs + x.fat), 1);
                  const barW = totalG > 0 ? Math.max(10, (totalG / maxG) * 100) : 0;
                  const protPct = totalG > 0 ? (d.protein / totalG) * 100 : 33;
                  const carbPct = totalG > 0 ? (d.carbs / totalG) * 100 : 33;
                  const fatPct = totalG > 0 ? (d.fat / totalG) * 100 : 34;
                  return (
                    <View key={d.date} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ color: "#B45309", fontSize: 10, fontFamily: "DMSans_700Bold", width: 32 }}>
                        {d.shortLabel}
                      </Text>
                      <View style={{ flex: 1, flexDirection: "row", height: 16, borderRadius: 8, overflow: "hidden", backgroundColor: "rgba(245,158,11,0.06)" }}>
                        {totalG > 0 && (
                          <>
                            <View style={{ width: `${protPct * barW / 100}%`, backgroundColor: "#3B82F6", borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }} />
                            <View style={{ width: `${carbPct * barW / 100}%`, backgroundColor: "#FDE68A" }} />
                            <View style={{ width: `${fatPct * barW / 100}%`, backgroundColor: "#FBBF24", borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />
                          </>
                        )}
                      </View>
                      <Text style={{ color: "#B45309", fontSize: 9, fontFamily: "DMSans_700Bold", width: 36, textAlign: "right" }}>
                        {totalG > 0 ? `${totalG}g` : "—"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Today's Macro Donut Chart */}
            {todayData && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Today's Macro Breakdown</Text>
                <View style={{ alignItems: "center", marginTop: 12 }}>
                  <Svg width={180} height={180} viewBox="0 0 180 180">
                    {totalMacroG > 0 ? (
                      (() => {
                        const cx = 90, cy = 90, r = 70;
                        const protAngle = (todayData.protein / totalMacroG) * 360;
                        const carbAngle = (todayData.carbs / totalMacroG) * 360;
                        const fatAngle = (todayData.fat / totalMacroG) * 360;

                        function arcPath(startAngle: number, endAngle: number): string {
                          const startRad = ((startAngle - 90) * Math.PI) / 180;
                          const endRad = ((endAngle - 90) * Math.PI) / 180;
                          const x1 = cx + r * Math.cos(startRad);
                          const y1 = cy + r * Math.sin(startRad);
                          const x2 = cx + r * Math.cos(endRad);
                          const y2 = cy + r * Math.sin(endRad);
                          const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                          return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                        }

                        let start = 0;
                        const slices = [
                          { angle: protAngle, color: "#3B82F6" },
                          { angle: carbAngle, color: "#FDE68A" },
                          { angle: fatAngle, color: "#FBBF24" },
                        ];

                        return (
                          <ImageBackground source={{ uri: GOLDEN_PANTRY }} style={{ flex: 1 }} resizeMode="cover">
                          <>
                            {slices.map((s, idx) => {
                              if (s.angle < 0.5) { start += s.angle; return null; }
                              const end = start + s.angle;
                              const path = arcPath(start, end);
                              start = end;
                              return <Path key={idx} d={path} fill={s.color} opacity={0.9} />;
                            })}
                            {/* Center hole for donut effect */}
                            <Circle cx={cx} cy={cy} r={42} fill="#141A22" />
                            <SvgText x={cx} y={cy - 4} textAnchor="middle" fill="#F1F5F9" fontSize={18} fontWeight="bold">
                              {todayData.calories}
                            </SvgText>
                            <SvgText x={cx} y={cy + 14} textAnchor="middle" fill="#B45309" fontSize={10}>
                              kcal
                            </SvgText>
                          </>
                          </ImageBackground>
                        );
                      })()
                    ) : (
                      <>
                        <Circle cx={90} cy={90} r={70} fill="rgba(245,158,11,0.06)" />
                        <Circle cx={90} cy={90} r={42} fill="#141A22" />
                        <SvgText x={90} y={90} textAnchor="middle" fill="#B45309" fontSize={12}>
                          No data
                        </SvgText>
                      </>
                    )}
                  </Svg>
                </View>
                {/* Macro stats row */}
                <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 12 }}>
                  {[
                    { label: "Protein", value: todayData.protein, color: "#3B82F6", pct: totalMacroG > 0 ? Math.round((todayData.protein / totalMacroG) * 100) : 0 },
                    { label: "Carbs", value: todayData.carbs, color: "#FDE68A", pct: totalMacroG > 0 ? Math.round((todayData.carbs / totalMacroG) * 100) : 0 },
                    { label: "Fat", value: todayData.fat, color: "#FBBF24", pct: totalMacroG > 0 ? Math.round((todayData.fat / totalMacroG) * 100) : 0 },
                  ].map(m => (
                    <View key={m.label} style={{ alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color }} />
                        <Text style={{ color: "#F1F5F9", fontSize: 12, fontFamily: "DMSans_700Bold" }}>{m.value}g</Text>
                      </View>
                      <Text style={{ color: "#B45309", fontSize: 10, marginTop: 2 }}>{m.label} ({m.pct}%)</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Summary stats */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                {viewMode === "daily" ? "7-Day Summary" : "4-Week Summary"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {[
                  { label: "Avg Calories", value: `${Math.round(data.reduce((s, d) => s + d.calories, 0) / data.length)} kcal`, icon: "local-fire-department" },
                  { label: "Avg Protein", value: `${Math.round(data.reduce((s, d) => s + d.protein, 0) / data.length)}g`, icon: "fitness-center" },
                  { label: "Total Meals", value: `${data.reduce((s, d) => s + d.mealCount, 0)}`, icon: "restaurant" },
                  { label: "Days Tracked", value: `${data.filter(d => d.mealCount > 0).length}/${data.length}`, icon: "calendar-today" },
                ].map(stat => (
                  <View key={stat.label} style={{ flex: 1, minWidth: "45%", backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)" }}>
                    <MaterialIcons name={stat.icon as any} size={18} color="#F59E0B" />
                    <Text style={{ color: "#F1F5F9", fontSize: 16, fontFamily: "DMSans_700Bold", marginTop: 4 }}>{stat.value}</Text>
                    <Text style={{ color: "#B45309", fontSize: 10, fontFamily: "DMSans_700Bold" }}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E14" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#F1F5F9", fontSize: 18, fontFamily: "BebasNeue_400Regular" },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(245,158,11,0.06)", borderWidth: 1, borderColor: "rgba(245,158,11,0.08)" },
  toggleBtnActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  toggleText: { color: "#B45309", fontSize: 13, fontFamily: "DMSans_700Bold" },
  toggleTextActive: { color: "#F1F5F9" },
  chartCard: { backgroundColor: "#141A22", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" },
  chartTitle: { color: "#F1F5F9", fontSize: 15, fontFamily: "DMSans_700Bold" },
  chartSubtitle: { color: "#B45309", fontSize: 11, fontFamily: "DMSans_700Bold", marginTop: 2 },
  macroLegend: { flexDirection: "row", gap: 12, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#B45309", fontSize: 10, fontFamily: "DMSans_700Bold" },
});
