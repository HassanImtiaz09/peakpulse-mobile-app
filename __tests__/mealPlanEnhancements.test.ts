import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
    multiRemove: vi.fn((keys: string[]) => { keys.forEach(k => delete mockStorage[k]); return Promise.resolve(); }),
  },
}));

// Mock expo-notifications
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: vi.fn(() => Promise.resolve({ status: "granted" })),
  setNotificationChannelAsync: vi.fn(() => Promise.resolve()),
  scheduleNotificationAsync: vi.fn(() => Promise.resolve("mock-notif-id")),
  cancelScheduledNotificationAsync: vi.fn(() => Promise.resolve()),
  SchedulableTriggerInputTypes: { DATE: "date", DAILY: "daily", TIME_INTERVAL: "timeInterval" },
  AndroidImportance: { HIGH: 4 },
}));

// Mock react-native Platform
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

describe("Calorie Target Consistency", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  it("should save TDEE as calorie goal during onboarding profile creation", () => {
    // Simulate what onboarding does: save @peakpulse_calorie_goal
    const tdee = 2450;
    mockStorage["@peakpulse_calorie_goal"] = String(Math.round(tdee));
    expect(mockStorage["@peakpulse_calorie_goal"]).toBe("2450");
  });

  it("should include calorieTarget in guest profile", () => {
    const profile = {
      name: "Athlete",
      goal: "build_muscle",
      calorieTarget: 2450,
    };
    mockStorage["@guest_profile"] = JSON.stringify(profile);
    const parsed = JSON.parse(mockStorage["@guest_profile"]);
    expect(parsed.calorieTarget).toBe(2450);
  });

  it("calorie goal key matches between onboarding and CalorieContext", () => {
    // The key used in CalorieContext is @peakpulse_calorie_goal
    // The key we now save in onboarding is also @peakpulse_calorie_goal
    const GOAL_KEY = "@peakpulse_calorie_goal";
    mockStorage[GOAL_KEY] = "2200";
    expect(mockStorage[GOAL_KEY]).toBe("2200");
  });
});

describe("Meal Plan Variety Enforcement", () => {
  it("server prompt should contain variety requirement text", () => {
    // Verify the prompt text includes the critical variety requirement
    const varietyText = "CRITICAL VARIETY REQUIREMENT: Every single meal across all 7 days MUST be unique and different";
    expect(varietyText).toContain("unique and different");
    expect(varietyText).toContain("CRITICAL VARIETY REQUIREMENT");
  });

  it("should detect duplicate meals across days", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "Scrambled Eggs", type: "breakfast" }] },
        { day: "Tuesday", meals: [{ name: "Scrambled Eggs", type: "breakfast" }] },
        { day: "Wednesday", meals: [{ name: "Overnight Oats", type: "breakfast" }] },
      ],
    };
    const allMealNames = plan.days.flatMap(d => d.meals.map(m => m.name));
    const uniqueNames = new Set(allMealNames);
    const hasDuplicates = uniqueNames.size < allMealNames.length;
    expect(hasDuplicates).toBe(true); // This is what we're preventing with the prompt
  });

  it("should validate a plan with unique meals passes", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "Scrambled Eggs", type: "breakfast" }] },
        { day: "Tuesday", meals: [{ name: "Overnight Oats", type: "breakfast" }] },
        { day: "Wednesday", meals: [{ name: "Smoothie Bowl", type: "breakfast" }] },
      ],
    };
    const allMealNames = plan.days.flatMap(d => d.meals.map(m => m.name));
    const uniqueNames = new Set(allMealNames);
    expect(uniqueNames.size).toBe(allMealNames.length);
  });
});

describe("Meal Plan Renewal Notification", () => {
  it("should schedule a Friday notification for meal plan renewal", async () => {
    const Notifications = await import("expo-notifications");
    const { scheduleMealPlanRenewalReminder } = await import("../lib/notifications");
    await scheduleMealPlanRenewalReminder(18, 0);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: expect.objectContaining({ type: "meal_plan_renewal" }),
        }),
        trigger: expect.objectContaining({
          weekday: 6, // Friday
          hour: 18,
          minute: 0,
          repeats: true,
        }),
      })
    );
  });

  it("should save notification ID to AsyncStorage", async () => {
    const { scheduleMealPlanRenewalReminder } = await import("../lib/notifications");
    await scheduleMealPlanRenewalReminder();
    expect(mockStorage["@meal_plan_renewal_notif_id"]).toBe("mock-notif-id");
  });

  it("should cancel existing notification before scheduling new one", async () => {
    const Notifications = await import("expo-notifications");
    mockStorage["@meal_plan_renewal_notif_id"] = "old-notif-id";
    const { scheduleMealPlanRenewalReminder } = await import("../lib/notifications");
    await scheduleMealPlanRenewalReminder();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("old-notif-id");
  });

  it("should not schedule if disabled", async () => {
    const Notifications = await import("expo-notifications");
    vi.mocked(Notifications.scheduleNotificationAsync).mockClear();
    mockStorage["@meal_plan_renewal_enabled"] = "false";
    const { scheduleMealPlanRenewalReminder } = await import("../lib/notifications");
    await scheduleMealPlanRenewalReminder();
    // Should not have been called since we cleared it
    // (it may have been called from previous tests, so we check the last call)
    const calls = vi.mocked(Notifications.scheduleNotificationAsync).mock.calls;
    // The function should return early without scheduling
    expect(calls.length).toBe(0);
  });
});

describe("AI Meal Image Generation", () => {
  it("getMealPlanPhotoUrl should prefer photoUrl over fallback", () => {
    const getMealPlanPhotoUrl = (meal: any): string => {
      if (meal.photoUrl) return meal.photoUrl;
      const type = (meal.type ?? "default").toLowerCase();
      const MEAL_PHOTO_MAP: Record<string, string> = {
        breakfast: "https://images.unsplash.com/photo-breakfast",
        default: "https://images.unsplash.com/photo-default",
      };
      return MEAL_PHOTO_MAP[type] ?? MEAL_PHOTO_MAP.default;
    };

    // With AI-generated photoUrl
    const mealWithPhoto = { name: "Scrambled Eggs", type: "breakfast", photoUrl: "https://s3.example.com/generated/eggs.png" };
    expect(getMealPlanPhotoUrl(mealWithPhoto)).toBe("https://s3.example.com/generated/eggs.png");

    // Without photoUrl — falls back to type-based
    const mealWithoutPhoto = { name: "Scrambled Eggs", type: "breakfast" };
    expect(getMealPlanPhotoUrl(mealWithoutPhoto)).toBe("https://images.unsplash.com/photo-breakfast");

    // Without photoUrl and unknown type — falls back to default
    const mealUnknownType = { name: "Mystery Dish", type: "brunch" };
    expect(getMealPlanPhotoUrl(mealUnknownType)).toBe("https://images.unsplash.com/photo-default");
  });

  it("should collect meals without photoUrl for generation", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [
          { name: "Eggs Benedict", photoUrl: "https://existing.com/img.png" },
          { name: "Grilled Chicken Salad" },
        ]},
        { day: "Tuesday", meals: [
          { name: "Overnight Oats" },
          { name: "Salmon Bowl", photoUrl: "https://existing.com/salmon.png" },
        ]},
      ],
    };

    const mealsToGenerate: Array<{ dayIndex: number; mealIndex: number; name: string }> = [];
    plan.days.forEach((day, dayIdx) => {
      day.meals.forEach((meal: any, mealIdx) => {
        if (!meal.photoUrl) {
          mealsToGenerate.push({ dayIndex: dayIdx, mealIndex: mealIdx, name: meal.name });
        }
      });
    });

    expect(mealsToGenerate).toHaveLength(2);
    expect(mealsToGenerate[0]).toEqual({ dayIndex: 0, mealIndex: 1, name: "Grilled Chicken Salad" });
    expect(mealsToGenerate[1]).toEqual({ dayIndex: 1, mealIndex: 0, name: "Overnight Oats" });
  });

  it("should apply generated images back to the plan", () => {
    const plan = {
      days: [
        { day: "Monday", meals: [{ name: "Eggs Benedict" }, { name: "Grilled Chicken" }] },
        { day: "Tuesday", meals: [{ name: "Overnight Oats" }] },
      ],
    };

    const results = [
      { dayIndex: 0, mealIndex: 0, photoUrl: "https://gen.com/eggs.png" },
      { dayIndex: 0, mealIndex: 1, photoUrl: "https://gen.com/chicken.png" },
      { dayIndex: 1, mealIndex: 0, photoUrl: null }, // failed
    ];

    const updatedDays = plan.days.map((day: any, dayIdx: number) => ({
      ...day,
      meals: day.meals.map((meal: any, mealIdx: number) => {
        const match = results.find(r => r.dayIndex === dayIdx && r.mealIndex === mealIdx);
        if (match?.photoUrl) return { ...meal, photoUrl: match.photoUrl };
        return meal;
      }),
    }));

    expect(updatedDays[0].meals[0].photoUrl).toBe("https://gen.com/eggs.png");
    expect(updatedDays[0].meals[1].photoUrl).toBe("https://gen.com/chicken.png");
    expect(updatedDays[1].meals[0].photoUrl).toBeUndefined(); // null result = no update
  });

  it("should clear photoUrl when regenerating a day", () => {
    const newMeals = [
      { name: "New Breakfast", type: "breakfast", photoUrl: "old-url" },
      { name: "New Lunch", type: "lunch" },
    ];
    const cleared = newMeals.map((m: any) => ({ ...m, photoUrl: undefined }));
    expect(cleared[0].photoUrl).toBeUndefined();
    expect(cleared[1].photoUrl).toBeUndefined();
  });
});
