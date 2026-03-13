import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Share, Alert, Clipboard, ImageBackground,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useGuestAuth } from "@/lib/guest-auth";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/cRektLNCAgCjcXYF.jpg";
const REFERRAL_KEY = "@referral_data";

function generateReferralCode(name: string): string {
  const base = name.replace(/\s+/g, "").toUpperCase().slice(0, 5);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

interface ReferralData {
  code: string;
  referrals: number;
  creditsEarned: number;
}

export default function ReferralScreen() {
  const router = useRouter();
  const { guestProfile } = useGuestAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadOrCreateReferral();
  }, []);

  async function loadOrCreateReferral() {
    const raw = await AsyncStorage.getItem(REFERRAL_KEY);
    if (raw) {
      setReferralData(JSON.parse(raw));
    } else {
      const name = guestProfile?.name ?? "USER";
      const code = generateReferralCode(name);
      const data: ReferralData = { code, referrals: 0, creditsEarned: 0 };
      await AsyncStorage.setItem(REFERRAL_KEY, JSON.stringify(data));
      setReferralData(data);
    }
  }

  async function handleShare() {
    if (!referralData) return;
    const message = `🏋️ Join me on PeakPulse AI — the fitness app that uses AI to transform your body!\n\nUse my referral code: ${referralData.code}\n\nGet 1 month Advanced FREE when you sign up! 💪\n\nhttps://peakpulse.app/ref/${referralData.code}`;
    try {
      await Share.share({ message, title: "Join PeakPulse AI" });
    } catch {}
  }

  async function handleCopy() {
    if (!referralData) return;
    Clipboard.setString(referralData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const rewards = [
    { referrals: 1, reward: "1 Month Basic FREE", icon: "🥉", achieved: (referralData?.referrals ?? 0) >= 1 },
    { referrals: 3, reward: "1 Month Advanced FREE", icon: "🥈", achieved: (referralData?.referrals ?? 0) >= 3 },
    { referrals: 5, reward: "3 Months Advanced FREE", icon: "🥇", achieved: (referralData?.referrals ?? 0) >= 5 },
    { referrals: 10, reward: "Lifetime 50% Discount", icon: "👑", achieved: (referralData?.referrals ?? 0) >= 10 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#080B0F" }}>
      {/* Hero */}
      <ImageBackground source={{ uri: HERO_BG }} style={{ height: 200 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, left: 20, backgroundColor: "#FFFFFF20", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#F1F5F9", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: "#94A3B8", fontFamily: "Syne_700Bold", fontSize: 12, letterSpacing: 1 }}>REFERRAL PROGRAMME</Text>
          <Text style={{ color: "#F1F5F9", fontFamily: "Syne_800ExtraBold", fontSize: 26 }}>Earn Free Months</Text>
          <Text style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>Invite friends and earn free subscription months</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Referral Code Card */}
        <View style={{ backgroundColor: "#0E1218", borderRadius: 24, padding: 24, borderWidth: 2, borderColor: "rgba(226,232,240,0.14)", marginBottom: 20, alignItems: "center" }}>
          <Text style={{ color: "#64748B", fontSize: 13, marginBottom: 8 }}>Your Referral Code</Text>
          <View style={{ backgroundColor: "rgba(226,232,240,0.08)", borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, borderWidth: 2, borderColor: "rgba(226,232,240,0.22)", marginBottom: 16 }}>
            <Text style={{ color: "#94A3B8", fontFamily: "Syne_800ExtraBold", fontSize: 32, letterSpacing: 4 }}>
              {referralData?.code ?? "..."}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: copied ? "#94A3B8" : "rgba(226,232,240,0.08)", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
              onPress={handleCopy}
            >
              <Text style={{ color: "#F1F5F9", fontFamily: "Syne_700Bold", fontSize: 14 }}>
                {copied ? "✓ Copied!" : "📋 Copy Code"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "#E2E8F0", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
              onPress={handleShare}
            >
              <Text style={{ color: "#F1F5F9", fontFamily: "Syne_700Bold", fontSize: 14 }}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: "#0E1218", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(226,232,240,0.08)", alignItems: "center" }}>
            <Text style={{ color: "#E2E8F0", fontFamily: "Syne_800ExtraBold", fontSize: 28 }}>{referralData?.referrals ?? 0}</Text>
            <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>Friends Referred</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#0E1218", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(226,232,240,0.08)", alignItems: "center" }}>
            <Text style={{ color: "#94A3B8", fontFamily: "Syne_800ExtraBold", fontSize: 28 }}>{referralData?.creditsEarned ?? 0}</Text>
            <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>Months Earned</Text>
          </View>
        </View>

        {/* Reward Tiers */}
        <Text style={{ color: "#F1F5F9", fontFamily: "Syne_800ExtraBold", fontSize: 18, marginBottom: 12 }}>Reward Tiers</Text>
        {rewards.map((r, i) => (
          <View key={i} style={{
            backgroundColor: r.achieved ? "#052e16" : "#0E1218",
            borderRadius: 16, padding: 16, marginBottom: 10,
            borderWidth: 1, borderColor: r.achieved ? "rgba(226,232,240,0.14)" : "rgba(226,232,240,0.08)",
            flexDirection: "row", alignItems: "center", gap: 16,
          }}>
            <Text style={{ fontSize: 28 }}>{r.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#F1F5F9", fontFamily: "Syne_700Bold", fontSize: 15 }}>{r.reward}</Text>
              <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>Refer {r.referrals} friend{r.referrals > 1 ? "s" : ""}</Text>
            </View>
            {r.achieved ? (
              <View style={{ backgroundColor: "rgba(226,232,240,0.08)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: "#94A3B8", fontFamily: "Syne_700Bold", fontSize: 12 }}>✓ Earned</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: "rgba(226,232,240,0.08)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: "#475569", fontFamily: "Syne_700Bold", fontSize: 12 }}>
                  {r.referrals - (referralData?.referrals ?? 0)} to go
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* How it works */}
        <View style={{ marginTop: 12, backgroundColor: "#0E1218", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(226,232,240,0.08)" }}>
          <Text style={{ color: "#F1F5F9", fontFamily: "Syne_800ExtraBold", fontSize: 16, marginBottom: 12 }}>How It Works</Text>
          {[
            { step: "1", text: "Share your referral code with friends" },
            { step: "2", text: "Friend signs up and enters your code" },
            { step: "3", text: "They get 1 month Advanced FREE" },
            { step: "4", text: "You earn a free month for every referral" },
          ].map((s, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#F1F5F9", fontFamily: "Syne_800ExtraBold", fontSize: 13 }}>{s.step}</Text>
              </View>
              <Text style={{ color: "#D1D5DB", fontSize: 14, flex: 1, lineHeight: 20, paddingTop: 4 }}>{s.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
