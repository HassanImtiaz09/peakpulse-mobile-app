import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Rect, Line, Text as SvgText, Path } from "react-native-svg";
import { ScreenContainer } from "@/components/screen-container";
import { getHistoricalMeals, type MealEntry } from "@/lib/calorie-context";

const SF = { bg: "#0A0E14", card: "#141A22", orange: "#F59E0B", gold: "#FBBF24", cream: "#FDE68A", muted: "#B45309", text: "#F1F5F9", border: "rgba(245,158,11,0.10)", green: "#22C55E", blue: "#60A5FA", red: "#EF4444" };

const MEAL_TYPE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  breakfast: "free-breakfast", lunch: "restaurant", dinner: "dinner-dining", snack: "cookie",
};

interface TimelineEntry extends MealEntry { date: string; }

type ChartMetric = "calories" | "protein" | "carbs" | "fat";

const CHART_METRICS: { key: ChartMetric; label: string; color: string; unit: string }[] = [
  { key: "calories", label: "Calories", color: SF.gold, unit: "kcal" },
  { key: "protein", label: "Protein", color: SF.blue, unit: "g" },
  { key: "carbs", label: "Carbs", color: SF.green, unit: "g" },
  { key: "fat", label: "Fat", color: SF.orange, unit: "g" },
];

const SCREEN_W = Dimensions.get("window").width;

export default function MealTimelineScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [daysToLoad, setDaysToLoad] = useState(14);
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>("calories");
  const [showChart, setShowChart] = useState(true);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getHistoricalMeals(daysToLoad);
      const all: TimelineEntry[] = [];
      for (const [date, meals] of Object.entries(history)) {
        for (const m of meals) all.push({ ...m, date });
      }
      all.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
      setEntries(all);
    } catch { /* ignore */ }
    setLoading(false);
  }, [daysToLoad]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  const grouped = entries.reduce<Record<string, TimelineEntry[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Chart data: weekly averages
  const chartData = useMemo(() => {
    const dailyTotals: Record<string, { calories: number; protein: number; carbs: number; fat: number; count: number }> = {};
    for (const [date, meals] of Object.entries(grouped)) {
      dailyTotals[date] = {
        calories: meals.reduce((s, m) => s + m.calories, 0),
        protein: meals.reduce((s, m) => s + m.protein, 0),
        carbs: meals.reduce((s, m) => s + m.carbs, 0),
        fat: meals.reduce((s, m) => s + m.fat, 0),
        count: meals.length,
      };
    }

    // Group into weeks (7-day buckets from most recent)
    const allDates = Object.keys(dailyTotals).sort((a, b) => a.localeCompare(b));
    if (allDates.length === 0) return [];

    const weeks: { label: string; avg: Record<ChartMetric, number>; days: number }[] = [];
    let bucket: string[] = [];

    for (let i = allDates.length - 1; i >= 0; i--) {
      bucket.push(allDates[i]);
      if (bucket.length === 7 || i === 0) {
        const days = bucket.length;
        const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        for (const d of bucket) {
          const dt = dailyTotals[d];
          if (dt) { totals.calories += dt.calories; totals.protein += dt.protein; totals.carbs += dt.carbs; totals.fat += dt.fat; }
        }
        const oldest = bucket[bucket.length - 1];
        const od = new Date(oldest + "T12:00:00");
        const label = od.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        weeks.unshift({
          label,
          avg: { calories: Math.round(totals.calories / days), protein: Math.round(totals.protein / days), carbs: Math.round(totals.carbs / days), fat: Math.round(totals.fat / days) },
          days,
        });
        bucket = [];
      }
    }
    return weeks;
  }, [grouped]);

  const metric = CHART_METRICS.find(m => m.key === selectedMetric)!;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === todayStr) return "Today";
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const getDaySummary = (meals: TimelineEntry[]) => ({
    cal: meals.reduce((s, m) => s + m.calories, 0),
    p: meals.reduce((s, m) => s + m.protein, 0),
    c: meals.reduce((s, m) => s + m.carbs, 0),
    f: meals.reduce((s, m) => s + m.fat, 0),
    count: meals.length,
  });

  const renderChart = () => {
    if (chartData.length === 0) return null;
    const chartW = SCREEN_W - 64;
    const chartH = 120;
    const padL = 36;
    const padR = 8;
    const padT = 8;
    const padB = 24;
    const drawW = chartW - padL - padR;
    const drawH = chartH - padT - padB;

    const values = chartData.map(w => w.avg[selectedMetric]);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;

    const barWidth = Math.min(28, (drawW / chartData.length) - 4);
    const gap = (drawW - barWidth * chartData.length) / (chartData.length + 1);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <TouchableOpacity onPress={() => setShowChart(!showChart)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons name="bar-chart" size={18} color={SF.gold} />
            <Text style={styles.chartTitle}>Weekly Averages</Text>
            <MaterialIcons name={showChart ? "expand-less" : "expand-more"} size={18} color={SF.muted} />
          </TouchableOpacity>
        </View>

        {showChart && (
          <>
            <View style={styles.metricTabs}>
              {CHART_METRICS.map(m => (
                <TouchableOpacity key={m.key} style={[styles.metricTab, selectedMetric === m.key && { backgroundColor: m.color + "20", borderColor: m.color + "40" }]}
                  onPress={() => setSelectedMetric(m.key)}>
                  <Text style={[styles.metricTabText, selectedMetric === m.key && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Svg width={chartW} height={chartH}>
              {/* Grid lines */}
              {[0, 0.5, 1].map(frac => {
                const y = padT + drawH * (1 - frac);
                const val = Math.round(minVal + range * frac);
                return (
                  <React.Fragment key={frac}>
                    <Line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke={SF.border} strokeWidth={1} />
                    <SvgText x={padL - 4} y={y + 3} fontSize={9} fill={SF.muted} textAnchor="end">{val}</SvgText>
                  </React.Fragment>
                );
              })}

              {/* Bars */}
              {chartData.map((week, i) => {
                const x = padL + gap + i * (barWidth + gap);
                const val = week.avg[selectedMetric];
                const barH = Math.max(2, (val - minVal) / range * drawH);
                const y = padT + drawH - barH;
                return (
                  <React.Fragment key={i}>
                    <Rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={metric.color} opacity={0.85} />
                    <SvgText x={x + barWidth / 2} y={chartH - 4} fontSize={8} fill={SF.muted} textAnchor="middle">{week.label}</SvgText>
                    <SvgText x={x + barWidth / 2} y={y - 3} fontSize={8} fill={metric.color} textAnchor="middle" fontWeight="bold">{val}</SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>

            {/* Summary stats */}
            <View style={styles.statRow}>
              {chartData.length > 0 && (
                <>
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: metric.color }]}>{chartData[chartData.length - 1].avg[selectedMetric]}</Text>
                    <Text style={styles.statLabel}>This week</Text>
                  </View>
                  {chartData.length > 1 && (
                    <View style={styles.statItem}>
                      <Text style={[styles.statVal, { color: metric.color }]}>{chartData[chartData.length - 2].avg[selectedMetric]}</Text>
                      <Text style={styles.statLabel}>Last week</Text>
                    </View>
                  )}
                  <View style={styles.statItem}>
                    <Text style={[styles.statVal, { color: metric.color }]}>
                      {Math.round(chartData.reduce((s, w) => s + w.avg[selectedMetric], 0) / chartData.length)}
                    </Text>
                    <Text style={styles.statLabel}>Overall avg</Text>
                  </View>
                  {chartData.length > 1 && (() => {
                    const curr = chartData[chartData.length - 1].avg[selectedMetric];
                    const prev = chartData[chartData.length - 2].avg[selectedMetric];
                    const diff = curr - prev;
                    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
                    return (
                      <View style={styles.statItem}>
                        <Text style={[styles.statVal, { color: diff >= 0 ? SF.green : SF.red }]}>
                          {diff >= 0 ? "+" : ""}{pct}%
                        </Text>
                        <Text style={styles.statLabel}>Change</Text>
                      </View>
                    );
                  })()}
                </>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderMealItem = (item: TimelineEntry) => {
    const isExpanded = expandedId === item.id;
    const icon = MEAL_TYPE_ICONS[item.mealType] || "restaurant";
    return (
      <TouchableOpacity key={item.id} style={styles.mealCard} onPress={() => setExpandedId(isExpanded ? null : item.id)} activeOpacity={0.7}>
        <View style={styles.mealRow}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumb]}>
              <MaterialIcons name={icon} size={20} color={SF.muted} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.mealName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.typePill}><Text style={styles.typeText}>{item.mealType}</Text></View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
              <Text style={styles.calText}>{item.calories} kcal</Text>
              <Text style={styles.timeText}>{formatTime(item.loggedAt)}</Text>
            </View>
          </View>
          <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={20} color={SF.muted} />
        </View>
        {isExpanded && (
          <View style={styles.expandedSection}>
            {item.photoUri && <Image source={{ uri: item.photoUri }} style={styles.expandedPhoto} contentFit="cover" />}
            <View style={styles.macroRow}>
              <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.blue }]}>{item.protein}g</Text><Text style={styles.macroLabel}>Protein</Text></View>
              <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.green }]}>{item.carbs}g</Text><Text style={styles.macroLabel}>Carbs</Text></View>
              <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.orange }]}>{item.fat}g</Text><Text style={styles.macroLabel}>Fat</Text></View>
              <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.gold }]}>{item.calories}</Text><Text style={styles.macroLabel}>kcal</Text></View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDateSection = ({ item: dateStr }: { item: string }) => {
    const meals = grouped[dateStr];
    const summary = getDaySummary(meals);
    const photosCount = meals.filter(m => m.photoUri).length;
    return (
      <View style={styles.dateSection}>
        <View style={styles.dateHeader}>
          <View>
            <Text style={styles.dateTitle}>{formatDate(dateStr)}</Text>
            <Text style={styles.dateSub}>{summary.count} meal{summary.count !== 1 ? "s" : ""}{photosCount > 0 ? ` · ${photosCount} photo${photosCount !== 1 ? "s" : ""}` : ""}</Text>
          </View>
          <View style={styles.daySummaryPill}><Text style={styles.daySummaryCal}>{summary.cal} kcal</Text></View>
        </View>
        {photosCount > 0 && (
          <View style={styles.photoStrip}>
            {meals.filter(m => m.photoUri).map(m => (
              <TouchableOpacity key={m.id} onPress={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                <Image source={{ uri: m.photoUri! }} style={styles.stripThumb} contentFit="cover" />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {meals.map(renderMealItem)}
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={SF.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Timeline</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={SF.orange} size="large" />
          <Text style={styles.loadingText}>Loading meals...</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="restaurant-menu" size={48} color={SF.muted} />
          <Text style={styles.emptyTitle}>No meals logged yet</Text>
          <Text style={styles.emptyDesc}>Log meals to see your food diary and trends.</Text>
          <TouchableOpacity style={styles.logBtn} onPress={() => router.push("/(tabs)/meals")}>
            <Text style={styles.logBtnText}>Log a Meal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedDates}
          renderItem={renderDateSection}
          keyExtractor={d => d}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderChart}
          ListFooterComponent={
            <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setDaysToLoad(prev => prev + 14)}>
              <MaterialIcons name="history" size={16} color={SF.orange} />
              <Text style={styles.loadMoreText}>Load more days</Text>
            </TouchableOpacity>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SF.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SF.card, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: SF.muted, fontSize: 13 },
  emptyTitle: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 18 },
  emptyDesc: { color: SF.muted, fontSize: 13, textAlign: "center", paddingHorizontal: 40 },
  logBtn: { backgroundColor: SF.orange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  logBtnText: { color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 14 },

  // Chart
  chartContainer: { backgroundColor: SF.card, borderRadius: 14, padding: 12, marginTop: 12, marginBottom: 8, borderWidth: 1, borderColor: SF.border },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  chartTitle: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 14 },
  metricTabs: { flexDirection: "row", gap: 6, marginBottom: 10 },
  metricTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: SF.border },
  metricTabText: { color: SF.muted, fontSize: 11, fontFamily: "DMSans_700Bold" },
  statRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: SF.border },
  statItem: { alignItems: "center" },
  statVal: { fontFamily: "DMSans_700Bold", fontSize: 14 },
  statLabel: { color: SF.muted, fontSize: 9, marginTop: 2 },

  // Timeline
  dateSection: { marginBottom: 20 },
  dateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 8 },
  dateTitle: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 16 },
  dateSub: { color: SF.muted, fontSize: 11, marginTop: 2 },
  daySummaryPill: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  daySummaryCal: { color: SF.cream, fontSize: 12, fontFamily: "DMSans_700Bold" },
  photoStrip: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  stripThumb: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: SF.border },
  mealCard: { backgroundColor: SF.card, borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: SF.border },
  mealRow: { flexDirection: "row", alignItems: "center" },
  thumbnail: { width: 44, height: 44, borderRadius: 10 },
  placeholderThumb: { backgroundColor: "rgba(245,158,11,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border },
  mealName: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 14, flex: 1 },
  typePill: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { color: SF.cream, fontSize: 9, fontFamily: "DMSans_700Bold", textTransform: "capitalize" },
  calText: { color: SF.gold, fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  timeText: { color: SF.muted, fontSize: 11 },
  expandedSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: SF.border, paddingTop: 10 },
  expandedPhoto: { width: "100%", height: 180, borderRadius: 10, marginBottom: 10 },
  macroRow: { flexDirection: "row", justifyContent: "space-around" },
  macroItem: { alignItems: "center" },
  macroVal: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 16 },
  macroLabel: { color: SF.muted, fontSize: 10, marginTop: 2 },
  loadMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, marginTop: 8 },
  loadMoreText: { color: SF.orange, fontSize: 13, fontFamily: "DMSans_700Bold" },
});
