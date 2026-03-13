import React, { useState, useEffect } from "react";
import {
  Text, View, TouchableOpacity, ScrollView, Linking, Alert,
  ImageBackground, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const WEARABLES = [
  {
    id: "apple_health",
    name: "Apple Health",
    icon: "❤️",
    color: "#92400E",
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [opening, setOpening] = useState<string | null>(null);

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
        // Mark as "connected" after user opens the app
        const updated = connectedIds.includes(wearable.id)
          ? connectedIds
          : [...connectedIds, wearable.id];
        setConnectedIds(updated);
        await AsyncStorage.setItem("@connected_wearables", JSON.stringify(updated));
        setOpening(null);
        return;
      }
    } catch {}

    setOpening(null);

    // Deep link not available — show instructions
    Alert.alert(
      `Open ${wearable.name}`,
      `${wearable.note}\n\nMake sure the ${wearable.name} app is installed on your device.`,
      [
        { text: "Cancel", style: "cancel" },
        ...(wearable.storeUrl
          ? [{ text: "Get the App", onPress: () => Linking.openURL(wearable.storeUrl!) }]
          : []),
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "ios") {
              Linking.openURL("app-settings:");
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
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
          <Text style={{ color: "#92400E", fontSize: 13, lineHeight: 20 }}>
            Tap a device to open its app and authorize data sharing. Once connected, your health data (steps, heart rate, sleep, calories) will appear on your PeakPulse dashboard and personalize your AI plans.
          </Text>
        </View>

        {/* Platform note */}
        <View style={{ backgroundColor: "#150A00", borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <Text style={{ color: "#78350F", fontSize: 12, textAlign: "center" }}>
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
                  <Text style={{ color: "#92400E", fontSize: 12, lineHeight: 16 }}>{wearable.description}</Text>
                </View>
                <Text style={{ color: "#92400E", fontSize: 14 }}>{isExpanded ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {/* Expanded Detail */}
              {isExpanded && (
                <View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 12 }}>
                  {/* Data types */}
                  <View>
                    <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>DATA SYNCED</Text>
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
                    <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 6 }}>HOW TO CONNECT</Text>
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
                        <Text style={{ color: "#92400E", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Unlink</Text>
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

        {/* Manual Entry Note */}
        <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 8 }}>📊 No Wearable?</Text>
          <Text style={{ color: "#92400E", fontSize: 13, lineHeight: 20, marginBottom: 12 }}>
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
