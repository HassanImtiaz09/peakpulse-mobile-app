import React, { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator, ImageBackground, Image,
  LayoutAnimation, Platform, UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallModal } from "@/components/paywall-modal";
import { useThemeContext, type ThemePreference } from "@/lib/theme-provider";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/hXdqoCBElSGntMHm.jpg";
const APP_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/hXdqoCBElSGntMHm.jpg";

const GOALS = [
  { key: "build_muscle", label: "Build Muscle", iconName: "fitness-center" as const },
  { key: "lose_fat", label: "Lose Fat", iconName: "local-fire-department" as const },
  { key: "maintain", label: "Maintain", iconName: "balance" as const },
  { key: "athletic", label: "Athletic", iconName: "directions-run" as const },
];

const WORKOUT_STYLES = [
  { key: "gym", label: "Gym", iconName: "fitness-center" as const },
  { key: "home", label: "Home", iconName: "home" as const },
  { key: "mix", label: "Mix", iconName: "sync" as const },
  { key: "calisthenics", label: "Calisthenics", iconName: "accessibility-new" as const },
];

const DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", iconName: "restaurant" as const },
  { key: "halal", label: "Halal", iconName: "verified" as const },
  { key: "vegan", label: "Vegan", iconName: "eco" as const },
  { key: "vegetarian", label: "Vegetarian", iconName: "spa" as const },
  { key: "keto", label: "Keto", iconName: "egg-alt" as const },
  { key: "paleo", label: "Paleo", iconName: "set-meal" as const },
];

const GENDERS = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isGuest, guestProfile, clearGuest } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;
  const { canAccess } = useSubscription();
  const [paywallFeature, setPaywallFeature] = useState<{ name: string; icon: string; tier: "basic" | "advanced"; desc?: string } | null>(null);
  const [editing, setEditing] = useState(false);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("build_muscle");
  const [workoutStyle, setWorkoutStyle] = useState("gym");
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [daysPerWeek, setDaysPerWeek] = useState("4");

  const { data: profile, refetch: refetchProfile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });

  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => { refetchProfile(); setEditing(false); Alert.alert("Saved!", "Profile updated successfully."); },
    onError: (e) => Alert.alert("Error", e.message),
  });

  useEffect(() => {
    if (profile) {
      setAge(profile.age?.toString() ?? "");
      setGender(profile.gender ?? "male");
      setHeight(profile.heightCm?.toString() ?? "");
      setWeight(profile.weightKg?.toString() ?? "");
      setGoal(profile.goal ?? "build_muscle");
      setWorkoutStyle(profile.workoutStyle ?? "gym");
      setDietaryPref(profile.dietaryPreference ?? "omnivore");
      setDaysPerWeek(profile.daysPerWeek?.toString() ?? "4");
    }
  }, [profile]);

  function saveProfile() {
    upsertProfile.mutate({
      age: age ? parseInt(age) : undefined,
      gender,
      heightCm: height ? parseFloat(height) : undefined,
      weightKg: weight ? parseFloat(weight) : undefined,
      goal,
      workoutStyle,
      dietaryPreference: dietaryPref,
      daysPerWeek: daysPerWeek ? parseInt(daysPerWeek) : 4,
    });
  }

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
        <ImageBackground source={{ uri: HERO_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.78)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Image source={{ uri: APP_LOGO }} style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 20 }} />
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Your Profile</Text>
            <Text style={{ color: "#92400E", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in to save your profile and sync across devices, or continue as guest.</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, marginBottom: 12 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Sign In / Create Account</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  const displayName = isAuthenticated ? (user?.name ?? "Athlete") : (guestProfile?.name ?? "Guest Athlete");
  const displayEmail = isAuthenticated ? (user?.email ?? "") : "Guest Mode";

  const gatedNav = (path: string, feature: string, icon: string, tier: "basic" | "advanced", desc?: string) => {
    if (canAccess(feature)) {
      router.push(path as any);
    } else {
      setPaywallFeature({ name: feature.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon, tier, desc });
    }
  };

  return (
    <>
    <PaywallModal
      visible={!!paywallFeature}
      onClose={() => setPaywallFeature(null)}
      featureName={paywallFeature?.name ?? ""}
      featureIcon={paywallFeature?.icon}
      requiredTier={paywallFeature?.tier ?? "basic"}
      description={paywallFeature?.desc}
    />
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Hero Header */}
        <ImageBackground source={{ uri: HERO_BG }} style={{ height: 200 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.65)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, right: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
            onPress={() => router.push("/user-guide" as any)}
          >
            <Text style={{ color: "#FBBF24", fontSize: 13 }}>?</Text>
            <Text style={{ color: "#FBBF24", fontFamily: "DMSans_500Medium", fontSize: 11 }}>Guide</Text>
          </TouchableOpacity>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#F59E0B" }}>
                  <MaterialIcons name="fitness-center" size={28} color="#F59E0B" />
                </View>
                <View>
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>{displayName}</Text>
                  <Text style={{ color: "#92400E", fontSize: 12 }}>{displayEmail}</Text>
                  {isGuest && (
                    <View style={{ backgroundColor: "#EAB30820", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: "flex-start" }}>
                      <Text style={{ color: "#F59E0B", fontSize: 10, fontFamily: "Outfit_700Bold" }}>GUEST MODE</Text>
                    </View>
                  )}
                </View>
              </View>
              {isAuthenticated && (
                <TouchableOpacity
                  style={{ backgroundColor: editing ? "#FDE68A" : "rgba(124,58,237,0.4)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: editing ? "#FDE68A" : "rgba(124,58,237,0.6)" }}
                  onPress={editing ? saveProfile : () => setEditing(true)}
                >
                  {upsertProfile.isPending ? (
                    <ActivityIndicator color="#FFF7ED" size="small" />
                  ) : (
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 13 }}>{editing ? "Save" : "Edit"}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ImageBackground>

        {/* Stats Row */}
        {profile && (
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 20 }}>
            <StatBox label="Height" value={profile.heightCm ? `${profile.heightCm}cm` : "—"} />
            <StatBox label="Weight" value={profile.weightKg ? `${profile.weightKg}kg` : "—"} />
            <StatBox label="Body Fat" value={profile.currentBodyFat ? `${profile.currentBodyFat}%` : "—"} />
            <StatBox label="Target BF" value={profile.targetBodyFat ? `${profile.targetBodyFat}%` : "—"} />
          </View>
        )}

        {/* Profile Form */}
        <View style={{ paddingHorizontal: 20 }}>
          {/* Basic Info */}
          <SectionHeader>Basic Info</SectionHeader>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#92400E", fontSize: 11, marginBottom: 4 }}>Age</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="25"
                placeholderTextColor="#451A03"
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: "#150A00", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? "#FFF7ED" : "#92400E", fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                returnKeyType="done"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#92400E", fontSize: 11, marginBottom: 4 }}>Height (cm)</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="175"
                placeholderTextColor="#451A03"
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: "#150A00", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? "#FFF7ED" : "#92400E", fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                returnKeyType="done"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#92400E", fontSize: 11, marginBottom: 4 }}>Weight (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="80"
                placeholderTextColor="#451A03"
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: "#150A00", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? "#FFF7ED" : "#92400E", fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Gender */}
          <Text style={{ color: "#92400E", fontSize: 11, marginBottom: 6 }}>Gender</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: gender === g.key ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: gender === g.key ? "#F59E0B" : "rgba(245,158,11,0.10)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setGender(g.key)}
              >
                <Text style={{ color: gender === g.key ? "#FFF7ED" : "#92400E", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Goal */}
          <SectionHeader>Fitness Goal</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: goal === g.key ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: goal === g.key ? "#F59E0B" : "rgba(245,158,11,0.10)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setGoal(g.key)}
              >
                <MaterialIcons name={g.iconName as any} size={14} color={goal === g.key ? "#FFF7ED" : "#F59E0B"} />
                <Text style={{ color: goal === g.key ? "#FFF7ED" : "#92400E", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Workout Style */}
          <SectionHeader>Workout Style</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {WORKOUT_STYLES.map(w => (
              <TouchableOpacity
                key={w.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: workoutStyle === w.key ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: workoutStyle === w.key ? "#F59E0B" : "rgba(245,158,11,0.10)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setWorkoutStyle(w.key)}
              >
                <MaterialIcons name={w.iconName as any} size={14} color={workoutStyle === w.key ? "#FFF7ED" : "#F59E0B"} />
                <Text style={{ color: workoutStyle === w.key ? "#FFF7ED" : "#92400E", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dietary Preference */}
          <SectionHeader>Dietary Preference</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {DIETARY_PREFS.map(d => (
              <TouchableOpacity
                key={d.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: dietaryPref === d.key ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: dietaryPref === d.key ? "#F59E0B" : "rgba(245,158,11,0.10)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setDietaryPref(d.key)}
              >
                <MaterialIcons name={d.iconName as any} size={14} color={dietaryPref === d.key ? "#FFF7ED" : "#F59E0B"} />
                <Text style={{ color: dietaryPref === d.key ? "#FFF7ED" : "#92400E", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Days Per Week */}
          <SectionHeader>Training Days / Week</SectionHeader>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
            {[3, 4, 5, 6].map(d => (
              <TouchableOpacity
                key={d}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d.toString() ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: daysPerWeek === d.toString() ? "#F59E0B" : "rgba(245,158,11,0.10)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setDaysPerWeek(d.toString())}
              >
                <Text style={{ color: daysPerWeek === d.toString() ? "#FFF7ED" : "#92400E", fontFamily: "Outfit_700Bold" }}>{d}x</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Links — Collapsible Sections (2C) */}
          <CollapsibleSection title="Training Tools" count={5}>
            <FeatureLink icon="trending-up" label="Progress Photos" onPress={() => gatedNav("/progress-photos", "progress_photos", "trending-up", "basic", "Track your body transformation with up to 5 progress photos per month on Basic, unlimited on Advanced.")} />
            <FeatureLink icon="check-circle" label="Daily Check-In" onPress={() => router.push("/daily-checkin" as any)} />
            <FeatureLink icon="center-focus-strong" label="Form Checker" onPress={() => gatedNav("/form-checker", "form_checker", "center-focus-strong", "advanced", "AI-powered real-time exercise form analysis is an Advanced plan exclusive feature.")} />
            <FeatureLink icon="calendar-today" label="Workout History" onPress={() => router.push("/workout-calendar" as any)} />
            <FeatureLink icon="timer" label="Rest Timer Settings" onPress={() => router.push("/rest-timer-settings" as any)} />
          </CollapsibleSection>

          <CollapsibleSection title="Social & Extras" count={5}>
            <FeatureLink icon="group" label="Social Feed" onPress={() => gatedNav("/social-feed", "social_feed", "group", "advanced", "Join the PeakPulse community, share progress, and compete in challenges — Advanced plan only.")} />
            <FeatureLink icon="bolt" label="7-Day Challenge" onPress={() => gatedNav("/challenge-onboarding", "challenges", "bolt", "advanced", "Unlock 7-day fitness challenges and leaderboards with an Advanced plan.")} />
            <FeatureLink icon="card-giftcard" label="Refer a Friend" onPress={() => gatedNav("/referral", "referral", "card-giftcard", "basic", "Refer friends and earn rewards — available on Basic and Advanced plans.")} />
            <FeatureLink icon="watch" label="Wearable Sync" onPress={() => gatedNav("/wearable-sync", "wearable_sync", "watch", "basic", "Sync your fitness wearable (Apple Watch, Fitbit, Garmin) with PeakPulse — Basic plan and above.")} />
            <FeatureLink icon="location-on" label="Find Nearby Gyms" onPress={() => router.push("/gym-finder" as any)} />
          </CollapsibleSection>

          {/* Notifications */}
          <View style={{ gap: 8, marginBottom: 16 }}>
            <FeatureLink icon="notifications" label="Notification Preferences" onPress={() => gatedNav("/notification-preferences", "notification_preferences", "notifications", "basic", "Customise your workout and meal reminder times — available on Basic and Advanced plans.")} />
          </View>

          {/* Appearance */}
          <SectionHeader>Appearance</SectionHeader>
          <ThemeToggle />

          {/* Subscription */}
          <SectionHeader>Subscription</SectionHeader>
          <TouchableOpacity
            style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
            onPress={() => router.push("/subscription" as any)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="workspace-premium" size={20} color="#FFF7ED" />
              <View>
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Upgrade to Advanced</Text>
                <Text style={{ color: "#FDE68A", fontSize: 12, marginTop: 2 }}>Unlock all AI features from $4.99/mo</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#FFF7ED" />
          </TouchableOpacity>

          {/* Guest mode — upgrade CTA */}
          {isGuest && (
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 10, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, flexDirection: "row", justifyContent: "center", gap: 8 }}
              onPress={() => router.push("/login" as any)}
            >
              <MaterialIcons name="lock" size={16} color="#FFF7ED" />
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Sign In to Sync Your Data</Text>
            </TouchableOpacity>
          )}

          {/* Logout */}
          <TouchableOpacity
            style={{ backgroundColor: "#EF444420", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#EF444440" }}
            onPress={() => {
              if (isGuest) {
                clearGuest();
              } else {
                router.push("/logout" as any);
              }
            }}
          >
            <Text style={{ color: "#92400E", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{isGuest ? "Exit Guest Mode" : "Sign Out"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{children}</Text>;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{value}</Text>
      <Text style={{ color: "#78350F", fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function FeatureLink({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1C0E02", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
      onPress={onPress}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
        <MaterialIcons name={icon as any} size={20} color="#F59E0B" />
      </View>
      <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 14, flex: 1 }}>{label}</Text>
      <MaterialIcons name="chevron-right" size={20} color="#92400E" />
    </TouchableOpacity>
  );
}

// 2C: Collapsible section component
function CollapsibleSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? 8 : 0 }}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpanded(!expanded);
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, textTransform: "uppercase" }}>{title}</Text>
          <View style={{ backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: "#F59E0B", fontSize: 10, fontFamily: "DMSans_600SemiBold" }}>{count}</Text>
          </View>
        </View>
        <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={20} color="#92400E" />
      </TouchableOpacity>
      {expanded && <View style={{ gap: 8 }}>{children}</View>}
    </View>
  );
}

const THEME_OPTIONS: Array<{ key: ThemePreference; label: string; icon: keyof typeof MaterialIcons.glyphMap; desc: string }> = [
  { key: "system", label: "System", icon: "phone-iphone", desc: "Follow device setting" },
  { key: "light", label: "Light", icon: "light-mode", desc: "Always light" },
  { key: "dark", label: "Dark", icon: "dark-mode", desc: "Always dark" },
];

function ThemeToggle() {
  const { themePreference, setThemePreference } = useThemeContext();

  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      {THEME_OPTIONS.map((opt) => {
        const active = themePreference === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              backgroundColor: active ? "rgba(245,158,11,0.10)" : "#150A00",
              borderRadius: 14, padding: 14,
              borderWidth: 1,
              borderColor: active ? "rgba(245,158,11,0.30)" : "rgba(245,158,11,0.10)",
            }}
            onPress={() => {
              setThemePreference(opt.key);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <MaterialIcons name={opt.icon} size={20} color={active ? "#F59E0B" : "#92400E"} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: active ? "#F59E0B" : "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{opt.label}</Text>
              <Text style={{ color: "#92400E", fontSize: 11, marginTop: 1 }}>{opt.desc}</Text>
            </View>
            {active && (
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="check" size={14} color="#0A0500" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
