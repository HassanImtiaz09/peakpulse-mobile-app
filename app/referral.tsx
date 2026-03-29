import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Clipboard, ImageBackground, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useGuestAuth } from "@/lib/guest-auth";
import {
  loadOrCreateReferralData,
  shareReferralCode,
  buildReferralUrl,
  type ReferralData,
} from "@/lib/referral";
import { FeatureGate } from "@/components/feature-gate";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

const REWARD_TIERS = [
  { referrals: 1, reward: "1 Month Basic FREE", description: "Your first friend unlocks a free Basic month for you", icon: "🥉" },
  { referrals: 3, reward: "1 Month Advanced FREE", description: "3 friends referred earns you a full Advanced month", icon: "🥈" },
  { referrals: 5, reward: "3 Months Advanced FREE", description: "5 referrals = 3 months of premium access", icon: "🥇" },
  { referrals: 10, reward: "Lifetime 50% Discount", description: "10 referrals earns you a permanent 50% discount forever", icon: "👑" },
];

export default function ReferralScreen() {
  const router = useRouter();
  const { guestProfile } = useGuestAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const name = guestProfile?.name ?? "USER";
      const data = await loadOrCreateReferralData(name);
      setReferralData(data);
    } catch {}
    finally { setLoading(false); }
  }, [guestProfile?.name]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleShare() {
    if (!referralData || sharing) return;
    setSharing(true);
    try { await shareReferralCode(referralData.code); }
    finally { setSharing(false); }
  }

  function handleCopy() {
    if (!referralData) return;
    Clipboard.setString(referralData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const referralCount = referralData?.referrals ?? 0;
  const creditsEarned = referralData?.creditsEarned ?? 0;
  const nextTier = REWARD_TIERS.find((t) => t.referrals > referralCount);
  const progressToNext = nextTier ? Math.min((referralCount / nextTier.referrals) * 100, 100) : 100;
  const rewards = REWARD_TIERS.map((t: typeof REWARD_TIERS[number]) => ({ ...t, achieved: referralCount >= t.referrals }));

  return (
    <FeatureGate feature="referral" message="Refer friends and earn rewards. Available on Basic plan and above.">
    <View style={{ flex: 1, backgroundColor: "#0A0E14" }}>
      {/* Hero */}
      <ImageBackground source={{ uri: HERO_BG }} style={{ height: 200 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.75)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, left: 20, backgroundColor: "#FFFFFF20", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
            onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
            <Text style={{ color: "#F1F5F9", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: "#FDE68A", fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1 }}>REFERRAL PROGRAMME</Text>
          <Text style={{ color: "#F1F5F9", fontFamily: "BebasNeue_400Regular", fontSize: 26 }}>Earn Free Months</Text>
          <Text style={{ color: "#FDE68A", fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 6, opacity: 0.9 }}>Friends get a FREE 14-day Advanced trial!</Text>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Referral Code Card */}
        <View style={{ backgroundColor: "#141A22", borderRadius: 24, padding: 24, borderWidth: 2, borderColor: "rgba(245,158,11,0.18)", marginBottom: 20, alignItems: "center" }}>
          <Text style={{ color: "#B45309", fontSize: 13, marginBottom: 8 }}>Your Referral Code</Text>
          <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, borderWidth: 2, borderColor: "rgba(245,158,11,0.28)", marginBottom: 16 }}>
            <Text style={{ color: "#FDE68A", fontFamily: "BebasNeue_400Regular", fontSize: 32, letterSpacing: 4 }}>
              {referralData?.code ?? "..."}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: copied ? "#FDE68A" : "rgba(245,158,11,0.10)", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
              onPress={handleCopy} {...a11yButton("Copy referral code")}
            >
              <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                {copied ? "✓ Copied!" : "📋 Copy Code"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 12, alignItems: "center" }}
              onPress={handleShare} {...a11yButton("Share referral link")}
            >
              <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 14 }}>📤 Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: "#141A22", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", alignItems: "center" }}>
            <Text style={{ color: "#F59E0B", fontFamily: "BebasNeue_400Regular", fontSize: 28 }}>{referralCount}</Text>
            <Text style={{ color: "#B45309", fontSize: 12, marginTop: 4 }}>Friends Referred</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#141A22", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", alignItems: "center" }}>
            <Text style={{ color: "#FDE68A", fontFamily: "BebasNeue_400Regular", fontSize: 28 }}>{creditsEarned}</Text>
            <Text style={{ color: "#B45309", fontSize: 12, marginTop: 4 }}>Months Earned</Text>
          </View>
        </View>

        {/* Reward Tiers */}
        <Text style={{ color: "#F1F5F9", fontFamily: "BebasNeue_400Regular", fontSize: 18, marginBottom: 12 }}>Reward Tiers</Text>
        {rewards.map((r, i) => (
          <View key={i} style={{
            backgroundColor: r.achieved ? "#052e16" : "#141A22",
            borderRadius: 16, padding: 16, marginBottom: 10,
            borderWidth: 1, borderColor: r.achieved ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.10)",
            flexDirection: "row", alignItems: "center", gap: 16,
          }}>
            <Text style={{ fontSize: 28 }}>{r.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#F1F5F9", fontFamily: "DMSans_700Bold", fontSize: 15 }}>{r.reward}</Text>
              <Text style={{ color: "#B45309", fontSize: 12, marginTop: 2 }}>Refer {r.referrals} friend{r.referrals > 1 ? "s" : ""}</Text>
            </View>
            {r.achieved ? (
              <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: "#FDE68A", fontFamily: "DMSans_700Bold", fontSize: 12 }}>✓ Earned</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: "#B45309", fontFamily: "DMSans_700Bold", fontSize: 12 }}>
                  {r.referrals - referralCount} to go
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* How it works */}
        <View style={{ marginTop: 12, backgroundColor: "#141A22", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <Text style={{ color: "#F1F5F9", fontFamily: "BebasNeue_400Regular", fontSize: 16, marginBottom: 12 }}>How It Works</Text>
          {[
            { step: "1", text: "Share your referral code with friends" },
            { step: "2", text: "Friend signs up and enters your code" },
            { step: "3", text: "They get a FREE 14-day Advanced trial — double the standard 7 days!" },
            { step: "4", text: "You earn a free month for every referral" },
          ].map((s, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#F1F5F9", fontFamily: "BebasNeue_400Regular", fontSize: 13 }}>{s.step}</Text>
              </View>
              <Text style={{ color: "#D1D5DB", fontSize: 14, flex: 1, lineHeight: 20, paddingTop: 4 }}>{s.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
    </FeatureGate>
  );
}
