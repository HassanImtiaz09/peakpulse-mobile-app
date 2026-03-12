import React, { useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const GOALS = [
  { key: "build_muscle", label: "Build Muscle", icon: "💪", desc: "Gain lean muscle mass" },
  { key: "lose_fat", label: "Lose Fat", icon: "🔥", desc: "Burn fat, get lean" },
  { key: "maintain", label: "Maintain", icon: "⚖️", desc: "Stay at current level" },
  { key: "athletic", label: "Athletic", icon: "🏃", desc: "Improve performance" },
];

const WORKOUT_STYLES = [
  { key: "gym", label: "Gym", icon: "🏋️", desc: "Full gym equipment" },
  { key: "home", label: "Home", icon: "🏠", desc: "Minimal equipment" },
  { key: "mix", label: "Mix", icon: "🔄", desc: "Both gym & home" },
  { key: "calisthenics", label: "Calisthenics", icon: "🤸", desc: "Bodyweight only" },
];

const DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", icon: "🍗" },
  { key: "halal", label: "Halal", icon: "☪️" },
  { key: "vegan", label: "Vegan", icon: "🌱" },
  { key: "vegetarian", label: "Vegetarian", icon: "🥦" },
  { key: "keto", label: "Keto", icon: "🥑" },
  { key: "paleo", label: "Paleo", icon: "🥩" },
];

const STEPS = ["Welcome", "Body Stats", "Your Goal", "Workout Style", "Diet", "Done"];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState("male");
  const [goal, setGoal] = useState("build_muscle");
  const [workoutStyle, setWorkoutStyle] = useState("gym");
  const [dietaryPref, setDietaryPref] = useState("omnivore");
  const [daysPerWeek, setDaysPerWeek] = useState(4);

  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      setStep(5);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  function handleNext() {
    if (step < 4) {
      setStep(step + 1);
    } else {
      upsertProfile.mutate({
        age: age ? parseInt(age) : undefined,
        gender,
        heightCm: height ? parseFloat(height) : undefined,
        weightKg: weight ? parseFloat(weight) : undefined,
        goal,
        workoutStyle,
        dietaryPreference: dietaryPref,
        daysPerWeek,
      });
    }
  }

  return (
    <ScreenContainer>
      {/* Progress */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {STEPS.slice(0, -1).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? "#7C3AED" : "#1F2937" }} />
          ))}
        </View>
        <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 6 }}>Step {step + 1} of {STEPS.length - 1}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Step 0: Welcome */}
        {step === 0 && (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>⚡</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 8, textAlign: "center" }}>
              Welcome, {user?.name?.split(" ")[0] ?? "Athlete"}!
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
              Let's set up your profile so we can create a personalized fitness plan just for you.
            </Text>
            <View style={{ width: "100%", gap: 10 }}>
              {["AI-generated workout plans", "Personalized meal plans", "Body transformation previews", "Progress tracking"].map((f, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#13131F", borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: "#7C3AED", fontSize: 16 }}>✓</Text>
                  <Text style={{ color: "#E5E7EB", fontSize: 14 }}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Step 1: Body Stats */}
        {step === 1 && (
          <View style={{ paddingTop: 20 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginBottom: 6 }}>Your Body Stats</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24 }}>This helps us calculate your calorie needs and personalize your plan.</Text>

            <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 8 }}>GENDER</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[{ key: "male", label: "Male" }, { key: "female", label: "Female" }, { key: "other", label: "Other" }].map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: gender === g.key ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: gender === g.key ? "#7C3AED" : "#1F2937" }}
                  onPress={() => setGender(g.key)}
                >
                  <Text style={{ color: gender === g.key ? "#FFFFFF" : "#9CA3AF", fontWeight: "600" }}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>AGE</Text>
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 25"
                  placeholderTextColor="#4B5563"
                  keyboardType="numeric"
                  style={{ backgroundColor: "#13131F", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "#1F2937" }}
                  returnKeyType="done"
                />
              </View>
              <View>
                <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>HEIGHT (cm)</Text>
                <TextInput
                  value={height}
                  onChangeText={setHeight}
                  placeholder="e.g. 175"
                  placeholderTextColor="#4B5563"
                  keyboardType="numeric"
                  style={{ backgroundColor: "#13131F", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "#1F2937" }}
                  returnKeyType="done"
                />
              </View>
              <View>
                <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>WEIGHT (kg)</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 80"
                  placeholderTextColor="#4B5563"
                  keyboardType="numeric"
                  style={{ backgroundColor: "#13131F", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "#1F2937" }}
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <View style={{ paddingTop: 20 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginBottom: 6 }}>What's Your Goal?</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24 }}>We'll tailor your workout and nutrition plan to match your goal.</Text>
            <View style={{ gap: 10 }}>
              {GOALS.map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: goal === g.key ? "#7C3AED20" : "#13131F", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: goal === g.key ? "#7C3AED" : "#1F2937" }}
                  onPress={() => setGoal(g.key)}
                >
                  <Text style={{ fontSize: 28 }}>{g.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>{g.label}</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{g.desc}</Text>
                  </View>
                  {goal === g.key && <Text style={{ color: "#7C3AED", fontSize: 20 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Workout Style */}
        {step === 3 && (
          <View style={{ paddingTop: 20 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginBottom: 6 }}>Workout Style</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24 }}>Where do you prefer to work out?</Text>
            <View style={{ gap: 10 }}>
              {WORKOUT_STYLES.map(w => (
                <TouchableOpacity
                  key={w.key}
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: workoutStyle === w.key ? "#7C3AED20" : "#13131F", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: workoutStyle === w.key ? "#7C3AED" : "#1F2937" }}
                  onPress={() => setWorkoutStyle(w.key)}
                >
                  <Text style={{ fontSize: 28 }}>{w.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>{w.label}</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{w.desc}</Text>
                  </View>
                  {workoutStyle === w.key && <Text style={{ color: "#7C3AED", fontSize: 20 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginTop: 20, marginBottom: 8 }}>DAYS PER WEEK</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[3, 4, 5, 6].map(d => (
                <TouchableOpacity
                  key={d}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: daysPerWeek === d ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: daysPerWeek === d ? "#7C3AED" : "#1F2937" }}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={{ color: daysPerWeek === d ? "#FFFFFF" : "#9CA3AF", fontWeight: "700", fontSize: 16 }}>{d}</Text>
                  <Text style={{ color: daysPerWeek === d ? "#E9D5FF" : "#6B7280", fontSize: 10 }}>days</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 4: Diet */}
        {step === 4 && (
          <View style={{ paddingTop: 20 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginBottom: 6 }}>Dietary Preference</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24 }}>Your meal plans will respect your dietary choices.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {DIETARY_PREFS.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={{ width: "47%", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: dietaryPref === d.key ? "#7C3AED20" : "#13131F", borderRadius: 14, padding: 14, borderWidth: 2, borderColor: dietaryPref === d.key ? "#7C3AED" : "#1F2937" }}
                  onPress={() => setDietaryPref(d.key)}
                >
                  <Text style={{ fontSize: 22 }}>{d.icon}</Text>
                  <Text style={{ color: dietaryPref === d.key ? "#FFFFFF" : "#9CA3AF", fontWeight: "600", fontSize: 14 }}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ fontSize: 72, marginBottom: 16 }}>🎉</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 8, textAlign: "center" }}>You're All Set!</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
              Your profile is ready. Head to the AI Body Scan to get started with your transformation!
            </Text>
            <TouchableOpacity
              style={{ width: "100%", backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12 }}
              onPress={() => router.replace("/scan" as any)}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>📸 Start Body Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: "100%", backgroundColor: "#13131F", borderRadius: 16, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#1F2937" }}
              onPress={() => router.replace("/(tabs)" as any)}
            >
              <Text style={{ color: "#9CA3AF", fontWeight: "600", fontSize: 14 }}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Next Button */}
        {step < 5 && (
          <TouchableOpacity
            style={{ backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 32, opacity: upsertProfile.isPending ? 0.7 : 1 }}
            onPress={handleNext}
            disabled={upsertProfile.isPending}
          >
            {upsertProfile.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>{step === 4 ? "Complete Setup" : "Continue →"}</Text>
            )}
          </TouchableOpacity>
        )}

        {step > 0 && step < 5 && (
          <TouchableOpacity
            style={{ alignItems: "center", marginTop: 12, paddingVertical: 8 }}
            onPress={() => setStep(step - 1)}
          >
            <Text style={{ color: "#6B7280", fontSize: 14 }}>← Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
