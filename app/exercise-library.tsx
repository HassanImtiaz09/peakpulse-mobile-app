/**
 * Exercise Library Screen
 *
 * Searchable, filterable exercise library with:
 * - Search by name, muscle, or equipment
 * - Category filter chips
 * - Muscle group filter via body diagram
 * - Favorites filter
 * - Exercise cards with inline body diagrams
 */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { BodyDiagramInline } from "@/components/body-diagram";
import { useFavorites } from "@/lib/favorites-context";
import {
  getAllExercises,
  getCategories,
  searchExercises,
  type ExerciseInfo,
} from "@/lib/exercise-data";
import type { MuscleGroup } from "@/components/body-diagram";

import { GOLDEN_WORKOUT, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { C } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
type FilterMode = "all" | "favorites" | ExerciseInfo["category"];
type EquipmentFilter = "all" | "gym" | "home" | "calisthenics";

function classifyEquipment(equipment: string): EquipmentFilter[] {
  const EQUIP_MAP: Record<string, EquipmentFilter[]> = {
    "Barbell, Bench": ["gym"],
    "Barbell, Incline Bench": ["gym"],
    "Barbell, Decline Bench": ["gym"],
    "Barbell, Squat Rack": ["gym"],
    "Barbell": ["gym"],
    "Barbell or Dumbbells": ["gym", "home"],
    "Cable Machine": ["gym"],
    "Cable Machine, Rope": ["gym"],
    "T-Bar Machine": ["gym"],
    "Leg Press Machine": ["gym"],
    "Leg Curl Machine": ["gym"],
    "Leg Extension Machine": ["gym"],
    "Seated Calf Machine": ["gym"],
    "Hack Squat Machine": ["gym"],
    "Preacher Bench, Barbell": ["gym"],
    "EZ Bar, Bench": ["gym"],
    "Battle Ropes": ["gym"],
    "Dumbbells": ["home"],
    "Dumbbell": ["home"],
    "Dumbbells, Bench": ["home", "gym"],
    "Dumbbells, Incline Bench": ["home", "gym"],
    "Dumbbell, Bench": ["home", "gym"],
    "Dumbbell or Cable": ["home", "gym"],
    "Dumbbell or Kettlebell": ["home"],
    "Bench or Box, Dumbbells": ["home", "gym"],
    "Kettlebell": ["home"],
    "Bodyweight": ["calisthenics"],
    "Bodyweight or Dumbbells": ["calisthenics", "home"],
    "Bodyweight or Machine": ["calisthenics", "gym"],
    "Bodyweight or Medicine Ball": ["calisthenics", "home"],
    "Pull-Up Bar": ["calisthenics", "gym"],
    "Dip Station": ["calisthenics", "gym"],
    "Ab Wheel": ["home", "calisthenics"],
    "Plyo Box": ["home", "calisthenics"],
    "Jump Rope": ["home", "calisthenics"],
    "Open Space": ["calisthenics"],
  };
  return EQUIP_MAP[equipment] || ["gym"];
}

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite, getFavoritesList, count: favCount } = useFavorites();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterMode>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>("all");

  const allExercises = useMemo(() => getAllExercises(), []);
  const categories = useMemo(() => getCategories(), []);

  const filteredExercises = useMemo(() => {
    let results: ExerciseInfo[];

    // Apply search
    if (searchQuery.trim()) {
      results = searchExercises(searchQuery);
    } else {
      results = allExercises;
    }

    // Apply category/favorites filter
    if (activeFilter === "favorites") {
      const favList = getFavoritesList();
      results = results.filter((ex) =>
        favList.some((f) => f === ex.key || f === ex.name.toLowerCase())
      );
    } else if (activeFilter !== "all") {
      results = results.filter((ex) => ex.category === activeFilter);
    }

    // Apply equipment sub-filter
    if (equipmentFilter !== "all") {
      results = results.filter((ex) =>
        classifyEquipment(ex.equipment).includes(equipmentFilter)
      );
    }

    return results;
  }, [searchQuery, activeFilter, equipmentFilter, allExercises, getFavoritesList]);

  const handleExercisePress = useCallback((exercise: ExerciseInfo | { name: string }) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    router.push({ pathname: "/exercise-detail", params: { name: exercise.name } } as any);
  }, [router]);

  const handleFavoritePress = useCallback((exerciseName: string) => {
    toggleFavorite(exerciseName);
  }, [toggleFavorite]);

  const renderExerciseCard = useCallback(({ item }: { item: ExerciseInfo }) => {
    const favorited = isFavorite(item.name);

    return (
      <Pressable
        onPress={() => handleExercisePress(item)}
        style={({ pressed }) => [
          styles.exerciseCard,
          pressed && { opacity: 0.7 },
        ]}
      >
        {/* Body Diagram */}
        <View style={styles.cardDiagram}>
          <BodyDiagramInline
            primary={item.primaryMuscles}
            secondary={item.secondaryMuscles}
          />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Pressable
              onPress={() => handleFavoritePress(item.name)}
              style={({ pressed }) => [styles.favButton, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <MaterialIcons
                name={favorited ? "favorite" : "favorite-border"}
                size={18}
                color={favorited ? C.red : C.muted}
              />
            </Pressable>
          </View>

          <View style={styles.cardMeta}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{formatCategory(item.category)}</Text>
            </View>
            <View style={styles.difficultyBadge}>
              {[1, 2, 3].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.diffDot,
                    level <= getDifficultyLevel(item.difficulty) && styles.diffDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <Text style={styles.cardEquipment} numberOfLines={1}>
            {item.equipment}
          </Text>

          <View style={styles.cardMuscles}>
            {item.primaryMuscles.slice(0, 3).map((m) => (
              <View key={m} style={styles.muscleTag}>
                <Text style={styles.muscleTagText}>{formatMuscle(m)}</Text>
              </View>
            ))}
            {item.angleViews.length > 1 && (
              <View style={styles.angleTag}>
                <MaterialIcons name="360" size={10} color={C.gold} />
                <Text style={styles.angleTagText}>{item.angleViews.length} angles</Text>
              </View>
            )}
          </View>
        </View>

        {/* Preview Thumbnail - MuscleWiki OG image */}
        <View style={styles.cardGif}>
          {(() => {
            const videoUrl = item.angleViews[0]?.gifUrl ?? "";
            const ogUrl = videoUrl.includes("musclewiki.com")
              ? videoUrl
                  .replace("/videos/branded/", "/")
                  .replace(".mp4", ".jpg")
                  .replace(/\/([^/]+)$/, "/og-$1")
              : "";
            if (ogUrl) {
              return (
                <Image
                  source={{ uri: ogUrl }}
                  style={styles.gifPreview}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={200}
                />
              );
            }
            return (
              <View style={[styles.gifPreview, { justifyContent: "center", alignItems: "center", backgroundColor: "rgba(245,158,11,0.06)" }]}>
                <MaterialIcons name="play-circle-outline" size={24} color={C.gold} />
              </View>
            );
          })()}
        </View>
      </Pressable>
    );
  }, [isFavorite, handleExercisePress, handleFavoritePress]);

  const keyExtractor = useCallback((item: ExerciseInfo) => item.key, []);

  return (
    <ImageBackground source={{ uri: GOLDEN_WORKOUT }} style={{ flex: 1 }} resizeMode="cover">
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={C.gold} />
        </Pressable>
        <Text style={styles.headerTitle}>Exercise Library</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredExercises.length}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={18} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises, muscles, equipment..."
          placeholderTextColor={C.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <MaterialIcons name="close" size={16} color={C.muted} />
          </Pressable>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: "all", label: "All" },
            { key: "favorites", label: "Favorites" },
            ...categories.map((c) => ({ key: c, label: formatCategory(c) })),
          ]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setActiveFilter(item.key as FilterMode);
                  setEquipmentFilter("all");
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }
              }}
              style={({ pressed }) => [
                styles.filterChip,
                activeFilter === item.key && styles.filterChipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              {item.key === "favorites" && (
                <MaterialIcons
                  name="favorite"
                  size={12}
                  color={activeFilter === "favorites" ? C.bg : C.red}
                  style={{ marginRight: 3 }}
                />
              )}
              <Text style={[
                styles.filterChipText,
                activeFilter === item.key && styles.filterChipTextActive,
              ]}>
                {item.label}
                {item.key === "favorites" && favCount > 0 ? ` (${favCount})` : ""}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Equipment Sub-Filter (Gym / Home / Calisthenics) */}
      {activeFilter !== "all" && activeFilter !== "favorites" && (
        <View style={styles.filterRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { key: "all" as EquipmentFilter, label: "All" },
              { key: "gym" as EquipmentFilter, label: "Gym", icon: "fitness-center" as const },
              { key: "home" as EquipmentFilter, label: "Home", icon: "home" as const },
              { key: "calisthenics" as EquipmentFilter, label: "Calisthenics", icon: "self-improvement" as const },
            ]}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.filterContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setEquipmentFilter(item.key);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }
                }}
                style={({ pressed }) => [
                  styles.filterChip,
                  styles.equipChip,
                  equipmentFilter === item.key && styles.equipChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                {"icon" in item && item.icon && (
                  <MaterialIcons
                    name={item.icon}
                    size={12}
                    color={equipmentFilter === item.key ? C.bg : C.gold}
                    style={{ marginRight: 3 }}
                  />
                )}
                <Text
                  style={[
                    styles.filterChipText,
                    equipmentFilter === item.key && styles.equipChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={keyExtractor}
        renderItem={renderExerciseCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={48} color={C.muted} />
            <Text style={styles.emptyTitle}>No exercises found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === "favorites"
                ? "Tap the heart icon on any exercise to add it to your favorites"
                : "Try a different search term or filter"}
            </Text>
          </View>
        }
      />
    </View>
    </ImageBackground>
  );
}

function formatCategory(cat: string): string {
  if (cat === "full_body") return "Full Body";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function formatMuscle(m: string): string {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDifficultyLevel(d: string): number {
  if (d === "beginner") return 1;
  if (d === "intermediate") return 2;
  return 3;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.dim,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    flex: 1,
    color: C.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
    marginLeft: 12,
  },
  countBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border2,
  },
  countText: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: C.fg,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    marginTop: 10,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: C.dim,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: C.gold,
    borderColor: C.gold2,
  },
  filterChipText: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: C.bg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  exerciseCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    alignItems: "center",
    padding: 10,
    gap: 10,
  },
  cardDiagram: {
    width: 44,
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardName: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  favButton: {
    padding: 2,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  categoryBadgeText: {
    color: C.gold,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
  },
  difficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  diffDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  diffDotActive: {
    backgroundColor: C.gold,
  },
  cardEquipment: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
  },
  cardMuscles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  muscleTag: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  muscleTagText: {
    color: C.gold3,
    fontFamily: "DMSans_400Regular",
    fontSize: 9,
  },
  angleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  angleTagText: {
    color: C.gold,
    fontFamily: "DMSans_500Medium",
    fontSize: 9,
  },
  cardGif: {
    width: 56,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: C.bg,
  },
  gifPreview: {
    width: "100%",
    height: "100%",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    color: C.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
  },
  emptySubtitle: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  equipChip: {
    borderWidth: 1,
    borderColor: C.border2,
    backgroundColor: C.dim,
  },
  equipChipActive: {
    backgroundColor: C.gold,
    borderColor: C.gold2,
  },
  equipChipTextActive: {
    color: C.bg,
  },
});
