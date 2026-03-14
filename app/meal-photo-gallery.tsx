/**
 * Meal Photo Gallery — visual food diary timeline with date grouping.
 * Collects all logged meal photos across the last 30 days.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getMealPhotos, type MealEntry } from "@/lib/calorie-context";

type PhotoEntry = MealEntry & { date: string };

interface DateGroup {
  date: string;
  label: string;
  photos: PhotoEntry[];
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: "\u2615",
  lunch: "\ud83c\udf5c",
  dinner: "\ud83c\udf57",
  snack: "\ud83c\udf6a",
};

const { width: SCREEN_W } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_W - 48 - 8) / 3; // 3 columns with gaps

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function MealPhotoGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const photos = await getMealPhotos(30);
      setTotalPhotos(photos.length);

      // Group by date
      const groupMap: Record<string, PhotoEntry[]> = {};
      for (const p of photos) {
        if (!groupMap[p.date]) groupMap[p.date] = [];
        groupMap[p.date].push(p);
      }

      // Sort dates descending
      const sorted = Object.keys(groupMap).sort((a, b) => b.localeCompare(a));
      const result: DateGroup[] = sorted.map(date => ({
        date,
        label: formatDateLabel(date),
        photos: groupMap[date],
      }));
      setGroups(result);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const renderPhotoItem = ({ item }: { item: PhotoEntry }) => (
    <TouchableOpacity
      style={styles.photoThumb}
      onPress={() => setSelectedPhoto(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.photoUri }} style={styles.photoImage} />
      <View style={styles.photoOverlay}>
        <Text style={styles.photoMealType}>
          {MEAL_ICONS[item.mealType] || "\ud83c\udf7d"} {item.mealType}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: DateGroup }) => (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateLabel}>{item.label}</Text>
        <Text style={styles.dateCount}>{item.photos.length} photo{item.photos.length !== 1 ? "s" : ""}</Text>
      </View>
      <FlatList
        data={item.photos}
        renderItem={renderPhotoItem}
        keyExtractor={p => p.id}
        numColumns={3}
        columnWrapperStyle={{ gap: 4 }}
        scrollEnabled={false}
        contentContainerStyle={{ gap: 4 }}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF7ED" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Food Diary</Text>
          <Text style={styles.headerSub}>{totalPhotos} photo{totalPhotos !== 1 ? "s" : ""} \u00b7 Last 30 days</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#F59E0B" size="large" style={{ marginTop: 60 }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="photo-library" size={64} color="#92400E" />
          <Text style={styles.emptyTitle}>No Meal Photos Yet</Text>
          <Text style={styles.emptyText}>
            Use the AI Scan feature on the Meals tab to photograph your meals. Photos will appear here as a visual food diary.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.emptyBtnText}>Go to Meals</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={g => g.date}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Fullscreen Photo Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedPhoto(null)}
            >
              <MaterialIcons name="close" size={24} color="#FFF7ED" />
            </TouchableOpacity>

            {selectedPhoto && (
              <>
                {/* Photo */}
                <Image
                  source={{ uri: selectedPhoto.photoUri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />

                {/* Meal details */}
                <View style={styles.modalDetails}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 24 }}>{MEAL_ICONS[selectedPhoto.mealType] || "\ud83c\udf7d"}</Text>
                    <View>
                      <Text style={styles.modalName} numberOfLines={2}>{selectedPhoto.name}</Text>
                      <Text style={styles.modalMeta}>
                        {selectedPhoto.mealType.charAt(0).toUpperCase() + selectedPhoto.mealType.slice(1)} \u00b7 {formatTime(selectedPhoto.loggedAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Macros grid */}
                  <View style={styles.macroGrid}>
                    {[
                      { label: "Calories", value: `${selectedPhoto.calories}`, unit: "kcal", color: "#F59E0B" },
                      { label: "Protein", value: `${selectedPhoto.protein}`, unit: "g", color: "#3B82F6" },
                      { label: "Carbs", value: `${selectedPhoto.carbs}`, unit: "g", color: "#FDE68A" },
                      { label: "Fat", value: `${selectedPhoto.fat}`, unit: "g", color: "#FBBF24" },
                    ].map(m => (
                      <View key={m.label} style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: m.color }]}>{m.value}<Text style={styles.macroUnit}>{m.unit}</Text></Text>
                        <Text style={styles.macroLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0500" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFF7ED", fontSize: 18, fontFamily: "Outfit_800ExtraBold" },
  headerSub: { color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold" },
  dateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingHorizontal: 2 },
  dateLabel: { color: "#FFF7ED", fontSize: 15, fontFamily: "Outfit_700Bold" },
  dateCount: { color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold" },
  photoThumb: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 12, overflow: "hidden", backgroundColor: "#150A00" },
  photoImage: { width: "100%", height: "100%", borderRadius: 12 },
  photoOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: "rgba(0,0,0,0.55)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  photoMealType: { color: "#FFF7ED", fontSize: 9, fontFamily: "Outfit_700Bold", textTransform: "capitalize" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyTitle: { color: "#FFF7ED", fontSize: 18, fontFamily: "Outfit_800ExtraBold", marginTop: 16 },
  emptyText: { color: "#92400E", fontSize: 13, fontFamily: "Outfit_700Bold", textAlign: "center", marginTop: 8, lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: "#F59E0B", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#FFF7ED", fontSize: 14, fontFamily: "Outfit_700Bold" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  modalContent: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  modalClose: { position: "absolute", top: 60, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center" },
  modalImage: { width: "100%", height: SCREEN_W, borderRadius: 16 },
  modalDetails: { marginTop: 16, backgroundColor: "#150A00", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" },
  modalName: { color: "#FFF7ED", fontSize: 16, fontFamily: "Outfit_700Bold", maxWidth: SCREEN_W - 100 },
  modalMeta: { color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", marginTop: 2 },
  macroGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(245,158,11,0.08)" },
  macroItem: { alignItems: "center" },
  macroValue: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  macroUnit: { fontSize: 10, fontFamily: "Outfit_700Bold" },
  macroLabel: { color: "#92400E", fontSize: 9, fontFamily: "Outfit_700Bold", marginTop: 2 },
});
