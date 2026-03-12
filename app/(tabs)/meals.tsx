import React, { useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, Platform, ImageBackground,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { trpc } from "@/lib/trpc";

const MEAL_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/meal_bg-ULw7hvjMXJuqDPAXt9iqic.png";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export default function MealsScreen() {
  const { isAuthenticated } = useAuth();
  const { isGuest } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;
  const [activeTab, setActiveTab] = useState<"log" | "analyze">("log");
  const [mealType, setMealType] = useState("breakfast");
  const [mealName, setMealName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loggingMeal, setLoggingMeal] = useState(false);

  // Local meal log for guest users (in-memory for session)
  const [localMeals, setLocalMeals] = useState<any[]>([]);

  const { data: dbMeals, refetch: refetchMeals } = trpc.mealLog.getToday.useQuery(undefined, { enabled: isAuthenticated });
  const todayMeals = isAuthenticated ? dbMeals : localMeals;

  const uploadPhoto = trpc.upload.photo.useMutation();
  const analyzePhoto = trpc.mealLog.analyzePhoto.useMutation();
  const dbLogMeal = trpc.mealLog.log.useMutation({
    onSuccess: () => { refetchMeals(); setMealName(""); setSelectedImage(null); setAnalysisResult(null); Alert.alert("Logged!", "Meal added to your log."); },
    onError: (e) => Alert.alert("Error", e.message),
  });

  async function logMealForGuest(data: { name: string; mealType: string; calories?: number; protein?: number; carbs?: number; fat?: number }) {
    setLoggingMeal(true);
    try {
      setLocalMeals(prev => [...prev, { ...data, id: Date.now(), createdAt: new Date().toISOString() }]);
      setMealName(""); setSelectedImage(null); setAnalysisResult(null);
      Alert.alert("Logged!", "Meal added to your session log.");
    } finally { setLoggingMeal(false); }
  }

  async function handleLogMeal(data: { name: string; mealType: string; calories?: number; protein?: number; carbs?: number; fat?: number }) {
    if (isAuthenticated) { dbLogMeal.mutate(data); }
    else { await logMealForGuest(data); }
  }

  const todayCalories = todayMeals?.reduce((s: number, m: any) => s + (m.calories ?? 0), 0) ?? 0;
  const todayProtein = todayMeals?.reduce((s: number, m: any) => s + (m.protein ?? 0), 0) ?? 0;
  const todayCarbs = todayMeals?.reduce((s: number, m: any) => s + (m.carbs ?? 0), 0) ?? 0;
  const todayFat = todayMeals?.reduce((s: number, m: any) => s + (m.fat ?? 0), 0) ?? 0;
  const isMealLogging = isAuthenticated ? dbLogMeal.isPending : loggingMeal;

  async function pickImage(useCamera: boolean) {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      }
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setAnalysisResult(null);
      }
    } catch (e: any) { Alert.alert("Error", e.message); }
  }

  async function analyzeFood() {
    if (!selectedImage) return;
    setAnalyzing(true);
    try {
      let base64 = "";
      if (Platform.OS === "web") {
        const resp = await fetch(selectedImage);
        const blob = await resp.blob();
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(selectedImage, { encoding: FileSystem.EncodingType.Base64 });
      }
      const { url } = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });
      const result = await analyzePhoto.mutateAsync({ photoUrl: url });
      setAnalysisResult(result);
      if (result.notes) setMealName(String(result.notes));
    } catch (e: any) {
      Alert.alert("Analysis Failed", e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function logAnalyzedMeal() {
    if (!analysisResult) return;
    await handleLogMeal({
      name: mealName || String(analysisResult.notes) || "Analyzed Meal",
      mealType,
      calories: analysisResult.totalCalories,
      protein: analysisResult.totalProtein,
      carbs: analysisResult.totalCarbs,
      fat: analysisResult.totalFat,
    });
  }

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#080810" }}>
        <ImageBackground source={{ uri: MEAL_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.78)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🍽️</Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Meal Log</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>Sign in or continue as guest to track your nutrition and use the AI calorie estimator.</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#22C55E", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, shadowColor: "#22C55E", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 }}
              onPress={() => {}}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#080810" }}>
      {/* Hero Header */}
      <ImageBackground source={{ uri: MEAL_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.68)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <Text style={{ color: "#22C55E", fontWeight: "700", fontSize: 12, letterSpacing: 1 }}>NUTRITION TRACKING</Text>
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 26, letterSpacing: -0.5 }}>Meal Log</Text>
        </View>
      </ImageBackground>

      {/* Daily Summary */}
      <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "#13131F", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#1F2937" }}>
        <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 10, textTransform: "uppercase" }}>Today's Nutrition</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <NutritionStat label="Calories" value={Math.round(todayCalories)} unit="kcal" color="#F97316" />
          <NutritionStat label="Protein" value={Math.round(todayProtein)} unit="g" color="#3B82F6" />
          <NutritionStat label="Carbs" value={Math.round(todayCarbs)} unit="g" color="#22C55E" />
          <NutritionStat label="Fat" value={Math.round(todayFat)} unit="g" color="#FBBF24" />
        </View>
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, marginBottom: 16, gap: 8 }}>
        {(["log", "analyze"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center", backgroundColor: activeTab === tab ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: activeTab === tab ? "#7C3AED" : "#1F2937" }}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={{ color: activeTab === tab ? "#FFFFFF" : "#9CA3AF", fontWeight: "700", fontSize: 13 }}>
              {tab === "log" ? "📋 Today's Log" : "📷 AI Estimator"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* ── Log Tab ── */}
        {activeTab === "log" && (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Meal Type Selector */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {MEAL_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: mealType === t ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: mealType === t ? "#7C3AED" : "#1F2937" }}
                  onPress={() => setMealType(t)}
                >
                  <Text style={{ color: mealType === t ? "#FFFFFF" : "#9CA3AF", fontSize: 10, fontWeight: "700", textTransform: "capitalize" }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Log */}
            <View style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#1F2937" }}>
              <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase" }}>Quick Log</Text>
              <TextInput
                value={mealName}
                onChangeText={setMealName}
                placeholder="What did you eat?"
                placeholderTextColor="#4B5563"
                style={{ backgroundColor: "#0D0D18", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#FFFFFF", fontSize: 14, marginBottom: 12 }}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={{ backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 10, alignItems: "center", opacity: !mealName || isMealLogging ? 0.6 : 1 }}
                onPress={() => handleLogMeal({ name: mealName, mealType })}
                disabled={!mealName || isMealLogging}
              >
                {isMealLogging ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>+ Log Meal</Text>}
              </TouchableOpacity>
            </View>

            {/* Today's Meals */}
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14, marginBottom: 10 }}>Today's Meals</Text>
            {!todayMeals || todayMeals.length === 0 ? (
              <View style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#1F2937" }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🍽️</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" }}>No meals logged yet today. Start tracking your nutrition!</Text>
              </View>
            ) : (
              todayMeals.map((meal: any, i: number) => (
                <View key={i} style={{ backgroundColor: "#13131F", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1F2937" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <View style={{ backgroundColor: "#7C3AED20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: "#A78BFA", fontSize: 10, fontWeight: "700", textTransform: "capitalize" }}>{meal.mealType ?? "meal"}</Text>
                        </View>
                      </View>
                      <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>{meal.name}</Text>
                      {(meal.protein || meal.carbs || meal.fat) && (
                        <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 3 }}>
                          P:{Math.round(meal.protein ?? 0)}g · C:{Math.round(meal.carbs ?? 0)}g · F:{Math.round(meal.fat ?? 0)}g
                        </Text>
                      )}
                    </View>
                    {meal.calories ? (
                      <Text style={{ color: "#F97316", fontWeight: "700", fontSize: 16 }}>{meal.calories}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── AI Estimator Tab ── */}
        {activeTab === "analyze" && (
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ backgroundColor: "#7C3AED10", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#7C3AED30" }}>
              <Text style={{ color: "#A78BFA", fontSize: 13, lineHeight: 18 }}>
                📷 Take a photo of your meal and our AI will estimate the calories and macros automatically.
              </Text>
            </View>

            {/* Image Picker */}
            {selectedImage ? (
              <View style={{ marginBottom: 16 }}>
                <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 240, borderRadius: 16, backgroundColor: "#13131F" }} resizeMode="cover" />
                <TouchableOpacity
                  style={{ position: "absolute", top: 10, right: 10, backgroundColor: "#EF444490", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}
                  onPress={() => { setSelectedImage(null); setAnalysisResult(null); }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 16, paddingVertical: 20, alignItems: "center", borderWidth: 1, borderColor: "#1F2937", gap: 8 }}
                  onPress={() => pickImage(true)}
                >
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={{ color: "#E5E7EB", fontWeight: "600", fontSize: 13 }}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 16, paddingVertical: 20, alignItems: "center", borderWidth: 1, borderColor: "#1F2937", gap: 8 }}
                  onPress={() => pickImage(false)}
                >
                  <Text style={{ fontSize: 28 }}>🖼️</Text>
                  <Text style={{ color: "#E5E7EB", fontWeight: "600", fontSize: 13 }}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedImage && !analysisResult && (
              <TouchableOpacity
                style={{ backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginBottom: 16, opacity: analyzing ? 0.7 : 1 }}
                onPress={analyzeFood}
                disabled={analyzing}
              >
                {analyzing ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Analyzing Food...</Text>
                  </View>
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>✨ Estimate Calories</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Analysis Result */}
            {analysisResult && (
              <View>
                <View style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#22C55E30" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ color: "#22C55E", fontWeight: "700", fontSize: 13 }}>✓ Analysis Complete</Text>
                    <View style={{ backgroundColor: "#22C55E20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#22C55E", fontSize: 11 }}>
                        {analysisResult.confidence === "high" ? "High" : analysisResult.confidence === "medium" ? "Medium" : "Low"} confidence
                      </Text>
                    </View>
                  </View>
                  {analysisResult.notes && (
                    <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 12 }}>{String(analysisResult.notes)}</Text>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                    <NutritionStat label="Calories" value={analysisResult.totalCalories} unit="kcal" color="#F97316" />
                    <NutritionStat label="Protein" value={analysisResult.totalProtein} unit="g" color="#3B82F6" />
                    <NutritionStat label="Carbs" value={analysisResult.totalCarbs} unit="g" color="#22C55E" />
                    <NutritionStat label="Fat" value={analysisResult.totalFat} unit="g" color="#FBBF24" />
                  </View>

                  {analysisResult.foods?.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>DETECTED FOODS</Text>
                      {analysisResult.foods.map((food: any, i: number) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: i < analysisResult.foods.length - 1 ? 1 : 0, borderBottomColor: "#1F2937" }}>
                          <Text style={{ color: "#E5E7EB", fontSize: 13 }}>{food.name} ({food.portion})</Text>
                          <Text style={{ color: "#F97316", fontSize: 13, fontWeight: "600" }}>{food.calories} kcal</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Meal Type & Name */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  {MEAL_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: mealType === t ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: mealType === t ? "#7C3AED" : "#1F2937" }}
                      onPress={() => setMealType(t)}
                    >
                      <Text style={{ color: mealType === t ? "#FFFFFF" : "#9CA3AF", fontSize: 10, fontWeight: "700", textTransform: "capitalize" }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="Meal name (optional)"
                  placeholderTextColor="#4B5563"
                  style={{ backgroundColor: "#13131F", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: "#FFFFFF", fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#1F2937" }}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={{ backgroundColor: "#22C55E", borderRadius: 16, paddingVertical: 14, alignItems: "center", opacity: isMealLogging ? 0.7 : 1 }}
                  onPress={logAnalyzedMeal}
                  disabled={isMealLogging}
                >
                  {isMealLogging ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>+ Log This Meal</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NutritionStat({ label, value, unit, color }: any) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color, fontWeight: "800", fontSize: 18 }}>{Math.round(value)}</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: "#6B7280", fontSize: 10 }}>{label}</Text>
    </View>
  );
}
