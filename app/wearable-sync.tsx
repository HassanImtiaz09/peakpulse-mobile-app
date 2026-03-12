import React, { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WEARABLES = [
  { key: "apple_health", name: "Apple Health", icon: "🍎", color: "#EF4444", description: "Sync steps, heart rate, calories & sleep from Apple Health" },
  { key: "fitbit", name: "Fitbit", icon: "⌚", color: "#22C55E", description: "Sync activity, sleep, and heart rate from your Fitbit" },
  { key: "garmin", name: "Garmin Connect", icon: "🏃", color: "#3B82F6", description: "Sync workouts, GPS data, and health metrics from Garmin" },
  { key: "google_fit", name: "Google Fit", icon: "🤖", color: "#F97316", description: "Sync activity and health data from Google Fit" },
  { key: "whoop", name: "WHOOP", icon: "💪", color: "#A855F7", description: "Sync recovery, strain, and sleep from WHOOP" },
  { key: "samsung_health", name: "Samsung Health", icon: "📱", color: "#FBBF24", description: "Sync steps, heart rate, and workouts from Samsung Health" },
];

const DEMO_DATA = {
  steps: 8432,
  calories: 2150,
  heartRate: 68,
  sleep: 7.5,
  activeMinutes: 45,
  distance: 6.2,
  hrv: 52,
  recovery: 78,
};

export default function WearableSyncScreen() {
  const router = useRouter();
  const [connectedDevices, setConnectedDevices] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [wearableData, setWearableData] = useState<any>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const connected = await AsyncStorage.getItem("connected_wearables");
      if (connected) setConnectedDevices(JSON.parse(connected));
      const data = await AsyncStorage.getItem("wearable_data");
      if (data) setWearableData(JSON.parse(data));
      const sync = await AsyncStorage.getItem("last_sync");
      if (sync) setLastSync(sync);
    } catch {}
  }

  async function connectDevice(key: string) {
    setSyncing(key);
    // Simulate OAuth / connection flow
    await new Promise(r => setTimeout(r, 2000));
    const newConnected = [...connectedDevices, key];
    setConnectedDevices(newConnected);
    await AsyncStorage.setItem("connected_wearables", JSON.stringify(newConnected));
    // Simulate syncing data
    const now = new Date().toISOString();
    await AsyncStorage.setItem("wearable_data", JSON.stringify(DEMO_DATA));
    await AsyncStorage.setItem("last_sync", now);
    setWearableData(DEMO_DATA);
    setLastSync(now);
    setSyncing(null);
    Alert.alert("Connected! ✓", `${WEARABLES.find(w => w.key === key)?.name} connected and data synced.`);
  }

  async function disconnectDevice(key: string) {
    Alert.alert(
      "Disconnect Device",
      `Are you sure you want to disconnect ${WEARABLES.find(w => w.key === key)?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            const newConnected = connectedDevices.filter(d => d !== key);
            setConnectedDevices(newConnected);
            await AsyncStorage.setItem("connected_wearables", JSON.stringify(newConnected));
            if (newConnected.length === 0) {
              setWearableData(null);
              await AsyncStorage.removeItem("wearable_data");
            }
          },
        },
      ]
    );
  }

  async function syncNow() {
    if (connectedDevices.length === 0) return;
    setSyncing("all");
    await new Promise(r => setTimeout(r, 1500));
    const now = new Date().toISOString();
    const updatedData = { ...DEMO_DATA, steps: DEMO_DATA.steps + Math.floor(Math.random() * 500), heartRate: 65 + Math.floor(Math.random() * 10) };
    await AsyncStorage.setItem("wearable_data", JSON.stringify(updatedData));
    await AsyncStorage.setItem("last_sync", now);
    setWearableData(updatedData);
    setLastSync(now);
    setSyncing(null);
    Alert.alert("Synced!", "Your wearable data has been updated.");
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#13131F", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 16 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>Wearable Sync</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Connect your fitness devices</Text>
          </View>
          {connectedDevices.length > 0 && (
            <TouchableOpacity
              style={{ backgroundColor: "#7C3AED20", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 }}
              onPress={syncNow}
              disabled={syncing === "all"}
            >
              {syncing === "all" ? <ActivityIndicator size="small" color="#A78BFA" /> : <Text style={{ color: "#A78BFA", fontSize: 12 }}>🔄</Text>}
              <Text style={{ color: "#A78BFA", fontWeight: "700", fontSize: 12 }}>Sync Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Last Sync */}
        {lastSync && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "#22C55E10", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#22C55E20", flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 14 }}>✓</Text>
            <Text style={{ color: "#22C55E", fontSize: 12 }}>
              Last synced: {new Date(lastSync).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        )}

        {/* Live Stats */}
        {wearableData && (
          <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginBottom: 12 }}>Today's Data</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <WearableStat icon="👟" label="Steps" value={wearableData.steps?.toLocaleString()} color="#F97316" />
              <WearableStat icon="🔥" label="Calories" value={`${wearableData.calories} kcal`} color="#EF4444" />
              <WearableStat icon="❤️" label="Heart Rate" value={`${wearableData.heartRate} bpm`} color="#EC4899" />
              <WearableStat icon="🌙" label="Sleep" value={`${wearableData.sleep} hrs`} color="#A78BFA" />
              <WearableStat icon="⚡" label="Active" value={`${wearableData.activeMinutes} min`} color="#FBBF24" />
              <WearableStat icon="📍" label="Distance" value={`${wearableData.distance} km`} color="#22C55E" />
              {wearableData.hrv && <WearableStat icon="💓" label="HRV" value={`${wearableData.hrv} ms`} color="#3B82F6" />}
              {wearableData.recovery && <WearableStat icon="🔋" label="Recovery" value={`${wearableData.recovery}%`} color="#22C55E" />}
            </View>
          </View>
        )}

        {/* Devices */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, marginBottom: 12 }}>Fitness Apps & Devices</Text>
          {WEARABLES.map(device => {
            const isConnected = connectedDevices.includes(device.key);
            const isSyncing = syncing === device.key;
            return (
              <View key={device.key} style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: isConnected ? device.color + "40" : "#1F2937" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: device.color + "20", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 24 }}>{device.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{device.name}</Text>
                      {isConnected && (
                        <View style={{ backgroundColor: "#22C55E20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: "#22C55E", fontSize: 10, fontWeight: "700" }}>CONNECTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2, lineHeight: 16 }}>{device.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: isConnected ? "#EF444420" : device.color + "20", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 80, alignItems: "center" }}
                    onPress={() => isConnected ? disconnectDevice(device.key) : connectDevice(device.key)}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <ActivityIndicator size="small" color={device.color} />
                    ) : (
                      <Text style={{ color: isConnected ? "#EF4444" : device.color, fontWeight: "700", fontSize: 12 }}>
                        {isConnected ? "Disconnect" : "Connect"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Info */}
        <View style={{ marginHorizontal: 20, marginTop: 8, backgroundColor: "#7C3AED10", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#7C3AED20" }}>
          <Text style={{ color: "#A78BFA", fontWeight: "700", fontSize: 12, marginBottom: 6 }}>ℹ️ About Wearable Sync</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 12, lineHeight: 18 }}>
            Connect your fitness apps to automatically sync your daily activity data. Your steps, heart rate, calories, and sleep data will appear on your dashboard and be used by AI to personalize your recommendations.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function WearableStat({ icon, label, value, color }: any) {
  return (
    <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#13131F", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#1F2937" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 10, fontWeight: "600" }}>{label.toUpperCase()}</Text>
      </View>
      <Text style={{ color, fontWeight: "700", fontSize: 16 }}>{value}</Text>
    </View>
  );
}
