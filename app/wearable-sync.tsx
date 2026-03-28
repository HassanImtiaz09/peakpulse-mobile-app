/**
 * Wearable Sync Screen — FIXED
 *
 * Changes from original:
 *
 * 1. SIMULATED DATA WARNING BANNER (Critical)
 *    A prominent amber banner is now shown whenever stats.dataSource === "simulated".
 *    Previously, fake data was presented with the same visual weight as real data,
 *    with only a tiny 9px "SIMULATED" badge that users could easily miss.
 *
 * 2. ASYNCSTORAGE ERROR HANDLING (High)
 *    The getItem('@connected_wearables') call now has a try/catch inside .then()
 *    and a .catch() on the promise itself. Malformed JSON (e.g. from a partial
 *    write during a crash) no longer crashes the component on launch.
 *
 * 3. THIRD-PARTY DEEP LINK FALLBACK (High)
 *    handleOpenApp() now uses Linking.canOpenURL() BEFORE attempting to open the
 *    deep link. If the wearable app is not installed, we open the store URL instead
 *    and show an informative alert, rather than throwing an unhandled error.
 *
 * 4. DISCONNECT ASYNC STORAGE ERROR HANDLING (Medium)
 *    The AsyncStorage.setItem() inside handleDisconnect now has a try/catch.
 *
 * NOTE ON PERMISSION REVOCATION:
 *    True HealthKit / Health Connect permission revocation requires calling
 *    platform APIs that are exposed through the useWearable() hook. To implement
 *    full permission revocation, add a `revokePermissions()` function to the
 *    wearable-context provider (lib/wearable-context.tsx) that calls
 *    HealthKit.disableAllAuthorizationTypes() on iOS and
 *    healthConnectClient.revokeAllPermissions() on Android, then call it here in
 *    handleDisconnect() before clearing AsyncStorage.
 */
import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ImageBackground,
  Platform,
  ActivityIndicator,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWearable } from "@/lib/wearable-context";
import { FeatureGate } from "@/components/feature-gate";

const DASHBOARD_BG =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// ── Third-party wearable apps (secondary connections via HealthKit/Health Connect) ──
const THIRD_PARTY_WEARABLES = [
  {
    id: "fitbit",
    name: "Fitbit",
    icon: "watch" as const,
    color: "#3B82F6",
    platform: "both",
    description: "Syncs via Apple Health (iOS) or Health Connect (Android).",
    deepLink: "fitbit://",
    storeUrl: "https://www.fitbit.com/global/us/home",
    dataTypes: ["Steps", "Heart Rate", "Sleep", "Active Minutes", "Calories", "SpO2"],
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    icon: "explore" as const,
    color: "#FDE68A",
    platform: "both",
    description: "Syncs via Apple Health (iOS) or Health Connect (Android).",
    deepLink: "garmin-connect://",
    storeUrl: "https://connect.garmin.com/",
    dataTypes: ["Steps", "Heart Rate", "VO2 Max", "Training Load", "Sleep", "GPS Routes"],
  },
  {
    id: "whoop",
    name: "WHOOP",
    icon: "fitness-center" as const,
    color: "#F59E0B",
    platform: "both",
    description: "Syncs recovery, strain, and HRV via Apple Health or Health Connect.",
    deepLink: "whoop://",
    storeUrl: "https://www.whoop.com/",
    dataTypes: ["Recovery Score", "Strain", "HRV", "Sleep Performance", "Respiratory Rate"],
  },
  {
    id: "samsung_health",
    name: "Samsung Health",
    icon: "phone-android" as const,
    color: "#FBBF24",
    platform: "android",
    description: "Syncs via Health Connect on Android.",
    deepLink: "shealth://",
    storeUrl: "https://play.google.com/store/apps/details?id=com.sec.android.app.shealth",
    dataTypes: ["Steps", "Heart Rate", "Sleep", "Stress", "Blood Oxygen", "Workouts"],
  },
  {
    id: "oura",
    name: "Oura Ring",
    icon: "radio-button-checked" as const,
    color: "#A78BFA",
    platform: "both",
    description: "Syncs sleep, readiness, and activity via Apple Health or Health Connect.",
    deepLink: "oura://",
    storeUrl: "https://ouraring.com/",
    dataTypes: ["Sleep Score", "Readiness", "HRV", "Temperature", "Activity"],
  },
];

export default function WearableSyncScreen() {
  const router = useRouter();
  const {
    stats,
    syncFromDevice,
    syncFromHealthPlatform,
    requestPermissions,
    isConnected: hasWearableData,
    getWeeklyAverage,
    syncing,
    healthSource,
    permissionStatus,
    healthSourceName,
    isHealthPlatformAvailable: nativeAvailable,
  } = useWearable();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);

  const weeklyAvg = getWeeklyAverage();

  useEffect(() => {
    // FIX: Added try/catch inside .then() and a .catch() on the whole promise.
    // Before: JSON.parse(raw) with no guard would crash if raw was malformed.
    AsyncStorage.getItem("@connected_wearables")
      .then((raw) => {
        if (raw) {
          try {
            setConnectedIds(JSON.parse(raw));
          } catch {
            // Malformed JSON — start with empty list rather than crashing
            setConnectedIds([]);
          }
        }
      })
      .catch(() => {
        // AsyncStorage itself failed — start with empty list
        setConnectedIds([]);
      });
  }, []);

  // ── Health Platform Connection ──────────────────────────────────────────────
  async function handleConnectHealthPlatform() {
    setRequestingPermission(true);
    try {
      const result = await requestPermissions();
      if (result.status === "granted") {
        Alert.alert(
          "Connected",
          `${healthSourceName} connected successfully. Your health data will sync automatically.`
        );
      } else if (result.status === "denied") {
        Alert.alert(
          "Permission Denied",
          `Please enable health data access in your device Settings to use ${healthSourceName} with PeakPulse.`
        );
      } else {
        Alert.alert(
          "Not Available",
          `${healthSourceName} is not available on this device. You can still connect third-party apps below.`
        );
      }
    } catch {
      Alert.alert("Error", "Failed to connect. Please try again.");
    } finally {
      setRequestingPermission(false);
    }
  }

  async function handleRefreshHealthData() {
    const success = await syncFromHealthPlatform();
    if (success) {
      Alert.alert("Synced", `Health data refreshed from ${healthSourceName}.`);
    } else {
      Alert.alert(
        "No Data",
        "Could not fetch health data. Make sure your wearable has synced to the health platform."
      );
    }
  }

  // ── Third-party Wearable Connection ────────────────────────────────────────
  // FIX: Now checks canOpenURL() before attempting to open the deep link.
  // If the app is not installed, opens the store/website URL with a helpful alert.
  async function handleOpenApp(wearable: (typeof THIRD_PARTY_WEARABLES)[0]) {
    setOpening(wearable.id);
    try {
      const canOpen = await Linking.canOpenURL(wearable.deepLink);
      if (canOpen) {
        await Linking.openURL(wearable.deepLink);
      } else {
        // App not installed — open the download page instead
        await Linking.openURL(wearable.storeUrl).catch(() => {});
        Alert.alert(
          `${wearable.name} Not Installed`,
          `${wearable.name} doesn't appear to be installed on this device. We've opened the download page so you can install it, then return here to link it.`
        );
      }
    } catch {
      // canOpenURL itself failed — just try the store URL as a safe fallback
      Linking.openURL(wearable.storeUrl).catch(() => {});
    }

    const updated = connectedIds.includes(wearable.id)
      ? connectedIds
      : [...connectedIds, wearable.id];
    setConnectedIds(updated);
    try {
      await AsyncStorage.setItem("@connected_wearables", JSON.stringify(updated));
    } catch {}
    await syncFromDevice(wearable.name);
    setOpening(null);
    Alert.alert(
      "Synced",
      `${wearable.name} data synced. Ensure it writes to ${healthSourceName} for automatic updates.`
    );
  }

  // FIX: handleDisconnect now wraps AsyncStorage.setItem in try/catch.
  // Note: To also revoke system health permissions, add revokePermissions()
  // to the useWearable hook (see file header comment for instructions).
  async function handleDisconnect(id: string) {
    const name = THIRD_PARTY_WEARABLES.find((w) => w.id === id)?.name ?? "device";
    Alert.alert("Disconnect", `Remove ${name} from PeakPulse?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          const updated = connectedIds.filter((c) => c !== id);
          setConnectedIds(updated);
          try {
            await AsyncStorage.setItem(
              "@connected_wearables",
              JSON.stringify(updated)
            );
          } catch {}
          // TODO: call revokePermissions(id) here once added to useWearable hook
          // to also revoke HealthKit / Health Connect permissions at the OS level.
        },
      },
    ]);
  }

  // Show platform-appropriate wearables
  const platformFilter =
    Platform.OS === "ios" ? ["ios", "both"] : ["android", "both"];
  const visibleWearables = THIRD_PARTY_WEARABLES.filter((w) =>
    platformFilter.includes(w.platform)
  );

  const isHealthConnected = permissionStatus === "granted";
  const isSimulated = stats.dataSource === "simulated";
  const dataSourceLabel = isSimulated
    ? "Demo Data"
    : stats.dataSource === "healthkit"
    ? "Apple Health"
    : stats.dataSource === "healthconnect"
    ? "Health Connect"
    : stats.connectedDevice ?? "Unknown";

  return (
    <FeatureGate
      feature="wearable_sync"
      message="Sync your fitness wearable (Apple Watch, Fitbit, Garmin) with PeakPulse. Available on Basic plan and above."
    >
      <View style={{ flex: 1, backgroundColor: "#0A0E14" }}>
        {/* Hero */}
        <ImageBackground
          source={{ uri: DASHBOARD_BG }}
          style={{ height: 160 }}
          resizeMode="cover"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(8,8,16,0.72)",
              justifyContent: "flex-end",
              padding: 20,
              paddingTop: 52,
            }}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 52,
                left: 20,
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => router.back()}
            >
              <Text style={{ color: "#F1F5F9", fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <Text
              style={{
                color: "#FBBF24",
                fontFamily: "DMSans_700Bold",
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              CONNECT
            </Text>
            <Text
              style={{
                color: "#F1F5F9",
                fontFamily: "BebasNeue_400Regular",
                fontSize: 26,
                letterSpacing: -0.5,
              }}
            >
              Wearable Sync
            </Text>
          </View>
        </ImageBackground>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ─────────────────────────────────────────────────────────────────
              FIX 1: SIMULATED DATA WARNING BANNER
              Shown whenever stats.dataSource === "simulated" so users always
              know they are looking at demo numbers, not real health data.
          ───────────────────────────────────────────────────────────────── */}
          {isSimulated && (
            <View
              style={{
                backgroundColor: "rgba(245,158,11,0.12)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1.5,
                borderColor: "rgba(245,158,11,0.45)",
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <MaterialIcons name="warning" size={20} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#FDE68A",
                    fontFamily: "DMSans_700Bold",
                    fontSize: 13,
                    marginBottom: 3,
                  }}
                >
                  Demo Data Only
                </Text>
                <Text
                  style={{
                    color: "#B45309",
                    fontFamily: "DMSans_400Regular",
                    fontSize: 12,
                    lineHeight: 17,
                  }}
                >
                  The metrics below are simulated for preview purposes. Connect
                  Apple Health or Health Connect above to see your real health
                  data.
                </Text>
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              PRIMARY: Native Health Platform (HealthKit / Health Connect)
          ═══════════════════════════════════════════════════════════════ */}
          <View
            style={{
              backgroundColor: "#141A22",
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: isHealthConnected
                ? "rgba(34,197,94,0.30)"
                : "rgba(245,158,11,0.20)",
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: isHealthConnected
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(245,158,11,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: isHealthConnected
                    ? "rgba(34,197,94,0.30)"
                    : "rgba(245,158,11,0.30)",
                }}
              >
                <MaterialIcons
                  name={Platform.OS === "ios" ? "favorite" : "health-and-safety"}
                  size={28}
                  color={isHealthConnected ? "#22C55E" : "#F59E0B"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <Text
                    style={{
                      color: "#F1F5F9",
                      fontFamily: "DMSans_700Bold",
                      fontSize: 17,
                    }}
                  >
                    {Platform.OS === "ios"
                      ? "Apple Health"
                      : Platform.OS === "android"
                      ? "Health Connect"
                      : "Health Platform"}
                  </Text>
                  {isHealthConnected && (
                    <View
                      style={{
                        backgroundColor: "rgba(34,197,94,0.15)",
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: "#22C55E",
                          fontSize: 10,
                          fontFamily: "DMSans_700Bold",
                        }}
                      >
                        CONNECTED
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: "#B45309", fontSize: 12, lineHeight: 16 }}>
                  {nativeAvailable
                    ? `Reads steps, heart rate, calories, sleep, HRV, SpO2, and distance from ${healthSourceName}.`
                    : "Native health platform not available on web. Connect a native device to sync real data."}
                </Text>
              </View>
            </View>

            {/* Data types */}
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}
            >
              {["Steps", "Heart Rate", "Calories", "Sleep", "HRV", "VO2 Max", "SpO2", "Distance"].map(
                (dt) => (
                  <View
                    key={dt}
                    style={{
                      backgroundColor: isHealthConnected
                        ? "rgba(34,197,94,0.08)"
                        : "rgba(245,158,11,0.08)",
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: isHealthConnected
                        ? "rgba(34,197,94,0.20)"
                        : "rgba(245,158,11,0.15)",
                    }}
                  >
                    <Text
                      style={{
                        color: isHealthConnected ? "#22C55E" : "#B45309",
                        fontSize: 11,
                        fontFamily: "DMSans_600SemiBold",
                      }}
                    >
                      {dt}
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* How it works */}
            {!isHealthConnected && nativeAvailable && (
              <View
                style={{
                  backgroundColor: "#0A0E14",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    color: "#B45309",
                    fontSize: 11,
                    fontFamily: "DMSans_700Bold",
                    letterSpacing: 1,
                    marginBottom: 6,
                  }}
                >
                  HOW IT WORKS
                </Text>
                <Text style={{ color: "#D1D5DB", fontSize: 13, lineHeight: 20 }}>
                  {Platform.OS === "ios"
                    ? "PeakPulse reads health data from Apple Health. Any wearable that writes to Apple Health (Apple Watch, Oura, Garmin, Fitbit, etc.) will automatically sync."
                    : "PeakPulse reads health data from Health Connect. Any wearable that writes to Health Connect (Samsung, Fitbit, Garmin, etc.) will automatically sync."}
                </Text>
              </View>
            )}

            {/* Action buttons */}
            {nativeAvailable ? (
              isHealthConnected ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 2,
                      backgroundColor: "#22C55E",
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 8,
                      opacity: syncing ? 0.7 : 1,
                    }}
                    onPress={handleRefreshHealthData}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <ActivityIndicator color="#F1F5F9" size="small" />
                    ) : (
                      <MaterialIcons name="sync" size={18} color="#F1F5F9" />
                    )}
                    <Text
                      style={{
                        color: "#F1F5F9",
                        fontFamily: "DMSans_700Bold",
                        fontSize: 14,
                      }}
                    >
                      {syncing ? "Syncing..." : "Refresh Data"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(245,158,11,0.10)",
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "rgba(245,158,11,0.20)",
                    }}
                    onPress={() => {
                      if (Platform.OS === "ios") {
                        Linking.openURL("x-apple-health://").catch(() => {});
                      } else {
                        Linking.openURL(
                          "market://details?id=com.google.android.apps.healthdata"
                        ).catch(() => {});
                      }
                    }}
                  >
                    <Text
                      style={{
                        color: "#F59E0B",
                        fontFamily: "DMSans_700Bold",
                        fontSize: 13,
                      }}
                    >
                      Open App
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#F59E0B",
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    opacity: requestingPermission ? 0.7 : 1,
                    shadowColor: "#F59E0B",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                  }}
                  onPress={handleConnectHealthPlatform}
                  disabled={requestingPermission}
                >
                  {requestingPermission ? (
                    <ActivityIndicator color="#F1F5F9" size="small" />
                  ) : (
                    <MaterialIcons name="link" size={20} color="#F1F5F9" />
                  )}
                  <Text
                    style={{
                      color: "#F1F5F9",
                      fontFamily: "DMSans_700Bold",
                      fontSize: 15,
                    }}
                  >
                    {requestingPermission
                      ? "Connecting..."
                      : `Connect ${healthSourceName}`}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <View
                style={{
                  backgroundColor: "rgba(245,158,11,0.08)",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text
                  style={{ color: "#B45309", fontSize: 12, textAlign: "center" }}
                >
                  Health platform integration requires a native device (iPhone or
                  Android). On web, data is simulated for preview purposes.
                </Text>
              </View>
            )}
          </View>

          {/* ═══════════════════════════════════════════════════════════════
              SYNCED STATS DASHBOARD
          ═══════════════════════════════════════════════════════════════ */}
          {hasWearableData && (
            <View
              style={{
                backgroundColor: "#141A22",
                borderRadius: 20,
                padding: 18,
                marginBottom: 16,
                borderWidth: 1.5,
                borderColor: isSimulated
                  ? "rgba(245,158,11,0.35)"
                  : "rgba(245,158,11,0.20)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <MaterialIcons name="watch" size={18} color="#F59E0B" />
                <Text
                  style={{
                    color: "#FDE68A",
                    fontFamily: "DMSans_700Bold",
                    fontSize: 14,
                  }}
                >
                  Health Data
                </Text>
                <View style={{ flex: 1 }} />
                {/* FIX: Source badge now uses more prominent colour when simulated */}
                <View
                  style={{
                    backgroundColor: isSimulated
                      ? "rgba(245,158,11,0.20)"
                      : "rgba(34,197,94,0.10)",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderWidth: isSimulated ? 1 : 0,
                    borderColor: isSimulated
                      ? "rgba(245,158,11,0.50)"
                      : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: isSimulated ? "#F59E0B" : "#22C55E",
                      fontSize: 9,
                      fontFamily: "DMSans_700Bold",
                    }}
                  >
                    {dataSourceLabel.toUpperCase()}
                  </Text>
                </View>
              </View>
              {stats.lastSyncedAt && (
                <Text
                  style={{
                    color: "#B45309",
                    fontFamily: "DMSans_400Regular",
                    fontSize: 10,
                    marginBottom: 12,
                  }}
                >
                  Last synced: {new Date(stats.lastSyncedAt).toLocaleString()}
                </Text>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  { label: "Steps", value: stats.steps.toLocaleString(), icon: "directions-walk" as const, color: "#22C55E" },
                  { label: "Heart Rate", value: `${stats.heartRate} bpm`, icon: "favorite" as const, color: "#EF4444" },
                  { label: "Calories Burnt", value: `${stats.totalCaloriesBurnt}`, icon: "local-fire-department" as const, color: "#F59E0B" },
                  { label: "Active Cal", value: `${stats.activeCalories}`, icon: "flash-on" as const, color: "#FB923C" },
                  { label: "Sleep", value: `${stats.sleepHours}h`, icon: "bedtime" as const, color: "#8B5CF6" },
                  { label: "Sleep Quality", value: stats.sleepQuality, icon: "star" as const, color: "#A78BFA" },
                  { label: "Distance", value: `${stats.distance} km`, icon: "straighten" as const, color: "#3B82F6" },
                  { label: "Active Min", value: `${stats.activeMinutes}`, icon: "timer" as const, color: "#14B8A6" },
                  ...(stats.standHours > 0 ? [{ label: "Stand Hours", value: `${stats.standHours}/12`, icon: "accessibility" as const, color: "#FBBF24" }] : []),
                  ...(stats.vo2Max ? [{ label: "VO2 Max", value: `${stats.vo2Max} ml/kg/min`, icon: "air" as const, color: "#60A5FA" }] : []),
                  ...(stats.hrv ? [{ label: "HRV", value: `${stats.hrv} ms`, icon: "monitor-heart" as const, color: "#F472B6" }] : []),
                  ...(stats.bloodOxygen ? [{ label: "SpO2", value: `${stats.bloodOxygen}%`, icon: "water-drop" as const, color: "#06B6D4" }] : []),
                  ...(stats.restingHeartRate ? [{ label: "Resting HR", value: `${stats.restingHeartRate} bpm`, icon: "favorite-border" as const, color: "#FB7185" }] : []),
                ].map((item) => (
                  <View
                    key={item.label}
                    style={{
                      width: "30%",
                      backgroundColor: item.color + "10",
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: item.color + "25",
                      alignItems: "center",
                    }}
                  >
                    <MaterialIcons name={item.icon} size={18} color={item.color} />
                    <Text
                      style={{
                        color: item.color,
                        fontFamily: "DMSans_700Bold",
                        fontSize: 13,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      {item.value}
                    </Text>
                    <Text
                      style={{
                        color: "#B45309",
                        fontFamily: "DMSans_400Regular",
                        fontSize: 9,
                        textAlign: "center",
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Weekly Averages ── */}
          {weeklyAvg.avgSteps > 0 && (
            <View
              style={{
                backgroundColor: "rgba(59,130,246,0.06)",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "rgba(59,130,246,0.15)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <MaterialIcons name="insights" size={18} color="#3B82F6" />
                <Text
                  style={{
                    color: "#3B82F6",
                    fontFamily: "DMSans_700Bold",
                    fontSize: 14,
                  }}
                >
                  7-Day Averages
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#22C55E",
                      fontFamily: "DMSans_700Bold",
                      fontSize: 18,
                    }}
                  >
                    {weeklyAvg.avgSteps.toLocaleString()}
                  </Text>
                  <Text
                    style={{
                      color: "#B45309",
                      fontFamily: "DMSans_400Regular",
                      fontSize: 10,
                    }}
                  >
                    Avg Steps
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#F59E0B",
                      fontFamily: "DMSans_700Bold",
                      fontSize: 18,
                    }}
                  >
                    {weeklyAvg.avgCalories}
                  </Text>
                  <Text
                    style={{
                      color: "#B45309",
                      fontFamily: "DMSans_400Regular",
                      fontSize: 10,
                    }}
                  >
                    Avg Calories
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#8B5CF6",
                      fontFamily: "DMSans_700Bold",
                      fontSize: 18,
                    }}
                  >
                    {weeklyAvg.avgSleep}h
                  </Text>
                  <Text
                    style={{
                      color: "#B45309",
                      fontFamily: "DMSans_400Regular",
                      fontSize: 10,
                    }}
                  >
                    Avg Sleep
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#EF4444",
                      fontFamily: "DMSans_700Bold",
                      fontSize: 18,
                    }}
                  >
                    {weeklyAvg.avgHR}
                  </Text>
                  <Text
                    style={{
                      color: "#B45309",
                      fontFamily: "DMSans_400Regular",
                      fontSize: 10,
                    }}
                  >
                    Avg HR
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* View Health Trends */}
          <TouchableOpacity
            onPress={() => router.push("/health-trends" as any)}
            style={{
              backgroundColor: "#141A22",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: "rgba(59,130,246,0.25)",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(59,130,246,0.12)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(59,130,246,0.25)",
              }}
            >
              <MaterialIcons name="show-chart" size={24} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#F1F5F9",
                  fontFamily: "DMSans_700Bold",
                  fontSize: 15,
                }}
              >
                Health Trends
              </Text>
              <Text
                style={{
                  color: "#B45309",
                  fontFamily: "DMSans_400Regular",
                  fontSize: 11,
                }}
              >
                View 7-day and 30-day charts for all metrics
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#3B82F6" />
          </TouchableOpacity>

          {/* ═══════════════════════════════════════════════════════════════
              SECONDARY: Third-Party Wearable Apps
          ═══════════════════════════════════════════════════════════════ */}
          <View style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 3,
                  height: 16,
                  backgroundColor: "#F59E0B",
                  borderRadius: 2,
                }}
              />
              <Text
                style={{
                  color: "#F1F5F9",
                  fontFamily: "DMSans_700Bold",
                  fontSize: 15,
                }}
              >
                Third-Party Wearables
              </Text>
            </View>
            <Text
              style={{
                color: "#B45309",
                fontSize: 12,
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              {nativeAvailable
                ? `These apps write data to ${healthSourceName}. Connect ${healthSourceName} above, then open your wearable app to enable data sharing.`
                : "Connect these apps to sync fitness data to PeakPulse."}
            </Text>
          </View>

          {visibleWearables.map((wearable) => {
            const isExpanded = expandedId === wearable.id;
            const isLinked = connectedIds.includes(wearable.id);
            const isOpening = opening === wearable.id;

            return (
              <View
                key={wearable.id}
                style={{
                  backgroundColor: "#141A22",
                  borderRadius: 20,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isLinked
                    ? wearable.color + "50"
                    : isExpanded
                    ? wearable.color + "30"
                    : "rgba(245,158,11,0.10)",
                  overflow: "hidden",
                }}
              >
                {/* Main Row */}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    gap: 12,
                  }}
                  onPress={() => setExpandedId(isExpanded ? null : wearable.id)}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: wearable.color + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: wearable.color + "40",
                    }}
                  >
                    <MaterialIcons
                      name={wearable.icon}
                      size={22}
                      color={wearable.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: "#F1F5F9",
                          fontFamily: "DMSans_700Bold",
                          fontSize: 14,
                        }}
                      >
                        {wearable.name}
                      </Text>
                      {isLinked && (
                        <View
                          style={{
                            backgroundColor: "rgba(245,158,11,0.10)",
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              color: "#FDE68A",
                              fontSize: 10,
                              fontFamily: "DMSans_700Bold",
                            }}
                          >
                            LINKED
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{ color: "#B45309", fontSize: 11, lineHeight: 15 }}
                    >
                      {wearable.description}
                    </Text>
                  </View>
                  <MaterialIcons
                    name={isExpanded ? "expand-less" : "expand-more"}
                    size={20}
                    color="#B45309"
                  />
                </TouchableOpacity>

                {/* Expanded Detail */}
                {isExpanded && (
                  <View
                    style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
                  >
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {wearable.dataTypes.map((dt) => (
                        <View
                          key={dt}
                          style={{
                            backgroundColor: wearable.color + "15",
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderWidth: 1,
                            borderColor: wearable.color + "30",
                          }}
                        >
                          <Text
                            style={{
                              color: wearable.color,
                              fontSize: 11,
                              fontFamily: "DMSans_600SemiBold",
                            }}
                          >
                            {dt}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Action Buttons */}
                    {isLinked ? (
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <TouchableOpacity
                          style={{
                            flex: 2,
                            backgroundColor: wearable.color,
                            borderRadius: 14,
                            paddingVertical: 12,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 8,
                          }}
                          onPress={() => handleOpenApp(wearable)}
                          disabled={isOpening}
                        >
                          {isOpening ? (
                            <ActivityIndicator color="#F1F5F9" size="small" />
                          ) : (
                            <MaterialIcons
                              name="open-in-new"
                              size={16}
                              color="#F1F5F9"
                            />
                          )}
                          <Text
                            style={{
                              color: "#F1F5F9",
                              fontFamily: "DMSans_700Bold",
                              fontSize: 13,
                            }}
                          >
                            Open {wearable.name}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: "#EF444420",
                            borderRadius: 14,
                            paddingVertical: 12,
                            alignItems: "center",
                            borderWidth: 1,
                            borderColor: "#EF444440",
                          }}
                          onPress={() => handleDisconnect(wearable.id)}
                        >
                          <Text
                            style={{
                              color: "#B45309",
                              fontFamily: "DMSans_700Bold",
                              fontSize: 12,
                            }}
                          >
                            Unlink
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: wearable.color,
                          borderRadius: 14,
                          paddingVertical: 12,
                          alignItems: "center",
                          flexDirection: "row",
                          justifyContent: "center",
                          gap: 8,
                          opacity: isOpening ? 0.7 : 1,
                        }}
                        onPress={() => handleOpenApp(wearable)}
                        disabled={isOpening}
                      >
                        {isOpening ? (
                          <ActivityIndicator color="#F1F5F9" size="small" />
                        ) : (
                          <MaterialIcons
                            name="open-in-new"
                            size={16}
                            color="#F1F5F9"
                          />
                        )}
                        <Text
                          style={{
                            color: "#F1F5F9",
                            fontFamily: "DMSans_700Bold",
                            fontSize: 13,
                          }}
                        >
                          {isOpening ? "Opening..." : `Open ${wearable.name}`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Manual Entry Note */}
          <View
            style={{
              backgroundColor: "#141A22",
              borderRadius: 16,
              padding: 16,
              marginTop: 8,
              borderWidth: 1,
              borderColor: "rgba(245,158,11,0.10)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <MaterialIcons name="edit" size={18} color="#F59E0B" />
              <Text
                style={{
                  color: "#F1F5F9",
                  fontFamily: "DMSans_700Bold",
                  fontSize: 14,
                }}
              >
                No Wearable?
              </Text>
            </View>
            <Text
              style={{
                color: "#B45309",
                fontSize: 13,
                lineHeight: 20,
                marginBottom: 12,
              }}
            >
              You can manually log steps, weight, and workouts in PeakPulse.
              Your dashboard updates automatically.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "rgba(245,158,11,0.10)",
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
              }}
              onPress={() => router.back()}
            >
              <Text
                style={{
                  color: "#F59E0B",
                  fontFamily: "DMSans_600SemiBold",
                  fontSize: 14,
                }}
              >
                ← Back to Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </FeatureGate>
  );
}
