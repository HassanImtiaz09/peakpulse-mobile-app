import React, { useState, useEffect, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { usePantry } from "@/lib/pantry-context";
import { trpc } from "@/lib/trpc";

const SF = { bg: "#0A0500", card: "#150A00", orange: "#F59E0B", gold: "#FBBF24", cream: "#FDE68A", muted: "#B45309", text: "#FFF7ED", border: "rgba(245,158,11,0.10)", green: "#22C55E", red: "#EF4444", blue: "#60A5FA" };

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

export default function MealPrepScreen() {
  const router = useRouter();
  const { items: pantryItems } = usePantry();
  const generatePrep = trpc.mealPrep.fromExpiring.useMutation();

  const [recipes, setRecipes] = useState<PrepRecipe[]>([]);
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [servings, setServings] = useState(4);
  const [generated, setGenerated] = useState(false);

  const expiringItems = useMemo(() => {
    const now = Date.now();
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    return pantryItems.filter(item => {
      if (!item.expiresAt) return false;
      const exp = new Date(item.expiresAt).getTime();
      return exp > now && exp - now < fiveDays;
    });
  }, [pantryItems]);

  const expiredItems = useMemo(() => {
    const now = Date.now();
    return pantryItems.filter(item => item.expiresAt && new Date(item.expiresAt).getTime() <= now);
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

  const getDaysUntilExpiry = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    return days;
  };

  const getUrgencyColor = (days: number) => days <= 1 ? SF.red : days <= 3 ? SF.orange : SF.green;

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={SF.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Prep Planner</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
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
                  <View key={item.id} style={[styles.chip, { borderColor: getUrgencyColor(days) + "40" }]}>
                    <View style={[styles.chipDot, { backgroundColor: getUrgencyColor(days) }]} />
                    <Text style={styles.chipText} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.chipDays, { color: getUrgencyColor(days) }]}>{days}d</Text>
                  </View>
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
              <ActivityIndicator color="#0A0500" size="small" />
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={20} color="#0A0500" />
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

        {/* Recipes */}
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
                {recipes.map((recipe, idx) => {
                  const isExpanded = expandedRecipe === idx;
                  return (
                    <TouchableOpacity key={idx} style={styles.recipeCard} onPress={() => setExpandedRecipe(isExpanded ? null : idx)} activeOpacity={0.7}>
                      {/* Header */}
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
                              <Text style={styles.recipeMetaText}>{recipe.calories} kcal</Text>
                            </View>
                            <View style={styles.recipeMeta}>
                              <MaterialIcons name="people" size={11} color={SF.muted} />
                              <Text style={styles.recipeMetaText}>{recipe.servings} srv</Text>
                            </View>
                          </View>
                        </View>
                        <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={22} color={SF.muted} />
                      </View>

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

                      {/* Macros Row */}
                      <View style={styles.macroRow}>
                        <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.blue }]}>{recipe.protein}g</Text><Text style={styles.macroLabel}>Protein</Text></View>
                        <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.gold }]}>{recipe.carbs}g</Text><Text style={styles.macroLabel}>Carbs</Text></View>
                        <View style={styles.macroItem}><Text style={[styles.macroVal, { color: SF.orange }]}>{recipe.fat}g</Text><Text style={styles.macroLabel}>Fat</Text></View>
                      </View>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <View style={styles.expandedContent}>
                          {/* Ingredients */}
                          <Text style={styles.subHeading}>Ingredients</Text>
                          {recipe.ingredients.map((ing, i) => (
                            <View key={i} style={styles.ingredientRow}>
                              <MaterialIcons name={ing.fromPantry ? "check-circle" : "shopping-cart"} size={14} color={ing.fromPantry ? SF.green : SF.muted} />
                              <Text style={styles.ingredientText}>{ing.amount} {ing.name}</Text>
                              {ing.fromPantry && <Text style={styles.pantryBadge}>pantry</Text>}
                            </View>
                          ))}

                          {/* Instructions */}
                          <Text style={[styles.subHeading, { marginTop: 12 }]}>Instructions</Text>
                          {recipe.instructions.map((step, i) => (
                            <View key={i} style={styles.stepRow}>
                              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                              <Text style={styles.stepText}>{step}</Text>
                            </View>
                          ))}

                          {/* Storage */}
                          {recipe.storageInstructions && (
                            <View style={styles.storageRow}>
                              <MaterialIcons name="kitchen" size={14} color={SF.blue} />
                              <Text style={styles.storageText}>{recipe.storageInstructions}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Tips */}
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

            {/* Regenerate */}
            <TouchableOpacity style={styles.regenBtn} onPress={() => { setGenerated(false); setRecipes([]); setTips([]); setExpandedRecipe(null); }}>
              <MaterialIcons name="refresh" size={16} color={SF.orange} />
              <Text style={styles.regenText}>Generate New Recipes</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SF.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SF.card, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 18 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: SF.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: SF.text, fontSize: 11, fontFamily: "Outfit_700Bold", maxWidth: 80 },
  chipDays: { fontSize: 10, fontFamily: "Outfit_700Bold" },
  moreText: { color: SF.muted, fontSize: 11, alignSelf: "center" },
  servingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 16 },
  servingsLabel: { color: SF.muted, fontSize: 13 },
  servingsControl: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SF.card, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  servingsBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" },
  servingsValue: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 16, minWidth: 24, textAlign: "center" },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: SF.orange, borderRadius: 14, marginHorizontal: 16, marginTop: 20, paddingVertical: 14 },
  generateBtnText: { color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 15 },
  loadingSection: { alignItems: "center", marginTop: 40, gap: 12 },
  loadingText: { color: SF.muted, fontSize: 13 },
  emptySection: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 16 },
  emptyText: { color: SF.muted, fontSize: 12 },
  recipeCard: { backgroundColor: SF.card, borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: SF.border },
  recipeHeader: { flexDirection: "row", alignItems: "flex-start" },
  recipeName: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 15 },
  recipeMetaRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  recipeMeta: { flexDirection: "row", alignItems: "center", gap: 3 },
  recipeMetaText: { color: SF.muted, fontSize: 10 },
  expiringPills: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, flexWrap: "wrap" },
  expiringPill: { backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  expiringPillText: { color: SF.green, fontSize: 9, fontFamily: "Outfit_700Bold" },
  macroRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  macroItem: { alignItems: "center" },
  macroVal: { fontFamily: "Outfit_700Bold", fontSize: 13 },
  macroLabel: { color: SF.muted, fontSize: 9, marginTop: 1 },
  expandedContent: { marginTop: 12, borderTopWidth: 1, borderTopColor: SF.border, paddingTop: 12 },
  subHeading: { color: SF.cream, fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 6 },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  ingredientText: { color: SF.text, fontSize: 12, flex: 1 },
  pantryBadge: { color: SF.green, fontSize: 9, fontFamily: "Outfit_700Bold", backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  stepRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: SF.orange, fontSize: 10, fontFamily: "Outfit_700Bold" },
  stepText: { color: SF.text, fontSize: 12, flex: 1, lineHeight: 18 },
  storageRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "rgba(96,165,250,0.08)", borderRadius: 8, padding: 8 },
  storageText: { color: SF.blue, fontSize: 11, flex: 1 },
  tipsSection: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 16, backgroundColor: "rgba(251,191,36,0.06)", borderRadius: 10, padding: 12 },
  tipText: { color: SF.cream, fontSize: 11, lineHeight: 16 },
  regenBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginHorizontal: 16, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: SF.border },
  regenText: { color: SF.orange, fontFamily: "Outfit_700Bold", fontSize: 13 },
});
