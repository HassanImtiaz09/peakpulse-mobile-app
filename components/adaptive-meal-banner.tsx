/**
 * AdaptiveMealBanner — Contextual banner shown on the Meals tab when the
 * adaptive analysis detects under-eating, over-eating, missed meals, or
 * low protein. Also shows positive reinforcement when the user is on track.
 *
 * Design follows the same amber/teal pattern as MissedWorkoutBanner.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  analyseMealPatterns,
  buildDaySummaries,
  getSimpleMealSuggestions,
  dismissInsight,
  isInsightDismissed,
  type MealInsight,
  type AdaptiveAnalysis,
  type SimpleMealSuggestion,
} from "@/lib/adaptive-meal-plan";
import { getHistoricalMeals, type MealEntry } from "@/lib/calorie-context";
import {
  getSmartMealSuggestions,
  type SmartSuggestion,
} from "@/lib/smart-meal-suggestions";

// ── Design Tokens (Meals tab palette) ────────────────────────────────────

const MBG = "#0A0E14";
const MSURFACE = "#111827";
const MSURFACE2 = "#1E293B";
const MFG = "#F1F5F9";
const MMUTED = "#64748B";
const MINT = "#14B8A6";
const AMBER = "#F59E0B";
const RED = "#EF4444";
const GREEN = "#22C55E";

const SEVERITY_COLORS: Record<string, { bg: string; border: string; icon: string; iconColor: string }> = {
  warning: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.20)",
    icon: "warning-amber",
    iconColor: AMBER,
  },
  info: {
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.20)",
    icon: "info-outline",
    iconColor: "#3B82F6",
  },
  success: {
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.20)",
    icon: "check-circle-outline",
    iconColor: GREEN,
  },
};

// ── Props ────────────────────────────────────────────────────────────────

interface AdaptiveMealBannerProps {
  calorieGoal: number;
  proteinTarget: number;
  dietaryPref?: string;
  /** Callback to regenerate the meal plan with adjusted calorie targets */
  onRegeneratePlan?: (adjustedCalories: number) => void;
  /** Whether a regeneration is currently in progress */
  isRegenerating?: boolean;
  /** The user's current weekly meal plan for smart suggestions */
  mealPlanDays?: Array<{ day: string; meals: any[] }>;
  /** Names of meals already logged today */
  todayLoggedMealNames?: string[];
  /** Callback when user taps "Add to Today" on a smart suggestion */
  onAddMealToday?: (meal: { name: string; calories: number; protein: number; carbs: number; fat: number; type: string }) => void;
}

// ── Component ────────────────────────────────────────────────────────────

export function AdaptiveMealBanner({
  calorieGoal,
  proteinTarget,
  dietaryPref,
  onRegeneratePlan,
  isRegenerating,
  mealPlanDays,
  todayLoggedMealNames,
  onAddMealToday,
}: AdaptiveMealBannerProps) {
  const [analysis, setAnalysis] = useState<AdaptiveAnalysis | null>(null);
  const [visibleInsights, setVisibleInsights] = useState<MealInsight[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<MealInsight | null>(null);
  const [suggestions, setSuggestions] = useState<SimpleMealSuggestion[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);

  // Run analysis on mount and when goals change
  useEffect(() => {
    runAnalysis();
  }, [calorieGoal, proteinTarget]);

  const runAnalysis = useCallback(async () => {
    try {
      if (calorieGoal <= 0) return;

      const historicalMeals = await getHistoricalMeals(7);
      const summaries = buildDaySummaries(historicalMeals);
      const result = analyseMealPatterns(summaries, calorieGoal, proteinTarget);
      setAnalysis(result);

      // Filter out dismissed insights
      const visible: MealInsight[] = [];
      for (const insight of result.insights) {
        const dismissed = await isInsightDismissed(insight.id);
        if (!dismissed) visible.push(insight);
      }
      setVisibleInsights(visible);

      // Generate simple meal suggestions if under-eating
      if (result.insights.some((i) => i.type === "under_eating")) {
        const gap = calorieGoal - result.averageDailyCalories;
        setSuggestions(getSimpleMealSuggestions(gap, dietaryPref));

        // Smart suggestions from the user's actual meal plan
        if (mealPlanDays && mealPlanDays.length > 0) {
          const smart = getSmartMealSuggestions(
            mealPlanDays as any,
            gap,
            todayLoggedMealNames || [],
            4,
          );
          setSmartSuggestions(smart);
        }
      } else {
        setSmartSuggestions([]);
      }
    } catch {}
  }, [calorieGoal, proteinTarget, dietaryPref]);

  const handleDismiss = useCallback(
    async (insightId: string) => {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await dismissInsight(insightId);
      setVisibleInsights((prev) => prev.filter((i) => i.id !== insightId));
    },
    [],
  );

  const handleOpenDetail = useCallback((insight: MealInsight) => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInsight(insight);
    setShowDetailModal(true);
  }, []);

  // Don't render if no insights
  if (visibleInsights.length === 0) return null;

  // Show only the top insight as a banner
  const topInsight = visibleInsights[0];
  const colors = SEVERITY_COLORS[topInsight.severity] ?? SEVERITY_COLORS.info;

  return (
    <>
      {/* Banner */}
      <View
        style={[
          styles.banner,
          { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
      >
        <View style={styles.bannerRow}>
          <View
            style={[styles.iconCircle, { backgroundColor: `${colors.iconColor}15` }]}
          >
            <MaterialIcons
              name={colors.icon as any}
              size={20}
              color={colors.iconColor}
            />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{topInsight.title}</Text>
            <Text style={styles.bannerMessage} numberOfLines={2}>
              {topInsight.message}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDismiss(topInsight.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="close" size={18} color={MMUTED} />
          </TouchableOpacity>
        </View>

        <View style={styles.bannerActions}>
          <TouchableOpacity
            onPress={() => handleOpenDetail(topInsight)}
            style={[styles.actionButton, { backgroundColor: `${colors.iconColor}15` }]}
          >
            <MaterialIcons name="lightbulb-outline" size={14} color={colors.iconColor} />
            <Text style={[styles.actionText, { color: colors.iconColor }]}>
              View Suggestion
            </Text>
          </TouchableOpacity>

          {visibleInsights.length > 1 && (
            <Text style={styles.moreInsights}>
              +{visibleInsights.length - 1} more insight{visibleInsights.length > 2 ? "s" : ""}
            </Text>
          )}
        </View>

        {/* Adjust My Plan button — shown for under/over eating */}
        {onRegeneratePlan && analysis && (
          topInsight.type === "under_eating" || topInsight.type === "over_eating"
        ) && (
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web")
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Suggest adjusted calories based on actual average
              const adjusted = Math.round(
                (analysis.averageDailyCalories + calorieGoal) / 2
              );
              onRegeneratePlan(adjusted);
            }}
            style={[
              styles.regenerateButton,
              isRegenerating && { opacity: 0.5 },
            ]}
            disabled={isRegenerating}
          >
            <MaterialIcons
              name={isRegenerating ? "hourglass-top" : "auto-fix-high"}
              size={16}
              color="#000"
            />
            <Text style={styles.regenerateText}>
              {isRegenerating ? "Adjusting Plan..." : "Adjust My Plan"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nutrition Insights</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <MaterialIcons name="close" size={24} color={MMUTED} />
                </TouchableOpacity>
              </View>

              {/* All insights */}
              {visibleInsights.map((insight) => {
                const c = SEVERITY_COLORS[insight.severity] ?? SEVERITY_COLORS.info;
                return (
                  <View
                    key={insight.id}
                    style={[
                      styles.insightCard,
                      { backgroundColor: c.bg, borderColor: c.border },
                    ]}
                  >
                    <View style={styles.insightHeader}>
                      <MaterialIcons
                        name={c.icon as any}
                        size={20}
                        color={c.iconColor}
                      />
                      <Text style={styles.insightTitle}>{insight.title}</Text>
                    </View>
                    <Text style={styles.insightMessage}>{insight.message}</Text>
                    <View style={[styles.suggestionBox, { borderLeftColor: c.iconColor }]}>
                      <Text style={styles.suggestionLabel}>Suggestion</Text>
                      <Text style={styles.suggestionText}>{insight.suggestion}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDismiss(insight.id)}
                      style={styles.dismissButton}
                    >
                      <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Simple meal suggestions (for under-eating) */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <Text style={styles.sectionTitle}>Quick Meal Ideas</Text>
                  <Text style={styles.sectionSubtitle}>
                    Easy options to help close the calorie gap
                  </Text>
                  {suggestions.map((s, i) => (
                    <View key={i} style={styles.suggestionCard}>
                      <View style={styles.suggestionIcon}>
                        <MaterialIcons
                          name={s.icon as any}
                          size={20}
                          color={AMBER}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionName}>{s.name}</Text>
                        <Text style={styles.suggestionMeta}>
                          {s.calories} kcal · {s.protein}g protein · {s.prepTime}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Smart Meal Suggestions from User's Plan */}
              {smartSuggestions.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <Text style={styles.sectionTitle}>From Your Meal Plan</Text>
                  <Text style={styles.sectionSubtitle}>
                    These meals from your plan would close today's calorie gap
                  </Text>
                  {smartSuggestions.map((s, i) => (
                    <View key={`smart-${i}`} style={styles.smartSuggestionCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionName}>{s.name}</Text>
                        <Text style={styles.suggestionMeta}>
                          {s.calories} kcal · {s.protein}g protein · {s.type}
                        </Text>
                        <Text style={[styles.suggestionMeta, { color: MINT, marginTop: 2 }]}>
                          From {s.fromDay}'s plan
                        </Text>
                      </View>
                      {onAddMealToday && (
                        <TouchableOpacity
                          onPress={() => {
                            if (Platform.OS !== "web")
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onAddMealToday({
                              name: s.name,
                              calories: s.calories,
                              protein: s.protein,
                              carbs: s.carbs,
                              fat: s.fat,
                              type: s.type,
                            });
                          }}
                          style={styles.addTodayButton}
                        >
                          <MaterialIcons name="add-circle-outline" size={16} color={MINT} />
                          <Text style={styles.addTodayText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Stats summary */}
              {analysis && (
                <View style={styles.statsSection}>
                  <Text style={styles.sectionTitle}>This Week's Summary</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{analysis.averageDailyCalories}</Text>
                      <Text style={styles.statLabel}>Avg. kcal/day</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{analysis.averageDailyProtein}g</Text>
                      <Text style={styles.statLabel}>Avg. protein</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {Math.round(analysis.loggingConsistency * 100)}%
                      </Text>
                      <Text style={styles.statLabel}>Logging rate</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerContent: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    color: MFG,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
  },
  bannerMessage: {
    color: MMUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  bannerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 48,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
  },
  moreInsights: {
    color: MMUTED,
    fontSize: 11,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: MBG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: MMUTED,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    color: MFG,
    fontFamily: "DMSans_700Bold",
    fontSize: 20,
  },
  // Insight cards
  insightCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  insightTitle: {
    color: MFG,
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
  },
  insightMessage: {
    color: MMUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  suggestionBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
    gap: 2,
  },
  suggestionLabel: {
    color: MFG,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionText: {
    color: MMUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  dismissButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  dismissText: {
    color: MMUTED,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  // Simple meal suggestions
  suggestionsSection: {
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    color: MFG,
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  sectionSubtitle: {
    color: MMUTED,
    fontSize: 12,
    marginBottom: 4,
  },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: MSURFACE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.10)",
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionName: {
    color: MFG,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  suggestionMeta: {
    color: MMUTED,
    fontSize: 11,
    marginTop: 2,
  },
  // Stats
  statsSection: {
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statItem: {
    flex: 1,
    backgroundColor: MSURFACE,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.10)",
  },
  statValue: {
    color: MFG,
    fontFamily: "DMSans_700Bold",
    fontSize: 18,
  },
  statLabel: {
    color: MMUTED,
    fontSize: 10,
  },
  // Regenerate button
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AMBER,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 2,
  },
  regenerateText: {
    color: "#000",
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  smartSuggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(20,184,166,0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.15)",
  },
  addTodayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(20,184,166,0.12)",
  },
  addTodayText: {
    color: "#14B8A6",
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
});
