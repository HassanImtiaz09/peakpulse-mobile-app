import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image,
  TextInput, Platform, ImageBackground, FlatList,
} from "react-native";
import ReAnimated, {
  useSharedValue, useAnimatedStyle, interpolate, Extrapolation,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { useCalories, getHistoricalMeals, type MealEntry } from "@/lib/calorie-context";
import { trpc } from "@/lib/trpc";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { exportMealLogPdf } from "@/lib/meal-pdf";


const MEAL_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/OTOphPKaSpDPZRjp.jpg";
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_TYPE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  breakfast: "free-breakfast",
  lunch: "lunch-dining",
  dinner: "dinner-dining",
  snack: "cookie",
};

// NanoBanana AI-generated food photography images
const MEAL_PHOTOS: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1484723091739-30990106e7c6?w=800&q=80",
  lunch: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  dinner: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
  snack: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80",
};

// Unique food photos for each swap alternative (keyed by title)
const SWAP_PHOTOS: Record<string, string> = {
  "Overnight Oats with Banana": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80",
  "Scrambled Eggs on Wholegrain Toast": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80",
  "Avocado Toast with Poached Egg": "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=600&q=80",
  "Smoothie Bowl (Acai & Berries)": "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=600&q=80",
  "Cottage Cheese & Fruit Plate": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&q=80",
  "Protein Pancakes (3 pcs)": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
  "Turkey & Avocado Wrap": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80",
  "Tuna Salad Sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80",
  "Lentil & Vegetable Soup + Bread": "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
  "Steak & Sweet Potato Bowl": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
  "Falafel Wrap with Hummus": "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=600&q=80",
  "Greek Salad with Grilled Chicken": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  "Baked Cod with Roasted Veg": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
  "Chicken Stir-Fry with Brown Rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
  "Beef & Broccoli with Noodles": "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80",
  "Prawn & Vegetable Curry + Rice": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "Tofu & Edamame Buddha Bowl": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
  "Turkey Meatballs & Courgette Pasta": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80",
  "Rice Cakes with Peanut Butter": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80",
  "Boiled Eggs (2) with Cucumber": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80",
  "Dates & Almonds (30g each)": "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=600&q=80",
  "Protein Bar (Quest / Fulfil)": "https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=600&q=80",
  "Banana & Almond Butter": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80",
  "Greek Yogurt with Honey": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
};

// Hardcoded default recipes when no AI plan exists
const MEAL_RECIPES: Record<string, { title: string; time: string; steps: string[] }> = {
  breakfast: { title: "Berry Yogurt Parfait", time: "5 min", steps: ["Add 200g Greek yogurt to a bowl", "Layer with 30g granola", "Top with mixed berries", "Drizzle 1 tsp honey and garnish with mint"] },
  lunch: { title: "Grilled Chicken Quinoa Bowl", time: "25 min", steps: ["Season chicken breast with salt, pepper, garlic powder", "Grill 6-7 min each side", "Cook quinoa per packet instructions", "Roast vegetables at 200\u00b0C for 20 min", "Assemble bowl and squeeze lemon juice"] },
  dinner: { title: "Pan-Seared Salmon & Asparagus", time: "20 min", steps: ["Pat salmon dry and season with salt, pepper, dill", "Heat olive oil over medium-high heat", "Sear salmon skin-side down 4 min, flip 3 more min", "Steam asparagus 4-5 min", "Microwave sweet potato 5 min, mash with butter"] },
  snack: { title: "Protein Snack Board", time: "3 min", steps: ["Portion 30g mixed nuts", "Slice one apple into wedges", "Add 2 tbsp almond butter for dipping", "Optional: blend a protein shake"] },
};

export default function MealsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isGuest } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;
  const { meals, totalCalories, totalProtein, totalCarbs, totalFat, calorieGoal, caloriesRemaining, macroTargets, addMeal, removeMeal, refreshFromStorage } = useCalories();

  // Log method: "manual" | "ai-scan" | "barcode"
  const [logMethod, setLogMethod] = useState<"manual" | "ai-scan" | "barcode" | null>(null);
  const [showLogDropdown, setShowLogDropdown] = useState(false);
  const [mealType, setMealType] = useState("breakfast");
  const [mealName, setMealName] = useState("");
  const [showCustomEntry, setShowCustomEntry] = useState(false);
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [customServing, setCustomServing] = useState("");
  const [saveToFavOnLog, setSaveToFavOnLog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1.0);
  const [savePhoto, setSavePhoto] = useState(true);
  const [swapMealType, setSwapMealType] = useState<string | null>(null);
  const [swappedMeals, setSwappedMeals] = useState<Record<string, { title: string; icon: string; photo: string; recipe: { time: string; steps: string[] }; calories: number; protein: number; carbs: number; fat: number }>>({});
  const [swapMealData, setSwapMealData] = useState<{ name: string; calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [userDietaryPref, setUserDietaryPref] = useState("omnivore");
  const [userGoal, setUserGoal] = useState("build_muscle");
  const [aiMealPlan, setAiMealPlan] = useState<any>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingWorkout, setRegeneratingWorkout] = useState(false);
  const [localProfile, setLocalProfile] = useState<any>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  // Favourite autocomplete
  const [showAutoComplete, setShowAutoComplete] = useState(false);

  // Inline mini chart data
  const [chartData, setChartData] = useState<{ label: string; calories: number; protein: number; carbs: number; fat: number }[]>([]);

  // Favourites / frequent foods
  interface FavouriteFood {
    id: string;
    name: string;
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    source: "manual" | "barcode" | "ai";
    barcode?: string;
    addedAt: number;
    logCount: number;
  }
  const [favourites, setFavourites] = useState<FavouriteFood[]>([]);
  const [showFavourites, setShowFavourites] = useState(false);

  // Load favourites on mount
  React.useEffect(() => {
    AsyncStorage.getItem("@favourite_foods").then(raw => {
      if (raw) try { setFavourites(JSON.parse(raw)); } catch {}
    });
  }, []);

  // Load inline chart data (last 7 days)
  React.useEffect(() => {
    (async () => {
      try {
        const history = await getHistoricalMeals(7);
        const today = new Date();
        const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const data: typeof chartData = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          const dayMeals = history[key] || [];
          data.push({
            label: DAYS[d.getDay()],
            calories: dayMeals.reduce((s, m) => s + (m.calories || 0), 0),
            protein: dayMeals.reduce((s, m) => s + (m.protein || 0), 0),
            carbs: dayMeals.reduce((s, m) => s + (m.carbs || 0), 0),
            fat: dayMeals.reduce((s, m) => s + (m.fat || 0), 0),
          });
        }
        setChartData(data);
      } catch {}
    })();
  }, [meals.length]);

  const saveFavourites = React.useCallback((updated: FavouriteFood[]) => {
    setFavourites(updated);
    AsyncStorage.setItem("@favourite_foods", JSON.stringify(updated));
  }, []);

  const addToFavourites = React.useCallback((food: { name: string; mealType: string; calories: number; protein: number; carbs: number; fat: number; source?: "manual" | "barcode" | "ai"; barcode?: string }) => {
    setFavourites(prev => {
      const exists = prev.find(f => f.name.toLowerCase() === food.name.toLowerCase());
      if (exists) {
        Alert.alert("Already in Favourites", `${food.name} is already in your favourites list.`);
        return prev;
      }
      const entry: FavouriteFood = {
        id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: food.name,
        mealType: food.mealType,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: food.source ?? "manual",
        barcode: food.barcode,
        addedAt: Date.now(),
        logCount: 0,
      };
      const updated = [entry, ...prev];
      AsyncStorage.setItem("@favourite_foods", JSON.stringify(updated));
      if (Platform.OS !== "web") {
        try { const H = require("expo-haptics"); H.notificationAsync(H.NotificationFeedbackType.Success); } catch {}
      }
      Alert.alert("\u2b50 Added to Favourites", `${food.name} saved for quick logging.`);
      return updated;
    });
  }, []);

  const removeFromFavourites = React.useCallback((id: string) => {
    setFavourites(prev => {
      const updated = prev.filter(f => f.id !== id);
      AsyncStorage.setItem("@favourite_foods", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logFromFavourite = React.useCallback(async (fav: FavouriteFood) => {
    await addMeal({
      name: fav.name,
      mealType: fav.mealType,
      calories: fav.calories,
      protein: fav.protein,
      carbs: fav.carbs,
      fat: fav.fat,
    });
    if (isAuthenticated) {
      dbLogMeal.mutate({
        name: fav.name,
        mealType: fav.mealType,
        calories: fav.calories,
        protein: fav.protein,
        carbs: fav.carbs,
        fat: fav.fat,
      });
    }
    setFavourites(prev => {
      const updated = prev.map(f => f.id === fav.id ? { ...f, logCount: f.logCount + 1 } : f);
      AsyncStorage.setItem("@favourite_foods", JSON.stringify(updated));
      return updated;
    });
    if (Platform.OS !== "web") {
      try { const H = require("expo-haptics"); H.notificationAsync(H.NotificationFeedbackType.Success); } catch {}
    }
    Alert.alert("\u2705 Logged!", `${fav.name} \u2014 ${fav.calories} kcal`);
  }, [addMeal, isAuthenticated]);

  // Water intake tracker
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const WATER_QUICK_ADD = [250, 500, 750];

  React.useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    AsyncStorage.getItem(`@water_intake_${today}`).then(raw => {
      if (raw) try { setWaterIntake(JSON.parse(raw)); } catch {}
    });
    AsyncStorage.getItem("@water_goal").then(raw => {
      if (raw) try { setWaterGoal(JSON.parse(raw)); } catch {}
    });
  }, []);

  const addWater = React.useCallback((ml: number) => {
    setWaterIntake(prev => {
      const next = Math.max(0, prev + ml);
      const today = new Date().toISOString().split("T")[0];
      AsyncStorage.setItem(`@water_intake_${today}`, JSON.stringify(next));
      if (ml > 0 && Platform.OS !== "web") {
        const Haptics = require("expo-haptics");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return next;
    });
  }, []);

  const updateWaterGoal = React.useCallback(() => {
    Alert.prompt
      ? Alert.prompt("Daily Water Goal", "Enter your daily water goal in ml:", [
          { text: "Cancel", style: "cancel" },
          { text: "Save", onPress: (val?: string) => {
            const n = parseInt(val ?? "", 10);
            if (n > 0) { setWaterGoal(n); AsyncStorage.setItem("@water_goal", JSON.stringify(n)); }
          }},
        ], "plain-text", String(waterGoal))
      : Alert.alert("Water Goal", `Current goal: ${waterGoal}ml. To change, update in Settings.`);
  }, [waterGoal]);

  // Load checked ingredients from AsyncStorage
  React.useEffect(() => {
    AsyncStorage.getItem("@shopping_list_checked").then(raw => {
      if (raw) try { setCheckedIngredients(JSON.parse(raw)); } catch {}
    });
  }, []);

  const updateCheckedIngredients = React.useCallback((updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    setCheckedIngredients(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      AsyncStorage.setItem("@shopping_list_checked", JSON.stringify(next));
      return next;
    });
  }, []);

  // Load user profile and AI-generated meal plan
  React.useEffect(() => {
    AsyncStorage.getItem("@guest_profile").then(raw => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (p.dietaryPreference) setUserDietaryPref(p.dietaryPreference);
          if (p.goal) setUserGoal(p.goal);
          setLocalProfile(p);
        } catch {}
      }
    });
    AsyncStorage.getItem("@guest_meal_plan").then(raw => {
      if (raw) {
        try { setAiMealPlan(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  // Regenerate workout plan mutation
  const regenerateWorkoutPlan = trpc.workoutPlan.generate.useMutation({
    onSuccess: (data) => {
      setRegeneratingWorkout(false);
      const json = JSON.stringify(data);
      AsyncStorage.setItem("@guest_workout_plan", json);
      AsyncStorage.setItem("@cached_workout_plan", json);
      Alert.alert("\u2705 Workout Plan Updated", "Your new AI workout plan has been generated. Check the Plans tab to view it.");
    },
    onError: (e) => {
      setRegeneratingWorkout(false);
      Alert.alert("Error", e.message);
    },
  });

  // Regenerate meal plan mutation
  const regenerateMealPlan = trpc.mealPlan.generate.useMutation({
    onSuccess: (data) => {
      setAiMealPlan(data);
      setSelectedDayIndex(0);
      setRegenerating(false);
      const json = JSON.stringify(data);
      AsyncStorage.setItem("@guest_meal_plan", json);
      AsyncStorage.setItem("@cached_meal_plan", json);
      Alert.alert("\u2705 Meal Plan Updated", "Your new AI meal plan has been generated based on your current preferences.");
    },
    onError: (e) => {
      setRegenerating(false);
      Alert.alert("Error", e.message);
    },
  });

  const uploadPhoto = trpc.upload.photo.useMutation();
  const analyzePhoto = trpc.mealLog.analyzePhoto.useMutation();
  const mealSwapGenerate = trpc.mealSwap.generate.useMutation();
  const dbLogMeal = trpc.mealLog.log.useMutation({
    onSuccess: () => {
      setMealName("");
      setSelectedImage(null);
      setSelectedBase64(null);
      setAnalysisResult(null);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  // Pick up barcode scan result when returning from scanner
  useFocusEffect(useCallback(() => {
    refreshFromStorage();
    AsyncStorage.getItem("@barcode_scan_result").then(raw => {
      if (!raw) return;
      try {
        const scan = JSON.parse(raw);
        if (Date.now() - scan.timestamp < 30000) {
          AsyncStorage.removeItem("@barcode_scan_result");
          addMeal({
            name: scan.name,
            mealType,
            calories: scan.calories || 0,
            protein: scan.protein || 0,
            carbs: scan.carbs || 0,
            fat: scan.fat || 0,
          });
          if (isAuthenticated) {
            dbLogMeal.mutate({
              name: scan.name,
              mealType,
              calories: scan.calories || 0,
              protein: scan.protein || 0,
              carbs: scan.carbs || 0,
              fat: scan.fat || 0,
            });
          }
          Alert.alert(
            "\u2705 Scanned & Logged!",
            `${scan.name}\n${scan.calories} kcal \u2022 P: ${scan.protein}g \u2022 C: ${scan.carbs}g \u2022 F: ${scan.fat}g${scan.servingSize ? `\nServing: ${scan.servingSize}` : ""}`
          );
        } else {
          AsyncStorage.removeItem("@barcode_scan_result");
        }
      } catch {
        AsyncStorage.removeItem("@barcode_scan_result");
      }
    });
  }, [refreshFromStorage, mealType, isAuthenticated]));

  const caloriePercent = Math.min(100, (totalCalories / calorieGoal) * 100);
  const calorieColor = caloriePercent > 90 ? "#B45309" : caloriePercent > 70 ? "#FBBF24" : "#FDE68A";

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
          base64: true,
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
          let readUri = selectedImage;
          if (selectedImage.startsWith("ph://")) {
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
      const { url } = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });
      const result = await analyzePhoto.mutateAsync({ photoUrl: url });
      setAnalysisResult({ ...result, uploadedUrl: url });
      setPortionMultiplier(1.0);
      // Auto-set meal type from AI detection
      if ((result as any).mealType && MEAL_TYPES.includes((result as any).mealType)) {
        setMealType((result as any).mealType);
      }
      if (result.notes && !mealName) {
        const firstFood = (result as any).foods?.[0]?.name;
        setMealName(firstFood ? `${firstFood} & more` : String(result.notes).slice(0, 40));
      }
    } catch (e: any) {
      Alert.alert(
        "Analysis Failed",
        e.message?.includes("10001")
          ? "Please try again \u2014 the AI service is temporarily unavailable."
          : e.message ?? "Could not analyze the photo. Please try a clearer image."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function logAnalyzedMeal() {
    if (!analysisResult) return;
    const pm = portionMultiplier;
    const entry = {
      name: mealName || "Analyzed Meal",
      mealType,
      calories: Math.round((analysisResult.totalCalories ?? 0) * pm),
      protein: Math.round((analysisResult.totalProtein ?? 0) * pm),
      carbs: Math.round((analysisResult.totalCarbs ?? 0) * pm),
      fat: Math.round((analysisResult.totalFat ?? 0) * pm),
      photoUri: savePhoto ? (selectedImage ?? undefined) : undefined,
    };
    await addMeal(entry);
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
    setLogMethod(null);
    Alert.alert("\u2705 Logged!", `${entry.name} added \u2014 ${entry.calories} kcal`);
  }

  async function quickLogMeal() {
    if (!mealName.trim()) return;
    if (showCustomEntry) {
      const cal = parseFloat(customCalories) || 0;
      const prot = parseFloat(customProtein) || 0;
      const carb = parseFloat(customCarbs) || 0;
      const f = parseFloat(customFat) || 0;
      const name = mealName.trim();
      const serving = customServing.trim();

      await addMeal({ name: serving ? `${name} (${serving})` : name, mealType, calories: cal, protein: prot, carbs: carb, fat: f });
      if (isAuthenticated) {
        dbLogMeal.mutate({ name: serving ? `${name} (${serving})` : name, mealType, calories: cal, protein: prot, carbs: carb, fat: f });
      }

      if (saveToFavOnLog && cal > 0) {
        addToFavourites({
          name: serving ? `${name} (${serving})` : name,
          mealType,
          calories: Math.round(cal),
          protein: Math.round(prot),
          carbs: Math.round(carb),
          fat: Math.round(f),
          source: "manual",
        });
      }

      setMealName("");
      setCustomCalories("");
      setCustomProtein("");
      setCustomCarbs("");
      setCustomFat("");
      setCustomServing("");
      setSaveToFavOnLog(false);
      Alert.alert("\u2705 Logged!", `${name} \u2014 ${cal} kcal added to your log.`);
    } else {
      await addMeal({ name: mealName.trim(), mealType, calories: 0, protein: 0, carbs: 0, fat: 0 });
      if (isAuthenticated) {
        dbLogMeal.mutate({ name: mealName.trim(), mealType });
      }
      setMealName("");
      Alert.alert("\u2705 Logged!", `${mealName} added to your log.`);
    }
  }

  // Favourite autocomplete matches
  const autoCompleteMatches = React.useMemo(() => {
    if (!mealName.trim() || mealName.length < 2) return [];
    const q = mealName.toLowerCase();
    return favourites
      .filter(f => f.name.toLowerCase().includes(q))
      .sort((a, b) => b.logCount - a.logCount)
      .slice(0, 5);
  }, [mealName, favourites]);

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
        <ImageBackground source={{ uri: MEAL_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.78)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <MaterialIcons name="restaurant" size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Meal Log</Text>
            <Text style={{ color: "#B45309", fontSize: 14, textAlign: "center", lineHeight: 20 }}>Sign in or continue as guest to start tracking.</Text>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // 1B: Parallax scroll value for Meals hero
  const mealScrollY = useSharedValue(0);
  const mealHeroImgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(mealScrollY.value, [0, 200], [0, 100], Extrapolation.CLAMP) }],
  }));
  const mealHeroTxtStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mealScrollY.value, [0, 150], [1, 0], Extrapolation.CLAMP),
  }));
  const onMealScroll = useCallback((e: any) => { mealScrollY.value = e.nativeEvent.contentOffset.y; }, []);

  // Get today's meal plan data
  const aiDayMeals = aiMealPlan?.days?.[selectedDayIndex]?.meals ?? [];
  const aiMealByType: Record<string, any> = {};
  for (const m of aiDayMeals) {
    const t = (m.type ?? "").toLowerCase();
    const mapped = t.includes("breakfast") ? "breakfast" : t.includes("lunch") ? "lunch" : t.includes("dinner") ? "dinner" : "snack";
    if (!aiMealByType[mapped]) aiMealByType[mapped] = m;
  }

  // Count logged meals by type for today
  const loggedByType: Record<string, MealEntry[]> = {};
  for (const m of meals) {
    if (!loggedByType[m.mealType]) loggedByType[m.mealType] = [];
    loggedByType[m.mealType].push(m);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero Header with Parallax */}
      <View style={{ width: "100%", height: 140, overflow: "hidden" }}>
        <ReAnimated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height: 240 }, mealHeroImgStyle]}>
          <ImageBackground source={{ uri: MEAL_BG }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </ReAnimated.View>
        <ReAnimated.View style={[{ flex: 1, backgroundColor: "rgba(8,8,16,0.68)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }, mealHeroTxtStyle]}>
          <View style={{ position: "absolute", top: 52, right: 20, flexDirection: "row", gap: 6 }}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
              onPress={async () => {
                try {
                  const history = await getHistoricalMeals(7);
                  const today = new Date();
                  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const days = [];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    const key = d.toISOString().split("T")[0];
                    const dayMeals = history[key] ?? [];
                    days.push({
                      date: key,
                      dayLabel: i === 0 ? "Today" : DAYS[d.getDay()] + " " + d.getDate(),
                      meals: dayMeals,
                      totalCalories: dayMeals.reduce((s: number, m: MealEntry) => s + (m.calories || 0), 0),
                      totalProtein: dayMeals.reduce((s: number, m: MealEntry) => s + (m.protein || 0), 0),
                      totalCarbs: dayMeals.reduce((s: number, m: MealEntry) => s + (m.carbs || 0), 0),
                      totalFat: dayMeals.reduce((s: number, m: MealEntry) => s + (m.fat || 0), 0),
                    });
                  }
                  await exportMealLogPdf({ days, calorieGoal, macroTargets });
                } catch (e) { Alert.alert("Export Failed", "Could not generate meal log PDF."); }
              }}
            >
              <MaterialIcons name="picture-as-pdf" size={14} color="#FBBF24" />
              <Text style={{ color: "#FBBF24", fontFamily: "DMSans_500Medium", fontSize: 11 }}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
              onPress={() => router.push("/user-guide" as any)}
            >
              <MaterialIcons name="help-outline" size={14} color="#FBBF24" />
              <Text style={{ color: "#FBBF24", fontFamily: "DMSans_500Medium", fontSize: 11 }}>Guide</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>NUTRITION TRACKING</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>Meals</Text>
        </ReAnimated.View>
      </View>

      {/* Daily Summary Card — compact */}
      <View style={{ marginHorizontal: 16, marginTop: -16, backgroundColor: "#150A00", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, zIndex: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: "#B45309", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "uppercase" }}>Today's Nutrition</Text>
          <Text style={{ color: calorieColor, fontFamily: "Outfit_700Bold", fontSize: 11 }}>{Math.round(caloriesRemaining)} kcal left</Text>
        </View>
        <View style={{ height: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
          <View style={{ height: 6, width: `${caloriePercent}%` as any, backgroundColor: calorieColor, borderRadius: 3 }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <MacroStat label="Calories" value={Math.round(totalCalories)} unit="kcal" color="#FBBF24" goal={calorieGoal} />
          <MacroStat label="Protein" value={Math.round(totalProtein)} unit="g" color="#3B82F6" goal={macroTargets.protein} />
          <MacroStat label="Carbs" value={Math.round(totalCarbs)} unit="g" color="#FDE68A" goal={macroTargets.carbs} />
          <MacroStat label="Fat" value={Math.round(totalFat)} unit="g" color="#FBBF24" goal={macroTargets.fat} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={onMealScroll}
        scrollEventThrottle={16}
      >
        {/* ── Log Meal Dropdown Button ── */}
        <View style={{ marginTop: 16, marginBottom: 12, zIndex: 20 }}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 12 }}
            onPress={() => setShowLogDropdown(!showLogDropdown)}
          >
            <MaterialIcons name="add-circle-outline" size={20} color="#0A0500" />
            <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Log a Meal</Text>
            <MaterialIcons name={showLogDropdown ? "expand-less" : "expand-more"} size={20} color="#0A0500" />
          </TouchableOpacity>

          {showLogDropdown && (
            <View style={{ marginTop: 6, backgroundColor: "#150A00", borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", overflow: "hidden" }}>
              {([
                { key: "manual" as const, icon: "edit" as const, label: "Log Manually", desc: "Enter food name and macros" },
                { key: "ai-scan" as const, icon: "photo-camera" as const, label: "AI Scan", desc: "Take a photo for AI calorie estimation" },
                { key: "barcode" as const, icon: "qr-code-scanner" as const, label: "Barcode Scanner", desc: "Scan a product barcode" },
              ]).map((opt, i) => (
                <TouchableOpacity
                  key={opt.key}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: "rgba(245,158,11,0.08)" }}
                  onPress={() => {
                    setShowLogDropdown(false);
                    if (opt.key === "barcode") {
                      router.push("/barcode-scanner" as any);
                    } else {
                      setLogMethod(opt.key);
                    }
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name={opt.icon} size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{opt.label}</Text>
                    <Text style={{ color: "#B45309", fontSize: 11, marginTop: 1 }}>{opt.desc}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#B45309" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Manual Log Panel ── */}
        {logMethod === "manual" && (
          <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: "#FFF7ED", fontSize: 15, fontFamily: "Outfit_700Bold" }}>Manual Log</Text>
              <TouchableOpacity onPress={() => setLogMethod(null)}>
                <MaterialIcons name="close" size={20} color="#B45309" />
              </TouchableOpacity>
            </View>

            {/* Meal Type Selector */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
              {MEAL_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: mealType === t ? "#F59E0B" : "rgba(245,158,11,0.06)", borderWidth: 1, borderColor: mealType === t ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                  onPress={() => setMealType(t)}
                >
                  <MaterialIcons name={MEAL_TYPE_ICONS[t]} size={18} color={mealType === t ? "#0A0500" : "#B45309"} />
                  <Text style={{ color: mealType === t ? "#0A0500" : "#B45309", fontSize: 9, fontFamily: "Outfit_700Bold", marginTop: 2, textTransform: "capitalize" }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Food name input with autocomplete */}
            <View style={{ position: "relative", zIndex: 10 }}>
              <TextInput
                value={mealName}
                onChangeText={(text) => {
                  setMealName(text);
                  setShowAutoComplete(text.length >= 2 && favourites.some(f => f.name.toLowerCase().includes(text.toLowerCase())));
                }}
                placeholder={showCustomEntry ? "Food name (e.g. Grilled chicken breast)" : "What did you eat?"}
                placeholderTextColor="#451A03"
                style={{ backgroundColor: "#0A0500", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#FFF7ED", fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                returnKeyType={showCustomEntry ? "next" : "done"}
                onSubmitEditing={showCustomEntry ? undefined : quickLogMeal}
              />
              {/* Autocomplete dropdown */}
              {showAutoComplete && autoCompleteMatches.length > 0 && (
                <View style={{ position: "absolute", top: 48, left: 0, right: 0, backgroundColor: "#1A0E02", borderRadius: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)", zIndex: 100, maxHeight: 200 }}>
                  {autoCompleteMatches.map(fav => (
                    <TouchableOpacity
                      key={fav.id}
                      style={{ flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.08)", gap: 10 }}
                      onPress={() => {
                        setMealName(fav.name);
                        setShowAutoComplete(false);
                        if (showCustomEntry) {
                          setCustomCalories(String(fav.calories));
                          setCustomProtein(String(fav.protein));
                          setCustomCarbs(String(fav.carbs));
                          setCustomFat(String(fav.fat));
                        }
                      }}
                    >
                      <MaterialIcons name="star" size={16} color="#F59E0B" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 13 }}>{fav.name}</Text>
                        <Text style={{ color: "#B45309", fontSize: 10 }}>{fav.calories} kcal \u2022 P:{fav.protein}g C:{fav.carbs}g F:{fav.fat}g</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Toggle for detailed entry */}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, marginBottom: showCustomEntry ? 8 : 0, alignSelf: "flex-start" }}
              onPress={() => setShowCustomEntry(!showCustomEntry)}
            >
              <MaterialIcons name={showCustomEntry ? "edit-off" : "edit-note"} size={14} color={showCustomEntry ? "#F59E0B" : "#B45309"} />
              <Text style={{ color: showCustomEntry ? "#F59E0B" : "#B45309", fontSize: 11, fontFamily: "Outfit_700Bold" }}>
                {showCustomEntry ? "Hide nutrition fields" : "+ Add nutrition details"}
              </Text>
            </TouchableOpacity>

            {showCustomEntry && (
              <View style={{ gap: 8, marginBottom: 8 }}>
                <TextInput
                  value={customServing}
                  onChangeText={setCustomServing}
                  placeholder="Serving size (e.g. 150g, 1 cup)"
                  placeholderTextColor="#451A03"
                  style={{ backgroundColor: "#0A0500", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#FFF7ED", fontSize: 13, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)" }}
                  returnKeyType="next"
                />
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                  <Text style={{ color: "#F59E0B", fontSize: 12, fontFamily: "Outfit_700Bold", width: 70 }}>Calories</Text>
                  <TextInput value={customCalories} onChangeText={setCustomCalories} placeholder="0" placeholderTextColor="#451A03" keyboardType="numeric" style={{ flex: 1, color: "#FFF7ED", fontSize: 15, fontFamily: "Outfit_700Bold", paddingVertical: 0 }} returnKeyType="next" />
                  <Text style={{ color: "#B45309", fontSize: 11 }}>kcal</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[
                    { label: "PROTEIN", value: customProtein, setter: setCustomProtein, color: "#3B82F6" },
                    { label: "CARBS", value: customCarbs, setter: setCustomCarbs, color: "#FDE68A" },
                    { label: "FAT", value: customFat, setter: setCustomFat, color: "#FBBF24" },
                  ].map(m => (
                    <View key={m.label} style={{ flex: 1, backgroundColor: `${m.color}10`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: `${m.color}20` }}>
                      <Text style={{ color: m.color, fontSize: 9, fontFamily: "Outfit_700Bold", marginBottom: 4 }}>{m.label}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TextInput value={m.value} onChangeText={m.setter} placeholder="0" placeholderTextColor="#451A03" keyboardType="numeric" style={{ flex: 1, color: "#FFF7ED", fontSize: 14, fontFamily: "Outfit_700Bold", paddingVertical: 0 }} returnKeyType="next" />
                        <Text style={{ color: m.color, fontSize: 10 }}>g</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }} onPress={() => setSaveToFavOnLog(!saveToFavOnLog)}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: saveToFavOnLog ? "#F59E0B" : "#451A03", backgroundColor: saveToFavOnLog ? "#F59E0B" : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {saveToFavOnLog && <MaterialIcons name="check" size={14} color="#FFF7ED" />}
                  </View>
                  <Text style={{ color: "#B45309", fontSize: 12, fontFamily: "Outfit_700Bold" }}>Save to Favourites</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8, opacity: !mealName.trim() ? 0.5 : 1 }}
              onPress={quickLogMeal}
              disabled={!mealName.trim()}
            >
              <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 }}>
                {showCustomEntry ? "+ Log Custom Food" : "+ Log Meal"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── AI Scan Panel ── */}
        {logMethod === "ai-scan" && (
          <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: "#FFF7ED", fontSize: 15, fontFamily: "Outfit_700Bold" }}>AI Food Scanner</Text>
              <TouchableOpacity onPress={() => { setLogMethod(null); setSelectedImage(null); setSelectedBase64(null); setAnalysisResult(null); }}>
                <MaterialIcons name="close" size={20} color="#B45309" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#FBBF24", fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
              Take or choose a photo of your meal. AI will identify the food and estimate calories and macros.
            </Text>

            {selectedImage ? (
              <View style={{ marginBottom: 12 }}>
                <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 200, borderRadius: 14, backgroundColor: "#150A00" }} resizeMode="cover" />
                <TouchableOpacity
                  style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(100,116,139,0.56)", borderRadius: 16, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
                  onPress={() => { setSelectedImage(null); setSelectedBase64(null); setAnalysisResult(null); }}
                >
                  <MaterialIcons name="close" size={16} color="#FFF7ED" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#0A0500", borderRadius: 14, paddingVertical: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
                  onPress={() => pickImage(true)}
                >
                  <MaterialIcons name="photo-camera" size={28} color="#F59E0B" />
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#0A0500", borderRadius: 14, paddingVertical: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
                  onPress={() => pickImage(false)}
                >
                  <MaterialIcons name="photo-library" size={28} color="#F59E0B" />
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedImage && !analysisResult && (
              <TouchableOpacity
                style={{ backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 12, opacity: analyzing ? 0.7 : 1 }}
                onPress={analyzeFood}
                disabled={analyzing}
              >
                {analyzing ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator color="#0A0500" size="small" />
                    <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Analyzing food...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="auto-awesome" size={18} color="#0A0500" />
                    <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Estimate Calories with AI</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {analysisResult && (
              <View>
                <View style={{ backgroundColor: "#0A0500", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#22C55E30" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                      <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Analysis Complete</Text>
                    </View>
                    <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#FDE68A", fontSize: 10, fontFamily: "Outfit_700Bold" }}>
                        {analysisResult.confidence === "high" ? "High" : analysisResult.confidence === "medium" ? "Medium" : "Low"} confidence
                      </Text>
                    </View>
                  </View>
                  {/* Health Score + Meal Type Detection */}
                  {(analysisResult.healthScore || analysisResult.mealType) && (
                    <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                      {analysisResult.healthScore != null && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: analysisResult.healthScore >= 7 ? "rgba(34,197,94,0.12)" : analysisResult.healthScore >= 4 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <MaterialIcons name={analysisResult.healthScore >= 7 ? "favorite" : analysisResult.healthScore >= 4 ? "restaurant" : "warning"} size={12} color={analysisResult.healthScore >= 7 ? "#22C55E" : analysisResult.healthScore >= 4 ? "#F59E0B" : "#EF4444"} />
                          <Text style={{ color: analysisResult.healthScore >= 7 ? "#22C55E" : analysisResult.healthScore >= 4 ? "#FDE68A" : "#F87171", fontSize: 10, fontFamily: "Outfit_700Bold" }}>
                            Health: {analysisResult.healthScore}/10
                          </Text>
                        </View>
                      )}
                      {analysisResult.mealType && (
                        <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#FDE68A", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "capitalize" }}>
                            {analysisResult.mealType}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {analysisResult.notes && (
                    <Text style={{ color: "#B45309", fontSize: 12, marginBottom: 8, lineHeight: 18 }}>{String(analysisResult.notes)}</Text>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 10 }}>
                    <MacroStat label="Calories" value={Math.round((analysisResult.totalCalories ?? 0) * portionMultiplier)} unit="kcal" color="#FBBF24" />
                    <MacroStat label="Protein" value={Math.round((analysisResult.totalProtein ?? 0) * portionMultiplier)} unit="g" color="#3B82F6" />
                    <MacroStat label="Carbs" value={Math.round((analysisResult.totalCarbs ?? 0) * portionMultiplier)} unit="g" color="#FDE68A" />
                    <MacroStat label="Fat" value={Math.round((analysisResult.totalFat ?? 0) * portionMultiplier)} unit="g" color="#FBBF24" />
                  </View>
                  {/* Portion Size Adjustment */}
                  <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ color: "#B45309", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "uppercase" }}>Portion Size</Text>
                      <Text style={{ color: "#FDE68A", fontSize: 12, fontFamily: "Outfit_700Bold" }}>{portionMultiplier.toFixed(2)}x</Text>
                    </View>
                    <View style={{ height: 32, justifyContent: "center", marginBottom: 8 }}>
                      <View style={{ height: 4, backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 2 }} />
                      <View style={{ position: "absolute", left: 0, right: 0, height: 4 }}>
                        <View style={{ width: `${((portionMultiplier - 0.25) / 2.75) * 100}%`, height: 4, backgroundColor: "#F59E0B", borderRadius: 2 }} />
                      </View>
                      {/* Slider track - using TouchableOpacity buttons for reliable interaction */}
                      <View style={{ position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-between" }}>
                        <TouchableOpacity onPress={() => setPortionMultiplier(Math.max(0.25, portionMultiplier - 0.05))} style={{ width: 44, height: 32, alignItems: "flex-start", justifyContent: "center" }}>
                          <MaterialIcons name="remove-circle" size={18} color="#F59E0B" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setPortionMultiplier(Math.min(3.0, portionMultiplier + 0.05))} style={{ width: 44, height: 32, alignItems: "flex-end", justifyContent: "center" }}>
                          <MaterialIcons name="add-circle" size={18} color="#F59E0B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {[{ label: "Half", val: 0.5 }, { label: "Regular", val: 1.0 }, { label: "Large", val: 1.5 }, { label: "Double", val: 2.0 }].map(p => (
                        <TouchableOpacity
                          key={p.label}
                          style={{ flex: 1, paddingVertical: 5, borderRadius: 8, alignItems: "center", backgroundColor: Math.abs(portionMultiplier - p.val) < 0.01 ? "#F59E0B" : "rgba(245,158,11,0.08)", borderWidth: 1, borderColor: Math.abs(portionMultiplier - p.val) < 0.01 ? "#F59E0B" : "rgba(245,158,11,0.12)" }}
                          onPress={() => setPortionMultiplier(p.val)}
                        >
                          <Text style={{ color: Math.abs(portionMultiplier - p.val) < 0.01 ? "#0A0500" : "#B45309", fontSize: 10, fontFamily: "Outfit_700Bold" }}>{p.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {analysisResult.foods?.length > 0 && (
                    <View>
                      <Text style={{ color: "#B45309", fontSize: 10, fontFamily: "Outfit_700Bold", marginBottom: 6, textTransform: "uppercase" }}>Detected Foods</Text>
                      {analysisResult.foods.map((food: any, i: number) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: i < analysisResult.foods.length - 1 ? 1 : 0, borderBottomColor: "rgba(245,158,11,0.10)" }}>
                          <Text style={{ color: "#F59E0B", fontSize: 12 }}>{food.name} <Text style={{ color: "#B45309" }}>({food.portion})</Text></Text>
                          <Text style={{ color: "#FBBF24", fontSize: 12, fontFamily: "DMSans_600SemiBold" }}>{food.calories} kcal</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* AI Suggestion */}
                  {analysisResult.suggestion && (
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8, backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}>
                      <MaterialIcons name="lightbulb" size={14} color="#60A5FA" style={{ marginTop: 1 }} />
                      <Text style={{ color: "#93C5FD", fontSize: 11, lineHeight: 16, flex: 1 }}>{String(analysisResult.suggestion)}</Text>
                    </View>
                  )}
                </View>

                {/* Meal type + name + log */}
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                  {MEAL_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={{ flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: "center", backgroundColor: mealType === t ? "#F59E0B" : "rgba(245,158,11,0.06)", borderWidth: 1, borderColor: mealType === t ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                      onPress={() => setMealType(t)}
                    >
                      <MaterialIcons name={MEAL_TYPE_ICONS[t]} size={16} color={mealType === t ? "#0A0500" : "#B45309"} />
                      <Text style={{ color: mealType === t ? "#0A0500" : "#B45309", fontSize: 8, fontFamily: "Outfit_700Bold", textTransform: "capitalize" }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="Meal name (optional)"
                  placeholderTextColor="#451A03"
                  style={{ backgroundColor: "#0A0500", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#FFF7ED", fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={{ backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                  onPress={logAnalyzedMeal}
                >
                  <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 }}>+ Log This Meal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Day Meal Tiles (Breakfast, Lunch, Dinner, Snack) ── */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Today's Meals</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {meals.length > 0 && (
                <Text style={{ color: "#B45309", fontSize: 11 }}>{meals.length} logged</Text>
              )}
              <TouchableOpacity onPress={() => router.push("/meal-timeline")} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <MaterialIcons name="photo-library" size={14} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>Timeline</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 7-Day selector if AI plan exists */}
          {aiMealPlan?.days && aiMealPlan.days.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
              {aiMealPlan.days.map((day: any, i: number) => {
                const dayLabel = day.day ?? `Day ${i + 1}`;
                const shortLabel = dayLabel.replace(/^Day\s*/i, "D").replace(/Monday/i, "Mon").replace(/Tuesday/i, "Tue").replace(/Wednesday/i, "Wed").replace(/Thursday/i, "Thu").replace(/Friday/i, "Fri").replace(/Saturday/i, "Sat").replace(/Sunday/i, "Sun");
                return (
                  <TouchableOpacity
                    key={i}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: selectedDayIndex === i ? "#F59E0B" : "#150A00",
                      borderWidth: 1,
                      borderColor: selectedDayIndex === i ? "#F59E0B" : "rgba(245,158,11,0.10)",
                      minWidth: 44,
                      alignItems: "center",
                    }}
                    onPress={() => { setSelectedDayIndex(i); setSwappedMeals({}); }}
                  >
                    <Text style={{ color: selectedDayIndex === i ? "#0A0500" : "#B45309", fontFamily: "Outfit_700Bold", fontSize: 11 }}>{shortLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* 2x2 Meal Tiles */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {MEAL_TYPES.map(type => {
              const swapped = swappedMeals[type];
              const aiMeal = aiMealByType[type];
              const recipe = swapped
                ? { title: swapped.title, time: swapped.recipe.time, steps: swapped.recipe.steps }
                : aiMeal
                  ? { title: aiMeal.name ?? "AI Meal", time: aiMeal.prepTime ?? "15 min", steps: aiMeal.ingredients ?? aiMeal.steps ?? [] }
                  : MEAL_RECIPES[type];
              const photo = swapped ? swapped.photo : MEAL_PHOTOS[type];
              const cals = swapped ? swapped.calories : (aiMeal?.calories ?? (type === "breakfast" ? 320 : type === "lunch" ? 520 : type === "dinner" ? 480 : 210));
              const prot = swapped ? swapped.protein : (aiMeal?.protein ?? 0);
              const logged = loggedByType[type] ?? [];
              const loggedCals = logged.reduce((s, m) => s + m.calories, 0);

              return (
                <View key={type} style={{ width: "48%" as any, backgroundColor: "#150A00", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                  <Image source={{ uri: photo }} style={{ width: "100%", height: 80 }} resizeMode="cover" />
                  <View style={{ position: "absolute", top: 6, left: 6, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <MaterialIcons name={MEAL_TYPE_ICONS[type]} size={12} color="#FDE68A" />
                    <Text style={{ color: "#FDE68A", fontSize: 9, fontFamily: "Outfit_700Bold", textTransform: "capitalize" }}>{type}</Text>
                  </View>
                  {logged.length > 0 && (
                    <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: "rgba(34,197,94,0.85)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ color: "#FFF", fontSize: 8, fontFamily: "Outfit_700Bold" }}>{Math.round(loggedCals)} kcal</Text>
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 12 }} numberOfLines={1}>{recipe.title}</Text>
                    <Text style={{ color: "#B45309", fontSize: 10, marginTop: 2 }}>{cals} kcal \u2022 {prot}g protein</Text>
                    <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "#F59E0B", borderRadius: 8, paddingVertical: 6, alignItems: "center" }}
                        onPress={() => {
                          addMeal({ name: recipe.title, mealType: type, calories: cals, protein: prot, carbs: swapped ? swapped.carbs : (aiMeal?.carbs ?? 0), fat: swapped ? swapped.fat : (aiMeal?.fat ?? 0) });
                          Alert.alert("\u2705 Logged!", `${recipe.title} added.`);
                        }}
                      >
                        <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 10 }}>+ Log</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "rgba(234,88,12,0.15)", borderRadius: 8, paddingVertical: 6, alignItems: "center", borderWidth: 1, borderColor: "rgba(234,88,12,0.25)" }}
                        onPress={() => {
                          setSwapMealType(type);
                          setSwapMealData({ name: recipe.title, calories: cals, protein: prot, carbs: swapped ? swapped.carbs : (aiMeal?.carbs ?? 0), fat: swapped ? swapped.fat : (aiMeal?.fat ?? 0) });
                        }}
                      >
                        <Text style={{ color: "#EA580C", fontFamily: "Outfit_700Bold", fontSize: 10 }}>Swap</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Inline Nutrition Chart (7-day) ── */}
        {chartData.length > 0 && (
          <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Weekly Calories</Text>
              <TouchableOpacity onPress={() => router.push("/nutrition-charts" as any)}>
                <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>See Details</Text>
              </TouchableOpacity>
            </View>
            <Svg width="100%" height={100} viewBox="0 0 300 100">
              {/* Goal line */}
              <Line x1="0" y1={100 - Math.min(90, (calorieGoal / (calorieGoal * 1.5)) * 90)} x2="300" y2={100 - Math.min(90, (calorieGoal / (calorieGoal * 1.5)) * 90)} stroke="rgba(245,158,11,0.20)" strokeWidth="1" strokeDasharray="4,4" />
              {chartData.map((d, i) => {
                const maxCal = Math.max(calorieGoal * 1.5, ...chartData.map(c => c.calories));
                const barH = Math.max(4, (d.calories / maxCal) * 85);
                const x = 10 + i * 42;
                const isToday = i === chartData.length - 1;
                const overGoal = d.calories > calorieGoal;
                return (
                  <G key={i}>
                    <Rect x={x} y={95 - barH} width={24} height={barH} rx={4} fill={isToday ? "#F59E0B" : overGoal ? "#B45309" : "rgba(245,158,11,0.30)"} />
                    <SvgText x={x + 12} y={98} fontSize={8} fill="#B45309" textAnchor="middle" fontWeight="bold">{d.label}</SvgText>
                    {d.calories > 0 && (
                      <SvgText x={x + 12} y={90 - barH} fontSize={8} fill={isToday ? "#FDE68A" : "#B45309"} textAnchor="middle">{d.calories}</SvgText>
                    )}
                  </G>
                );
              })}
            </Svg>
          </View>
        )}

        {/* ── Water Intake ── */}
        <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons name="water-drop" size={18} color="#3B82F6" />
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Water Intake</Text>
            </View>
            <TouchableOpacity onPress={updateWaterGoal}>
              <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 10 }}>Goal: {waterGoal}ml</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ color: "#FBBF24", fontFamily: "Outfit_800ExtraBold", fontSize: 18 }}>{waterIntake} ml</Text>
            <Text style={{ color: "#B45309", fontSize: 11, alignSelf: "flex-end" }}>{Math.min(100, Math.round((waterIntake / waterGoal) * 100))}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 3, marginBottom: 8 }}>
            <View style={{ height: 6, backgroundColor: waterIntake >= waterGoal ? "#22C55E" : "#3B82F6", borderRadius: 3, width: `${Math.min(100, (waterIntake / waterGoal) * 100)}%` as any }} />
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {WATER_QUICK_ADD.map(ml => (
              <TouchableOpacity
                key={ml}
                style={{ flex: 1, backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(59,130,246,0.18)" }}
                onPress={() => addWater(ml)}
              >
                <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 12 }}>+{ml}ml</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "rgba(239,68,68,0.06)", borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.10)" }}
              onPress={() => addWater(-250)}
            >
              <Text style={{ color: "#EF4444", fontSize: 11 }}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick Add from Saved Foods ── */}
        {favourites.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: "#B45309", fontSize: 10, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 }}>QUICK ADD FROM SAVED FOODS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[...favourites].sort((a, b) => b.logCount - a.logCount).slice(0, 8).map(fav => (
                <TouchableOpacity
                  key={`quick-${fav.id}`}
                  style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", alignItems: "center", minWidth: 90 }}
                  onPress={() => logFromFavourite(fav)}
                >
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 11 }} numberOfLines={1}>{fav.name}</Text>
                  <Text style={{ color: "#F59E0B", fontSize: 9, marginTop: 2 }}>{fav.calories} kcal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Meal Gallery + Pantry + Favourites Links ── */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#150A00", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
            onPress={() => router.push("/meal-photo-gallery" as any)}
          >
            <MaterialIcons name="photo-library" size={18} color="#F59E0B" />
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 10 }}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}
            onPress={() => router.push("/pantry" as any)}
          >
            <MaterialIcons name="kitchen" size={18} color="#3B82F6" />
            <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 10 }}>My Pantry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#150A00", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
            onPress={() => setShowFavourites(!showFavourites)}
          >
            <MaterialIcons name="star" size={18} color="#F59E0B" />
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 10 }}>Saved ({favourites.length})</Text>
          </TouchableOpacity>
        </View>

        {/* ── Favourites Expanded ── */}
        {showFavourites && (
          <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 10 }}>Saved Foods</Text>
            {favourites.length === 0 ? (
              <Text style={{ color: "#B45309", fontSize: 12, textAlign: "center", paddingVertical: 12 }}>No saved foods yet. Star a meal to save it.</Text>
            ) : (
              [...favourites].sort((a, b) => b.logCount - a.logCount).map(fav => (
                <View key={fav.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245,158,11,0.05)", borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 13 }} numberOfLines={1}>{fav.name}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 3 }}>
                      <Text style={{ color: "#F59E0B", fontSize: 10, fontFamily: "Outfit_700Bold" }}>{fav.calories} kcal</Text>
                      <Text style={{ color: "#3B82F6", fontSize: 10 }}>P:{fav.protein}g</Text>
                      <Text style={{ color: "#FDE68A", fontSize: 10 }}>C:{fav.carbs}g</Text>
                      <Text style={{ color: "#FBBF24", fontSize: 10 }}>F:{fav.fat}g</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: "#F59E0B", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 4 }}
                    onPress={() => logFromFavourite(fav)}
                  >
                    <MaterialIcons name="add" size={14} color="#0A0500" />
                    <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 10 }}>Log</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 4 }} onPress={() => {
                    Alert.alert("Remove?", `Remove ${fav.name}?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => removeFromFavourites(fav.id) },
                    ]);
                  }}>
                    <MaterialIcons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Regenerate Plans ── */}
        {aiMealPlan && (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)", opacity: regenerating ? 0.7 : 1 }}
              onPress={() => {
                Alert.alert("Regenerate Meal Plan?", "This will replace your current meal plan.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Regenerate", style: "destructive", onPress: () => {
                    setRegenerating(true);
                    regenerateMealPlan.mutate({ goal: userGoal, dietaryPreference: userDietaryPref, ramadanMode: false, weightKg: localProfile?.weightKg, heightCm: localProfile?.heightCm, age: localProfile?.age, gender: localProfile?.gender, activityLevel: localProfile?.activityLevel });
                  }},
                ]);
              }}
              disabled={regenerating}
            >
              {regenerating ? <ActivityIndicator color="#F59E0B" size="small" /> : <MaterialIcons name="restaurant-menu" size={16} color="#F59E0B" />}
              <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>{regenerating ? "Regenerating..." : "New Meal Plan"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)", opacity: regeneratingWorkout ? 0.7 : 1 }}
              onPress={() => {
                Alert.alert("Regenerate Workout Plan?", "This will replace your current workout plan.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Regenerate", style: "destructive", onPress: () => {
                    setRegeneratingWorkout(true);
                    regenerateWorkoutPlan.mutate({ goal: userGoal, workoutStyle: localProfile?.workoutStyle ?? "gym", daysPerWeek: localProfile?.daysPerWeek ?? 4, fitnessLevel: localProfile?.activityLevel });
                  }},
                ]);
              }}
              disabled={regeneratingWorkout}
            >
              {regeneratingWorkout ? <ActivityIndicator color="#F59E0B" size="small" /> : <MaterialIcons name="fitness-center" size={16} color="#F59E0B" />}
              <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>{regeneratingWorkout ? "Regenerating..." : "New Workout Plan"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Today's Log ── */}
        <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 10 }}>
          Today's Log {meals.length > 0 ? `(${meals.length})` : ""}
        </Text>
        {meals.length === 0 ? (
          <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <MaterialIcons name="restaurant" size={32} color="#B45309" style={{ marginBottom: 8 }} />
            <Text style={{ color: "#B45309", fontSize: 13, textAlign: "center", lineHeight: 20 }}>No meals logged today.</Text>
            <Text style={{ color: "#B45309", fontSize: 11, textAlign: "center", marginTop: 4 }}>Tap above to log your first meal.</Text>
          </View>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={{ backgroundColor: "#150A00", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", flexDirection: "row", alignItems: "center", gap: 10 }}>
              {meal.photoUri ? (
                <Image source={{ uri: meal.photoUri }} style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: "#150A00" }} resizeMode="cover" />
              ) : (
                <View style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name={MEAL_TYPE_ICONS[meal.mealType] ?? "restaurant"} size={22} color="#B45309" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ color: "#FBBF24", fontSize: 9, fontFamily: "Outfit_700Bold", textTransform: "capitalize" }}>{meal.mealType}</Text>
                  </View>
                </View>
                <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{meal.name}</Text>
                {(meal.protein > 0 || meal.carbs > 0 || meal.fat > 0) && (
                  <Text style={{ color: "#B45309", fontSize: 10, marginTop: 1 }}>
                    P:{Math.round(meal.protein)}g \u00b7 C:{Math.round(meal.carbs)}g \u00b7 F:{Math.round(meal.fat)}g
                  </Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                {meal.calories > 0 && (
                  <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{Math.round(meal.calories)}</Text>
                )}
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: favourites.some(f => f.name.toLowerCase() === meal.name.toLowerCase()) ? "rgba(245,158,11,0.20)" : "rgba(245,158,11,0.08)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}
                    onPress={() => addToFavourites({ name: meal.name, mealType: meal.mealType, calories: Math.round(meal.calories), protein: Math.round(meal.protein), carbs: Math.round(meal.carbs), fat: Math.round(meal.fat), source: "manual" })}
                  >
                    <MaterialIcons name={favourites.some(f => f.name.toLowerCase() === meal.name.toLowerCase()) ? "star" : "star-outline"} size={14} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: "#EF444420", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}
                    onPress={() => removeMeal(meal.id)}
                  >
                    <MaterialIcons name="close" size={14} color="#B45309" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* ── Shopping List (collapsible) ── */}
        {aiMealPlan?.days && aiMealPlan.days.length > 0 && (() => {
          const ingredientMap: Record<string, { count: number; sources: string[] }> = {};
          for (const day of aiMealPlan.days) {
            for (const meal of (day.meals ?? [])) {
              const ingredients = meal.ingredients ?? meal.steps ?? [];
              for (const ing of ingredients) {
                const normalized = (typeof ing === "string" ? ing : String(ing)).trim();
                if (!normalized) continue;
                const key = normalized.toLowerCase();
                if (!ingredientMap[key]) ingredientMap[key] = { count: 0, sources: [] };
                ingredientMap[key].count += 1;
                const mName = meal.name ?? "Meal";
                if (!ingredientMap[key].sources.includes(mName)) ingredientMap[key].sources.push(mName);
              }
            }
          }
          const sortedIngredients = Object.entries(ingredientMap)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([key, val]) => ({ key, display: key.charAt(0).toUpperCase() + key.slice(1), count: val.count, sources: val.sources }));
          const checkedCount = sortedIngredients.filter(i => checkedIngredients[i.key]).length;

          return (
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              <TouchableOpacity
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: showShoppingList ? 10 : 0 }}
                onPress={() => setShowShoppingList(!showShoppingList)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <MaterialIcons name="shopping-cart" size={16} color="#F59E0B" />
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Weekly Shopping List</Text>
                  <View style={{ backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 10 }}>{checkedCount}/{sortedIngredients.length}</Text>
                  </View>
                </View>
                <MaterialIcons name={showShoppingList ? "expand-less" : "expand-more"} size={20} color="#B45309" />
              </TouchableOpacity>

              {showShoppingList && (
                <View style={{ backgroundColor: "#150A00", borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", overflow: "hidden" }}>
                  <View style={{ height: 3, backgroundColor: "rgba(245,158,11,0.10)" }}>
                    <View style={{ height: 3, backgroundColor: "#F59E0B", width: `${sortedIngredients.length > 0 ? (checkedCount / sortedIngredients.length) * 100 : 0}%` as any, borderRadius: 2 }} />
                  </View>
                  <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: 8 }}>
                      <TouchableOpacity onPress={async () => {
                        const uncheckedItems = sortedIngredients.filter(i => !checkedIngredients[i.key]);
                        const allItems = uncheckedItems.length > 0 ? uncheckedItems : sortedIngredients;
                        const text = allItems.map(i => `\u25a1 ${i.display}${i.count > 1 ? ` (x${i.count})` : ""}`).join("\n");
                        await Clipboard.setStringAsync(`PeakPulse Shopping List:\n\n${text}`);
                        Alert.alert("\u2705 Copied!", `${allItems.length} items copied to clipboard.`);
                      }}>
                        <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 10 }}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        const allChecked: Record<string, boolean> = {};
                        sortedIngredients.forEach(i => { allChecked[i.key] = true; });
                        updateCheckedIngredients(allChecked);
                      }}>
                        <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 10 }}>Check All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => updateCheckedIngredients({})}>
                        <Text style={{ color: "#B45309", fontFamily: "Outfit_700Bold", fontSize: 10 }}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                    {sortedIngredients.map((item, idx) => {
                      const isChecked = !!checkedIngredients[item.key];
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: idx < sortedIngredients.length - 1 ? 1 : 0, borderBottomColor: "rgba(245,158,11,0.06)", opacity: isChecked ? 0.5 : 1 }}
                          onPress={() => updateCheckedIngredients(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                        >
                          <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: isChecked ? "#F59E0B" : "rgba(245,158,11,0.25)", backgroundColor: isChecked ? "#F59E0B" : "transparent", alignItems: "center", justifyContent: "center" }}>
                            {isChecked && <MaterialIcons name="check" size={12} color="#FFF7ED" />}
                          </View>
                          <Text style={{ color: isChecked ? "#B45309" : "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 13, textDecorationLine: isChecked ? "line-through" : "none", flex: 1 }}>{item.display}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })()}
      </ScrollView>

      {/* Swap Modal */}
      {swapMealType !== null && (
        <MealSwapModal
          mealType={swapMealType}
          mealData={swapMealData}
          dietaryPreference={userDietaryPref}
          fitnessGoal={userGoal}
          generateSwaps={mealSwapGenerate}
          onClose={() => { setSwapMealType(null); setSwapMealData(null); }}
          onSelect={(item) => {
            const swapPhoto = SWAP_PHOTOS[item.name] ?? MEAL_PHOTOS[swapMealType];
            setSwappedMeals(prev => ({
              ...prev,
              [swapMealType]: {
                title: item.name,
                icon: "",
                photo: swapPhoto,
                recipe: { time: item.prepTime, steps: item.instructions },
                calories: item.calories,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
              },
            }));
            setSwapMealType(null);
            setSwapMealData(null);
            Alert.alert("\u2705 Meal Swapped!", `${item.name} is now your ${swapMealType}.`);
          }}
        />
      )}
    </View>
  );
}

function MacroStat({ label, value, unit, color, goal }: { label: string; value: number; unit: string; color: string; goal?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color, fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>{Math.round(value)}</Text>
      <Text style={{ color: "#B45309", fontSize: 9, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: "#B45309", fontSize: 9 }}>{label}</Text>
      {goal !== undefined && goal > 0 && <Text style={{ color: "#451A03", fontSize: 8 }}>/ {goal}</Text>}
    </View>
  );
}

function MealSwapModal({ mealType, mealData, dietaryPreference, fitnessGoal, generateSwaps, onClose, onSelect }: {
  mealType: string;
  mealData: { name: string; calories: number; protein: number; carbs: number; fat: number } | null;
  dietaryPreference: string;
  fitnessGoal: string;
  generateSwaps: any;
  onClose: () => void;
  onSelect: (item: { name: string; calories: number; protein: number; carbs: number; fat: number; prepTime: string; dietaryTags: string[]; description: string; ingredients: string[]; instructions: string[] }) => void;
}) {
  const [alternatives, setAlternatives] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!mealData) return;
    setLoading(true);
    setError(null);
    generateSwaps.mutate(
      { mealName: mealData.name, mealType, calories: mealData.calories, protein: mealData.protein, carbs: mealData.carbs, fat: mealData.fat, dietaryPreference, fitnessGoal },
      {
        onSuccess: (data: any) => { setAlternatives(data.alternatives ?? []); setLoading(false); },
        onError: () => { setError("Could not generate alternatives. Please try again."); setLoading(false); },
      }
    );
  }, []);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,5,0,0.88)", justifyContent: "flex-end", zIndex: 999 }}>
      <View style={{ backgroundColor: "#0A0500", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, paddingBottom: 40, maxHeight: "90%", borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(245,158,11,0.25)", alignSelf: "center", marginBottom: 16 }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1.5 }}>AI MEAL SWAP</Text>
            <Text style={{ color: "#FFF7ED", fontSize: 20, fontFamily: "Outfit_800ExtraBold", marginTop: 2 }}>
              Swap {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </Text>
            {mealData && (
              <Text style={{ color: "#B45309", fontSize: 11, marginTop: 2 }}>Replacing: {mealData.name} \u00b7 {mealData.calories} kcal</Text>
            )}
          </View>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={18} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Generating alternatives...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={{ alignItems: "center", paddingVertical: 30, paddingHorizontal: 20, gap: 12 }}>
            <MaterialIcons name="error-outline" size={36} color="#DC2626" />
            <Text style={{ color: "#DC2626", fontFamily: "Outfit_700Bold", fontSize: 15, textAlign: "center" }}>{error}</Text>
            <TouchableOpacity style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }} onPress={onClose}>
              <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedItem && !loading && (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }} onPress={() => setSelectedItem(null)}>
              <MaterialIcons name="arrow-back" size={16} color="#F59E0B" />
              <Text style={{ color: "#F59E0B", fontFamily: "DMSans_500Medium", fontSize: 13 }}>Back to alternatives</Text>
            </TouchableOpacity>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 20, marginBottom: 4 }}>{selectedItem.name}</Text>
            <Text style={{ color: "#B45309", fontSize: 13, lineHeight: 20, marginBottom: 12 }}>{selectedItem.description}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Calories", value: `${selectedItem.calories} kcal`, color: "#FBBF24" },
                { label: "Protein", value: `${selectedItem.protein}g`, color: "#3B82F6" },
                { label: "Carbs", value: `${selectedItem.carbs}g`, color: "#FDE68A" },
                { label: "Fat", value: `${selectedItem.fat}g`, color: "#F97316" },
              ].map(m => (
                <View key={m.label} style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                  <Text style={{ color: m.color, fontFamily: "Outfit_700Bold", fontSize: 13 }}>{m.value}</Text>
                  <Text style={{ color: "#B45309", fontSize: 10, marginTop: 2 }}>{m.label}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 8, letterSpacing: 0.5 }}>INGREDIENTS</Text>
            {(selectedItem.ingredients ?? []).map((ing: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Text style={{ color: "#F59E0B", fontSize: 12 }}>\u2022</Text>
                <Text style={{ color: "#FFF7ED", fontSize: 13, flex: 1, lineHeight: 20 }}>{ing}</Text>
              </View>
            ))}
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13, marginTop: 14, marginBottom: 8, letterSpacing: 0.5 }}>HOW TO MAKE IT</Text>
            {(selectedItem.instructions ?? []).map((step: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "Outfit_700Bold" }}>{i + 1}</Text>
                </View>
                <Text style={{ color: "#FFF7ED", fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 20 }}
              onPress={() => onSelect(selectedItem)}
            >
              <Text style={{ color: "#0A0500", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>Swap to This Meal</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {!loading && !error && !selectedItem && alternatives.length > 0 && (
          <FlatList
            data={alternatives}
            keyExtractor={(item, i) => item.name + i}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ backgroundColor: "#150A00", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", flexDirection: "row", alignItems: "center", gap: 12 }}
                onPress={() => setSelectedItem(item)}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="restaurant" size={22} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 3 }} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ color: "#FBBF24", fontSize: 10, fontFamily: "DMSans_600SemiBold" }}>{item.calories} kcal</Text>
                    <Text style={{ color: "#3B82F6", fontSize: 10 }}>P:{item.protein}g</Text>
                    <Text style={{ color: "#FDE68A", fontSize: 10 }}>C:{item.carbs}g</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#B45309" />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}
