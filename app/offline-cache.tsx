/**
 * Offline Cache Settings Screen
 *
 * Shows cache status, allows manual caching and clearing.
 */

import React, { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  getOfflineCacheStatus, clearOfflineCache, preCacheAllCuesAndDemos,
  type OfflineCacheStatus,
} from "@/lib/offline-workout-cache";
import { UI, C } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";

export default function OfflineCacheScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<OfflineCacheStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [caching, setCaching] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    const s = await getOfflineCacheStatus();
    setStatus(s);
    setLoading(false);
  }

  async function handlePreCache() {
    setCaching(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const result = await preCacheAllCuesAndDemos();
    await loadStatus();
    setCaching(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  async function handleClearCache() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await clearOfflineCache();
    await loadStatus();
  }

  return (
    <ScreenContainer>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
          <MaterialIcons name="arrow-back" size={20} color={C.fg} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Offline Mode</Text>
          <Text style={s.headerSub}>Cache Workout Data</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.gold} />
          </View>
        ) : status ? (
          <>
            {/* Network Status */}
            <View style={[s.statusCard, { borderColor: status.isOnline ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }]}>
              <View style={s.statusRow}>
                <MaterialIcons
                  name={status.isOnline ? "wifi" : "wifi-off"}
                  size={24}
                  color={status.isOnline ? C.green : C.red}
                />
                <View>
                  <Text style={s.statusTitle}>{status.isOnline ? "Online" : "Offline"}</Text>
                  <Text style={s.statusDesc}>
                    {status.isOnline
                      ? "Connected to the internet"
                      : "Using cached data only"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Cache Status */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>CACHE STATUS</Text>
              <View style={s.infoCard}>
                <View style={s.infoRow}>
                  <MaterialIcons name="save" size={16} color={C.gold} />
                  <Text style={s.infoLabel}>Cached Plan</Text>
                  <Text style={s.infoValue}>{status.hasCachedPlan ? status.planName : "None"}</Text>
                </View>
                <View style={s.infoRow}>
                  <MaterialIcons name="fitness-center" size={16} color={C.blue} />
                  <Text style={s.infoLabel}>Exercises</Text>
                  <Text style={s.infoValue}>{status.exerciseCount}</Text>
                </View>
                <View style={s.infoRow}>
                  <MaterialIcons name="record-voice-over" size={16} color={C.gold2} />
                  <Text style={s.infoLabel}>Voice Cues</Text>
                  <Text style={s.infoValue}>{status.cuesCached} exercises</Text>
                </View>
                <View style={s.infoRow}>
                  <MaterialIcons name="play-circle" size={16} color={C.green} />
                  <Text style={s.infoLabel}>Exercise Demos</Text>
                  <Text style={s.infoValue}>{status.demosCached} demos</Text>
                </View>
                <View style={s.infoRow}>
                  <MaterialIcons name="storage" size={16} color={C.muted} />
                  <Text style={s.infoLabel}>Cache Size</Text>
                  <Text style={s.infoValue}>{status.cacheSize}</Text>
                </View>
                {status.cachedAt && (
                  <View style={s.infoRow}>
                    <MaterialIcons name="schedule" size={16} color={C.muted} />
                    <Text style={s.infoLabel}>Last Cached</Text>
                    <Text style={s.infoValue}>{new Date(status.cachedAt).toLocaleDateString()}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* How It Works */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>HOW IT WORKS</Text>
              <View style={s.infoCard}>
                <View style={s.howRow}>
                  <View style={s.howIcon}>
                    <MaterialIcons name="download" size={16} color={C.gold} />
                  </View>
                  <View style={s.howContent}>
                    <Text style={s.howTitle}>Auto-Cache on Start</Text>
                    <Text style={s.howDesc}>Your workout plan is automatically cached when you start a workout session.</Text>
                  </View>
                </View>
                <View style={s.howRow}>
                  <View style={s.howIcon}>
                    <MaterialIcons name="record-voice-over" size={16} color={C.gold} />
                  </View>
                  <View style={s.howContent}>
                    <Text style={s.howTitle}>Voice Cues Offline</Text>
                    <Text style={s.howDesc}>Form cues use text-to-speech which works offline on your device.</Text>
                  </View>
                </View>
                <View style={s.howRow}>
                  <View style={s.howIcon}>
                    <MaterialIcons name="cloud-off" size={16} color={C.gold} />
                  </View>
                  <View style={s.howContent}>
                    <Text style={s.howTitle}>No Internet Needed</Text>
                    <Text style={s.howDesc}>Once cached, your full workout plan is available without internet.</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>ACTIONS</Text>

              <TouchableOpacity
                style={[s.actionBtn, caching && s.actionBtnDisabled]}
                onPress={handlePreCache}
                disabled={caching}
              >
                {caching ? (
                  <ActivityIndicator size="small" color={C.gold} />
                ) : (
                  <MaterialIcons name="cached" size={18} color={C.gold} />
                )}
                <View>
                  <Text style={s.actionBtnText}>
                    {caching ? "Caching..." : "Pre-Cache All Cues & Demos"}
                  </Text>
                  <Text style={s.actionBtnDesc}>Download all voice cues and exercise demos</Text>
                </View>
              </TouchableOpacity>

              {status.hasCachedPlan && (
                <TouchableOpacity style={s.clearBtn} onPress={handleClearCache}>
                  <MaterialIcons name="delete-outline" size={18} color={C.red} />
                  <View>
                    <Text style={[s.actionBtnText, { color: C.red }]}>Clear Cache</Text>
                    <Text style={s.actionBtnDesc}>Remove all cached workout data</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: C.fg,
    fontFamily: "BebasNeue_400Regular",
    fontSize: 22,
  },
  headerSub: {
    color: C.muted,
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  statusCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusTitle: {
    color: C.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  statusDesc: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    color: C.fg,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    color: C.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  howRow: {
    flexDirection: "row",
    gap: 12,
  },
  howIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: UI.goldAlpha10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  howContent: {
    flex: 1,
  },
  howTitle: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  howDesc: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: C.fg,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  actionBtnDesc: {
    color: C.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(239,68,68,0.06)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
});
