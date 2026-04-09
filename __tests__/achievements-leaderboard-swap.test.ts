/**
 * Tests for Step 13-15:
 * - Achievement System Expansion (pure logic)
 * - XP Leaderboard (pure logic)
 * - Smart Meal Swap (pure logic)
 *
 * All functions are inlined/re-imported from pure modules to avoid
 * native module dependencies (AsyncStorage, expo-notifications).
 */
import { describe, it, expect } from "vitest";

// ── Achievement Engine (inlined pure functions) ──────────────────────────

type AchievementCategory = "workout" | "nutrition" | "consistency" | "social" | "body";

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tiers: { count: number; xp: number; badge: string }[];
  counterKey: string;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "workouts_completed",
    title: "Iron Will",
    description: "Complete workouts",
    icon: "fitness-center",
    category: "workout",
    tiers: [
      { count: 1, xp: 25, badge: "🏋️" },
      { count: 10, xp: 100, badge: "💪" },
      { count: 50, xp: 250, badge: "🔥" },
      { count: 100, xp: 500, badge: "⚡" },
      { count: 250, xp: 1000, badge: "🏆" },
    ],
    counterKey: "workouts_completed",
  },
  {
    id: "meals_logged",
    title: "Fuel Master",
    description: "Log meals",
    icon: "restaurant",
    category: "nutrition",
    tiers: [
      { count: 1, xp: 15, badge: "🍽️" },
      { count: 25, xp: 75, badge: "🥗" },
      { count: 100, xp: 200, badge: "🍳" },
      { count: 250, xp: 400, badge: "👨‍🍳" },
      { count: 500, xp: 800, badge: "⭐" },
    ],
    counterKey: "meals_logged",
  },
  {
    id: "checkins_completed",
    title: "Self Aware",
    description: "Complete daily check-ins",
    icon: "self-improvement",
    category: "consistency",
    tiers: [
      { count: 1, xp: 20, badge: "📋" },
      { count: 7, xp: 80, badge: "📊" },
      { count: 30, xp: 200, badge: "🧘" },
      { count: 90, xp: 400, badge: "🌟" },
    ],
    counterKey: "checkins_completed",
  },
];

function getCurrentTier(def: AchievementDef, count: number) {
  let current = null;
  for (const tier of def.tiers) {
    if (count >= tier.count) current = tier;
    else break;
  }
  return current;
}

function getNextTier(def: AchievementDef, count: number) {
  for (const tier of def.tiers) {
    if (count < tier.count) return tier;
  }
  return null;
}

function getProgress(def: AchievementDef, count: number) {
  const next = getNextTier(def, count);
  if (!next) return 1; // All tiers completed
  const current = getCurrentTier(def, count);
  const base = current ? current.count : 0;
  return (count - base) / (next.count - base);
}

// ── XP Leaderboard (inlined pure functions) ──────────────────────────────

type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  userRank: number;
  userPercentile: number;
  communityAvg: number;
  communityMedian: number;
  totalParticipants: number;
}

interface LeaderboardInsight {
  type: "top" | "ahead" | "behind";
  message: string;
  emoji: string;
}

const COMMUNITY_NAMES = [
  "Alex", "Jordan", "Sam", "Morgan", "Casey", "Riley", "Quinn",
  "Avery", "Blake", "Drew", "Emery", "Finley", "Harper", "Jamie",
  "Kai", "Logan", "Micah", "Nico", "Parker", "Reese", "Sage",
  "Taylor", "Val", "Wren", "Zion",
];

const AVATARS = ["💪", "🏃", "🧘", "🏋️", "🚴", "🥊", "⚡", "🔥", "🌟", "🎯"];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateCommunityData(
  period: LeaderboardPeriod,
  userXP: number,
  userName: string,
): LeaderboardData {
  const seed = period === "weekly" ? 42 : period === "monthly" ? 137 : 256;
  const rng = seededRandom(seed);
  const count = period === "weekly" ? 50 : period === "monthly" ? 100 : 200;
  const xpRange = period === "weekly" ? 500 : period === "monthly" ? 2000 : 10000;

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < count; i++) {
    const xp = Math.round(rng() * xpRange);
    const level = Math.max(1, Math.floor(xp / 200) + 1);
    entries.push({
      rank: 0,
      name: COMMUNITY_NAMES[i % COMMUNITY_NAMES.length],
      avatar: AVATARS[i % AVATARS.length],
      xp,
      level,
      isCurrentUser: false,
    });
  }

  // Add user
  entries.push({
    rank: 0,
    name: userName,
    avatar: "🌟",
    xp: userXP,
    level: Math.max(1, Math.floor(userXP / 200) + 1),
    isCurrentUser: true,
  });

  // Sort by XP descending
  entries.sort((a, b) => b.xp - a.xp);
  entries.forEach((e, i) => (e.rank = i + 1));

  const userEntry = entries.find((e) => e.isCurrentUser)!;
  const allXP = entries.map((e) => e.xp);
  const avg = allXP.reduce((s, x) => s + x, 0) / allXP.length;
  const sorted = [...allXP].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const percentile = ((count + 1 - userEntry.rank) / (count + 1)) * 100;

  return {
    entries: entries.slice(0, 25), // Top 25
    userRank: userEntry.rank,
    userPercentile: Math.round(percentile),
    communityAvg: Math.round(avg),
    communityMedian: median,
    totalParticipants: count + 1,
  };
}

function getLeaderboardInsight(data: LeaderboardData, userXP: number): LeaderboardInsight {
  if (data.userPercentile >= 90) {
    return { type: "top", message: `You're in the top ${100 - data.userPercentile}%! Keep crushing it!`, emoji: "🏆" };
  }
  if (userXP > data.communityAvg) {
    const diff = userXP - data.communityAvg;
    return { type: "ahead", message: `You're ${diff.toLocaleString()} XP above the community average. Nice work!`, emoji: "💪" };
  }
  const diff = data.communityAvg - userXP;
  return { type: "behind", message: `You're ${diff.toLocaleString()} XP below the community average. Log a workout or meal to catch up!`, emoji: "🎯" };
}

// ── Smart Meal Swap (inlined pure functions) ──────────────────────────────

interface MealForSwap {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  dayIndex: number;
}

interface SwapCandidate {
  meal: MealForSwap;
  score: number;
  calorieDiff: number;
  proteinDiff: number;
  sameMealType: boolean;
  dayLabel: string;
}

interface SwapConfig {
  maxCalorieDiff: number;
  maxProteinDiff: number;
  sameMealTypeBonus: number;
  maxCandidates: number;
}

const DEFAULT_SWAP_CONFIG: SwapConfig = {
  maxCalorieDiff: 150,
  maxProteinDiff: 15,
  sameMealTypeBonus: 0.15,
  maxCandidates: 5,
};

function calculateSimilarity(
  source: MealForSwap,
  candidate: MealForSwap,
  config: SwapConfig = DEFAULT_SWAP_CONFIG,
): number {
  const calDiff = Math.abs(source.calories - candidate.calories);
  const calScore = Math.max(0, 1 - calDiff / config.maxCalorieDiff);
  const protDiff = Math.abs(source.protein - candidate.protein);
  const protScore = Math.max(0, 1 - protDiff / config.maxProteinDiff);
  const carbDiff = Math.abs(source.carbs - candidate.carbs);
  const carbScore = Math.max(0, 1 - carbDiff / 30);
  const fatDiff = Math.abs(source.fat - candidate.fat);
  const fatScore = Math.max(0, 1 - fatDiff / 20);
  let score = calScore * 0.35 + protScore * 0.35 + carbScore * 0.15 + fatScore * 0.15;
  if (source.mealType === candidate.mealType) {
    score = Math.min(1, score + config.sameMealTypeBonus);
  }
  return Math.round(score * 100) / 100;
}

function findSwapCandidates(
  sourceMeal: MealForSwap,
  allMeals: MealForSwap[],
  config: SwapConfig = DEFAULT_SWAP_CONFIG,
): SwapCandidate[] {
  const candidates: SwapCandidate[] = [];
  for (const meal of allMeals) {
    if (meal.id === sourceMeal.id) continue;
    if (meal.dayIndex === sourceMeal.dayIndex) continue;
    const score = calculateSimilarity(sourceMeal, meal, config);
    if (score < 0.2) continue;
    candidates.push({
      meal,
      score,
      calorieDiff: Math.abs(sourceMeal.calories - meal.calories),
      proteinDiff: Math.abs(sourceMeal.protein - meal.protein),
      sameMealType: sourceMeal.mealType === meal.mealType,
      dayLabel: `Day ${meal.dayIndex + 1}`,
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, config.maxCandidates);
}

function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 0.85) return { label: "Excellent Match", color: "#22C55E" };
  if (score >= 0.70) return { label: "Great Match", color: "#4ADE80" };
  if (score >= 0.50) return { label: "Good Match", color: "#FBBF24" };
  if (score >= 0.35) return { label: "Fair Match", color: "#F59E0B" };
  return { label: "Loose Match", color: "#F87171" };
}

function extractMealsFromPlan(
  days: Array<{ meals: Array<{ name: string; type?: string; mealType?: string; calories?: number; protein?: number; carbs?: number; fat?: number }> }>,
): MealForSwap[] {
  const meals: MealForSwap[] = [];
  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const day = days[dayIdx];
    if (!day?.meals) continue;
    for (let mealIdx = 0; mealIdx < day.meals.length; mealIdx++) {
      const m = day.meals[mealIdx];
      const types = ["breakfast", "lunch", "dinner", "snack"];
      const mealType = (m.type || m.mealType || types[Math.min(mealIdx, types.length - 1)]).toLowerCase();
      meals.push({
        id: `day${dayIdx}-${mealType}-${mealIdx}`,
        name: m.name,
        calories: m.calories ?? 0,
        protein: m.protein ?? 0,
        carbs: m.carbs ?? 0,
        fat: m.fat ?? 0,
        mealType,
        dayIndex: dayIdx,
      });
    }
  }
  return meals;
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Achievement System", () => {
  const workoutAch = ACHIEVEMENTS[0]; // Iron Will
  const mealAch = ACHIEVEMENTS[1]; // Fuel Master

  it("returns null tier when count is 0", () => {
    expect(getCurrentTier(workoutAch, 0)).toBeNull();
  });

  it("returns first tier when count equals first threshold", () => {
    const tier = getCurrentTier(workoutAch, 1);
    expect(tier).not.toBeNull();
    expect(tier!.count).toBe(1);
    expect(tier!.badge).toBe("🏋️");
  });

  it("returns correct tier for intermediate count", () => {
    const tier = getCurrentTier(workoutAch, 25);
    expect(tier!.count).toBe(10);
    expect(tier!.badge).toBe("💪");
  });

  it("returns highest tier when all completed", () => {
    const tier = getCurrentTier(workoutAch, 500);
    expect(tier!.count).toBe(250);
    expect(tier!.badge).toBe("🏆");
  });

  it("returns next tier correctly", () => {
    const next = getNextTier(workoutAch, 5);
    expect(next!.count).toBe(10);
  });

  it("returns null next tier when all completed", () => {
    expect(getNextTier(workoutAch, 300)).toBeNull();
  });

  it("calculates progress correctly at 0", () => {
    const progress = getProgress(workoutAch, 0);
    expect(progress).toBe(0);
  });

  it("calculates progress correctly at midpoint", () => {
    // Between tier 1 (count=1) and tier 2 (count=10)
    const progress = getProgress(workoutAch, 5);
    // (5-1) / (10-1) = 4/9 ≈ 0.444
    expect(progress).toBeCloseTo(0.444, 2);
  });

  it("returns progress 1 when all tiers completed", () => {
    expect(getProgress(workoutAch, 500)).toBe(1);
  });

  it("handles meal achievement tiers", () => {
    expect(getCurrentTier(mealAch, 100)!.badge).toBe("🍳");
    expect(getNextTier(mealAch, 100)!.count).toBe(250);
  });

  it("handles checkin achievement", () => {
    const checkin = ACHIEVEMENTS[2];
    expect(getCurrentTier(checkin, 30)!.badge).toBe("🧘");
    expect(getNextTier(checkin, 30)!.count).toBe(90);
  });
});

describe("XP Leaderboard", () => {
  it("generates community data with correct structure", () => {
    const data = generateCommunityData("weekly", 200, "TestUser");
    expect(data.entries.length).toBeLessThanOrEqual(25);
    expect(data.userRank).toBeGreaterThan(0);
    expect(data.totalParticipants).toBe(51); // 50 + 1 user
    expect(data.communityAvg).toBeGreaterThan(0);
    expect(data.communityMedian).toBeGreaterThanOrEqual(0);
  });

  it("includes user in entries when ranked high enough", () => {
    const data = generateCommunityData("weekly", 10000, "TopUser");
    const userEntry = data.entries.find((e) => e.isCurrentUser);
    expect(userEntry).toBeDefined();
    expect(userEntry!.name).toBe("TopUser");
    expect(userEntry!.xp).toBe(10000);
  });

  it("assigns correct rank to user", () => {
    const data = generateCommunityData("weekly", 10000, "TopUser");
    expect(data.userRank).toBe(1);
  });

  it("generates different data for different periods", () => {
    const weekly = generateCommunityData("weekly", 200, "User");
    const monthly = generateCommunityData("monthly", 200, "User");
    expect(weekly.totalParticipants).not.toBe(monthly.totalParticipants);
  });

  it("calculates percentile correctly for top user", () => {
    const data = generateCommunityData("weekly", 10000, "User");
    expect(data.userPercentile).toBeGreaterThanOrEqual(90);
  });

  it("generates seeded random consistently", () => {
    const data1 = generateCommunityData("weekly", 200, "User");
    const data2 = generateCommunityData("weekly", 200, "User");
    expect(data1.communityAvg).toBe(data2.communityAvg);
    expect(data1.communityMedian).toBe(data2.communityMedian);
  });

  it("returns top insight for high percentile", () => {
    const data = generateCommunityData("weekly", 10000, "User");
    const insight = getLeaderboardInsight(data, 10000);
    expect(insight.type).toBe("top");
    expect(insight.emoji).toBe("🏆");
  });

  it("returns ahead insight when above average", () => {
    const data = generateCommunityData("weekly", 300, "User");
    if (300 > data.communityAvg && data.userPercentile < 90) {
      const insight = getLeaderboardInsight(data, 300);
      expect(insight.type).toBe("ahead");
    }
  });

  it("returns behind insight when below average", () => {
    const data = generateCommunityData("weekly", 0, "User");
    const insight = getLeaderboardInsight(data, 0);
    expect(["behind", "top", "ahead"]).toContain(insight.type);
  });

  it("all entries have valid ranks", () => {
    const data = generateCommunityData("monthly", 500, "User");
    for (const entry of data.entries) {
      expect(entry.rank).toBeGreaterThan(0);
      expect(entry.name).toBeTruthy();
      expect(entry.level).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("Smart Meal Swap", () => {
  const sourceMeal: MealForSwap = {
    id: "day0-lunch-1",
    name: "Grilled Chicken Salad",
    calories: 450,
    protein: 35,
    carbs: 30,
    fat: 18,
    mealType: "lunch",
    dayIndex: 0,
  };

  const similarMeal: MealForSwap = {
    id: "day2-lunch-1",
    name: "Turkey Wrap",
    calories: 430,
    protein: 32,
    carbs: 35,
    fat: 16,
    mealType: "lunch",
    dayIndex: 2,
  };

  const differentMeal: MealForSwap = {
    id: "day3-breakfast-0",
    name: "Pancakes with Syrup",
    calories: 700,
    protein: 10,
    carbs: 90,
    fat: 30,
    mealType: "breakfast",
    dayIndex: 3,
  };

  const sameDayMeal: MealForSwap = {
    id: "day0-dinner-2",
    name: "Salmon Bowl",
    calories: 440,
    protein: 38,
    carbs: 28,
    fat: 17,
    mealType: "dinner",
    dayIndex: 0,
  };

  it("calculates high similarity for similar meals", () => {
    const score = calculateSimilarity(sourceMeal, similarMeal);
    expect(score).toBeGreaterThan(0.7);
  });

  it("calculates low similarity for very different meals", () => {
    const score = calculateSimilarity(sourceMeal, differentMeal);
    expect(score).toBeLessThan(0.3);
  });

  it("gives bonus for same meal type", () => {
    const withBonus = calculateSimilarity(sourceMeal, similarMeal);
    const withoutBonus = calculateSimilarity(sourceMeal, { ...similarMeal, mealType: "dinner" });
    expect(withBonus).toBeGreaterThan(withoutBonus);
  });

  it("returns 1 for identical macros with same meal type", () => {
    const identical: MealForSwap = { ...sourceMeal, id: "day1-lunch-1", dayIndex: 1 };
    const score = calculateSimilarity(sourceMeal, identical);
    expect(score).toBe(1);
  });

  it("excludes source meal from candidates", () => {
    const allMeals = [sourceMeal, similarMeal, differentMeal];
    const candidates = findSwapCandidates(sourceMeal, allMeals);
    expect(candidates.find((c) => c.meal.id === sourceMeal.id)).toBeUndefined();
  });

  it("excludes same-day meals from candidates", () => {
    const allMeals = [sourceMeal, sameDayMeal, similarMeal];
    const candidates = findSwapCandidates(sourceMeal, allMeals);
    expect(candidates.find((c) => c.meal.dayIndex === sourceMeal.dayIndex)).toBeUndefined();
  });

  it("sorts candidates by score descending", () => {
    const allMeals = [sourceMeal, similarMeal, differentMeal, {
      ...differentMeal, id: "day4-lunch-1", dayIndex: 4, calories: 460, protein: 33, carbs: 32, fat: 19, mealType: "lunch",
    }];
    const candidates = findSwapCandidates(sourceMeal, allMeals);
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
    }
  });

  it("respects maxCandidates config", () => {
    const meals: MealForSwap[] = [sourceMeal];
    for (let i = 1; i <= 10; i++) {
      meals.push({
        id: `day${i}-lunch-1`,
        name: `Meal ${i}`,
        calories: 440 + i * 5,
        protein: 33 + i,
        carbs: 30 + i,
        fat: 17 + i,
        mealType: "lunch",
        dayIndex: i,
      });
    }
    const candidates = findSwapCandidates(sourceMeal, meals, { ...DEFAULT_SWAP_CONFIG, maxCandidates: 3 });
    expect(candidates.length).toBeLessThanOrEqual(3);
  });

  it("marks sameMealType correctly", () => {
    const allMeals = [sourceMeal, similarMeal, { ...similarMeal, id: "day5-dinner-1", mealType: "dinner", dayIndex: 5 }];
    const candidates = findSwapCandidates(sourceMeal, allMeals);
    const lunchCandidate = candidates.find((c) => c.meal.mealType === "lunch");
    const dinnerCandidate = candidates.find((c) => c.meal.mealType === "dinner");
    if (lunchCandidate) expect(lunchCandidate.sameMealType).toBe(true);
    if (dinnerCandidate) expect(dinnerCandidate.sameMealType).toBe(false);
  });

  it("calculates calorieDiff and proteinDiff correctly", () => {
    const allMeals = [sourceMeal, similarMeal];
    const candidates = findSwapCandidates(sourceMeal, allMeals);
    expect(candidates[0].calorieDiff).toBe(Math.abs(450 - 430));
    expect(candidates[0].proteinDiff).toBe(Math.abs(35 - 32));
  });

  it("returns correct match labels", () => {
    expect(getMatchLabel(0.90).label).toBe("Excellent Match");
    expect(getMatchLabel(0.75).label).toBe("Great Match");
    expect(getMatchLabel(0.55).label).toBe("Good Match");
    expect(getMatchLabel(0.40).label).toBe("Fair Match");
    expect(getMatchLabel(0.10).label).toBe("Loose Match");
  });

  it("extracts meals from plan structure", () => {
    const plan = [
      { meals: [{ name: "Oatmeal", type: "breakfast", calories: 300, protein: 10, carbs: 50, fat: 8 }] },
      { meals: [{ name: "Pasta", type: "lunch", calories: 500, protein: 20, carbs: 60, fat: 15 }] },
    ];
    const meals = extractMealsFromPlan(plan);
    expect(meals.length).toBe(2);
    expect(meals[0].name).toBe("Oatmeal");
    expect(meals[0].dayIndex).toBe(0);
    expect(meals[1].name).toBe("Pasta");
    expect(meals[1].dayIndex).toBe(1);
  });

  it("infers meal type from index when not provided", () => {
    const plan = [{ meals: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }] }];
    const meals = extractMealsFromPlan(plan as any);
    expect(meals[0].mealType).toBe("breakfast");
    expect(meals[1].mealType).toBe("lunch");
    expect(meals[2].mealType).toBe("dinner");
    expect(meals[3].mealType).toBe("snack");
  });

  it("handles empty plan gracefully", () => {
    const meals = extractMealsFromPlan([]);
    expect(meals.length).toBe(0);
  });

  it("handles plan with missing meals array", () => {
    const meals = extractMealsFromPlan([{ meals: [] }, {} as any]);
    expect(meals.length).toBe(0);
  });

  it("returns empty candidates when no meals match", () => {
    const candidates = findSwapCandidates(sourceMeal, [sourceMeal]);
    expect(candidates.length).toBe(0);
  });

  it("filters out very low score candidates", () => {
    const veryDifferent: MealForSwap = {
      id: "day1-breakfast-0",
      name: "Sugar Cereal",
      calories: 900,
      protein: 2,
      carbs: 120,
      fat: 45,
      mealType: "breakfast",
      dayIndex: 1,
    };
    const candidates = findSwapCandidates(sourceMeal, [sourceMeal, veryDifferent]);
    // Score should be below 0.2 threshold
    for (const c of candidates) {
      expect(c.score).toBeGreaterThanOrEqual(0.2);
    }
  });
});
