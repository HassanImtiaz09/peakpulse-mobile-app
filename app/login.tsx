import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { startOAuthLogin } from "@/constants/oauth";
import { useGuestAuth } from "@/lib/guest-auth";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { UI, C } from "@/constants/ui-colors";
import { ScreenErrorBoundary } from "@/components/error-boundary";

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
    <ScreenErrorBoundary screenName="login">
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Radial glow background effect */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 }}>
            {/* Ambient glow behind logo */}
            <View style={{
              position: "absolute", top: 60, width: 300, height: 300,
              borderRadius: 150, backgroundColor: UI.dim,
              shadowColor: C.gold, shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3, shadowRadius: 80,
            }} />

            {/* Logo */}
            <View style={{
              width: 100, height: 100, borderRadius: 28,
              backgroundColor: UI.goldAlpha12,
              alignItems: "center", justifyContent: "center",
              marginBottom: 20, borderWidth: 1.5, borderColor: UI.borderGold2,
            }}>
              <MaterialIcons name="local-fire-department" size={52} color={C.gold} />
            </View>

            {/* Brand name */}
            <Text style={{
              color: C.fg, fontFamily: "BebasNeue_400Regular",
              fontSize: 48, letterSpacing: 4, textAlign: "center",
            }}>
              PEAKPULSE
            </Text>
            <Text style={{
              color: C.muted, fontFamily: "DMSans_500Medium",
              fontSize: 14, textAlign: "center", marginTop: 4, marginBottom: 40,
            }}>
              AI-Powered Fitness Transformation
            </Text>

            {/* Auth Card */}
            <View style={{
              width: "100%", backgroundColor: C.surface,
              borderRadius: 24, padding: 24,
              borderWidth: 1, borderColor: C.border,
            }}>
              {mode === "choose" && (
                <View style={{ gap: 14 }}>
                  {/* Google OAuth — Primary CTA */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#FFFFFF", borderRadius: 16,
                      paddingVertical: 16, flexDirection: "row",
                      alignItems: "center", justifyContent: "center", gap: 10,
                    }}
                    onPress={() => startOAuthLogin()}
                  >
                    <Text style={{ fontSize: 18 }}>G</Text>
                    <Text style={{ color: "#1F2937", fontFamily: "DMSans_700Bold", fontSize: 16 }}>
                      Continue with Google
                    </Text>
                  </TouchableOpacity>

                  {/* Email — Secondary ghost button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: "transparent", borderRadius: 16,
                      paddingVertical: 16, flexDirection: "row",
                      alignItems: "center", justifyContent: "center", gap: 10,
                      borderWidth: 1, borderColor: C.border,
                    }}
                    onPress={() => setMode("email")}
                  >
                    <MaterialIcons name="email" size={18} color={C.muted} />
                    <Text style={{ color: C.fg, fontFamily: "DMSans_600SemiBold", fontSize: 15 }}>
                      Continue with Email
                    </Text>
                  </TouchableOpacity>

                  {/* Guest — Text link only */}
                  <TouchableOpacity
                    style={{ alignItems: "center", paddingVertical: 10 }}
                    onPress={handleGuestContinue}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={C.muted} />
                    ) : (
                      <Text style={{ color: C.muted, fontFamily: "DMSans_400Regular", fontSize: 14 }}>
                        Skip — Continue as Guest
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {mode === "email" && (
                <View style={{ gap: 14 }}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}
                    onPress={() => { setMode("choose"); setEmailError(""); }}
                  >
                    <MaterialIcons name="arrow-back" size={18} color={C.gold} />
                    <Text style={{ color: C.gold, fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>Back</Text>
                  </TouchableOpacity>

                  <Text style={{ color: C.fg, fontFamily: "BebasNeue_400Regular", fontSize: 28, letterSpacing: 2 }}>
                    ENTER YOUR DETAILS
                  </Text>
                  <Text style={{ color: C.muted, fontFamily: "DMSans_400Regular", fontSize: 13 }}>
                    Your data stays on your device. No password required.
                  </Text>

                  <View>
                    <Text style={{ color: C.muted, fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 6 }}>YOUR NAME</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Alex Johnson"
                      placeholderTextColor="rgba(100,116,139,0.5)"
                      style={{
                        backgroundColor: C.bg, borderRadius: 14,
                        paddingHorizontal: 16, paddingVertical: 14,
                        color: C.fg, fontSize: 16, fontFamily: "DMSans_400Regular",
                        borderWidth: 1, borderColor: C.border,
                      }}
                      returnKeyType="next"
                      autoCapitalize="words"
                    />
                  </View>

                  <View>
                    <Text style={{ color: C.muted, fontSize: 11, fontFamily: "DMSans_600SemiBold", letterSpacing: 1, marginBottom: 6 }}>EMAIL ADDRESS</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor="rgba(100,116,139,0.5)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        backgroundColor: C.bg, borderRadius: 14,
                        paddingHorizontal: 16, paddingVertical: 14,
                        color: C.fg, fontSize: 16, fontFamily: "DMSans_400Regular",
                        borderWidth: 1, borderColor: emailError ? C.gold : C.border,
                      }}
                      returnKeyType="done"
                      onSubmitEditing={handleEmailContinue}
                    />
                    {emailError ? (
                      <Text style={{ color: C.gold, fontSize: 12, marginTop: 6, fontFamily: "DMSans_400Regular" }}>{emailError}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: C.gold, borderRadius: 16,
                      paddingVertical: 16, alignItems: "center",
                      marginTop: 4, opacity: loading ? 0.7 : 1,
                    }}
                    onPress={handleEmailContinue}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={C.bg} />
                    ) : (
                      <Text style={{ color: C.bg, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Continue</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={{ color: "rgba(100,116,139,0.5)", fontSize: 11, textAlign: "center", lineHeight: 16, fontFamily: "DMSans_400Regular" }}>
                    Your email is stored locally for personalization only.{"\n"}
                    No account is created on our servers.
                  </Text>
                </View>
              )}
            </View>

            {/* Social proof stats — pitch for undecided users */}
            <View style={{
              flexDirection: "row", justifyContent: "center", gap: 24,
              marginTop: 32, paddingHorizontal: 16,
            }}>
              {[
                { value: "4.9", label: "Rating", icon: "star" as const },
                { value: "77", label: "Exercises", icon: "fitness-center" as const },
                { value: "7", label: "Wearables", icon: "watch" as const },
              ].map((stat, i) => (
                <View key={i} style={{ alignItems: "center", gap: 4 }}>
                  <MaterialIcons name={stat.icon} size={16} color={C.gold} />
                  <Text style={{ color: C.fg, fontFamily: "SpaceMono_700Bold", fontSize: 18 }}>
                    {stat.value}
                  </Text>
                  <Text style={{ color: C.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={{
              color: "rgba(100,116,139,0.4)", fontSize: 11, textAlign: "center",
              marginTop: 24, fontFamily: "DMSans_400Regular",
            }}>
              By continuing, you agree to our Terms of Service
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </ScreenErrorBoundary>
  );
}
