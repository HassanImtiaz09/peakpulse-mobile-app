import React, { useState, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image,
  TextInput, Platform, ImageBackground, FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { useCalories } from "@/lib/calorie-context";
import { trpc } from "@/lib/trpc";
import { useFocusEffect } from "expo-router";

const MEAL_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/meal_bg-ULw7hvjMXJuqDPAXt9iqic.png";
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

// NanoBanana AI-generated food photography images
const MEAL_PHOTOS: Record<string, string> = {
  breakfast: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/meal_breakfast-Kkxj6HxYyAMyaMAkT4LTv9.webp",
  lunch: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/meal_lunch-hqJt3vNpEURW5Xtrr6fAxH.webp",
  dinner: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/meal_dinner-NWeRGriCSPqg7xLPyg6AVu.webp",
  snack: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/meal_snack-8KzvxS4ygJfx27Ym2PEMVC.webp",
};

const MEAL_RECIPES: Record<string, { title: string; time: string; steps: string[] }> = {
  breakfast: {
    title: "Berry Yogurt Parfait",
    time: "5 min",
    steps: [
      "Add 200g Greek yogurt to a bowl",
      "Layer with 30g granola",
      "Top with mixed berries (strawberries, blueberries, raspberries)",
      "Drizzle 1 tsp honey and garnish with mint",
    ],
  },
  lunch: {
    title: "Grilled Chicken Quinoa Bowl",
    time: "25 min",
    steps: [
      "Season chicken breast with salt, pepper, garlic powder",
      "Grill on medium-high heat 6-7 min each side until cooked through",
      "Cook quinoa per packet instructions (15 min)",
      "Roast vegetables at 200°C for 20 min with olive oil",
      "Assemble bowl and squeeze lemon juice over everything",
    ],
  },
  dinner: {
    title: "Pan-Seared Salmon & Asparagus",
    time: "20 min",
    steps: [
      "Pat salmon dry and season with salt, pepper, and dill",
      "Heat olive oil in pan over medium-high heat",
      "Sear salmon skin-side down 4 min, flip and cook 3 more min",
      "Steam asparagus 4-5 min until tender-crisp",
      "Microwave sweet potato 5 min, mash with butter and seasoning",
    ],
  },
  snack: {
    title: "Protein Snack Board",
    time: "3 min",
    steps: [
      "Portion 30g mixed nuts into a small bowl",
      "Slice one apple into wedges",
      "Add 2 tbsp almond butter for dipping",
      "Optional: blend a protein shake with almond milk and ice",
    ],
  },
};

export default function MealsScreen() {
  const { isAuthenticated } = useAuth();
  const { isGuest } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;
  const { meals, totalCalories, totalProtein, totalCarbs, totalFat, calorieGoal, caloriesRemaining, addMeal, removeMeal, refreshFromStorage } = useCalories();

  const [activeTab, setActiveTab] = useState<"log" | "analyze">("log");
  const [mealType, setMealType] = useState("breakfast");
  const [mealName, setMealName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [savePhoto, setSavePhoto] = useState(true);

  const uploadPhoto = trpc.upload.photo.useMutation();
  const analyzePhoto = trpc.mealLog.analyzePhoto.useMutation();
  const dbLogMeal = trpc.mealLog.log.useMutation({
    onSuccess: () => {
      setMealName("");
      setSelectedImage(null);
      setSelectedBase64(null);
      setAnalysisResult(null);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  // Refresh calorie data when screen comes into focus
  useFocusEffect(useCallback(() => {
    refreshFromStorage();
  }, [refreshFromStorage]));

  const caloriePercent = Math.min(100, (totalCalories / calorieGoal) * 100);
  const calorieColor = caloriePercent > 90 ? "#EF4444" : caloriePercent > 70 ? "#F97316" : "#22C55E";

  async function pickImage(useCamera: boolean) {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed to take food photos.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true, // Get base64 directly to avoid ph:// URI issues on iOS
          allowsEditing: true,
          aspect: [4, 3],
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
          allowsEditing: true,
          aspect: [4, 3],
        });
      }
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setSelectedBase64(result.assets[0].base64 ?? null);
        setAnalysisResult(null);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function analyzeFood() {
    if (!selectedImage) return;
    setAnalyzing(true);
    try {
      let base64 = selectedBase64;

      // Fallback: read from filesystem if base64 wasn't returned by ImagePicker
      if (!base64) {
        if (Platform.OS === "web") {
          const resp = await fetch(selectedImage);
          const blob = await resp.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1] ?? result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          // Try to get a readable local URI first (handles ph:// on iOS)
          let readUri = selectedImage;
          if (selectedImage.startsWith("ph://")) {
            // ph:// URIs are not directly readable — copy to cache first
            const cacheUri = FileSystem.cacheDirectory + `food_${Date.now()}.jpg`;
            await FileSystem.copyAsync({ from: selectedImage, to: cacheUri });
            readUri = cacheUri;
          }
          base64 = await FileSystem.readAsStringAsync(readUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      }

      if (!base64) throw new Error("Could not read image data. Please try again.");

      // Upload to S3 to get a URL the AI can access
      const { url } = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });

      // Analyze with AI
      const result = await analyzePhoto.mutateAsync({ photoUrl: url });
      setAnalysisResult({ ...result, uploadedUrl: url });

      // Pre-fill meal name from AI notes
      if (result.notes && !mealName) {
        const firstFood = result.foods?.[0]?.name;
        setMealName(firstFood ? `${firstFood} & more` : String(result.notes).slice(0, 40));
      }
    } catch (e: any) {
      Alert.alert(
        "Analysis Failed",
        e.message?.includes("10001")
          ? "Please try again — the AI service is temporarily unavailable."
          : e.message ?? "Could not analyze the photo. Please try a clearer image."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function logAnalyzedMeal() {
    if (!analysisResult) return;
    const entry = {
      name: mealName || "Analyzed Meal",
      mealType,
      calories: analysisResult.totalCalories ?? 0,
      protein: analysisResult.totalProtein ?? 0,
      carbs: analysisResult.totalCarbs ?? 0,
      fat: analysisResult.totalFat ?? 0,
      photoUri: savePhoto ? (selectedImage ?? undefined) : undefined,
    };

    // Add to local real-time calorie tracker
    await addMeal(entry);

    // Also save to DB if authenticated
    if (isAuthenticated) {
      dbLogMeal.mutate({
        name: entry.name,
        mealType: entry.mealType,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        photoUrl: analysisResult.uploadedUrl,
      });
    }

    setMealName("");
    setSelectedImage(null);
    setSelectedBase64(null);
    setAnalysisResult(null);
    setActiveTab("log");
    Alert.alert("✅ Logged!", `${entry.name} added — ${entry.calories} kcal`);
  }

  async function quickLogMeal() {
    if (!mealName.trim()) return;
    await addMeal({ name: mealName.trim(), mealType, calories: 0, protein: 0, carbs: 0, fat: 0 });
    if (isAuthenticated) {
      dbLogMeal.mutate({ name: mealName.trim(), mealType });
    }
    setMealName("");
    Alert.alert("✅ Logged!", `${mealName} added to your log.`);
  }

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#080810" }}>
        <ImageBackground source={{ uri: MEAL_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.78)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🍽️</Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Meal Log</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", lineHeight: 20 }}>Sign in or continue as guest to track your nutrition and use the AI calorie estimator.</Text>
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

      {/* Daily Summary Card */}
      <View style={{ marginHorizontal: 16, marginTop: -20, backgroundColor: "#13131F", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#1F2937", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, zIndex: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>Today's Nutrition</Text>
          <Text style={{ color: calorieColor, fontWeight: "700", fontSize: 12 }}>{Math.round(caloriesRemaining)} kcal left</Text>
        </View>

        {/* Calorie Progress Bar */}
        <View style={{ height: 8, backgroundColor: "#1F2937", borderRadius: 4, marginBottom: 10, overflow: "hidden" }}>
          <View style={{ height: 8, width: `${caloriePercent}%` as any, backgroundColor: calorieColor, borderRadius: 4 }} />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <MacroStat label="Calories" value={Math.round(totalCalories)} unit="kcal" color="#F97316" goal={calorieGoal} />
          <MacroStat label="Protein" value={Math.round(totalProtein)} unit="g" color="#3B82F6" />
          <MacroStat label="Carbs" value={Math.round(totalCarbs)} unit="g" color="#22C55E" />
          <MacroStat label="Fat" value={Math.round(totalFat)} unit="g" color="#FBBF24" />
        </View>
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, marginTop: 16, marginBottom: 12, gap: 8 }}>
        {(["log", "analyze"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center", backgroundColor: activeTab === tab ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: activeTab === tab ? "#7C3AED" : "#1F2937" }}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={{ color: activeTab === tab ? "#FFFFFF" : "#9CA3AF", fontWeight: "700", fontSize: 13 }}>
              {tab === "log" ? "📋 Today's Log" : "📷 AI Estimator"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Log Tab ── */}
        {activeTab === "log" && (
          <View>
            {/* Meal Type Selector */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
              {MEAL_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: mealType === t ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: mealType === t ? "#7C3AED" : "#1F2937" }}
                  onPress={() => setMealType(t)}
                >
                  <Text style={{ fontSize: 16 }}>{MEAL_ICONS[t]}</Text>
                  <Text style={{ color: mealType === t ? "#FFFFFF" : "#9CA3AF", fontSize: 9, fontWeight: "700", marginTop: 2, textTransform: "capitalize" }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Log */}
            <View style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#1F2937" }}>
              <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 10, textTransform: "uppercase" }}>Quick Log</Text>
              <TextInput
                value={mealName}
                onChangeText={setMealName}
                placeholder="What did you eat? (e.g. Chicken rice bowl)"
                placeholderTextColor="#4B5563"
                style={{ backgroundColor: "#0D0D18", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#FFFFFF", fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#1F2937" }}
                returnKeyType="done"
                onSubmitEditing={quickLogMeal}
              />
              <TouchableOpacity
                style={{ backgroundColor: "#7C3AED", borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: !mealName.trim() ? 0.5 : 1 }}
                onPress={quickLogMeal}
                disabled={!mealName.trim()}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>+ Log Meal</Text>
              </TouchableOpacity>
            </View>

            {/* Suggested Meals Section with NanoBanana Photos */}
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15, marginBottom: 10 }}>Today's Suggested Meals</Text>
            {MEAL_TYPES.map((type) => {
              const recipe = MEAL_RECIPES[type];
              const photo = MEAL_PHOTOS[type];
              return (
                <SuggestedMealCard key={type} type={type} recipe={recipe} photo={photo} onLog={() => {
                  addMeal({ name: recipe.title, mealType: type, calories: type === "breakfast" ? 320 : type === "lunch" ? 520 : type === "dinner" ? 480 : 210, protein: type === "breakfast" ? 18 : type === "lunch" ? 42 : type === "dinner" ? 38 : 12, carbs: type === "breakfast" ? 38 : type === "lunch" ? 45 : type === "dinner" ? 28 : 18, fat: type === "breakfast" ? 8 : type === "lunch" ? 12 : type === "dinner" ? 18 : 10 });
                  Alert.alert("✅ Logged!", `${recipe.title} added to your meal log.`);
                }} />
              );
            })}

            {/* Today's Logged Meals */}
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15, marginBottom: 10, marginTop: 8 }}>
              Today's Log {meals.length > 0 ? `(${meals.length})` : ""}
            </Text>
            {meals.length === 0 ? (
              <View style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 28, alignItems: "center", borderWidth: 1, borderColor: "#1F2937" }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🍽️</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", lineHeight: 20 }}>No meals logged yet today.</Text>
                <Text style={{ color: "#6B7280", fontSize: 12, textAlign: "center", marginTop: 4 }}>Tap "+ Log" on a suggested meal or use the AI Estimator.</Text>
              </View>
            ) : (
              meals.map((meal) => (
                <View key={meal.id} style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1F2937", flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {meal.photoUri ? (
                    <Image source={{ uri: meal.photoUri }} style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: "#0D0D18" }} resizeMode="cover" />
                  ) : (
                    <Image source={{ uri: MEAL_PHOTOS[meal.mealType] ?? MEAL_PHOTOS.snack }} style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: "#0D0D18" }} resizeMode="cover" />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <View style={{ backgroundColor: "#7C3AED20", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: "#A78BFA", fontSize: 10, fontWeight: "700", textTransform: "capitalize" }}>{meal.mealType}</Text>
                      </View>
                    </View>
                    <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>{meal.name}</Text>
                    {(meal.protein > 0 || meal.carbs > 0 || meal.fat > 0) && (
                      <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>
                        P:{Math.round(meal.protein)}g · C:{Math.round(meal.carbs)}g · F:{Math.round(meal.fat)}g
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    {meal.calories > 0 && (
                      <Text style={{ color: "#F97316", fontWeight: "700", fontSize: 15 }}>{Math.round(meal.calories)}</Text>
                    )}
                    <TouchableOpacity
                      style={{ backgroundColor: "#EF444420", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}
                      onPress={() => removeMeal(meal.id)}
                    >
                      <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "700" }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── AI Estimator Tab ── */}
        {activeTab === "analyze" && (
          <View>
            <View style={{ backgroundColor: "#7C3AED10", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#7C3AED30" }}>
              <Text style={{ color: "#A78BFA", fontSize: 13, lineHeight: 20 }}>
                📷 Take or choose a photo of your meal. Our AI will identify the food and estimate calories and macros automatically.
              </Text>
            </View>

            {/* Image Picker */}
            {selectedImage ? (
              <View style={{ marginBottom: 16 }}>
                <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 220, borderRadius: 16, backgroundColor: "#13131F" }} resizeMode="cover" />
                <TouchableOpacity
                  style={{ position: "absolute", top: 10, right: 10, backgroundColor: "#EF444490", borderRadius: 20, width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
                  onPress={() => { setSelectedImage(null); setSelectedBase64(null); setAnalysisResult(null); }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 16, paddingVertical: 24, alignItems: "center", borderWidth: 1, borderColor: "#1F2937", gap: 8 }}
                  onPress={() => pickImage(true)}
                >
                  <Text style={{ fontSize: 32 }}>📷</Text>
                  <Text style={{ color: "#E5E7EB", fontWeight: "600", fontSize: 13 }}>Take Photo</Text>
                  <Text style={{ color: "#6B7280", fontSize: 11 }}>Use camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#13131F", borderRadius: 16, paddingVertical: 24, alignItems: "center", borderWidth: 1, borderColor: "#1F2937", gap: 8 }}
                  onPress={() => pickImage(false)}
                >
                  <Text style={{ fontSize: 32 }}>🖼️</Text>
                  <Text style={{ color: "#E5E7EB", fontWeight: "600", fontSize: 13 }}>Choose Photo</Text>
                  <Text style={{ color: "#6B7280", fontSize: 11 }}>From gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedImage && !analysisResult && (
              <TouchableOpacity
                style={{ backgroundColor: "#7C3AED", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 16, opacity: analyzing ? 0.7 : 1, shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
                onPress={analyzeFood}
                disabled={analyzing}
              >
                {analyzing ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Analyzing food...</Text>
                  </View>
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>✨ Estimate Calories with AI</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Analysis Result */}
            {analysisResult && (
              <View>
                <View style={{ backgroundColor: "#13131F", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#22C55E30" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ color: "#22C55E", fontWeight: "700", fontSize: 14 }}>✓ Analysis Complete</Text>
                    <View style={{ backgroundColor: "#22C55E20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "700" }}>
                        {analysisResult.confidence === "high" ? "High" : analysisResult.confidence === "medium" ? "Medium" : "Low"} confidence
                      </Text>
                    </View>
                  </View>

                  {analysisResult.notes && (
                    <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 12, lineHeight: 18 }}>{String(analysisResult.notes)}</Text>
                  )}

                  <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
                    <MacroStat label="Calories" value={analysisResult.totalCalories ?? 0} unit="kcal" color="#F97316" />
                    <MacroStat label="Protein" value={analysisResult.totalProtein ?? 0} unit="g" color="#3B82F6" />
                    <MacroStat label="Carbs" value={analysisResult.totalCarbs ?? 0} unit="g" color="#22C55E" />
                    <MacroStat label="Fat" value={analysisResult.totalFat ?? 0} unit="g" color="#FBBF24" />
                  </View>

                  {analysisResult.foods?.length > 0 && (
                    <View>
                      <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 8, textTransform: "uppercase" }}>Detected Foods</Text>
                      {analysisResult.foods.map((food: any, i: number) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: i < analysisResult.foods.length - 1 ? 1 : 0, borderBottomColor: "#1F2937" }}>
                          <Text style={{ color: "#E5E7EB", fontSize: 13 }}>{food.name} <Text style={{ color: "#6B7280" }}>({food.portion})</Text></Text>
                          <Text style={{ color: "#F97316", fontSize: 13, fontWeight: "600" }}>{food.calories} kcal</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Save Photo Toggle */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#13131F", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: savePhoto ? "#7C3AED50" : "#1F2937" }}
                  onPress={() => setSavePhoto(!savePhoto)}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: savePhoto ? "#7C3AED" : "#1F2937", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: savePhoto ? "#7C3AED" : "#374151" }}>
                    {savePhoto && <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>✓</Text>}
                  </View>
                  <Text style={{ color: "#E5E7EB", fontSize: 13, fontWeight: "600" }}>Save photo to meal log</Text>
                </TouchableOpacity>

                {/* Meal Type */}
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                  {MEAL_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: mealType === t ? "#7C3AED" : "#13131F", borderWidth: 1, borderColor: mealType === t ? "#7C3AED" : "#1F2937" }}
                      onPress={() => setMealType(t)}
                    >
                      <Text style={{ fontSize: 14 }}>{MEAL_ICONS[t]}</Text>
                      <Text style={{ color: mealType === t ? "#FFFFFF" : "#9CA3AF", fontSize: 9, fontWeight: "700", marginTop: 2, textTransform: "capitalize" }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="Meal name (optional)"
                  placeholderTextColor="#4B5563"
                  style={{ backgroundColor: "#13131F", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#FFFFFF", fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#1F2937" }}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={{ backgroundColor: "#22C55E", borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowColor: "#22C55E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
                  onPress={logAnalyzedMeal}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>+ Log This Meal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MacroStat({ label, value, unit, color, goal }: { label: string; value: number; unit: string; color: string; goal?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color, fontWeight: "800", fontSize: 18 }}>{Math.round(value)}</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 10, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: "#6B7280", fontSize: 10 }}>{label}</Text>
      {goal && <Text style={{ color: "#4B5563", fontSize: 9 }}>/ {goal}</Text>}
    </View>
  );
}

function SuggestedMealCard({ type, recipe, photo, onLog }: {
  type: string;
  recipe: { title: string; time: string; steps: string[] };
  photo: string;
  onLog: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const MEAL_ICONS_LOCAL: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };
  const MEAL_CALS: Record<string, number> = { breakfast: 320, lunch: 520, dinner: 480, snack: 210 };
  const MEAL_MACROS: Record<string, { p: number; c: number; f: number }> = {
    breakfast: { p: 18, c: 38, f: 8 },
    lunch: { p: 42, c: 45, f: 12 },
    dinner: { p: 38, c: 28, f: 18 },
    snack: { p: 12, c: 18, f: 10 },
  };
  const macros = MEAL_MACROS[type] ?? { p: 20, c: 30, f: 10 };

  return (
    <View style={{ backgroundColor: "#13131F", borderRadius: 18, marginBottom: 14, overflow: "hidden", borderWidth: 1, borderColor: "#1F2937" }}>
      {/* Food Photo */}
      <Image source={{ uri: photo }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
      {/* Meal Type Badge */}
      <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 14 }}>{MEAL_ICONS_LOCAL[type] ?? "🍽️"}</Text>
        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{type}</Text>
      </View>
      {/* Log Button */}
      <TouchableOpacity
        style={{ position: "absolute", top: 12, right: 12, backgroundColor: "#7C3AED", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}
        onPress={onLog}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>+ Log</Text>
      </TouchableOpacity>

      <View style={{ padding: 14 }}>
        {/* Title & Time */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16, flex: 1 }}>{recipe.title}</Text>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>⏱ {recipe.time}</Text>
        </View>

        {/* Macros Row */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: "#F9731610", borderRadius: 8, padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#F97316", fontWeight: "800", fontSize: 15 }}>{MEAL_CALS[type]}</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 10 }}>kcal</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#3B82F610", borderRadius: 8, padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#3B82F6", fontWeight: "800", fontSize: 15 }}>{macros.p}g</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 10 }}>protein</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#22C55E10", borderRadius: 8, padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#22C55E", fontWeight: "800", fontSize: 15 }}>{macros.c}g</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 10 }}>carbs</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#FBBF2410", borderRadius: 8, padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#FBBF24", fontWeight: "800", fontSize: 15 }}>{macros.f}g</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 10 }}>fat</Text>
          </View>
        </View>

        {/* Expandable Recipe */}
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0D0D18", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1F2937" }}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={{ color: "#A78BFA", fontWeight: "700", fontSize: 13 }}>🍳 How to Prep This Meal</Text>
          <Text style={{ color: "#6B7280", fontSize: 14 }}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={{ marginTop: 10, backgroundColor: "#0D0D18", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1F2937" }}>
            {recipe.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text>
                </View>
                <Text style={{ color: "#D1D5DB", fontSize: 13, lineHeight: 20, flex: 1 }}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
