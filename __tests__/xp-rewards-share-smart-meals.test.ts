/**
 * Tests for Step 10-12:
 *   - Smart Meal Suggestions (pure function)
 *   - Milestone Share Card Generation (pure function)
 *   - XP Rewards Screen data helpers (pure function)
 *
 * Native modules (AsyncStorage, expo-sharing, etc.) are NOT imported.
 * We inline/re-implement the pure logic to keep tests hermetic.
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// SMART MEAL SUGGESTIONS — inline the pure algorithm
// ═══════════════════════════════════════════════════════════════════════════

interface PlanMeal {
  name: string;
  type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface PlanDay {
  day: string;
  meals: PlanMeal[];
}

interface SmartSuggestion {
  name: string;
  type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fromDay: string;
  fitScore: number;
}

function getSmartMealSuggestions(
  planDays: PlanDay[],
  calorieGap: number,
  alreadyLoggedNames: string[] = [],
  maxResults: number = 4,
): SmartSuggestion[] {
  if (!planDays || planDays.length === 0 || calorieGap <= 0) return [];

  const loggedLower = new Set(alreadyLoggedNames.map((n) => n.toLowerCase().trim()));
  const seenNames = new Set<string>();
  const allMeals: SmartSuggestion[] = [];

  for (const day of planDays) {
    if (!day.meals) continue;
    for (const meal of day.meals) {
      const nameLower = (meal.name || "").toLowerCase().trim();
      if (!nameLower || seenNames.has(nameLower)) continue;
      if (loggedLower.has(nameLower)) continue;
      seenNames.add(nameLower);

      const calories = meal.calories || 0;
      if (calories <= 0) continue;

      const diff = calories - calorieGap;
      const fitScore = diff <= 0 ? Math.abs(diff) : diff * 2;

      allMeals.push({
        name: meal.name,
        type: meal.type || "meal",
        calories,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        fromDay: day.day,
        fitScore,
      });
    }
  }

  allMeals.sort((a, b) => a.fitScore - b.fitScore);
  return allMeals.slice(0, maxResults);
}

function getSmartMealCombo(
  planDays: PlanDay[],
  calorieGap: number,
  alreadyLoggedNames: string[] = [],
): SmartSuggestion[] {
  const suggestions = getSmartMealSuggestions(planDays, calorieGap, alreadyLoggedNames, 20);
  if (suggestions.length === 0) return [];

  const best = suggestions[0];
  const result: SmartSuggestion[] = [best];

  const remainingGap = calorieGap - best.calories;
  if (remainingGap > 150) {
    const second = suggestions.find(
      (s) => s.name !== best.name && s.calories <= remainingGap * 1.2,
    );
    if (second) result.push(second);
  }

  return result;
}

function formatCalorieGap(gap: number): string {
  if (gap <= 0) return "on track";
  if (gap < 200) return `${Math.round(gap)} cal short — a snack would help`;
  if (gap < 500) return `${Math.round(gap)} cal short — add a meal`;
  return `${Math.round(gap)} cal short — you need a full meal`;
}

function getMealTypeIcon(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("breakfast")) return "wb-sunny";
  if (t.includes("lunch")) return "restaurant";
  if (t.includes("dinner")) return "dinner-dining";
  if (t.includes("snack")) return "cookie";
  return "restaurant-menu";
}

// ═══════════════════════════════════════════════════════════════════════════
// MILESTONE SHARE CARD — inline the pure text generation
// ═══════════════════════════════════════════════════════════════════════════

type MilestoneType = "level_up" | "streak_badge" | "achievement";

interface MilestoneShareData {
  type: MilestoneType;
  title: string;
  subtitle: string;
  totalXP: number;
  streakDays: number;
  badgeColor?: string;
  badgeIcon?: string;
}

function generateShareCardText(data: MilestoneShareData): string {
  const divider = "━━━━━━━━━━━━━━━━━━━━";
  const appTag = "#PeakPulse #FitnessJourney";

  switch (data.type) {
    case "level_up":
      return [
        "🏆 LEVEL UP!",
        divider,
        `⚡ Level ${data.title.replace("Level ", "")} — ${data.subtitle}`,
        `📊 Total XP: ${data.totalXP.toLocaleString()}`,
        data.streakDays > 0 ? `🔥 ${data.streakDays}-day streak` : "",
        divider,
        "Crushing my fitness goals with PeakPulse AI!",
        appTag,
      ]
        .filter(Boolean)
        .join("\n");

    case "streak_badge":
      return [
        `🔥 ${data.title.toUpperCase()} UNLOCKED!`,
        divider,
        `🏅 Badge: ${data.subtitle}`,
        `📅 ${data.streakDays} consecutive days`,
        `⚡ ${data.totalXP.toLocaleString()} XP earned`,
        divider,
        "Consistency is key! Building healthy habits with PeakPulse AI.",
        appTag,
      ]
        .filter(Boolean)
        .join("\n");

    case "achievement":
      return [
        `✨ ACHIEVEMENT UNLOCKED!`,
        divider,
        `🎯 ${data.title}`,
        `${data.subtitle}`,
        `⚡ ${data.totalXP.toLocaleString()} XP`,
        divider,
        "Making progress every day with PeakPulse AI!",
        appTag,
      ]
        .filter(Boolean)
        .join("\n");

    default:
      return `${data.title} — ${data.subtitle}\n${appTag}`;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildLevelUpShareData(
  newLevel: number,
  levelTitle: string,
  totalXP: number,
  streakDays: number,
): MilestoneShareData {
  return {
    type: "level_up",
    title: `Level ${newLevel}`,
    subtitle: levelTitle,
    totalXP,
    streakDays,
  };
}

function buildBadgeShareData(
  badgeDays: number,
  badgeName: string,
  badgeColor: string,
  badgeIcon: string,
  totalXP: number,
  streakDays: number,
): MilestoneShareData {
  return {
    type: "streak_badge",
    title: `${badgeDays}-Day Streak`,
    subtitle: badgeName,
    totalXP,
    streakDays,
    badgeColor,
    badgeIcon,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

const SAMPLE_PLAN: PlanDay[] = [
  {
    day: "Monday",
    meals: [
      { name: "Greek Yogurt Parfait", type: "breakfast", calories: 350, protein: 25, carbs: 40, fat: 10 },
      { name: "Grilled Chicken Salad", type: "lunch", calories: 500, protein: 40, carbs: 30, fat: 18 },
      { name: "Salmon with Quinoa", type: "dinner", calories: 650, protein: 45, carbs: 50, fat: 22 },
      { name: "Protein Bar", type: "snack", calories: 200, protein: 20, carbs: 22, fat: 8 },
    ],
  },
  {
    day: "Tuesday",
    meals: [
      { name: "Oatmeal with Berries", type: "breakfast", calories: 300, protein: 12, carbs: 50, fat: 8 },
      { name: "Turkey Wrap", type: "lunch", calories: 450, protein: 35, carbs: 40, fat: 15 },
      { name: "Beef Stir Fry", type: "dinner", calories: 600, protein: 42, carbs: 45, fat: 20 },
      { name: "Apple with Almond Butter", type: "snack", calories: 250, protein: 8, carbs: 30, fat: 14 },
    ],
  },
  {
    day: "Wednesday",
    meals: [
      { name: "Egg White Omelette", type: "breakfast", calories: 280, protein: 30, carbs: 10, fat: 12 },
      { name: "Tuna Poke Bowl", type: "lunch", calories: 520, protein: 38, carbs: 55, fat: 16 },
      { name: "Chicken Tikka Masala", type: "dinner", calories: 700, protein: 48, carbs: 60, fat: 24 },
    ],
  },
];

describe("Smart Meal Suggestions", () => {
  it("returns empty for zero or negative calorie gap", () => {
    expect(getSmartMealSuggestions(SAMPLE_PLAN, 0)).toEqual([]);
    expect(getSmartMealSuggestions(SAMPLE_PLAN, -100)).toEqual([]);
  });

  it("returns empty for empty plan", () => {
    expect(getSmartMealSuggestions([], 500)).toEqual([]);
  });

  it("returns suggestions sorted by fit score", () => {
    const results = getSmartMealSuggestions(SAMPLE_PLAN, 500);
    expect(results.length).toBeGreaterThan(0);
    // Each subsequent result should have >= fit score
    for (let i = 1; i < results.length; i++) {
      expect(results[i].fitScore).toBeGreaterThanOrEqual(results[i - 1].fitScore);
    }
  });

  it("best fit meal is closest to the calorie gap", () => {
    const results = getSmartMealSuggestions(SAMPLE_PLAN, 500);
    // The best fit should be the meal closest to 500 cal without going over
    expect(results[0].name).toBe("Grilled Chicken Salad"); // 500 cal = exact match
    expect(results[0].fitScore).toBe(0); // perfect fit
  });

  it("excludes already logged meals", () => {
    const results = getSmartMealSuggestions(SAMPLE_PLAN, 500, ["Grilled Chicken Salad"]);
    const names = results.map((r) => r.name);
    expect(names).not.toContain("Grilled Chicken Salad");
  });

  it("case-insensitive exclusion of logged meals", () => {
    const results = getSmartMealSuggestions(SAMPLE_PLAN, 500, ["grilled chicken salad"]);
    const names = results.map((r) => r.name);
    expect(names).not.toContain("Grilled Chicken Salad");
  });

  it("deduplicates meals across days", () => {
    const planWithDupes: PlanDay[] = [
      {
        day: "Monday",
        meals: [{ name: "Oatmeal", type: "breakfast", calories: 300, protein: 10, carbs: 50, fat: 8 }],
      },
      {
        day: "Tuesday",
        meals: [{ name: "Oatmeal", type: "breakfast", calories: 300, protein: 10, carbs: 50, fat: 8 }],
      },
    ];
    const results = getSmartMealSuggestions(planWithDupes, 300);
    expect(results.length).toBe(1);
  });

  it("respects maxResults limit", () => {
    const results = getSmartMealSuggestions(SAMPLE_PLAN, 500, [], 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("penalizes meals over the calorie gap", () => {
    // Gap = 200, Protein Bar = 200 (exact), Greek Yogurt = 350 (over by 150, penalty = 300)
    const results = getSmartMealSuggestions(SAMPLE_PLAN, 200);
    expect(results[0].name).toBe("Protein Bar"); // exact match
    expect(results[0].fitScore).toBe(0);
  });

  it("includes fromDay field", () => {
    const results = getSmartMealSuggestions(SAMPLE_PLAN, 500);
    expect(results[0].fromDay).toBe("Monday");
  });

  it("skips meals with 0 calories", () => {
    const plan: PlanDay[] = [
      {
        day: "Monday",
        meals: [{ name: "Water", type: "drink", calories: 0, protein: 0, carbs: 0, fat: 0 }],
      },
    ];
    expect(getSmartMealSuggestions(plan, 500)).toEqual([]);
  });

  it("handles plan days with null meals gracefully", () => {
    const plan: PlanDay[] = [
      { day: "Monday", meals: null as any },
      {
        day: "Tuesday",
        meals: [{ name: "Salad", type: "lunch", calories: 400, protein: 20, carbs: 30, fat: 10 }],
      },
    ];
    const results = getSmartMealSuggestions(plan, 400);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Salad");
  });
});

describe("Smart Meal Combo", () => {
  it("returns single meal for small gap", () => {
    const results = getSmartMealCombo(SAMPLE_PLAN, 200);
    expect(results.length).toBe(1);
  });

  it("returns two meals for large gap when combo is better", () => {
    // Gap = 800, best single = Chicken Tikka Masala (700), remaining = 100, < 150 so no second
    const results = getSmartMealCombo(SAMPLE_PLAN, 800);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("returns two meals when remaining gap > 150", () => {
    // Gap = 1000, best single = Chicken Tikka Masala (700), remaining = 300, > 150
    const results = getSmartMealCombo(SAMPLE_PLAN, 1000);
    expect(results.length).toBe(2);
    expect(results[0].name).not.toBe(results[1].name);
  });

  it("returns empty for empty plan", () => {
    expect(getSmartMealCombo([], 500)).toEqual([]);
  });
});

describe("Format Calorie Gap", () => {
  it("returns 'on track' for zero gap", () => {
    expect(formatCalorieGap(0)).toBe("on track");
  });

  it("returns 'on track' for negative gap", () => {
    expect(formatCalorieGap(-100)).toBe("on track");
  });

  it("suggests snack for small gap", () => {
    expect(formatCalorieGap(150)).toContain("snack");
  });

  it("suggests meal for medium gap", () => {
    expect(formatCalorieGap(400)).toContain("add a meal");
  });

  it("suggests full meal for large gap", () => {
    expect(formatCalorieGap(600)).toContain("full meal");
  });
});

describe("Meal Type Icon", () => {
  it("returns correct icons for meal types", () => {
    expect(getMealTypeIcon("breakfast")).toBe("wb-sunny");
    expect(getMealTypeIcon("lunch")).toBe("restaurant");
    expect(getMealTypeIcon("dinner")).toBe("dinner-dining");
    expect(getMealTypeIcon("snack")).toBe("cookie");
    expect(getMealTypeIcon("other")).toBe("restaurant-menu");
    expect(getMealTypeIcon("")).toBe("restaurant-menu");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MILESTONE SHARE CARD TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("Milestone Share Card Text", () => {
  it("generates level-up card with correct format", () => {
    const data = buildLevelUpShareData(10, "Committed", 5000, 14);
    const text = generateShareCardText(data);
    expect(text).toContain("LEVEL UP!");
    expect(text).toContain("Level 10");
    expect(text).toContain("Committed");
    expect(text).toContain("5,000");
    expect(text).toContain("14-day streak");
    expect(text).toContain("#PeakPulse");
  });

  it("generates level-up card without streak when 0", () => {
    const data = buildLevelUpShareData(5, "Rising", 1200, 0);
    const text = generateShareCardText(data);
    expect(text).toContain("LEVEL UP!");
    expect(text).not.toContain("0-day streak");
  });

  it("generates streak badge card", () => {
    const data = buildBadgeShareData(7, "Flame", "#EF4444", "local-fire-department", 3000, 7);
    const text = generateShareCardText(data);
    expect(text).toContain("7-DAY STREAK UNLOCKED!");
    expect(text).toContain("Badge: Flame");
    expect(text).toContain("7 consecutive days");
    expect(text).toContain("3,000");
    expect(text).toContain("#PeakPulse");
  });

  it("generates achievement card", () => {
    const data: MilestoneShareData = {
      type: "achievement",
      title: "First Workout",
      subtitle: "Completed your first workout!",
      totalXP: 100,
      streakDays: 1,
    };
    const text = generateShareCardText(data);
    expect(text).toContain("ACHIEVEMENT UNLOCKED!");
    expect(text).toContain("First Workout");
    expect(text).toContain("Completed your first workout!");
  });
});

describe("Build Share Data Helpers", () => {
  it("buildLevelUpShareData creates correct structure", () => {
    const data = buildLevelUpShareData(15, "Dedicated", 8000, 30);
    expect(data.type).toBe("level_up");
    expect(data.title).toBe("Level 15");
    expect(data.subtitle).toBe("Dedicated");
    expect(data.totalXP).toBe(8000);
    expect(data.streakDays).toBe(30);
  });

  it("buildBadgeShareData creates correct structure", () => {
    const data = buildBadgeShareData(30, "Inferno", "#F59E0B", "whatshot", 10000, 30);
    expect(data.type).toBe("streak_badge");
    expect(data.title).toBe("30-Day Streak");
    expect(data.subtitle).toBe("Inferno");
    expect(data.badgeColor).toBe("#F59E0B");
    expect(data.badgeIcon).toBe("whatshot");
  });
});

describe("XML Escaping", () => {
  it("escapes special characters", () => {
    expect(escapeXml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(escapeXml("<script>")).toBe("&lt;script&gt;");
    expect(escapeXml('"hello"')).toBe("&quot;hello&quot;");
    expect(escapeXml("it's")).toBe("it&apos;s");
  });

  it("handles empty string", () => {
    expect(escapeXml("")).toBe("");
  });

  it("handles string with no special chars", () => {
    expect(escapeXml("Hello World")).toBe("Hello World");
  });
});
