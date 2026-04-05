/**
 * OfflineBanner — shows a subtle banner when the device is offline
 * and displays the number of pending actions in the sync queue.
 *
 * Usage:
 *   <OfflineBanner />
 *
 * Place at the top of any screen that supports offline actions.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOfflineQueue } from "@/lib/offline-queue";
import { SF } from "@/constants/ui-colors";

export function OfflineBanner() {
  const { isOnline, stats, retryAll } = useOfflineQueue();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: !isOnline || stats.pending > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, stats.pending]);

  if (isOnline && stats.pending === 0 && stats.failed === 0) return null;

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
      {!isOnline ? (
        <View style={styles.row}>
          <Ionicons name="cloud-offline" size={16} color="#F59E0B" />
          <Text style={styles.text}>
            You're offline{stats.pending > 0 ? ` — ${stats.pending} action${stats.pending > 1 ? "s" : ""} queued` : ""}
          </Text>
        </View>
      ) : stats.pending > 0 ? (
        <TouchableOpacity style={styles.row} onPress={() => retryAll()}>
          <Ionicons name="cloud-upload" size={16} color="#14B8A6" />
          <Text style={[styles.text, { color: "#14B8A6" }]}>
            Syncing {stats.pending} action{stats.pending > 1 ? "s" : ""}...
          </Text>
        </TouchableOpacity>
      ) : stats.failed > 0 ? (
        <TouchableOpacity style={styles.row} onPress={() => retryAll()}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={[styles.text, { color: "#EF4444" }]}>
            {stats.failed} action{stats.failed > 1 ? "s" : ""} failed to sync — tap to retry
          </Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: "#F59E0B",
  },
});
