import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { getHistoricalMeals, type MealEntry } from "@/lib/calorie-context";

const SF = { bg: "#0A0500", card: "#150A00", orange: "#F59E0B", gold: "#FBBF24", cream: "#FDE68A", muted: "#B45309", text: "#FFF7ED", border: "rgba(245,158,11,0.10)" };

const MEAL_TYPE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  breakfast: "free-breakfast", lunch: "restaurant", dinner: "dinner-dining", snack: "cookie",
};

interface TimelineEntry extends MealEntry {
  date: string;
}

export default function MealTimelineScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [daysToLoad, setDaysToLoad] = useState(14);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getHistoricalMeals(daysToLoad);
      const all: TimelineEntry[] = [];
      for (const [date, meals] of Object.entries(history)) {
        for (const m of meals) {
          all.push({ ...m, date });
        }
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    if (dateStr === todayStr) return "Today";
    if (dateStr === yesterdayStr) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const getDaySummary = (meals: TimelineEntry[]) => {
    const cal = meals.reduce((s, m) => s + m.calories, 0);
    const p = meals.reduce((s, m) => s + m.protein, 0);
    const c = meals.reduce((s, m) => s + m.carbs, 0);
    const f = meals.reduce((s, m) => s + m.fat, 0);
    return { cal, p, c, f, count: meals.length };
  };

  const renderMealItem = (item: TimelineEntry) => {
    const isExpanded = expandedId === item.id;
    const icon = MEAL_TYPE_ICONS[item.mealType] || "restaurant";

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.mealCard}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
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
              <View style={styles.typePill}>
                <Text style={styles.typeText}>{item.mealType}</Text>
              </View>
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
            {item.photoUri && (
              <Image source={{ uri: item.photoUri }} style={styles.expandedPhoto} contentFit="cover" />
            )}
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroVal}>{item.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroVal}>{item.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroVal}>{item.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroVal, { color: SF.gold }]}>{item.calories}</Text>
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
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
            <Text style={styles.dateSub}>
              {summary.count} meal{summary.count !== 1 ? "s" : ""}{photosCount > 0 ? ` · ${photosCount} photo${photosCount !== 1 ? "s" : ""}` : ""}
            </Text>
          </View>
          <View style={styles.daySummaryPill}>
            <Text style={styles.daySummaryCal}>{summary.cal} kcal</Text>
          </View>
        </View>

        {/* Photo strip */}
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
          <Text style={styles.emptyDesc}>Start logging meals to see your food diary here.</Text>
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
          ListFooterComponent={
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => setDaysToLoad(prev => prev + 14)}
            >
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
  headerTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: SF.muted, fontSize: 13 },
  emptyTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 18 },
  emptyDesc: { color: SF.muted, fontSize: 13, textAlign: "center", paddingHorizontal: 40 },
  logBtn: { backgroundColor: SF.orange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  logBtnText: { color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 },
  dateSection: { marginBottom: 20 },
  dateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, marginTop: 8 },
  dateTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 16 },
  dateSub: { color: SF.muted, fontSize: 11, marginTop: 2 },
  daySummaryPill: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  daySummaryCal: { color: SF.cream, fontSize: 12, fontFamily: "Outfit_700Bold" },
  photoStrip: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  stripThumb: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: SF.border },
  mealCard: { backgroundColor: SF.card, borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: SF.border },
  mealRow: { flexDirection: "row", alignItems: "center" },
  thumbnail: { width: 44, height: 44, borderRadius: 10 },
  placeholderThumb: { backgroundColor: "rgba(245,158,11,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: SF.border },
  mealName: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 14, flex: 1 },
  typePill: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { color: SF.cream, fontSize: 9, fontFamily: "Outfit_700Bold", textTransform: "capitalize" },
  calText: { color: SF.gold, fontSize: 12, fontFamily: "DMSans_600SemiBold" },
  timeText: { color: SF.muted, fontSize: 11 },
  expandedSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: SF.border, paddingTop: 10 },
  expandedPhoto: { width: "100%", height: 180, borderRadius: 10, marginBottom: 10 },
  macroRow: { flexDirection: "row", justifyContent: "space-around" },
  macroItem: { alignItems: "center" },
  macroVal: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 16 },
  macroLabel: { color: SF.muted, fontSize: 10, marginTop: 2 },
  loadMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, marginTop: 8 },
  loadMoreText: { color: SF.orange, fontSize: 13, fontFamily: "Outfit_700Bold" },
});
