import React, { useEffect, useState } from "react";
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  Dimensions, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width: SCREEN_W } = Dimensions.get("window");

const SF = {
  bg:      "#0A0E14",
  surface: "#141A22",
  border:  "rgba(245,158,11,0.15)",
  border2: "rgba(245,158,11,0.25)",
  fg:      "#F1F5F9",
  muted: "#B45309",
  gold:    "#F59E0B",
  gold2:   "#FBBF24",
  gold3:   "#FDE68A",
};

export default function TransformationReminderScreen() {
  const router = useRouter();
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null);
  const [targetTransformation, setTargetTransformation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("@onboarding_scan_photo"),
      AsyncStorage.getItem("@target_transformation"),
    ]).then(([photo, target]) => {
      if (photo) setInitialPhoto(photo);
      if (target) {
        try { setTargetTransformation(JSON.parse(target)); } catch {}
      }
      setLoading(false);
    });
  }, []);

  function handleContinue() {
    router.replace("/(tabs)" as any);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: SF.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={SF.gold} size="large" />
      </View>
    );
  }

  const imgW = (SCREEN_W - 56) / 2;
  const imgH = imgW * 1.4;

  return (
    <ScreenContainer containerClassName="bg-[#0A0500]" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14, borderWidth: 1, borderColor: SF.border2 }}>
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11, letterSpacing: 2 }}>🔥 YOUR TRANSFORMATION</Text>
          </View>
          <Text style={{ color: SF.fg, fontFamily: "BebasNeue_400Regular", fontSize: 30, textAlign: "center", lineHeight: 36, marginBottom: 10 }}>
            {"Your Starting Point\nvs Your Goal"}
          </Text>
          <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            Keep this in mind every time you feel like skipping a session. The gap between these two images is your journey.
          </Text>
        </View>

        {/* Side-by-side comparison */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          {/* Initial photo */}
          <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: SF.surface, borderRadius: 18, overflow: "hidden", borderWidth: 2, borderColor: SF.border2 }}>
              {initialPhoto ? (
                <Image source={{ uri: initialPhoto }} style={{ width: "100%", height: imgH }} resizeMode="cover" />
              ) : (
                <View style={{ width: "100%", height: imgH, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.05)" }}>
                  <Text style={{ fontSize: 36 }}>📸</Text>
                  <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 8, textAlign: "center", paddingHorizontal: 8 }}>No photo taken</Text>
                </View>
              )}
              <View style={{ padding: 12 }}>
                <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Today</Text>
                <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>Your starting point</Text>
              </View>
            </View>
          </View>

          {/* Arrow */}
          <View style={{ alignItems: "center", justifyContent: "center", paddingTop: imgH / 2 - 20 }}>
            <View style={{ backgroundColor: SF.gold, borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="arrow-forward" size={20} color={SF.bg} />
            </View>
          </View>

          {/* Target transformation */}
          <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: SF.surface, borderRadius: 18, overflow: "hidden", borderWidth: 2, borderColor: SF.gold }}>
              {targetTransformation?.imageUrl ? (
                <Image source={{ uri: targetTransformation.imageUrl }} style={{ width: "100%", height: imgH }} resizeMode="cover" />
              ) : (
                <View style={{ width: "100%", height: imgH, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,158,11,0.08)" }}>
                  <Text style={{ fontSize: 36 }}>🏆</Text>
                  <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 8, textAlign: "center", paddingHorizontal: 8 }}>
                    {targetTransformation ? `${targetTransformation.target_bf}% BF target` : "Set your target"}
                  </Text>
                </View>
              )}
              <View style={{ padding: 12, backgroundColor: "rgba(245,158,11,0.08)" }}>
                <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 13 }}>
                  {targetTransformation ? `${targetTransformation.target_bf}% BF` : "Your Goal"}
                </Text>
                <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>
                  {targetTransformation?.estimated_weeks ? `~${targetTransformation.estimated_weeks} weeks away` : "Your destination"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats row */}
        {targetTransformation && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Target BF", value: `${targetTransformation.target_bf}%`, icon: "🎯" },
              { label: "Timeline", value: `${targetTransformation.estimated_weeks}w`, icon: "⏱" },
              { label: "Effort", value: targetTransformation.effort_level ?? "High", icon: "💪" },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: SF.surface, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: SF.border }}>
                <Text style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</Text>
                <Text style={{ color: SF.gold, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>{s.value}</Text>
                <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Motivational message */}
        <View style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 16, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: SF.border2 }}>
          <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 8 }}>💬 Remember This</Text>
          <Text style={{ color: SF.gold3, fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 22 }}>
            Every great physique was built one session at a time. Your AI-generated target body is not a fantasy — it's a scientific projection of what your body can achieve. Trust the process, follow your plan, and check back here whenever you need motivation.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={{ backgroundColor: SF.gold, borderRadius: 18, paddingVertical: 18, alignItems: "center", shadowColor: SF.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 18 }}
          onPress={handleContinue}
        >
          <Text style={{ color: SF.bg, fontFamily: "BebasNeue_400Regular", fontSize: 18 }}>Let's Start My Journey ⚡</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ marginTop: 14, alignItems: "center", paddingVertical: 10 }}
          onPress={handleContinue}
        >
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13 }}>Skip — go to dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
