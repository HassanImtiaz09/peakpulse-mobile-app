import React, { useState, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image,
  TextInput, Platform, ImageBackground, FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAuth } from "@/lib/guest-auth";
import { useCalories } from "@/lib/calorie-context";
import { trpc } from "@/lib/trpc";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MEAL_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/OTOphPKaSpDPZRjp.jpg";
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
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
  // Breakfast swaps
  "Overnight Oats with Banana": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80",
  "Scrambled Eggs on Wholegrain Toast": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80",
  "Avocado Toast with Poached Egg": "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=600&q=80",
  "Smoothie Bowl (Acai & Berries)": "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=600&q=80",
  "Cottage Cheese & Fruit Plate": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&q=80",
  "Protein Pancakes (3 pcs)": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
  // Lunch swaps
  "Turkey & Avocado Wrap": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80",
  "Tuna Salad Sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80",
  "Lentil & Vegetable Soup + Bread": "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
  "Steak & Sweet Potato Bowl": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
  "Falafel Wrap with Hummus": "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=600&q=80",
  "Greek Salad with Grilled Chicken": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  // Dinner swaps
  "Baked Cod with Roasted Veg": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
  "Chicken Stir-Fry with Brown Rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
  "Beef & Broccoli with Noodles": "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80",
  "Prawn & Vegetable Curry + Rice": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "Tofu & Edamame Buddha Bowl": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
  "Turkey Meatballs & Courgette Pasta": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80",
  // Snack swaps
  "Rice Cakes with Peanut Butter": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80",
  "Boiled Eggs (2) with Cucumber": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80",
  "Dates & Almonds (30g each)": "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=600&q=80",
  "Protein Bar (Quest / Fulfil)": "https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=600&q=80",
  "Banana & Almond Butter": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80",
  "Greek Yogurt with Honey": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
};

// Full meal prep instructions for each swap alternative
const SWAP_RECIPES: Record<string, { time: string; steps: string[] }> = {
  "Overnight Oats with Banana": { time: "5 min + overnight", steps: ["Add 80g rolled oats to a jar", "Pour in 200ml oat milk or dairy milk", "Add 1 tbsp chia seeds and 1 tsp honey", "Stir well, seal and refrigerate overnight", "In the morning, top with sliced banana and a pinch of cinnamon"] },
  "Scrambled Eggs on Wholegrain Toast": { time: "8 min", steps: ["Crack 3 eggs into a bowl, whisk with a pinch of salt and pepper", "Melt 1 tsp butter in a non-stick pan over low heat", "Add eggs and stir gently with a spatula every 30 seconds", "Remove from heat while still slightly wet — residual heat finishes them", "Serve on 2 slices of toasted wholegrain bread with a sprinkle of chives"] },
  "Avocado Toast with Poached Egg": { time: "10 min", steps: ["Bring a pan of water to a gentle simmer, add 1 tsp white vinegar", "Crack an egg into a small cup, swirl the water and slide the egg in", "Poach for 3 minutes for a runny yolk", "Mash half an avocado with lemon juice, salt and chilli flakes", "Spread on toasted sourdough and top with the poached egg"] },
  "Smoothie Bowl (Acai & Berries)": { time: "5 min", steps: ["Blend 100g frozen acai pulp with 50ml almond milk until thick", "Pour into a bowl — it should be thicker than a drink", "Top with 30g granola, fresh blueberries and strawberries", "Add a drizzle of honey and a sprinkle of hemp seeds", "Eat immediately before it melts"] },
  "Cottage Cheese & Fruit Plate": { time: "3 min", steps: ["Spoon 200g low-fat cottage cheese into a bowl", "Slice 1 kiwi, a handful of strawberries and some melon", "Arrange fruit around the cottage cheese", "Drizzle with 1 tsp honey", "Optional: add a sprinkle of pumpkin seeds for crunch"] },
  "Protein Pancakes (3 pcs)": { time: "15 min", steps: ["Mix 1 scoop vanilla protein powder, 1 egg, 50g oat flour and 100ml milk", "Stir until smooth — batter should be thick but pourable", "Heat a non-stick pan over medium heat with a little cooking spray", "Pour small circles of batter, cook 2 min each side until golden", "Stack and serve with fresh berries and a drizzle of maple syrup"] },
  "Turkey & Avocado Wrap": { time: "5 min", steps: ["Lay a large wholegrain wrap flat on a board", "Spread 2 tbsp hummus across the centre", "Layer 100g sliced turkey breast, lettuce and tomato", "Add 1/4 sliced avocado and a squeeze of lemon", "Roll tightly, cut in half diagonally and serve"] },
  "Tuna Salad Sandwich": { time: "5 min", steps: ["Drain a 120g tin of tuna and flake into a bowl", "Mix with 1 tbsp light mayo, 1 tsp Dijon mustard and diced celery", "Season with black pepper and a squeeze of lemon", "Pile onto 2 slices of wholegrain bread with lettuce and cucumber", "Press together and cut in half"] },
  "Lentil & Vegetable Soup + Bread": { time: "30 min", steps: ["Sauté 1 diced onion, 2 carrots and 2 celery stalks in olive oil for 5 min", "Add 200g red lentils, 1 litre vegetable stock and 1 tsp cumin", "Bring to a boil, then simmer 20 min until lentils are soft", "Blend half the soup for a creamy texture, stir back in", "Season with salt, pepper and lemon juice. Serve with crusty bread"] },
  "Steak & Sweet Potato Bowl": { time: "25 min", steps: ["Dice 1 medium sweet potato, toss in olive oil, salt and paprika", "Roast at 200°C for 20 min until caramelised", "Season a 150g sirloin steak with salt, pepper and garlic powder", "Sear in a hot cast iron pan 3 min each side for medium-rare", "Rest 5 min, slice thinly and serve over sweet potato with rocket"] },
  "Falafel Wrap with Hummus": { time: "10 min (using shop-bought falafel)", steps: ["Warm 4-5 falafel balls in the oven at 180°C for 8 min or air fry 5 min", "Spread 3 tbsp hummus on a large flatbread", "Add shredded lettuce, diced tomato and cucumber", "Place warm falafel on top and drizzle with tahini sauce", "Roll up and serve immediately"] },
  "Greek Salad with Grilled Chicken": { time: "20 min", steps: ["Season a 150g chicken breast with oregano, garlic, salt and olive oil", "Grill or pan-fry 6-7 min each side until cooked through", "Chop tomatoes, cucumber, red onion and kalamata olives", "Toss with olive oil, red wine vinegar and dried oregano", "Slice chicken and serve on top of the salad with crumbled feta"] },
  "Baked Cod with Roasted Veg": { time: "25 min", steps: ["Preheat oven to 200°C. Chop courgette, cherry tomatoes and red pepper", "Toss veg in olive oil, salt, pepper and Italian herbs. Roast 15 min", "Place cod fillet on top of veg, drizzle with lemon juice and olive oil", "Bake a further 12-15 min until fish flakes easily with a fork", "Serve with a wedge of lemon and fresh parsley"] },
  "Chicken Stir-Fry with Brown Rice": { time: "20 min", steps: ["Cook 80g brown rice per packet instructions (15-18 min)", "Slice 150g chicken breast thinly, season with soy sauce and ginger", "Stir-fry chicken in a hot wok with sesame oil for 5 min", "Add broccoli, snap peas and bell pepper, stir-fry 3 more min", "Add 2 tbsp oyster sauce and a splash of water. Serve over rice"] },
  "Beef & Broccoli with Noodles": { time: "20 min", steps: ["Cook 80g egg noodles per packet instructions, drain and set aside", "Slice 150g beef sirloin thinly against the grain", "Sear beef in a hot wok with oil for 2 min, remove and set aside", "Stir-fry broccoli florets for 3 min, add garlic and ginger", "Return beef, add soy sauce, oyster sauce and sesame oil. Serve over noodles"] },
  "Prawn & Vegetable Curry + Rice": { time: "20 min", steps: ["Cook 80g basmati rice per packet instructions", "Sauté 1 diced onion in oil for 3 min, add 2 tbsp curry paste", "Add 200ml coconut milk and bring to a simmer", "Add 200g raw prawns and mixed vegetables, cook 5-6 min until pink", "Season with salt and lime juice. Serve over rice with fresh coriander"] },
  "Tofu & Edamame Buddha Bowl": { time: "20 min", steps: ["Press 200g firm tofu dry, cube and toss in soy sauce and sesame oil", "Pan-fry tofu cubes until golden on all sides (8-10 min)", "Cook 80g brown rice or quinoa per packet instructions", "Defrost 100g edamame in boiling water for 3 min", "Assemble bowl with rice, tofu, edamame, shredded carrot and miso dressing"] },
  "Turkey Meatballs & Courgette Pasta": { time: "25 min", steps: ["Mix 200g turkey mince with garlic, parsley, salt and 1 egg yolk", "Roll into small balls and pan-fry in olive oil until browned all over (8 min)", "Spiralise 2 courgettes or use a peeler for ribbons", "Simmer meatballs in 200ml passata for 10 min", "Toss courgette noodles with meatballs and sauce. Top with parmesan"] },
  "Rice Cakes with Peanut Butter": { time: "2 min", steps: ["Lay 4 plain rice cakes on a plate", "Spread 1 tbsp natural peanut butter on each", "Optional: top with banana slices or a drizzle of honey", "Pair with a glass of water or black coffee", "Great as a pre-workout snack 30 min before training"] },
  "Boiled Eggs (2) with Cucumber": { time: "10 min", steps: ["Place 2 eggs in cold water, bring to a boil", "Boil 7 min for hard-boiled, 5 min for jammy yolk", "Transfer to ice water for 2 min to stop cooking", "Peel and slice in half, season with salt and pepper", "Serve alongside sliced cucumber and cherry tomatoes"] },
  "Dates & Almonds (30g each)": { time: "1 min", steps: ["Portion 30g Medjool dates (roughly 3 dates) into a small bowl", "Add 30g raw almonds alongside", "Optional: add a pinch of sea salt to the almonds for contrast", "This snack requires no preparation — ideal for on-the-go", "Pairs well with a glass of water or herbal tea"] },
  "Protein Bar (Quest / Fulfil)": { time: "0 min", steps: ["Choose a bar with 20g+ protein and under 10g sugar", "Quest, Fulfil, Grenade Carb Killa or similar brands work well", "Eat at room temperature for best texture", "Ideal post-workout or as a mid-afternoon snack", "Check the label — some bars are high in calories despite the protein"] },
  "Banana & Almond Butter": { time: "2 min", steps: ["Peel 1 medium banana and slice into rounds", "Portion 2 tbsp almond butter into a small dipping bowl", "Dip banana slices into almond butter", "Optional: sprinkle with a pinch of cinnamon or cacao nibs", "Best eaten within 10 min of slicing to prevent browning"] },
  "Greek Yogurt with Honey": { time: "2 min", steps: ["Spoon 200g full-fat or 0% Greek yogurt into a bowl", "Drizzle 1 tsp raw honey over the top", "Optional: add a handful of walnuts or granola for crunch", "Add a pinch of cinnamon for extra flavour", "Refrigerate if not eating immediately — keeps 2 days covered"] },
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


// Meal Swap alternatives — calorie-equivalent options per meal type
const SWAP_ALTERNATIVES: Record<string, Array<{ title: string; calories: number; protein: number; carbs: number; fat: number; icon: string; tags: string[] }>> = {
  breakfast: [
    { title: "Overnight Oats with Banana", calories: 320, protein: 12, carbs: 52, fat: 7, icon: "🥣", tags: ["vegan", "quick"] },
    { title: "Scrambled Eggs on Wholegrain Toast", calories: 315, protein: 20, carbs: 28, fat: 12, icon: "🍳", tags: ["high-protein", "quick"] },
    { title: "Avocado Toast with Poached Egg", calories: 330, protein: 14, carbs: 30, fat: 16, icon: "🥑", tags: ["halal", "trendy"] },
    { title: "Smoothie Bowl (Acai & Berries)", calories: 310, protein: 8, carbs: 58, fat: 6, icon: "🫐", tags: ["vegan", "antioxidants"] },
    { title: "Cottage Cheese & Fruit Plate", calories: 305, protein: 22, carbs: 34, fat: 5, icon: "🍓", tags: ["high-protein", "low-fat"] },
    { title: "Protein Pancakes (3 pcs)", calories: 325, protein: 24, carbs: 36, fat: 8, icon: "🥞", tags: ["high-protein", "meal-prep"] },
  ],
  lunch: [
    { title: "Turkey & Avocado Wrap", calories: 520, protein: 38, carbs: 44, fat: 14, icon: "🌯", tags: ["halal", "quick"] },
    { title: "Tuna Salad Sandwich", calories: 510, protein: 40, carbs: 46, fat: 11, icon: "🥪", tags: ["high-protein", "budget"] },
    { title: "Lentil & Vegetable Soup + Bread", calories: 505, protein: 22, carbs: 72, fat: 8, icon: "🍲", tags: ["vegan", "high-fibre"] },
    { title: "Steak & Sweet Potato Bowl", calories: 530, protein: 44, carbs: 40, fat: 13, icon: "🥩", tags: ["halal", "high-protein"] },
    { title: "Falafel Wrap with Hummus", calories: 515, protein: 18, carbs: 60, fat: 16, icon: "🧆", tags: ["vegan", "halal"] },
    { title: "Greek Salad with Grilled Chicken", calories: 495, protein: 42, carbs: 22, fat: 18, icon: "🥗", tags: ["keto-friendly", "low-carb"] },
  ],
  dinner: [
    { title: "Baked Cod with Roasted Veg", calories: 475, protein: 40, carbs: 30, fat: 14, icon: "🐟", tags: ["low-carb", "halal"] },
    { title: "Chicken Stir-Fry with Brown Rice", calories: 490, protein: 36, carbs: 50, fat: 12, icon: "🍚", tags: ["halal", "meal-prep"] },
    { title: "Beef & Broccoli with Noodles", calories: 485, protein: 38, carbs: 44, fat: 14, icon: "🥦", tags: ["halal", "high-protein"] },
    { title: "Prawn & Vegetable Curry + Rice", calories: 480, protein: 32, carbs: 52, fat: 10, icon: "🍛", tags: ["halal", "spicy"] },
    { title: "Tofu & Edamame Buddha Bowl", calories: 470, protein: 28, carbs: 48, fat: 16, icon: "🫘", tags: ["vegan", "balanced"] },
    { title: "Turkey Meatballs & Courgette Pasta", calories: 465, protein: 42, carbs: 34, fat: 13, icon: "🍝", tags: ["high-protein", "low-carb"] },
  ],
  snack: [
    { title: "Rice Cakes with Peanut Butter", calories: 210, protein: 7, carbs: 26, fat: 9, icon: "🍘", tags: ["vegan", "quick"] },
    { title: "Boiled Eggs (2) with Cucumber", calories: 200, protein: 14, carbs: 4, fat: 12, icon: "🥚", tags: ["keto", "high-protein"] },
    { title: "Dates & Almonds (30g each)", calories: 215, protein: 5, carbs: 30, fat: 9, icon: "🌴", tags: ["halal", "natural"] },
    { title: "Protein Bar (Quest / Fulfil)", calories: 205, protein: 20, carbs: 22, fat: 7, icon: "🍫", tags: ["high-protein", "convenient"] },
    { title: "Banana & Almond Butter", calories: 220, protein: 5, carbs: 32, fat: 8, icon: "🍌", tags: ["vegan", "quick"] },
    { title: "Greek Yogurt with Honey", calories: 195, protein: 16, carbs: 22, fat: 4, icon: "🍯", tags: ["high-protein", "probiotic"] },
  ],
};

export default function MealsScreen() {
  const router = useRouter();
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

  // Water intake tracker
  const [waterIntake, setWaterIntake] = useState(0); // in ml
  const [waterGoal, setWaterGoal] = useState(2500); // daily goal in ml
  const WATER_QUICK_ADD = [250, 500, 750]; // ml options

  // Load water intake from AsyncStorage (keyed by date)
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
      : (() => {
          const goals = [2000, 2500, 3000, 3500, 4000];
          Alert.alert("Daily Water Goal", "Select your daily water goal:", [
            ...goals.map(g => ({ text: `${g} ml (${(g / 1000).toFixed(1)}L)`, onPress: () => { setWaterGoal(g); AsyncStorage.setItem("@water_goal", JSON.stringify(g)); } })),
            { text: "Cancel", style: "cancel" as const },
          ]);
        })();
  }, [waterGoal]);

  // Persist shopping list checked state
  React.useEffect(() => {
    AsyncStorage.getItem("@shopping_list_checked").then(raw => {
      if (raw) {
        try { setCheckedIngredients(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  // Save checked state whenever it changes
  const updateCheckedIngredients = React.useCallback((updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    setCheckedIngredients(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      AsyncStorage.setItem("@shopping_list_checked", JSON.stringify(next));
      return next;
    });
  }, []);
  // Load user profile and AI-generated meal plan for personalised suggestions
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
    // Load AI-generated meal plan from onboarding or plans tab
    AsyncStorage.getItem("@guest_meal_plan").then(raw => {
      if (raw) {
        try { setAiMealPlan(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  // Regenerate workout plan mutation (accessible from meals tab)
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
      // Persist to AsyncStorage for both keys
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

  // Refresh calorie data when screen comes into focus
  useFocusEffect(useCallback(() => {
    refreshFromStorage();
  }, [refreshFromStorage]));

  const caloriePercent = Math.min(100, (totalCalories / calorieGoal) * 100);
  const calorieColor = caloriePercent > 90 ? "#92400E" : caloriePercent > 70 ? "#FBBF24" : "#FDE68A";

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
      <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
        <ImageBackground source={{ uri: MEAL_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.78)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🍽️</Text>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Meal Log</Text>
            <Text style={{ color: "#92400E", fontSize: 14, textAlign: "center", lineHeight: 20 }}>Sign in or continue as guest to track your nutrition and use the AI calorie estimator.</Text>
          </View>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0500" }}>
      {/* Hero Header */}
      <ImageBackground source={{ uri: MEAL_BG }} style={{ height: 160 }} resizeMode="cover">
        <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.68)", justifyContent: "flex-end", padding: 20, paddingTop: 52 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 52, right: 20, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
            onPress={() => router.push("/user-guide" as any)}
          >
            <Text style={{ color: "#FBBF24", fontSize: 13 }}>?</Text>
            <Text style={{ color: "#FBBF24", fontFamily: "DMSans_500Medium", fontSize: 11 }}>Guide</Text>
          </TouchableOpacity>
          <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, letterSpacing: 1 }}>NUTRITION TRACKING</Text>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 }}>Meal Log</Text>
        </View>
      </ImageBackground>

      {/* Daily Summary Card */}
      <View style={{ marginHorizontal: 16, marginTop: -20, backgroundColor: "#150A00", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, zIndex: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", textTransform: "uppercase" }}>Today's Nutrition</Text>
          <Text style={{ color: calorieColor, fontFamily: "Outfit_700Bold", fontSize: 12 }}>{Math.round(caloriesRemaining)} kcal left</Text>
        </View>

        {/* Calorie Progress Bar */}
        <View style={{ height: 8, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 4, marginBottom: 10, overflow: "hidden" }}>
          <View style={{ height: 8, width: `${caloriePercent}%` as any, backgroundColor: calorieColor, borderRadius: 4 }} />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <MacroStat label="Calories" value={Math.round(totalCalories)} unit="kcal" color="#FBBF24" goal={calorieGoal} />
          <MacroStat label="Protein" value={Math.round(totalProtein)} unit="g" color="#3B82F6" />
          <MacroStat label="Carbs" value={Math.round(totalCarbs)} unit="g" color="#FDE68A" />
          <MacroStat label="Fat" value={Math.round(totalFat)} unit="g" color="#FBBF24" />
        </View>
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, marginTop: 16, marginBottom: 12, gap: 8 }}>
        {(["log", "analyze"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center", backgroundColor: activeTab === tab ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: activeTab === tab ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={{ color: activeTab === tab ? "#FFF7ED" : "#92400E", fontFamily: "Outfit_700Bold", fontSize: 13 }}>
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
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: mealType === t ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: mealType === t ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                  onPress={() => setMealType(t)}
                >
                  <Text style={{ fontSize: 16 }}>{MEAL_ICONS[t]}</Text>
                  <Text style={{ color: mealType === t ? "#FFF7ED" : "#92400E", fontSize: 9, fontFamily: "Outfit_700Bold", marginTop: 2, textTransform: "capitalize" }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Log */}
            <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
              <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 10, textTransform: "uppercase" }}>Quick Log</Text>
              <TextInput
                value={mealName}
                onChangeText={setMealName}
                placeholder="What did you eat? (e.g. Chicken rice bowl)"
                placeholderTextColor="#451A03"
                style={{ backgroundColor: "#150A00", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#FFF7ED", fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                returnKeyType="done"
                onSubmitEditing={quickLogMeal}
              />
              <TouchableOpacity
                style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: !mealName.trim() ? 0.5 : 1 }}
                onPress={quickLogMeal}
                disabled={!mealName.trim()}
              >
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>+ Log Meal</Text>
              </TouchableOpacity>
            </View>

            {/* Regenerate Both Plans Section */}
            {aiMealPlan && (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)", opacity: regenerating ? 0.7 : 1 }}
                  onPress={() => {
                    Alert.alert(
                      "Regenerate Meal Plan?",
                      "This will replace your current meal plan with a new AI-generated one based on your preferences.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Regenerate",
                          style: "destructive",
                          onPress: () => {
                            setRegenerating(true);
                            regenerateMealPlan.mutate({
                              goal: userGoal,
                              dietaryPreference: userDietaryPref,
                              ramadanMode: false,
                              weightKg: localProfile?.weightKg ?? undefined,
                              heightCm: localProfile?.heightCm ?? undefined,
                              age: localProfile?.age ?? undefined,
                              gender: localProfile?.gender ?? undefined,
                              activityLevel: localProfile?.activityLevel ?? undefined,
                            });
                          },
                        },
                      ]
                    );
                  }}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <ActivityIndicator color="#F59E0B" size="small" />
                  ) : (
                    <Text style={{ fontSize: 13 }}>🍽️</Text>
                  )}
                  <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>{regenerating ? "Regenerating..." : "New Meal Plan"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)", opacity: regeneratingWorkout ? 0.7 : 1 }}
                  onPress={() => {
                    Alert.alert(
                      "Regenerate Workout Plan?",
                      "This will replace your current workout plan with a new AI-generated one based on your goals.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Regenerate",
                          style: "destructive",
                          onPress: () => {
                            setRegeneratingWorkout(true);
                            regenerateWorkoutPlan.mutate({
                              goal: userGoal,
                              workoutStyle: localProfile?.workoutStyle ?? "gym",
                              daysPerWeek: localProfile?.daysPerWeek ?? 4,
                              fitnessLevel: localProfile?.activityLevel ?? undefined,
                            });
                          },
                        },
                      ]
                    );
                  }}
                  disabled={regeneratingWorkout}
                >
                  {regeneratingWorkout ? (
                    <ActivityIndicator color="#F59E0B" size="small" />
                  ) : (
                    <Text style={{ fontSize: 13 }}>🏋️</Text>
                  )}
                  <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>{regeneratingWorkout ? "Regenerating..." : "New Workout Plan"}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Suggested Meals Section — uses AI-generated plan when available */}
            {/* ── Water Intake Tracker ── */}
            <View style={{ backgroundColor: "#150A00", borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>💧</Text>
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16 }}>Water Intake</Text>
                </View>
                <TouchableOpacity onPress={updateWaterGoal}>
                  <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 11 }}>Goal: {waterGoal}ml</Text>
                </TouchableOpacity>
              </View>

              {/* Progress bar */}
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: "#FBBF24", fontFamily: "Outfit_800ExtraBold", fontSize: 20 }}>{waterIntake} ml</Text>
                  <Text style={{ color: "#92400E", fontSize: 12, alignSelf: "flex-end" }}>{Math.min(100, Math.round((waterIntake / waterGoal) * 100))}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 4 }}>
                  <View style={{ height: 8, backgroundColor: waterIntake >= waterGoal ? "#22C55E" : "#3B82F6", borderRadius: 4, width: `${Math.min(100, (waterIntake / waterGoal) * 100)}%` as any }} />
                </View>
                {waterIntake >= waterGoal && (
                  <Text style={{ color: "#22C55E", fontSize: 11, marginTop: 4, fontFamily: "Outfit_700Bold" }}>✓ Daily goal reached! Stay hydrated.</Text>
                )}
              </View>

              {/* Quick-add buttons */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                {WATER_QUICK_ADD.map(ml => (
                  <TouchableOpacity
                    key={ml}
                    style={{ flex: 1, backgroundColor: "rgba(59,130,246,0.12)", borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(59,130,246,0.20)" }}
                    onPress={() => addWater(ml)}
                  >
                    <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 13 }}>+{ml}ml</Text>
                    <Text style={{ color: "#64748B", fontSize: 9, marginTop: 2 }}>{ml === 250 ? "Glass" : ml === 500 ? "Bottle" : "Large"}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom add and undo */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(59,130,246,0.10)" }}
                  onPress={() => addWater(100)}
                >
                  <Text style={{ color: "#64748B", fontSize: 11 }}>+100ml (Sip)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "rgba(239,68,68,0.06)", borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.10)" }}
                  onPress={() => addWater(-250)}
                >
                  <Text style={{ color: "#EF4444", fontSize: 11 }}>Undo (-250ml)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "rgba(239,68,68,0.06)", borderRadius: 10, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.10)" }}
                  onPress={() => {
                    Alert.alert("Reset Water?", "Clear today's water intake?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Reset", style: "destructive", onPress: () => {
                        setWaterIntake(0);
                        const today = new Date().toISOString().split("T")[0];
                        AsyncStorage.setItem(`@water_intake_${today}`, JSON.stringify(0));
                      }},
                    ]);
                  }}
                >
                  <Text style={{ color: "#EF4444", fontSize: 11 }}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>
                {aiMealPlan ? "Your AI Meal Plan" : "Today's Suggested Meals"}
              </Text>
            </View>

            {/* 7-Day Meal Plan Day Selector */}
            {aiMealPlan?.days && aiMealPlan.days.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
                {aiMealPlan.days.map((day: any, i: number) => {
                  const dayLabel = day.day ?? `Day ${i + 1}`;
                  const shortLabel = dayLabel.replace(/^Day\s*/i, "D").replace(/Monday/i, "Mon").replace(/Tuesday/i, "Tue").replace(/Wednesday/i, "Wed").replace(/Thursday/i, "Thu").replace(/Friday/i, "Fri").replace(/Saturday/i, "Sat").replace(/Sunday/i, "Sun");
                  return (
                    <TouchableOpacity
                      key={i}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: selectedDayIndex === i ? "#F59E0B" : "#150A00",
                        borderWidth: 1,
                        borderColor: selectedDayIndex === i ? "#F59E0B" : "rgba(245,158,11,0.10)",
                        minWidth: 48,
                        alignItems: "center",
                      }}
                      onPress={() => { setSelectedDayIndex(i); setSwappedMeals({}); }}
                    >
                      <Text style={{ color: selectedDayIndex === i ? "#FFF7ED" : "#92400E", fontFamily: "Outfit_700Bold", fontSize: 12 }}>{shortLabel}</Text>
                      {day.meals && (
                        <Text style={{ color: selectedDayIndex === i ? "rgba(255,247,237,0.7)" : "#78350F", fontSize: 9, marginTop: 2 }}>
                          {day.meals.reduce((s: number, m: any) => s + (m.calories ?? 0), 0)} kcal
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {(() => {
              // If we have an AI-generated meal plan, extract meals from the selected day
              const aiDayMeals = aiMealPlan?.days?.[selectedDayIndex]?.meals ?? [];
              // Build a lookup: meal type -> AI meal data
              const aiMealByType: Record<string, any> = {};
              for (const m of aiDayMeals) {
                const t = (m.type ?? "").toLowerCase();
                const mapped = t.includes("breakfast") ? "breakfast" : t.includes("lunch") ? "lunch" : t.includes("dinner") ? "dinner" : "snack";
                if (!aiMealByType[mapped]) aiMealByType[mapped] = m;
              }
              return MEAL_TYPES.map((type) => {
                const swapped = swappedMeals[type];
                const aiMeal = aiMealByType[type];
                // Priority: swapped > AI plan > hardcoded default
                const recipe = swapped
                  ? { title: swapped.title, time: swapped.recipe.time, steps: swapped.recipe.steps }
                  : aiMeal
                    ? { title: aiMeal.name ?? "AI Meal", time: aiMeal.prepTime ?? "15 min", steps: aiMeal.ingredients ?? aiMeal.steps ?? [] }
                    : MEAL_RECIPES[type];
                const photo = swapped ? swapped.photo : MEAL_PHOTOS[type];
                const cals = swapped ? swapped.calories : (aiMeal?.calories ?? (type === "breakfast" ? 320 : type === "lunch" ? 520 : type === "dinner" ? 480 : 210));
                const prot = swapped ? swapped.protein : (aiMeal?.protein ?? (type === "breakfast" ? 18 : type === "lunch" ? 42 : type === "dinner" ? 38 : 12));
                const carbs = swapped ? swapped.carbs : (aiMeal?.carbs ?? (type === "breakfast" ? 38 : type === "lunch" ? 45 : type === "dinner" ? 28 : 18));
                const fat = swapped ? swapped.fat : (aiMeal?.fat ?? (type === "breakfast" ? 8 : type === "lunch" ? 12 : type === "dinner" ? 18 : 10));
                return (
                  <SuggestedMealCard
                    key={type}
                    type={type}
                    recipe={recipe}
                    photo={photo}
                    isSwapped={!!swapped}
                    calories={cals}
                    protein={prot}
                    carbs={carbs}
                    fat={fat}
                    onSwap={() => {
                      setSwapMealType(type);
                      setSwapMealData({ name: recipe.title, calories: cals, protein: prot, carbs, fat });
                    }}
                    onLog={() => {
                      addMeal({ name: recipe.title, mealType: type, calories: cals, protein: prot, carbs, fat });
                      Alert.alert("\u2705 Logged!", `${recipe.title} added to your meal log.`);
                    }}
                  />
                );
              });
            })()}

            {/* ── Weekly Shopping List ── */}
            {aiMealPlan?.days && aiMealPlan.days.length > 0 && (() => {
              // Aggregate all ingredients across all days
              const ingredientMap: Record<string, { count: number; sources: string[] }> = {};
              for (const day of aiMealPlan.days) {
                for (const meal of (day.meals ?? [])) {
                  const ingredients = meal.ingredients ?? meal.steps ?? [];
                  for (const ing of ingredients) {
                    const normalized = (typeof ing === "string" ? ing : String(ing)).trim();
                    if (!normalized) continue;
                    // Normalize to lowercase for grouping, keep original for display
                    const key = normalized.toLowerCase();
                    if (!ingredientMap[key]) {
                      ingredientMap[key] = { count: 0, sources: [] };
                    }
                    ingredientMap[key].count += 1;
                    const mealName = meal.name ?? "Meal";
                    if (!ingredientMap[key].sources.includes(mealName)) {
                      ingredientMap[key].sources.push(mealName);
                    }
                  }
                }
              }
              const sortedIngredients = Object.entries(ingredientMap)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([key, val]) => ({ key, display: key.charAt(0).toUpperCase() + key.slice(1), count: val.count, sources: val.sources }));
              const checkedCount = sortedIngredients.filter(i => checkedIngredients[i.key]).length;

              return (
                <View style={{ marginTop: 16, marginBottom: 8 }}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: showShoppingList ? 12 : 0 }}
                    onPress={() => setShowShoppingList(!showShoppingList)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 16 }}>🛒</Text>
                      <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Weekly Shopping List</Text>
                      <View style={{ backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>{checkedCount}/{sortedIngredients.length}</Text>
                      </View>
                    </View>
                    <Text style={{ color: "#78350F", fontSize: 16 }}>{showShoppingList ? "▲" : "▼"}</Text>
                  </TouchableOpacity>

                  {showShoppingList && (
                    <View style={{ backgroundColor: "#150A00", borderRadius: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", overflow: "hidden" }}>
                      {/* Progress bar */}
                      <View style={{ height: 3, backgroundColor: "rgba(245,158,11,0.10)" }}>
                        <View style={{ height: 3, backgroundColor: "#F59E0B", width: `${sortedIngredients.length > 0 ? (checkedCount / sortedIngredients.length) * 100 : 0}%` as any, borderRadius: 2 }} />
                      </View>
                      <View style={{ padding: 14 }}>
                        {/* Copy / Check All / Clear All */}
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: 10 }}>
                          <TouchableOpacity onPress={async () => {
                            const uncheckedItems = sortedIngredients.filter(i => !checkedIngredients[i.key]);
                            const allItems = uncheckedItems.length > 0 ? uncheckedItems : sortedIngredients;
                            const text = allItems.map(i => `□ ${i.display}${i.count > 1 ? ` (x${i.count})` : ""}`).join("\n");
                            const header = uncheckedItems.length > 0 && uncheckedItems.length < sortedIngredients.length
                              ? `PeakPulse Shopping List (${uncheckedItems.length} remaining):\n\n`
                              : `PeakPulse Shopping List (${allItems.length} items):\n\n`;
                            await Clipboard.setStringAsync(header + text);
                            Alert.alert("✅ Copied!", uncheckedItems.length > 0 && uncheckedItems.length < sortedIngredients.length
                              ? `${uncheckedItems.length} unchecked items copied to clipboard.`
                              : `${allItems.length} items copied to clipboard.`);
                          }}>
                            <Text style={{ color: "#3B82F6", fontFamily: "Outfit_700Bold", fontSize: 11 }}>📋 Copy</Text>
                          </TouchableOpacity>
                           <TouchableOpacity onPress={() => {
                            const allChecked: Record<string, boolean> = {};
                            sortedIngredients.forEach(i => { allChecked[i.key] = true; });
                            updateCheckedIngredients(allChecked);
                          }}>
                            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>✓ Check All</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => updateCheckedIngredients({})}>
                            <Text style={{ color: "#78350F", fontFamily: "Outfit_700Bold", fontSize: 11 }}>✕ Clear All</Text>
                          </TouchableOpacity>
                        </View>
                        {sortedIngredients.map((item, idx) => {
                          const isChecked = !!checkedIngredients[item.key];
                          return (
                            <TouchableOpacity
                              key={item.key}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                paddingVertical: 10,
                                borderBottomWidth: idx < sortedIngredients.length - 1 ? 1 : 0,
                                borderBottomColor: "rgba(245,158,11,0.06)",
                                opacity: isChecked ? 0.5 : 1,
                              }}
                              onPress={() => updateCheckedIngredients(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                            >
                              {/* Checkbox */}
                              <View style={{
                                width: 22, height: 22, borderRadius: 6,
                                borderWidth: 2,
                                borderColor: isChecked ? "#F59E0B" : "rgba(245,158,11,0.25)",
                                backgroundColor: isChecked ? "#F59E0B" : "transparent",
                                alignItems: "center", justifyContent: "center",
                              }}>
                                {isChecked && <Text style={{ color: "#FFF7ED", fontSize: 12, fontFamily: "Outfit_700Bold", lineHeight: 14 }}>✓</Text>}
                              </View>
                              {/* Ingredient name */}
                              <View style={{ flex: 1 }}>
                                <Text style={{
                                  color: isChecked ? "#78350F" : "#FFF7ED",
                                  fontFamily: "DMSans_500Medium",
                                  fontSize: 14,
                                  textDecorationLine: isChecked ? "line-through" : "none",
                                }}>{item.display}</Text>
                                {item.count > 1 && (
                                  <Text style={{ color: "#78350F", fontSize: 10, marginTop: 1 }}>Used in {item.count} meals</Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                        {sortedIngredients.length === 0 && (
                          <Text style={{ color: "#78350F", fontSize: 13, textAlign: "center", paddingVertical: 16 }}>No ingredients found in your meal plan.</Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Today's Logged Meals */}
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 10, marginTop: 8 }}>
              Today's Log {meals.length > 0 ? `(${meals.length})` : ""}
            </Text>
            {meals.length === 0 ? (
              <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 28, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🍽️</Text>
                <Text style={{ color: "#92400E", fontSize: 14, textAlign: "center", lineHeight: 20 }}>No meals logged yet today.</Text>
                <Text style={{ color: "#78350F", fontSize: 12, textAlign: "center", marginTop: 4 }}>Tap "+ Log" on a suggested meal or use the AI Estimator.</Text>
              </View>
            ) : (
              meals.map((meal) => (
                <View key={meal.id} style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {meal.photoUri ? (
                    <Image source={{ uri: meal.photoUri }} style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: "#150A00" }} resizeMode="cover" />
                  ) : (
                    <Image source={{ uri: MEAL_PHOTOS[meal.mealType] ?? MEAL_PHOTOS.snack }} style={{ width: 60, height: 60, borderRadius: 12, backgroundColor: "#150A00" }} resizeMode="cover" />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: "#FBBF24", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "capitalize" }}>{meal.mealType}</Text>
                      </View>
                    </View>
                    <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_600SemiBold", fontSize: 14 }}>{meal.name}</Text>
                    {(meal.protein > 0 || meal.carbs > 0 || meal.fat > 0) && (
                      <Text style={{ color: "#78350F", fontSize: 11, marginTop: 2 }}>
                        P:{Math.round(meal.protein)}g · C:{Math.round(meal.carbs)}g · F:{Math.round(meal.fat)}g
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    {meal.calories > 0 && (
                      <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 15 }}>{Math.round(meal.calories)}</Text>
                    )}
                    <TouchableOpacity
                      style={{ backgroundColor: "#EF444420", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}
                      onPress={() => removeMeal(meal.id)}
                    >
                      <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold" }}>✕</Text>
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
            <View style={{ backgroundColor: "#7C3AED10", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
              <Text style={{ color: "#FBBF24", fontSize: 13, lineHeight: 20 }}>
                📷 Take or choose a photo of your meal. Our AI will identify the food and estimate calories and macros automatically.
              </Text>
            </View>

            {/* Image Picker */}
            {selectedImage ? (
              <View style={{ marginBottom: 16 }}>
                <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 220, borderRadius: 16, backgroundColor: "#150A00" }} resizeMode="cover" />
                <TouchableOpacity
                  style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(100,116,139,0.56)", borderRadius: 20, width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
                  onPress={() => { setSelectedImage(null); setSelectedBase64(null); setAnalysisResult(null); }}
                >
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 16, paddingVertical: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 8 }}
                  onPress={() => pickImage(true)}
                >
                  <Text style={{ fontSize: 32 }}>📷</Text>
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Take Photo</Text>
                  <Text style={{ color: "#78350F", fontSize: 11 }}>Use camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 16, paddingVertical: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 8 }}
                  onPress={() => pickImage(false)}
                >
                  <Text style={{ fontSize: 32 }}>🖼️</Text>
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Choose Photo</Text>
                  <Text style={{ color: "#78350F", fontSize: 11 }}>From gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedImage && !analysisResult && (
              <TouchableOpacity
                style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 16, opacity: analyzing ? 0.7 : 1, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
                onPress={analyzeFood}
                disabled={analyzing}
              >
                {analyzing ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator color="#FFF7ED" size="small" />
                    <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Analyzing food...</Text>
                  </View>
                ) : (
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>✨ Estimate Calories with AI</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Analysis Result */}
            {analysisResult && (
              <View>
                <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#22C55E30" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 14 }}>✓ Analysis Complete</Text>
                    <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#FDE68A", fontSize: 11, fontFamily: "Outfit_700Bold" }}>
                        {analysisResult.confidence === "high" ? "High" : analysisResult.confidence === "medium" ? "Medium" : "Low"} confidence
                      </Text>
                    </View>
                  </View>

                  {analysisResult.notes && (
                    <Text style={{ color: "#92400E", fontSize: 13, marginBottom: 12, lineHeight: 18 }}>{String(analysisResult.notes)}</Text>
                  )}

                  <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
                    <MacroStat label="Calories" value={analysisResult.totalCalories ?? 0} unit="kcal" color="#FBBF24" />
                    <MacroStat label="Protein" value={analysisResult.totalProtein ?? 0} unit="g" color="#3B82F6" />
                    <MacroStat label="Carbs" value={analysisResult.totalCarbs ?? 0} unit="g" color="#FDE68A" />
                    <MacroStat label="Fat" value={analysisResult.totalFat ?? 0} unit="g" color="#FBBF24" />
                  </View>

                  {analysisResult.foods?.length > 0 && (
                    <View>
                      <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "Outfit_700Bold", marginBottom: 8, textTransform: "uppercase" }}>Detected Foods</Text>
                      {analysisResult.foods.map((food: any, i: number) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: i < analysisResult.foods.length - 1 ? 1 : 0, borderBottomColor: "rgba(245,158,11,0.10)" }}>
                          <Text style={{ color: "#F59E0B", fontSize: 13 }}>{food.name} <Text style={{ color: "#78350F" }}>({food.portion})</Text></Text>
                          <Text style={{ color: "#FBBF24", fontSize: 13, fontFamily: "DMSans_600SemiBold" }}>{food.calories} kcal</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Save Photo Toggle */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#150A00", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: savePhoto ? "rgba(245,158,11,0.22)" : "rgba(245,158,11,0.10)" }}
                  onPress={() => setSavePhoto(!savePhoto)}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: savePhoto ? "#F59E0B" : "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: savePhoto ? "#F59E0B" : "rgba(245,158,11,0.15)" }}>
                    {savePhoto && <Text style={{ color: "#FFF7ED", fontSize: 12, fontFamily: "Outfit_700Bold" }}>✓</Text>}
                  </View>
                  <Text style={{ color: "#F59E0B", fontSize: 13, fontFamily: "DMSans_600SemiBold" }}>Save photo to meal log</Text>
                </TouchableOpacity>

                {/* Meal Type */}
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                  {MEAL_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: mealType === t ? "#F59E0B" : "#150A00", borderWidth: 1, borderColor: mealType === t ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                      onPress={() => setMealType(t)}
                    >
                      <Text style={{ fontSize: 14 }}>{MEAL_ICONS[t]}</Text>
                      <Text style={{ color: mealType === t ? "#FFF7ED" : "#92400E", fontSize: 9, fontFamily: "Outfit_700Bold", marginTop: 2, textTransform: "capitalize" }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="Meal name (optional)"
                  placeholderTextColor="#451A03"
                  style={{ backgroundColor: "#150A00", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#FFF7ED", fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={{ backgroundColor: "#FDE68A", borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowColor: "#FDE68A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 }}
                  onPress={logAnalyzedMeal}
                >
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 15 }}>+ Log This Meal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
                icon: MEAL_ICONS[swapMealType] ?? "🍽️",
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
            Alert.alert("✅ Meal Swapped!", `${item.name} is now your ${swapMealType}. Tap "How to Prep" to see the full recipe.`);
          }}
        />
      )}
    </View>
  );
}

function MacroStat({ label, value, unit, color, goal }: { label: string; value: number; unit: string; color: string; goal?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color, fontFamily: "Outfit_800ExtraBold", fontSize: 18 }}>{Math.round(value)}</Text>
      <Text style={{ color: "#92400E", fontSize: 10, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: "#78350F", fontSize: 10 }}>{label}</Text>
      {goal && <Text style={{ color: "#451A03", fontSize: 9 }}>/ {goal}</Text>}
    </View>
  );
}

function SuggestedMealCard({ type, recipe, photo, onLog, onSwap, isSwapped, calories, protein, carbs, fat }: {
  type: string;
  recipe: { title: string; time: string; steps: string[] };
  isSwapped?: boolean;
  photo: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  onLog: () => void;
  onSwap: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const MEAL_ICONS_LOCAL: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };

  return (
    <View style={{ backgroundColor: "#150A00", borderRadius: 18, marginBottom: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
      {/* Food Photo */}
      <Image source={{ uri: photo }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
      {/* Meal Type Badge */}
      <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={{ fontSize: 14 }}>{MEAL_ICONS_LOCAL[type] ?? "🍽️"}</Text>
        <Text style={{ color: "#FFF7ED", fontSize: 11, fontFamily: "Outfit_700Bold", textTransform: "capitalize" }}>{type}</Text>
      </View>
      {isSwapped && (
        <View style={{ position: "absolute", bottom: 12, left: 12, backgroundColor: "rgba(234,88,12,0.90)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: "#FFF7ED", fontSize: 10, fontFamily: "Outfit_700Bold" }}>⇄ SWAPPED</Text>
        </View>
      )}
      {/* Log + Swap Buttons */}
      <View style={{ position: "absolute", top: 12, right: 12, gap: 6 }}>
        <TouchableOpacity
          style={{ backgroundColor: "#F59E0B", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" }}
          onPress={onLog}
        >
          <Text style={{ color: "#FFF7ED", fontSize: 12, fontFamily: "Outfit_700Bold" }}>+ Log</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: "rgba(234,88,12,0.85)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" }}
          onPress={onSwap}
        >
          <Text style={{ color: "#FFF7ED", fontSize: 12, fontFamily: "Outfit_700Bold" }}>⇄ Swap</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 14 }}>
        {/* Title & Time */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, flex: 1 }}>{recipe.title}</Text>
          <Text style={{ color: "#78350F", fontSize: 12 }}>⏱ {recipe.time}</Text>
        </View>

        {/* Macros Row */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: "#F9731610", borderRadius: 8, padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#FBBF24", fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{calories}</Text>
            <Text style={{ color: "#92400E", fontSize: 10 }}>kcal</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#3B82F610", borderRadius: 8, padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#3B82F6", fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{protein}g</Text>
            <Text style={{ color: "#92400E", fontSize: 10 }}>protein</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#22C55E10", borderRadius: 8, padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#FDE68A", fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{carbs}g</Text>
            <Text style={{ color: "#92400E", fontSize: 10 }}>carbs</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#FBBF2410", borderRadius: 8, padding: 8, alignItems: "center" }}>
            <Text style={{ color: "#FBBF24", fontFamily: "Outfit_800ExtraBold", fontSize: 15 }}>{fat}g</Text>
            <Text style={{ color: "#92400E", fontSize: 10 }}>fat</Text>
          </View>
        </View>

        {/* Expandable Recipe */}
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#150A00", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 13 }}>🍳 How to Prep This Meal</Text>
          <Text style={{ color: "#78350F", fontSize: 14 }}>{expanded ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={{ marginTop: 10, backgroundColor: "#150A00", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            {recipe.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Text style={{ color: "#FFF7ED", fontSize: 11, fontFamily: "Outfit_700Bold" }}>{i + 1}</Text>
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

function MealSwapModal({ mealType, mealData, dietaryPreference, fitnessGoal, generateSwaps, onClose, onSelect }: {
  mealType: string;
  mealData: { name: string; calories: number; protein: number; carbs: number; fat: number } | null;
  dietaryPreference: string;
  fitnessGoal: string;
  generateSwaps: any;
  onClose: () => void;
  onSelect: (item: { name: string; calories: number; protein: number; carbs: number; fat: number; prepTime: string; dietaryTags: string[]; description: string; ingredients: string[]; instructions: string[] }) => void;
}) {
  const MEAL_ICONS_LOCAL: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };
  const [alternatives, setAlternatives] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<any | null>(null);

  // Auto-generate alternatives when modal opens
  React.useEffect(() => {
    if (!mealData) return;
    setLoading(true);
    setError(null);
    generateSwaps.mutate(
      {
        mealName: mealData.name,
        mealType,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
        dietaryPreference,
        fitnessGoal,
      },
      {
        onSuccess: (data: any) => {
          setAlternatives(data.alternatives ?? []);
          setLoading(false);
        },
        onError: (e: any) => {
          setError("Could not generate alternatives. Please try again.");
          setLoading(false);
        },
      }
    );
  }, []);

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,5,0,0.88)", justifyContent: "flex-end", zIndex: 999 }}>
      <View style={{ backgroundColor: "#0A0500", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, paddingBottom: 40, maxHeight: "90%", borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}>
        {/* Handle */}
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(245,158,11,0.25)", alignSelf: "center", marginBottom: 16 }} />
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1.5 }}>AI MEAL SWAP</Text>
            <Text style={{ color: "#FFF7ED", fontSize: 20, fontFamily: "Outfit_800ExtraBold", marginTop: 2 }}>
              {MEAL_ICONS_LOCAL[mealType]} Swap {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </Text>
            {mealData && (
              <Text style={{ color: "#92400E", fontSize: 11, fontFamily: "DMSans_400Regular", marginTop: 2 }}>
                Replacing: {mealData.name} · {mealData.calories} kcal
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
            onPress={onClose}
          >
            <Text style={{ color: "#F59E0B", fontSize: 18, fontFamily: "Outfit_700Bold" }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Diet badge */}
        <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}>
              <Text style={{ color: "#FBBF24", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "uppercase" }}>
                🤖 AI · {dietaryPreference}
              </Text>
            </View>
            <Text style={{ color: "#78350F", fontSize: 11, fontFamily: "DMSans_400Regular" }}>
              Personalised to your diet & goal
            </Text>
          </View>
        </View>

        {/* Loading state */}
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 15 }}>Generating alternatives...</Text>
            <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center", paddingHorizontal: 30 }}>
              AI is finding {dietaryPreference} meals with equivalent calories
            </Text>
          </View>
        )}

        {/* Error state */}
        {error && !loading && (
          <View style={{ alignItems: "center", paddingVertical: 30, paddingHorizontal: 20, gap: 12 }}>
            <Text style={{ fontSize: 36 }}>⚠️</Text>
            <Text style={{ color: "#DC2626", fontFamily: "Outfit_700Bold", fontSize: 15, textAlign: "center" }}>{error}</Text>
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
              onPress={onClose}
            >
              <Text style={{ color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Detail view for selected item */}
        {selectedItem && !loading && (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}
              onPress={() => setSelectedItem(null)}
            >
              <Text style={{ color: "#F59E0B", fontSize: 14 }}>←</Text>
              <Text style={{ color: "#F59E0B", fontFamily: "DMSans_500Medium", fontSize: 13 }}>Back to alternatives</Text>
            </TouchableOpacity>
            <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_800ExtraBold", fontSize: 20, marginBottom: 4 }}>{selectedItem.name}</Text>
            <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 12 }}>{selectedItem.description}</Text>
            {/* Macros */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Calories", value: `${selectedItem.calories} kcal`, color: "#FBBF24" },
                { label: "Protein", value: `${selectedItem.protein}g`, color: "#3B82F6" },
                { label: "Carbs", value: `${selectedItem.carbs}g`, color: "#FDE68A" },
                { label: "Fat", value: `${selectedItem.fat}g`, color: "#F97316" },
              ].map(m => (
                <View key={m.label} style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                  <Text style={{ color: m.color, fontFamily: "Outfit_700Bold", fontSize: 13 }}>{m.value}</Text>
                  <Text style={{ color: "#78350F", fontSize: 10, marginTop: 2 }}>{m.label}</Text>
                </View>
              ))}
            </View>
            {/* Prep time + tags */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}>
                <Text style={{ color: "#FBBF24", fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>⏱ {selectedItem.prepTime}</Text>
              </View>
              {(selectedItem.dietaryTags ?? []).map((tag: string) => (
                <View key={tag} style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}>
                  <Text style={{ color: "#92400E", fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "uppercase" }}>{tag}</Text>
                </View>
              ))}
            </View>
            {/* Ingredients */}
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 8, letterSpacing: 0.5 }}>INGREDIENTS</Text>
            {(selectedItem.ingredients ?? []).map((ing: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                <Text style={{ color: "#F59E0B", fontSize: 12, marginTop: 2 }}>•</Text>
                <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1, lineHeight: 20 }}>{ing}</Text>
              </View>
            ))}
            {/* Instructions */}
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13, marginTop: 14, marginBottom: 8, letterSpacing: 0.5 }}>HOW TO MAKE IT</Text>
            {(selectedItem.instructions ?? []).map((step: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", flexShrink: 0 }}>
                  <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "Outfit_700Bold" }}>{i + 1}</Text>
                </View>
                <Text style={{ color: "#FFF7ED", fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
              </View>
            ))}
            {/* Confirm swap button */}
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 20 }}
              onPress={() => onSelect(selectedItem)}
            >
              <Text style={{ color: "#0A0500", fontFamily: "Outfit_800ExtraBold", fontSize: 16 }}>✓ Swap to This Meal</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Alternatives list */}
        {!loading && !error && !selectedItem && alternatives.length > 0 && (
          <FlatList
            data={alternatives}
            keyExtractor={(item, i) => item.name + i}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", flexDirection: "row", alignItems: "center", gap: 12 }}
                onPress={() => setSelectedItem(item)}
              >
                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}>
                  <Text style={{ fontSize: 26 }}>🍽️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 4 }} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                    <Text style={{ color: "#FBBF24", fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>{item.calories} kcal</Text>
                    <Text style={{ color: "#3B82F6", fontSize: 11, fontFamily: "DMSans_500Medium" }}>P:{item.protein}g</Text>
                    <Text style={{ color: "#FDE68A", fontSize: 11, fontFamily: "DMSans_500Medium" }}>C:{item.carbs}g</Text>
                    <Text style={{ color: "#F97316", fontSize: 11, fontFamily: "DMSans_500Medium" }}>F:{item.fat}g</Text>
                  </View>
                  <Text style={{ color: "#78350F", fontSize: 11, fontFamily: "DMSans_400Regular" }} numberOfLines={1}>⏱ {item.prepTime}</Text>
                </View>
                <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)", alignItems: "center", gap: 2 }}>
                  <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "Outfit_700Bold" }}>View</Text>
                  <Text style={{ color: "#F59E0B", fontSize: 9, fontFamily: "DMSans_400Regular" }}>& Swap</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

