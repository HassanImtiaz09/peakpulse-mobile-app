/**
 * EmptyState — Reusable zero-state component for screens with no data.
 *
 * Usage:
 *   <EmptyState
 *     icon="fitness-center"
 *     title="No Workout Plan Yet"
 *     description="Generate your first AI-powered workout plan tailored to your goals."
 *     ctaLabel="Generate Plan"
 *     onCta={() => router.push("/plans")}
 *   />
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { UI } from "@/constants/ui-colors";

interface EmptyStateProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Optional secondary action */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Icon color override (defaults to UI.gold) */
  iconColor?: string;
  /** Compact mode for inline use within cards */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  iconColor = UI.gold,
  compact = false,
}: EmptyStateProps) {
  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCta?.();
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.iconCircle, { borderColor: iconColor + "30" }]}>
        <MaterialIcons name={icon} size={compact ? 28 : 40} color={iconColor} />
      </View>

      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      <Text style={[styles.description, compact && styles.descCompact]}>{description}</Text>

      {ctaLabel && onCta && (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleCta}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <MaterialIcons name="auto-awesome" size={18} color={UI.bg} />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}

      {secondaryLabel && onSecondary && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onSecondary}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Preset empty states for common screens.
 * Usage: <EmptyState {...EMPTY_STATES.workoutPlan} onCta={() => ...} />
 */
export const EMPTY_STATES = {
  workoutPlan: {
    icon: "fitness-center" as const,
    title: "No Workout Plan Yet",
    description: "Generate your first AI-powered workout plan tailored to your goals, style, and schedule.",
    ctaLabel: "Generate AI Plan",
  },
  mealPlan: {
    icon: "restaurant" as const,
    title: "No Meal Plan Yet",
    description: "Get a personalised AI meal plan based on your dietary preferences and calorie goals.",
    ctaLabel: "Generate Meal Plan",
    iconColor: UI.emerald,
  },
  progressPhotos: {
    icon: "photo-camera" as const,
    title: "No Progress Photos",
    description: "Take your first progress photo to start tracking your transformation with AI analysis.",
    ctaLabel: "Take First Photo",
    iconColor: UI.ice,
  },
  workoutHistory: {
    icon: "history" as const,
    title: "No Workouts Logged",
    description: "Complete your first workout to start building your training history and analytics.",
    ctaLabel: "Start a Workout",
  },
  mealLog: {
    icon: "restaurant-menu" as const,
    title: "No Meals Logged Today",
    description: "Log your first meal to track calories and macros. Use the camera for instant AI calorie estimation.",
    ctaLabel: "Log a Meal",
    iconColor: UI.emerald,
  },
  socialFeed: {
    icon: "groups" as const,
    title: "No Posts Yet",
    description: "Share your first progress update or join a challenge to connect with the community.",
    ctaLabel: "Share Progress",
    iconColor: UI.rose,
  },
  wearableSync: {
    icon: "watch" as const,
    title: "No Wearable Connected",
    description: "Connect your fitness tracker to sync steps, heart rate, sleep, and more automatically.",
    ctaLabel: "Connect Device",
    iconColor: UI.ice,
  },
  pantry: {
    icon: "kitchen" as const,
    title: "Pantry is Empty",
    description: "Add ingredients you have on hand and get smart recipe suggestions based on what's available.",
    ctaLabel: "Add Ingredients",
    iconColor: UI.emerald,
  },
  analytics: {
    icon: "bar-chart" as const,
    title: "Not Enough Data",
    description: "Complete a few workouts to unlock volume, frequency, and strength progression charts.",
    secondaryLabel: "Start a Workout",
  },
  challenges: {
    icon: "emoji-events" as const,
    title: "No Active Challenges",
    description: "Join a challenge to stay motivated and compete with the community.",
    ctaLabel: "Browse Challenges",
    iconColor: UI.gold2,
  },
} as const;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  containerCompact: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: UI.surface,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: UI.fg,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 16,
  },
  description: {
    color: UI.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 280,
  },
  descCompact: {
    fontSize: 13,
    marginBottom: 16,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.gold,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  ctaText: {
    color: UI.bg,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryText: {
    color: UI.gold,
    fontSize: 14,
    fontWeight: "600",
  },
});
