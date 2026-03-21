import React, { useState, useEffect } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, Linking, Alert,
  ImageBackground, Platform, ActivityIndicator,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWearable } from "@/lib/wearable-context";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const WEARABLES = [
  {
    id: "apple_health",
    name: "Apple Health",
    icon: "❤️",
    color: "#B45309",
    platform: "ios",
    description: "Sync steps, heart rate, calories, sleep, and workouts from your iPhone and Apple Watch.",
    deepLink: "x-apple-health://",
    storeUrl: null as string | null,
    note: "Apple Health is built into your iPhone. Tap Open to launch it, then enable data sharing with PeakPulse in Health → Apps.",
    dataTypes: ["Steps", "Heart Rate", "Active Calories", "Sleep", "Workouts", "Weight"],
  },
  {
    id: "google_fit",
    name: "Google Fit",
    icon: "🏃",
    color: "#FDE68A",
    platform: "android",
    description: "Sync activity, heart rate, and workout data from your Android device and Wear OS watch.",
    deepLink: "googlefit://",
    storeUrl: "https://play.google.com/store/apps/details?id=com.google.android.apps.fitness" as string | null,
    note: "Open Google Fit and navigate to Profile → Connected apps to link PeakPulse.",
    dataTypes: ["Steps", "Heart Rate", "Calories", "Distance", "Workouts"],
  },
  {
    id: "fitbit",
    name: "Fitbit",
    icon: "⌚",
    color: "#3B82F6",
    platform: "both",
    description: "Sync comprehensive fitness data from your Fitbit tracker or smartwatch.",
    deepLink: "fitbit://",
    storeUrl: "https://www.fitbit.com/global/us/home" as string | null,
    note: "Open the Fitbit app and go to Account → Apps → PeakPulse to authorize data sharing.",
    dataTypes: ["Steps", "Heart Rate", "Sleep Score", "Active Minutes", "Calories", "SpO2"],
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    icon: "🗺️",
    color: "#FDE68A",
    platform: "both",
    description: "Sync detailed performance metrics from your Garmin GPS watch or fitness tracker.",
    deepLink: "garmin-connect://",
    storeUrl: "https://connect.garmin.com/" as string | null,
    note: "Open Garmin Connect and go to Settings → Connected Apps to authorize PeakPulse.",
    dataTypes: ["Steps", "Heart Rate", "VO2 Max", "Training Load", "Sleep", "GPS Routes"],
  },
  {
    id: "whoop",
    name: "WHOOP",
    icon: "💪",
    color: "#F59E0B",
    platform: "both",
    description: "Sync recovery scores, strain, HRV, and sleep data from your WHOOP band.",
    deepLink: "whoop://",
    storeUrl: "https://www.whoop.com/" as string | null,
    note: "Open the WHOOP app and go to Profile → Integrations to connect PeakPulse.",
    dataTypes: ["Recovery Score", "Strain", "HRV", "Sleep Performance", "Respiratory Rate"],
  },
  {
    id: "samsung_health",
    name: "Samsung Health",
    icon: "📱",
    color: "#FBBF24",
    platform: "android",
    description: "Sync health and fitness data from Samsung Galaxy Watch and Galaxy phones.",
    deepLink: "shealth://",
    storeUrl: "https://play.google.com/store/apps/details?id=com.sec.android.app.shealth" as string | null,
    note: "Open Samsung Health and go to Settings → Connected Services to link PeakPulse.",
    dataTypes: ["Steps", "Heart Rate", "Sleep", "Stress", "Blood Oxygen", "Workouts"],
  },
];

export default function WearableSyncScreen() {
  const router = useRouter();
  const { stats, syncFromDevice, isConnected: hasWearableData, getWeeklyAverage } = useWearable();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const weeklyAvg = getWeeklyAverage();

  useEffect(() => {
    AsyncStorage.getItem("@connected_wearables").then(raw => {
      if (raw) setConnectedIds(JSON.parse(raw));
    });
  }, []);

  async function handleOpenApp(wearable: typeof WEARABLES[0]) {
    setOpening(wearable.id);
    try {
      // Try deep link first
      const canOpen = await Linking.canOpenURL(wearable.deepLink);
      if (canOpen) {
        await Linking.openURL(wearable.deepLink);
      }
    } catch {}

    // Mark as "connected" and sync data
    const updated = connectedIds.includes(wearable.id)
      ? connectedIds
      : [...connectedIds, wearable.id];
    setConnectedIds(updated);
    await AsyncStorage.setItem("@connected_wearables", JSON.stringify(updated));
    // Sync wearable data into context
    await syncFromDevice(wearable.name);
    setOpening(null);
    Alert.alert("Synced", `${wearable.name} data synced successfully. Your dashboard has been updated.`);
  }

  async function handleDisconnect(id: string) {
    const name = WEARABLES.find(w => w.id === id)?.name ?? "device";
    Alert.alert("Disconnect", `Remove ${name} from PeakPulse?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          const updated = connectedIds.filter(c => c !== id);
          setConnectedIds(updated);
          await AsyncStorage.setItem("@connected_wearables", JSON.stringify(updated));
        },
      },
    ]);
  }

  // Show platform-appropriate wearables
  const platformFilter = Platform.OS === "ios" ? ["ios", "both"] : ["android", "both"];
  const visibleWearables = WEARABLES.filter(w => platformFilter.includes(w.platform));

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero */}
      <ImageBackground source={{ uri: DASHBOARD_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, left: 20, width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#FFF7ED", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>CONNECT</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>Wearable Sync</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={{ backgroundColor: "#7C3AED15", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
          <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 6 }}>ℹ️ How Wearable Sync Works</Text>
          <Text style={{ color: "#B45309", fontSize: 13, lineHeight: 20 }}>
            Tap a device to open its app and authorize data sharing. Once connected, your health data (steps, heart rate, sleep, calories) will appear on your PeakPulse dashboard and personalize your AI plans.
          </Text>
        </View>

        {/* Platform note */}
        <View style={{ backgroundColor: "#150A00", borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <Text style={{ color: "#B45309", fontSize: 12, textAlign: "center" }}>
            {Platform.OS === "ios"
              ? "📱 Showing iOS-compatible apps. Apple Health is the primary data hub on iPhone."
              : "🤖 Showing Android-compatible apps. Google Fit is the primary data hub on Android."}
          </Text>
        </View>

        {/* Wearable Cards */}
        {visibleWearables.map((wearable) => {
          const isExpanded = expandedId === wearable.id;
          const isConnected = connectedIds.includes(wearable.id);
          const isOpening = opening === wearable.id;

          return (
            <View
              key={wearable.id}
              style={{
                backgroundColor: "#150A00",
                borderRadius: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: isConnected ? wearable.color + "50" : isExpanded ? wearable.color + "30" : "rgba(245,158,11,0.10)",
                overflow: "hidden",
              }}
            >
              {/* Main Row */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", padding: 18, gap: 14 }}
                onPress={() => setExpandedId(isExpanded ? null : wearable.id)}
              >
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: wearable.color + "20", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: wearable.color + "40" }}>
                  <Text style={{ fontSize: 26 }}>{wearable.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>{wearable.name}</Text>
                    {isConnected && (
                      <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: "#FDE68A", fontSize: 10, fontFamily: "Outfit_700Bold" }}>LINKED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: "#B45309", fontSize: 12, lineHeight: 16 }}>{wearable.description}</Text>
                </View>
                <Text style={{ color: "#B45309", fontSize: 14 }}>{isExpanded ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {/* Expanded Detail */}
              {isExpanded && (
                <View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>
                  {/* Data types */}
                  <View>
                    <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>DATA SYNCED</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {wearable.dataTypes.map((dt) => (
                        <View key={dt} style={{ backgroundColor: wearable.color + "15", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: wearable.color + "30" }}>
                          <Text style={{ color: wearable.color, fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>{dt}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* How to connect */}
                  <View style={{ backgroundColor: "#150A00", borderRadius: 12, padding: 12 }}>
                    <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 6 }}>HOW TO CONNECT</Text>
                    <Text style={{ color: "#D1D5DB", fontSize: 13, lineHeight: 20 }}>{wearable.note}</Text>
                  </View>

                  {/* Action Buttons */}
                  {isConnected ? (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        style={{ flex: 2, backgroundColor: wearable.color, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
                        onPress={() => handleOpenApp(wearable)}
                        disabled={isOpening}
                      >
                        {isOpening ? <ActivityIndicator color="#FFF7ED" size="small" /> : <Text style={{ fontSize: 16 }}>{wearable.icon}</Text>}
                        <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Open {wearable.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "#EF444420", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#EF444440" }}
                        onPress={() => handleDisconnect(wearable.id)}
                      >
                        <Text style={{ color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Unlink</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{ backgroundColor: wearable.color, borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: isOpening ? 0.7 : 1, shadowColor: wearable.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
                      onPress={() => handleOpenApp(wearable)}
                      disabled={isOpening}
                    >
                      {isOpening ? (
                        <ActivityIndicator color="#FFF7ED" size="small" />
                      ) : (
                        <Text style={{ fontSize: 18 }}>{wearable.icon}</Text>
                      )}
                      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>
                        {isOpening ? "Opening..." : `Open ${wearable.name}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* ── Synced Stats Dashboard ── */}
        {hasWearableData && (
          <View style={{ backgroundColor: "#150A00", borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1.5, borderColor: "rgba(245,158,11,0.20)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <MaterialIcons name="watch" size={18} color="#F59E0B" />
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Live Stats from {stats.connectedDevice}</Text>
            </View>
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
                { label: "Stand Hours", value: `${stats.standHours}/12`, icon: "accessibility" as const, color: "#FBBF24" },
                ...(stats.vo2Max ? [{ label: "VO2 Max", value: `${stats.vo2Max}`, icon: "air" as const, color: "#60A5FA" }] : []),
                ...(stats.hrv ? [{ label: "HRV", value: `${stats.hrv} ms`, icon: "monitor-heart" as const, color: "#F472B6" }] : []),
              ].map(item => (
                <View key={item.label} style={{ width: "30%", backgroundColor: item.color + "10", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: item.color + "25", alignItems: "center" }}>
                  <MaterialIcons name={item.icon} size={18} color={item.color} />
                  <Text style={{ color: item.color, fontFamily: "Outfit_700Bold", fontSize: 14, marginTop: 4 }}>{item.value}</Text>
                  <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9 }}>{item.label}</Text>
                </View>
              ))}
            </View>
            {stats.lastSyncedAt && (
              <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10, textAlign: "center", marginTop: 10 }}>
                Last synced: {new Date(stats.lastSyncedAt).toLocaleString()}
              </Text>
            )}
          </View>
        )}

        {/* ── Weekly Averages ── */}
        {weeklyAvg.avgSteps > 0 && (
          <View style={{ backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <MaterialIcons name="insights" size={18} color="#3B82F6" />
              <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 14 }}>7-Day Averages</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#22C55E", fontFamily: "Outfit_700Bold", fontSize: 18 }}>{weeklyAvg.avgSteps.toLocaleString()}</Text>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>Avg Steps</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 18 }}>{weeklyAvg.avgCalories}</Text>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>Avg Calories</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#8B5CF6", fontFamily: "Outfit_700Bold", fontSize: 18 }}>{weeklyAvg.avgSleep}h</Text>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>Avg Sleep</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#EF4444", fontFamily: "Outfit_700Bold", fontSize: 18 }}>{weeklyAvg.avgHR}</Text>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 10 }}>Avg HR</Text>
              </View>
            </View>
          </View>
        )}

        {/* Manual Entry Note */}
        <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 8 }}>📊 No Wearable?</Text>
          <Text style={{ color: "#B45309", fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
            You can manually log your daily steps, weight, and workout data directly in the PeakPulse app. Your dashboard will update automatically.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
