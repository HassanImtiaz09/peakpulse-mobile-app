/**
 * Level Up Prompt Modal
 *
 * Shows when the user has consistently completed all sets at their current
 * weight/reps and is ready to progress. Displays the suggested increase
 * with accept/dismiss options.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  FlatList,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import type { ProgressionSuggestion } from "@/lib/workout-progression";

interface LevelUpPromptProps {
  visible: boolean;
  suggestions: ProgressionSuggestion[];
  onAccept: (suggestion: ProgressionSuggestion) => void;
  onDismiss: () => void;
}

export function LevelUpPrompt({
  visible,
  suggestions,
  onAccept,
  onDismiss,
}: LevelUpPromptProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible || suggestions.length === 0) return null;

  const renderSuggestion = ({ item }: { item: ProgressionSuggestion }) => {
    const isBodyweight = item.exerciseType === "bodyweight" || item.currentWeight === 0;
    return (
      <View style={styles.suggestionCard}>
        <View style={styles.exerciseHeader}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="trending-up" size={20} color="#FFD700" />
          </View>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {item.exerciseName}
          </Text>
        </View>

        <View style={styles.progressionRow}>
          <View style={styles.valueBox}>
            <Text style={styles.valueLabel}>Current</Text>
            <Text style={styles.valueText}>
              {isBodyweight
                ? `${item.currentReps} reps`
                : `${item.currentWeight}kg × ${item.currentReps}`}
            </Text>
          </View>

          <MaterialIcons name="arrow-forward" size={20} color="#FFD700" />

          <View style={[styles.valueBox, styles.valueBoxNew]}>
            <Text style={styles.valueLabel}>Level Up</Text>
            <Text style={[styles.valueText, styles.valueTextNew]}>
              {isBodyweight
                ? `${item.suggestedReps} reps`
                : `${item.suggestedWeight}kg × ${item.suggestedReps}`}
            </Text>
          </View>
        </View>

        <Text style={styles.streakText}>
          {item.consecutiveCompletions} consecutive completions
        </Text>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            onAccept(item);
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="fitness-center" size={18} color="#000" />
          <Text style={styles.acceptText}>Accept Challenge</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🏆</Text>
            <Text style={styles.headerTitle}>Level Up!</Text>
            <Text style={styles.headerSubtitle}>
              You&apos;re ready to progress on{" "}
              {suggestions.length === 1
                ? "this exercise"
                : `${suggestions.length} exercises`}
            </Text>
          </View>

          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.exerciseName}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Maybe Later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#1a1a2e",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFD700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  list: {
    maxHeight: 350,
  },
  suggestionCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,215,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  progressionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  valueBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  valueBoxNew: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  valueLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  valueTextNew: {
    color: "#FFD700",
  },
  streakText: {
    fontSize: 12,
    color: "rgba(255,215,0,0.7)",
    textAlign: "center",
    marginBottom: 12,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD700",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  acceptText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  dismissText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
  },
});
