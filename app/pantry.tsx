import React, { useState, useCallback, useMemo } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, TextInput, Alert, ActivityIndicator,
  FlatList, Modal, Platform, ImageBackground,
} from "react-native";
import ReAnimated, { FadeInDown } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { usePantry, PANTRY_CATEGORIES, COMMON_PANTRY_ITEMS, CATEGORY_ICONS, type PantryItem, type PantryCategory, type AISuggestedMeal, type ShoppingSuggestion } from "@/lib/pantry-context";
import { useCalories } from "@/lib/calorie-context";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PANTRY_BG = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80";

type ViewMode = "inventory" | "add" | "suggestions" | "shopping";

export default function PantryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isGuest } = useGuestAuth();
  const canUse = isAuthenticated || isGuest;
  const { items, addItem, addItems, removeItem, clearAll, getItemsByCategory, getExpiringItems } = usePantry();
  const { calorieGoal, macroTargets } = useCalories();

  const [viewMode, setViewMode] = useState<ViewMode>("inventory");
  // Add item state
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<PantryCategory>("Other");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(true);
  // AI scan state
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<{ name: string; category: PantryCategory }[]>([]);
  const [showScanResults, setShowScanResults] = useState(false);
  // AI meal suggestions
  const [suggestedMeals, setSuggestedMeals] = useState<AISuggestedMeal[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  // Shopping suggestions
  const [shoppingSuggestions, setShoppingSuggestions] = useState<ShoppingSuggestion[]>([]);
  const [loadingShopping, setLoadingShopping] = useState(false);
  // Expanded meal card
  const [expandedMealIdx, setExpandedMealIdx] = useState<number | null>(null);
  // Edit item modal
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  const uploadPhoto = trpc.upload.photo.useMutation();

  const grouped = useMemo(() => getItemsByCategory(), [items]);
  const expiringItems = useMemo(() => getExpiringItems(3), [items]);
  const nonEmptyCategories = useMemo(() => PANTRY_CATEGORIES.filter(c => grouped[c]?.length > 0), [grouped]);

  // Load user dietary preference and goal from AsyncStorage
  const [userGoal, setUserGoal] = useState("build_muscle");
  const [userDiet, setUserDiet] = useState("omnivore");
  React.useEffect(() => {
    AsyncStorage.getItem("@user_profile").then(raw => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (p.goal) setUserGoal(p.goal);
          if (p.dietaryPreference) setUserDiet(p.dietaryPreference);
        } catch {}
      }
    });
  }, []);

  // ── AI Scan Pantry Photo ──
  const handleAIScan = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setScanning(true);
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      // Upload to S3
      const { url: photoUrl } = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });
      // Call AI to identify items
      const aiResponse = await fetch(`${Platform.OS === "web" ? "" : "http://127.0.0.1:3000"}/api/trpc/pantry.scanPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { photoUrl } }),
      }).catch(() => null);
      if (aiResponse?.ok) {
        const data = await aiResponse.json();
        const items = data?.result?.data?.json?.items ?? [];
        setScannedItems(items);
        setShowScanResults(true);
      } else {
        Alert.alert("Scan Failed", "Could not identify items. Try adding them manually.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to scan pantry photo.");
    } finally {
      setScanning(false);
    }
  }, [uploadPhoto]);

  // ── Add scanned items to pantry ──
  const handleAddScannedItems = useCallback(async () => {
    await addItems(scannedItems.map(item => ({
      name: item.name,
      category: item.category,
      source: "ai-scan" as const,
    })));
    setScannedItems([]);
    setShowScanResults(false);
    setViewMode("inventory");
    Alert.alert("Added", `${scannedItems.length} items added to your pantry.`);
  }, [scannedItems, addItems]);

  // ── Manual add ──
  const handleManualAdd = useCallback(async () => {
    if (!newItemName.trim()) return;
    await addItem({
      name: newItemName.trim(),
      category: newItemCategory,
      quantity: newItemQuantity ? parseFloat(newItemQuantity) : undefined,
      unit: newItemUnit || undefined,
      source: "manual",
    });
    setNewItemName("");
    setNewItemQuantity("");
    setNewItemUnit("");
    Alert.alert("Added", `${newItemName.trim()} added to your pantry.`);
  }, [newItemName, newItemCategory, newItemQuantity, newItemUnit, addItem]);

  // ── AI Meal Suggestions ──
  const handleGetSuggestions = useCallback(async () => {
    if (items.length === 0) {
      Alert.alert("Empty Pantry", "Add some items to your pantry first so AI can suggest meals.");
      return;
    }
    setLoadingSuggestions(true);
    setSuggestedMeals([]);
    setViewMode("suggestions");
    try {
      const pantryList = items.map(i => i.name).join(", ");
      // Use the tRPC endpoint
      const response = await fetch(`${Platform.OS === "web" ? "" : "http://127.0.0.1:3000"}/api/trpc/pantry.suggestMeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {
          pantryItems: pantryList,
          calorieGoal: calorieGoal || 2000,
          proteinGoal: macroTargets?.protein || 150,
          carbsGoal: macroTargets?.carbs || 250,
          fatGoal: macroTargets?.fat || 65,
          dietaryPreference: userDiet,
          fitnessGoal: userGoal,
        }}),
      });
      if (response.ok) {
        const data = await response.json();
        const meals = data?.result?.data?.json?.meals ?? [];
        setSuggestedMeals(meals);
      } else {
        // Fallback: generate locally with basic logic
        generateFallbackSuggestions();
      }
    } catch {
      generateFallbackSuggestions();
    } finally {
      setLoadingSuggestions(false);
    }
  }, [items, calorieGoal, macroTargets, userDiet, userGoal]);

  // ── Smart Shopping Suggestions ──
  const handleGetShopping = useCallback(async () => {
    if (items.length === 0) {
      Alert.alert("Empty Pantry", "Add some items first so AI can suggest what else you need.");
      return;
    }
    setLoadingShopping(true);
    setShoppingSuggestions([]);
    setViewMode("shopping");
    try {
      const pantryList = items.map(i => i.name).join(", ");
      const response = await fetch(`${Platform.OS === "web" ? "" : "http://127.0.0.1:3000"}/api/trpc/pantry.suggestShopping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {
          pantryItems: pantryList,
          calorieGoal: calorieGoal || 2000,
          proteinGoal: macroTargets?.protein || 150,
          carbsGoal: macroTargets?.carbs || 250,
          fatGoal: macroTargets?.fat || 65,
          dietaryPreference: userDiet,
          fitnessGoal: userGoal,
        }}),
      });
      if (response.ok) {
        const data = await response.json();
        const suggestions = data?.result?.data?.json?.suggestions ?? [];
        setShoppingSuggestions(suggestions);
      } else {
        generateFallbackShopping();
      }
    } catch {
      generateFallbackShopping();
    } finally {
      setLoadingShopping(false);
    }
  }, [items, calorieGoal, macroTargets, userDiet, userGoal]);

  // ── Fallback suggestions when server is unavailable ──
  const generateFallbackSuggestions = () => {
    const proteins = items.filter(i => i.category === "Proteins").map(i => i.name);
    const carbs = items.filter(i => i.category === "Grains & Carbs").map(i => i.name);
    const vegs = items.filter(i => i.category === "Vegetables").map(i => i.name);
    const meals: AISuggestedMeal[] = [];
    if (proteins.length > 0 && carbs.length > 0) {
      meals.push({
        name: `${proteins[0]} with ${carbs[0]}`,
        description: `A simple, protein-rich meal using what you have.`,
        ingredients: [
          { name: proteins[0], fromPantry: true, quantity: "150g" },
          { name: carbs[0], fromPantry: true, quantity: "1 serving" },
          ...(vegs.length > 0 ? [{ name: vegs[0], fromPantry: true, quantity: "1 cup" }] : []),
        ],
        missingIngredients: [],
        estimatedCalories: 450,
        estimatedProtein: 35,
        estimatedCarbs: 40,
        estimatedFat: 15,
        prepTime: "20 min",
        instructions: [`Season and cook ${proteins[0]}`, `Prepare ${carbs[0]} as a side`, vegs.length > 0 ? `Steam or sauté ${vegs[0]}` : "Add a side salad if available", "Plate and enjoy"],
      });
    }
    if (proteins.length > 1) {
      meals.push({
        name: `${proteins[1]} Stir-Fry`,
        description: `Quick stir-fry with available ingredients.`,
        ingredients: [
          { name: proteins[1], fromPantry: true, quantity: "150g" },
          ...(vegs.slice(0, 2).map(v => ({ name: v, fromPantry: true, quantity: "1/2 cup" }))),
          { name: "Soy Sauce", fromPantry: items.some(i => i.name.toLowerCase().includes("soy")), quantity: "1 tbsp" },
        ],
        missingIngredients: items.some(i => i.name.toLowerCase().includes("soy")) ? [] : ["Soy Sauce"],
        estimatedCalories: 380,
        estimatedProtein: 30,
        estimatedCarbs: 20,
        estimatedFat: 18,
        prepTime: "15 min",
        instructions: ["Slice protein into strips", "Heat oil in a wok or large pan", "Stir-fry protein until cooked", "Add vegetables and cook 3-4 min", "Season with soy sauce and serve"],
      });
    }
    if (meals.length === 0) {
      meals.push({
        name: "Simple Pantry Bowl",
        description: "A basic bowl using your available ingredients.",
        ingredients: items.slice(0, 3).map(i => ({ name: i.name, fromPantry: true, quantity: "1 serving" })),
        missingIngredients: [],
        estimatedCalories: 350,
        estimatedProtein: 20,
        estimatedCarbs: 35,
        estimatedFat: 12,
        prepTime: "15 min",
        instructions: ["Prepare each ingredient", "Combine in a bowl", "Season to taste"],
      });
    }
    setSuggestedMeals(meals);
  };

  const generateFallbackShopping = () => {
    const hasProtein = items.some(i => i.category === "Proteins");
    const hasCarbs = items.some(i => i.category === "Grains & Carbs");
    const hasVeg = items.some(i => i.category === "Vegetables");
    const suggestions: ShoppingSuggestion[] = [];
    if (!hasProtein) {
      suggestions.push({ name: "Chicken Breast", category: "Proteins", reason: "Essential protein source for muscle building and recovery", estimatedCost: "$5-8", mealsItEnables: ["Grilled Chicken Bowl", "Chicken Stir-Fry", "Chicken Salad"], priority: "essential" });
      suggestions.push({ name: "Eggs", category: "Proteins", reason: "Versatile, affordable protein — great for any meal", estimatedCost: "$3-5", mealsItEnables: ["Scrambled Eggs", "Omelette", "Egg Fried Rice"], priority: "essential" });
    }
    if (!hasCarbs) {
      suggestions.push({ name: "Rice", category: "Grains & Carbs", reason: "Affordable staple carb that pairs with everything", estimatedCost: "$2-4", mealsItEnables: ["Chicken & Rice", "Stir-Fry Bowl", "Rice Pudding"], priority: "essential" });
    }
    if (!hasVeg) {
      suggestions.push({ name: "Broccoli", category: "Vegetables", reason: "Nutrient-dense, high in fibre and vitamins", estimatedCost: "$2-3", mealsItEnables: ["Chicken & Broccoli", "Stir-Fry", "Steamed Veg Side"], priority: "recommended" });
      suggestions.push({ name: "Spinach", category: "Vegetables", reason: "Iron-rich leafy green, great raw or cooked", estimatedCost: "$2-3", mealsItEnables: ["Smoothie", "Salad", "Sautéed Spinach"], priority: "recommended" });
    }
    if (suggestions.length === 0) {
      suggestions.push({ name: "Greek Yogurt", category: "Dairy", reason: "High-protein snack, great for post-workout recovery", estimatedCost: "$4-6", mealsItEnables: ["Yogurt Parfait", "Smoothie", "Protein Snack"], priority: "nice-to-have" });
    }
    setShoppingSuggestions(suggestions);
  };

  // ── Log suggested meal to calorie tracker ──
  const { addMeal } = useCalories();
  const handleLogMeal = useCallback((meal: AISuggestedMeal) => {
    addMeal({
      name: meal.name,
      mealType: "lunch",
      calories: meal.estimatedCalories,
      protein: meal.estimatedProtein,
      carbs: meal.estimatedCarbs,
      fat: meal.estimatedFat,
    });
    Alert.alert("Logged", `${meal.name} added to your meal log.`);
  }, [addMeal]);

  // ── Render ──
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero Header */}
      <View style={{ width: "100%", height: 130, overflow: "hidden" }}>
        <ImageBackground source={{ uri: PANTRY_BG }} style={{ width: "100%", height: 200 }} resizeMode="cover" />
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(8,8,16,0.72)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ position: "absolute", top: 52, left: 16 }}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF7ED" />
          </TouchableOpacity>
          <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>SMART KITCHEN</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>My Pantry</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
        {([
          { key: "inventory" as ViewMode, label: "Inventory", icon: "inventory-2" as const },
          { key: "add" as ViewMode, label: "Add Items", icon: "add-circle-outline" as const },
          { key: "suggestions" as ViewMode, label: "AI Meals", icon: "auto-awesome" as const },
          { key: "shopping" as ViewMode, label: "Shopping", icon: "shopping-cart" as const },
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => {
              if (tab.key === "suggestions") handleGetSuggestions();
              else if (tab.key === "shopping") handleGetShopping();
              else setViewMode(tab.key);
            }}
            style={{
              flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
              paddingVertical: 8, borderRadius: 12,
              backgroundColor: viewMode === tab.key ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.04)",
              borderWidth: 1, borderColor: viewMode === tab.key ? "rgba(245,158,11,0.30)" : "rgba(245,158,11,0.08)",
            }}
          >
            <MaterialIcons name={tab.icon} size={16} color={viewMode === tab.key ? "#F59E0B" : "#92400E"} />
            <Text style={{ color: viewMode === tab.key ? "#F59E0B" : "#92400E", fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* ═══ INVENTORY VIEW ═══ */}
        {viewMode === "inventory" && (
          <View style={{ gap: 16 }}>
            {/* Stats bar */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                <Text style={{ color: "#92400E", fontSize: 10, fontFamily: "Outfit_700Bold" }}>TOTAL ITEMS</Text>
                <Text style={{ color: "#FDE68A", fontSize: 22, fontFamily: "Outfit_800ExtraBold" }}>{items.length}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                <Text style={{ color: "#92400E", fontSize: 10, fontFamily: "Outfit_700Bold" }}>CATEGORIES</Text>
                <Text style={{ color: "#FDE68A", fontSize: 22, fontFamily: "Outfit_800ExtraBold" }}>{nonEmptyCategories.length}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: expiringItems.length > 0 ? "rgba(239,68,68,0.08)" : "#150A00", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: expiringItems.length > 0 ? "rgba(239,68,68,0.20)" : "rgba(245,158,11,0.10)" }}>
                <Text style={{ color: expiringItems.length > 0 ? "#EF4444" : "#92400E", fontSize: 10, fontFamily: "Outfit_700Bold" }}>EXPIRING</Text>
                <Text style={{ color: expiringItems.length > 0 ? "#F87171" : "#FDE68A", fontSize: 22, fontFamily: "Outfit_800ExtraBold" }}>{expiringItems.length}</Text>
              </View>
            </View>

            {/* Expiring soon warning */}
            {expiringItems.length > 0 && (
              <View style={{ backgroundColor: "rgba(239,68,68,0.06)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <MaterialIcons name="warning" size={16} color="#EF4444" />
                  <Text style={{ color: "#F87171", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Expiring Soon</Text>
                </View>
                {expiringItems.slice(0, 3).map(item => (
                  <Text key={item.id} style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, marginLeft: 22 }}>
                    {item.name} — expires {new Date(item.expiresAt!).toLocaleDateString()}
                  </Text>
                ))}
              </View>
            )}

            {/* Empty state */}
            {items.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <MaterialIcons name="kitchen" size={48} color="#92400E" />
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 18, marginTop: 12 }}>Your Pantry is Empty</Text>
                <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 13, textAlign: "center", marginTop: 6, maxWidth: 280 }}>
                  Add items manually or scan your pantry/fridge with AI to get started. Then get personalised meal suggestions!
                </Text>
                <TouchableOpacity
                  onPress={() => setViewMode("add")}
                  style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F59E0B", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
                >
                  <MaterialIcons name="add" size={18} color="#0A0500" />
                  <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Add Items</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Grouped inventory */}
            {nonEmptyCategories.map(cat => (
              <ReAnimated.View key={cat} entering={FadeInDown.duration(300)} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MaterialIcons name={CATEGORY_ICONS[cat] as any} size={18} color="#F59E0B" />
                  <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{cat}</Text>
                  <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 11 }}>({grouped[cat].length})</Text>
                </View>
                {grouped[cat].map(item => (
                  <View key={item.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#150A00", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>{item.name}</Text>
                      {(item.quantity || item.unit) && (
                        <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                          {item.quantity ? `${item.quantity}` : ""}{item.unit ? ` ${item.unit}` : ""}
                        </Text>
                      )}
                    </View>
                    {item.source === "ai-scan" && (
                      <View style={{ backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 }}>
                        <Text style={{ color: "#3B82F6", fontSize: 9, fontFamily: "DMSans_600SemiBold" }}>AI SCAN</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={{ padding: 4 }}>
                      <MaterialIcons name="close" size={18} color="#92400E" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ReAnimated.View>
            ))}

            {/* Clear all */}
            {items.length > 0 && (
              <TouchableOpacity
                onPress={() => Alert.alert("Clear Pantry", "Remove all items from your pantry?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear All", style: "destructive", onPress: clearAll },
                ])}
                style={{ alignSelf: "center", marginTop: 8, paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ color: "#92400E", fontFamily: "DMSans_500Medium", fontSize: 12 }}>Clear All Items</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ═══ ADD ITEMS VIEW ═══ */}
        {viewMode === "add" && (
          <View style={{ gap: 16 }}>
            {/* AI Scan Button */}
            <TouchableOpacity
              onPress={handleAIScan}
              disabled={scanning}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.20)" }}
            >
              {scanning ? (
                <ActivityIndicator color="#3B82F6" size="small" />
              ) : (
                <MaterialIcons name="photo-camera" size={24} color="#3B82F6" />
              )}
              <View>
                <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 15 }}>
                  {scanning ? "Scanning..." : "Scan Pantry / Fridge"}
                </Text>
                <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                  Take a photo and AI will identify your items
                </Text>
              </View>
            </TouchableOpacity>

            {/* Manual Entry */}
            <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
              <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 12 }}>Add Manually</Text>
              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="Item name (e.g. Chicken Breast)"
                placeholderTextColor="#92400E"
                returnKeyType="done"
                onSubmitEditing={handleManualAdd}
                style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 12, padding: 14, color: "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 15, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", marginBottom: 10 }}
              />
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                <TextInput
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  placeholder="Qty"
                  placeholderTextColor="#92400E"
                  keyboardType="numeric"
                  style={{ flex: 1, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 12, padding: 12, color: "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}
                />
                <TextInput
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                  placeholder="Unit (g, pcs, ml)"
                  placeholderTextColor="#92400E"
                  style={{ flex: 2, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 12, padding: 12, color: "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}
                />
              </View>

              {/* Category picker */}
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", marginBottom: 10 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name={CATEGORY_ICONS[newItemCategory] as any} size={18} color="#F59E0B" />
                  <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 14 }}>{newItemCategory}</Text>
                </View>
                <MaterialIcons name={showCategoryPicker ? "expand-less" : "expand-more"} size={20} color="#92400E" />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {PANTRY_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => { setNewItemCategory(cat); setShowCategoryPicker(false); }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: newItemCategory === cat ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.04)", borderWidth: 1, borderColor: newItemCategory === cat ? "rgba(245,158,11,0.30)" : "rgba(245,158,11,0.08)" }}
                    >
                      <MaterialIcons name={CATEGORY_ICONS[cat] as any} size={14} color={newItemCategory === cat ? "#F59E0B" : "#92400E"} />
                      <Text style={{ color: newItemCategory === cat ? "#F59E0B" : "#92400E", fontFamily: "DMSans_500Medium", fontSize: 11 }}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                onPress={handleManualAdd}
                disabled={!newItemName.trim()}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: newItemName.trim() ? "#F59E0B" : "rgba(245,158,11,0.15)", borderRadius: 12, paddingVertical: 12 }}
              >
                <MaterialIcons name="add" size={18} color={newItemName.trim() ? "#0A0500" : "#92400E"} />
                <Text style={{ color: newItemName.trim() ? "#0A0500" : "#92400E", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Add to Pantry</Text>
              </TouchableOpacity>
            </View>

            {/* Quick-add chips */}
            <View>
              <TouchableOpacity onPress={() => setShowQuickAdd(!showQuickAdd)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <MaterialIcons name="bolt" size={18} color="#F59E0B" />
                <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Quick Add Common Items</Text>
                <MaterialIcons name={showQuickAdd ? "expand-less" : "expand-more"} size={18} color="#92400E" />
              </TouchableOpacity>
              {showQuickAdd && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {COMMON_PANTRY_ITEMS.filter(ci => !items.some(i => i.name.toLowerCase() === ci.name.toLowerCase())).map(ci => (
                    <TouchableOpacity
                      key={ci.name}
                      onPress={() => addItem({ name: ci.name, category: ci.category, source: "manual" })}
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.06)", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                    >
                      <MaterialIcons name="add" size={12} color="#F59E0B" />
                      <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_500Medium", fontSize: 12 }}>{ci.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ═══ AI MEAL SUGGESTIONS VIEW ═══ */}
        {viewMode === "suggestions" && (
          <View style={{ gap: 16 }}>
            {loadingSuggestions ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 12 }}>Generating Meal Ideas...</Text>
                <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4 }}>AI is analysing your {items.length} pantry items</Text>
              </View>
            ) : suggestedMeals.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <MaterialIcons name="restaurant" size={48} color="#92400E" />
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 12 }}>No Suggestions Yet</Text>
                <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", marginTop: 4 }}>Add items to your pantry, then tap "AI Meals" to get personalised recipes.</Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <MaterialIcons name="auto-awesome" size={18} color="#F59E0B" />
                  <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Meals You Can Make</Text>
                </View>
                {suggestedMeals.map((meal, idx) => (
                  <ReAnimated.View key={idx} entering={FadeInDown.delay(idx * 100).duration(300)}>
                    <TouchableOpacity
                      onPress={() => setExpandedMealIdx(expandedMealIdx === idx ? null : idx)}
                      style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>{meal.name}</Text>
                          <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>{meal.description}</Text>
                        </View>
                        <MaterialIcons name={expandedMealIdx === idx ? "expand-less" : "expand-more"} size={22} color="#92400E" />
                      </View>

                      {/* Macro badges */}
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <MaterialIcons name="local-fire-department" size={12} color="#FBBF24" />
                          <Text style={{ color: "#FBBF24", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{meal.estimatedCalories} kcal</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#3B82F6", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>P: {meal.estimatedProtein}g</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(253,230,138,0.08)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#FDE68A", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>C: {meal.estimatedCarbs}g</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>F: {meal.estimatedFat}g</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <MaterialIcons name="schedule" size={12} color="#92400E" />
                          <Text style={{ color: "#92400E", fontFamily: "DMSans_500Medium", fontSize: 11 }}>{meal.prepTime}</Text>
                        </View>
                      </View>

                      {/* Missing ingredients warning */}
                      {meal.missingIngredients.length > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, backgroundColor: "rgba(239,68,68,0.06)", borderRadius: 8, padding: 8 }}>
                          <MaterialIcons name="shopping-cart" size={14} color="#F87171" />
                          <Text style={{ color: "#F87171", fontFamily: "DMSans_500Medium", fontSize: 11 }}>
                            Need: {meal.missingIngredients.join(", ")}
                          </Text>
                        </View>
                      )}

                      {/* Expanded details */}
                      {expandedMealIdx === idx && (
                        <View style={{ marginTop: 12, gap: 10 }}>
                          {/* Ingredients */}
                          <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Ingredients</Text>
                          {meal.ingredients.map((ing, i) => (
                            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 4 }}>
                              <MaterialIcons name={ing.fromPantry ? "check-circle" : "radio-button-unchecked"} size={14} color={ing.fromPantry ? "#22C55E" : "#F87171"} />
                              <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_400Regular", fontSize: 13 }}>
                                {ing.quantity ? `${ing.quantity} ` : ""}{ing.name}
                              </Text>
                              {!ing.fromPantry && <Text style={{ color: "#F87171", fontFamily: "DMSans_500Medium", fontSize: 10 }}>(need to buy)</Text>}
                            </View>
                          ))}

                          {/* Instructions */}
                          <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 13, marginTop: 4 }}>Instructions</Text>
                          {meal.instructions.map((step, i) => (
                            <View key={i} style={{ flexDirection: "row", gap: 8, marginLeft: 4 }}>
                              <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 12, width: 18 }}>{i + 1}.</Text>
                              <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1 }}>{step}</Text>
                            </View>
                          ))}

                          {/* Log meal button */}
                          <TouchableOpacity
                            onPress={() => handleLogMeal(meal)}
                            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 10, marginTop: 4 }}
                          >
                            <MaterialIcons name="add-circle" size={18} color="#0A0500" />
                            <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 }}>Log This Meal</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  </ReAnimated.View>
                ))}
                {/* Refresh button */}
                <TouchableOpacity
                  onPress={handleGetSuggestions}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}
                >
                  <MaterialIcons name="refresh" size={18} color="#F59E0B" />
                  <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Get New Suggestions</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ═══ SHOPPING SUGGESTIONS VIEW ═══ */}
        {viewMode === "shopping" && (
          <View style={{ gap: 16 }}>
            {loadingShopping ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <ActivityIndicator color="#F59E0B" size="large" />
                <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 12 }}>Analysing Nutritional Gaps...</Text>
                <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 4 }}>Finding budget-friendly items to complete your kitchen</Text>
              </View>
            ) : shoppingSuggestions.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <MaterialIcons name="shopping-cart" size={48} color="#92400E" />
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 12 }}>No Shopping Suggestions</Text>
                <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", marginTop: 4 }}>Add items to your pantry first, then AI will suggest what else you need.</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <MaterialIcons name="lightbulb" size={16} color="#3B82F6" />
                    <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Smart Shopping Tip</Text>
                  </View>
                  <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, lineHeight: 18 }}>
                    These suggestions are prioritised to give you the most meals for the least cost, based on your {items.length} pantry items and {userGoal.replace(/_/g, " ")} goal.
                  </Text>
                </View>

                {/* Priority groups */}
                {(["essential", "recommended", "nice-to-have"] as const).map(priority => {
                  const group = shoppingSuggestions.filter(s => s.priority === priority);
                  if (group.length === 0) return null;
                  return (
                    <View key={priority}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <MaterialIcons
                          name={priority === "essential" ? "priority-high" : priority === "recommended" ? "thumb-up" : "star-outline"}
                          size={16}
                          color={priority === "essential" ? "#EF4444" : priority === "recommended" ? "#F59E0B" : "#92400E"}
                        />
                        <Text style={{
                          color: priority === "essential" ? "#F87171" : priority === "recommended" ? "#FBBF24" : "#92400E",
                          fontFamily: "Outfit_700Bold", fontSize: 13, textTransform: "capitalize",
                        }}>{priority}</Text>
                      </View>
                      {group.map((item, idx) => (
                        <ReAnimated.View key={idx} entering={FadeInDown.delay(idx * 80).duration(250)}>
                          <View style={{ backgroundColor: "#150A00", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)", marginBottom: 8 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>{item.name}</Text>
                                <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 }}>{item.reason}</Text>
                              </View>
                              <View style={{ backgroundColor: "rgba(34,197,94,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ color: "#22C55E", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{item.estimatedCost}</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                              {item.mealsItEnables.map((meal, mi) => (
                                <View key={mi} style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                                  <Text style={{ color: "#FBBF24", fontFamily: "DMSans_500Medium", fontSize: 10 }}>{meal}</Text>
                                </View>
                              ))}
                            </View>
                            <TouchableOpacity
                              onPress={() => addItem({ name: item.name, category: item.category as PantryCategory, source: "manual" })}
                              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 10, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}
                            >
                              <MaterialIcons name="add" size={16} color="#F59E0B" />
                              <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Add to Pantry (bought)</Text>
                            </TouchableOpacity>
                          </View>
                        </ReAnimated.View>
                      ))}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Scan Results Modal */}
      <Modal visible={showScanResults} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#150A00", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>Scanned Items</Text>
              <TouchableOpacity onPress={() => setShowScanResults(false)}>
                <MaterialIcons name="close" size={24} color="#92400E" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, marginBottom: 12 }}>
              AI identified {scannedItems.length} items. Review and add them to your pantry.
            </Text>
            <FlatList
              data={scannedItems}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item, index }) => (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.06)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name={CATEGORY_ICONS[item.category] as any} size={18} color="#F59E0B" />
                    <View>
                      <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>{item.name}</Text>
                      <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 11 }}>{item.category}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setScannedItems(prev => prev.filter((_, i) => i !== index))}>
                    <MaterialIcons name="close" size={18} color="#92400E" />
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity
              onPress={handleAddScannedItems}
              disabled={scannedItems.length === 0}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, marginTop: 16 }}
            >
              <MaterialIcons name="add-circle" size={20} color="#0A0500" />
              <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Add {scannedItems.length} Items to Pantry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
