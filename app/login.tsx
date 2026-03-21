import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, ImageBackground, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import { useGuestAuth } from "@/lib/guest-auth";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";
const APP_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

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
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
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
                  color: "#FFF7ED", fontSize: 38, fontFamily: "Outfit_800ExtraBold",
                  letterSpacing: -1, textAlign: "center",
                  textShadowColor: "#F59E0B", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
                }}>
                  PeakPulse AI
                </Text>
                <Text style={{ color: "#FDE68A", fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 22, fontFamily: "DMSans_500Medium" }}>
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
                    <Text style={{ color: "#F59E0B", fontSize: 12, fontFamily: "DMSans_600SemiBold" }}>{f}</Text>
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
                    <Text style={{ color: "#FFF7ED", fontSize: 20, fontFamily: "Outfit_800ExtraBold", textAlign: "center", marginBottom: 4 }}>
                      Get Started
                    </Text>

                    {/* Google OAuth */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#FFF7ED",
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
                        backgroundColor: "#F59E0B",
                        borderRadius: 16, paddingVertical: 15,
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                      }}
                      onPress={() => setMode("email")}
                    >
                      <Text style={{ fontSize: 18 }}>✉️</Text>
                      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Continue with Email</Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(245,158,11,0.10)" }} />
                      <Text style={{ color: "#451A03", fontSize: 12 }}>or</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(245,158,11,0.10)" }} />
                    </View>

                    {/* Guest / Skip */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: "transparent",
                        borderRadius: 16, paddingVertical: 15,
                        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
                        borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
                      }}
                      onPress={handleGuestContinue}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#B45309" />
                      ) : (
                        <>
                          <Text style={{ fontSize: 18 }}>👤</Text>
                          <Text style={{ color: "#B45309", fontFamily: "DMSans_600SemiBold", fontSize: 15 }}>Skip — Use as Guest</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <Text style={{ color: "#451A03", fontSize: 11, textAlign: "center", lineHeight: 16, marginTop: 4 }}>
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
                      <Text style={{ color: "#F59E0B", fontSize: 18 }}>←</Text>
                      <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>Back</Text>
                    </TouchableOpacity>

                    <Text style={{ color: "#FFF7ED", fontSize: 20, fontFamily: "Outfit_800ExtraBold" }}>Enter your details</Text>
                    <Text style={{ color: "#B45309", fontSize: 13 }}>
                      Your data stays on your device. No password required.
                    </Text>

                    <View>
                      <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 6, letterSpacing: 0.5 }}>YOUR NAME</Text>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Alex Johnson"
                        placeholderTextColor="#451A03"
                        style={{
                          backgroundColor: "#150A00", borderRadius: 14,
                          paddingHorizontal: 16, paddingVertical: 14,
                          color: "#FFF7ED", fontSize: 16,
                          borderWidth: 1, borderColor: "rgba(245,158,11,0.10)",
                        }}
                        returnKeyType="next"
                        autoCapitalize="words"
                      />
                    </View>

                    <View>
                      <Text style={{ color: "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 6, letterSpacing: 0.5 }}>EMAIL ADDRESS</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor="#451A03"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{
                          backgroundColor: "#150A00", borderRadius: 14,
                          paddingHorizontal: 16, paddingVertical: 14,
                          color: "#FFF7ED", fontSize: 16,
                          borderWidth: 1, borderColor: emailError ? "#B45309" : "rgba(245,158,11,0.10)",
                        }}
                        returnKeyType="done"
                        onSubmitEditing={handleEmailContinue}
                      />
                      {emailError ? (
                        <Text style={{ color: "#B45309", fontSize: 12, marginTop: 6 }}>{emailError}</Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={{
                        backgroundColor: "#F59E0B", borderRadius: 16,
                        paddingVertical: 16, alignItems: "center",
                        marginTop: 4, opacity: loading ? 0.7 : 1,
                      }}
                      onPress={handleEmailContinue}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFF7ED" />
                      ) : (
                        <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Continue →</Text>
                      )}
                    </TouchableOpacity>

                    <Text style={{ color: "#451A03", fontSize: 11, textAlign: "center", lineHeight: 16 }}>
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
