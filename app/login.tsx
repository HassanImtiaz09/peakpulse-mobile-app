import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, ImageBackground, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import { useGuestAuth } from "@/lib/guest-auth";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";
const APP_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/at_hero_dashboard-VCWgAqUVtVq8md7vJyavvf.png";

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
    <View style={{ flex: 1, backgroundColor: "#060F0A" }}>
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
                  color: "#E6FFF5", fontSize: 38, fontFamily: "Outfit_800ExtraBold",
                  letterSpacing: -1, textAlign: "center",
                  textShadowColor: "#10B981", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
                }}>
                  PeakPulse AI
                </Text>
                <Text style={{ color: "#6EE7B7", fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 22, fontFamily: "DMSans_500Medium" }}>
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
                    <Text style={{ color: "#10B981", fontSize: 12, fontFamily: "DMSans_600SemiBold" }}>{f}</Text>
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
                    <Text style={{ color: "#E6FFF5", fontSize: 20, fontFamily: "Outfit_800ExtraBold", textAlign: "center", marginBottom: 4 }}>
                      Get Started
                    </Text>

                    {/* Google OAuth */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#E6FFF5",
                        borderRadius: 16, paddingVertical: 15,
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                      }}
                      onPress={() => startOAuthLogin()}
                    >
                      <Text style={{ fontSize: 18 }}>🔵</Text>
                      <Text style={{ color: "#111827", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Continue with Google</Text>
                    </TouchableOpacity>

                    {/* Email */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#10B981",
                        borderRadius: 16, paddingVertical: 15,
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                      }}
                      onPress={() => setMode("email")}
                    >
                      <Text style={{ fontSize: 18 }}>✉️</Text>
                      <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Continue with Email</Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(16,185,129,0.10)" }} />
                      <Text style={{ color: "#1A4A38", fontSize: 12 }}>or</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(16,185,129,0.10)" }} />
                    </View>

                    {/* Guest / Skip */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "transparent",
                        borderRadius: 16, paddingVertical: 15,
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                        borderWidth: 1, borderColor: "rgba(16,185,129,0.15)",
                      }}
                      onPress={handleGuestContinue}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#4D8C72" />
                      ) : (
                        <>
                          <Text style={{ fontSize: 18 }}>👤</Text>
                          <Text style={{ color: "#4D8C72", fontFamily: "DMSans_600SemiBold", fontSize: 15 }}>Skip — Use as Guest</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <Text style={{ color: "#1A4A38", fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
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
                      <Text style={{ color: "#10B981", fontSize: 18 }}>←</Text>
                      <Text style={{ color: "#10B981", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>Back</Text>
                    </TouchableOpacity>

                    <Text style={{ color: "#E6FFF5", fontSize: 20, fontFamily: "Outfit_800ExtraBold" }}>Enter your details</Text>
                    <Text style={{ color: "#4D8C72", fontSize: 13 }}>
                      Your data stays on your device. No password required.
                    </Text>

                    <View>
                      <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 6, letterSpacing: 0.5 }}>YOUR NAME</Text>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Alex Johnson"
                        placeholderTextColor="#1A4A38"
                        style={{
                          backgroundColor: "#0D1F18", borderRadius: 14,
                          paddingHorizontal: 16, paddingVertical: 14,
                          color: "#E6FFF5", fontSize: 16,
                          borderWidth: 1, borderColor: "rgba(16,185,129,0.10)",
                        }}
                        returnKeyType="next"
                        autoCapitalize="words"
                      />
                    </View>

                    <View>
                      <Text style={{ color: "#4D8C72", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 6, letterSpacing: 0.5 }}>EMAIL ADDRESS</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor="#1A4A38"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{
                          backgroundColor: "#0D1F18", borderRadius: 14,
                          paddingHorizontal: 16, paddingVertical: 14,
                          color: "#E6FFF5", fontSize: 16,
                          borderWidth: 1, borderColor: emailError ? "#4D8C72" : "rgba(16,185,129,0.10)",
                        }}
                        returnKeyType="done"
                        onSubmitEditing={handleEmailContinue}
                      />
                      {emailError ? (
                        <Text style={{ color: "#4D8C72", fontSize: 12, marginTop: 6 }}>{emailError}</Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={{
                        backgroundColor: "#10B981", borderRadius: 16,
                        paddingVertical: 16, alignItems: "center",
                        marginTop: 4, opacity: loading ? 0.7 : 1,
                      }}
                      onPress={handleEmailContinue}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#E6FFF5" />
                      ) : (
                        <Text style={{ color: "#E6FFF5", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Continue →</Text>
                      )}
                    </TouchableOpacity>

                    <Text style={{ color: "#1A4A38", fontSize: 11, textAlign: "center", lineHeight: 16 }}>
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
