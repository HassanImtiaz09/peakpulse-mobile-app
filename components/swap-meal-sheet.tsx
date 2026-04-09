/**
 * SwapMealSheet — Bottom sheet showing macro-matched swap candidates
 * from the user's existing weekly meal plan.
 */
import React, { useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Platform,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { C } from "@/constants/ui-colors";
import {
  findSwapCandidates,
  getMatchLabel,
  type MealForSwap,
  type SwapCandidate,
} from "@/lib/smart-meal-swap";

interface SwapMealSheetProps {
  visible: boolean;
  sourceMeal: MealForSwap | null;
  allMeals: MealForSwap[];
  onClose: () => void;
  onSwap: (candidate: SwapCandidate) => void;
}

export function SwapMealSheet({
  visible,
  sourceMeal,
  allMeals,
  onClose,
  onSwap,
}: SwapMealSheetProps) {
  const candidates = useMemo(() => {
    if (!sourceMeal) return [];
    return findSwapCandidates(sourceMeal, allMeals);
  }, [sourceMeal, allMeals]);

  if (!sourceMeal) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Smart Swap</Text>
              <Text style={styles.subtitle}>
                Swap "{sourceMeal.name}" with a macro-matched alternative
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Source Meal Summary */}
          <View style={styles.sourceCard}>
            <Text style={styles.sourceLabel}>CURRENT MEAL</Text>
            <Text style={styles.sourceName}>{sourceMeal.name}</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{sourceMeal.calories}</Text>
                <Text style={styles.macroLabel}>cal</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: "#3B82F6" }]}>{sourceMeal.protein}g</Text>
                <Text style={styles.macroLabel}>protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: "#F59E0B" }]}>{sourceMeal.carbs}g</Text>
                <Text style={styles.macroLabel}>carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: "#EF4444" }]}>{sourceMeal.fat}g</Text>
                <Text style={styles.macroLabel}>fat</Text>
              </View>
            </View>
          </View>

          {/* Candidates */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {candidates.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={40} color={C.muted} />
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptyDesc}>
                  No meals in your plan are close enough in macros to swap.
                  Try the AI swap for a custom alternative.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.candidatesTitle}>
                  {candidates.length} match{candidates.length !== 1 ? "es" : ""} from your plan
                </Text>
                {candidates.map((candidate, idx) => {
                  const match = getMatchLabel(candidate.score);
                  return (
                    <TouchableOpacity
                      key={candidate.meal.id}
                      style={styles.candidateCard}
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onSwap(candidate);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.candidateHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.candidateName}>{candidate.meal.name}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <Text style={styles.candidateDay}>{candidate.dayLabel}</Text>
                            {candidate.sameMealType && (
                              <View style={styles.sameMealTag}>
                                <Text style={styles.sameMealTagText}>Same slot</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.scoreCol}>
                          <View style={[styles.matchBadge, { backgroundColor: match.color + "20" }]}>
                            <Text style={[styles.matchText, { color: match.color }]}>{match.label}</Text>
                          </View>
                          <Text style={styles.scoreText}>{Math.round(candidate.score * 100)}%</Text>
                        </View>
                      </View>

                      {/* Macro Comparison */}
                      <View style={styles.comparisonRow}>
                        <View style={styles.compItem}>
                          <Text style={styles.compValue}>{candidate.meal.calories}</Text>
                          <Text style={styles.compLabel}>cal</Text>
                          <Text style={[
                            styles.compDiff,
                            { color: candidate.calorieDiff <= 50 ? "#22C55E" : candidate.calorieDiff <= 100 ? "#FBBF24" : "#F87171" },
                          ]}>
                            {candidate.calorieDiff === 0 ? "=" : `±${candidate.calorieDiff}`}
                          </Text>
                        </View>
                        <View style={styles.compItem}>
                          <Text style={[styles.compValue, { color: "#3B82F6" }]}>{candidate.meal.protein}g</Text>
                          <Text style={styles.compLabel}>protein</Text>
                          <Text style={[
                            styles.compDiff,
                            { color: candidate.proteinDiff <= 5 ? "#22C55E" : candidate.proteinDiff <= 10 ? "#FBBF24" : "#F87171" },
                          ]}>
                            {candidate.proteinDiff === 0 ? "=" : `±${candidate.proteinDiff}g`}
                          </Text>
                        </View>
                        <View style={styles.compItem}>
                          <Text style={[styles.compValue, { color: "#F59E0B" }]}>{candidate.meal.carbs}g</Text>
                          <Text style={styles.compLabel}>carbs</Text>
                        </View>
                        <View style={styles.compItem}>
                          <Text style={[styles.compValue, { color: "#EF4444" }]}>{candidate.meal.fat}g</Text>
                          <Text style={styles.compLabel}>fat</Text>
                        </View>
                      </View>

                      {/* Swap Button */}
                      <View style={styles.swapBtnRow}>
                        <MaterialIcons name="swap-horiz" size={18} color="#F59E0B" />
                        <Text style={styles.swapBtnText}>Swap to this meal</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#141A22", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "85%", paddingBottom: 30,
  },
  handle: {
    width: 36, height: 4, backgroundColor: C.muted + "40", borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 8,
  },
  header: {
    flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20,
    paddingVertical: 12, gap: 12,
  },
  title: { color: C.fg, fontSize: 18, fontWeight: "800" },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface,
    alignItems: "center", justifyContent: "center",
  },
  // Source Card
  sourceCard: {
    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 16,
  },
  sourceLabel: { color: C.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  sourceName: { color: C.fg, fontSize: 15, fontWeight: "700", marginTop: 4 },
  macroRow: {
    flexDirection: "row", justifyContent: "space-around", marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border,
  },
  macroItem: { alignItems: "center" },
  macroValue: { color: C.fg, fontSize: 14, fontWeight: "700" },
  macroLabel: { color: C.muted, fontSize: 10, marginTop: 1 },
  // Candidates
  candidatesTitle: {
    color: C.fg, fontSize: 14, fontWeight: "700", paddingHorizontal: 20, marginBottom: 10,
  },
  candidateCard: {
    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  candidateHeader: { flexDirection: "row", alignItems: "flex-start" },
  candidateName: { color: C.fg, fontSize: 14, fontWeight: "700" },
  candidateDay: { color: C.muted, fontSize: 11 },
  sameMealTag: {
    backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  sameMealTagText: { color: "#3B82F6", fontSize: 9, fontWeight: "700" },
  scoreCol: { alignItems: "flex-end" },
  matchBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  matchText: { fontSize: 10, fontWeight: "700" },
  scoreText: { color: C.muted, fontSize: 10, marginTop: 2 },
  // Comparison
  comparisonRow: {
    flexDirection: "row", justifyContent: "space-around", marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border,
  },
  compItem: { alignItems: "center" },
  compValue: { color: C.fg, fontSize: 13, fontWeight: "700" },
  compLabel: { color: C.muted, fontSize: 9, marginTop: 1 },
  compDiff: { fontSize: 9, fontWeight: "600", marginTop: 2 },
  // Swap Button
  swapBtnRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border,
  },
  swapBtnText: { color: "#F59E0B", fontSize: 13, fontWeight: "700" },
  // Empty State
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 30 },
  emptyTitle: { color: C.fg, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptyDesc: { color: C.muted, fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 },
});
