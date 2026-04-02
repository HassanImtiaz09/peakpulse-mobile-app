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


// NanoBanana design tokens — Meals uses mint/teal accent
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
    // Already canonical?
    const exact = CANONICAL.find(c => c.toLowerCase() === raw);
    if (exact) return { ...d, day: exact };
    // Abbreviation match ("mon", "tue", etc.)
    const abbrMatch = ABBR[raw.slice(0, 3)];
    if (abbrMatch) return { ...d, day: abbrMatch };
    // "Day 1" / "Day 2" pattern
    const dayNumMatch = raw.match(/day\s*(\d+)/);
    if (dayNumMatch) {
      const num = parseInt(dayNumMatch[1], 10);
      if (num >= 1 && num <= 7) return { ...d, day: CANONICAL[num - 1] };
    }
    // Pure number "1".."7"
    const pureNum = parseInt(raw, 10);
    if (pureNum >= 1 && pureNum <= 7) return { ...d, day: CANONICAL[pureNum - 1] };
    // Fallback: assign by index
    return { ...d, day: CANONICAL[idx % 7] };
  });
  // Ensure all 7 days exist — fill missing ones with empty meals
  const daySet = new Set(normalized.map((d: any) => d.day));
  for (const c of CANONICAL) {
    if (!daySet.has(c)) {
      normalized.push({ day: c, meals: [] });
    }
  }
  // Sort in canonical order
  normalized.sort((a: any, b: any) => CANONICAL.indexOf(a.day) - CANONICAL.indexOf(b.day));
  // Client-side deduplication: detect if multiple days have identical meal sets
  const daySignatures = normalized.map((d: any) =>
    (d.meals ?? []).map((m: any) => (m.name ?? "").toLowerCase().trim()).sort().join("|")
  );
  const seenSigs = new Map<string, number>();
  const dayThemes = ["Mediterranean", "Asian", "Latin", "Middle Eastern", "Nordic", "Indian", "American"];
  daySignatures.forEach((sig: string, idx: number) => {
    if (!sig) return; // empty day
    if (seenSigs.has(sig) && normalized[idx].meals?.length > 0) {
      // This day is a duplicate — rename meals to differentiate
      const theme = dayThemes[idx % dayThemes.length];
      normalized[idx].meals = normalized[idx].meals.map((m: any) => ({
        ...m,
        name: `${theme} ${m.name}`,
        photoQuery: `${theme.toLowerCase()} ${m.photoQuery || m.name}`,
        photoUrl: undefined, // Force re-generation of image
      }));
    } else {
      seenSigs.set(sig, idx);
    }
  });
  return { ...plan, days: normalized };
}

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

// Pool of diverse food photos for fallback — each meal gets a unique one based on its name hash
const FOOD_PHOTO_POOL = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80", // colorful salad
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80", // pancakes
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", // steak bowl
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", // green salad
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80", // buddha bowl
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80", // stir fry
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80", // curry
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80", // eggs
  "https://images.unsplash.com/photo-1484723091739-30990106e7c6?w=400&q=80", // breakfast
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80", // dinner plate
  "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80", // snack
  "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80", // fish
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80", // soup
  "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80", // noodles
  "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80", // toast eggs
  "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80", // avocado toast
  "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80", // smoothie bowl
  "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80", // fruit snack
  "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80", // wrap
  "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80", // sandwich
  "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&q=80", // oats
  "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=400&q=80", // dates
  "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80", // banana
  "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=400&q=80", // falafel
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getMealPlanPhotoUrl(meal: any): string {
  if (meal.photoUrl) return meal.photoUrl;
  // Use meal name + type to pick a unique photo from the pool
  const key = `${meal.name ?? ""}|${meal.type ?? ""}`.toLowerCase();
  if (key.length > 1) {
    const idx = hashString(key) % FOOD_PHOTO_POOL.length;
    return FOOD_PHOTO_POOL[idx];
  }
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
type DefaultRecipe = { title: string; time: string; steps: string[]; calories: number; protein: number; carbs: number; fat: number };
const DIET_RECIPES: Record<string, Record<string, DefaultRecipe>> = {
  omnivore: {
    breakfast: { title: "Berry Yogurt Parfait", time: "5 min", steps: ["Add 200g Greek yogurt to a bowl", "Layer with 30g granola", "Top with mixed berries", "Drizzle 1 tsp honey"], calories: 320, protein: 22, carbs: 42, fat: 8 },
    lunch: { title: "Grilled Chicken Quinoa Bowl", time: "25 min", steps: ["Season chicken breast with salt, pepper, garlic", "Grill 6-7 min each side", "Cook quinoa per packet", "Roast vegetables at 200\u00b0C for 20 min", "Assemble and squeeze lemon"], calories: 520, protein: 42, carbs: 48, fat: 14 },
    dinner: { title: "Pan-Seared Salmon & Asparagus", time: "20 min", steps: ["Pat salmon dry and season", "Sear skin-side down 4 min, flip 3 min", "Steam asparagus 4-5 min", "Serve with sweet potato"], calories: 480, protein: 38, carbs: 28, fat: 22 },
    snack: { title: "Protein Snack Board", time: "3 min", steps: ["Portion 30g mixed nuts", "Slice one apple", "Add 2 tbsp almond butter"], calories: 210, protein: 10, carbs: 22, fat: 12 },
  },
  halal: {
    breakfast: { title: "Labneh & Za'atar Flatbread", time: "5 min", steps: ["Spread labneh on warm flatbread", "Drizzle olive oil and sprinkle za'atar", "Add sliced cucumber and tomato", "Serve with olives"], calories: 340, protein: 14, carbs: 38, fat: 16 },
    lunch: { title: "Chicken Shawarma Rice Bowl", time: "25 min", steps: ["Marinate halal chicken in shawarma spices", "Grill or pan-fry until cooked through", "Serve over basmati rice with pickled turnips", "Add garlic sauce and fresh parsley"], calories: 540, protein: 40, carbs: 52, fat: 16 },
    dinner: { title: "Lamb Kofta with Tabbouleh", time: "30 min", steps: ["Mix minced lamb with onion, parsley, cumin", "Shape into kofta and grill 8-10 min", "Prepare tabbouleh with bulgur, tomato, mint", "Serve with hummus"], calories: 490, protein: 36, carbs: 34, fat: 22 },
    snack: { title: "Dates & Almonds", time: "2 min", steps: ["Portion 4 medjool dates", "Pair with 30g almonds", "Optional: drizzle of honey"], calories: 220, protein: 6, carbs: 34, fat: 10 },
  },
  vegan: {
    breakfast: { title: "Overnight Oats with Chia & Berries", time: "5 min", steps: ["Mix 60g oats with 200ml oat milk", "Add 1 tbsp chia seeds", "Refrigerate overnight", "Top with berries and maple syrup"], calories: 310, protein: 10, carbs: 50, fat: 8 },
    lunch: { title: "Tofu & Edamame Buddha Bowl", time: "20 min", steps: ["Press and cube firm tofu, pan-fry with soy sauce", "Cook brown rice", "Steam edamame and broccoli", "Assemble with avocado and sesame dressing"], calories: 510, protein: 28, carbs: 52, fat: 20 },
    dinner: { title: "Chickpea & Spinach Curry", time: "25 min", steps: ["Saut\u00e9 onion, garlic, ginger", "Add curry paste and coconut milk", "Stir in chickpeas and spinach", "Simmer 15 min, serve over rice"], calories: 460, protein: 18, carbs: 56, fat: 18 },
    snack: { title: "Hummus & Veggie Sticks", time: "3 min", steps: ["Portion 60g hummus", "Slice carrots, cucumber, bell pepper", "Optional: add rice cakes"], calories: 190, protein: 8, carbs: 20, fat: 10 },
  },
  vegetarian: {
    breakfast: { title: "Spinach & Feta Omelette", time: "10 min", steps: ["Whisk 3 eggs with salt and pepper", "Saut\u00e9 spinach in olive oil", "Pour eggs over spinach, add crumbled feta", "Fold and serve with wholegrain toast"], calories: 350, protein: 24, carbs: 18, fat: 20 },
    lunch: { title: "Halloumi & Roasted Veg Wrap", time: "20 min", steps: ["Grill halloumi slices until golden", "Roast courgette, peppers, red onion", "Warm a wholegrain wrap", "Assemble with hummus and rocket"], calories: 490, protein: 26, carbs: 42, fat: 24 },
    dinner: { title: "Paneer Tikka with Brown Rice", time: "25 min", steps: ["Marinate paneer in yogurt and tikka spices", "Grill or bake until charred", "Cook brown rice", "Serve with raita and salad"], calories: 480, protein: 28, carbs: 46, fat: 20 },
    snack: { title: "Greek Yogurt with Honey & Walnuts", time: "3 min", steps: ["Add 200g Greek yogurt to a bowl", "Drizzle 1 tsp honey", "Top with 20g walnuts"], calories: 230, protein: 16, carbs: 18, fat: 12 },
  },
  keto: {
    breakfast: { title: "Bacon & Avocado Eggs", time: "10 min", steps: ["Fry 3 rashers of bacon until crispy", "Scramble 3 eggs in the bacon fat", "Slice half an avocado", "Serve together with salt and pepper"], calories: 420, protein: 28, carbs: 4, fat: 34 },
    lunch: { title: "Grilled Chicken Caesar (No Croutons)", time: "15 min", steps: ["Grill seasoned chicken breast", "Toss romaine with parmesan and Caesar dressing", "Slice chicken over salad", "Add boiled egg halves"], calories: 480, protein: 42, carbs: 6, fat: 32 },
    dinner: { title: "Steak with Butter & Green Beans", time: "20 min", steps: ["Season ribeye with salt and pepper", "Pan-sear 4 min each side", "Rest 5 min, top with herb butter", "Saut\u00e9 green beans in garlic butter"], calories: 520, protein: 44, carbs: 8, fat: 36 },
    snack: { title: "Cheese & Olives", time: "2 min", steps: ["Portion 40g cheddar or brie", "Add 8-10 olives", "Optional: celery sticks"], calories: 200, protein: 10, carbs: 2, fat: 18 },
  },
  paleo: {
    breakfast: { title: "Sweet Potato Hash with Eggs", time: "15 min", steps: ["Dice sweet potato and pan-fry until tender", "Add diced onion and bell pepper", "Make 2 wells and crack eggs in", "Cover and cook until eggs set"], calories: 380, protein: 20, carbs: 36, fat: 18 },
    lunch: { title: "Turkey Lettuce Wraps", time: "15 min", steps: ["Cook ground turkey with garlic and ginger", "Add coconut aminos and lime juice", "Spoon into butter lettuce cups", "Top with shredded carrot and fresh herbs"], calories: 420, protein: 36, carbs: 16, fat: 24 },
    dinner: { title: "Herb-Crusted Salmon with Roasted Veg", time: "25 min", steps: ["Season salmon with herbs and lemon", "Roast at 200\u00b0C for 12-15 min", "Toss broccoli and carrots in olive oil", "Roast vegetables alongside salmon"], calories: 460, protein: 38, carbs: 20, fat: 24 },
    snack: { title: "Apple Slices with Almond Butter", time: "3 min", steps: ["Slice one apple", "Pair with 2 tbsp almond butter", "Sprinkle with cinnamon"], calories: 200, protein: 6, carbs: 26, fat: 10 },
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
    // Check if onboarding is complete — only auto-generate after onboarding
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
        // No plan exists — auto-generate
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
      // It's a new week — auto-regenerate the meal plan
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

  // ── AI Meal Image Generation ──────────────────────────────────────────────────
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
      // Silently fail — fallback images will be used
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

  // ── Pantry Expiry Alerts — schedule notifications when items are expiring ──
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

  // ── Generate "Use It Up" meal suggestions for expiring items ──
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

  // ── Pantry Shopping List — compile "need to buy" items from daily plan ──
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
            needToBuy.push({ name: ing.name, quantity: ing.quantity });
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
    const text = `PeakPulse Shopping List\n\n${items.map(i => `\u25a1 ${i.name}${i.quantity ? " — " + i.quantity : ""}`).join("\n")}`;
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
          deducted.push(`${match.name} (qty: ${match.quantity} → ${match.quantity - 1})`);
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
      cuisinePrefs: selectedCuisines.length > 0 ? selectedCuisines : (localProfile?.cuisinePrefs?.length ? localProfile.cuisinePrefs : undefined),
    };
    // Include preference summary so AI learns from user ratings
    if (prefSummary) base.preferenceHint = prefSummary;
    // Include past meal names so AI avoids repeating dishes
    if (pastMealNames.length > 0) base.pastMealNames = pastMealNames;
    return base;
  }, [userGoal, userDietaryPref, ramadanMode, localProfile, selectedCuisines, prefSummary, pastMealNames]);
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

  // 1B: Parallax scroll value for Meals hero — MUST be above early return to avoid hooks ordering violation
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

      {/* Daily Summary Card — compact */}
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

      {/* ── Tab Segmented Control ── */}
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
        {/* ── Log Meal Dropdown Button ── */}
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

        {/* ── Manual Log Panel ── */}
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

        {/* ── AI Scan Panel ── */}
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

        {/* ── Day Meal Tiles (Breakfast, Lunch, Dinner, Snack) ── */}
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

        {/* ── Inline Nutrition Chart (7-day) ── */}
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

        {/* ── Water Intake ── */}
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

        {/* ── Quick Add from Saved Foods ── */}
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

        {/* ── Meal Gallery + Pantry + Favourites Links ── */}
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

        {/* ── Favourites Expanded ── */}
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


        {/* ── Today's Log ── */}
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

      {/* ── Meal Plan Tab ── */}
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

              {/* ── AI Image Generation Progress ── */}
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

              {/* ── Calendar Overview Toggle ── */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: showCalendarOverview ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.08)", borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: showCalendarOverview ? "rgba(245,158,11,0.25)" : "rgba(59,130,246,0.15)" }}
                onPress={() => setShowCalendarOverview(!showCalendarOverview)}
              >
                <MaterialIcons name="calendar-view-week" size={16} color={showCalendarOverview ? "#F59E0B" : "#3B82F6"} />
                <Text style={{ color: showCalendarOverview ? "#F59E0B" : "#3B82F6", fontFamily: "DMSans_700Bold", fontSize: 12 }}>{showCalendarOverview ? "Hide Week Overview" : "Week Overview"}</Text>
              </TouchableOpacity>

              {/* ── Calendar Overview Grid ── */}
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

              {/* ── Weekly Day Selector Bar ── */}
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

              {/* ── Selected Day Meals ── */}
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

      {/* ── Pantry Tab ── */}
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
                                  {ing.name}{ing.quantity ? ` — ${ing.quantity}` : ""}
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
                                <Text style={{ color: MFG, fontSize: 12, flex: 1, lineHeight: 18 }}>{step}</Text>
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
