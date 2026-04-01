import { describe, it, expect } from "vitest";

// Inline the normalization function for testing (same logic as in meals.tsx)
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
  return { ...plan, days: normalized };
}

describe("normalizeMealPlanDays", () => {
  it("returns plan unchanged if days is missing", () => {
    const plan = { dailyCalories: 2000, insight: "tip" };
    expect(normalizeMealPlanDays(plan)).toEqual(plan);
  });

  it("returns plan unchanged if days is not an array", () => {
    const plan = { days: "not an array" };
    expect(normalizeMealPlanDays(plan)).toEqual(plan);
  });

  it("normalizes already-correct day names", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "Oats" }] },
        { day: "Tuesday", meals: [{ name: "Salad" }] },
        { day: "Wednesday", meals: [] },
        { day: "Thursday", meals: [] },
        { day: "Friday", meals: [] },
        { day: "Saturday", meals: [] },
        { day: "Sunday", meals: [] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.days).toHaveLength(7);
    expect(result.days[0].day).toBe("Monday");
    expect(result.days[0].meals[0].name).toBe("Oats");
    expect(result.days[6].day).toBe("Sunday");
  });

  it("normalizes 'Day 1' through 'Day 7' format", () => {
    const plan = {
      days: [
        { day: "Day 1", meals: [{ name: "A" }] },
        { day: "Day 2", meals: [{ name: "B" }] },
        { day: "Day 3", meals: [] },
        { day: "Day 4", meals: [] },
        { day: "Day 5", meals: [] },
        { day: "Day 6", meals: [] },
        { day: "Day 7", meals: [] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.days).toHaveLength(7);
    expect(result.days[0].day).toBe("Monday");
    expect(result.days[0].meals[0].name).toBe("A");
    expect(result.days[1].day).toBe("Tuesday");
    expect(result.days[6].day).toBe("Sunday");
  });

  it("normalizes abbreviations like 'Mon', 'Tue'", () => {
    const plan = {
      days: [
        { day: "Mon", meals: [] },
        { day: "Tue", meals: [] },
        { day: "Wed", meals: [] },
        { day: "Thu", meals: [] },
        { day: "Fri", meals: [] },
        { day: "Sat", meals: [] },
        { day: "Sun", meals: [] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.days.map((d: any) => d.day)).toEqual([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]);
  });

  it("normalizes case-insensitive names like 'MONDAY', 'monday'", () => {
    const plan = {
      days: [
        { day: "MONDAY", meals: [] },
        { day: "tuesday", meals: [] },
        { day: "Wednesday", meals: [] },
        { day: "THURSDAY", meals: [] },
        { day: "friday", meals: [] },
        { day: "Saturday", meals: [] },
        { day: "sunday", meals: [] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.days.map((d: any) => d.day)).toEqual([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]);
  });

  it("fills missing days with empty meals", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "A" }] },
        { day: "Wednesday", meals: [{ name: "B" }] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.days).toHaveLength(7);
    expect(result.days[0].day).toBe("Monday");
    expect(result.days[0].meals).toHaveLength(1);
    expect(result.days[1].day).toBe("Tuesday");
    expect(result.days[1].meals).toEqual([]);
    expect(result.days[2].day).toBe("Wednesday");
    expect(result.days[2].meals).toHaveLength(1);
  });

  it("sorts days in canonical order", () => {
    const plan = {
      days: [
        { day: "Friday", meals: [] },
        { day: "Monday", meals: [] },
        { day: "Wednesday", meals: [] },
        { day: "Sunday", meals: [] },
        { day: "Tuesday", meals: [] },
        { day: "Thursday", meals: [] },
        { day: "Saturday", meals: [] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.days.map((d: any) => d.day)).toEqual([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]);
  });

  it("normalizes pure number format '1'..'7'", () => {
    const plan = {
      days: [
        { day: "1", meals: [] },
        { day: "2", meals: [] },
        { day: "3", meals: [] },
        { day: "4", meals: [] },
        { day: "5", meals: [] },
        { day: "6", meals: [] },
        { day: "7", meals: [] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.days.map((d: any) => d.day)).toEqual([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]);
  });

  it("falls back to index-based assignment for unknown formats", () => {
    const plan = {
      days: [
        { day: "Lundi", meals: [] },
        { day: "Mardi", meals: [] },
        { day: "Mercredi", meals: [] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.days).toHaveLength(7);
    // First 3 assigned by index
    expect(result.days[0].day).toBe("Monday");
    expect(result.days[1].day).toBe("Tuesday");
    expect(result.days[2].day).toBe("Wednesday");
    // Remaining 4 filled with empty meals
    expect(result.days[3].day).toBe("Thursday");
    expect(result.days[3].meals).toEqual([]);
  });

  it("preserves other plan properties", () => {
    const plan = {
      dailyCalories: 2200,
      proteinTarget: 150,
      insight: "Stay hydrated",
      days: [
        { day: "Monday", meals: [{ name: "Oats", calories: 300 }] },
      ],
    };
    const result = normalizeMealPlanDays(plan);
    expect(result.dailyCalories).toBe(2200);
    expect(result.proteinTarget).toBe(150);
    expect(result.insight).toBe("Stay hydrated");
  });
});
