import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, ImageBackground, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import { useGuestAuth } from "@/lib/guest-auth";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/hero_bg-YtJxLGZKqRBrxqD3Cfsn7p.png";
const APP_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/app_logo-iTNC7xURufvjtUp3Y5ns3S.png";

type AuthMode = "choose" | "email";

export default function LoginScreen() {
  const router = useRouter();
  const { enterGuestMode, enterEmailMode } = useGuestAuth();
  const [mode, setMode] = useState<AuthMode>("choose");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  function validateEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function handleEmailContinue() {
    setEmailError("");
    if (!name.trim()) { setEmailError("Please enter your name."); return; }
    if (!validateEmail(email)) { setEmailError("Please enter a valid email address."); return; }
    setLoading(true);
    try {
      await enterEmailMode(email.trim().toLowerCase(), name.trim());
      router.replace("/onboarding" as any);
    } catch (e: any) {
      setEmailError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestContinue() {
    setLoading(true);
    try {
      await enterGuestMode("Athlete");
      router.replace("/onboarding" as any);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#080810" }}>
      <ImageBackground
        source={{ uri: HERO_BG }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        {/* Dark overlay for readability */}
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.72)" }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Hero Logo Section */}
              <View style={{ alignItems: "center", paddingTop: 80, paddingBottom: 32, paddingHorizontal: 24 }}>
                <Image
                  source={{ uri: APP_LOGO }}
                  style={{ width: 90, height: 90, borderRadius: 22, marginBottom: 20 }}
                  resizeMode="cover"
                />
                <Text style={{
                  color: "#FFFFFF", fontSize: 38, fontWeight: "900",
                  letterSpacing: -1, textAlign: "center",
                  textShadowColor: "#7C3AED", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
                }}>
                  PeakPulse AI
                </Text>
                <Text style={{ color: "#C4B5FD", fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 22, fontWeight: "500" }}>
                  Transform your body with AI-powered{"\n"}personalized fitness plans
                </Text>
              </View>

              {/* Feature pills */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 24, justifyContent: "center", marginBottom: 36 }}>
                {[
                  "📸 AI Body Scan",
                  "🏋️ Smart Plans",
                  "🥗 Meal Prep",
                  "📊 Progress AI",
                  "⌚ Wearables",
                  "🗺️ Gym Finder",
                ].map((f, i) => (
                  <View key={i} style={{
                    backgroundColor: "rgba(124,58,237,0.2)",
                    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
                    borderWidth: 1, borderColor: "rgba(124,58,237,0.4)",
                  }}>
                    <Text style={{ color: "#E9D5FF", fontSize: 12, fontWeight: "600" }}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* Auth Card */}
              <View style={{
                marginHorizontal: 20,
                backgroundColor: "rgba(13,13,24,0.92)",
                borderRadius: 28,
                padding: 24,
                borderWidth: 1,
                borderColor: "rgba(124,58,237,0.3)",
                marginBottom: 40,
              }}>
                {mode === "choose" && (
                  <View style={{ gap: 12 }}>
                    <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 4 }}>
                      Get Started
                    </Text>

                    {/* Google OAuth */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 16, paddingVertical: 15,
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                      }}
                      onPress={() => startOAuthLogin()}
                    >
                      <Text style={{ fontSize: 18 }}>🔵</Text>
                      <Text style={{ color: "#111827", fontWeight: "700", fontSize: 15 }}>Continue with Google</Text>
                    </TouchableOpacity>

                    {/* Email */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#7C3AED",
                        borderRadius: 16, paddingVertical: 15,
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                      }}
                      onPress={() => setMode("email")}
                    >
                      <Text style={{ fontSize: 18 }}>✉️</Text>
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Continue with Email</Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: "#1F2937" }} />
                      <Text style={{ color: "#4B5563", fontSize: 12 }}>or</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: "#1F2937" }} />
                    </View>

                    {/* Guest / Skip */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "transparent",
                        borderRadius: 16, paddingVertical: 15,
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                        borderWidth: 1, borderColor: "#374151",
                      }}
                      onPress={handleGuestContinue}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#9CA3AF" />
                      ) : (
                        <>
                          <Text style={{ fontSize: 18 }}>👤</Text>
                          <Text style={{ color: "#9CA3AF", fontWeight: "600", fontSize: 15 }}>Skip — Use as Guest</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <Text style={{ color: "#4B5563", fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
                      Guest mode stores your data locally on this device only.{"\n"}
                      By continuing, you agree to our Terms of Service.
                    </Text>
                  </View>
                )}

                {mode === "email" && (
                  <View style={{ gap: 14 }}>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}
                      onPress={() => { setMode("choose"); setEmailError(""); }}
                    >
                      <Text style={{ color: "#7C3AED", fontSize: 18 }}>←</Text>
                      <Text style={{ color: "#7C3AED", fontWeight: "600", fontSize: 14 }}>Back</Text>
                    </TouchableOpacity>

                    <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>Enter your details</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
                      Your data stays on your device. No password required.
                    </Text>

                    <View>
                      <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 6, letterSpacing: 0.5 }}>YOUR NAME</Text>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Alex Johnson"
                        placeholderTextColor="#4B5563"
                        style={{
                          backgroundColor: "#13131F", borderRadius: 14,
                          paddingHorizontal: 16, paddingVertical: 14,
                          color: "#FFFFFF", fontSize: 16,
                          borderWidth: 1, borderColor: "#1F2937",
                        }}
                        returnKeyType="next"
                        autoCapitalize="words"
                      />
                    </View>

                    <View>
                      <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 6, letterSpacing: 0.5 }}>EMAIL ADDRESS</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor="#4B5563"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{
                          backgroundColor: "#13131F", borderRadius: 14,
                          paddingHorizontal: 16, paddingVertical: 14,
                          color: "#FFFFFF", fontSize: 16,
                          borderWidth: 1, borderColor: emailError ? "#EF4444" : "#1F2937",
                        }}
                        returnKeyType="done"
                        onSubmitEditing={handleEmailContinue}
                      />
                      {emailError ? (
                        <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>{emailError}</Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={{
                        backgroundColor: "#7C3AED", borderRadius: 16,
                        paddingVertical: 16, alignItems: "center",
                        marginTop: 4, opacity: loading ? 0.7 : 1,
                      }}
                      onPress={handleEmailContinue}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Continue →</Text>
                      )}
                    </TouchableOpacity>

                    <Text style={{ color: "#4B5563", fontSize: 11, textAlign: "center", lineHeight: 16 }}>
                      Your email is stored locally for personalization only.{"\n"}
                      No account is created on our servers.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </View>
  );
}
