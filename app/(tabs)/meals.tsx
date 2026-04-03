import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image,
  TextInput, Platform, ImageBackground, FlatList, RefreshControl,
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
import { EmptyState, EMPTY_STATES } from "@/components/empty-state";
import { useAiLimit } from "@/components/ai-limit-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { usePantry, PANTRY_CATEGORIES, COMMON_PANTRY_ITEMS, CATEGORY_ICONS as PANTRY_CATEGORY_ICONS, type PantryCategory, type PantryItem, type AISuggestedMeal } from "@/lib/pantry-context";
import { PremiumFeatureTeaser } from "@/components/premium-feature-banner";
import { schedulePantryExpiryAlerts, type PantryExpiryItem } from "@/lib/notifications";
import * as Sharing from "expo-sharing";
import { extractGroceryList, copyGroceryList, shareGroceryList, exportGroceryPdf, type GroceryCategory } from "@/lib/grocery-list";
import { loadMealPreferences, toggleFavourite, rateMeal, isFavourite, getMealRating, buildPreferenceSummary, type MealPreferences } from "@/lib/meal-preferences";
import { saveMealPlanToHistory, getPastMealNames, updatePhotoCacheFromPlan, applyCachedPhotos, isWeeklyRefreshNeeded, markWeeklyRefreshDone, loadPinnedMeals, togglePinnedMeal, applyPinnedMeals, cleanupPinnedMeals } from "@/lib/meal-history";


// NanoBanana design tokens ÃÂ¢ÃÂÃÂ Meals uses mint/teal accent
const MBG = "#0A0E14";
const MSURFACE = "#111827";
const MSURFACE2 = "#1E293B";
const MFG = "#F1F5F9";
const MMUTED = "#64748B";
const MINT = "#14B8A6";
const MINT_DIM = "rgba(20,184,166,0.10)";
const MINT_BORDER = "rgba(20,184,166,0.25)";
const MGOLD = "#F59E0B";

// Meal Plan tab constants
const MEAL_PLAN_GOALS = [
  { key: "build_muscle", label: "Build Muscle", iconName: "fitness-center" as const },
  { key: "lose_fat", label: "Lose Fat", iconName: "local-fire-department" as const },
  { key: "maintain", label: "Maintain", iconName: "balance" as const },
  { key: "athletic", label: "Athletic", iconName: "directions-run" as const },
];

const MEAL_PLAN_DIETARY_PREFS = [
  { key: "omnivore", label: "Omnivore", iconName: "restaurant" as const },
  { key: "halal", label: "Halal", iconName: "star-half" as const },
  { key: "vegan", label: "Vegan", iconName: "eco" as const },
  { key: "vegetarian", label: "Vegetarian", iconName: "grass" as const },
  { key: "keto", label: "Keto", iconName: "egg" as const },
  { key: "paleo", label: "Paleo", iconName: "set-meal" as const },
];

const MEAL_PLAN_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CUISINE_OPTIONS = [
  { key: "indian", label: "Indian", icon: "restaurant" },
  { key: "thai", label: "Thai", icon: "ramen-dining" },
  { key: "mexican", label: "Mexican", icon: "local-fire-department" },
  { key: "turkish", label: "Turkish", icon: "kebab-dining" },
  { key: "mediterranean", label: "Mediterranean", icon: "set-meal" },
  { key: "japanese", label: "Japanese", icon: "rice-bowl" },
  { key: "korean", label: "Korean", icon: "soup-kitchen" },
  { key: "chinese", label: "Chinese", icon: "takeout-dining" },
  { key: "italian", label: "Italian", icon: "local-pizza" },
  { key: "american", label: "American", icon: "lunch-dining" },
  { key: "middle_eastern", label: "Middle Eastern", icon: "bakery-dining" },
  { key: "southeast_asian", label: "SE Asian", icon: "ramen-dining" },
  { key: "african", label: "African", icon: "dinner-dining" },
  { key: "caribbean", label: "Caribbean", icon: "set-meal" },
];

const WEEK_DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Normalize AI-returned day names to standard "Monday".."Sunday" format.
 *  Handles: "Day 1", "day 1", "Mon", "monday", "MONDAY", "1", etc. */
function normalizeMealPlanDays(plan: any): any {
  if (!plan?.days || !Array.isArray(plan.days)) return plan;

  const CANONICAL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const ABBR: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

  const normalized = plan.days.map((d: any, idx: number) => {
    const raw = (d.day ?? "").trim().toLowerCase();
    const exact = CANONICAL.find(c => c.toLowerCase() === raw);
    if (exact) return { ...d, day: exact };
    const abbrMatch = ABBR[raw.slice(0, 3)];
    if (abbrMatch) return { ...d, day: abbrMatch };
    const dayNumMatch = raw.match(/day\s*(\d+)/);
    if (dayNumMatch) {
      const num = parseInt(dayNumMatch[1], 10);
      if (num >= 1 && num <= 7) return { ...d, day: CANONICAL[num - 1] };
    }
    const pureNum = parseInt(raw, 10);
    if (pureNum >= 1 && pureNum <= 7) return { ...d, day: CANONICAL[pureNum - 1] };
    return { ...d, day: CANONICAL[idx % 7] };
  });

  // Ensure all 7 days exist
  const daySet = new Set(normalized.map((d: any) => d.day));
  for (const c of CANONICAL) {
    if (!daySet.has(c)) {
      normalized.push({ day: c, meals: [] });
    }
  }
  normalized.sort((a: any, b: any) => CANONICAL.indexOf(a.day) - CANONICAL.indexOf(b.day));

  // ===== ROBUST DEDUPLICATION =====
  // Detect days with identical or near-identical meal sets and diversify them
  const daySignatures = normalized.map((d: any) =>
    (d.meals ?? []).map((m: any) => (m.name ?? "").toLowerCase().trim()).sort().join("|")
  );

  // Cuisine-themed replacement pools for deduplication
  const VARIETY_POOLS: Record<string, Array<{ name: string; type: string; calories: number; protein: number; carbs: number; fat: number; photoQuery: string; ingredients: string[]; instructions: string[] }>> = {
    Mediterranean: [
      { name: "Greek Salad with Grilled Chicken", type: "lunch", calories: 420, protein: 35, carbs: 22, fat: 18, photoQuery: "greek salad chicken",
        ingredients: ["150g chicken breast", "80g romaine lettuce (chopped)", "60g cucumber (diced)", "40g cherry tomatoes (halved)", "30g red onion (sliced)", "30g kalamata olives", "30g feta cheese (crumbled)", "1 tbsp (15ml) olive oil", "1 tbsp red wine vinegar", "1 tsp dried oregano", "Salt and pepper"],
        instructions: ["Season chicken with oregano, salt, pepper, and half the olive oil. Grill over medium-high heat 6 min per side until 74\u00b0C internal (12 min)", "Chop romaine, dice cucumber, halve tomatoes, slice onion. Combine in a large bowl (3 min)", "Add olives and crumbled feta. Whisk remaining olive oil with red wine vinegar, drizzle over salad (1 min)", "Slice grilled chicken into strips. Arrange on top of the salad. Serve immediately (2 min)"] },
      { name: "Shakshuka with Crusty Bread", type: "breakfast", calories: 340, protein: 18, carbs: 30, fat: 16, photoQuery: "shakshuka eggs tomato",
        ingredients: ["2 large eggs", "1 can (200g) chopped tomatoes", "1/2 red pepper (60g, diced)", "1/2 onion (50g, diced)", "2 cloves garlic (minced)", "1 tsp cumin", "1 tsp paprika", "1/2 tsp chili flakes", "1 tbsp (15ml) olive oil", "1 slice crusty bread (50g)", "Fresh parsley (5g)"],
        instructions: ["Heat olive oil in a deep skillet over medium heat. Add diced onion and pepper, cook 5 min until soft (5 min)", "Add garlic, cumin, paprika, and chili flakes. Stir 1 min until fragrant (1 min)", "Pour in chopped tomatoes. Simmer 8 min until sauce thickens slightly (8 min)", "Make 2 wells in the sauce, crack an egg into each. Cover and cook on low 5-6 min until whites are set but yolks runny (6 min)", "Garnish with parsley. Serve with crusty bread for dipping (1 min)"] },
      { name: "Grilled Sea Bass with Lemon Herbs", type: "dinner", calories: 460, protein: 40, carbs: 18, fat: 22, photoQuery: "grilled sea bass fish",
        ingredients: ["180g sea bass fillet (skin-on)", "150g baby potatoes (halved)", "100g cherry tomatoes (on the vine)", "1 lemon (sliced + juice)", "2 tbsp (30ml) olive oil", "2 cloves garlic (sliced)", "1 sprig fresh rosemary", "1 sprig fresh thyme", "Salt and pepper"],
        instructions: ["Preheat oven to 200\u00b0C. Toss halved baby potatoes with 1 tbsp olive oil, salt, pepper. Roast 15 min (15 min)", "Score sea bass skin 3 times. Season both sides with salt, pepper, lemon juice (1 min)", "Add cherry tomatoes and garlic slices to the potato tray. Place sea bass on top, skin-side up. Drizzle remaining oil, lay lemon slices and herbs over fish (2 min)", "Roast 12-14 min until fish is opaque and flakes easily (14 min)", "Plate fish over potatoes and tomatoes. Squeeze extra lemon and drizzle pan juices (1 min)"] },
      { name: "Hummus & Falafel Plate", type: "snack", calories: 280, protein: 14, carbs: 32, fat: 12, photoQuery: "falafel hummus plate",
        ingredients: ["4 falafel balls (120g, shop-bought or homemade)", "60g hummus", "1/2 wholemeal pita (30g)", "30g pickled vegetables", "A few mint leaves"],
        instructions: ["Warm falafel in oven at 180\u00b0C for 8 min or microwave 1 min until hot (8 min)", "Warm pita bread briefly (30 sec)", "Arrange falafel on a plate with hummus, pickles, and torn pita (1 min)", "Garnish with mint leaves and serve (15 sec)"] },
    ],
    Asian: [
      { name: "Teriyaki Chicken Rice Bowl", type: "lunch", calories: 480, protein: 32, carbs: 52, fat: 14, photoQuery: "teriyaki chicken rice",
        ingredients: ["150g chicken thigh (boneless)", "80g jasmine rice (dry)", "60g broccoli florets", "1 medium carrot (50g, julienned)", "2 tbsp (30ml) soy sauce", "1 tbsp (15ml) mirin", "1 tbsp (15g) honey", "1 tsp sesame oil", "1 tsp cornstarch + 1 tbsp water", "5g sesame seeds", "1 spring onion (sliced)"],
        instructions: ["Cook 80g jasmine rice in 160ml water â bring to boil, cover, simmer 12 min. Rest 5 min (17 min)", "Make teriyaki sauce: whisk soy sauce, mirin, honey, and cornstarch slurry in a small bowl (1 min)", "Cut chicken into 2cm pieces. Heat sesame oil in a pan over medium-high. Cook chicken 5-6 min, turning, until golden (6 min)", "Pour teriyaki sauce over chicken, stir 1-2 min until glossy and thick. Add broccoli and carrot, toss to coat, cook 2 min (4 min)", "Serve over rice. Top with sesame seeds and sliced spring onion (1 min)"] },
      { name: "Miso Soup with Tofu & Seaweed", type: "breakfast", calories: 180, protein: 12, carbs: 14, fat: 6, photoQuery: "miso soup tofu",
        ingredients: ["2 tbsp (36g) white miso paste", "100g silken tofu (cubed 1.5cm)", "5g dried wakame seaweed", "500ml dashi stock (or water + 1 tsp dashi powder)", "1 spring onion (finely sliced)", "1 tsp soy sauce (optional)"],
        instructions: ["Heat dashi stock in a saucepan until simmering â do not boil (3 min)", "Add dried wakame; let rehydrate in the hot stock for 2 min (2 min)", "Add tofu cubes gently. Heat through 1 min (1 min)", "Remove pot from heat. Dissolve miso paste in a ladle of the hot stock, then stir back into the pot. Do NOT boil after adding miso (1 min)", "Serve in bowls, garnish with sliced spring onion (30 sec)"] },
      { name: "Salmon Poke Bowl", type: "dinner", calories: 440, protein: 34, carbs: 42, fat: 16, photoQuery: "salmon poke bowl",
        ingredients: ["150g sushi-grade salmon (cubed 2cm)", "80g sushi rice (dry)", "1/2 avocado (60g, sliced)", "50g edamame beans (shelled)", "30g cucumber (sliced)", "1 tbsp (15ml) soy sauce", "1 tsp sesame oil", "1 tsp rice vinegar", "5g pickled ginger", "5g sesame seeds", "1 sheet nori (torn)"],
        instructions: ["Cook sushi rice per packet instructions (usually 12 min + 10 min rest). Season with rice vinegar while warm (22 min)", "Marinate salmon cubes in soy sauce and sesame oil for 10 min (10 min, runs parallel)", "Cook edamame in boiling water 3 min, drain and cool (3 min)", "Build bowl: rice base, arrange salmon, avocado slices, edamame, cucumber in sections (2 min)", "Top with pickled ginger, sesame seeds, and torn nori strips (1 min)"] },
      { name: "Edamame with Sea Salt", type: "snack", calories: 190, protein: 16, carbs: 14, fat: 8, photoQuery: "edamame beans",
        ingredients: ["150g frozen edamame (in pods)", "1/2 tsp flaky sea salt", "Pinch of chili flakes (optional)"],
        instructions: ["Bring a pot of water to a rolling boil. Add frozen edamame pods (2 min)", "Boil 4 min until bright green and tender (4 min)", "Drain and toss with sea salt and optional chili flakes (30 sec)", "Serve warm â squeeze pods to pop out the beans (eat immediately)"] },
    ],
    Indian: [
      { name: "Chicken Tikka Masala with Basmati", type: "dinner", calories: 520, protein: 36, carbs: 48, fat: 18, photoQuery: "chicken tikka masala curry",
        ingredients: ["150g chicken breast (cubed 3cm)", "80g basmati rice (dry)", "80g tomato passata", "60ml single cream or yogurt", "1/2 onion (60g, diced)", "2 cloves garlic (minced)", "10g ginger (grated)", "1 tbsp tikka masala spice mix", "1/2 tsp garam masala", "1/2 tsp turmeric", "1 tbsp (15ml) vegetable oil", "Fresh coriander (10g)"],
        instructions: ["Cook basmati rice: rinse, add to pot with 160ml water, boil, cover, simmer 12 min. Rest 5 min (17 min)", "Heat oil in a pan over medium-high. Add chicken cubes, cook 4-5 min turning until browned on all sides. Remove and set aside (5 min)", "In the same pan, add onion. Cook 4 min until golden. Add garlic, ginger, tikka spice, turmeric. Stir 1 min (5 min)", "Add tomato passata, stir well. Return chicken to the pan. Cover and simmer 12 min (12 min)", "Stir in cream/yogurt and garam masala. Cook 2 more min. Do not boil if using yogurt (2 min)", "Serve curry over fluffed basmati, garnish with coriander (1 min)"] },
      { name: "Masala Omelette with Paratha", type: "breakfast", calories: 380, protein: 22, carbs: 32, fat: 18, photoQuery: "indian masala omelette",
        ingredients: ["3 large eggs", "1/2 small onion (30g, finely diced)", "1 small tomato (40g, diced)", "1 green chili (deseeded, finely chopped)", "15g fresh coriander (chopped)", "1/2 tsp turmeric", "1/4 tsp chili powder", "1 wholemeal paratha or roti (50g)", "1 tsp (5ml) oil or ghee", "Salt and pepper"],
        instructions: ["Crack eggs into a bowl. Add turmeric, chili powder, salt. Whisk until combined (1 min)", "Fold in diced onion, tomato, green chili, and half the coriander (30 sec)", "Heat oil in a non-stick pan over medium heat. Pour in egg mixture, swirl to spread evenly (30 sec)", "Cook without stirring 2 min until base sets. Fold in half and cook 1 more min (3 min)", "Warm paratha in a dry pan or directly over flame for 30 sec each side (1 min)", "Plate omelette alongside paratha, garnish with remaining coriander (30 sec)"] },
      { name: "Dal Tadka with Brown Rice", type: "lunch", calories: 420, protein: 18, carbs: 56, fat: 10, photoQuery: "dal lentil curry rice",
        ingredients: ["100g red lentils (masoor dal, rinsed)", "80g brown rice (dry)", "1/2 onion (50g, diced)", "2 cloves garlic (minced)", "10g ginger (grated)", "1 medium tomato (80g, diced)", "1 tsp cumin seeds", "1/2 tsp turmeric", "1/2 tsp chili powder", "1 tbsp (15ml) ghee or oil", "400ml water", "Fresh coriander (5g)", "Salt to taste"],
        instructions: ["Start brown rice: rinse, add to pot with 200ml water. Boil, cover, simmer 22 min. Rest 5 min (27 min)", "Rinse lentils until water runs clear. Add to a separate pot with 400ml water, turmeric, and a pinch of salt. Bring to boil, then simmer 18-20 min until soft and mushy, skimming foam (20 min, parallel with rice)", "Make the tadka: heat ghee in a small pan. Add cumin seeds, cook 30 sec until they crackle. Add garlic, ginger, cook 1 min (1.5 min)", "Add diced onion and tomato to the tadka. Cook 4-5 min until soft. Add chili powder (5 min)", "Pour the tadka into the cooked dal, stir well. Simmer together 3 min (3 min)", "Serve dal over brown rice, garnish with coriander (1 min)"] },
      { name: "Chana Chaat", type: "snack", calories: 220, protein: 10, carbs: 28, fat: 8, photoQuery: "chana chickpea chaat",
        ingredients: ["150g canned chickpeas (drained, rinsed)", "1 small tomato (40g, finely diced)", "1/4 red onion (20g, finely diced)", "1 green chili (finely chopped)", "10g fresh coriander (chopped)", "1 tbsp lemon juice", "1/2 tsp chaat masala", "1/4 tsp cumin powder", "Salt to taste"],
        instructions: ["Drain and rinse chickpeas. Pat dry with a paper towel (1 min)", "Combine chickpeas, diced tomato, onion, and green chili in a bowl (1 min)", "Add lemon juice, chaat masala, cumin powder, and salt. Toss well to coat (30 sec)", "Garnish with fresh coriander. Serve at room temperature (30 sec)"] },
    ],
    Latin: [
      { name: "Chicken Burrito Bowl", type: "lunch", calories: 510, protein: 38, carbs: 48, fat: 16, photoQuery: "burrito bowl chicken",
        ingredients: ["150g chicken breast", "80g long grain rice (dry)", "80g canned black beans (drained)", "1/2 avocado (60g)", "40g sweetcorn", "30g tomato salsa", "20g cheddar cheese (grated)", "1 tsp cumin", "1 tsp smoked paprika", "1/2 lime (juice)", "1 tbsp (15ml) oil", "Fresh coriander (5g)", "Salt and pepper"],
        instructions: ["Cook rice in 160ml water â boil, cover, simmer 12 min. Stir in lime juice and a pinch of salt when done (12 min)", "Season chicken with cumin, paprika, salt, pepper. Heat oil in a pan over medium-high. Cook 6 min per side until 74\u00b0C internal (12 min)", "Warm black beans and sweetcorn in a small saucepan or microwave (2 min)", "Slice chicken into strips. Build bowl: rice base, chicken, beans, sweetcorn in sections (2 min)", "Top with sliced avocado, salsa, grated cheese, and coriander (1 min)"] },
      { name: "Huevos Rancheros", type: "breakfast", calories: 380, protein: 20, carbs: 34, fat: 16, photoQuery: "huevos rancheros breakfast",
        ingredients: ["2 large eggs", "2 small corn tortillas (50g)", "100g canned chopped tomatoes", "60g canned black beans (drained)", "1/2 jalape\u00f1o (sliced, optional)", "1/4 onion (30g, diced)", "1 clove garlic (minced)", "1/2 tsp cumin", "1 tsp (5ml) oil", "20g cheddar (grated)", "Fresh coriander (5g)", "1/2 lime (wedge)"],
        instructions: ["Heat oil in a skillet over medium heat. Cook onion and garlic 3 min until soft. Add cumin, stir 30 sec (3.5 min)", "Add chopped tomatoes, black beans, and jalape\u00f1o. Simmer 5 min until slightly thickened (5 min)", "Make 2 wells in the sauce. Crack an egg into each. Cover and cook on low 4-5 min until whites set (5 min)", "Warm tortillas in a dry pan 20 sec each side (1 min)", "Place tortillas on a plate, spoon the eggs and sauce on top. Add grated cheese, coriander, and lime (1 min)"] },
      { name: "Grilled Fish Tacos with Slaw", type: "dinner", calories: 440, protein: 32, carbs: 36, fat: 18, photoQuery: "fish tacos",
        ingredients: ["150g white fish fillet (cod or tilapia)", "3 small corn tortillas (75g)", "60g red cabbage (finely shredded)", "1/2 avocado (60g, sliced)", "30g Greek yogurt", "1 lime (juice + wedges)", "1 tsp chipotle paste or chili powder", "1 tsp cumin", "1 tbsp (15ml) oil", "10g fresh coriander", "Salt and pepper"],
        instructions: ["Make slaw: toss shredded cabbage with half the lime juice and a pinch of salt. Set aside to soften (5 min)", "Mix Greek yogurt with chipotle paste and remaining lime juice to make a crema (1 min)", "Season fish with cumin, salt, pepper. Brush with oil. Grill or pan-fry 3-4 min per side until fish flakes easily (8 min)", "Warm tortillas in a dry pan 20 sec each side (1 min)", "Flake fish into chunks. Build tacos: tortilla, slaw, fish, avocado slices, drizzle of crema, coriander (2 min)"] },
      { name: "Guacamole with Veggie Sticks", type: "snack", calories: 200, protein: 4, carbs: 16, fat: 14, photoQuery: "guacamole avocado",
        ingredients: ["1 ripe avocado (120g flesh)", "1/2 lime (juice)", "1/4 red onion (15g, finely diced)", "1 small tomato (30g, diced)", "10g fresh coriander (chopped)", "Pinch of salt and chili flakes", "1 medium carrot (80g) and 1/2 cucumber (60g) cut into sticks"],
        instructions: ["Halve avocado, remove pit, scoop flesh into a bowl. Mash with a fork to desired texture (1 min)", "Add lime juice, diced onion, tomato, coriander, salt, and chili flakes. Mix gently (1 min)", "Cut carrot and cucumber into sticks for dipping (1 min)", "Serve guacamole immediately with veggie sticks on the side (30 sec)"] },
    ],
    Thai: [
      { name: "Pad Thai with Shrimp", type: "lunch", calories: 480, protein: 28, carbs: 54, fat: 16, photoQuery: "pad thai shrimp noodles",
        ingredients: ["120g flat rice noodles (dry)", "100g shrimp/prawns (peeled)", "1 egg", "50g bean sprouts", "2 spring onions (sliced)", "2 tbsp (30ml) tamarind paste", "1 tbsp (15ml) fish sauce", "1 tbsp (15g) palm sugar or brown sugar", "1 tbsp (15ml) vegetable oil", "15g roasted peanuts (crushed)", "1/2 lime (juice + wedge)", "Pinch of chili flakes"],
        instructions: ["Soak rice noodles in warm water for 20 min until pliable but still firm. Drain well (20 min)", "Make pad thai sauce: mix tamarind paste, fish sauce, and sugar in a small bowl until sugar dissolves (1 min)", "Heat oil in a wok over high heat. Cook shrimp 2 min until pink. Push to one side. Crack egg into the wok, scramble 30 sec (2.5 min)", "Add drained noodles and sauce. Toss vigorously with tongs 2-3 min until noodles absorb sauce and are tender (3 min)", "Add bean sprouts and half the spring onions. Toss 30 sec (30 sec)", "Plate and top with crushed peanuts, remaining spring onions, chili flakes, and lime wedge (1 min)"] },
      { name: "Thai Coconut Oat Bowl", type: "breakfast", calories: 320, protein: 10, carbs: 42, fat: 14, photoQuery: "coconut oats tropical",
        ingredients: ["60g rolled oats", "150ml coconut milk", "50ml water", "1/2 banana (sliced)", "30g mango (diced)", "10g toasted coconut flakes", "1 tsp (7g) honey", "Pinch of cardamom"],
        instructions: ["In a saucepan, combine oats, coconut milk, water, and cardamom. Bring to a simmer over medium heat (2 min)", "Cook 4-5 min, stirring frequently, until creamy and thickened (5 min)", "Transfer to a bowl. Top with sliced banana, diced mango, and toasted coconut flakes (1 min)", "Drizzle honey over the top. Serve warm (15 sec)"] },
      { name: "Green Curry with Jasmine Rice", type: "dinner", calories: 500, protein: 30, carbs: 48, fat: 20, photoQuery: "thai green curry rice",
        ingredients: ["150g chicken thigh (cubed 2.5cm) or firm tofu", "80g jasmine rice (dry)", "100ml coconut milk", "2 tbsp (30g) green curry paste", "80g bamboo shoots (canned, drained)", "60g Thai aubergine or regular aubergine (cubed)", "6 Thai basil leaves", "2 kaffir lime leaves (torn)", "1 tbsp (15ml) fish sauce", "1 tsp (5g) palm sugar", "1 tbsp (15ml) vegetable oil"],
        instructions: ["Cook jasmine rice: 80g rice in 160ml water. Boil, cover, simmer 12 min. Rest 5 min (17 min)", "Heat oil in a wok over medium heat. Fry green curry paste 1 min until fragrant (1 min)", "Add half the coconut milk, stir to combine with paste. Cook 2 min until oil separates slightly (2 min)", "Add chicken pieces. Stir-fry 4 min until nearly cooked through (4 min)", "Add remaining coconut milk, bamboo shoots, aubergine, fish sauce, palm sugar, and kaffir lime leaves. Simmer 8 min (8 min)", "Stir in Thai basil leaves just before serving. Plate curry over jasmine rice (1 min)"] },
      { name: "Mango Sticky Rice", type: "snack", calories: 240, protein: 4, carbs: 42, fat: 8, photoQuery: "mango sticky rice thai",
        ingredients: ["60g glutinous (sticky) rice", "80ml coconut milk", "1 tbsp (15g) sugar", "Pinch of salt", "1/2 ripe mango (100g, sliced)", "5g toasted sesame seeds"],
        instructions: ["Soak sticky rice in water for at least 30 min (or overnight). Drain (30 min)", "Steam soaked rice in a bamboo steamer or fine-mesh sieve over simmering water for 20 min until translucent and sticky (20 min)", "While rice steams, warm coconut milk with sugar and salt in a small pan until sugar dissolves. Do not boil (2 min)", "Transfer hot rice to a bowl, pour 2/3 of the sweet coconut milk over it. Stir gently, cover, let absorb 10 min (10 min)", "Plate rice alongside sliced mango. Drizzle remaining coconut milk over the top, sprinkle sesame seeds (1 min)"] },
    ],
    Turkish: [
      { name: "Turkish Eggs (Cilbir) with Yogurt", type: "breakfast", calories: 350, protein: 20, carbs: 22, fat: 20, photoQuery: "cilbir turkish eggs yogurt",
        ingredients: ["2 large eggs", "120g thick Greek yogurt", "1 clove garlic (minced)", "20g butter", "1 tsp Aleppo pepper (pul biber) or paprika", "1 tsp white vinegar", "1 slice sourdough bread (50g, toasted)", "Fresh dill (5g)", "Flaky salt"],
        instructions: ["Mix Greek yogurt with minced garlic and a pinch of salt in a bowl. Spread onto a plate, making a well in the centre (1 min)", "Bring a pot of water to a gentle simmer. Add white vinegar. Create a whirlpool and poach eggs one at a time â 3 min each for runny yolks (6 min)", "Melt butter in a small pan over medium heat. Add Aleppo pepper, swirl 30 sec until butter turns red â remove from heat immediately (1 min)", "Place poached eggs on the yogurt bed. Drizzle the spiced butter over everything (30 sec)", "Garnish with fresh dill and flaky salt. Serve with toasted sourdough for dipping (1 min)"] },
      { name: "Lamb Kebab with Bulgur Salad", type: "lunch", calories: 490, protein: 36, carbs: 38, fat: 20, photoQuery: "lamb kebab bulgur",
        ingredients: ["180g minced lamb", "60g bulgur wheat (dry)", "1/2 onion (40g, grated)", "10g parsley (chopped)", "1 tsp cumin", "1/2 tsp sumac", "1 medium tomato (80g, diced)", "1/4 cucumber (40g, diced)", "1 tbsp (15ml) olive oil", "1 tbsp lemon juice", "Fresh mint (5g)", "Salt and pepper"],
        instructions: ["Soak bulgur in 120ml boiling water. Cover, let stand 15 min until tender (15 min)", "Combine lamb, grated onion, half the parsley, cumin, salt and pepper. Knead 2 min until sticky. Shape into 4 oval kebabs around flat skewers (4 min)", "Grill kebabs over high heat (or under a broiler) 4-5 min per side until browned and cooked through (10 min)", "Fluff bulgur with a fork. Add diced tomato, cucumber, remaining parsley, mint, olive oil, lemon juice, and sumac. Toss (2 min)", "Plate bulgur salad with kebabs alongside (1 min)"] },
      { name: "Grilled Chicken Adana with Rice", type: "dinner", calories: 480, protein: 38, carbs: 40, fat: 16, photoQuery: "adana kebab chicken",
        ingredients: ["150g chicken mince or finely diced breast", "80g basmati rice (dry)", "1/2 onion (40g, grated)", "1 red pepper (roasted, from jar â 50g)", "1 tsp paprika", "1/2 tsp chili flakes", "1/2 tsp cumin", "1 tbsp (15ml) olive oil", "40g tomato (grilled)", "Fresh parsley (5g)", "Salt and pepper"],
        instructions: ["Cook basmati rice: rinse, 160ml water, boil, cover, simmer 12 min. Rest 5 min (17 min)", "Mix chicken mince with grated onion, paprika, chili flakes, cumin, salt, pepper. Knead until smooth (2 min)", "Shape mixture into flat sausage shapes on metal skewers (or form into patties) (2 min)", "Grill over high heat 4 min per side until charred edges and cooked through (8 min)", "Halve a tomato, brush with oil and grill cut-side down 2 min alongside the chicken (2 min)", "Plate rice, lay Adana kebab on top with grilled tomato and roasted pepper. Garnish with parsley (1 min)"] },
      { name: "Roasted Chickpeas (Leblebi)", type: "snack", calories: 200, protein: 10, carbs: 28, fat: 6, photoQuery: "roasted chickpeas",
        ingredients: ["200g canned chickpeas (drained, rinsed, patted very dry)", "1 tbsp (15ml) olive oil", "1/2 tsp cumin", "1/2 tsp paprika", "1/4 tsp garlic powder", "Pinch of cayenne", "1/2 tsp flaky salt"],
        instructions: ["Preheat oven to 200\u00b0C. Pat chickpeas as dry as possible with paper towels â the drier, the crunchier (2 min)", "Toss chickpeas with olive oil, cumin, paprika, garlic powder, and cayenne on a baking tray. Spread in a single layer (1 min)", "Roast 25-30 min, shaking the tray halfway through, until golden and crunchy (30 min)", "Remove from oven, sprinkle with flaky salt immediately. Let cool 5 min â they crisp further as they cool (5 min)"] },
    ],
    Nordic: [
      { name: "Smoked Salmon on Rye with Cream Cheese", type: "breakfast", calories: 340, protein: 24, carbs: 28, fat: 14, photoQuery: "smoked salmon rye bread",
        ingredients: ["80g smoked salmon", "2 slices dark rye bread (60g total)", "30g cream cheese", "1/4 red onion (15g, thinly sliced into rings)", "10g capers (drained)", "Fresh dill (5g)", "1/2 lemon (wedge)", "Black pepper"],
        instructions: ["Toast rye bread slices lightly if desired (1 min)", "Spread 15g cream cheese evenly on each slice (30 sec)", "Arrange 40g smoked salmon on each slice, draping it in loose folds (30 sec)", "Top with red onion rings, capers, and fresh dill sprigs (30 sec)", "Finish with a crack of black pepper and a squeeze of lemon (15 sec)"] },
      { name: "Open-Face Shrimp Sandwich", type: "lunch", calories: 380, protein: 26, carbs: 32, fat: 14, photoQuery: "shrimp sandwich open face",
        ingredients: ["100g cooked peeled shrimp", "1 slice sourdough bread (50g)", "2 tbsp (30g) mayo (or skyr-based dressing)", "1 tsp lemon juice", "1/2 tsp Dijon mustard", "30g cucumber (thinly sliced)", "10g fresh dill (chopped)", "4 thin lemon slices", "Salt, white pepper, paprika"],
        instructions: ["Mix mayo, lemon juice, Dijon, and half the dill in a bowl. Season with salt and white pepper (1 min)", "Fold cooked shrimp into the dressing gently (30 sec)", "Toast sourdough slice until golden and firm (2 min)", "Layer cucumber slices on the toast. Pile the dressed shrimp on top (1 min)", "Garnish with remaining dill, lemon slices, and a dust of paprika (30 sec)"] },
      { name: "Baked Cod with Dill Potatoes", type: "dinner", calories: 420, protein: 36, carbs: 34, fat: 12, photoQuery: "baked cod fish potatoes",
        ingredients: ["170g cod fillet", "200g baby potatoes (halved)", "1 tbsp (15ml) olive oil", "1 tbsp (15g) butter", "20g fresh dill (chopped)", "1 lemon (zest + juice of half, wedges from other)", "100g green beans (trimmed)", "1 clove garlic (minced)", "Salt, white pepper"],
        instructions: ["Boil baby potatoes in salted water 12-15 min until tender. Drain, toss with butter, half the dill, and lemon zest (15 min)", "Meanwhile, preheat oven to 190\u00b0C. Place cod on a lined tray. Drizzle with olive oil, season with salt, white pepper, and lemon juice (1 min)", "Bake cod 12-14 min until flesh is opaque and flakes with a fork (14 min)", "Blanch green beans in boiling water 3-4 min until tender-crisp. Drain (4 min)", "Plate cod alongside dill potatoes and green beans. Scatter remaining dill and serve with lemon wedges (1 min)"] },
      { name: "Berry Skyr Bowl", type: "snack", calories: 180, protein: 16, carbs: 22, fat: 4, photoQuery: "skyr yogurt berries",
        ingredients: ["200g Icelandic skyr (plain)", "60g mixed berries (blueberries, raspberries)", "1 tsp (7g) honey", "10g granola or toasted oats", "Pinch of cinnamon"],
        instructions: ["Spoon 200g skyr into a bowl (15 sec)", "Top with mixed berries arranged in a cluster (30 sec)", "Sprinkle granola or toasted oats over one side (15 sec)", "Drizzle honey and dust with cinnamon (15 sec)"] },
    ],
  };
  const themeKeys = Object.keys(VARIETY_POOLS);

  const seenSigs = new Map<string, number>();
  let themeIdx = 0;

  daySignatures.forEach((sig: string, idx: number) => {
    if (!sig) return;
    if (seenSigs.has(sig) && normalized[idx].meals?.length > 0) {
      // This day is a duplicate Ã¢ÂÂ replace with themed alternatives
      const theme = themeKeys[themeIdx % themeKeys.length];
      themeIdx++;
      const pool = VARIETY_POOLS[theme];
      const origMeals = normalized[idx].meals;

      normalized[idx].meals = origMeals.map((m: any, mi: number) => {
        // Find a pool meal of matching type, or use round-robin
        const mType = (m.type ?? "meal").toLowerCase();
        const poolMatch = pool.find(p => p.type === mType) ?? pool[mi % pool.length];
        return {
          ...poolMatch,
          type: m.type ?? poolMatch.type,
          photoUrl: undefined,  // Force fresh image lookup
        };
      });
    } else {
      seenSigs.set(sig, idx);
    }
  });

  // Ensure every meal has a photoQuery for better image matching
  normalized.forEach((day: any) => {
    day.meals?.forEach((meal: any) => {
      if (!meal.photoQuery && meal.name) {
        meal.photoQuery = meal.name.toLowerCase();
      }
    });
  });

  return { ...plan, days: normalized };
}


// ============================================================================================
// CURATED MEAL PHOTO DATABASE â Local mapping of meal names to accurate food photographs.
// This eliminates reliance on AI-generated images. Every URL points to a verified Unsplash
// photo that visually matches the dish name. Lookup is case-insensitive via getMealPlanPhotoUrl.
// ============================================================================================
const CURATED_MEAL_PHOTOS: Record<string, string> = {
  // ââ BREAKFAST ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "berry yogurt parfait":            "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
  "overnight oats with chia & berries": "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80",
  "overnight oats with banana":      "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80",
  "spinach & feta omelette":         "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&q=80",
  "bacon & avocado eggs":            "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80",
  "sweet potato hash with eggs":     "https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=600&q=80",
  "labneh & za'atar flatbread":      "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?w=600&q=80",
  "scrambled eggs on wholegrain toast": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80",
  "avocado toast with poached egg":  "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=600&q=80",
  "smoothie bowl (acai & berries)":  "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=600&q=80",
  "protein pancakes (3 pcs)":        "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
  "masala omelette with paratha":    "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=600&q=80",
  "shakshuka with crusty bread":     "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600&q=80",
  "turkish eggs (cilbir) with yogurt": "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600&q=80",
  "thai coconut oat bowl":           "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&q=80",
  "smoked salmon on rye with cream cheese": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80",
  "huevos rancheros":                "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600&q=80",
  "miso soup with tofu & seaweed":   "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
  "congee with ginger & scallions":  "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80",
  "french toast with maple syrup":   "https://images.unsplash.com/photo-1484723091739-30990106e7c6?w=600&q=80",
  "egg white & spinach wrap":        "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80",
  "chia pudding with mango":         "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=600&q=80",
  "banana protein pancakes":         "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
  "cottage cheese & fruit plate":    "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&q=80",

  // ââ LUNCH âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "grilled chicken quinoa bowl":     "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  "chicken shawarma rice bowl":      "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&q=80",
  "tofu & edamame buddha bowl":      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
  "halloumi & roasted veg wrap":     "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80",
  "grilled chicken caesar (no croutons)": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  "turkey lettuce wraps":            "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80",
  "turkey & avocado wrap":           "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80",
  "tuna salad sandwich":             "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80",
  "lentil & vegetable soup + bread": "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
  "greek salad with grilled chicken": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  "dal tadka with brown rice":       "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "teriyaki chicken rice bowl":      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
  "pad thai with shrimp":            "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&q=80",
  "lamb kebab with bulgur salad":    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80",
  "chicken burrito bowl":            "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
  "open-face shrimp sandwich":       "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80",
  "falafel wrap with hummus":        "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=600&q=80",
  "poke bowl with salmon":           "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  "chicken tikka wrap":              "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80",
  "mediterranean grain bowl":        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  "sushi roll platter":              "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80",
  "vietnamese pho":                  "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80",

  // ââ DINNER ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "pan-seared salmon & asparagus":   "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
  "lamb kofta with tabbouleh":       "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&q=80",
  "chickpea & spinach curry":        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "paneer tikka with brown rice":    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "steak with butter & green beans": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
  "herb-crusted salmon with roasted veg": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
  "chicken tikka masala with basmati": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "grilled sea bass with lemon herbs": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
  "salmon poke bowl":                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  "green curry with jasmine rice":   "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&q=80",
  "grilled chicken adana with rice": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80",
  "baked cod with dill potatoes":    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
  "grilled fish tacos with slaw":    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
  "steak & sweet potato bowl":       "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
  "baked cod with roasted veg":      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80",
  "chicken stir-fry with brown rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
  "beef & broccoli with noodles":    "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80",
  "prawn & vegetable curry + rice":  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "turkey meatballs & courgette pasta": "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&q=80",
  "butter chicken with naan":        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "thai basil chicken with rice":    "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&q=80",
  "beef bulgogi with steamed rice":  "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80",
  "jollof rice with grilled chicken": "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&q=80",
  "jerk chicken with rice & peas":   "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=600&q=80",
  "lamb tagine with couscous":       "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600&q=80",
  "chicken fajitas":                 "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
  "mushroom risotto":                "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&q=80",
  "spaghetti bolognese":             "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80",
  "chicken parmesan with spaghetti": "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600&q=80",
  "korean bibimbap":                 "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80",
  "rendang beef with rice":          "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80",
  "nasi goreng":                     "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&q=80",
  "mapo tofu with rice":             "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80",
  "doner kebab plate":               "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80",

  // ââ SNACKS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "protein snack board":             "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=600&q=80",
  "dates & almonds":                 "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=600&q=80",
  "dates & almonds (30g each)":      "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=600&q=80",
  "hummus & veggie sticks":          "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=600&q=80",
  "greek yogurt with honey & walnuts": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
  "greek yogurt with honey":         "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
  "cheese & olives":                 "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=600&q=80",
  "apple slices with almond butter": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80",
  "banana & almond butter":          "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&q=80",
  "rice cakes with peanut butter":   "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80",
  "boiled eggs (2) with cucumber":   "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=600&q=80",
  "protein bar (quest / fulfil)":    "https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=600&q=80",
  "edamame with sea salt":           "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
  "hummus & falafel plate":          "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=600&q=80",
  "chana chaat":                     "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  "guacamole with veggie sticks":    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80",
  "mango sticky rice":               "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&q=80",
  "roasted chickpeas (leblebi)":     "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=600&q=80",
  "berry skyr bowl":                 "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80",
  "trail mix (40g)":                 "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=600&q=80",
  "dark chocolate (2 squares) & almonds": "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=600&q=80",
  "caprese skewers":                 "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=600&q=80",
};
const MEAL_PHOTO_MAP: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80",
  "morning snack": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80",
  lunch: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  "afternoon snack": "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  dinner: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  snack: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  suhoor: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80",
  iftar: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
};

// Keyword-matched food photos for intelligent fallback ÃÂ¢ÃÂÃÂ matches meal description to appropriate image
const FOOD_KEYWORD_PHOTOS: Array<{ keywords: string[]; url: string }> = [
  { keywords: ["chicken", "grilled chicken", "roast chicken", "poultry"], url: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&q=80" },
  { keywords: ["salmon", "fish", "seafood", "tuna", "cod", "shrimp", "prawn", "sea bass", "trout", "tilapia"], url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80" },
  { keywords: ["steak", "beef", "meat", "lamb", "rib", "sirloin", "filet", "tenderloin"], url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80" },
  { keywords: ["egg", "omelette", "scramble", "frittata", "boiled egg", "poached egg"], url: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80" },
  { keywords: ["salad", "greens", "kale", "spinach", "arugula", "mixed greens", "caesar"], url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80" },
  { keywords: ["rice", "bowl", "grain", "quinoa", "buddha", "poke", "bibimbap"], url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80" },
  { keywords: ["pasta", "noodle", "spaghetti", "penne", "ramen", "linguine", "fettuccine", "udon", "pho", "pad thai", "laksa"], url: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80" },
  { keywords: ["soup", "stew", "broth", "chili", "chowder", "bisque", "minestrone", "tom yum", "tom kha"], url: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80" },
  { keywords: ["toast", "bread", "avocado", "bruschetta", "sourdough"], url: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80" },
  { keywords: ["pancake", "waffle", "french toast", "crepe"], url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80" },
  { keywords: ["smoothie", "shake", "acai", "protein shake", "lassi", "milkshake"], url: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80" },
  { keywords: ["oat", "porridge", "granola", "muesli", "cereal", "overnight"], url: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&q=80" },
  { keywords: ["wrap", "burrito", "tortilla", "taco", "quesadilla", "enchilada", "fajita", "shawarma"], url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80" },
  { keywords: ["sandwich", "panini", "sub", "club", "baguette", "ciabatta"], url: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80" },
  { keywords: ["curry", "tikka", "masala", "dal", "lentil", "indian", "biryani", "tandoori", "korma", "vindaloo", "samosa", "naan", "chapati", "paneer", "butter chicken", "palak"], url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80" },
  { keywords: ["stir fry", "wok", "teriyaki", "soy", "chinese", "kung pao", "sweet and sour", "chow mein", "fried rice", "lo mein", "dim sum", "dumpling", "spring roll", "wontons"], url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80" },
  { keywords: ["fruit", "apple", "banana", "berry", "mango", "melon", "pineapple", "papaya"], url: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80" },
  { keywords: ["yogurt", "parfait", "cottage cheese", "raita", "tzatziki"], url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80" },
  { keywords: ["date", "nut", "almond", "trail mix", "energy", "cashew", "pistachio", "walnut"], url: "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=400&q=80" },
  { keywords: ["falafel", "hummus", "pita", "mediterranean", "middle eastern", "tabbouleh", "fattoush", "baba ganoush", "labneh", "shakshuka"], url: "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=400&q=80" },
  { keywords: ["pizza", "flatbread", "calzone", "focaccia"], url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80" },
  { keywords: ["sushi", "japanese", "miso", "tofu", "edamame", "sashimi", "tempura", "onigiri", "matcha", "teriyaki salmon"], url: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80" },
  { keywords: ["turkey", "deli", "roast"], url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80" },
  { keywords: ["sweet potato", "potato", "baked", "roasted vegetables", "root"], url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" },
  { keywords: ["thai", "pad thai", "green curry", "red curry", "massaman", "tom yum", "thai basil", "pad see ew", "satay", "coconut curry"], url: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&q=80" },
  { keywords: ["korean", "bibimbap", "kimchi", "bulgogi", "japchae", "tteokbokki", "gochujang", "korean bbq", "banchan"], url: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80" },
  { keywords: ["turkish", "kebab", "kofte", "borek", "pide", "lahmacun", "baklava", "gozleme", "adana", "iskender", "doner"], url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80" },
  { keywords: ["mexican", "guacamole", "salsa", "nachos", "churro", "tamale", "elote", "pozole", "chilaquiles", "carnitas", "mole", "ceviche"], url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80" },
  { keywords: ["italian", "risotto", "gnocchi", "pesto", "carbonara", "bolognese", "lasagna", "tiramisu", "prosciutto", "caprese", "minestrone"], url: "https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=400&q=80" },
  { keywords: ["african", "jollof", "injera", "tagine", "couscous", "plantain", "fufu", "suya", "bobotie", "bunny chow"], url: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&q=80" },
  { keywords: ["caribbean", "jerk", "ackee", "callaloo", "roti", "pelau", "rice and peas", "patty", "oxtail"], url: "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400&q=80" },
  { keywords: ["southeast asian", "nasi goreng", "rendang", "banh mi", "spring roll", "satay", "laksa", "gado gado", "lumpia"], url: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400&q=80" },
  { keywords: ["american", "burger", "hot dog", "mac and cheese", "bbq", "pulled pork", "wings", "coleslaw", "cornbread", "biscuit"], url: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80" },
  { keywords: ["kofta", "lamb kofta", "meatball", "polpette"], url: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&q=80" },
  { keywords: ["grilled", "bbq", "barbecue", "chargrilled", "flame"], url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80" },
];

// Fallback pool for when no keyword matches
const FOOD_PHOTO_POOL = FOOD_KEYWORD_PHOTOS.map(p => p.url);

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getMealPlanPhotoUrl(meal: any): string {
  // 1. If the meal already has an AI-generated or cached photoUrl, use it
  if (meal.photoUrl) return meal.photoUrl;

  // 2. Check CURATED_MEAL_PHOTOS â exact name match (case-insensitive)
  const mealNameLower = (meal.name ?? "").toLowerCase().trim();
  if (mealNameLower && CURATED_MEAL_PHOTOS[mealNameLower]) {
    return CURATED_MEAL_PHOTOS[mealNameLower];
  }

  // 3. Partial match: check if any curated key is contained within the meal name or vice versa
  if (mealNameLower.length > 3) {
    for (const [key, url] of Object.entries(CURATED_MEAL_PHOTOS)) {
      if (mealNameLower.includes(key) || key.includes(mealNameLower)) {
        return url;
      }
    }
  }

  // 4. Keyword-based matching from FOOD_KEYWORD_PHOTOS
  const searchText = `${meal.name ?? ""} ${meal.photoQuery ?? ""} ${meal.type ?? ""} ${meal.cuisine ?? ""}`.toLowerCase();
  if (searchText.trim().length > 1) {
    let bestMatch: { url: string; score: number } | null = null;
    for (const entry of FOOD_KEYWORD_PHOTOS) {
      let score = 0;
      for (const kw of entry.keywords) {
        if (searchText.includes(kw)) {
          const wordCount = kw.split(" ").length;
          score += kw.length * wordCount;
        }
      }
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { url: entry.url, score };
      }
    }
    if (bestMatch) return bestMatch.url;

    // Hash-based fallback â deterministic so the same meal always gets the same image
    const hashKey = (meal.name ?? searchText).toLowerCase().trim();
    const idx = hashString(hashKey) % FOOD_PHOTO_POOL.length;
    return FOOD_PHOTO_POOL[idx];
  }

  // 5. Final fallback: generic meal-type photo
  const type = (meal.type ?? "default").toLowerCase();
  return MEAL_PHOTO_MAP[type] ?? MEAL_PHOTO_MAP.default;
}

const sanitizeMealName = (name: string): string =>
  name
    .replace(/[\u00b7\u2022\u2023\u25e6\u2043\u2219\u25cf\u25cb\u2013\u2014]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

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

// Diet-aware default recipes when no AI plan exists
type DefaultRecipe = {
  title: string;
  time: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
const DIET_RECIPES: Record<string, Record<string, DefaultRecipe>> = {
  omnivore: {
    breakfast: {
      title: "Berry Yogurt Parfait",
      time: "5 min",
      ingredients: ["200g Greek yogurt (0% fat)", "30g granola", "80g mixed berries (strawberries, blueberries, raspberries)", "1 tsp (7g) honey", "5g chia seeds"],
      steps: [
        "Spoon 100g Greek yogurt into the bottom of a tall glass or bowl (30 sec)",
        "Sprinkle half the granola (15g) and half the berries over the yogurt (30 sec)",
        "Add remaining 100g yogurt as a second layer (15 sec)",
        "Top with remaining granola, berries, and chia seeds (30 sec)",
        "Drizzle 1 tsp honey in a thin stream across the top (15 sec)"
      ],
      calories: 320, protein: 22, carbs: 42, fat: 8
    },
    lunch: {
      title: "Grilled Chicken Quinoa Bowl",
      time: "30 min",
      ingredients: ["150g chicken breast", "80g quinoa (dry weight)", "1 tbsp (15ml) olive oil", "100g mixed vegetables (bell pepper, courgette, red onion)", "1/2 lemon (juice)", "1 tsp smoked paprika", "1/2 tsp garlic powder", "Salt and pepper to taste", "30g baby spinach"],
      steps: [
        "Rinse 80g quinoa under cold water, add to a saucepan with 160ml water. Bring to boil, reduce heat, cover and simmer 15 min until fluffy (15 min)",
        "Meanwhile, butterfly the chicken breast to even thickness. Season both sides with smoked paprika, garlic powder, salt and pepper (2 min)",
        "Heat a grill pan over medium-high heat. Brush chicken with half the olive oil. Grill 6-7 min per side until internal temp reaches 74\u00b0C (14 min)",
        "Chop vegetables into 2cm pieces. Toss with remaining olive oil, spread on a baking tray and roast at 200\u00b0C for 15 min (runs parallel with chicken) (15 min)",
        "Slice chicken into strips. Assemble bowl: quinoa base, roasted veg, chicken, baby spinach. Squeeze lemon juice over the top (3 min)"
      ],
      calories: 520, protein: 42, carbs: 48, fat: 14
    },
    dinner: {
      title: "Pan-Seared Salmon & Asparagus",
      time: "25 min",
      ingredients: ["170g salmon fillet (skin-on)", "200g asparagus spears (trimmed)", "150g sweet potato (peeled, cubed 2cm)", "1 tbsp (15ml) olive oil", "1/2 lemon (juice + zest)", "2 cloves garlic (minced)", "1 tsp dried dill", "Salt and black pepper to taste", "10g butter"],
      steps: [
        "Preheat oven to 200\u00b0C. Toss sweet potato cubes with half the olive oil, salt, and pepper. Spread on a baking tray and roast for 20 min (20 min)",
        "Pat salmon dry with paper towels. Season skin side and flesh with salt, pepper, and dried dill (1 min)",
        "Heat remaining olive oil in a non-stick pan over medium-high heat until shimmering. Place salmon skin-side down, press gently for 10 sec. Cook without moving for 4 min until skin is crispy (4 min)",
        "Flip salmon, add butter and minced garlic to the pan. Baste salmon with the garlic butter for 3 min until fish is just opaque in centre (3 min)",
        "In the last 5 min of sweet potato cooking, add asparagus to the same tray, drizzle with a little oil. Roast until tender-crisp (5 min)",
        "Plate salmon over sweet potato and asparagus. Squeeze lemon juice and sprinkle zest over everything (1 min)"
      ],
      calories: 480, protein: 38, carbs: 28, fat: 22
    },
    snack: {
      title: "Protein Snack Board",
      time: "3 min",
      ingredients: ["30g mixed nuts (almonds, cashews, walnuts)", "1 medium apple (150g)", "2 tbsp (32g) almond butter"],
      steps: [
        "Portion 30g mixed nuts into a small bowl or one section of a plate (30 sec)",
        "Wash and slice the apple into 8 wedges, removing the core (1 min)",
        "Spoon 2 tbsp almond butter into a small ramekin for dipping (30 sec)",
        "Arrange everything on a plate or board for easy snacking (30 sec)"
      ],
      calories: 210, protein: 10, carbs: 22, fat: 12
    },
  },
  halal: {
    breakfast: {
      title: "Labneh & Za'atar Flatbread",
      time: "8 min",
      ingredients: ["80g labneh (strained yogurt)", "1 wholemeal flatbread/pita (60g)", "1 tbsp (15ml) extra virgin olive oil", "1 tsp za'atar spice blend", "1/2 medium cucumber (60g, sliced)", "1 small tomato (80g, diced)", "6 black olives (30g)", "Pinch of sumac"],
      steps: [
        "Warm the flatbread in a dry pan over medium heat for 30 sec each side, or toast lightly (1 min)",
        "Spread 80g labneh generously over the warm flatbread (30 sec)",
        "Drizzle 1 tbsp olive oil in a zigzag pattern over the labneh (15 sec)",
        "Sprinkle 1 tsp za'atar evenly across the surface, add a pinch of sumac (15 sec)",
        "Arrange cucumber slices, diced tomato, and olives on top. Fold or serve open-faced (1 min)"
      ],
      calories: 340, protein: 14, carbs: 38, fat: 16
    },
    lunch: {
      title: "Chicken Shawarma Rice Bowl",
      time: "30 min",
      ingredients: ["150g halal chicken thigh (boneless)", "80g basmati rice (dry weight)", "1 tbsp (15ml) olive oil", "2 tbsp (30g) garlic sauce (toum)", "1 tsp cumin", "1 tsp paprika", "1/2 tsp turmeric", "1/2 tsp cinnamon", "40g pickled turnips", "Fresh parsley (10g, chopped)", "1/2 lemon (juice)"],
      steps: [
        "Rinse 80g basmati rice. Add to a saucepan with 160ml water and a pinch of salt. Bring to boil, reduce to low heat, cover and cook 12 min. Rest 5 min (17 min)",
        "Slice chicken thigh into 1cm strips. Toss with olive oil, cumin, paprika, turmeric, cinnamon, salt, and lemon juice. Marinate while rice cooks (5 min minimum)",
        "Heat a large pan or griddle over high heat. Cook chicken strips 3-4 min per side until charred and cooked through (internal temp 74\u00b0C) (8 min)",
        "Fluff rice with a fork. Build bowl: rice base, shawarma chicken on top (1 min)",
        "Garnish with pickled turnips, a generous spoonful of garlic sauce, and fresh parsley (1 min)"
      ],
      calories: 540, protein: 40, carbs: 52, fat: 16
    },
    dinner: {
      title: "Lamb Kofta with Tabbouleh",
      time: "35 min",
      ingredients: ["200g minced lamb (halal)", "1/2 medium onion (40g, grated)", "15g fresh parsley (finely chopped)", "1 tsp cumin", "1/2 tsp coriander", "60g bulgur wheat (dry)", "2 medium tomatoes (150g, diced)", "1/2 cucumber (60g, diced)", "20g fresh mint (chopped)", "1 lemon (juice)", "1 tbsp (15ml) olive oil", "60g hummus"],
      steps: [
        "Soak 60g bulgur wheat in 120ml boiling water. Cover and let stand 15 min until tender (15 min)",
        "In a bowl, combine minced lamb, grated onion, half the parsley, cumin, coriander, salt and pepper. Mix thoroughly with your hands for 2 min (3 min)",
        "Divide lamb mixture into 6 portions. Shape each around a flat skewer or roll into oval kofta shapes (3 min)",
        "Preheat grill to high. Grill kofta 4-5 min per side until browned and cooked through (internal temp 71\u00b0C) (10 min)",
        "Drain any excess water from bulgur. Add diced tomatoes, cucumber, remaining parsley, mint, lemon juice, and olive oil. Toss well (3 min)",
        "Plate tabbouleh alongside kofta. Serve with 60g hummus on the side (1 min)"
      ],
      calories: 490, protein: 36, carbs: 34, fat: 22
    },
    snack: {
      title: "Dates & Almonds",
      time: "2 min",
      ingredients: ["4 medjool dates (80g)", "30g raw almonds (approx 20 almonds)", "1/2 tsp cinnamon (optional)"],
      steps: [
        "Remove pits from 4 medjool dates if not already pitted (30 sec)",
        "Portion 30g almonds (roughly 20 almonds) into a small bowl (15 sec)",
        "Optionally split each date open and stuff with 2-3 almonds for a more satisfying bite (1 min)",
        "Dust with cinnamon if desired. Serve immediately (15 sec)"
      ],
      calories: 220, protein: 6, carbs: 34, fat: 10
    },
  },
  vegan: {
    breakfast: {
      title: "Overnight Oats with Chia & Berries",
      time: "5 min prep + overnight",
      ingredients: ["60g rolled oats", "200ml oat milk", "1 tbsp (12g) chia seeds", "80g mixed berries (fresh or frozen)", "1 tbsp (20g) maple syrup", "1/2 tsp vanilla extract", "Pinch of cinnamon"],
      steps: [
        "In a mason jar or bowl, combine 60g oats, 200ml oat milk, chia seeds, vanilla extract, and cinnamon. Stir well to combine (1 min)",
        "Cover and refrigerate for at least 6 hours or overnight. The oats and chia will absorb the liquid and thicken (6-8 hrs)",
        "In the morning, stir the mixture â add a splash more oat milk if too thick (30 sec)",
        "Top with mixed berries and drizzle maple syrup over the top (30 sec)",
        "Eat cold or microwave for 90 sec if you prefer warm oats (0-2 min)"
      ],
      calories: 310, protein: 10, carbs: 50, fat: 8
    },
    lunch: {
      title: "Tofu & Edamame Buddha Bowl",
      time: "25 min",
      ingredients: ["150g firm tofu (pressed and cubed 2cm)", "80g brown rice (dry weight)", "80g frozen edamame beans (shelled)", "80g broccoli florets", "1/2 ripe avocado (60g)", "1 tbsp (15ml) soy sauce or tamari", "1 tsp sesame oil", "1 tbsp (15ml) rice vinegar", "1 tsp maple syrup", "5g sesame seeds", "1 tbsp (15ml) vegetable oil"],
      steps: [
        "Cook 80g brown rice in 200ml water â bring to boil, reduce heat, cover and simmer 20 min until tender. Rest 5 min (25 min)",
        "Press tofu between paper towels with a heavy object for 10 min to remove moisture. Cut into 2cm cubes (10 min, runs parallel)",
        "Heat vegetable oil in a non-stick pan over medium-high heat. Pan-fry tofu cubes 3-4 min per side until golden and crispy. Add soy sauce in the last minute (8 min)",
        "Steam or boil edamame and broccoli together for 4 min until bright green and tender-crisp (4 min)",
        "Make dressing: whisk together sesame oil, rice vinegar, and maple syrup (30 sec)",
        "Build bowl: rice base, tofu, edamame, broccoli, sliced avocado. Drizzle dressing and sprinkle sesame seeds (2 min)"
      ],
      calories: 510, protein: 28, carbs: 52, fat: 20
    },
    dinner: {
      title: "Chickpea & Spinach Curry",
      time: "30 min",
      ingredients: ["1 can (400g) chickpeas (drained, rinsed)", "200g fresh spinach", "1 can (200ml) coconut milk", "1 medium onion (120g, diced)", "3 cloves garlic (minced)", "15g fresh ginger (grated)", "2 tbsp (30g) curry paste (red or yellow)", "80g basmati rice (dry weight)", "1 tbsp (15ml) vegetable oil", "1 tsp cumin seeds", "1/2 tsp turmeric", "Salt to taste", "Fresh coriander for garnish (10g)"],
      steps: [
        "Start rice: rinse 80g basmati, add to pot with 160ml water. Bring to boil, reduce heat, cover and cook 12 min. Rest 5 min off heat (17 min)",
        "Heat vegetable oil in a large pan over medium heat. Add cumin seeds and cook 30 sec until fragrant. Add diced onion and cook 5 min until softened (5.5 min)",
        "Add minced garlic and grated ginger, stir for 1 min until aromatic. Add curry paste and turmeric, stir 30 sec (1.5 min)",
        "Pour in coconut milk, stir to combine. Add drained chickpeas and bring to a gentle simmer. Cook 10 min, stirring occasionally (10 min)",
        "Add spinach in handfuls, stirring each batch until wilted â about 2 min total. Season with salt (2 min)",
        "Serve curry over fluffed basmati rice. Garnish with fresh coriander leaves (1 min)"
      ],
      calories: 460, protein: 18, carbs: 56, fat: 18
    },
    snack: {
      title: "Hummus & Veggie Sticks",
      time: "5 min",
      ingredients: ["60g hummus (shop-bought or homemade)", "1 medium carrot (80g, cut into sticks)", "1/2 cucumber (80g, cut into sticks)", "1/2 bell pepper (60g, sliced)", "2 rice cakes (optional, 18g)"],
      steps: [
        "Wash and peel the carrot. Cut into sticks roughly 8cm long and 1cm wide (1 min)",
        "Cut cucumber into similar-sized sticks. Slice bell pepper into strips (1 min)",
        "Spoon 60g hummus into a small bowl or ramekin (15 sec)",
        "Arrange vegetable sticks around the hummus. Add rice cakes alongside if using (1 min)",
        "Serve immediately â keeps in an airtight container for up to 4 hours (15 sec)"
      ],
      calories: 190, protein: 8, carbs: 20, fat: 10
    },
  },
  vegetarian: {
    breakfast: {
      title: "Spinach & Feta Omelette",
      time: "12 min",
      ingredients: ["3 large eggs", "40g fresh spinach", "30g feta cheese (crumbled)", "1 tsp (5ml) olive oil", "1 slice wholegrain bread (40g, toasted)", "Salt and black pepper to taste", "Pinch of nutmeg"],
      steps: [
        "Crack 3 eggs into a bowl. Season with salt, pepper, and a pinch of nutmeg. Whisk with a fork until just combined â don't over-beat (1 min)",
        "Heat olive oil in a 22cm non-stick pan over medium heat. Add spinach and cook 1-2 min, stirring until wilted. Remove and set aside (2 min)",
        "Wipe the pan, add a tiny drizzle more oil. Pour in the whisked eggs, tilting the pan to spread evenly. Cook without stirring for 1 min until edges set (1 min)",
        "Gently lift edges with a spatula, tilt pan to let uncooked egg flow underneath. Cook 2 more min until mostly set but still slightly glossy on top (2 min)",
        "Scatter wilted spinach and crumbled feta over one half of the omelette. Fold the other half over. Cook 30 more sec (30 sec)",
        "Slide onto a plate. Serve alongside a slice of toasted wholegrain bread (1 min)"
      ],
      calories: 350, protein: 24, carbs: 18, fat: 20
    },
    lunch: {
      title: "Halloumi & Roasted Veg Wrap",
      time: "25 min",
      ingredients: ["80g halloumi cheese (sliced 1cm thick)", "1 wholegrain tortilla wrap (60g)", "1/2 courgette (80g, sliced lengthwise)", "1/2 red pepper (60g, quartered)", "1/4 red onion (30g, sliced into rings)", "2 tbsp (30g) hummus", "20g rocket/arugula", "1 tbsp (15ml) olive oil", "1/2 tsp dried oregano", "1/2 lemon (juice)"],
      steps: [
        "Preheat oven to 200\u00b0C. Toss sliced courgette, red pepper, and red onion with olive oil and dried oregano on a baking tray. Roast for 18-20 min until charred at edges (20 min)",
        "While veg roast, heat a dry non-stick pan or griddle over medium-high heat. Cook halloumi slices 2 min per side until golden brown with grill marks (4 min)",
        "Warm the tortilla wrap in the same pan for 20 sec each side to make it pliable (40 sec)",
        "Spread 2 tbsp hummus down the centre of the warm wrap (15 sec)",
        "Layer roasted vegetables, grilled halloumi slices, and rocket on top. Squeeze lemon juice over (1 min)",
        "Fold the bottom of the wrap up, then fold both sides inward. Roll tightly and cut in half diagonally (30 sec)"
      ],
      calories: 490, protein: 26, carbs: 42, fat: 24
    },
    dinner: {
      title: "Paneer Tikka with Brown Rice",
      time: "30 min",
      ingredients: ["180g paneer (cubed 2.5cm)", "80g brown rice (dry weight)", "80g Greek yogurt", "1 tbsp tikka masala paste", "1 tsp garam masala", "1/2 tsp turmeric", "1/2 tsp chili powder", "1 lemon (juice of half, wedges from other half)", "1/2 green pepper (60g, cubed)", "1/2 red onion (40g, quartered)", "1 tbsp (15ml) oil", "Fresh coriander (10g)", "30g raita (yogurt, cucumber, mint)"],
      steps: [
        "Start brown rice: rinse 80g rice, add to pot with 200ml water. Bring to boil, reduce heat, cover and simmer 22-25 min until tender (25 min)",
        "In a bowl, mix yogurt, tikka paste, garam masala, turmeric, chili powder, and lemon juice. Add paneer cubes, pepper, and onion. Coat thoroughly. Marinate 10 min minimum (10 min, runs parallel)",
        "Preheat oven grill/broiler to high. Thread marinated paneer and vegetables onto skewers or spread on a lined baking tray (2 min)",
        "Grill under broiler for 5-6 min, turn once, until paneer is charred and slightly blistered on edges (6 min)",
        "Fluff rice with a fork. Plate rice, arrange tikka paneer and veg on top (1 min)",
        "Spoon raita alongside, scatter fresh coriander, and serve with lemon wedges (1 min)"
      ],
      calories: 480, protein: 28, carbs: 46, fat: 20
    },
    snack: {
      title: "Greek Yogurt with Honey & Walnuts",
      time: "3 min",
      ingredients: ["200g Greek yogurt (full fat or 0%)", "1 tsp (7g) raw honey", "20g walnuts (roughly chopped, about 5 halves)", "Pinch of cinnamon (optional)"],
      steps: [
        "Spoon 200g Greek yogurt into a bowl (15 sec)",
        "Roughly chop 20g walnuts â about 5 walnut halves broken into pieces (30 sec)",
        "Scatter walnuts over the yogurt (15 sec)",
        "Drizzle 1 tsp honey in a thin stream. Dust with cinnamon if desired (30 sec)"
      ],
      calories: 230, protein: 16, carbs: 18, fat: 12
    },
  },
  keto: {
    breakfast: {
      title: "Bacon & Avocado Eggs",
      time: "12 min",
      ingredients: ["3 rashers back bacon (75g)", "3 large eggs", "1/2 ripe avocado (75g)", "10g butter", "Salt and black pepper", "Pinch of chili flakes (optional)"],
      steps: [
        "Place 3 bacon rashers in a cold non-stick pan. Turn heat to medium. Cook 3-4 min per side until crispy to your liking, flipping once (8 min)",
        "Remove bacon to a plate lined with kitchen paper. Keep 1 tsp of the rendered bacon fat in the pan (30 sec)",
        "Add 10g butter to the pan over medium-low heat. Crack 3 eggs into the pan. Scramble gently with a spatula, making large curds â remove from heat while still slightly wet (they'll finish cooking from residual heat) (3 min)",
        "Halve the avocado, remove pit, and slice or scoop 75g onto the plate (30 sec)",
        "Plate scrambled eggs alongside bacon and avocado. Season with salt, pepper, and chili flakes if desired (30 sec)"
      ],
      calories: 420, protein: 28, carbs: 4, fat: 34
    },
    lunch: {
      title: "Grilled Chicken Caesar (No Croutons)",
      time: "20 min",
      ingredients: ["150g chicken breast", "100g romaine lettuce (chopped)", "20g parmesan cheese (shaved)", "2 tbsp (30ml) Caesar dressing", "2 boiled eggs (halved)", "1 tbsp (15ml) olive oil", "1/2 lemon (juice)", "1 clove garlic (minced)", "Salt and black pepper"],
      steps: [
        "Boil 2 eggs: bring water to a rolling boil, lower eggs in gently, cook exactly 9 min for jammy centres. Transfer to ice water for 5 min (14 min total, start first)",
        "Butterfly chicken breast to even thickness. Season with salt, pepper, and minced garlic (1 min)",
        "Heat olive oil in a grill pan over medium-high heat. Grill chicken 5-6 min per side until internal temp reaches 74\u00b0C and nice char marks form (12 min)",
        "Chop romaine lettuce and place in a large bowl. Add Caesar dressing and lemon juice, toss to coat evenly (1 min)",
        "Slice grilled chicken into 1cm strips. Arrange over dressed romaine. Top with shaved parmesan and halved boiled eggs (2 min)"
      ],
      calories: 480, protein: 42, carbs: 6, fat: 32
    },
    dinner: {
      title: "Steak with Butter & Green Beans",
      time: "25 min",
      ingredients: ["200g ribeye steak (2.5cm thick)", "150g green beans (trimmed)", "20g butter", "2 cloves garlic (crushed)", "1 sprig fresh rosemary", "1 sprig fresh thyme", "1 tbsp (15ml) olive oil", "Flaky sea salt and black pepper"],
      steps: [
        "Remove steak from fridge 20 min before cooking to reach room temperature. Pat completely dry with paper towels. Season generously on both sides with flaky salt and pepper (20 min + 1 min)",
        "Heat olive oil in a heavy cast-iron skillet over high heat until just beginning to smoke (2 min)",
        "Lay steak away from you into the hot pan. Do not move it. Sear 4 min for a deep golden crust. Flip once (4 min)",
        "Add butter, crushed garlic, rosemary, and thyme to the pan. Tilt pan slightly and baste steak with the foaming butter using a spoon for 3 min. For medium-rare, internal temp should read 52-54\u00b0C (3 min)",
        "Transfer steak to a cutting board. Rest for 5 min â this allows juices to redistribute (5 min)",
        "While steak rests, use the same pan (reduce heat to medium). Add green beans with a pinch of salt, saut\u00e9 4-5 min tossing frequently until tender-crisp and slightly blistered (5 min)",
        "Slice steak against the grain. Plate alongside green beans, spooning any resting juices over the top (1 min)"
      ],
      calories: 520, protein: 44, carbs: 8, fat: 36
    },
    snack: {
      title: "Cheese & Olives",
      time: "2 min",
      ingredients: ["40g aged cheddar or brie cheese", "8-10 kalamata olives (35g)", "3 celery sticks (60g, optional)"],
      steps: [
        "Cut 40g cheese into bite-sized cubes or slices (30 sec)",
        "Drain olives and portion 8-10 onto the plate (15 sec)",
        "Wash and trim celery into 8cm sticks if using (30 sec)",
        "Arrange on a small plate or board for easy nibbling (15 sec)"
      ],
      calories: 200, protein: 10, carbs: 2, fat: 18
    },
  },
  paleo: {
    breakfast: {
      title: "Sweet Potato Hash with Eggs",
      time: "20 min",
      ingredients: ["1 medium sweet potato (200g, peeled and diced 1.5cm)", "2 large eggs", "1/2 medium onion (50g, diced)", "1/2 bell pepper (60g, diced)", "1 tbsp (15ml) coconut oil or olive oil", "1/2 tsp smoked paprika", "1/2 tsp garlic powder", "Salt and pepper", "Fresh chives for garnish (5g)"],
      steps: [
        "Heat oil in a large non-stick or cast-iron skillet over medium heat. Add diced sweet potato in a single layer. Cook 8-10 min, flipping every 2-3 min, until golden and fork-tender (10 min)",
        "Add diced onion and bell pepper to the skillet. Season everything with smoked paprika, garlic powder, salt, and pepper. Cook 3-4 min until vegetables soften (4 min)",
        "Make 2 wells in the hash by pushing vegetables aside. Crack an egg into each well (15 sec)",
        "Cover the pan with a lid or large plate. Cook on medium-low for 4-5 min until egg whites are set but yolks are still runny (5 min)",
        "Remove from heat. Garnish with chopped fresh chives. Serve directly from the pan (30 sec)"
      ],
      calories: 380, protein: 20, carbs: 36, fat: 18
    },
    lunch: {
      title: "Turkey Lettuce Wraps",
      time: "18 min",
      ingredients: ["200g lean ground turkey", "1 tbsp (15ml) coconut aminos (soy-free alternative)", "1 tbsp (15ml) fresh lime juice", "2 cloves garlic (minced)", "10g fresh ginger (grated)", "8 large butter lettuce leaves", "1 medium carrot (60g, julienned)", "1/4 cup fresh herbs (coriander, mint, basil â 15g total)", "1 tbsp (15ml) avocado oil", "1/2 tsp fish sauce (optional)", "Pinch of red pepper flakes"],
      steps: [
        "Heat avocado oil in a large skillet over medium-high heat until shimmering (1 min)",
        "Add minced garlic and grated ginger, stir for 30 sec until fragrant. Add ground turkey, breaking it up with a wooden spoon (30 sec)",
        "Cook turkey 5-6 min, continuing to break into small pieces, until browned and no pink remains (6 min)",
        "Add coconut aminos, lime juice, fish sauce if using, and red pepper flakes. Stir well and cook 2 more min until sauce is absorbed (2 min)",
        "Wash and separate 8 butter lettuce leaves, pat dry. These are your 'wrap shells' (1 min)",
        "Spoon turkey mixture into each lettuce cup. Top with julienned carrot and fresh herbs. Serve with extra lime wedges (2 min)"
      ],
      calories: 420, protein: 36, carbs: 16, fat: 24
    },
    dinner: {
      title: "Herb-Crusted Salmon with Roasted Veg",
      time: "30 min",
      ingredients: ["180g salmon fillet (skin-on)", "150g broccoli florets", "1 medium carrot (100g, sliced 1cm rounds)", "1 tbsp (15ml) olive oil + 1 tsp for veg", "1 lemon (zest + juice of half, wedges from other half)", "1 tbsp fresh dill (chopped, 5g)", "1 tbsp fresh parsley (chopped, 5g)", "1 clove garlic (minced)", "1 tsp Dijon mustard", "Salt and pepper"],
      steps: [
        "Preheat oven to 200\u00b0C. Toss broccoli florets and carrot slices with 1 tsp olive oil, salt, and pepper on a lined baking tray. Roast for 20 min (20 min)",
        "Meanwhile, make herb crust: mix 1 tbsp olive oil, chopped dill, parsley, minced garlic, Dijon mustard, lemon zest, and a pinch of salt in a small bowl (2 min)",
        "Pat salmon dry. Place skin-side down on a separate lined tray or alongside the veg. Spread herb mixture evenly over the top of the salmon (1 min)",
        "After vegetables have roasted 10 min, add the salmon tray to the oven. Roast both for the remaining 12-15 min until salmon flakes easily and reaches 52\u00b0C internal for medium (12-15 min)",
        "Plate salmon with roasted broccoli and carrots. Squeeze lemon juice over everything and serve with lemon wedges (1 min)"
      ],
      calories: 460, protein: 38, carbs: 20, fat: 24
    },
    snack: {
      title: "Apple Slices with Almond Butter",
      time: "3 min",
      ingredients: ["1 medium apple (150g â Gala, Fuji, or Granny Smith)", "2 tbsp (32g) almond butter (no added sugar)", "1/4 tsp ground cinnamon"],
      steps: [
        "Wash the apple. Cut into quarters, remove core, then slice each quarter into 3 wedges (12 slices total) (1 min)",
        "Spoon 2 tbsp almond butter into a small bowl for dipping (15 sec)",
        "Dust apple slices with ground cinnamon (15 sec)",
        "Dip slices into almond butter as you eat. Alternatively, spread almond butter onto each slice (30 sec)"
      ],
      calories: 200, protein: 6, carbs: 26, fat: 10
    },
  },
};
function getMealRecipes(diet: string): Record<string, DefaultRecipe> {
  return DIET_RECIPES[diet] ?? DIET_RECIPES.omnivore;
}

function MealsScreenContent() {
  const router = useRouter();
  const { showLimitModal } = useAiLimit();
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
  const [pastMealNames, setPastMealNames] = useState<string[]>([]);
  const [pinnedMeals, setPinnedMeals] = useState<Record<string, any>>({});
  const [aiMealPlan, setAiMealPlan] = useState<any>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const jsDay = new Date().getDay(); // 0=Sun
    return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon index
  });
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingWorkout, setRegeneratingWorkout] = useState(false);
  const [autoGeneratingPlan, setAutoGeneratingPlan] = useState(false);
  const autoGenRef = React.useRef(false);
  const [nutritionTab, setNutritionTab] = useState(0); // 0=Tracker, 1=Meal Plan, 2=Pantry
  const [ramadanMode, setRamadanMode] = useState(false);
  const [showMealCustomize, setShowMealCustomize] = useState(false);
  const [mealPlanMode, setMealPlanMode] = useState<"generic" | "pantry">("generic");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedWeekDay, setSelectedWeekDay] = useState(() => {
    const jsDay = new Date().getDay(); // 0=Sun
    return jsDay === 0 ? 6 : jsDay - 1; // Convert to 0=Mon index
  });
  const [swapMealPlanModal, setSwapMealPlanModal] = useState<{ meal: any; dayIndex: number; mealIndex: number } | null>(null);
  const [swapMealPlanAlts, setSwapMealPlanAlts] = useState<any[]>([]);
  const [swapMealPlanLoading, setSwapMealPlanLoading] = useState(false);
  // Per-day customization state
  const [dayCustomizeModal, setDayCustomizeModal] = useState(false);
  const [dayCustomizeTheme, setDayCustomizeTheme] = useState("");
  const [regeneratingDay, setRegeneratingDay] = useState(false);
  const [includeBeyondPantry, setIncludeBeyondPantry] = useState(false);
  const { items: pantryItems, addItem: addPantryItem, addItems: addPantryItems, removeItem: removePantryItem, updateItem: updatePantryItem, getItemsByCategory, getExpiringItems, logUsage } = usePantry();
  // Pantry tab state
  const [pantryDailyPlan, setPantryDailyPlan] = useState<any>(null);
  const [generatingPantryPlan, setGeneratingPantryPlan] = useState(false);
  const [pantryAddMode, setPantryAddMode] = useState(false);
  const [newPantryItemName, setNewPantryItemName] = useState("");
  const [newPantryItemCategory, setNewPantryItemCategory] = useState<PantryCategory>("Other");
  const [newPantryItemExpiry, setNewPantryItemExpiry] = useState(""); // DD/MM/YYYY or empty
  const [expandedPantryMeal, setExpandedPantryMeal] = useState<number | null>(null);
  const [pantryShoppingList, setPantryShoppingList] = useState<{ name: string; quantity?: string; checked: boolean }[]>([]);
  const [showPantryShoppingList, setShowPantryShoppingList] = useState(false);
  const [generatingExpiryMeals, setGeneratingExpiryMeals] = useState(false);
  const [expiryMealSuggestions, setExpiryMealSuggestions] = useState<any[]>([]);
  const [showExpiryMeals, setShowExpiryMeals] = useState(false);
  const pantryNames = useMemo(() => pantryItems.map(p => p.name), [pantryItems]);
  const [localProfile, setLocalProfile] = useState<any>(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  // Grocery shopping list state
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [groceryChecked, setGroceryChecked] = useState<Record<string, boolean>>({});
  // Meal image generation state
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState(0);
  // Meal rating & favourites
  const [mealPrefs, setMealPrefs] = useState<MealPreferences>({ ratings: {}, favourites: [], disliked: [] });
  const [ratingMeal, setRatingMeal] = useState<{ name: string; dayIdx: number; mealIdx: number } | null>(null);
  const [tempRating, setTempRating] = useState(0);
  // Calendar overview
  const [showCalendarOverview, setShowCalendarOverview] = useState(false);
  // Favourite autocomplete
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Reload profile
      const profileRaw = await AsyncStorage.getItem("@guest_profile");
      if (profileRaw) {
        try {
          const p = JSON.parse(profileRaw);
          if (p.dietaryPreference) setUserDietaryPref(p.dietaryPreference);
          if (p.goal) setUserGoal(p.goal);
          if (p.cuisinePrefs?.length) setSelectedCuisines(p.cuisinePrefs);
          setLocalProfile(p);
        } catch {}
      }
      // Reload meal plan
      const mealPlanRaw = await AsyncStorage.getItem("@guest_meal_plan");
      if (mealPlanRaw) {
        try { setAiMealPlan(normalizeMealPlanDays(JSON.parse(mealPlanRaw))); } catch {}
      }
      // Reload favourites
      const favRaw = await AsyncStorage.getItem("@favourite_foods");
      if (favRaw) try { setFavourites(JSON.parse(favRaw)); } catch {}
      // Reload water intake
      const today = new Date().toISOString().split("T")[0];
      const waterRaw = await AsyncStorage.getItem(`@water_intake_${today}`);
      if (waterRaw) try { setWaterIntake(JSON.parse(waterRaw)); } catch {}
      // Reload chart data
      const history = await getHistoricalMeals(7);
      const todayDate = new Date();
      const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const data: typeof chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const dayMeals = history[key] || [];
        data.push({
          label: DAYS[d.getDay()],
          calories: dayMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0),
          protein: dayMeals.reduce((s: number, m: any) => s + (m.protein || 0), 0),
          carbs: dayMeals.reduce((s: number, m: any) => s + (m.carbs || 0), 0),
          fat: dayMeals.reduce((s: number, m: any) => s + (m.fat || 0), 0),
        });
      }
      setChartData(data);
      // Reload calorie context
      await refreshFromStorage();
      // Reload meal preferences
      const prefs = await loadMealPreferences();
      setMealPrefs(prefs);
      // Reload checked ingredients
      const checkedRaw = await AsyncStorage.getItem("@shopping_list_checked");
      if (checkedRaw) try { setCheckedIngredients(JSON.parse(checkedRaw)); } catch {}
    } catch (err) {
      console.warn("Pull-to-refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshFromStorage]);

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

  // Load meal preferences
  React.useEffect(() => {
    loadMealPreferences().then(setMealPrefs);
  }, []);

  // Load user profile and AI-generated meal plan
  React.useEffect(() => {
    AsyncStorage.getItem("@guest_profile").then(raw => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (p.dietaryPreference) setUserDietaryPref(p.dietaryPreference);
          if (p.goal) setUserGoal(p.goal);
          if (p.cuisinePrefs?.length) setSelectedCuisines(p.cuisinePrefs);
          setLocalProfile(p);
        } catch {}
      }
    });
    AsyncStorage.getItem("@guest_meal_plan").then(async (raw) => {
      if (raw) {
        try {
          const parsed = normalizeMealPlanDays(JSON.parse(raw));
          // Apply cached photos to restore previously generated images
          const withPhotos = await applyCachedPhotos(parsed).catch(() => parsed);
          setAiMealPlan(withPhotos);
        } catch {}
      }
    });
    // Load meal history for AI prompt
    getPastMealNames().then(setPastMealNames).catch(() => {});
    // Load pinned meals
    loadPinnedMeals().then(setPinnedMeals).catch(() => {});
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
    onSuccess: async (data) => {
      // Save current plan to history before replacing it
      if (aiMealPlan) {
        saveMealPlanToHistory(aiMealPlan).catch(() => {});
      }
      const normalized = normalizeMealPlanDays(data);
      // Apply pinned meals to preserve user's favourites
      const withPinned = applyPinnedMeals(normalized, pinnedMeals);
      // Apply cached photos to the new plan (reuse previously generated images)
      const withCachedPhotos = await applyCachedPhotos(withPinned).catch(() => withPinned);
      setAiMealPlan(withCachedPhotos);
      setSelectedDayIndex(0);
      setRegenerating(false);
      setAutoGeneratingPlan(false);
      const json = JSON.stringify(withCachedPhotos);
      AsyncStorage.setItem("@guest_meal_plan", json);
      AsyncStorage.setItem("@cached_meal_plan", json);
      // Mark weekly refresh as done
      markWeeklyRefreshDone().catch(() => {});
      // Refresh past meal names for next generation
      getPastMealNames().then(setPastMealNames).catch(() => {});
      // Clean up pinned meals that no longer match the plan structure
      cleanupPinnedMeals(withCachedPhotos).then(setPinnedMeals).catch(() => {});
      if (!autoGenRef.current) {
        const pinnedCount = Object.keys(pinnedMeals).length;
        const msg = pinnedCount > 0
          ? `Your new AI meal plan has been generated. ${pinnedCount} pinned meal${pinnedCount > 1 ? "s" : ""} preserved.`
          : "Your new AI meal plan has been generated based on your current preferences.";
        Alert.alert("\u2705 Meal Plan Updated", msg);
      }
      autoGenRef.current = false;
    },
    onError: (e) => {
      setRegenerating(false);
      setAutoGeneratingPlan(false);
      autoGenRef.current = false;
      Alert.alert("Error", e.message);
    },
  });

  const dailyCalorieTarget = useMemo(() => {
    if (calorieGoal && calorieGoal > 0) return calorieGoal;
    return localProfile?.calorieTarget ?? 2000;
  }, [calorieGoal, localProfile]);

  // Per-day meal plan regeneration mutation
  const regenerateDayMealPlan = trpc.mealPlan.regenerateDay.useMutation({
    onSuccess: (data) => {
      if (!aiMealPlan?.days) return;
      const dayName = WEEK_DAYS_FULL[selectedWeekDay];
      // Clear photoUrl from new meals so image generation triggers for them
      const newMeals = (data.meals ?? []).map((m: any) => ({ ...m, photoUrl: undefined }));
      const updatedDays = aiMealPlan.days.map((d: any) =>
        d.day?.toLowerCase() === dayName.toLowerCase() ? { ...d, meals: newMeals } : d
      );
      const updatedPlan = { ...aiMealPlan, days: updatedDays };
      setAiMealPlan(updatedPlan);
      const json = JSON.stringify(updatedPlan);
      AsyncStorage.setItem("@guest_meal_plan", json);
      AsyncStorage.setItem("@cached_meal_plan", json);
      setRegeneratingDay(false);
      setDayCustomizeModal(false);
      setDayCustomizeTheme("");
      if (Platform.OS !== "web") { try { const Haptics = require("expo-haptics"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} }
      Alert.alert("\u2705 Day Updated", `${dayName}'s meals have been refreshed${data.meals?.length ? ` with ${data.meals.length} new meals` : ""}.`);
    },
    onError: (e: any) => {
      setRegeneratingDay(false);
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }
      Alert.alert("Error", e.message);
    },
  });

  const handleRegenerateDay = useCallback((theme?: string) => {
    setRegeneratingDay(true);
    const dayName = WEEK_DAYS_FULL[selectedWeekDay];
    regenerateDayMealPlan.mutate({
      dayName,
      theme: theme || undefined,
      goal: userGoal,
      dietaryPreference: userDietaryPref,
      dailyCalories: dailyCalorieTarget > 0 ? dailyCalorieTarget : undefined,
      ramadanMode,
      region: localProfile?.region || undefined,
      cuisinePrefs: selectedCuisines.length > 0 ? selectedCuisines : (localProfile?.cuisinePrefs?.length ? localProfile.cuisinePrefs : undefined),
      pastMealNames: pastMealNames.length > 0 ? pastMealNames : undefined,
    });
  }, [selectedWeekDay, userGoal, userDietaryPref, dailyCalorieTarget, ramadanMode, localProfile, selectedCuisines, pastMealNames]);

  // Auto-generate meal plan if none exists (e.g. after onboarding or first visit)
  const autoGenTriggeredRef = React.useRef(false);
  React.useEffect(() => {
    // Wait until profile is loaded before deciding
    if (localProfile === null) return;
    // Only trigger once, and only if no plan exists
    if (aiMealPlan || autoGenTriggeredRef.current || regenerating || autoGeneratingPlan) return;
    autoGenTriggeredRef.current = true;
    // Check if onboarding is complete ÃÂ¢ÃÂÃÂ only auto-generate after onboarding
    AsyncStorage.getItem("@onboarding_complete").then(val => {
      if (val !== "true") return;
      // Double-check storage hasn't been populated in the meantime
      AsyncStorage.getItem("@guest_meal_plan").then(raw => {
        if (raw) {
          try {
            const parsed = normalizeMealPlanDays(JSON.parse(raw));
            setAiMealPlan(parsed);
            return;
          } catch {}
        }
        // No plan exists ÃÂ¢ÃÂÃÂ auto-generate
        autoGenRef.current = true;
        setAutoGeneratingPlan(true);
        regenerateMealPlan.mutate({
          goal: localProfile?.goal || userGoal,
          dietaryPreference: localProfile?.dietaryPreference || userDietaryPref,
          weightKg: localProfile?.weightKg,
          heightCm: localProfile?.heightCm,
          age: localProfile?.age,
          gender: localProfile?.gender,
          activityLevel: localProfile?.activityLevel,
          region: localProfile?.region || undefined,
          cuisinePrefs: localProfile?.cuisinePrefs?.length ? localProfile.cuisinePrefs : undefined,
          pastMealNames: pastMealNames.length > 0 ? pastMealNames : undefined,
        });
      });
    });
  }, [localProfile, aiMealPlan]);

  // Weekly auto-refresh: regenerate meal plan if a new week has started
  const weeklyRefreshRef = React.useRef(false);
  React.useEffect(() => {
    if (!aiMealPlan || !localProfile || weeklyRefreshRef.current || regenerating || autoGeneratingPlan) return;
    weeklyRefreshRef.current = true;
    isWeeklyRefreshNeeded().then(needed => {
      if (!needed) return;
      // It's a new week ÃÂ¢ÃÂÃÂ auto-regenerate the meal plan
      autoGenRef.current = true;
      setAutoGeneratingPlan(true);
      regenerateMealPlan.mutate({
        goal: localProfile?.goal || userGoal,
        dietaryPreference: localProfile?.dietaryPreference || userDietaryPref,
        weightKg: localProfile?.weightKg,
        heightCm: localProfile?.heightCm,
        age: localProfile?.age,
        gender: localProfile?.gender,
        activityLevel: localProfile?.activityLevel,
        region: localProfile?.region || undefined,
        cuisinePrefs: localProfile?.cuisinePrefs?.length ? localProfile.cuisinePrefs : undefined,
        pastMealNames: pastMealNames.length > 0 ? pastMealNames : undefined,
      });
    }).catch(() => {});
  }, [aiMealPlan, localProfile]);

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ AI Meal Image Generation ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const generateMealImages = trpc.mealImages.generateBatch.useMutation();

  const triggerMealImageGeneration = useCallback(async (plan: any) => {
    if (!plan?.days || generatingImages) return;
    // Collect all meals that don't already have a photoUrl
    const mealsToGenerate: Array<{ dayIndex: number; mealIndex: number; name: string; photoQuery?: string }> = [];
    plan.days.forEach((day: any, dayIdx: number) => {
      day.meals?.forEach((meal: any, mealIdx: number) => {
        if (!meal.photoUrl) {
          mealsToGenerate.push({
            dayIndex: dayIdx,
            mealIndex: mealIdx,
            name: meal.name || "healthy meal",
            photoQuery: meal.photoQuery,
          });
        }
      });
    });
    if (mealsToGenerate.length === 0) return;
    setGeneratingImages(true);
    setImageGenProgress(0);
    try {
      // Process in batches of 10 to show progress
      const CHUNK = 10;
      let allResults: Array<{ dayIndex: number; mealIndex: number; photoUrl: string | null }> = [];
      for (let i = 0; i < mealsToGenerate.length; i += CHUNK) {
        const chunk = mealsToGenerate.slice(i, i + CHUNK);
        const result = await generateMealImages.mutateAsync({ meals: chunk });
        allResults = [...allResults, ...result.images];
        setImageGenProgress(Math.round((allResults.length / mealsToGenerate.length) * 100));
      }
      // Apply generated images to the plan
      const updatedDays = plan.days.map((day: any, dayIdx: number) => ({
        ...day,
        meals: day.meals?.map((meal: any, mealIdx: number) => {
          const match = allResults.find(r => r.dayIndex === dayIdx && r.mealIndex === mealIdx);
          if (match?.photoUrl) return { ...meal, photoUrl: match.photoUrl };
          return meal;
        }),
      }));
      const updatedPlan = { ...plan, days: updatedDays };
      setAiMealPlan(updatedPlan);
      const json = JSON.stringify(updatedPlan);
      await AsyncStorage.setItem("@guest_meal_plan", json);
      await AsyncStorage.setItem("@cached_meal_plan", json);
      // Update the persistent photo cache so images survive app restarts
      updatePhotoCacheFromPlan(updatedPlan).catch(() => {});
    } catch (e) {
      // Silently fail ÃÂ¢ÃÂÃÂ fallback images will be used
      console.warn("Meal image generation failed:", e);
    } finally {
      setGeneratingImages(false);
      setImageGenProgress(0);
    }
  }, [generatingImages]);

  // Trigger image generation whenever a new meal plan is set
  const prevPlanRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!aiMealPlan?.days) return;
    const planKey = JSON.stringify(aiMealPlan.days.map((d: any) => d.meals?.map((m: any) => m.name)));
    if (prevPlanRef.current === planKey) return;
    prevPlanRef.current = planKey;
    // Check if any meals are missing photoUrl
    const needsImages = aiMealPlan.days.some((d: any) => d.meals?.some((m: any) => !m.photoUrl));
    if (needsImages) {
      triggerMealImageGeneration(aiMealPlan);
    }
  }, [aiMealPlan]);

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
    onError: (e) => { if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; } Alert.alert("Error", e.message); },
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

  // Pantry daily plan generation handler
  const handleGeneratePantryDailyPlan = React.useCallback(async () => {
    if (pantryItems.length === 0) {
      Alert.alert("Empty Pantry", "Add some items to your pantry first so AI can create a meal plan.");
      return;
    }
    setGeneratingPantryPlan(true);
    setPantryDailyPlan(null);
    setExpandedPantryMeal(null);
    try {
      const pantryList = pantryItems.map(i => i.name).join(", ");
      const response = await fetch(`${Platform.OS === "web" ? "" : "http://127.0.0.1:3000"}/api/trpc/pantry.generateDailyPlan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {
          pantryItems: pantryList,
          calorieGoal: calorieGoal || 2000,
          proteinGoal: macroTargets?.protein || 150,
          carbsGoal: macroTargets?.carbs || 250,
          fatGoal: macroTargets?.fat || 65,
          dietaryPreference: userDietaryPref,
          fitnessGoal: userGoal,
          region: localProfile?.region || undefined,
          cuisinePrefs: localProfile?.cuisinePrefs?.length ? localProfile.cuisinePrefs : undefined,
        }}),
      });
      if (response.ok) {
        const data = await response.json();
        const plan = data?.result?.data?.json;
        setPantryDailyPlan(plan);
      } else {
        Alert.alert("Error", "Failed to generate meal plan. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Failed to generate meal plan. Please try again.");
    } finally {
      setGeneratingPantryPlan(false);
    }
  }, [pantryItems, calorieGoal, macroTargets, userDietaryPref, userGoal, localProfile]);

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pantry Expiry Alerts ÃÂ¢ÃÂÃÂ schedule notifications when items are expiring ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  React.useEffect(() => {
    if (pantryItems.length === 0) return;
    const now = new Date();
    const expiringForNotif: PantryExpiryItem[] = pantryItems
      .filter(i => i.expiresAt)
      .map(i => {
        const exp = new Date(i.expiresAt!);
        const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { name: i.name, expiresAt: i.expiresAt!, daysLeft };
      })
      .filter(i => i.daysLeft <= 3);
    if (expiringForNotif.length > 0) {
      schedulePantryExpiryAlerts(expiringForNotif).catch(() => {});
    }
  }, [pantryItems]);

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Generate "Use It Up" meal suggestions for expiring items ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const handleUseItUpSuggestions = React.useCallback(async () => {
    const expiring = getExpiringItems(3);
    if (expiring.length === 0) return;
    setGeneratingExpiryMeals(true);
    setShowExpiryMeals(true);
    try {
      const expiringNames = expiring.map(i => i.name).join(", ");
      const allNames = pantryItems.map(i => i.name).join(", ");
      const response = await fetch(`${Platform.OS === "web" ? "" : "http://127.0.0.1:3000"}/api/trpc/pantry.suggestMeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {
          pantryItems: allNames,
          dietaryPreference: userDietaryPref,
          fitnessGoal: userGoal,
          prioritizeItems: expiringNames,
        }}),
      });
      if (response.ok) {
        const data = await response.json();
        const meals = data?.result?.data?.json?.meals ?? [];
        setExpiryMealSuggestions(meals);
      }
    } catch {}
    setGeneratingExpiryMeals(false);
  }, [pantryItems, getExpiringItems, userDietaryPref, userGoal]);

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pantry Shopping List ÃÂ¢ÃÂÃÂ compile "need to buy" items from daily plan ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  const handleCreatePantryShoppingList = React.useCallback(() => {
    if (!pantryDailyPlan?.dailyPlan) return;
    const needToBuy: { name: string; quantity?: string }[] = [];
    const seen = new Set<string>();
    // Collect from additionalItemsNeeded
    for (const item of (pantryDailyPlan.dailyPlan.additionalItemsNeeded ?? [])) {
      const key = (typeof item === "string" ? item : item.name || "").toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        needToBuy.push({ name: typeof item === "string" ? item : item.name });
      }
    }
    // Also collect from meal ingredients marked as not from pantry
    for (const meal of (pantryDailyPlan.dailyPlan.meals ?? [])) {
      for (const ing of (meal.ingredients ?? [])) {
        if (!ing.fromPantry) {
          const key = (ing.name || "").toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            needToBuy.push({ name: ing.name, quantity: ing.amount || ing.quantity });
          }
        }
      }
    }
    const list = needToBuy.map(i => ({ ...i, checked: false }));
    setPantryShoppingList(list);
    setShowPantryShoppingList(true);
    AsyncStorage.setItem("@pantry_shopping_list", JSON.stringify(list));
  }, [pantryDailyPlan]);

  const togglePantryShoppingItem = React.useCallback((index: number) => {
    setPantryShoppingList(prev => {
      const updated = prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item);
      AsyncStorage.setItem("@pantry_shopping_list", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const sharePantryShoppingList = React.useCallback(async () => {
    const unchecked = pantryShoppingList.filter(i => !i.checked);
    const items = unchecked.length > 0 ? unchecked : pantryShoppingList;
    const text = `PeakPulse Shopping List\n\n${items.map(i => `\u25a1 ${i.name}${i.quantity ? " ÃÂ¢ÃÂÃÂ " + i.quantity : ""}`).join("\n")}`;
    await Clipboard.setStringAsync(text);
    Alert.alert("\u2705 Copied!", `${items.length} items copied to clipboard. Paste anywhere to share.`);
  }, [pantryShoppingList]);

  const clearCheckedPantryShoppingItems = React.useCallback(() => {
    setPantryShoppingList(prev => {
      const updated = prev.filter(i => !i.checked);
      AsyncStorage.setItem("@pantry_shopping_list", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Load persisted pantry shopping list
  React.useEffect(() => {
    AsyncStorage.getItem("@pantry_shopping_list").then(raw => {
      if (raw) try { setPantryShoppingList(JSON.parse(raw)); } catch {}
    });
  }, []);

  // Category-based default shelf life in days
  const CATEGORY_SHELF_LIFE: Record<PantryCategory, number> = {
    "Proteins": 3,
    "Dairy": 7,
    "Grains & Carbs": 90,
    "Vegetables": 5,
    "Fruits": 5,
    "Condiments & Spices": 180,
    "Oils & Fats": 180,
    "Beverages": 30,
    "Other": 30,
  };

  // Quick add pantry item handler (with optional expiry)
  const handleQuickAddPantryItem = React.useCallback(async (name: string, category: PantryCategory, expiryStr?: string) => {
    let expiresAt: string | undefined;
    if (expiryStr && expiryStr.trim()) {
      const parts = expiryStr.trim().split(/[\/\-]/);
      if (parts.length === 3) {
        expiresAt = parts[0].length === 4
          ? new Date(`${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`).toISOString()
          : new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`).toISOString();
      }
    }
    if (!expiresAt) {
      // Auto-set default expiry based on category
      const shelfDays = CATEGORY_SHELF_LIFE[category] ?? 30;
      const d = new Date();
      d.setDate(d.getDate() + shelfDays);
      expiresAt = d.toISOString();
    }
    await addPantryItem({ name, category, source: "manual", expiresAt });
    if (Platform.OS !== "web") {
      try { const H = require("expo-haptics"); H.impactAsync(H.ImpactFeedbackStyle.Light); } catch {}
    }
  }, [addPantryItem]);

  // Auto-deduct pantry items when a pantry-based meal is logged
  const deductPantryItems = React.useCallback(async (mealIngredients: { name: string; fromPantry?: boolean; quantity?: string }[]) => {
    const deducted: string[] = [];
    const pantryIngredientsUsed = mealIngredients.filter(i => i.fromPantry !== false);
    for (const ingredient of pantryIngredientsUsed) {
      const iName = ingredient.name.toLowerCase().trim();
      // Fuzzy match: find pantry item whose name contains the ingredient or vice versa
      const match = pantryItems.find(p => {
        const pName = p.name.toLowerCase().trim();
        return pName.includes(iName) || iName.includes(pName) || pName.split(" ").some(w => w.length > 3 && iName.includes(w));
      });
      if (match) {
        if (match.quantity && match.quantity > 1) {
          await updatePantryItem(match.id, { quantity: match.quantity - 1 });
          deducted.push(`${match.name} (qty: ${match.quantity} ÃÂ¢ÃÂÃÂ ${match.quantity - 1})`);
        } else {
          await removePantryItem(match.id);
          deducted.push(`${match.name} (removed)`);
        }
        await logUsage({ itemName: match.name, action: "used" });
      }
    }
    return deducted;
  }, [pantryItems, updatePantryItem, removePantryItem, logUsage]);

  // Pantry grouped items
  const pantryGrouped = useMemo(() => getItemsByCategory(), [pantryItems]);
  const pantryNonEmptyCategories = useMemo(() => PANTRY_CATEGORIES.filter(c => pantryGrouped[c]?.length > 0), [pantryGrouped]);
  const pantryExpiringItems = useMemo(() => getExpiringItems(3), [pantryItems]);

  // Meal Plan tab computed values
  const mealPlanTodayName = MEAL_PLAN_DAY_NAMES[new Date().getDay()];
  const mealPlanTodayMeals = aiMealPlan?.days?.find((d: any) => d.day?.toLowerCase().includes(mealPlanTodayName.toLowerCase()));
  const mealPlanOtherDays = useMemo(() => {
    if (!aiMealPlan?.days) return [];
    return aiMealPlan.days.filter((d: any) => !d.day?.toLowerCase().includes(mealPlanTodayName.toLowerCase()));
  }, [aiMealPlan, mealPlanTodayName]);
  const mealGoalLabel = MEAL_PLAN_GOALS.find(g => g.key === userGoal)?.label ?? userGoal;
  const dietLabel = MEAL_PLAN_DIETARY_PREFS.find(d => d.key === userDietaryPref)?.label ?? userDietaryPref;

  // Weekly day selector: find the selected day's data from the AI plan
  const selectedDayData = useMemo(() => {
    if (!aiMealPlan?.days) return null;
    const dayName = WEEK_DAYS_FULL[selectedWeekDay];
    return aiMealPlan.days.find((d: any) => d.day?.toLowerCase().includes(dayName.toLowerCase())) ?? null;
  }, [aiMealPlan, selectedWeekDay]);

  const selectedDayDayCals = useMemo(() => {
    if (!selectedDayData?.meals) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    return {
      calories: selectedDayData.meals.reduce((s: number, m: any) => s + (m.calories ?? 0), 0),
      protein: selectedDayData.meals.reduce((s: number, m: any) => s + (m.protein ?? 0), 0),
      carbs: selectedDayData.meals.reduce((s: number, m: any) => s + (m.carbs ?? 0), 0),
      fat: selectedDayData.meals.reduce((s: number, m: any) => s + (m.fat ?? 0), 0),
    };
  }, [selectedDayData]);

  const toggleCuisine = useCallback((key: string) => {
    setSelectedCuisines(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);
  }, []);

  // Build the mutate params for meal plan generation  // Build preference hint for AI
  const prefSummary = useMemo(() => buildPreferenceSummary(mealPrefs), [mealPrefs]);

  const getMealPlanMutateParams = useCallback((mode: "generic" | "pantry"): any => {
    const base: any = {
      goal: userGoal,
      dietaryPreference: userDietaryPref,
      ramadanMode,
      weightKg: localProfile?.weightKg,
      heightCm: localProfile?.heightCm,
      age: localProfile?.age,
      gender: localProfile?.gender,
      activityLevel: localProfile?.activityLevel,
      region: localProfile?.region || undefined,
      cuisinePrefs: selectedCuisines.length > 0
        ? selectedCuisines
        : (localProfile?.cuisinePrefs?.length ? localProfile.cuisinePrefs : undefined),
      dailyCalories: dailyCalorieTarget > 0 ? dailyCalorieTarget : undefined,
    };

    // Include preference summary so AI learns from user ratings
    if (prefSummary) base.preferenceHint = prefSummary;

    // Include past meal names so AI avoids repeating dishes
    if (pastMealNames.length > 0) base.pastMealNames = pastMealNames;

    // Explicit variety instruction Ã¢ÂÂ tell the AI to generate unique meals per day
    base.varietyHint = "IMPORTANT: Each day of the week MUST have completely different meals. Do NOT repeat the same dishes across different days. Vary cuisines, cooking methods, and ingredients across the week. At most 1-2 dishes may appear twice in the entire week. Each day should feel like a fresh menu.";

    // If cuisines selected, reinforce them in the hint
    if (base.cuisinePrefs?.length > 0) {
      base.varietyHint += " Incorporate these cuisine styles across the week: " + base.cuisinePrefs.join(", ") + ". Distribute different cuisines across different days for maximum variety.";
    }

    return base;
  }, [userGoal, userDietaryPref, ramadanMode, localProfile, selectedCuisines, prefSummary, pastMealNames, dailyCalorieTarget]);
   // Meal Plan swap handler
  const handleMealPlanSwap = useCallback(async (meal: any, dayIndex: number, mealIndex: number, isDislike?: boolean) => {
    // Auto-rate as 1 star when triggered from dislike button
    if (isDislike) {
      const updated = await rateMeal(meal.name, 1);
      setMealPrefs(updated);
    }
    setSwapMealPlanModal({ meal, dayIndex, mealIndex });
    setSwapMealPlanAlts([]);
    setSwapMealPlanLoading(true);
    const dayMeals = aiMealPlan?.days?.[dayIndex]?.meals ?? [];
    const otherMealsCals = dayMeals.reduce((s: number, m: any, i: number) => i === mealIndex ? s : s + (m.calories ?? 0), 0);
    const remainingForSlot = Math.max(0, dailyCalorieTarget - otherMealsCals);
    try {
      const result = await mealSwapGenerate.mutateAsync({
        mealName: meal.name,
        mealType: meal.type ?? "meal",
        calories: meal.calories ?? 400,
        protein: meal.protein ?? 30,
        carbs: meal.carbs ?? 40,
        fat: meal.fat ?? 15,
        dietaryPreference: userDietaryPref,
        preferenceHint: prefSummary || undefined,
      });
      setSwapMealPlanAlts(result.alternatives ?? []);
    } catch (e: any) {
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }
      Alert.alert("Error", e.message);
    } finally {
      setSwapMealPlanLoading(false);
    }
  }, [mealSwapGenerate, userDietaryPref, pantryNames, includeBeyondPantry, dailyCalorieTarget, aiMealPlan, prefSummary, mealPrefs]);

  const applyMealPlanSwap = useCallback((newMeal: any) => {
    if (!swapMealPlanModal || !aiMealPlan?.days) return;
    const dayMeals = aiMealPlan.days[swapMealPlanModal.dayIndex]?.meals ?? [];
    const otherMealsCals = dayMeals.reduce((s: number, m: any, i: number) => i === swapMealPlanModal.mealIndex ? s : s + (m.calories ?? 0), 0);
    const newDayTotal = otherMealsCals + (newMeal.calories ?? 0);
    const doSwap = () => {
      const updatedDays = aiMealPlan.days.map((day: any, di: number) => {
        if (di !== swapMealPlanModal.dayIndex) return day;
        return { ...day, meals: day.meals?.map((m: any, mi: number) => mi === swapMealPlanModal.mealIndex ? { ...newMeal, type: swapMealPlanModal.meal.type } : m) };
      });
      const updatedPlan = { ...aiMealPlan, days: updatedDays };
      setAiMealPlan(updatedPlan);
      AsyncStorage.setItem("@guest_meal_plan", JSON.stringify(updatedPlan));
      setSwapMealPlanModal(null);
      if (Platform.OS !== "web") { try { const Haptics = require("expo-haptics"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {} }
      Alert.alert("Meal Swapped", `Replaced with ${newMeal.name}`);
    };
    if (newDayTotal > dailyCalorieTarget) {
      Alert.alert("Exceeds Daily Limit", `This swap would bring today's total to ${newDayTotal} kcal (target: ${dailyCalorieTarget} kcal). Swap anyway?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Swap Anyway", style: "destructive", onPress: doSwap },
      ]);
      return;
    }
    doSwap();
  }, [swapMealPlanModal, aiMealPlan, dailyCalorieTarget]);

  const caloriePercent = Math.min(100, (totalCalories / calorieGoal) * 100);
  const calorieColor = caloriePercent > 90 ? MMUTED : caloriePercent > 70 ? "#FBBF24" : "#FDE68A";

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
      if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; }
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

  // 1B: Parallax scroll value for Meals hero ÃÂ¢ÃÂÃÂ MUST be above early return to avoid hooks ordering violation
  const mealScrollY = useSharedValue(0);
  const mealHeroImgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(mealScrollY.value, [0, 200], [0, 100], Extrapolation.CLAMP) }],
  }));
  const mealHeroTxtStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mealScrollY.value, [0, 150], [1, 0], Extrapolation.CLAMP),
  }));
  const onMealScroll = useCallback((e: any) => { mealScrollY.value = e.nativeEvent.contentOffset.y; }, []);

  if (!canUse) {
    return (
      <View style={{ flex: 1, backgroundColor: MBG }}>
        <ImageBackground source={{ uri: MEAL_BG }} style={{ flex: 1 }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.78)", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <MaterialIcons name="restaurant" size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
            <Text style={{ color: MFG, fontFamily: "BebasNeue_400Regular", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Meal Log</Text>
            <Text style={{ color: MMUTED, fontSize: 14, textAlign: "center", lineHeight: 20 }}>Sign in or continue as guest to start tracking.</Text>
          </View>
        </ImageBackground>
      </View>
    );
  }

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
    <View style={{ flex: 1, backgroundColor: MBG }}>
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
          <Text style={{ color: "#FDE68A", fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1 }}>NUTRITION TRACKING</Text>
          <Text style={{ color: MFG, fontFamily: "BebasNeue_400Regular", fontSize: 26, letterSpacing: -0.5 }}>Meals</Text>
        </ReAnimated.View>
      </View>

      {/* Daily Summary Card ÃÂ¢ÃÂÃÂ compact */}
      <View style={{ marginHorizontal: 16, marginTop: -16, backgroundColor: MSURFACE, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, zIndex: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold", textTransform: "uppercase" }}>Today's Nutrition</Text>
          <Text style={{ color: calorieColor, fontFamily: "DMSans_700Bold", fontSize: 11 }}>{Math.round(caloriesRemaining)} kcal left</Text>
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

      {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Tab Segmented Control ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, backgroundColor: MSURFACE, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
        {["Tracker", "Meal Plan", "Pantry"].map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: nutritionTab === i ? "#F59E0B" : "transparent", alignItems: "center" }}
            onPress={() => setNutritionTab(i)}
          >
            <Text style={{ color: nutritionTab === i ? MBG : MMUTED, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {nutritionTab === 0 && (
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={onMealScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={MGOLD}
            colors={[MGOLD]}
            progressBackgroundColor={MSURFACE}
          />
        }
      >
        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Log Meal Dropdown Button ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        <View style={{ marginTop: 16, marginBottom: 12, zIndex: 20 }}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 12 }}
            onPress={() => setShowLogDropdown(!showLogDropdown)}
          >
            <MaterialIcons name="add-circle-outline" size={20} color={MBG} />
            <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Log a Meal</Text>
            <MaterialIcons name={showLogDropdown ? "expand-less" : "expand-more"} size={20} color={MBG} />
          </TouchableOpacity>

          {showLogDropdown && (
            <View style={{ marginTop: 6, backgroundColor: MSURFACE, borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", overflow: "hidden" }}>
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
                    <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{opt.label}</Text>
                    <Text style={{ color: MMUTED, fontSize: 11, marginTop: 1 }}>{opt.desc}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={MMUTED} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Manual Log Panel ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        {logMethod === "manual" && (
          <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: MFG, fontSize: 15, fontFamily: "DMSans_700Bold" }}>Manual Log</Text>
              <TouchableOpacity onPress={() => setLogMethod(null)}>
                <MaterialIcons name="close" size={20} color={MMUTED} />
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
                  <MaterialIcons name={MEAL_TYPE_ICONS[t]} size={18} color={mealType === t ? MBG : MMUTED} />
                  <Text style={{ color: mealType === t ? MBG : MMUTED, fontSize: 9, fontFamily: "DMSans_700Bold", marginTop: 2, textTransform: "capitalize" }}>{t}</Text>
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
                placeholderTextColor={MMUTED}
                style={{ backgroundColor: MBG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: MFG, fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                returnKeyType={showCustomEntry ? "next" : "done"}
                onSubmitEditing={showCustomEntry ? undefined : quickLogMeal}
              />
              {/* Autocomplete dropdown */}
              {showAutoComplete && autoCompleteMatches.length > 0 && (
                <View style={{ position: "absolute", top: 48, left: 0, right: 0, backgroundColor: MSURFACE2, borderRadius: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)", zIndex: 100, maxHeight: 200 }}>
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
                        <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{fav.name}</Text>
                        <Text style={{ color: MMUTED, fontSize: 10 }}>{fav.calories} kcal \u2022 P:{fav.protein}g C:{fav.carbs}g F:{fav.fat}g</Text>
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
              <MaterialIcons name={showCustomEntry ? "edit-off" : "edit-note"} size={14} color={showCustomEntry ? "#F59E0B" : MMUTED} />
              <Text style={{ color: showCustomEntry ? "#F59E0B" : MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold" }}>
                {showCustomEntry ? "Hide nutrition fields" : "+ Add nutrition details"}
              </Text>
            </TouchableOpacity>

            {showCustomEntry && (
              <View style={{ gap: 8, marginBottom: 8 }}>
                <TextInput
                  value={customServing}
                  onChangeText={setCustomServing}
                  placeholder="Serving size (e.g. 150g, 1 cup)"
                  placeholderTextColor={MMUTED}
                  style={{ backgroundColor: MBG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: MFG, fontSize: 13, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)" }}
                  returnKeyType="next"
                />
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                  <Text style={{ color: "#F59E0B", fontSize: 12, fontFamily: "DMSans_700Bold", width: 70 }}>Calories</Text>
                  <TextInput value={customCalories} onChangeText={setCustomCalories} placeholder="0" placeholderTextColor={MMUTED} keyboardType="numeric" style={{ flex: 1, color: MFG, fontSize: 15, fontFamily: "DMSans_700Bold", paddingVertical: 0 }} returnKeyType="next" />
                  <Text style={{ color: MMUTED, fontSize: 11 }}>kcal</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[
                    { label: "PROTEIN", value: customProtein, setter: setCustomProtein, color: "#3B82F6" },
                    { label: "CARBS", value: customCarbs, setter: setCustomCarbs, color: "#FDE68A" },
                    { label: "FAT", value: customFat, setter: setCustomFat, color: "#FBBF24" },
                  ].map(m => (
                    <View key={m.label} style={{ flex: 1, backgroundColor: `${m.color}10`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: `${m.color}20` }}>
                      <Text style={{ color: m.color, fontSize: 9, fontFamily: "DMSans_700Bold", marginBottom: 4 }}>{m.label}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TextInput value={m.value} onChangeText={m.setter} placeholder="0" placeholderTextColor={MMUTED} keyboardType="numeric" style={{ flex: 1, color: MFG, fontSize: 14, fontFamily: "DMSans_700Bold", paddingVertical: 0 }} returnKeyType="next" />
                        <Text style={{ color: m.color, fontSize: 10 }}>g</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }} onPress={() => setSaveToFavOnLog(!saveToFavOnLog)}>
                  <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: saveToFavOnLog ? "#F59E0B" : MMUTED, backgroundColor: saveToFavOnLog ? "#F59E0B" : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {saveToFavOnLog && <MaterialIcons name="check" size={14} color={MFG} />}
                  </View>
                  <Text style={{ color: MMUTED, fontSize: 12, fontFamily: "DMSans_700Bold" }}>Save to Favourites</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8, opacity: !mealName.trim() ? 0.5 : 1 }}
              onPress={quickLogMeal}
              disabled={!mealName.trim()}
            >
              <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
                {showCustomEntry ? "+ Log Custom Food" : "+ Log Meal"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ AI Scan Panel ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        {logMethod === "ai-scan" && (
          <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: MFG, fontSize: 15, fontFamily: "DMSans_700Bold" }}>AI Food Scanner</Text>
              <TouchableOpacity onPress={() => { setLogMethod(null); setSelectedImage(null); setSelectedBase64(null); setAnalysisResult(null); }}>
                <MaterialIcons name="close" size={20} color={MMUTED} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#FBBF24", fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
              Take or choose a photo of your meal. AI will identify the food and estimate calories and macros.
            </Text>

            {selectedImage ? (
              <View style={{ marginBottom: 12 }}>
                <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 200, borderRadius: 14, backgroundColor: MSURFACE }} resizeMode="cover" />
                <TouchableOpacity
                  style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(100,116,139,0.56)", borderRadius: 16, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
                  onPress={() => { setSelectedImage(null); setSelectedBase64(null); setAnalysisResult(null); }}
                >
                  <MaterialIcons name="close" size={16} color={MFG} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: MBG, borderRadius: 14, paddingVertical: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
                  onPress={() => pickImage(true)}
                >
                  <MaterialIcons name="photo-camera" size={28} color="#F59E0B" />
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: MBG, borderRadius: 14, paddingVertical: 20, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
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
                    <ActivityIndicator color={MBG} size="small" />
                    <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Analyzing food...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="auto-awesome" size={18} color={MBG} />
                    <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Estimate Calories with AI</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {analysisResult && (
              <View>
                <View style={{ backgroundColor: MBG, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#22C55E30" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                      <Text style={{ color: "#FDE68A", fontFamily: "DMSans_700Bold", fontSize: 13 }}>Analysis Complete</Text>
                    </View>
                    <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#FDE68A", fontSize: 10, fontFamily: "DMSans_700Bold" }}>
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
                          <Text style={{ color: analysisResult.healthScore >= 7 ? "#22C55E" : analysisResult.healthScore >= 4 ? "#FDE68A" : "#F87171", fontSize: 10, fontFamily: "DMSans_700Bold" }}>
                            Health: {analysisResult.healthScore}/10
                          </Text>
                        </View>
                      )}
                      {analysisResult.mealType && (
                        <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: "#FDE68A", fontSize: 10, fontFamily: "DMSans_700Bold", textTransform: "capitalize" }}>
                            {analysisResult.mealType}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {analysisResult.notes && (
                    <Text style={{ color: MMUTED, fontSize: 12, marginBottom: 8, lineHeight: 18 }}>{String(analysisResult.notes)}</Text>
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
                      <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold", textTransform: "uppercase" }}>Portion Size</Text>
                      <Text style={{ color: "#FDE68A", fontSize: 12, fontFamily: "DMSans_700Bold" }}>{portionMultiplier.toFixed(2)}x</Text>
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
                          <Text style={{ color: Math.abs(portionMultiplier - p.val) < 0.01 ? MBG : MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold" }}>{p.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {analysisResult.foods?.length > 0 && (
                    <View>
                      <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold", marginBottom: 6, textTransform: "uppercase" }}>Detected Foods</Text>
                      {analysisResult.foods.map((food: any, i: number) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: i < analysisResult.foods.length - 1 ? 1 : 0, borderBottomColor: "rgba(245,158,11,0.10)" }}>
                          <Text style={{ color: "#F59E0B", fontSize: 12 }}>{food.name} <Text style={{ color: MMUTED }}>({food.portion})</Text></Text>
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
                      <MaterialIcons name={MEAL_TYPE_ICONS[t]} size={16} color={mealType === t ? MBG : MMUTED} />
                      <Text style={{ color: mealType === t ? MBG : MMUTED, fontSize: 8, fontFamily: "DMSans_700Bold", textTransform: "capitalize" }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="Meal name (optional)"
                  placeholderTextColor={MMUTED}
                  style={{ backgroundColor: MBG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: MFG, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={{ backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                  onPress={logAnalyzedMeal}
                >
                  <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>+ Log This Meal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Day Meal Tiles (Breakfast, Lunch, Dinner, Snack) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Today's Meals</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {meals.length > 0 && (
                <Text style={{ color: MMUTED, fontSize: 11 }}>{meals.length} logged</Text>
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
                      backgroundColor: selectedDayIndex === i ? "#F59E0B" : MSURFACE,
                      borderWidth: 1,
                      borderColor: selectedDayIndex === i ? "#F59E0B" : "rgba(245,158,11,0.10)",
                      minWidth: 44,
                      alignItems: "center",
                    }}
                    onPress={() => { setSelectedDayIndex(i); setSwappedMeals({}); }}
                  >
                    <Text style={{ color: selectedDayIndex === i ? MBG : MMUTED, fontFamily: "DMSans_700Bold", fontSize: 11 }}>{shortLabel}</Text>
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
              const dietDefault = getMealRecipes(userDietaryPref)[type];
              const recipe = swapped
                ? { title: swapped.title, time: swapped.recipe.time, steps: swapped.recipe.steps }
                : aiMeal
                  ? { title: aiMeal.name ?? "AI Meal", time: aiMeal.prepTime ?? "15 min", steps: aiMeal.ingredients ?? aiMeal.steps ?? [] }
                  : dietDefault;
              const photo = swapped ? swapped.photo : (aiMeal?.photoUrl ? aiMeal.photoUrl : getMealPlanPhotoUrl(aiMeal ?? { type }));
              const cals = swapped ? swapped.calories : (aiMeal?.calories ?? dietDefault.calories);
              const prot = swapped ? swapped.protein : (aiMeal?.protein ?? dietDefault.protein);
              const logged = loggedByType[type] ?? [];
              const loggedCals = logged.reduce((s, m) => s + m.calories, 0);

              return (
                <View key={type} style={{ width: "48%" as any, backgroundColor: MSURFACE, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                  <Image source={{ uri: photo }} style={{ width: "100%", height: 80 }} resizeMode="cover" />
                  <View style={{ position: "absolute", top: 6, left: 6, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <MaterialIcons name={MEAL_TYPE_ICONS[type]} size={12} color="#FDE68A" />
                    <Text style={{ color: "#FDE68A", fontSize: 9, fontFamily: "DMSans_700Bold", textTransform: "capitalize" }}>{type}</Text>
                  </View>
                  {logged.length > 0 && (
                    <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: "rgba(34,197,94,0.85)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ color: "#FFF", fontSize: 8, fontFamily: "DMSans_700Bold" }}>{Math.round(loggedCals)} kcal</Text>
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 12 }} numberOfLines={1}>{recipe.title}</Text>
                    <Text style={{ color: MMUTED, fontSize: 10, marginTop: 2 }}>{cals} kcal \u2022 {prot}g protein</Text>
                    <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "#F59E0B", borderRadius: 8, paddingVertical: 6, alignItems: "center" }}
                        onPress={() => {
                          addMeal({ name: recipe.title, mealType: type, calories: cals, protein: prot, carbs: swapped ? swapped.carbs : (aiMeal?.carbs ?? dietDefault.carbs), fat: swapped ? swapped.fat : (aiMeal?.fat ?? dietDefault.fat) });
                          Alert.alert("\u2705 Logged!", `${recipe.title} added.`);
                        }}
                      >
                        <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 10 }}>+ Log</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "rgba(234,88,12,0.15)", borderRadius: 8, paddingVertical: 6, alignItems: "center", borderWidth: 1, borderColor: "rgba(234,88,12,0.25)" }}
                        onPress={() => {
                          setSwapMealType(type);
                          setSwapMealData({ name: recipe.title, calories: cals, protein: prot, carbs: swapped ? swapped.carbs : (aiMeal?.carbs ?? dietDefault.carbs), fat: swapped ? swapped.fat : (aiMeal?.fat ?? dietDefault.fat) });
                        }}
                      >
                        <Text style={{ color: "#EA580C", fontFamily: "DMSans_700Bold", fontSize: 10 }}>Swap</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Inline Nutrition Chart (7-day) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        {chartData.length > 0 && (
          <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Weekly Calories</Text>
              <TouchableOpacity onPress={() => router.push("/nutrition-charts" as any)}>
                <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 11 }}>See Details</Text>
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
                    <Rect x={x} y={95 - barH} width={24} height={barH} rx={4} fill={isToday ? "#F59E0B" : overGoal ? MMUTED : "rgba(245,158,11,0.30)"} />
                    <SvgText x={x + 12} y={98} fontSize={8} fill={MMUTED} textAnchor="middle" fontWeight="bold">{d.label}</SvgText>
                    {d.calories > 0 && (
                      <SvgText x={x + 12} y={90 - barH} fontSize={8} fill={isToday ? "#FDE68A" : MMUTED} textAnchor="middle">{d.calories}</SvgText>
                    )}
                  </G>
                );
              })}
            </Svg>
          </View>
        )}

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Water Intake ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons name="water-drop" size={18} color="#3B82F6" />
              <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Water Intake</Text>
            </View>
            <TouchableOpacity onPress={updateWaterGoal}>
              <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 10 }}>Goal: {waterGoal}ml</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ color: "#FBBF24", fontFamily: "BebasNeue_400Regular", fontSize: 18 }}>{waterIntake} ml</Text>
            <Text style={{ color: MMUTED, fontSize: 11, alignSelf: "flex-end" }}>{Math.min(100, Math.round((waterIntake / waterGoal) * 100))}%</Text>
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
                <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 12 }}>+{ml}ml</Text>
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

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Quick Add from Saved Foods ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        {favourites.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8 }}>QUICK ADD FROM SAVED FOODS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[...favourites].sort((a, b) => b.logCount - a.logCount).slice(0, 8).map(fav => (
                <TouchableOpacity
                  key={`quick-${fav.id}`}
                  style={{ backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", alignItems: "center", minWidth: 90 }}
                  onPress={() => logFromFavourite(fav)}
                >
                  <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 11 }} numberOfLines={1}>{fav.name}</Text>
                  <Text style={{ color: "#F59E0B", fontSize: 9, marginTop: 2 }}>{fav.calories} kcal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Meal Gallery + Pantry + Favourites Links ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: MSURFACE, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
            onPress={() => router.push("/meal-photo-gallery" as any)}
          >
            <MaterialIcons name="photo-library" size={18} color="#F59E0B" />
            <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 10 }}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}
            onPress={() => router.push("/pantry" as any)}
          >
            <MaterialIcons name="kitchen" size={18} color="#3B82F6" />
            <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 10 }}>My Pantry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: MSURFACE, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
            onPress={() => setShowFavourites(!showFavourites)}
          >
            <MaterialIcons name="star" size={18} color="#F59E0B" />
            <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 10 }}>Saved ({favourites.length})</Text>
          </TouchableOpacity>
        </View>

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Favourites Expanded ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        {showFavourites && (
          <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 10 }}>Saved Foods</Text>
            {favourites.length === 0 ? (
              <Text style={{ color: MMUTED, fontSize: 12, textAlign: "center", paddingVertical: 12 }}>No saved foods yet. Star a meal to save it.</Text>
            ) : (
              [...favourites].sort((a, b) => b.logCount - a.logCount).map(fav => (
                <View key={fav.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(245,158,11,0.05)", borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 13 }} numberOfLines={1}>{fav.name}</Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 3 }}>
                      <Text style={{ color: "#F59E0B", fontSize: 10, fontFamily: "DMSans_700Bold" }}>{fav.calories} kcal</Text>
                      <Text style={{ color: "#3B82F6", fontSize: 10 }}>P:{fav.protein}g</Text>
                      <Text style={{ color: "#FDE68A", fontSize: 10 }}>C:{fav.carbs}g</Text>
                      <Text style={{ color: "#FBBF24", fontSize: 10 }}>F:{fav.fat}g</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: "#F59E0B", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 4 }}
                    onPress={() => logFromFavourite(fav)}
                  >
                    <MaterialIcons name="add" size={14} color={MBG} />
                    <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 10 }}>Log</Text>
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


        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Today's Log ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 15, marginBottom: 10 }}>
          Today's Log {meals.length > 0 ? `(${meals.length})` : ""}
        </Text>
        {meals.length === 0 ? (
          <EmptyState {...EMPTY_STATES.mealLog} compact onCta={() => setShowLogDropdown(true)} />
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={{ backgroundColor: MSURFACE, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", flexDirection: "row", alignItems: "center", gap: 10 }}>
              {meal.photoUri ? (
                <Image source={{ uri: meal.photoUri }} style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: MSURFACE }} resizeMode="cover" />
              ) : (
                <View style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name={MEAL_TYPE_ICONS[meal.mealType] ?? "restaurant"} size={22} color={MMUTED} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <View style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ color: "#FBBF24", fontSize: 9, fontFamily: "DMSans_700Bold", textTransform: "capitalize" }}>{meal.mealType}</Text>
                  </View>
                </View>
                <Text style={{ color: MFG, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{meal.name}</Text>
                {(meal.protein > 0 || meal.carbs > 0 || meal.fat > 0) && (
                  <Text style={{ color: MMUTED, fontSize: 10, marginTop: 1 }}>
                    P:{Math.round(meal.protein)}g \u00b7 C:{Math.round(meal.carbs)}g \u00b7 F:{Math.round(meal.fat)}g
                  </Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                {meal.calories > 0 && (
                  <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 14 }}>{Math.round(meal.calories)}</Text>
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
                    <MaterialIcons name="close" size={14} color={MMUTED} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Shopping List (collapsible) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
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
                  <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Weekly Shopping List</Text>
                  <View style={{ backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 10 }}>{checkedCount}/{sortedIngredients.length}</Text>
                  </View>
                </View>
                <MaterialIcons name={showShoppingList ? "expand-less" : "expand-more"} size={20} color={MMUTED} />
              </TouchableOpacity>

              {showShoppingList && (
                <View style={{ backgroundColor: MSURFACE, borderRadius: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", overflow: "hidden" }}>
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
                        <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 10 }}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        const allChecked: Record<string, boolean> = {};
                        sortedIngredients.forEach(i => { allChecked[i.key] = true; });
                        updateCheckedIngredients(allChecked);
                      }}>
                        <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 10 }}>Check All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => updateCheckedIngredients({})}>
                        <Text style={{ color: MMUTED, fontFamily: "DMSans_700Bold", fontSize: 10 }}>Clear</Text>
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
                            {isChecked && <MaterialIcons name="check" size={12} color={MFG} />}
                          </View>
                          <Text style={{ color: isChecked ? MMUTED : MFG, fontFamily: "DMSans_500Medium", fontSize: 13, textDecorationLine: isChecked ? "line-through" : "none", flex: 1 }}>{item.display}</Text>
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
      )}

      {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Meal Plan Tab ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
      {nutritionTab === 1 && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={MGOLD}
              colors={[MGOLD]}
              progressBackgroundColor={MSURFACE}
            />
          }
        >
          {/* Auto-generating meal plan loading state */}
          {!aiMealPlan && autoGeneratingPlan ? (
            <View style={{ marginTop: 40, alignItems: "center", gap: 16, paddingHorizontal: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color="#F59E0B" />
              </View>
              <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 18, textAlign: "center" }}>Generating Your Meal Plan</Text>
              <Text style={{ color: MMUTED, fontSize: 13, textAlign: "center", lineHeight: 20 }}>Creating a personalized 7-day meal plan based on your dietary preferences, fitness goals, and caloric targets...</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                  <View key={d} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: MSURFACE, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                    <Text style={{ color: MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : !aiMealPlan ? (
            <View style={{ marginTop: 20, gap: 16 }}>
              <View style={{ backgroundColor: MSURFACE, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="restaurant-menu" size={22} color="#F59E0B" />
                  </View>
                  <View>
                    <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 18 }}>AI Weekly Meal Plan</Text>
                    <Text style={{ color: MMUTED, fontSize: 12 }}>Personalized 7-day meals</Text>
                  </View>
                </View>

                {/* Goal Selection */}
                <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Your Goal</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {MEAL_PLAN_GOALS.map(g => (
                    <TouchableOpacity key={g.key} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: userGoal === g.key ? "#F59E0B" : MSURFACE, borderWidth: 1, borderColor: userGoal === g.key ? "#F59E0B" : "rgba(30,41,59,0.6)" }} onPress={() => setUserGoal(g.key)}>
                      <MaterialIcons name={g.iconName as any} size={14} color={userGoal === g.key ? MBG : MMUTED} />
                      <Text style={{ color: userGoal === g.key ? MBG : MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Dietary Preference */}
                <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Dietary Preference</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {MEAL_PLAN_DIETARY_PREFS.map(d => (
                    <TouchableOpacity key={d.key} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: userDietaryPref === d.key ? "#F59E0B" : MSURFACE, borderWidth: 1, borderColor: userDietaryPref === d.key ? "#F59E0B" : "rgba(30,41,59,0.6)" }} onPress={() => setUserDietaryPref(d.key)}>
                      <MaterialIcons name={d.iconName as any} size={14} color={userDietaryPref === d.key ? MBG : MMUTED} />
                      <Text style={{ color: userDietaryPref === d.key ? MBG : MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Cuisine Preferences (multi-select) */}
                <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Cuisine Preferences <Text style={{ color: MMUTED, fontSize: 9, fontFamily: "DMSans_400Regular", textTransform: "none" }}>(select one or more)</Text></Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {CUISINE_OPTIONS.map(c => {
                    const sel = selectedCuisines.includes(c.key);
                    return (
                      <TouchableOpacity key={c.key} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: sel ? "rgba(245,158,11,0.20)" : MSURFACE, borderWidth: 1, borderColor: sel ? "#F59E0B" : "rgba(30,41,59,0.6)" }} onPress={() => toggleCuisine(c.key)}>
                        <MaterialIcons name={c.icon as any} size={13} color={sel ? "#F59E0B" : MMUTED} />
                        <Text style={{ color: sel ? "#F59E0B" : MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>{c.label}</Text>
                        {sel && <MaterialIcons name="check" size={12} color="#F59E0B" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Ramadan Toggle */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: ramadanMode ? "rgba(245,158,11,0.15)" : MSURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: ramadanMode ? "rgba(245,158,11,0.30)" : "rgba(30,41,59,0.6)", marginBottom: 20 }}
                  onPress={() => setRamadanMode(!ramadanMode)}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: ramadanMode ? "rgba(245,158,11,0.20)" : "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="nightlight-round" size={18} color={ramadanMode ? "#F59E0B" : MMUTED} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: ramadanMode ? "#F59E0B" : MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Ramadan Mode</Text>
                    <Text style={{ color: MMUTED, fontSize: 11 }}>Suhoor & Iftar meal timing</Text>
                  </View>
                  <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: ramadanMode ? "#F59E0B" : "rgba(100,116,139,0.3)", justifyContent: "center", paddingHorizontal: 2 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: MFG, alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                  </View>
                </TouchableOpacity>

                {/* Calorie Target Info */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}>
                  <MaterialIcons name="local-fire-department" size={16} color="#3B82F6" />
                  <Text style={{ color: MMUTED, fontSize: 12, flex: 1 }}>Daily target: <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold" }}>{dailyCalorieTarget} kcal</Text> (from your profile)</Text>
                </View>

                {/* Two Generation Buttons */}
                <View style={{ gap: 10 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: regenerating ? 0.7 : 1 }}
                    onPress={() => {
                      setMealPlanMode("generic");
                      setRegenerating(true);
                      regenerateMealPlan.mutate(getMealPlanMutateParams("generic"));
                    }}
                    disabled={regenerating}
                  >
                    {regenerating && mealPlanMode === "generic" ? <ActivityIndicator color={MBG} /> : <MaterialIcons name="auto-awesome" size={18} color={MBG} />}
                    <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Generate Meal Plan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "rgba(34,197,94,0.30)", opacity: (regenerating || pantryItems.length === 0) ? 0.5 : 1 }}
                    onPress={() => {
                      setMealPlanMode("pantry");
                      setRegenerating(true);
                      regenerateMealPlan.mutate({
                        ...getMealPlanMutateParams("pantry"),
                        favouriteFoods: pantryItems.slice(0, 30).map(p => ({ name: p.name, calories: 0, protein: 0, carbs: 0, fat: 0 })),
                      });
                    }}
                    disabled={regenerating || pantryItems.length === 0}
                  >
                    {regenerating && mealPlanMode === "pantry" ? <ActivityIndicator color="#22C55E" /> : <MaterialIcons name="kitchen" size={18} color="#22C55E" />}
                    <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 15 }}>Generate from Pantry</Text>
                    {pantryItems.length > 0 && <Text style={{ color: MMUTED, fontSize: 11 }}>({pantryItems.length} items)</Text>}
                  </TouchableOpacity>
                  {pantryItems.length === 0 && (
                    <Text style={{ color: MMUTED, fontSize: 11, textAlign: "center" }}>Add items to your Pantry tab first to generate from pantry</Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 12, gap: 12 }}>
              {/* Preferences Banner + Customize Toggle */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: MSURFACE, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <MaterialIcons name="restaurant-menu" size={16} color="#F59E0B" />
                  <Text style={{ color: MFG, fontFamily: "DMSans_600SemiBold", fontSize: 13 }} numberOfLines={1}>{mealGoalLabel} \u00b7 {dietLabel}{selectedCuisines.length > 0 ? ` \u00b7 ${selectedCuisines.length} cuisine${selectedCuisines.length > 1 ? "s" : ""}` : ""}{ramadanMode ? " \u00b7 Ramadan" : ""}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowMealCustomize(!showMealCustomize)}>
                  <MaterialIcons name="tune" size={18} color="#F59E0B" />
                </TouchableOpacity>
              </View>

              {/* Customize Panel (collapsible) */}
              {showMealCustomize && (
                <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", gap: 12 }}>
                  <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, textTransform: "uppercase" }}>Your Goal</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {MEAL_PLAN_GOALS.map(g => (
                      <TouchableOpacity key={g.key} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: userGoal === g.key ? "#F59E0B" : MSURFACE, borderWidth: 1, borderColor: userGoal === g.key ? "#F59E0B" : "rgba(30,41,59,0.6)" }} onPress={() => setUserGoal(g.key)}>
                        <MaterialIcons name={g.iconName as any} size={14} color={userGoal === g.key ? MBG : MMUTED} />
                        <Text style={{ color: userGoal === g.key ? MBG : MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{g.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, textTransform: "uppercase" }}>Dietary Preference</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {MEAL_PLAN_DIETARY_PREFS.map(d => (
                      <TouchableOpacity key={d.key} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: userDietaryPref === d.key ? "#F59E0B" : MSURFACE, borderWidth: 1, borderColor: userDietaryPref === d.key ? "#F59E0B" : "rgba(30,41,59,0.6)" }} onPress={() => setUserDietaryPref(d.key)}>
                        <MaterialIcons name={d.iconName as any} size={14} color={userDietaryPref === d.key ? MBG : MMUTED} />
                        <Text style={{ color: userDietaryPref === d.key ? MBG : MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>{d.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, textTransform: "uppercase" }}>Cuisine Preferences</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {CUISINE_OPTIONS.map(c => {
                      const sel = selectedCuisines.includes(c.key);
                      return (
                        <TouchableOpacity key={c.key} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: sel ? "rgba(245,158,11,0.20)" : "transparent", borderWidth: 1, borderColor: sel ? "#F59E0B" : "rgba(30,41,59,0.6)" }} onPress={() => toggleCuisine(c.key)}>
                          <Text style={{ color: sel ? "#F59E0B" : MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{c.label}</Text>
                          {sel && <MaterialIcons name="check" size={10} color="#F59E0B" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: ramadanMode ? "rgba(245,158,11,0.15)" : "transparent", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: ramadanMode ? "rgba(245,158,11,0.30)" : "rgba(30,41,59,0.6)" }}
                    onPress={() => setRamadanMode(!ramadanMode)}
                  >
                    <MaterialIcons name="nightlight-round" size={16} color={ramadanMode ? "#F59E0B" : MMUTED} />
                    <Text style={{ color: ramadanMode ? "#F59E0B" : MFG, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Ramadan Mode</Text>
                    <View style={{ marginLeft: "auto", width: 36, height: 20, borderRadius: 10, backgroundColor: ramadanMode ? "#F59E0B" : "rgba(100,116,139,0.3)", justifyContent: "center", paddingHorizontal: 2 }}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: MFG, alignSelf: ramadanMode ? "flex-end" : "flex-start" }} />
                    </View>
                  </TouchableOpacity>
                  {/* Regenerate Buttons in Customize Panel */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: regenerating ? 0.7 : 1 }}
                      onPress={() => {
                        setMealPlanMode("generic");
                        setRegenerating(true);
                        setShowMealCustomize(false);
                        regenerateMealPlan.mutate(getMealPlanMutateParams("generic"));
                      }}
                      disabled={regenerating}
                    >
                      {regenerating && mealPlanMode === "generic" ? <ActivityIndicator color={MBG} size="small" /> : <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Regenerate</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(34,197,94,0.30)", opacity: (regenerating || pantryItems.length === 0) ? 0.5 : 1 }}
                      onPress={() => {
                        setMealPlanMode("pantry");
                        setRegenerating(true);
                        setShowMealCustomize(false);
                        regenerateMealPlan.mutate({
                          ...getMealPlanMutateParams("pantry"),
                          favouriteFoods: pantryItems.slice(0, 30).map(p => ({ name: p.name, calories: 0, protein: 0, carbs: 0, fat: 0 })),
                        });
                      }}
                      disabled={regenerating || pantryItems.length === 0}
                    >
                      {regenerating && mealPlanMode === "pantry" ? <ActivityIndicator color="#22C55E" size="small" /> : <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 13 }}>From Pantry</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ AI Image Generation Progress ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
              {generatingImages && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)" }}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: MFG, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Generating meal images... {imageGenProgress}%</Text>
                    <View style={{ height: 3, backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 2, marginTop: 4 }}>
                      <View style={{ height: 3, backgroundColor: "#3B82F6", borderRadius: 2, width: `${imageGenProgress}%` as any }} />
                    </View>
                  </View>
                </View>
              )}

              {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Calendar Overview Toggle ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: showCalendarOverview ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.08)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: showCalendarOverview ? "rgba(245,158,11,0.25)" : "rgba(59,130,246,0.15)" }}
                onPress={() => setShowCalendarOverview(!showCalendarOverview)}
              >
                <MaterialIcons name="calendar-view-week" size={16} color={showCalendarOverview ? "#F59E0B" : "#3B82F6"} />
                <Text style={{ color: showCalendarOverview ? "#F59E0B" : "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 12 }}>{showCalendarOverview ? "Hide Week Overview" : "Week Overview"}</Text>
              </TouchableOpacity>

              {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Calendar Overview Grid ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
              {showCalendarOverview && aiMealPlan?.days && (
                <View style={{ gap: 6 }}>
                  {WEEK_DAYS_FULL.map((dayName, idx) => {
                    const dayData = aiMealPlan.days.find((d: any) => d.day?.toLowerCase() === dayName.toLowerCase());
                    const meals = dayData?.meals ?? [];
                    const dayCals = meals.reduce((s: number, m: any) => s + (m.calories ?? 0), 0);
                    const dayProtein = meals.reduce((s: number, m: any) => s + (m.protein ?? 0), 0);
                    const dayCarbs = meals.reduce((s: number, m: any) => s + (m.carbs ?? 0), 0);
                    const dayFat = meals.reduce((s: number, m: any) => s + (m.fat ?? 0), 0);
                    const calPct = dailyCalorieTarget > 0 ? Math.min(100, (dayCals / dailyCalorieTarget) * 100) : 0;
                    const isToday = (() => { const jsDay = new Date().getDay(); return idx === (jsDay === 0 ? 6 : jsDay - 1); })();
                    const calColor = calPct > 105 ? "#EF4444" : calPct > 90 ? "#22C55E" : calPct > 70 ? "#FBBF24" : "#3B82F6";
                    return (
                      <TouchableOpacity
                        key={dayName}
                        style={{ flexDirection: "row", alignItems: "center", backgroundColor: isToday ? "rgba(245,158,11,0.06)" : MSURFACE, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: isToday ? "rgba(245,158,11,0.25)" : "rgba(30,41,59,0.4)" }}
                        onPress={() => { setSelectedWeekDay(idx); setShowCalendarOverview(false); }}
                      >
                        <View style={{ width: 44, alignItems: "center" }}>
                          <Text style={{ color: isToday ? "#F59E0B" : MFG, fontFamily: "DMSans_700Bold", fontSize: 12 }}>{WEEK_DAYS_SHORT[idx]}</Text>
                          {isToday && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#F59E0B", marginTop: 2 }} />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <Text style={{ color: calColor, fontFamily: "SpaceMono_700Bold", fontSize: 13 }}>{Math.round(dayCals)} kcal</Text>
                            <Text style={{ color: MMUTED, fontSize: 10 }}>{meals.length} meals</Text>
                          </View>
                          {/* Macro bar */}
                          <View style={{ flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(30,41,59,0.4)" }}>
                            {(() => {
                              const total = dayProtein + dayCarbs + dayFat;
                              if (total === 0) return null;
                              const pPct = (dayProtein / total) * 100;
                              const cPct = (dayCarbs / total) * 100;
                              const fPct = (dayFat / total) * 100;
                              return (
                                <>
                                  <View style={{ width: `${pPct}%` as any, height: 6, backgroundColor: "#3B82F6" }} />
                                  <View style={{ width: `${cPct}%` as any, height: 6, backgroundColor: "#FDE68A" }} />
                                  <View style={{ width: `${fPct}%` as any, height: 6, backgroundColor: "#F59E0B" }} />
                                </>
                              );
                            })()}
                          </View>
                          {/* Macro numbers */}
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 3 }}>
                            <Text style={{ color: "#3B82F6", fontSize: 9 }}>P: {Math.round(dayProtein)}g</Text>
                            <Text style={{ color: "#FDE68A", fontSize: 9 }}>C: {Math.round(dayCarbs)}g</Text>
                            <Text style={{ color: "#F59E0B", fontSize: 9 }}>F: {Math.round(dayFat)}g</Text>
                          </View>
                        </View>
                        <MaterialIcons name="chevron-right" size={16} color={MMUTED} />
                      </TouchableOpacity>
                    );
                  })}
                  {/* Legend */}
                  <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, paddingTop: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" }} />
                      <Text style={{ color: MMUTED, fontSize: 9 }}>Protein</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FDE68A" }} />
                      <Text style={{ color: MMUTED, fontSize: 9 }}>Carbs</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B" }} />
                      <Text style={{ color: MMUTED, fontSize: 9 }}>Fat</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Weekly Day Selector Bar ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
              <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                {WEEK_DAYS_SHORT.map((day, idx) => {
                  const isToday = (() => { const jsDay = new Date().getDay(); return idx === (jsDay === 0 ? 6 : jsDay - 1); })();
                  const isSelected = idx === selectedWeekDay;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: isSelected ? "#F59E0B" : MSURFACE, borderWidth: isToday && !isSelected ? 1.5 : 1, borderColor: isSelected ? "#F59E0B" : isToday ? "rgba(245,158,11,0.50)" : "rgba(30,41,59,0.4)" }}
                      onPress={() => setSelectedWeekDay(idx)}
                    >
                      <Text style={{ color: isSelected ? MBG : isToday ? "#F59E0B" : MMUTED, fontFamily: "DMSans_700Bold", fontSize: 12 }}>{day}</Text>
                      {isToday && !isSelected && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#F59E0B", marginTop: 2 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Selected Day Meals ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
              {selectedDayData ? (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <MaterialIcons name="today" size={16} color="#F59E0B" />
                      <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 16 }}>{WEEK_DAYS_FULL[selectedWeekDay]}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)" }}
                      onPress={() => setDayCustomizeModal(true)}
                      disabled={regeneratingDay}
                    >
                      {regeneratingDay ? <ActivityIndicator color="#F59E0B" size={12} /> : <MaterialIcons name="edit-calendar" size={14} color="#F59E0B" />}
                      <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 11 }}>{regeneratingDay ? "Updating..." : "Customize Day"}</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Per-day customization modal */}
                  {dayCustomizeModal && (
                    <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)", gap: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Customize {WEEK_DAYS_FULL[selectedWeekDay]}</Text>
                        <TouchableOpacity onPress={() => { setDayCustomizeModal(false); setDayCustomizeTheme(""); }}>
                          <MaterialIcons name="close" size={18} color={MMUTED} />
                        </TouchableOpacity>
                      </View>
                      <Text style={{ color: MMUTED, fontSize: 11 }}>Choose a theme to regenerate only this day's meals. The rest of your week stays unchanged.</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {[
                          { key: "high-protein", label: "High Protein", icon: "fitness-center" },
                          { key: "low-carb", label: "Low Carb", icon: "trending-down" },
                          { key: "comfort-food", label: "Comfort Food", icon: "favorite" },
                          { key: "quick-meals", label: "Quick Meals", icon: "timer" },
                          { key: "mediterranean", label: "Mediterranean", icon: "set-meal" },
                          { key: "asian-fusion", label: "Asian Fusion", icon: "ramen-dining" },
                          { key: "budget-friendly", label: "Budget Friendly", icon: "savings" },
                          { key: "meal-prep", label: "Meal Prep", icon: "kitchen" },
                        ].map(t => {
                          const sel = dayCustomizeTheme === t.key;
                          return (
                            <TouchableOpacity
                              key={t.key}
                              style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: sel ? "rgba(245,158,11,0.20)" : "transparent", borderWidth: 1, borderColor: sel ? "#F59E0B" : "rgba(30,41,59,0.6)" }}
                              onPress={() => setDayCustomizeTheme(sel ? "" : t.key)}
                            >
                              <MaterialIcons name={t.icon as any} size={12} color={sel ? "#F59E0B" : MMUTED} />
                              <Text style={{ color: sel ? "#F59E0B" : MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{t.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <TextInput
                        style={{ backgroundColor: MSURFACE2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: MFG, fontFamily: "DMSans_400Regular", fontSize: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}
                        placeholder="Or type a custom theme (e.g., 'Italian night')..."
                        placeholderTextColor={MMUTED}
                        value={dayCustomizeTheme.startsWith("custom:") ? dayCustomizeTheme.slice(7) : (!["high-protein","low-carb","comfort-food","quick-meals","mediterranean","asian-fusion","budget-friendly","meal-prep"].includes(dayCustomizeTheme) && dayCustomizeTheme ? dayCustomizeTheme : "")}
                        onChangeText={(text) => setDayCustomizeTheme(text)}
                        returnKeyType="done"
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: "rgba(100,116,139,0.15)", borderRadius: 12, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: "rgba(100,116,139,0.20)" }}
                          onPress={() => { handleRegenerateDay(); }}
                          disabled={regeneratingDay}
                        >
                          {regeneratingDay && !dayCustomizeTheme ? <ActivityIndicator color={MMUTED} size="small" /> : <Text style={{ color: MMUTED, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Shuffle Day</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: dayCustomizeTheme ? "#F59E0B" : "rgba(245,158,11,0.30)", borderRadius: 12, paddingVertical: 11, alignItems: "center", opacity: regeneratingDay ? 0.7 : 1 }}
                          onPress={() => { handleRegenerateDay(dayCustomizeTheme); }}
                          disabled={regeneratingDay || !dayCustomizeTheme}
                        >
                          {regeneratingDay && dayCustomizeTheme ? <ActivityIndicator color={MBG} size="small" /> : <Text style={{ color: dayCustomizeTheme ? MBG : MMUTED, fontFamily: "DMSans_700Bold", fontSize: 12 }}>Apply Theme</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {/* Macro summary for selected day */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      { label: "Calories", value: selectedDayDayCals.calories, unit: "kcal", color: "#FBBF24" },
                      { label: "Protein", value: selectedDayDayCals.protein, unit: "g", color: "#3B82F6" },
                      { label: "Carbs", value: selectedDayDayCals.carbs, unit: "g", color: "#FDE68A" },
                      { label: "Fat", value: selectedDayDayCals.fat, unit: "g", color: "#FBBF24" },
                    ].map(m => (
                      <View key={m.label} style={{ flex: 1, backgroundColor: MSURFACE, borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: m.color + "30" }}>
                        <Text style={{ color: m.color, fontFamily: "SpaceMono_700Bold", fontSize: 14 }}>{Math.round(m.value)}</Text>
                        <Text style={{ color: MMUTED, fontSize: 9, marginTop: 1 }}>{m.unit}</Text>
                        <Text style={{ color: MMUTED, fontSize: 9, marginTop: 1 }}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Calorie target comparison */}
                  {dailyCalorieTarget > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Math.abs(selectedDayDayCals.calories - dailyCalorieTarget) < 100 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: Math.abs(selectedDayDayCals.calories - dailyCalorieTarget) < 100 ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)" }}>
                      <MaterialIcons name={Math.abs(selectedDayDayCals.calories - dailyCalorieTarget) < 100 ? "check-circle" : "info"} size={14} color={Math.abs(selectedDayDayCals.calories - dailyCalorieTarget) < 100 ? "#22C55E" : "#F59E0B"} />
                      <Text style={{ color: MMUTED, fontSize: 11 }}>{Math.round(selectedDayDayCals.calories)} / {dailyCalorieTarget} kcal target ({selectedDayDayCals.calories >= dailyCalorieTarget ? "+" : ""}{Math.round(selectedDayDayCals.calories - dailyCalorieTarget)})</Text>
                    </View>
                  )}
                  {/* Meal cards for selected day */}
                  {selectedDayData.meals?.map((meal: any, i: number) => {
                    const dayIdx = aiMealPlan.days?.findIndex((d: any) => d.day?.toLowerCase().includes(WEEK_DAYS_FULL[selectedWeekDay].toLowerCase())) ?? 0;
                    const pinKey = `${dayIdx}-${i}`;
                    return (
                      <MealPlanMealCard
                        key={i}
                        meal={meal}
                        onSwap={() => handleMealPlanSwap(meal, dayIdx, i)}
                        isFav={isFavourite(mealPrefs, meal.name)}
                        rating={getMealRating(mealPrefs, meal.name)}
                        isPinned={!!pinnedMeals[pinKey]}
                        onTogglePin={async () => {
                          const updated = await togglePinnedMeal(pinKey, meal);
                          setPinnedMeals(updated);
                          if (Platform.OS !== "web") { try { const H = require("expo-haptics"); H.impactAsync(H.ImpactFeedbackStyle.Medium); } catch {} }
                        }}
                        onToggleFav={async () => {
                          const updated = await toggleFavourite(meal.name);
                          setMealPrefs(updated);
                          if (Platform.OS !== "web") { try { const H = require("expo-haptics"); H.impactAsync(H.ImpactFeedbackStyle.Light); } catch {} }
                        }}
                        onRate={async (stars: number) => {
                          const updated = await rateMeal(meal.name, stars);
                          setMealPrefs(updated);
                          if (Platform.OS !== "web") { try { const H = require("expo-haptics"); H.notificationAsync(H.NotificationFeedbackType.Success); } catch {} }
                        }}
                        onDislike={() => handleMealPlanSwap(meal, dayIdx, i, true)}
                      />
                    );
                  })}
                </View>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <MaterialIcons name="event-busy" size={36} color={MMUTED} />
                  <Text style={{ color: MMUTED, fontSize: 13, marginTop: 8 }}>No meals planned for {WEEK_DAYS_FULL[selectedWeekDay]}</Text>
                </View>
              )}

              {/* Pinned meals info */}
              {Object.keys(pinnedMeals).length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(34,197,94,0.06)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)", marginTop: 8 }}>
                  <MaterialIcons name="push-pin" size={14} color="#22C55E" />
                  <Text style={{ color: MMUTED, fontSize: 11, flex: 1 }}>
                    <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold" }}>{Object.keys(pinnedMeals).length}</Text> pinned meal{Object.keys(pinnedMeals).length > 1 ? "s" : ""} will be preserved when you regenerate.
                  </Text>
                </View>
              )}
              {/* Regenerate Buttons at Bottom */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)", opacity: regenerating ? 0.7 : 1 }}
                  onPress={() => {
                    const pinnedCount = Object.keys(pinnedMeals).length;
                    const msg = pinnedCount > 0
                      ? `This will replace your current weekly meal plan. ${pinnedCount} pinned meal${pinnedCount > 1 ? "s" : ""} will be preserved.`
                      : "This will replace your current weekly meal plan.";
                    Alert.alert("Regenerate Meal Plan?", msg, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Regenerate", style: "destructive", onPress: () => {
                        setMealPlanMode("generic");
                        setRegenerating(true);
                        regenerateMealPlan.mutate(getMealPlanMutateParams("generic"));
                      }},
                    ]);
                  }}
                  disabled={regenerating}
                >
                  {regenerating && mealPlanMode === "generic" ? <ActivityIndicator color="#F59E0B" size="small" /> : <MaterialIcons name="auto-awesome" size={14} color="#F59E0B" />}
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 12 }}>{regenerating && mealPlanMode === "generic" ? "Generating..." : "New Plan"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.18)", opacity: (regenerating || pantryItems.length === 0) ? 0.5 : 1 }}
                  onPress={() => {
                    Alert.alert("Generate from Pantry?", `Use your ${pantryItems.length} pantry items to create a weekly meal plan.`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Generate", onPress: () => {
                        setMealPlanMode("pantry");
                        setRegenerating(true);
                        regenerateMealPlan.mutate({
                          ...getMealPlanMutateParams("pantry"),
                          favouriteFoods: pantryItems.slice(0, 30).map(p => ({ name: p.name, calories: 0, protein: 0, carbs: 0, fat: 0 })),
                        });
                      }},
                    ]);
                  }}
                  disabled={regenerating || pantryItems.length === 0}
                >
                  {regenerating && mealPlanMode === "pantry" ? <ActivityIndicator color="#22C55E" size="small" /> : <MaterialIcons name="kitchen" size={14} color="#22C55E" />}
                  <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 12 }}>{regenerating && mealPlanMode === "pantry" ? "Generating..." : "From Pantry"}</Text>
                </TouchableOpacity>
              </View>

              {/* Grocery Shopping List Button */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 14, paddingVertical: 12, marginTop: 4, borderWidth: 1, borderColor: "rgba(59,130,246,0.18)" }}
                onPress={() => { setShowGroceryList(!showGroceryList); setGroceryChecked({}); }}
              >
                <MaterialIcons name="shopping-cart" size={16} color="#3B82F6" />
                <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 12 }}>{showGroceryList ? "Hide Grocery List" : "View Grocery List"}</Text>
              </TouchableOpacity>

              {/* Grocery Shopping List */}
              {showGroceryList && (() => {
                const groceryCategories = extractGroceryList(aiMealPlan);
                const totalItems = groceryCategories.reduce((s, c) => s + c.items.length, 0);
                const checkedCount = Object.values(groceryChecked).filter(Boolean).length;
                return (
                  <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)", gap: 12, marginTop: 4 }}>
                    {/* Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <MaterialIcons name="shopping-cart" size={18} color="#3B82F6" />
                        <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Grocery List</Text>
                        <View style={{ backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 10 }}>{checkedCount}/{totalItems}</Text>
                        </View>
                      </View>
                    </View>
                    {/* Progress bar */}
                    <View style={{ height: 4, backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 2, overflow: "hidden" }}>
                      <View style={{ height: 4, backgroundColor: "#3B82F6", borderRadius: 2, width: totalItems > 0 ? `${(checkedCount / totalItems) * 100}%` : "0%" }} />
                    </View>
                    {/* Categories */}
                    {groceryCategories.map(cat => (
                      <View key={cat.name} style={{ gap: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                          <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{cat.name}</Text>
                          <Text style={{ color: MMUTED, fontSize: 10 }}>({cat.items.length})</Text>
                        </View>
                        {cat.items.map(item => {
                          const key = `${cat.name}:${item.name}`;
                          const checked = groceryChecked[key] ?? false;
                          return (
                            <TouchableOpacity
                              key={key}
                              style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: checked ? "rgba(34,197,94,0.06)" : "transparent" }}
                              onPress={() => setGroceryChecked(prev => ({ ...prev, [key]: !checked }))}
                            >
                              <MaterialIcons name={checked ? "check-box" : "check-box-outline-blank"} size={18} color={checked ? "#22C55E" : MMUTED} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: checked ? MMUTED : MFG, fontFamily: "DMSans_400Regular", fontSize: 13, textDecorationLine: checked ? "line-through" : "none" }}>{item.name}</Text>
                                <Text style={{ color: MMUTED, fontSize: 9 }}>{item.days.length === 7 ? "All week" : item.days.join(", ")}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                    {/* Export buttons */}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.18)" }}
                        onPress={() => copyGroceryList(groceryCategories)}
                      >
                        <MaterialIcons name="content-copy" size={14} color="#3B82F6" />
                        <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 11 }}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.18)" }}
                        onPress={() => shareGroceryList(groceryCategories)}
                      >
                        <MaterialIcons name="share" size={14} color="#3B82F6" />
                        <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 11 }}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#3B82F6", borderRadius: 10, paddingVertical: 10 }}
                        onPress={() => exportGroceryPdf(groceryCategories)}
                      >
                        <MaterialIcons name="picture-as-pdf" size={14} color="#fff" />
                        <Text style={{ color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 11 }}>PDF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
            </View>
          )}
        </ScrollView>
      )}

      {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pantry Tab ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
      {nutritionTab === 2 && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={MGOLD}
              colors={[MGOLD]}
              progressBackgroundColor={MSURFACE}
            />
          }
        >
          {/* Pantry Stats */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <View style={{ flex: 1, backgroundColor: MSURFACE, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
              <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold" }}>ITEMS</Text>
              <Text style={{ color: "#FDE68A", fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>{pantryItems.length}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: MSURFACE, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
              <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold" }}>CATEGORIES</Text>
              <Text style={{ color: "#FDE68A", fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>{pantryNonEmptyCategories.length}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: pantryExpiringItems.length > 0 ? "rgba(239,68,68,0.08)" : MSURFACE, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: pantryExpiringItems.length > 0 ? "rgba(239,68,68,0.20)" : "rgba(245,158,11,0.10)" }}>
              <Text style={{ color: pantryExpiringItems.length > 0 ? "#EF4444" : MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold" }}>EXPIRING</Text>
              <Text style={{ color: pantryExpiringItems.length > 0 ? "#F87171" : "#FDE68A", fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>{pantryExpiringItems.length}</Text>
            </View>
          </View>

          {/* Expiring Soon Banner */}
          {pantryExpiringItems.length > 0 && (
            <View style={{ marginTop: 16, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(239,68,68,0.20)", overflow: "hidden" }}>
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="warning" size={18} color="#EF4444" />
                    <Text style={{ color: "#F87171", fontFamily: "DMSans_700Bold", fontSize: 14 }}>Expiring Soon</Text>
                    <View style={{ backgroundColor: "rgba(239,68,68,0.20)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: "#EF4444", fontFamily: "DMSans_700Bold", fontSize: 10 }}>{pantryExpiringItems.length}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleUseItUpSuggestions}
                    disabled={generatingExpiryMeals}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
                  >
                    <MaterialIcons name="restaurant" size={14} color="#F87171" />
                    <Text style={{ color: "#F87171", fontFamily: "DMSans_700Bold", fontSize: 11 }}>{generatingExpiryMeals ? "Loading..." : "Use It Up"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {pantryExpiringItems.map((item, idx) => {
                    const now = new Date();
                    const exp = item.expiresAt ? new Date(item.expiresAt) : null;
                    const daysLeft = exp ? Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 99;
                    const urgencyColor = daysLeft <= 0 ? "#EF4444" : daysLeft === 1 ? "#F59E0B" : "#FBBF24";
                    return (
                      <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(239,68,68,0.10)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: urgencyColor }} />
                        <Text style={{ color: MFG, fontFamily: "DMSans_500Medium", fontSize: 12 }}>{item.name}</Text>
                        <Text style={{ color: urgencyColor, fontFamily: "DMSans_700Bold", fontSize: 10 }}>
                          {daysLeft <= 0 ? "Today!" : daysLeft === 1 ? "1d" : `${daysLeft}d`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Use It Up Meal Suggestions */}
              {showExpiryMeals && (
                <View style={{ borderTopWidth: 1, borderTopColor: "rgba(239,68,68,0.15)", padding: 14 }}>
                  {generatingExpiryMeals ? (
                    <View style={{ alignItems: "center", paddingVertical: 16 }}>
                      <ActivityIndicator color="#F87171" />
                      <Text style={{ color: MMUTED, fontFamily: "DMSans_500Medium", fontSize: 12, marginTop: 8 }}>Finding meals to use expiring items...</Text>
                    </View>
                  ) : expiryMealSuggestions.length > 0 ? (
                    <View style={{ gap: 10 }}>
                      <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Suggested Meals to Use Expiring Items</Text>
                      {expiryMealSuggestions.slice(0, 3).map((meal: any, idx: number) => (
                        <View key={idx} style={{ backgroundColor: MSURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                          <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{meal.name}</Text>
                          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                            <Text style={{ color: "#FBBF24", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{meal.calories ?? "~"} kcal</Text>
                            <Text style={{ color: "#3B82F6", fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>{meal.protein ?? "~"}g protein</Text>
                            {meal.prepTime && <Text style={{ color: MMUTED, fontFamily: "DMSans_500Medium", fontSize: 11 }}>{meal.prepTime}</Text>}
                          </View>
                          {meal.usesExpiring && (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                              {(Array.isArray(meal.usesExpiring) ? meal.usesExpiring : []).map((ing: string, i: number) => (
                                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(239,68,68,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <MaterialIcons name="timer" size={10} color="#F87171" />
                                  <Text style={{ color: "#F87171", fontFamily: "DMSans_600SemiBold", fontSize: 10 }}>{ing}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              if (addMeal) {
                                addMeal({ name: meal.name, mealType: "lunch", calories: meal.calories ?? 0, protein: meal.protein ?? 0, carbs: meal.carbs ?? 0, fat: meal.fat ?? 0 });
                                Alert.alert("\u2705 Logged!", `${meal.name} added to your food diary.`);
                              }
                            }}
                            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 8, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingVertical: 6 }}
                          >
                            <MaterialIcons name="add-circle-outline" size={14} color="#F59E0B" />
                            <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 11 }}>Log This Meal</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity onPress={() => setShowExpiryMeals(false)} style={{ alignItems: "center", paddingVertical: 6 }}>
                        <Text style={{ color: MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 11 }}>Hide Suggestions</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={{ color: MMUTED, fontFamily: "DMSans_500Medium", fontSize: 12, textAlign: "center" }}>No suggestions available. Try adding more items to your pantry.</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Scan Options */}
          <View style={{ marginTop: 16, gap: 8 }}>
            <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 16, marginBottom: 4 }}>Add to Pantry</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.push("/pantry" as any)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
              >
                <MaterialIcons name="photo-camera" size={18} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Scan Pantry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/scan-receipt" as any)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
              >
                <MaterialIcons name="receipt-long" size={18} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Scan Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/barcode-scanner" as any)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}
              >
                <MaterialIcons name="qr-code-scanner" size={18} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>Barcode</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Add Common Items */}
          {pantryAddMode ? (
            <View style={{ marginTop: 16, backgroundColor: MSURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>Add Item</Text>
                <TouchableOpacity onPress={() => setPantryAddMode(false)}>
                  <MaterialIcons name="close" size={20} color={MMUTED} />
                </TouchableOpacity>
              </View>
              <TextInput
                value={newPantryItemName}
                onChangeText={setNewPantryItemName}
                placeholder="Item name (e.g. Chicken Breast)"
                placeholderTextColor={MMUTED}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (newPantryItemName.trim()) {
                    handleQuickAddPantryItem(newPantryItemName.trim(), newPantryItemCategory);
                    setNewPantryItemName("");
                  }
                }}
                style={{ backgroundColor: MBG, borderRadius: 10, padding: 12, color: MFG, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                {PANTRY_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewPantryItemCategory(cat)}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: newPantryItemCategory === cat ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.04)", borderWidth: 1, borderColor: newPantryItemCategory === cat ? "rgba(245,158,11,0.30)" : "rgba(245,158,11,0.08)" }}
                  >
                    <Text style={{ color: newPantryItemCategory === cat ? "#F59E0B" : MMUTED, fontSize: 11, fontFamily: "DMSans_600SemiBold" }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* Expiry date input */}
              <View style={{ marginBottom: 10 }}>
                <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_600SemiBold", marginBottom: 4 }}>EXPIRY DATE (optional)</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    value={newPantryItemExpiry}
                    onChangeText={setNewPantryItemExpiry}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={MMUTED}
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="done"
                    style={{ flex: 1, backgroundColor: MBG, borderRadius: 10, padding: 12, color: MFG, fontSize: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                  />
                  <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                    <Text style={{ color: MMUTED, fontSize: 10 }}>Default: {(() => { const SHELF: Record<string, number> = { "Proteins": 3, "Dairy": 7, "Grains & Carbs": 90, "Vegetables": 5, "Fruits": 5, "Condiments & Spices": 180, "Oils & Fats": 180, "Beverages": 30, "Other": 30 }; return SHELF[newPantryItemCategory] ?? 30; })()}d</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (newPantryItemName.trim()) {
                    handleQuickAddPantryItem(newPantryItemName.trim(), newPantryItemCategory, newPantryItemExpiry || undefined);
                    setNewPantryItemName("");
                    setNewPantryItemExpiry("");
                  }
                }}
                style={{ backgroundColor: "#F59E0B", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
              >
                <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Add to Pantry</Text>
              </TouchableOpacity>
              {/* Quick add suggestions */}
              <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_600SemiBold", marginTop: 12, marginBottom: 6 }}>QUICK ADD</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {COMMON_PANTRY_ITEMS.filter(ci => !pantryItems.some(p => p.name.toLowerCase() === ci.name.toLowerCase())).slice(0, 12).map(ci => (
                  <TouchableOpacity
                    key={ci.name}
                    onPress={() => handleQuickAddPantryItem(ci.name, ci.category)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(245,158,11,0.06)", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                  >
                    <MaterialIcons name="add" size={14} color="#F59E0B" />
                    <Text style={{ color: "#FDE68A", fontSize: 11 }}>{ci.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setPantryAddMode(true)}
              style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: MSURFACE, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
            >
              <MaterialIcons name="add-circle-outline" size={18} color="#F59E0B" />
              <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>Add Items Manually</Text>
            </TouchableOpacity>
          )}

          {/* Current Inventory */}
          {pantryItems.length > 0 && (
            <View style={{ marginTop: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 16 }}>Current Inventory</Text>
                <TouchableOpacity onPress={() => router.push("/pantry" as any)}>
                  <Text style={{ color: "#F59E0B", fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>View All</Text>
                </TouchableOpacity>
              </View>
              {pantryNonEmptyCategories.map(cat => (
                <View key={cat} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name={PANTRY_CATEGORY_ICONS[cat] as any} size={16} color="#F59E0B" />
                    <Text style={{ color: "#FDE68A", fontFamily: "DMSans_700Bold", fontSize: 13 }}>{cat}</Text>
                    <Text style={{ color: MMUTED, fontSize: 11 }}>({pantryGrouped[cat]?.length})</Text>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 22 }}>
                    {pantryGrouped[cat]?.map((item: PantryItem) => (
                      <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(245,158,11,0.08)" }}>
                        <Text style={{ color: MFG, fontSize: 12 }}>{item.name}</Text>
                        <TouchableOpacity onPress={() => removePantryItem(item.id)}>
                          <MaterialIcons name="close" size={14} color={MMUTED} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Empty state */}
          {pantryItems.length === 0 && (
            <View style={{ marginTop: 32, alignItems: "center", gap: 12 }}>
              <MaterialIcons name="kitchen" size={48} color={MMUTED} />
              <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 18 }}>Your Pantry is Empty</Text>
              <Text style={{ color: MMUTED, fontSize: 13, textAlign: "center", maxWidth: 280 }}>
                Scan your pantry, a receipt, or barcodes to add items. Then generate a meal plan from what you have.
              </Text>
            </View>
          )}

          {/* Generate Meal Plan from Pantry */}
          {pantryItems.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <TouchableOpacity
                onPress={handleGeneratePantryDailyPlan}
                disabled={generatingPantryPlan}
                style={{ backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: generatingPantryPlan ? 0.6 : 1 }}
              >
                {generatingPantryPlan ? (
                  <ActivityIndicator size="small" color={MBG} />
                ) : (
                  <MaterialIcons name="auto-awesome" size={20} color={MBG} />
                )}
                <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>
                  {generatingPantryPlan ? "Generating Plan..." : "Generate Daily Plan from Pantry"}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: MMUTED, fontSize: 11, textAlign: "center", marginTop: 6 }}>
                AI will create breakfast, lunch, dinner & snack using your pantry items
              </Text>
            </View>
          )}

          {/* Pantry Daily Plan Results */}
          {pantryDailyPlan?.dailyPlan && (
            <View style={{ marginTop: 20, gap: 12 }}>
              {/* Plan Summary */}
              <View style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
                <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 16, marginBottom: 10 }}>Daily Plan Summary</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#F59E0B", fontFamily: "BebasNeue_400Regular", fontSize: 20 }}>{pantryDailyPlan.dailyPlan.totalCalories ?? 0}</Text>
                    <Text style={{ color: MMUTED, fontSize: 10 }}>kcal</Text>
                    <Text style={{ color: MMUTED, fontSize: 9 }}>/ {calorieGoal || 2000}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#3B82F6", fontFamily: "BebasNeue_400Regular", fontSize: 20 }}>{pantryDailyPlan.dailyPlan.totalProtein ?? 0}g</Text>
                    <Text style={{ color: MMUTED, fontSize: 10 }}>Protein</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#FDE68A", fontFamily: "BebasNeue_400Regular", fontSize: 20 }}>{pantryDailyPlan.dailyPlan.totalCarbs ?? 0}g</Text>
                    <Text style={{ color: MMUTED, fontSize: 10 }}>Carbs</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#FBBF24", fontFamily: "BebasNeue_400Regular", fontSize: 20 }}>{pantryDailyPlan.dailyPlan.totalFat ?? 0}g</Text>
                    <Text style={{ color: MMUTED, fontSize: 10 }}>Fat</Text>
                  </View>
                </View>
              </View>

              {/* Ingredient Breakdown */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: "rgba(34,197,94,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
                    <MaterialIcons name="check-circle" size={14} color="#22C55E" />
                    <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 11 }}>FROM PANTRY</Text>
                  </View>
                  {(pantryDailyPlan.dailyPlan.pantryItemsUsed ?? []).map((item: string, i: number) => (
                    <Text key={i} style={{ color: "#4ADE80", fontSize: 11, marginLeft: 18, lineHeight: 16 }}>{item}</Text>
                  ))}
                  {(pantryDailyPlan.dailyPlan.pantryItemsUsed ?? []).length === 0 && (
                    <Text style={{ color: MMUTED, fontSize: 11, marginLeft: 18 }}>None</Text>
                  )}
                </View>
                <View style={{ flex: 1, backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
                    <MaterialIcons name="shopping-cart" size={14} color="#F59E0B" />
                    <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 11 }}>NEED TO BUY</Text>
                  </View>
                  {(pantryDailyPlan.dailyPlan.additionalItemsNeeded ?? []).map((item: string, i: number) => (
                    <Text key={i} style={{ color: "#FDE68A", fontSize: 11, marginLeft: 18, lineHeight: 16 }}>{item}</Text>
                  ))}
                  {(pantryDailyPlan.dailyPlan.additionalItemsNeeded ?? []).length === 0 && (
                    <Text style={{ color: MMUTED, fontSize: 11, marginLeft: 18 }}>Nothing extra needed!</Text>
                  )}
                </View>
              </View>

              {/* Meal Cards */}
              {(pantryDailyPlan.dailyPlan.meals ?? []).map((meal: any, idx: number) => {
                const isExpanded = expandedPantryMeal === idx;
                const mealTypeIcon = meal.mealType === "breakfast" ? "free-breakfast" : meal.mealType === "lunch" ? "lunch-dining" : meal.mealType === "dinner" ? "dinner-dining" : "cookie";
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setExpandedPantryMeal(isExpanded ? null : idx)}
                    activeOpacity={0.8}
                    style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isExpanded ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.08)" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name={mealTypeIcon as any} size={20} color="#F59E0B" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold", textTransform: "uppercase", letterSpacing: 0.5 }}>{meal.mealType}</Text>
                        <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{meal.name}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ color: "#F59E0B", fontFamily: "BebasNeue_400Regular", fontSize: 18 }}>{meal.calories}</Text>
                        <Text style={{ color: MMUTED, fontSize: 9 }}>kcal</Text>
                      </View>
                      <MaterialIcons name={isExpanded ? "expand-less" : "expand-more"} size={20} color={MMUTED} />
                    </View>

                    {/* Macro bar */}
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                      <Text style={{ color: "#3B82F6", fontSize: 11 }}>P: {meal.protein}g</Text>
                      <Text style={{ color: "#FDE68A", fontSize: 11 }}>C: {meal.carbs}g</Text>
                      <Text style={{ color: "#FBBF24", fontSize: 11 }}>F: {meal.fat}g</Text>
                      {meal.prepTime && <Text style={{ color: MMUTED, fontSize: 11 }}>{meal.prepTime}</Text>}
                          {meal.cookTime && <Text style={{ color: MMUTED, fontSize: 11 }}>{meal.cookTime} cook</Text>}
                          {meal.servingSize && <Text style={{ color: MMUTED, fontSize: 11 }}>{meal.servingSize}</Text>}
                    </View>

                    {isExpanded && (
                      <View style={{ marginTop: 12, gap: 10 }}>
                        {meal.description && (
                          <Text style={{ color: MMUTED, fontSize: 12, fontStyle: "italic" }}>{meal.description}</Text>
                        )}
                        {/* Ingredients with pantry/buy indicators */}
                        {meal.ingredients?.length > 0 && (
                          <View style={{ gap: 4 }}>
                            <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 1 }}>INGREDIENTS</Text>
                            {meal.ingredients.map((ing: any, i: number) => (
                              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <MaterialIcons
                                  name={ing.fromPantry ? "check-circle" : "shopping-cart"}
                                  size={14}
                                  color={ing.fromPantry ? "#22C55E" : "#F59E0B"}
                                />
                                <Text style={{ color: ing.fromPantry ? "#4ADE80" : "#FDE68A", fontSize: 12 }}>
                                  {ing.name}{ing.quantity ? ` ÃÂ¢ÃÂÃÂ ${ing.quantity}` : ""}
                                </Text>
                                <Text style={{ color: MMUTED, fontSize: 10 }}>
                                  {ing.fromPantry ? "(pantry)" : "(buy)"}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {/* Instructions */}
                        {meal.instructions?.length > 0 && (
                          <View style={{ gap: 6 }}>
                            <Text style={{ color: MMUTED, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 1 }}>INSTRUCTIONS</Text>
                            {meal.instructions.map((step: string, i: number) => (
                              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                                  <Text style={{ color: MBG, fontSize: 10, fontFamily: "DMSans_700Bold" }}>{i + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                          <Text style={{ color: MFG, fontSize: 12, lineHeight: 18 }}>{(() => { const m = step.match(/\(([\d]+(?:\s*-\s*[\d]+)?\s*(?:min|sec|hours?|hrs?|minutes?|seconds?))\)\s*$/i); return m ? step.replace(m[0], '').trim() : step; })()}</Text>
                          {(() => { const m = step.match(/\(([\d]+(?:\s*-\s*[\d]+)?\s*(?:min|sec|hours?|hrs?|minutes?|seconds?))\)\s*$/i); return m ? <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, alignSelf: "flex-start" }}><MaterialIcons name="timer" size={10} color={MGOLD} /><Text style={{ color: MGOLD, fontSize: 10 }}>{m[1]}</Text></View> : null; })()}
                        </View>
                              </View>
                            ))}
                          </View>
                        )}
                        {/* Log meal button with auto-deduct */}
                        <TouchableOpacity
                          onPress={async () => {
                            addMeal({
                              name: meal.name,
                              mealType: meal.mealType || "lunch",
                              calories: meal.calories || 0,
                              protein: meal.protein || 0,
                              carbs: meal.carbs || 0,
                              fat: meal.fat || 0,
                            });
                            // Auto-deduct pantry items
                            const ingredients = meal.ingredients || [];
                            const deducted = await deductPantryItems(ingredients);
                            const deductMsg = deducted.length > 0
                              ? `\n\nPantry updated:\n${deducted.join("\n")}`
                              : "";
                            Alert.alert("Logged!", `${meal.name} (${meal.calories} kcal) added to your meal log.${deductMsg}`);
                          }}
                          style={{ backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10, paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "rgba(34,197,94,0.25)" }}
                        >
                          <MaterialIcons name="add-circle" size={16} color="#22C55E" />
                          <Text style={{ color: "#22C55E", fontFamily: "DMSans_700Bold", fontSize: 12 }}>Log This Meal</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Tips */}
              {pantryDailyPlan.tips && (
                <View style={{ backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", flexDirection: "row", gap: 8 }}>
                  <MaterialIcons name="lightbulb" size={18} color="#F59E0B" style={{ marginTop: 1 }} />
                  <Text style={{ color: "#FDE68A", fontSize: 12, flex: 1, lineHeight: 18 }}>{pantryDailyPlan.tips}</Text>
                </View>
              )}

              {/* Regenerate */}
              <TouchableOpacity
                onPress={handleGeneratePantryDailyPlan}
                disabled={generatingPantryPlan}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: MSURFACE, borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", marginTop: 4 }}
              >
                <MaterialIcons name="refresh" size={16} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 13 }}>{generatingPantryPlan ? "Regenerating..." : "Regenerate Plan"}</Text>
              </TouchableOpacity>
              {/* Create Shopping List Button */}
              <TouchableOpacity
                onPress={handleCreatePantryShoppingList}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(59,130,246,0.10)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(59,130,246,0.20)", marginTop: 4 }}
              >
                <MaterialIcons name="shopping-cart" size={16} color="#3B82F6" />
                <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 13 }}>Create Shopping List</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pantry Shopping List */}
          {showPantryShoppingList && pantryShoppingList.length > 0 && (
            <View style={{ marginTop: 16, backgroundColor: MSURFACE, borderRadius: 16, borderWidth: 1, borderColor: "rgba(59,130,246,0.15)", overflow: "hidden" }}>
              <View style={{ height: 3, backgroundColor: "rgba(59,130,246,0.10)" }}>
                <View style={{ height: 3, backgroundColor: "#3B82F6", width: `${(pantryShoppingList.filter(i => i.checked).length / pantryShoppingList.length) * 100}%` as any, borderRadius: 2 }} />
              </View>
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MaterialIcons name="shopping-cart" size={16} color="#3B82F6" />
                    <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Shopping List</Text>
                    <View style={{ backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 10 }}>{pantryShoppingList.filter(i => i.checked).length}/{pantryShoppingList.length}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity onPress={sharePantryShoppingList}>
                      <Text style={{ color: "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 10 }}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearCheckedPantryShoppingItems}>
                      <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 10 }}>Clear Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowPantryShoppingList(false)}>
                      <Text style={{ color: MMUTED, fontFamily: "DMSans_700Bold", fontSize: 10 }}>Hide</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {pantryShoppingList.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: idx < pantryShoppingList.length - 1 ? 1 : 0, borderBottomColor: "rgba(59,130,246,0.06)", opacity: item.checked ? 0.5 : 1 }}
                    onPress={() => togglePantryShoppingItem(idx)}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: item.checked ? "#3B82F6" : "rgba(59,130,246,0.25)", backgroundColor: item.checked ? "#3B82F6" : "transparent", alignItems: "center", justifyContent: "center" }}>
                      {item.checked && <MaterialIcons name="check" size={13} color={MFG} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: item.checked ? MMUTED : MFG, fontFamily: "DMSans_500Medium", fontSize: 13, textDecorationLine: item.checked ? "line-through" : "none" }}>{item.name}</Text>
                      {item.quantity && <Text style={{ color: MMUTED, fontFamily: "DMSans_500Medium", fontSize: 10 }}>{item.quantity}</Text>}
                    </View>
                    <MaterialIcons name="add" size={16} color="#F59E0B" style={{ opacity: item.checked ? 0 : 0.6 }} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Link to full pantry management */}
          <TouchableOpacity
            onPress={() => router.push("/pantry" as any)}
            style={{ marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: MSURFACE, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
          >
            <MaterialIcons name="kitchen" size={20} color="#F59E0B" />
            <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 14 }}>Full Pantry Management</Text>
            <MaterialIcons name="chevron-right" size={20} color="#F59E0B" />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Meal Plan Swap Alternatives Modal */}
      {swapMealPlanModal && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,5,0,0.88)", justifyContent: "flex-end", zIndex: 999 }}>
          <View style={{ backgroundColor: MBG, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, paddingBottom: 40, maxHeight: "85%", borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(245,158,11,0.25)", alignSelf: "center", marginBottom: 16 }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1.5 }}>SMART SWAP</Text>
                <Text style={{ color: MFG, fontSize: 20, fontFamily: "BebasNeue_400Regular", marginTop: 2 }}>Choose a Replacement</Text>
                <Text style={{ color: MMUTED, fontSize: 11, marginTop: 2 }}>Replacing: {swapMealPlanModal.meal.name} \u00b7 {swapMealPlanModal.meal.calories} kcal</Text>
              </View>
              <TouchableOpacity
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}
                onPress={() => setSwapMealPlanModal(null)}
              >
                <MaterialIcons name="close" size={18} color="#F59E0B" />
              </TouchableOpacity>
            </View>

            {swapMealPlanLoading && (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 15 }}>Finding 3 alternatives...</Text>
                <Text style={{ color: MMUTED, fontSize: 11 }}>Based on your preferences and macro targets</Text>
              </View>
            )}

            {!swapMealPlanLoading && swapMealPlanAlts.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 30, gap: 12 }}>
                <MaterialIcons name="error-outline" size={36} color="#DC2626" />
                <Text style={{ color: "#DC2626", fontFamily: "DMSans_700Bold", fontSize: 14, textAlign: "center" }}>Could not generate alternatives</Text>
                <TouchableOpacity style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }} onPress={() => setSwapMealPlanModal(null)}>
                  <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

            {!swapMealPlanLoading && swapMealPlanAlts.length > 0 && (
              <FlatList
                data={swapMealPlanAlts.slice(0, 3)}
                keyExtractor={(item, i) => item.name + i}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <Text style={{ color: MMUTED, fontSize: 11, marginBottom: 4 }}>Tap a meal to swap it in. Alternatives match your calorie and macro targets.</Text>
                }
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={{ backgroundColor: MSURFACE, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", gap: 8 }}
                    onPress={() => applyMealPlanSwap(item)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 20 }}>{["\ud83c\udf73", "\ud83e\udd57", "\ud83c\udf72"][index] ?? "\ud83c\udf7d\ufe0f"}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 14 }} numberOfLines={1}>{item.name}</Text>
                        {item.description && <Text style={{ color: MMUTED, fontSize: 11, marginTop: 2 }} numberOfLines={2}>{item.description}</Text>}
                      </View>
                      <MaterialIcons name="swap-horiz" size={20} color="#F59E0B" />
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1, backgroundColor: "rgba(251,191,36,0.06)", borderRadius: 8, padding: 6, alignItems: "center" }}>
                        <Text style={{ color: "#FBBF24", fontFamily: "SpaceMono_700Bold", fontSize: 12 }}>{item.calories} kcal</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 8, padding: 6, alignItems: "center" }}>
                        <Text style={{ color: "#3B82F6", fontFamily: "SpaceMono_700Bold", fontSize: 12 }}>P: {item.protein}g</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: "rgba(253,230,138,0.06)", borderRadius: 8, padding: 6, alignItems: "center" }}>
                        <Text style={{ color: "#FDE68A", fontFamily: "SpaceMono_700Bold", fontSize: 12 }}>C: {item.carbs}g</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: "rgba(249,115,22,0.06)", borderRadius: 8, padding: 6, alignItems: "center" }}>
                        <Text style={{ color: "#F97316", fontFamily: "SpaceMono_700Bold", fontSize: 12 }}>F: {item.fat}g</Text>
                      </View>
                    </View>
                    {item.prepTime && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MaterialIcons name="timer" size={12} color={MMUTED} />
                        <Text style={{ color: MMUTED, fontSize: 11 }}>{item.prepTime}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      )}

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
      <Text style={{ color, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>{Math.round(value)}</Text>
      <Text style={{ color: MMUTED, fontSize: 9, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: MMUTED, fontSize: 9 }}>{label}</Text>
      {goal !== undefined && goal > 0 && <Text style={{ color: MMUTED, fontSize: 8 }}>/ {goal}</Text>}
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
      <View style={{ backgroundColor: MBG, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, paddingBottom: 40, maxHeight: "90%", borderWidth: 1, borderColor: "rgba(245,158,11,0.20)" }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(245,158,11,0.25)", alignSelf: "center", marginBottom: 16 }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1.5 }}>AI MEAL SWAP</Text>
            <Text style={{ color: MFG, fontSize: 20, fontFamily: "BebasNeue_400Regular", marginTop: 2 }}>
              Swap {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </Text>
            {mealData && (
              <Text style={{ color: MMUTED, fontSize: 11, marginTop: 2 }}>Replacing: {mealData.name} \u00b7 {mealData.calories} kcal</Text>
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
            <Text style={{ color: "#FBBF24", fontFamily: "DMSans_700Bold", fontSize: 15 }}>Generating alternatives...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={{ alignItems: "center", paddingVertical: 30, paddingHorizontal: 20, gap: 12 }}>
            <MaterialIcons name="error-outline" size={36} color="#DC2626" />
            <Text style={{ color: "#DC2626", fontFamily: "DMSans_700Bold", fontSize: 15, textAlign: "center" }}>{error}</Text>
            <TouchableOpacity style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }} onPress={onClose}>
              <Text style={{ color: MBG, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedItem && !loading && (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }} onPress={() => setSelectedItem(null)}>
              <MaterialIcons name="arrow-back" size={16} color="#F59E0B" />
              <Text style={{ color: "#F59E0B", fontFamily: "DMSans_500Medium", fontSize: 13 }}>Back to alternatives</Text>
            </TouchableOpacity>
            <Text style={{ color: MFG, fontFamily: "BebasNeue_400Regular", fontSize: 20, marginBottom: 4 }}>{selectedItem.name}</Text>
            <Text style={{ color: MMUTED, fontSize: 13, lineHeight: 20, marginBottom: 12 }}>{selectedItem.description}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Calories", value: `${selectedItem.calories} kcal`, color: "#FBBF24" },
                { label: "Protein", value: `${selectedItem.protein}g`, color: "#3B82F6" },
                { label: "Carbs", value: `${selectedItem.carbs}g`, color: "#FDE68A" },
                { label: "Fat", value: `${selectedItem.fat}g`, color: "#F97316" },
              ].map(m => (
                <View key={m.label} style={{ flex: 1, backgroundColor: MSURFACE, borderRadius: 10, padding: 8, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.12)" }}>
                  <Text style={{ color: m.color, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{m.value}</Text>
                  <Text style={{ color: MMUTED, fontSize: 10, marginTop: 2 }}>{m.label}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 8, letterSpacing: 0.5 }}>INGREDIENTS</Text>
            {(selectedItem.ingredients ?? []).map((ing: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Text style={{ color: "#F59E0B", fontSize: 12 }}>\u2022</Text>
                <Text style={{ color: MFG, fontSize: 13, flex: 1, lineHeight: 20 }}>{ing}</Text>
              </View>
            ))}
            <Text style={{ color: "#F59E0B", fontFamily: "DMSans_700Bold", fontSize: 13, marginTop: 14, marginBottom: 8, letterSpacing: 0.5 }}>HOW TO MAKE IT</Text>
            {(selectedItem.instructions ?? []).map((step: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "DMSans_700Bold" }}>{i + 1}</Text>
                </View>
                <Text style={{ color: MFG, fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={{ backgroundColor: "#F59E0B", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 20 }}
              onPress={() => onSelect(selectedItem)}
            >
              <Text style={{ color: MBG, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>Swap to This Meal</Text>
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
                style={{ backgroundColor: MSURFACE, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", flexDirection: "row", alignItems: "center", gap: 12 }}
                onPress={() => setSelectedItem(item)}
              >
                <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.10)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="restaurant" size={22} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 13, marginBottom: 3 }} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ color: "#FBBF24", fontSize: 10, fontFamily: "DMSans_600SemiBold" }}>{item.calories} kcal</Text>
                    <Text style={{ color: "#3B82F6", fontSize: 10 }}>P:{item.protein}g</Text>
                    <Text style={{ color: "#FDE68A", fontSize: 10 }}>C:{item.carbs}g</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={MMUTED} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

function MealPlanDayCard({ day, dayIndex, onMealSwap }: { day: any; dayIndex: number; onMealSwap?: (meal: any, dayIndex: number, mealIndex: number) => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const dayCalories = day.meals?.reduce((s: number, m: any) => s + (m.calories ?? 0), 0) ?? 0;
  return (
    <View style={{ backgroundColor: MSURFACE, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: "rgba(30,41,59,0.6)", overflow: "hidden" }}>
      <TouchableOpacity
        style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.08)", alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="calendar-today" size={16} color="#F59E0B" />
          </View>
          <View>
            <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{day.day}</Text>
            <Text style={{ color: MMUTED, fontSize: 12 }}>{day.meals?.length ?? 0} meals</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#F59E0B", fontFamily: "SpaceMono_700Bold", fontSize: 15 }}>{dayCalories} kcal</Text>
          <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={18} color={MMUTED} style={{ marginTop: 2 }} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
          {day.meals?.map((meal: any, i: number) => (
            <MealPlanMealCard key={i} meal={meal} onSwap={onMealSwap ? () => onMealSwap(meal, dayIndex, i) : undefined} />
          ))}
        </View>
      )}
    </View>
  );
}

function MealPlanMealCard({ meal, onSwap, isFav, rating, onToggleFav, onRate, onDislike, isPinned, onTogglePin }: { meal: any; onSwap?: () => void; isFav?: boolean; rating?: number; onToggleFav?: () => void; onRate?: (stars: number) => void; onDislike?: () => void; isPinned?: boolean; onTogglePin?: () => void }) {
  const [showPrep, setShowPrep] = React.useState(false);
  const [showRating, setShowRating] = React.useState(false);
  const photoUrl = getMealPlanPhotoUrl(meal);
  const mealTypeColor: Record<string, string> = {
    breakfast: "#FBBF24",
    "morning snack": "#FBBF24",
    lunch: "#FDE68A",
    "afternoon snack": "#3B82F6",
    dinner: "#F59E0B",
    snack: "#FBBF24",
    suhoor: "#FBBF24",
    iftar: "#F59E0B",
  };
  const color = mealTypeColor[(meal.type ?? "").toLowerCase()] ?? "#B45309";

  return (
    <View style={{ backgroundColor: MSURFACE, borderRadius: 16, overflow: "hidden", borderWidth: isPinned ? 2 : 1, borderColor: isPinned ? "rgba(34,197,94,0.6)" : "rgba(30,41,59,0.6)" }}>
      <Image
        source={{ uri: photoUrl }}
        style={{ width: "100%", height: 140 }}
        resizeMode="cover"
      />
      {/* Pinned indicator overlay */}
      {isPinned && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140, backgroundColor: "rgba(34,197,94,0.08)" }} />
      )}
      <View style={{ position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 }}>
        <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: MBG, fontSize: 10, fontFamily: "DMSans_700Bold", textTransform: "uppercase" }}>{meal.type ?? "Meal"}</Text>
        </View>
        {isPinned && (
          <View style={{ backgroundColor: "rgba(34,197,94,0.9)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MaterialIcons name="push-pin" size={10} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 9, fontFamily: "DMSans_700Bold" }}>PINNED</Text>
          </View>
        )}
      </View>
      <View style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 6 }}>
        {onSwap && (
          <TouchableOpacity
            style={{ backgroundColor: "rgba(34,211,238,0.85)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 3 }}
            onPress={onSwap}
          >
            <MaterialIcons name="swap-horiz" size={12} color="#0A0E14" />
            <Text style={{ color: "#0A0E14", fontSize: 10, fontFamily: "DMSans_700Bold" }}>Swap</Text>
          </TouchableOpacity>
        )}
        <View style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: "#F59E0B", fontSize: 11, fontFamily: "SpaceMono_700Bold" }}>{meal.calories} kcal</Text>
        </View>
      </View>

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ color: MFG, fontFamily: "DMSans_700Bold", fontSize: 15, flex: 1 }}>{sanitizeMealName(meal.name)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {onTogglePin && (
              <TouchableOpacity onPress={onTogglePin} style={{ padding: 4 }}>
                <MaterialIcons name="push-pin" size={20} color={isPinned ? "#22C55E" : MMUTED} />
              </TouchableOpacity>
            )}
            {onToggleFav && (
              <TouchableOpacity onPress={onToggleFav} style={{ padding: 4 }}>
                <MaterialIcons name={isFav ? "favorite" : "favorite-border"} size={20} color={isFav ? "#EF4444" : MMUTED} />
              </TouchableOpacity>
            )}
            {onRate && (
              <TouchableOpacity onPress={() => setShowRating(!showRating)} style={{ padding: 4 }}>
                <MaterialIcons name="star" size={20} color={rating && rating > 0 ? "#FBBF24" : MMUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Star rating row */}
        {showRating && onRate && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: "rgba(251,191,36,0.06)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(251,191,36,0.15)" }}>
            <Text style={{ color: MMUTED, fontSize: 11, marginRight: 4 }}>Rate:</Text>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => { onRate(star); setShowRating(false); }} style={{ padding: 2 }}>
                <MaterialIcons name={rating && star <= rating ? "star" : "star-border"} size={22} color={rating && star <= rating ? "#FBBF24" : MMUTED} />
              </TouchableOpacity>
            ))}
            {onDislike && (
              <TouchableOpacity onPress={() => { onDislike(); setShowRating(false); }} style={{ marginLeft: 8, padding: 4, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" }}>
                <MaterialIcons name="thumb-down" size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
          <Text style={{ color: "#3B82F6", fontSize: 12 }}>P: {meal.protein}g</Text>
          <Text style={{ color: "#FDE68A", fontSize: 12 }}>C: {meal.carbs}g</Text>
          <Text style={{ color: "#F59E0B", fontSize: 12 }}>F: {meal.fat}g</Text>
          {meal.prepTime && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <MaterialIcons name="timer" size={11} color={MMUTED} />
              <Text style={{ color: MMUTED, fontSize: 12 }}>{meal.prepTime}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: showPrep ? "rgba(34,197,94,0.08)" : MSURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: showPrep ? "rgba(245,158,11,0.18)" : "rgba(30,41,59,0.6)" }}
          onPress={() => setShowPrep(!showPrep)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons name="restaurant" size={16} color={showPrep ? "#F59E0B" : MMUTED} />
            <Text style={{ color: showPrep ? "#F59E0B" : MMUTED, fontFamily: "DMSans_600SemiBold", fontSize: 13 }}>How to Prep This Meal</Text>
          </View>
          <MaterialIcons name={showPrep ? "expand-less" : "expand-more"} size={16} color={MMUTED} />
        </TouchableOpacity>

        {showPrep && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {meal.ingredients?.length > 0 && (
              <View style={{ backgroundColor: MBG, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8 }}>INGREDIENTS</Text>
                {meal.ingredients.map((ing: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FDE68A", marginTop: 5 }} />
                    <Text style={{ color: "#F59E0B", fontSize: 13, flex: 1, lineHeight: 18 }}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}
            {meal.instructions?.length > 0 && (
              <View style={{ backgroundColor: MBG, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: MMUTED, fontSize: 11, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8 }}>PREP STEPS</Text>
                {meal.instructions.map((step: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Text style={{ color: MBG, fontSize: 11, fontFamily: "DMSans_700Bold" }}>{i + 1}</Text>
                    </View>
                    <Text style={{ color: MFG, fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
            {(!meal.ingredients?.length && !meal.instructions?.length) && (
              <View style={{ backgroundColor: MBG, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: MMUTED, fontSize: 13, textAlign: "center" }}>
                  Regenerate your meal plan to get detailed prep instructions for each meal.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default function MealsScreen() {
  return (
    <ErrorBoundary fallbackScreen="Meals">
      <MealsScreenContent />
    </ErrorBoundary>
  );
}
