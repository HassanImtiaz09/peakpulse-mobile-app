/**
 * Meal Gallery — visual food diary with auto-archive and favourites.
 * Photos older than 7 days are auto-archived unless favourited.
 * Users can favourite meals to keep them permanently and reference them later.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, Image, Modal,
  StyleSheet, ActivityIndicator, Dimensions, Platform, Alert, TextInput, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  getMealPhotos, type MealEntry,
  getFavouriteMeals, addFavouriteMeal, removeFavouriteMeal,
  type FavouriteMeal, purgeArchivedMealPhotos,
} from "@/lib/calorie-context";
import { GOLDEN_MEALS, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { UI } from "@/constants/ui-colors";

type PhotoEntry = MealEntry & { date: string; isArchived: boolean; isFavourited: boolean };

interface DateGroup {
  date: string;
  label: string;
  photos: PhotoEntry[];
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: "free-breakfast",
  lunch: "lunch-dining",
  dinner: "dinner-dining",
  snack: "cookie",
};

const { width: SCREEN_W } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_W - 48 - 8) / 3;

type FilterMode = "all" | "recent" | "favourites" | "archived";

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
  const [allPhotos, setAllPhotos] = useState<PhotoEntry[]>([]);
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [filter, setFilter] = useState<FilterMode>("recent");
  const [favourites, setFavourites] = useState<FavouriteMeal[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);
  const [purgedCount, setPurgedCount] = useState(0);
  const [saveName, setSaveName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [mealToSave, setMealToSave] = useState<PhotoEntry | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // Purge old archived photos on load
      const purged = await purgeArchivedMealPhotos();
      setPurgedCount(purged);

      // Load all photos (including archived for the "archived" filter)
      const photos = await getMealPhotos(60);
      setAllPhotos(photos);

      // Load favourites
      const favs = await getFavouriteMeals();
      setFavourites(favs);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  // Apply filter
  useEffect(() => {
    let filtered: PhotoEntry[];
    switch (filter) {
      case "recent":
        filtered = allPhotos.filter(p => !p.isArchived);
        break;
      case "favourites":
        filtered = allPhotos.filter(p => p.isFavourited);
        break;
      case "archived":
        filtered = allPhotos.filter(p => p.isArchived);
        break;
      default:
        filtered = allPhotos;
    }

    const groupMap: Record<string, PhotoEntry[]> = {};
    for (const p of filtered) {
      if (!groupMap[p.date]) groupMap[p.date] = [];
      groupMap[p.date].push(p);
    }
    const sorted = Object.keys(groupMap).sort((a, b) => b.localeCompare(a));
    setGroups(sorted.map(date => ({
      date,
      label: formatDateLabel(date),
      photos: groupMap[date],
    })));
  }, [allPhotos, filter]);

  const totalVisible = groups.reduce((s, g) => s + g.photos.length, 0);

  async function handleFavourite(photo: PhotoEntry) {
    if (photo.isFavourited) {
      // Find the favourite entry and remove it
      const fav = favourites.find(f =>
        f.name.toLowerCase() === photo.name.toLowerCase() && f.mealType === photo.mealType
      );
      if (fav) {
        await removeFavouriteMeal(fav.id);
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      // Show save modal to let user name the favourite
      setMealToSave(photo);
      setSaveName(photo.name);
      setShowSaveModal(true);
    }
    await loadPhotos();
  }

  async function confirmSaveFavourite() {
    if (!mealToSave || !saveName.trim()) return;
    await addFavouriteMeal({
      name: saveName.trim(),
      calories: mealToSave.calories,
      protein: mealToSave.protein,
      carbs: mealToSave.carbs,
      fat: mealToSave.fat,
      mealType: mealToSave.mealType,
      photoUri: mealToSave.photoUri,
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSaveModal(false);
    setMealToSave(null);
    setSaveName("");
    await loadPhotos();
  }

  const FILTERS: Array<{ key: FilterMode; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }> = [
    { key: "recent", label: "Recent", icon: "schedule" },
    { key: "favourites", label: "Favourites", icon: "star" },
    { key: "archived", label: "Archived", icon: "archive" },
    { key: "all", label: "All", icon: "photo-library" },
  ];

  const renderPhotoItem = ({ item }: { item: PhotoEntry }) => (
    <TouchableOpacity
      style={[styles.photoThumb, item.isArchived && styles.photoArchived]}
      onPress={() => setSelectedPhoto(item)}
      onLongPress={() => handleFavourite(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.photoUri }} style={styles.photoImage} />
      <View style={styles.photoOverlay}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <MaterialIcons
            name={(MEAL_ICONS[item.mealType] || "restaurant") as any}
            size={10}
            color={UI.fg}
          />
          <Text style={styles.photoMealType}>{item.mealType}</Text>
        </View>
        {item.isFavourited && (
          <MaterialIcons name="star" size={12} color={UI.gold} />
        )}
      </View>
      {item.isArchived && (
        <View style={styles.archiveBadge}>
          <MaterialIcons name="archive" size={10} color={UI.fg} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: DateGroup }) => (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateLabel}>{item.label}</Text>
        <Text style={styles.dateCount}>
          {item.photos.length} photo{item.photos.length !== 1 ? "s" : ""}
        </Text>
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
    <ImageBackground source={{ uri: GOLDEN_MEALS }} style={{ flex: 1 }} resizeMode="cover">
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={UI.fg} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Meal Gallery</Text>
          <Text style={styles.headerSub}>
            {totalVisible} photo{totalVisible !== 1 ? "s" : ""}
            {purgedCount > 0 ? ` · ${purgedCount} archived` : ""}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, active && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <MaterialIcons name={f.icon} size={14} color={active ? UI.gold : UI.secondaryLight} />
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <MaterialIcons name="info-outline" size={14} color={UI.secondaryLight} />
        <Text style={styles.infoText}>
          Photos auto-archive after 7 days. Long-press to favourite and keep permanently.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={UI.gold} size="large" style={{ marginTop: 60 }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons
            name={filter === "favourites" ? "star-outline" : filter === "archived" ? "archive" : "photo-library"}
            size={64}
            color={UI.secondaryLight}
          />
          <Text style={styles.emptyTitle}>
            {filter === "favourites" ? "No Favourites Yet" :
             filter === "archived" ? "No Archived Photos" :
             "No Meal Photos Yet"}
          </Text>
          <Text style={styles.emptyText}>
            {filter === "favourites"
              ? "Long-press any meal photo to save it as a favourite. Favourited meals are never auto-archived."
              : filter === "archived"
              ? "Photos older than 7 days that aren't favourited will appear here before being purged."
              : "Use the AI Scan feature on the Meals tab to photograph your meals. Photos will appear here as a visual food diary."}
          </Text>
          {filter !== "recent" && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setFilter("recent")}>
              <Text style={styles.emptyBtnText}>View Recent</Text>
            </TouchableOpacity>
          )}
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
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPhoto(null)}>
              <MaterialIcons name="close" size={24} color={UI.fg} />
            </TouchableOpacity>

            {selectedPhoto && (
              <>
                <Image source={{ uri: selectedPhoto.photoUri }} style={styles.modalImage} resizeMode="contain" />

                <View style={styles.modalDetails}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                      <MaterialIcons
                        name={(MEAL_ICONS[selectedPhoto.mealType] || "restaurant") as any}
                        size={24}
                        color={UI.gold}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalName} numberOfLines={2}>{selectedPhoto.name}</Text>
                        <Text style={styles.modalMeta}>
                          {selectedPhoto.mealType.charAt(0).toUpperCase() + selectedPhoto.mealType.slice(1)} · {formatTime(selectedPhoto.loggedAt)}
                          {selectedPhoto.isArchived ? " · Archived" : ""}
                        </Text>
                      </View>
                    </View>

                    {/* Favourite button */}
                    <TouchableOpacity
                      style={[styles.favBtn, selectedPhoto.isFavourited && styles.favBtnActive]}
                      onPress={() => {
                        handleFavourite(selectedPhoto);
                        setSelectedPhoto(null);
                      }}
                    >
                      <MaterialIcons
                        name={selectedPhoto.isFavourited ? "star" : "star-outline"}
                        size={20}
                        color={selectedPhoto.isFavourited ? UI.gold : UI.secondaryLight}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.macroGrid}>
                    {[
                      { label: "Calories", value: `${selectedPhoto.calories}`, unit: "kcal", color: UI.gold },
                      { label: "Protein", value: `${selectedPhoto.protein}`, unit: "g", color: "#3B82F6" },
                      { label: "Carbs", value: `${selectedPhoto.carbs}`, unit: "g", color: UI.gold3 },
                      { label: "Fat", value: `${selectedPhoto.fat}`, unit: "g", color: UI.gold2 },
                    ].map(m => (
                      <View key={m.label} style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: m.color }]}>
                          {m.value}<Text style={styles.macroUnit}>{m.unit}</Text>
                        </Text>
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

      {/* Save Favourite Name Modal */}
      <Modal visible={showSaveModal} transparent animationType="fade" onRequestClose={() => setShowSaveModal(false)}>
        <View style={styles.saveModalBg}>
          <View style={styles.saveModalContent}>
            <Text style={styles.saveModalTitle}>Save to Favourites</Text>
            <Text style={styles.saveModalDesc}>
              Give this meal a name so you can quickly reference it when logging meals.
            </Text>
            <TextInput
              style={styles.saveInput}
              value={saveName}
              onChangeText={setSaveName}
              placeholder="e.g. Mom's Chicken Curry"
              placeholderTextColor={UI.secondaryLight}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmSaveFavourite}
            />
            <View style={styles.saveModalBtns}>
              <TouchableOpacity
                style={styles.saveCancelBtn}
                onPress={() => { setShowSaveModal(false); setMealToSave(null); }}
              >
                <Text style={styles.saveCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveConfirmBtn, !saveName.trim() && { opacity: 0.5 }]}
                onPress={confirmSaveFavourite}
                disabled={!saveName.trim()}
              >
                <MaterialIcons name="star" size={16} color={UI.bg} />
                <Text style={styles.saveConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: UI.goldAlpha10, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: UI.fg, fontSize: 18, fontFamily: "BebasNeue_400Regular" },
  headerSub: { color: UI.secondaryLight, fontSize: 11, fontFamily: "DMSans_700Bold" },

  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 8, borderRadius: 10, backgroundColor: UI.goldAlpha6,
    borderWidth: 1, borderColor: UI.goldAlpha10,
  },
  filterBtnActive: { backgroundColor: UI.borderGold, borderColor: UI.goldAlpha30 },
  filterLabel: { color: UI.secondaryLight, fontSize: 11, fontFamily: "DMSans_700Bold" },
  filterLabelActive: { color: UI.gold },

  infoBanner: {
    flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16,
    marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: UI.goldAlpha6, borderRadius: 8,
    borderWidth: 1, borderColor: UI.goldAlpha10,
  },
  infoText: { color: UI.secondaryLight, fontSize: 10, fontFamily: "DMSans_400Regular", flex: 1, lineHeight: 14 },

  dateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingHorizontal: 2 },
  dateLabel: { color: UI.fg, fontSize: 15, fontFamily: "DMSans_700Bold" },
  dateCount: { color: UI.secondaryLight, fontSize: 11, fontFamily: "DMSans_700Bold" },

  photoThumb: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 12, overflow: "hidden", backgroundColor: UI.surface },
  photoArchived: { opacity: 0.5 },
  photoImage: { width: "100%", height: "100%", borderRadius: 12 },
  photoOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingVertical: 4, paddingHorizontal: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  photoMealType: { color: UI.fg, fontSize: 9, fontFamily: "DMSans_700Bold", textTransform: "capitalize" },
  archiveBadge: {
    position: "absolute", top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
  },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyTitle: { color: UI.fg, fontSize: 18, fontFamily: "BebasNeue_400Regular", marginTop: 16 },
  emptyText: { color: UI.secondaryLight, fontSize: 13, fontFamily: "DMSans_700Bold", textAlign: "center", marginTop: 8, lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: UI.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: UI.fg, fontSize: 14, fontFamily: "DMSans_700Bold" },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  modalContent: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  modalClose: { position: "absolute", top: 60, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: UI.borderGold, alignItems: "center", justifyContent: "center" },
  modalImage: { width: "100%", height: SCREEN_W, borderRadius: 16 },
  modalDetails: { marginTop: 16, backgroundColor: UI.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: UI.goldAlpha10 },
  modalName: { color: UI.fg, fontSize: 16, fontFamily: "DMSans_700Bold", maxWidth: SCREEN_W - 120 },
  modalMeta: { color: UI.secondaryLight, fontSize: 11, fontFamily: "DMSans_700Bold", marginTop: 2 },
  favBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: UI.dim, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: UI.borderGold,
  },
  favBtnActive: { backgroundColor: UI.goldAlpha20, borderColor: UI.goldAlpha40 },
  macroGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: UI.dim },
  macroItem: { alignItems: "center" },
  macroValue: { fontSize: 16, fontFamily: "DMSans_700Bold" },
  macroUnit: { fontSize: 10, fontFamily: "DMSans_700Bold" },
  macroLabel: { color: UI.secondaryLight, fontSize: 9, fontFamily: "DMSans_700Bold", marginTop: 2 },

  // Save favourite modal
  saveModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  saveModalContent: {
    width: SCREEN_W - 48, backgroundColor: UI.surface, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: UI.goldAlpha20,
  },
  saveModalTitle: { color: UI.fg, fontSize: 18, fontFamily: "BebasNeue_400Regular", marginBottom: 8 },
  saveModalDesc: { color: UI.secondaryLight, fontSize: 13, fontFamily: "DMSans_400Regular", lineHeight: 18, marginBottom: 16 },
  saveInput: {
    backgroundColor: UI.goldAlpha6, borderRadius: 12, padding: 14,
    color: UI.fg, fontFamily: "DMSans_600SemiBold", fontSize: 15,
    borderWidth: 1, borderColor: UI.goldAlpha20, marginBottom: 16,
  },
  saveModalBtns: { flexDirection: "row", gap: 12 },
  saveCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: UI.dim, borderWidth: 1, borderColor: UI.borderGold },
  saveCancelText: { color: UI.secondaryLight, fontFamily: "DMSans_700Bold", fontSize: 14 },
  saveConfirmBtn: { flex: 1, flexDirection: "row", gap: 6, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: UI.gold },
  saveConfirmText: { color: UI.bg, fontFamily: "DMSans_700Bold", fontSize: 14 },
});
