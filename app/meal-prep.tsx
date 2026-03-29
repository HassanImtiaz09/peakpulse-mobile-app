import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Platform, TextInput, ImageBackground} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { usePantry, type PantryItem } from "@/lib/pantry-context";
import { useCalories } from "@/lib/calorie-context";
import { trpc } from "@/lib/trpc";

import * as Haptics from "expo-haptics";

import { GOLDEN_MEALS, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI as SF } from "@/constants/ui-colors";
import { useAiLimit } from "@/components/ai-limit-modal";
// ── Ingredient Matching ──────────────────────────────────────────
interface IngredientMatch {
  ingredientName: string;
  ingredientAmount: string;
  pantryItem: PantryItem | null;
  status: "available" | "partial" | "missing";
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function matchIngredientToPantry(ingName: string, pantryItems: PantryItem[]): PantryItem | null {
  const norm = normalizeForMatch(ingName);
  const words = norm.split(" ").filter(w => w.length > 2);
  // Exact match first
  for (const item of pantryItems) {
    const pNorm = normalizeForMatch(item.name);
    if (pNorm === norm || pNorm.includes(norm) || norm.includes(pNorm)) return item;
  }
  // Fuzzy: at least 60% of words match
  let bestMatch: PantryItem | null = null;
  let bestScore = 0;
  for (const item of pantryItems) {
    const pNorm = normalizeForMatch(item.name);
    const pWords = pNorm.split(" ").filter(w => w.length > 2);
    const matchCount = words.filter(w => pWords.some(pw => pw.includes(w) || w.includes(pw))).length;
    const score = words.length > 0 ? matchCount / words.length : 0;
    if (score > bestScore && score >= 0.6) {
      bestScore = score;
      bestMatch = item;
    }
  }
  return bestMatch;
}

function getIngredientMatches(ingredients: PrepRecipe["ingredients"], pantryItems: PantryItem[]): IngredientMatch[] {
  return ingredients.map(ing => {
    const pantryItem = matchIngredientToPantry(ing.name, pantryItems);
    return {
      ingredientName: ing.name,
      ingredientAmount: ing.amount,
      pantryItem,
      status: pantryItem ? "available" : "missing" as const,
    };
  });
}
const SAVED_KEY = "peakpulse_saved_recipes";
const RATINGS_KEY = "peakpulse_recipe_ratings";

interface PrepRecipe {
  name: string;
  usesExpiring: string[];
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: string;
  cookTime: string;
  ingredients: { name: string; amount: string; fromPantry: boolean }[];
  instructions: string[];
  storageInstructions: string;
  mealType: string;
}

interface SavedRecipe extends PrepRecipe {
  savedAt: string;
  id: string;
}

interface RecipeRating {
  recipeId: string;
  recipeName: string;
  rating: number;
  review: string;
  updatedAt: string;
}

type TabMode = "generate" | "saved";

// Scale an ingredient amount string by a multiplier
function scaleAmount(amount: string, multiplier: number): string {
  if (multiplier === 1) return amount;
  const match = amount.match(/^([\d./]+)\s*(.*)/);
  if (!match) return amount;
  let num: number;
  if (match[1].includes("/")) {
    const parts = match[1].split("/");
    num = parseFloat(parts[0]) / parseFloat(parts[1]);
  } else {
    num = parseFloat(match[1]);
  }
  if (isNaN(num)) return amount;
  const scaled = num * multiplier;
  const rounded = Math.round(scaled * 100) / 100;
  const display = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(rounded < 10 ? 1 : 0);
  return match[2] ? `${display} ${match[2]}` : display;
}

export default function MealPrepScreen() {
  const router = useRouter();
  const { showLimitModal } = useAiLimit();
  const { items: pantryItems, removeItem, logUsage } = usePantry();
  const { addMeal } = useCalories();
  const generatePrep = trpc.mealPrep.fromExpiring.useMutation();

  const [recipes, setRecipes] = useState<PrepRecipe[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [servings, setServings] = useState(4);
  const [generated, setGenerated] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [tab, setTab] = useState<TabMode>("generate");
  // Per-recipe serving scale: cardKey -> customServings
  const [recipeScales, setRecipeScales] = useState<Record<string, number>>({});
  // Ratings & reviews
  const [ratings, setRatings] = useState<Record<string, RecipeRating>>({});
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState("");
  // Reorder mode
  const [reorderMode, setReorderMode] = useState(false);
  // Cook Now
  const [cookingRecipe, setCookingRecipe] = useState<string | null>(null);
  const [cookSuccess, setCookSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSavedRecipes();
    loadRatings();
  }, []);

  const loadSavedRecipes = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_KEY);
      if (raw) setSavedRecipes(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persistSaved = useCallback(async (updated: SavedRecipe[]) => {
    setSavedRecipes(updated);
    try { await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  const loadRatings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RATINGS_KEY);
      if (raw) setRatings(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persistRatings = useCallback(async (updated: Record<string, RecipeRating>) => {
    setRatings(updated);
    try { await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  const setRecipeRating = useCallback(async (recipeId: string, recipeName: string, star: number) => {
    const existing = ratings[recipeId];
    const updated = { ...ratings, [recipeId]: { recipeId, recipeName, rating: star, review: existing?.review ?? "", updatedAt: new Date().toISOString() } };
    await persistRatings(updated);
  }, [ratings, persistRatings]);

  const submitReview = useCallback(async (recipeId: string, recipeName: string) => {
    const existing = ratings[recipeId];
    const updated = { ...ratings, [recipeId]: { recipeId, recipeName, rating: existing?.rating ?? 0, review: reviewDraft.trim(), updatedAt: new Date().toISOString() } };
    await persistRatings(updated);
    setEditingReview(null);
    setReviewDraft("");
  }, [ratings, persistRatings, reviewDraft]);

  const isRecipeSaved = useCallback((name: string) => {
    return savedRecipes.some(s => s.name === name);
  }, [savedRecipes]);

  const saveRecipe = useCallback(async (recipe: PrepRecipe) => {
    if (isRecipeSaved(recipe.name)) return;
    const saved: SavedRecipe = { ...recipe, savedAt: new Date().toISOString(), id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    await persistSaved([saved, ...savedRecipes]);
  }, [savedRecipes, persistSaved, isRecipeSaved]);

  const unsaveRecipe = useCallback(async (id: string) => {
    const updated = savedRecipes.filter(s => s.id !== id);
    await persistSaved(updated);
  }, [savedRecipes, persistSaved]);

  const confirmUnsave = useCallback((id: string, name: string) => {
    if (Platform.OS === "web") { unsaveRecipe(id); return; }
    Alert.alert("Remove Bookmark", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => unsaveRecipe(id) },
    ]);
  }, [unsaveRecipe]);

  // Reorder functions
  const moveRecipe = useCallback(async (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= savedRecipes.length) return;
    const updated = [...savedRecipes];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    await persistSaved(updated);
  }, [savedRecipes, persistSaved]);

  // ── Cook Now Handler ──────────────────────────────────────────
  const handleCookNow = useCallback(async (recipe: PrepRecipe, cardKey: string) => {
    const multiplier = getScaleMultiplier(cardKey, recipe.servings);
    const matches = getIngredientMatches(recipe.ingredients, pantryItems);
    const available = matches.filter(m => m.status === "available");
    const missing = matches.filter(m => m.status === "missing");

    const doIt = async () => {
      setCookingRecipe(cardKey);
      try {
        // Deduct matched pantry items
        const deducted: string[] = [];
        for (const match of available) {
          if (match.pantryItem) {
            await removeItem(match.pantryItem.id);
            await logUsage({ itemName: match.pantryItem.name, action: "used" });
            deducted.push(match.pantryItem.name);
          }
        }

        // Log to calorie tracker
        const scaledCal = Math.round(recipe.calories * multiplier);
        const scaledP = Math.round(recipe.protein * multiplier);
        const scaledC = Math.round(recipe.carbs * multiplier);
        const scaledF = Math.round(recipe.fat * multiplier);
        await addMeal({
          name: recipe.name,
          mealType: recipe.mealType || "lunch",
          calories: scaledCal,
          protein: scaledP,
          carbs: scaledC,
          fat: scaledF,
        });

        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setCookSuccess(cardKey);
        setTimeout(() => setCookSuccess(null), 3000);
      } catch { /* ignore */ }
      setCookingRecipe(null);
    };

    if (missing.length > 0) {
      if (Platform.OS === "web") {
        doIt();
      } else {
        Alert.alert(
          "Missing Ingredients",
          `${missing.length} of ${matches.length} ingredients not in pantry:\n${missing.slice(0, 5).map(m => `\u2022 ${m.ingredientName}`).join("\n")}${missing.length > 5 ? `\n+${missing.length - 5} more` : ""}\n\nCook anyway? Available items will be deducted.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Cook Anyway", onPress: doIt },
          ]
        );
      }
    } else {
      if (Platform.OS === "web") {
        doIt();
      } else {
        Alert.alert(
          "Cook Now",
          `All ${available.length} ingredients found in pantry. They will be deducted and ${Math.round(recipe.calories * multiplier)} kcal logged.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Cook!", onPress: doIt },
          ]
        );
      }
    }
  }, [pantryItems, removeItem, logUsage, addMeal, recipeScales]);

  const expiringItems = useMemo(() => {
    const now = Date.now();
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    return pantryItems.filter(item => {
      if (!item.expiresAt) return false;
      const exp = new Date(item.expiresAt).getTime();
      return exp > now && exp - now < fiveDays;
    });
  }, [pantryItems]);

  async function generateRecipes() {
    if (expiringItems.length === 0 && pantryItems.length === 0) return;
    setLoading(true);
    try {
      const expiringStr = expiringItems.length > 0
        ? expiringItems.map(i => `${i.name} (${i.category}, expires ${new Date(i.expiresAt!).toLocaleDateString()})`).join(", ")
        : "None expiring soon";
      const allStr = pantryItems.map(i => `${i.name} (${i.category})`).join(", ");
      const result = await generatePrep.mutateAsync({ expiringItems: expiringStr, allPantryItems: allStr, servings });
      setRecipes(result.recipes ?? []);
      setTips(result.tips ?? []);
      setGenerated(true);
    } catch {
      setRecipes([]);
      setTips(["Could not generate recipes. Try again."]);
      setGenerated(true);
    } finally { setLoading(false); }
  }

  const getDaysUntilExpiry = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const getUrgencyColor = (days: number) => days <= 1 ? SF.red : days <= 3 ? SF.orange : SF.green;
  const formatSavedDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const getScaleMultiplier = (cardKey: string, originalServings: number) => {
    const customServings = recipeScales[cardKey];
    if (customServings === undefined) return 1;
    return customServings / originalServings;
  };

  const getCustomServings = (cardKey: string, originalServings: number) => {
    return recipeScales[cardKey] ?? originalServings;
  };

  const setCustomServings = (cardKey: string, val: number) => {
    setRecipeScales(prev => ({ ...prev, [cardKey]: Math.max(1, Math.min(24, val)) }));
  };

  const renderStars = (recipeId: string, recipeName: string) => {
    const current = ratings[recipeId]?.rating ?? 0;
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => setRecipeRating(recipeId, recipeName, star === current ? 0 : star)} activeOpacity={0.6}>
            <MaterialIcons name={star <= current ? "star" : "star-border"} size={22} color={star <= current ? SF.gold : SF.muted} />
          </TouchableOpacity>
        ))}
        {current > 0 && <Text style={styles.ratingText}>{current}/5</Text>}
      </View>
    );
  };

  const renderReviewSection = (recipeId: string, recipeName: string) => {
    const existing = ratings[recipeId];
    const isEditing = editingReview === recipeId;

    return (
      <View style={styles.reviewSection}>
        {isEditing ? (
          <View style={styles.reviewEditBox}>
            <TextInput
              style={styles.reviewInput}
              placeholder="Add your notes..."
              placeholderTextColor={SF.muted}
              value={reviewDraft}
              onChangeText={setReviewDraft}
              multiline
              maxLength={300}
              returnKeyType="done"
            />
            <View style={styles.reviewActions}>
              <TouchableOpacity onPress={() => { setEditingReview(null); setReviewDraft(""); }} style={styles.reviewCancelBtn}>
                <Text style={styles.reviewCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => submitReview(recipeId, recipeName)} style={styles.reviewSaveBtn}>
                <Text style={styles.reviewSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : existing?.review ? (
          <TouchableOpacity onPress={() => { setEditingReview(recipeId); setReviewDraft(existing.review); }} activeOpacity={0.7}>
            <View style={styles.reviewDisplay}>
              <MaterialIcons name="rate-review" size={12} color={SF.cream} />
              <Text style={styles.reviewText} numberOfLines={3}>{existing.review}</Text>
              <MaterialIcons name="edit" size={12} color={SF.muted} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => { setEditingReview(recipeId); setReviewDraft(""); }} style={styles.addReviewBtn} activeOpacity={0.7}>
            <MaterialIcons name="rate-review" size={12} color={SF.muted} />
            <Text style={styles.addReviewText}>Add notes</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderRecipeCard = (recipe: PrepRecipe, idx: number, isSavedTab: boolean, savedId?: string) => {
    const cardKey = isSavedTab ? savedId! : `gen_${idx}`;
    const isExpanded = expandedRecipe === cardKey;
    const saved = isRecipeSaved(recipe.name);
    const ratingId = savedId ?? `gen_${recipe.name}`;
    const multiplier = getScaleMultiplier(cardKey, recipe.servings);
    const customSrv = getCustomServings(cardKey, recipe.servings);
    const scaledCal = Math.round(recipe.calories * multiplier);
    const scaledP = Math.round(recipe.protein * multiplier);
    const scaledC = Math.round(recipe.carbs * multiplier);
    const scaledF = Math.round(recipe.fat * multiplier);

    return (
      <View key={cardKey} style={styles.recipeCard}>
        <TouchableOpacity onPress={() => setExpandedRecipe(isExpanded ? null : cardKey)} activeOpacity={0.7}>
          <View style={styles.recipeHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <View style={styles.recipeMetaRow}>
                <View style={styles.recipeMeta}>
                  <MaterialIcons name="schedule" size={11} color={SF.muted} />
                  <Text style={styles.recipeMetaText}>{recipe.prepTime}</Text>
                </View>
                <View style={styles.recipeMeta}>
                  <MaterialIcons name="local-fire-department" size={11} color={SF.orange} />
                  <Text style={styles.recipeMetaText}>{scaledCal} kcal</Text>
                </View>
                <View style={styles.recipeMeta}>
                  <MaterialIcons name="people" size={11} color={SF.muted} />
                  <Text style={styles.recipeMetaText}>{customSrv} srv</Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TouchableOpacity
                onPress={() => isSavedTab && savedId ? confirmUnsave(savedId, recipe.name) : saved ? undefined : saveRecipe(recipe)}
                style={[styles.saveBtn, saved && styles.saveBtnActive]}
                activeOpacity={0.7}
              >
                <MaterialIcons name={saved ? "bookmark" : "bookmark-border"} size={18} color={saved ? SF.gold : SF.muted} />
              </TouchableOpacity>
              <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={22} color={SF.muted} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Uses Expiring Pills */}
        {recipe.usesExpiring && recipe.usesExpiring.length > 0 && (
          <View style={styles.expiringPills}>
            <MaterialIcons name="recycling" size={12} color={SF.green} />
            {recipe.usesExpiring.slice(0, 4).map((item, i) => (
              <View key={i} style={styles.expiringPill}>
                <Text style={styles.expiringPillText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Serving Size Scaler */}
        <View style={styles.scaleRow}>
          <Text style={styles.scaleLabel}>Servings</Text>
          <View style={styles.scaleControl}>
            <TouchableOpacity onPress={() => setCustomServings(cardKey, customSrv - 1)} style={styles.scaleBtn}>
              <MaterialIcons name="remove" size={14} color={SF.orange} />
            </TouchableOpacity>
            <Text style={styles.scaleValue}>{customSrv}</Text>
            <TouchableOpacity onPress={() => setCustomServings(cardKey, customSrv + 1)} style={styles.scaleBtn}>
              <MaterialIcons name="add" size={14} color={SF.orange} />
            </TouchableOpacity>
          </View>
          {multiplier !== 1 && (
            <TouchableOpacity onPress={() => setRecipeScales(prev => { const n = { ...prev }; delete n[cardKey]; return n; })}>
              <Text style={styles.resetScale}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Macros Row (scaled) */}
        <View style={styles.macroRow}>
          <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.blue }]}>{scaledP}g</Text><Text style={styles.macroLabel}>Protein</Text></View>
          <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.gold }]}>{scaledC}g</Text><Text style={styles.macroLabel}>Carbs</Text></View>
          <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.orange }]}>{scaledF}g</Text><Text style={styles.macroLabel}>Fat</Text></View>
          <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.red }]}>{scaledCal}</Text><Text style={styles.macroLabel}>kcal</Text></View>
        </View>

        {/* Rating Stars */}
        {renderStars(ratingId, recipe.name)}

        {/* Save for Later (non-saved tab) */}
        {!isSavedTab && !saved && (
          <TouchableOpacity style={styles.saveForLaterBtn} onPress={() => saveRecipe(recipe)} activeOpacity={0.7}>
            <MaterialIcons name="bookmark-add" size={14} color={SF.gold} />
            <Text style={styles.saveForLaterText}>Save for Later</Text>
          </TouchableOpacity>
        )}
        {!isSavedTab && saved && (
          <View style={styles.savedIndicator}>
            <MaterialIcons name="bookmark" size={14} color={SF.gold} />
            <Text style={styles.savedIndicatorText}>Saved</Text>
          </View>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Review Section */}
            {renderReviewSection(ratingId, recipe.name)}

            <Text style={[styles.subHeading, { marginTop: 10 }]}>Ingredients {multiplier !== 1 && <Text style={{ color: SF.orange }}>({customSrv} servings)</Text>}</Text>
            {recipe.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <MaterialIcons name={ing.fromPantry ? "check-circle" : "shopping-cart"} size={14} color={ing.fromPantry ? SF.green : SF.muted} />
                <Text style={styles.ingredientText}>{scaleAmount(ing.amount, multiplier)} {ing.name}</Text>
                {ing.fromPantry && <Text style={styles.pantryBadge}>pantry</Text>}
              </View>
            ))}

            <Text style={[styles.subHeading, { marginTop: 12 }]}>Instructions</Text>
            {recipe.instructions.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}

            {recipe.storageInstructions && (
              <View style={styles.storageRow}>
                <MaterialIcons name="kitchen" size={14} color={SF.blue} />
                <Text style={styles.storageText}>{recipe.storageInstructions}</Text>
              </View>
            )}

            {/* Cook Now Button */}
            {(() => {
              const matches = getIngredientMatches(recipe.ingredients, pantryItems);
              const avail = matches.filter(m => m.status === "available").length;
              const total = matches.length;
              const isCooking = cookingRecipe === cardKey;
              const justCooked = cookSuccess === cardKey;
              return (
                <View style={styles.cookNowSection}>
                  <View style={styles.cookNowAvailRow}>
                    <MaterialIcons name="inventory-2" size={13} color={avail === total ? SF.green : avail > 0 ? SF.orange : SF.red} />
                    <Text style={[styles.cookNowAvailText, { color: avail === total ? SF.green : avail > 0 ? SF.orange : SF.red }]}>
                      {avail}/{total} ingredients in pantry
                    </Text>
                  </View>
                  {/* Ingredient availability list */}
                  {matches.map((m, mi) => (
                    <View key={mi} style={styles.cookNowIngRow}>
                      <MaterialIcons
                        name={m.status === "available" ? "check-circle" : "cancel"}
                        size={12}
                        color={m.status === "available" ? SF.green : SF.red + "80"}
                      />
                      <Text style={[styles.cookNowIngText, m.status === "missing" && { color: SF.muted }]} numberOfLines={1}>
                        {scaleAmount(m.ingredientAmount, multiplier)} {m.ingredientName}
                      </Text>
                      {m.pantryItem && <Text style={styles.cookNowPantryTag}>✓ pantry</Text>}
                    </View>
                  ))}
                  {justCooked ? (
                    <View style={styles.cookSuccessRow}>
                      <MaterialIcons name="check-circle" size={16} color={SF.green} />
                      <Text style={styles.cookSuccessText}>Cooked! Ingredients deducted & calories logged.</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.cookNowBtn, isCooking && { opacity: 0.6 }]}
                      onPress={() => handleCookNow(recipe, cardKey)}
                      disabled={isCooking}
                      activeOpacity={0.7}
                    >
                      {isCooking ? (
                        <ActivityIndicator color="#0A0E14" size="small" />
                      ) : (
                        <>
                          <MaterialIcons name="local-fire-department" size={16} color="#0A0E14" />
                          <Text style={styles.cookNowBtnText}>Cook Now</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}

            {isSavedTab && savedId && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => confirmUnsave(savedId, recipe.name)}>
                <MaterialIcons name="delete-outline" size={14} color={SF.red} />
                <Text style={styles.removeText}>Remove Bookmark</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reorder buttons (saved tab, reorder mode) */}
        {isSavedTab && reorderMode && (
          <View style={styles.reorderRow}>
            <TouchableOpacity
              onPress={() => moveRecipe(idx, "up")}
              style={[styles.reorderBtn, idx === 0 && styles.reorderBtnDisabled]}
              disabled={idx === 0}
            >
              <MaterialIcons name="arrow-upward" size={16} color={idx === 0 ? SF.border : SF.orange} />
              <Text style={[styles.reorderBtnText, idx === 0 && { color: SF.border }]}>Up</Text>
            </TouchableOpacity>
            <Text style={styles.reorderPos}>#{idx + 1}</Text>
            <TouchableOpacity
              onPress={() => moveRecipe(idx, "down")}
              style={[styles.reorderBtn, idx === savedRecipes.length - 1 && styles.reorderBtnDisabled]}
              disabled={idx === savedRecipes.length - 1}
            >
              <MaterialIcons name="arrow-downward" size={16} color={idx === savedRecipes.length - 1 ? SF.border : SF.orange} />
              <Text style={[styles.reorderBtnText, idx === savedRecipes.length - 1 && { color: SF.border }]}>Down</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={SF.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Prep Planner</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === "generate" && styles.tabBtnActive]} onPress={() => { setTab("generate"); setReorderMode(false); }}>
          <MaterialIcons name="auto-awesome" size={16} color={tab === "generate" ? SF.orange : SF.muted} />
          <Text style={[styles.tabText, tab === "generate" && styles.tabTextActive]}>Generate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === "saved" && styles.tabBtnActive]} onPress={() => setTab("saved")}>
          <MaterialIcons name="bookmark" size={16} color={tab === "saved" ? SF.gold : SF.muted} />
          <Text style={[styles.tabText, tab === "saved" && styles.tabTextActive]}>Saved ({savedRecipes.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {tab === "generate" ? (
          <>
            {/* Expiring Items Summary */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="warning" size={18} color={SF.orange} />
                <Text style={styles.sectionTitle}>Expiring Soon ({expiringItems.length})</Text>
              </View>
              {expiringItems.length === 0 ? (
                <Text style={styles.emptyText}>No items expiring within 5 days.</Text>
              ) : (
                <View style={styles.chipRow}>
                  {expiringItems.slice(0, 12).map(item => {
                    const days = getDaysUntilExpiry(item.expiresAt!);
                    return (
                      <ImageBackground source={{ uri: GOLDEN_MEALS }} style={{ flex: 1 }} resizeMode="cover">
                      <View key={item.id} style={[styles.chip, { borderColor: getUrgencyColor(days) + "40" }]}>
                        <View style={[styles.chipDot, { backgroundColor: getUrgencyColor(days) }]} />
                        <Text style={styles.chipText} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.chipDays, { color: getUrgencyColor(days) }]}>{days}d</Text>
                      </View>
                      </ImageBackground>
                    );
                  })}
                  {expiringItems.length > 12 && <Text style={styles.moreText}>+{expiringItems.length - 12} more</Text>}
                </View>
              )}
            </View>

            {/* Servings Control */}
            <View style={styles.servingsRow}>
              <Text style={styles.servingsLabel}>Servings per recipe</Text>
              <View style={styles.servingsControl}>
                <TouchableOpacity onPress={() => setServings(Math.max(1, servings - 1))} style={styles.servingsBtn}>
                  <MaterialIcons name="remove" size={16} color={SF.orange} />
                </TouchableOpacity>
                <Text style={styles.servingsValue}>{servings}</Text>
                <TouchableOpacity onPress={() => setServings(Math.min(12, servings + 1))} style={styles.servingsBtn}>
                  <MaterialIcons name="add" size={16} color={SF.orange} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Generate Button */}
            {!generated && (
              <TouchableOpacity style={styles.generateBtn} onPress={generateRecipes} disabled={loading || pantryItems.length === 0}>
                {loading ? (
                  <ActivityIndicator color="#0A0E14" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="auto-awesome" size={20} color="#0A0E14" />
                    <Text style={styles.generateBtnText}>
                      {pantryItems.length === 0 ? "Add pantry items first" : `Generate Recipes (${expiringItems.length} expiring)`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {loading && (
              <View style={styles.loadingSection}>
                <ActivityIndicator color={SF.orange} size="large" />
                <Text style={styles.loadingText}>Creating recipes from your pantry...</Text>
              </View>
            )}

            {/* Generated Recipes */}
            {generated && !loading && (
              <>
                {recipes.length === 0 ? (
                  <View style={styles.emptySection}>
                    <MaterialIcons name="restaurant" size={40} color={SF.muted} />
                    <Text style={styles.emptyTitle}>No recipes generated</Text>
                    <Text style={styles.emptyText}>Try adding more items to your pantry.</Text>
                  </View>
                ) : (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{recipes.length} Batch Recipes</Text>
                    {recipes.map((recipe, idx) => renderRecipeCard(recipe, idx, false))}
                  </View>
                )}

                {tips.length > 0 && (
                  <View style={styles.tipsSection}>
                    <MaterialIcons name="lightbulb" size={16} color={SF.gold} />
                    <View style={{ flex: 1, gap: 4 }}>
                      {tips.map((tip, i) => (
                        <Text key={i} style={styles.tipText}>{tip}</Text>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.regenBtn} onPress={() => { setGenerated(false); setRecipes([]); setTips([]); setExpandedRecipe(null); setRecipeScales({}); }}>
                  <MaterialIcons name="refresh" size={16} color={SF.orange} />
                  <Text style={styles.regenText}>Generate New Recipes</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          /* Saved Recipes Tab */
          <View style={styles.section}>
            {savedRecipes.length === 0 ? (
              <View style={styles.emptySection}>
                <MaterialIcons name="bookmark-border" size={48} color={SF.muted} />
                <Text style={styles.emptyTitle}>No saved recipes</Text>
                <Text style={styles.emptyText}>Bookmark recipes to save them here.</Text>
                <TouchableOpacity style={styles.goGenerateBtn} onPress={() => setTab("generate")}>
                  <Text style={styles.goGenerateText}>Generate Recipes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.savedHeader}>
                  <Text style={styles.sectionTitle}>{savedRecipes.length} Saved</Text>
                  <TouchableOpacity onPress={() => setReorderMode(!reorderMode)} style={[styles.reorderToggle, reorderMode && styles.reorderToggleActive]}>
                    <MaterialIcons name="swap-vert" size={16} color={reorderMode ? SF.orange : SF.muted} />
                    <Text style={[styles.reorderToggleText, reorderMode && { color: SF.orange }]}>{reorderMode ? "Done" : "Reorder"}</Text>
                  </TouchableOpacity>
                </View>
                {savedRecipes.map((recipe, idx) => (
                  <View key={recipe.id}>
                    <Text style={styles.savedDate}>Saved {formatSavedDate(recipe.savedAt)}</Text>
                    {renderRecipeCard(recipe, idx, true, recipe.id)}
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SF.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SF.card, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 18 },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: SF.border, backgroundColor: SF.card },
  tabBtnActive: { borderColor: SF.orange + "40", backgroundColor: "rgba(245,158,11,0.08)" },
  tabText: { color: SF.muted, fontFamily: "DMSans_700Bold", fontSize: 13 },
  tabTextActive: { color: SF.text },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: SF.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: SF.text, fontSize: 11, fontFamily: "DMSans_700Bold", maxWidth: 80 },
  chipDays: { fontSize: 10, fontFamily: "DMSans_700Bold" },
  moreText: { color: SF.muted, fontSize: 11, alignSelf: "center" },
  servingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 16 },
  servingsLabel: { color: SF.muted, fontSize: 13 },
  servingsControl: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SF.card, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  servingsBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" },
  servingsValue: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 16, minWidth: 24, textAlign: "center" },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: SF.orange, borderRadius: 14, marginHorizontal: 16, marginTop: 20, paddingVertical: 14 },
  generateBtnText: { color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 15 },
  loadingSection: { alignItems: "center", marginTop: 40, gap: 12 },
  loadingText: { color: SF.muted, fontSize: 13 },
  emptySection: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyTitle: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 16 },
  emptyText: { color: SF.muted, fontSize: 12, textAlign: "center", paddingHorizontal: 20 },
  recipeCard: { backgroundColor: SF.card, borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: SF.border },
  recipeHeader: { flexDirection: "row", alignItems: "flex-start" },
  recipeName: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 15 },
  recipeMetaRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  recipeMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  recipeMetaText: { color: SF.muted, fontSize: 10 },
  expiringPills: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, flexWrap: "wrap" },
  expiringPill: { backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  expiringPillText: { color: SF.green, fontSize: 9, fontFamily: "DMSans_700Bold" },
  // Scale control
  scaleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: SF.border },
  scaleLabel: { color: SF.muted, fontSize: 11 },
  scaleControl: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2 },
  scaleBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center" },
  scaleValue: { color: SF.text, fontFamily: "DMSans_700Bold", fontSize: 14, minWidth: 20, textAlign: "center" },
  resetScale: { color: SF.orange, fontSize: 10, fontFamily: "DMSans_700Bold", marginLeft: 4 },
  macroRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  macroItem: { alignItems: "center" },
  macroVal: { fontFamily: "DMSans_700Bold", fontSize: 13 },
  macroLabel: { color: SF.muted, fontSize: 9, marginTop: 1 },
  // Stars
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 8 },
  ratingText: { color: SF.gold, fontSize: 11, fontFamily: "DMSans_700Bold", marginLeft: 6 },
  // Review
  reviewSection: { marginTop: 6 },
  reviewEditBox: { backgroundColor: "rgba(245,158,11,0.04)", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: SF.border },
  reviewInput: { color: SF.text, fontSize: 12, minHeight: 50, textAlignVertical: "top", padding: 0 },
  reviewActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 6 },
  reviewCancelBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  reviewCancelText: { color: SF.muted, fontSize: 11, fontFamily: "DMSans_700Bold" },
  reviewSaveBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "rgba(245,158,11,0.15)" },
  reviewSaveText: { color: SF.orange, fontSize: 11, fontFamily: "DMSans_700Bold" },
  reviewDisplay: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "rgba(251,191,36,0.04)", borderRadius: 6, padding: 8 },
  reviewText: { color: SF.cream, fontSize: 11, flex: 1, lineHeight: 16 },
  addReviewBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  addReviewText: { color: SF.muted, fontSize: 11 },
  saveBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.06)" },
  saveBtnActive: { backgroundColor: "rgba(251,191,36,0.15)" },
  saveForLaterBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: SF.gold + "30", backgroundColor: "rgba(251,191,36,0.06)" },
  saveForLaterText: { color: SF.gold, fontSize: 12, fontFamily: "DMSans_700Bold" },
  savedIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 10, paddingVertical: 6 },
  savedIndicatorText: { color: SF.gold, fontSize: 11, fontFamily: "DMSans_700Bold" },
  expandedContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: SF.border, paddingTop: 12 },
  subHeading: { color: SF.cream, fontFamily: "DMSans_700Bold", fontSize: 12, marginBottom: 6 },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  ingredientText: { color: SF.text, fontSize: 12, flex: 1 },
  pantryBadge: { color: SF.green, fontSize: 9, fontFamily: "DMSans_700Bold", backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  stepRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: SF.orange, fontSize: 10, fontFamily: "DMSans_700Bold" },
  stepText: { color: SF.text, fontSize: 12, flex: 1, lineHeight: 18 },
  storageRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "rgba(96,165,250,0.08)", borderRadius: 8, padding: 8 },
  storageText: { color: SF.blue, fontSize: 11, flex: 1 },
  removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: SF.red + "30", backgroundColor: "rgba(239,68,68,0.06)" },
  removeText: { color: SF.red, fontSize: 12, fontFamily: "DMSans_700Bold" },
  tipsSection: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 16, backgroundColor: "rgba(251,191,36,0.06)", borderRadius: 10, padding: 12 },
  tipText: { color: SF.cream, fontSize: 11, lineHeight: 16 },
  regenBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginHorizontal: 16, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: SF.border },
  regenText: { color: SF.orange, fontFamily: "DMSans_700Bold", fontSize: 13 },
  savedDate: { color: SF.muted, fontSize: 10, marginTop: 10, marginLeft: 4 },
  goGenerateBtn: { backgroundColor: SF.orange, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12 },
  goGenerateText: { color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 13 },
  // Saved header with reorder toggle
  savedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reorderToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: SF.border },
  reorderToggleActive: { borderColor: SF.orange + "40", backgroundColor: "rgba(245,158,11,0.08)" },
  reorderToggleText: { color: SF.muted, fontSize: 11, fontFamily: "DMSans_700Bold" },
  // Reorder buttons
  reorderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: SF.border },
  reorderBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(245,158,11,0.08)" },
  reorderBtnDisabled: { backgroundColor: "rgba(245,158,11,0.02)" },
  reorderBtnText: { color: SF.orange, fontSize: 11, fontFamily: "DMSans_700Bold" },
  reorderPos: { color: SF.muted, fontSize: 12, fontFamily: "DMSans_700Bold", minWidth: 24, textAlign: "center" },
  // Cook Now
  cookNowSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: SF.border },
  cookNowAvailRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  cookNowAvailText: { fontSize: 12, fontFamily: "DMSans_700Bold" },
  cookNowIngRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3, paddingLeft: 4 },
  cookNowIngText: { color: SF.text, fontSize: 11, flex: 1 },
  cookNowPantryTag: { color: SF.green, fontSize: 9, fontFamily: "DMSans_700Bold", backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  cookNowBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: SF.orange, borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  cookNowBtnText: { color: "#0A0E14", fontFamily: "DMSans_700Bold", fontSize: 14 },
  cookSuccessRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, paddingVertical: 10, backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 10 },
  cookSuccessText: { color: SF.green, fontSize: 12, fontFamily: "DMSans_700Bold" },
});
