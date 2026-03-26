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
import * as ImagePicker from "expo-image-picker";
import { useUserProfile } from "@/lib/user-profile-context";
import { Modal } from "react-native";
import { PremiumFeatureBanner, PremiumFeatureTeaser } from "@/components/premium-feature-banner";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// NanoBanana design tokens
const BG = "#0A0E14";
const SURFACE = "#111827";
const SURFACE2 = "#1E293B";
const FG = "#F1F5F9";
const MUTED = "#64748B";
const GOLD = "#F59E0B";
const GOLD_DIM = "rgba(245,158,11,0.10)";
const GOLD_BORDER = "rgba(245,158,11,0.25)";
const ICE = "#06B6D4";
const CREAM = "#FDE68A";

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
  const subscription = useSubscription();
  const { canAccess } = subscription;
  const [paywallFeature, setPaywallFeature] = useState<{ name: string; icon: string; tier: "basic" | "advanced"; desc?: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const { profilePhotoUri, displayName: savedDisplayName, setProfilePhoto, setDisplayName: saveDisplayName } = useUserProfile();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

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
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ImageBackground source={{ uri: HERO_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.78)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Image source={{ uri: APP_LOGO }} style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 20 }} />
            <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Your Profile</Text>
            <Text style={{ color: MUTED, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in to save your profile, or continue as guest.</Text>
            <TouchableOpacity
              style={{ backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, shadowColor: GOLD, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, marginBottom: 12 }}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>Sign In / Create Account</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  const displayName = savedDisplayName ?? (isAuthenticated ? (user?.name ?? "Athlete") : (guestProfile?.name ?? "Guest Athlete"));
  const displayEmail = isAuthenticated ? (user?.email ?? "") : "Guest Mode";

  const pickImageFromLibrary = async () => {
    setShowPhotoOptions(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await setProfilePhoto(result.assets[0].uri);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const takePhoto = async () => {
    setShowPhotoOptions(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to take a profile photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await setProfilePhoto(result.assets[0].uri);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const removePhoto = async () => {
    setShowPhotoOptions(false);
    await setProfilePhoto(null);
  };

  const startEditingName = () => {
    setNameInput(displayName);
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length > 0) {
      await saveDisplayName(trimmed);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingName(false);
  };

  const gatedNav = (path: string, feature: string, icon: string, tier: "basic" | "advanced", desc?: string) => {
    if (canAccess(feature)) {
      router.push(path as any);
    } else {
      setPaywallFeature({ name: feature.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), icon, tier, desc });
    }
  };

  return (
    <>
    <PhotoOptionsModal
      visible={showPhotoOptions}
      onClose={() => setShowPhotoOptions(false)}
      onPickLibrary={pickImageFromLibrary}
      onTakePhoto={takePhoto}
      onRemove={profilePhotoUri ? removePhoto : undefined}
    />
    <PaywallModal
      visible={!!paywallFeature}
      onClose={() => setPaywallFeature(null)}
      featureName={paywallFeature?.name ?? ""}
      featureIcon={paywallFeature?.icon}
      requiredTier={paywallFeature?.tier ?? "basic"}
      description={paywallFeature?.desc}
    />
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Hero Header */}
        <ImageBackground source={{ uri: HERO_BG }} style={{ height: 200 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.65)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, right: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: GOLD_DIM, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: GOLD_BORDER }}
            onPress={() => router.push("/user-guide" as any)}
          >
            <Text style={{ color: GOLD, fontSize: 13 }}>?</Text>
            <Text style={{ color: GOLD, fontFamily: "DMSans_500Medium", fontSize: 11 }}>Guide</Text>
          </TouchableOpacity>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <TouchableOpacity
                  onPress={() => { setShowPhotoOptions(true); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{ position: "relative" }}
                >
                  {profilePhotoUri ? (
                    <Image source={{ uri: profilePhotoUri }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: GOLD }} />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: GOLD }}>
                      <MaterialIcons name="fitness-center" size={28} color={GOLD} />
                    </View>
                  )}
                  <View style={{ position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: BG }}>
                    <MaterialIcons name="camera-alt" size={12} color={BG} />
                  </View>
                </TouchableOpacity>
                <View>
                  {editingName ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <TextInput
                        value={nameInput}
                        onChangeText={setNameInput}
                        autoFocus
                        maxLength={30}
                        onSubmitEditing={saveName}
                        returnKeyType="done"
                        style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 20, borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 2, minWidth: 100 }}
                        placeholderTextColor={MUTED}
                        placeholder="Your name"
                      />
                      <TouchableOpacity onPress={saveName} style={{ padding: 4 }}>
                        <MaterialIcons name="check" size={20} color={GOLD} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingName(false)} style={{ padding: 4 }}>
                        <MaterialIcons name="close" size={18} color={MUTED} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={startEditingName} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 20 }}>{displayName}</Text>
                      <MaterialIcons name="edit" size={14} color={MUTED} />
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: MUTED, fontSize: 12 }}>{displayEmail}</Text>
                  {isGuest && (
                    <View style={{ backgroundColor: GOLD_DIM, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: "flex-start" }}>
                      <Text style={{ color: GOLD, fontSize: 10, fontFamily: "DMSans_700Bold" }}>GUEST MODE</Text>
                    </View>
                  )}
                </View>
              </View>
              {isAuthenticated && (
                <TouchableOpacity
                  style={{ backgroundColor: editing ? GOLD : SURFACE2, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: editing ? GOLD : "rgba(30,41,59,0.6)" }}
                  onPress={editing ? saveProfile : () => setEditing(true)}
                >
                  {upsertProfile.isPending ? (
                    <ActivityIndicator color={FG} size="small" />
                  ) : (
                    <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{editing ? "Save" : "Edit"}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ImageBackground>

        {/* Subscription Status Card */}
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <SubscriptionStatusCard
            tier={subscription.tier}
            billingCycle={subscription.billingCycle}
            expiresAt={subscription.expiresAt}
            isTrialActive={subscription.isTrialActive}
            daysLeftInTrial={subscription.daysLeftInTrial}
            onUpgrade={() => router.push("/subscription" as any)}
          />
        </View>

        {/* Personal Info Summary */}
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <PersonalInfoCard
            name={displayName}
            email={displayEmail}
            isGuest={isGuest}
            age={age}
            gender={gender}
            height={height}
            weight={weight}
            goal={GOALS.find(g => g.key === goal)?.label ?? "—"}
            workoutStyle={WORKOUT_STYLES.find(w => w.key === workoutStyle)?.label ?? "—"}
            dietaryPref={DIETARY_PREFS.find(d => d.key === dietaryPref)?.label ?? "—"}
            daysPerWeek={daysPerWeek}
            bodyFat={profile?.currentBodyFat?.toString() ?? null}
            targetBF={profile?.targetBodyFat?.toString() ?? null}
          />
        </View>

        {/* Premium Feature Promotions */}
        <View style={{ marginHorizontal: 20, marginBottom: 16, gap: 8 }}>
          <PremiumFeatureBanner
            feature="ai_coaching"
            title="Personalised AI Coach"
            description="Your AI fitness coach provides real-time guidance, exercise form tips, and workout adjustments tailored to your goals."
            icon="smart-toy"
            accentColor="#F59E0B"
            requiredTier="advanced"
            compact
          />
          <PremiumFeatureTeaser
            feature="body_scan"
            text="AI Body Scan — track your physique transformation with AI"
            requiredTier="basic"
          />
          <PremiumFeatureTeaser
            feature="wearable_sync"
            text="Connect your wearable for real-time health data sync"
            requiredTier="basic"
          />
        </View>

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
              <Text style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>Age</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="25"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? FG : MUTED, fontSize: 14, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}
                returnKeyType="done"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>Height (cm)</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="175"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? FG : MUTED, fontSize: 14, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}
                returnKeyType="done"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>Weight (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="80"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: SURFACE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? FG : MUTED, fontSize: 14, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Gender */}
          <Text style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>Gender</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: gender === g.key ? GOLD : SURFACE, borderWidth: 1, borderColor: gender === g.key ? GOLD : "rgba(30,41,59,0.6)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setGender(g.key)}
              >
                <Text style={{ color: gender === g.key ? FG : MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Goal */}
          <SectionHeader>Fitness Goal</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: goal === g.key ? GOLD : SURFACE, borderWidth: 1, borderColor: goal === g.key ? GOLD : "rgba(30,41,59,0.6)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setGoal(g.key)}
              >
                <MaterialIcons name={g.iconName as any} size={14} color={goal === g.key ? FG : GOLD} />
                <Text style={{ color: goal === g.key ? FG : MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Workout Style */}
          <SectionHeader>Workout Style</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {WORKOUT_STYLES.map(w => (
              <TouchableOpacity
                key={w.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: workoutStyle === w.key ? GOLD : SURFACE, borderWidth: 1, borderColor: workoutStyle === w.key ? GOLD : "rgba(30,41,59,0.6)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setWorkoutStyle(w.key)}
              >
                <MaterialIcons name={w.iconName as any} size={14} color={workoutStyle === w.key ? FG : GOLD} />
                <Text style={{ color: workoutStyle === w.key ? FG : MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dietary Preference */}
          <SectionHeader>Dietary Preference</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {DIETARY_PREFS.map(d => (
              <TouchableOpacity
                key={d.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: dietaryPref === d.key ? GOLD : SURFACE, borderWidth: 1, borderColor: dietaryPref === d.key ? GOLD : "rgba(30,41,59,0.6)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setDietaryPref(d.key)}
              >
                <MaterialIcons name={d.iconName as any} size={14} color={dietaryPref === d.key ? FG : GOLD} />
                <Text style={{ color: dietaryPref === d.key ? FG : MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Days Per Week */}
          <SectionHeader>Training Days / Week</SectionHeader>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
            {[3, 4, 5, 6].map(d => (
              <TouchableOpacity
                key={d}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d.toString() ? GOLD : SURFACE, borderWidth: 1, borderColor: daysPerWeek === d.toString() ? GOLD : "rgba(30,41,59,0.6)", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setDaysPerWeek(d.toString())}
              >
                <Text style={{ color: daysPerWeek === d.toString() ? FG : MUTED, fontFamily: "DMSans_700Bold" }}>{d}x</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Links — Collapsible Sections (2C) */}
          <CollapsibleSection title="Training Tools" count={5}>
            <FeatureLink icon="trending-up" label="Progress Photos" onPress={() => gatedNav("/progress-photos", "progress_photos", "trending-up", "basic", "Track your body transformation with up to 5 progress photos per month on Basic, unlimited on Advanced.")} />
            <FeatureLink icon="check-circle" label="Daily Check-In" onPress={() => router.push("/daily-checkin" as any)} />
            <FeatureLink icon="center-focus-strong" label="Form Checker" onPress={() => gatedNav("/form-checker", "form_checker", "center-focus-strong", "advanced", "AI-powered real-time exercise form analysis is an Advanced plan exclusive feature.")} />
            <FeatureLink icon="calendar-today" label="Workout History" onPress={() => router.push("/workout-calendar" as any)} />
            <FeatureLink icon="bar-chart" label="Workout Analytics" onPress={() => router.push("/workout-analytics" as any)} />
            <FeatureLink icon="timer" label="Rest Timer Settings" onPress={() => router.push("/rest-timer-settings" as any)} />
            <FeatureLink icon="music-note" label="Timer Sounds" onPress={() => router.push("/rest-timer-sounds" as any)} />
            <FeatureLink icon="cloud-off" label="Offline Mode" onPress={() => router.push("/offline-cache" as any)} />
            <FeatureLink icon="record-voice-over" label="Voice Coach Settings" onPress={() => router.push("/voice-coach-settings" as any)} />
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

          {/* App Settings */}
          <SectionHeader>App Settings</SectionHeader>
          <View style={{ gap: 8, marginBottom: 16 }}>
            <FeatureLink icon="settings" label="Settings" onPress={() => router.push("/settings" as any)} />
          </View>

          {/* Feedback */}
          <SectionHeader>Help & Feedback</SectionHeader>
          <View style={{ gap: 8, marginBottom: 16 }}>
            <FeatureLink icon="feedback" label="Send Feedback" onPress={() => router.push("/feedback" as any)} />
            <FeatureLink icon="help-outline" label="User Guide" onPress={() => router.push("/user-guide" as any)} />
          </View>

          {/* Subscription */}
          {!subscription.isAdvanced && (
            <>
              <SectionHeader>Subscription</SectionHeader>
              <TouchableOpacity
                style={{ backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                onPress={() => router.push("/subscription" as any)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="workspace-premium" size={20} color={FG} />
                  <View>
                    <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Upgrade to Advanced</Text>
                    <Text style={{ color: CREAM, fontSize: 12, marginTop: 2 }}>Unlock all AI features from $4.99/mo</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={FG} />
              </TouchableOpacity>
            </>
          )}

          {/* Guest mode — upgrade CTA */}
          {isGuest && (
            <TouchableOpacity
              style={{ backgroundColor: GOLD, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 10, shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, flexDirection: "row", justifyContent: "center", gap: 8 }}
              onPress={() => router.push("/login" as any)}
            >
              <MaterialIcons name="lock" size={16} color={FG} />
              <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Sign In to Sync Your Data</Text>
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
            <Text style={{ color: MUTED, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{isGuest ? "Exit Guest Mode" : "Sign Out"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{children}</Text>;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}>
      <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{value}</Text>
      <Text style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function FeatureLink({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SURFACE2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}
      onPress={onPress}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}>
        <MaterialIcons name={icon as any} size={20} color={GOLD} />
      </View>
      <Text style={{ color: GOLD, fontFamily: "DMSans_600SemiBold", fontSize: 14, flex: 1 }}>{label}</Text>
      <MaterialIcons name="chevron-right" size={20} color={MUTED} />
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
          <Text style={{ color: MUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, textTransform: "uppercase" }}>{title}</Text>
          <View style={{ backgroundColor: GOLD_DIM, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: GOLD, fontSize: 10, fontFamily: "DMSans_600SemiBold" }}>{count}</Text>
          </View>
        </View>
        <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={20} color={MUTED} />
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

// ── Subscription Status Card ──────────────────────────────────────────────
function SubscriptionStatusCard({
  tier,
  billingCycle,
  expiresAt,
  isTrialActive,
  daysLeftInTrial,
  onUpgrade,
}: {
  tier: string;
  billingCycle: string | null;
  expiresAt: string | null;
  isTrialActive: boolean;
  daysLeftInTrial: number;
  onUpgrade: () => void;
}) {
  const tierLabel = tier === "advanced" ? "Advanced" : tier === "basic" ? "Basic" : "Free";
  const tierColor = tier === "advanced" ? GOLD : tier === "basic" ? ICE : MUTED;
  const tierIcon = tier === "advanced" ? "workspace-premium" : tier === "basic" ? "star" : "person";
  const billingLabel = billingCycle === "annual" ? "Annual" : billingCycle === "monthly" ? "Monthly" : null;
  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tier === "free" ? "rgba(30,41,59,0.6)" : `${tierColor}33` }}>
      {/* Tier Badge Row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${tierColor}15`, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${tierColor}30` }}>
            <MaterialIcons name={tierIcon as any} size={20} color={tierColor} />
          </View>
          <View>
            <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{tierLabel} Plan</Text>
            {billingLabel && <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>{billingLabel} billing</Text>}
          </View>
        </View>
        {tier === "free" && (
          <TouchableOpacity
            style={{ backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}
            onPress={onUpgrade}
          >
            <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Trial Status */}
      {isTrialActive && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${ICE}15`, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: `${ICE}30` }}>
          <MaterialIcons name="timer" size={16} color={ICE} />
          <Text style={{ color: ICE, fontFamily: "DMSans_600SemiBold", fontSize: 12, flex: 1 }}>
            Free trial active — {daysLeftInTrial} day{daysLeftInTrial !== 1 ? "s" : ""} remaining
          </Text>
        </View>
      )}

      {/* Expiry / Status Info */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: SURFACE2, borderRadius: 10, padding: 10, alignItems: "center" }}>
          <Text style={{ color: MUTED, fontSize: 10, marginBottom: 2 }}>Status</Text>
          <Text style={{ color: tier === "free" ? MUTED : "#4ADE80", fontFamily: "SpaceMono_400Regular", fontSize: 12 }}>
            {tier === "free" ? (isTrialActive ? "Trial" : "Free") : "Active"}
          </Text>
        </View>
        {expiryDate && (
          <View style={{ flex: 1, backgroundColor: SURFACE2, borderRadius: 10, padding: 10, alignItems: "center" }}>
            <Text style={{ color: MUTED, fontSize: 10, marginBottom: 2 }}>Renews</Text>
            <Text style={{ color: FG, fontFamily: "SpaceMono_400Regular", fontSize: 12 }}>{expiryDate}</Text>
          </View>
        )}
        <View style={{ flex: 1, backgroundColor: SURFACE2, borderRadius: 10, padding: 10, alignItems: "center" }}>
          <Text style={{ color: MUTED, fontSize: 10, marginBottom: 2 }}>Features</Text>
          <Text style={{ color: tierColor, fontFamily: "SpaceMono_400Regular", fontSize: 12 }}>
            {tier === "advanced" ? "All" : tier === "basic" ? "Core" : isTrialActive ? "All" : "Limited"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Personal Info Summary Card ───────────────────────────────────────────
function PersonalInfoCard({
  name,
  email,
  isGuest,
  age,
  gender,
  height,
  weight,
  goal,
  workoutStyle,
  dietaryPref,
  daysPerWeek,
  bodyFat,
  targetBF,
}: {
  name: string;
  email: string;
  isGuest: boolean;
  age: string;
  gender: string;
  height: string;
  weight: string;
  goal: string;
  workoutStyle: string;
  dietaryPref: string;
  daysPerWeek: string;
  bodyFat: string | null;
  targetBF: string | null;
}) {
  const rows: Array<{ icon: string; label: string; value: string }> = [
    { icon: "person", label: "Name", value: name },
    { icon: "email", label: "Email", value: isGuest ? "Guest Mode" : email },
    { icon: "cake", label: "Age", value: age ? `${age} years` : "Not set" },
    { icon: "wc", label: "Gender", value: gender.charAt(0).toUpperCase() + gender.slice(1) },
    { icon: "straighten", label: "Height", value: height ? `${height} cm` : "Not set" },
    { icon: "monitor-weight", label: "Weight", value: weight ? `${weight} kg` : "Not set" },
    { icon: "flag", label: "Goal", value: goal },
    { icon: "fitness-center", label: "Style", value: workoutStyle },
    { icon: "restaurant", label: "Diet", value: dietaryPref },
    { icon: "calendar-today", label: "Training", value: `${daysPerWeek}x per week` },
  ];
  if (bodyFat) rows.push({ icon: "speed", label: "Body Fat", value: `${bodyFat}%` });
  if (targetBF) rows.push({ icon: "track-changes", label: "Target BF", value: `${targetBF}%` });

  return (
    <View style={{ backgroundColor: SURFACE, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(30,41,59,0.4)" }}>
        <MaterialIcons name="badge" size={18} color={GOLD} />
        <Text style={{ color: FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Personal Information</Text>
      </View>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: "rgba(30,41,59,0.25)" }}>
          <View style={{ width: 28, alignItems: "center" }}>
            <MaterialIcons name={row.icon as any} size={16} color={MUTED} />
          </View>
          <Text style={{ color: MUTED, fontSize: 12, width: 70 }}>{row.label}</Text>
          <Text style={{ color: FG, fontFamily: "DMSans_500Medium", fontSize: 13, flex: 1 }}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Photo Options Modal ─────────────────────────────────────────────────
function PhotoOptionsModal({
  visible,
  onClose,
  onPickLibrary,
  onTakePhoto,
  onRemove,
}: {
  visible: boolean;
  onClose: () => void;
  onPickLibrary: () => void;
  onTakePhoto: () => void;
  onRemove?: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{ backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: MUTED, alignSelf: "center", marginBottom: 20, opacity: 0.5 }} />
          <Text style={{ color: FG, fontFamily: "BebasNeue_400Regular", fontSize: 20, textAlign: "center", marginBottom: 20 }}>Profile Photo</Text>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: SURFACE2, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}
            onPress={onPickLibrary}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="photo-library" size={22} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: FG, fontFamily: "DMSans_600SemiBold", fontSize: 15 }}>Choose from Library</Text>
              <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Select an existing photo</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: SURFACE2, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}
            onPress={onTakePhoto}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: GOLD_DIM, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="camera-alt" size={22} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: FG, fontFamily: "DMSans_600SemiBold", fontSize: 15 }}>Take a Photo</Text>
              <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Use your camera</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={MUTED} />
          </TouchableOpacity>
          {onRemove && (
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#EF444415", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#EF444430" }}
              onPress={onRemove}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EF444420", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="delete" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#EF4444", fontFamily: "DMSans_600SemiBold", fontSize: 15 }}>Remove Photo</Text>
                <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Reset to default avatar</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{ marginTop: 8, paddingVertical: 14, alignItems: "center", backgroundColor: SURFACE2, borderRadius: 14, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)" }}
            onPress={onClose}
          >
            <Text style={{ color: MUTED, fontFamily: "DMSans_600SemiBold", fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

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
              backgroundColor: active ? GOLD_DIM : SURFACE,
              borderRadius: 14, padding: 14,
              borderWidth: 1,
              borderColor: active ? GOLD_BORDER : "rgba(30,41,59,0.6)",
            }}
            onPress={() => {
              setThemePreference(opt.key);
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <MaterialIcons name={opt.icon} size={20} color={active ? GOLD : MUTED} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: active ? GOLD : FG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{opt.label}</Text>
              <Text style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>{opt.desc}</Text>
            </View>
            {active && (
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="check" size={14} color={BG} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
