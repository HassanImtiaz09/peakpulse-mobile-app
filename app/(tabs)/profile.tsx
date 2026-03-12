import React, { useState, useEffect } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const GOALS = [
  { key: "build_muscle", label: "Build Muscle", icon: "💪" },
  { key: "lose_fat", label: "Lose Fat", icon: "🔥" },
  { key: "maintain", label: "Maintain", icon: "⚖️" },
  { key: "athletic", label: "Athletic", icon: "🏃" },
];

const WORKOUT_STYLES = [
  { key: "gym", label: "Gym", icon: "🏋️" },
  { key: "home", label: "Home", icon: "🏠" },
  { key: "mix", label: "Mix", icon: "🔄" },
  { key: "calisthenics", label: "Calisthenics", icon: "🤸" },
];

const DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", icon: "🍗" },
  { key: "halal", label: "Halal", icon: "☪️" },
  { key: "vegan", label: "Vegan", icon: "🌱" },
  { key: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { key: "keto", label: "Keto", icon: "🥑" },
  { key: "paleo", label: "Paleo", icon: "🥩" },
];

const GENDERS = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "other", label: "Other" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
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

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <View style={{ alignItems: "center", gap: 16 }}>
          <Text style={{ fontSize: 48 }}>👤</Text>
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 20 }}>Sign In Required</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center" }}>Create an account to save your profile and sync across devices</Text>
          <TouchableOpacity
            style={{ backgroundColor: "#7C3AED", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 }}
            onPress={() => router.push("/login" as any)}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Sign In / Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800" }}>Profile</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 2 }}>{user?.email ?? user?.name ?? "Athlete"}</Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: editing ? "#22C55E" : "#7C3AED", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}
            onPress={editing ? saveProfile : () => setEditing(true)}
          >
            {upsertProfile.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>{editing ? "Save" : "Edit"}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#7C3AED30", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#7C3AED" }}>
            <Text style={{ fontSize: 36 }}>💪</Text>
          </View>
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 18, marginTop: 10 }}>{user?.name ?? "Athlete"}</Text>
          {profile?.goal && (
            <Text style={{ color: "#A78BFA", fontSize: 13, marginTop: 4 }}>
              {GOALS.find(g => g.key === profile.goal)?.icon} {GOALS.find(g => g.key === profile.goal)?.label}
            </Text>
          )}
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
              <Text style={{ color: "#9CA3AF", fontSize: 11, marginBottom: 4 }}>Age</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="25"
                placeholderTextColor="#4B5563"
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: "#13131F", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? "#FFFFFF" : "#9CA3AF", fontSize: 14, borderWidth: 1, borderColor: "#1F2937" }}
                returnKeyType="done"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 11, marginBottom: 4 }}>Height (cm)</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="175"
                placeholderTextColor="#4B5563"
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: "#13131F", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? "#FFFFFF" : "#9CA3AF", fontSize: 14, borderWidth: 1, borderColor: "#1F2937" }}
                returnKeyType="done"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 11, marginBottom: 4 }}>Weight (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="80"
                placeholderTextColor="#4B5563"
                keyboardType="numeric"
                editable={editing}
                style={{ backgroundColor: "#13131F", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: editing ? "#FFFFFF" : "#9CA3AF", fontSize: 14, borderWidth: 1, borderColor: "#1F2937" }}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Gender */}
          <Text style={{ color: "#9CA3AF", fontSize: 11, marginBottom: 6 }}>Gender</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: gender === g.key ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: gender === g.key ? "#7C3AED" : "#1F2937", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setGender(g.key)}
              >
                <Text style={{ color: gender === g.key ? "#FFFFFF" : "#9CA3AF", fontWeight: "600", fontSize: 12 }}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Goal */}
          <SectionHeader>Fitness Goal</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: goal === g.key ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: goal === g.key ? "#7C3AED" : "#1F2937", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setGoal(g.key)}
              >
                <Text style={{ fontSize: 14 }}>{g.icon}</Text>
                <Text style={{ color: goal === g.key ? "#FFFFFF" : "#9CA3AF", fontWeight: "600", fontSize: 13 }}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Workout Style */}
          <SectionHeader>Workout Style</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {WORKOUT_STYLES.map(w => (
              <TouchableOpacity
                key={w.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: workoutStyle === w.key ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: workoutStyle === w.key ? "#7C3AED" : "#1F2937", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setWorkoutStyle(w.key)}
              >
                <Text style={{ fontSize: 14 }}>{w.icon}</Text>
                <Text style={{ color: workoutStyle === w.key ? "#FFFFFF" : "#9CA3AF", fontWeight: "600", fontSize: 13 }}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dietary Preference */}
          <SectionHeader>Dietary Preference</SectionHeader>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {DIETARY_PREFS.map(d => (
              <TouchableOpacity
                key={d.key}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: dietaryPref === d.key ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: dietaryPref === d.key ? "#7C3AED" : "#1F2937", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setDietaryPref(d.key)}
              >
                <Text style={{ fontSize: 14 }}>{d.icon}</Text>
                <Text style={{ color: dietaryPref === d.key ? "#FFFFFF" : "#9CA3AF", fontWeight: "600", fontSize: 13 }}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Days Per Week */}
          <SectionHeader>Training Days / Week</SectionHeader>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
            {[3, 4, 5, 6].map(d => (
              <TouchableOpacity
                key={d}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d.toString() ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: daysPerWeek === d.toString() ? "#7C3AED" : "#1F2937", opacity: editing ? 1 : 0.7 }}
                onPress={() => editing && setDaysPerWeek(d.toString())}
              >
                <Text style={{ color: daysPerWeek === d.toString() ? "#FFFFFF" : "#9CA3AF", fontWeight: "700" }}>{d}x</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Links */}
          <SectionHeader>Features</SectionHeader>
          <View style={{ gap: 8, marginBottom: 24 }}>
            <FeatureLink icon="📈" label="Progress Photos" onPress={() => router.push("/progress-photos" as any)} />
            <FeatureLink icon="⌚" label="Wearable Sync" onPress={() => router.push("/wearable-sync" as any)} />
            <FeatureLink icon="🗺️" label="Find Nearby Gyms" onPress={() => router.push("/gym-finder" as any)} />
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={{ backgroundColor: "#EF444420", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#EF444440" }}
            onPress={() => router.push("/logout" as any)}
          >
            <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 14 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{children}</Text>;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#1F2937" }}>
      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>{value}</Text>
      <Text style={{ color: "#6B7280", fontSize: 10, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function FeatureLink({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#13131F", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#1F2937" }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={{ color: "#E5E7EB", fontWeight: "600", fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 16 }}>→</Text>
    </TouchableOpacity>
  );
}
