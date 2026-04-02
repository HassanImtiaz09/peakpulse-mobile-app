import { describe, it, expect } from "vitest";

// ── Inline copies of the functions we're testing ──

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
  const daySet = new Set(normalized.map((d: any) => d.day));
  for (const c of CANONICAL) {
    if (!daySet.has(c)) {
      normalized.push({ day: c, meals: [] });
    }
  }
  normalized.sort((a: any, b: any) => CANONICAL.indexOf(a.day) - CANONICAL.indexOf(b.day));
  // Client-side deduplication
  const daySignatures = normalized.map((d: any) =>
    (d.meals ?? []).map((m: any) => (m.name ?? "").toLowerCase().trim()).sort().join("|")
  );
  const seenSigs = new Map<string, number>();
  const dayThemes = ["Mediterranean", "Asian", "Latin", "Middle Eastern", "Nordic", "Indian", "American"];
  daySignatures.forEach((sig: string, idx: number) => {
    if (!sig) return;
    if (seenSigs.has(sig) && normalized[idx].meals?.length > 0) {
      const theme = dayThemes[idx % dayThemes.length];
      normalized[idx].meals = normalized[idx].meals.map((m: any) => ({
        ...m,
        name: `${theme} ${m.name}`,
        photoQuery: `${theme.toLowerCase()} ${m.photoQuery || m.name}`,
        photoUrl: undefined,
      }));
    } else {
      seenSigs.set(sig, idx);
    }
  });
  return { ...plan, days: normalized };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const FOOD_PHOTO_POOL = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80",
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80",
  "https://images.unsplash.com/photo-1484723091739-30990106e7c6?w=400&q=80",
  "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80",
  "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80",
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
  "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80",
  "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80",
  "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80",
  "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80",
  "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=80",
  "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80",
  "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80",
  "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400&q=80",
  "https://images.unsplash.com/photo-1559181567-c3190bfa4cfe?w=400&q=80",
  "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80",
  "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=400&q=80",
];

const MEAL_PHOTO_MAP: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80",
  default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
};

function getMealPlanPhotoUrl(meal: any): string {
  if (meal.photoUrl) return meal.photoUrl;
  const key = `${meal.name ?? ""}|${meal.type ?? ""}`.toLowerCase();
  if (key.length > 1) {
    const idx = hashString(key) % FOOD_PHOTO_POOL.length;
    return FOOD_PHOTO_POOL[idx];
  }
  const type = (meal.type ?? "default").toLowerCase();
  return MEAL_PHOTO_MAP[type] ?? MEAL_PHOTO_MAP.default;
}

// ── Tests ──

describe("Meal Plan Variety", () => {
  it("should detect and rename duplicate days", () => {
    const duplicatePlan = {
      days: [
        { day: "Monday", meals: [{ name: "Oatmeal", type: "breakfast" }, { name: "Grilled Chicken", type: "lunch" }] },
        { day: "Tuesday", meals: [{ name: "Oatmeal", type: "breakfast" }, { name: "Grilled Chicken", type: "lunch" }] },
        { day: "Wednesday", meals: [{ name: "Oatmeal", type: "breakfast" }, { name: "Grilled Chicken", type: "lunch" }] },
        { day: "Thursday", meals: [{ name: "Oatmeal", type: "breakfast" }, { name: "Grilled Chicken", type: "lunch" }] },
        { day: "Friday", meals: [{ name: "Oatmeal", type: "breakfast" }, { name: "Grilled Chicken", type: "lunch" }] },
        { day: "Saturday", meals: [{ name: "Oatmeal", type: "breakfast" }, { name: "Grilled Chicken", type: "lunch" }] },
        { day: "Sunday", meals: [{ name: "Oatmeal", type: "breakfast" }, { name: "Grilled Chicken", type: "lunch" }] },
      ],
    };

    const result = normalizeMealPlanDays(duplicatePlan);
    // After deduplication, each day should have unique meal names
    const allMealNames = result.days.flatMap((d: any) => d.meals.map((m: any) => m.name));
    const uniqueNames = new Set(allMealNames);
    // Monday stays as-is, but Tue-Sun should be renamed
    expect(uniqueNames.size).toBeGreaterThan(2);
    // Check that Tuesday's meals are different from Monday's
    const monMeals = result.days[0].meals.map((m: any) => m.name).sort();
    const tueMeals = result.days[1].meals.map((m: any) => m.name).sort();
    expect(monMeals).not.toEqual(tueMeals);
  });

  it("should not modify already-unique days", () => {
    const uniquePlan = {
      days: [
        { day: "Monday", meals: [{ name: "Scrambled Eggs", type: "breakfast" }] },
        { day: "Tuesday", meals: [{ name: "Overnight Oats", type: "breakfast" }] },
        { day: "Wednesday", meals: [{ name: "Smoothie Bowl", type: "breakfast" }] },
        { day: "Thursday", meals: [{ name: "Avocado Toast", type: "breakfast" }] },
        { day: "Friday", meals: [{ name: "Pancakes", type: "breakfast" }] },
        { day: "Saturday", meals: [{ name: "French Toast", type: "breakfast" }] },
        { day: "Sunday", meals: [{ name: "Eggs Benedict", type: "breakfast" }] },
      ],
    };

    const result = normalizeMealPlanDays(uniquePlan);
    // Names should remain unchanged
    expect(result.days[0].meals[0].name).toBe("Scrambled Eggs");
    expect(result.days[1].meals[0].name).toBe("Overnight Oats");
    expect(result.days[6].meals[0].name).toBe("Eggs Benedict");
  });

  it("should fill missing days with empty meals", () => {
    const partialPlan = {
      days: [
        { day: "Monday", meals: [{ name: "Oatmeal", type: "breakfast" }] },
        { day: "Wednesday", meals: [{ name: "Salad", type: "lunch" }] },
      ],
    };

    const result = normalizeMealPlanDays(partialPlan);
    expect(result.days.length).toBe(7);
    expect(result.days.map((d: any) => d.day)).toEqual([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]);
  });
});

describe("Meal Photo Uniqueness", () => {
  it("should return different photos for different meal names", () => {
    const meals = [
      { name: "Grilled Salmon", type: "dinner" },
      { name: "Chicken Stir Fry", type: "dinner" },
      { name: "Beef Tacos", type: "dinner" },
      { name: "Vegetable Curry", type: "dinner" },
      { name: "Pasta Primavera", type: "dinner" },
    ];

    const photos = meals.map(m => getMealPlanPhotoUrl(m));
    const uniquePhotos = new Set(photos);
    // With 5 different meal names, we should get at least 3 different photos
    // (hash collisions are possible but unlikely with 24 photos in the pool)
    expect(uniquePhotos.size).toBeGreaterThanOrEqual(3);
  });

  it("should use photoUrl when available", () => {
    const meal = { name: "Test Meal", type: "lunch", photoUrl: "https://example.com/custom.jpg" };
    expect(getMealPlanPhotoUrl(meal)).toBe("https://example.com/custom.jpg");
  });

  it("should return a valid URL from the pool for meals without photoUrl", () => {
    const meal = { name: "Grilled Chicken Salad", type: "lunch" };
    const url = getMealPlanPhotoUrl(meal);
    expect(url).toContain("unsplash.com");
    expect(FOOD_PHOTO_POOL).toContain(url);
  });

  it("hashString should produce consistent results", () => {
    expect(hashString("test")).toBe(hashString("test"));
    expect(hashString("hello")).not.toBe(hashString("world"));
  });

  it("should produce different photos for same meal type but different names", () => {
    const breakfast1 = { name: "Scrambled Eggs with Toast", type: "breakfast" };
    const breakfast2 = { name: "Overnight Oats with Berries", type: "breakfast" };
    const breakfast3 = { name: "Avocado Toast with Poached Eggs", type: "breakfast" };

    const photo1 = getMealPlanPhotoUrl(breakfast1);
    const photo2 = getMealPlanPhotoUrl(breakfast2);
    const photo3 = getMealPlanPhotoUrl(breakfast3);

    // At least 2 of the 3 should be different
    const uniqueSet = new Set([photo1, photo2, photo3]);
    expect(uniqueSet.size).toBeGreaterThanOrEqual(2);
  });
});
