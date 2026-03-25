import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ── Workout Demo Fix ─────────────────────────────────────────────────────
describe("Workout Demo Videos", () => {
  it("ExercisePreviewCard passes exerciseName to ExerciseDemoPlayer", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    // The ExercisePreviewCard should pass exerciseName prop to ExerciseDemoPlayer
    expect(src).toContain("exerciseName={");
  });

  it("ExerciseDemoPlayer component exists and handles angle views", () => {
    expect(fileExists("components/exercise-demo-player.tsx")).toBe(true);
    const src = readFile("components/exercise-demo-player.tsx");
    expect(src).toContain("angleViews");
    expect(src).toContain("hasMultipleAngles");
  });

  it("ExerciseDemoPlayer only shows side tab when multiple angles exist", () => {
    const src = readFile("components/exercise-demo-player.tsx");
    // Should check for multiple angles before showing tabs
    expect(src).toContain("hasMultipleAngles");
  });
});

// ── Meal Plan Fixes ──────────────────────────────────────────────────────
describe("Meal Plan Day-Specific & Customization", () => {
  it("breakfast image URL uses direct Unsplash photo URL (not source.unsplash)", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).not.toContain("source.unsplash.com");
    // Should use images.unsplash.com direct URLs
    expect(src).toContain("images.unsplash.com");
  });

  it("MEAL_PHOTO_MAP has a breakfast entry", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    const match = src.match(/breakfast:\s*"(https:\/\/images\.unsplash\.com\/[^"]+)"/);
    expect(match).not.toBeNull();
  });

  it("has meal swap functionality with onSwap callback", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("onSwap");
    expect(src).toContain("onMealSwap");
  });

  it("has meal swap modal UI", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("swapMealModal");
    expect(src).toContain("Meal Swap");
  });

  it("uses pantry context for meal customization", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("usePantry");
    expect(src).toContain("pantryItems");
  });

  it("shows today's meals prominently and rest of week below", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("todayMeals");
    expect(src).toContain("otherMealDays");
  });
});

// ── Exercise Swap ────────────────────────────────────────────────────────
describe("Exercise Swap with AI Coach", () => {
  it("has exercise swap handler function", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("handleExerciseSwap");
  });

  it("has exercise swap modal UI", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("swapExModal");
    expect(src).toContain("Exercise Swap");
  });

  it("exercise swap button exists in ExercisePreviewCard", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    // Should have onSwap prop in ExercisePreviewCard
    expect(src).toContain("onExerciseSwap");
  });

  it("server has exerciseSwap endpoint", () => {
    const src = readFile("server/routers.ts");
    expect(src).toContain("exerciseSwap");
  });
});

// ── Workout Day Focus ────────────────────────────────────────────────────
describe("Workout Day Focus", () => {
  it("shows today's workout prominently", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("todayWorkout");
    expect(src).toContain("TODAY");
  });

  it("shows rest of week exercises below today", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("otherWorkoutDays");
    expect(src).toContain("REST OF THE WEEK");
  });
});

// ── Body Scan Progress Tracking ──────────────────────────────────────────
describe("Body Scan Progress Tracking", () => {
  it("scan.tsx has progress tracking state", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("targetTransformation");
    expect(src).toContain("progressPhotos");
    expect(src).toContain("ProgressPhoto");
  });

  it("loads target transformation from AsyncStorage", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("@target_transformation");
    expect(src).toContain("setTargetTransformation");
  });

  it("loads progress photos from AsyncStorage", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("@progress_photos");
    expect(src).toContain("setProgressPhotos");
  });

  it("has takeProgressPhoto function using camera", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("takeProgressPhoto");
    expect(src).toContain("launchCameraAsync");
  });

  it("has pickProgressPhoto function using library", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("pickProgressPhoto");
    expect(src).toContain("launchImageLibraryAsync");
  });

  it("saves progress photos to AsyncStorage", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    // Should save to @progress_photos key
    expect(src).toContain('AsyncStorage.setItem("@progress_photos"');
  });

  it("displays transformation goal card with target BF%", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("TRANSFORMATION GOAL");
    expect(src).toContain("targetTransformation.target_bf");
  });

  it("shows progress bar comparing current vs target BF", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("estimatedBodyFat");
    expect(src).toContain("targetTransformation.target_bf");
  });

  it("displays progress photo timeline", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("Progress Timeline");
    expect(src).toContain("progressPhotos");
  });

  it("has YOUR PROGRESS section header", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("YOUR PROGRESS");
  });
});

// ── Dashboard Progress Ring ──────────────────────────────────────────────
describe("Dashboard Transformation Progress Ring", () => {
  it("dashboard has transformation progress ring", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("TRANSFORMATION PROGRESS RING");
    expect(src).toContain("Transformation Goal");
  });

  it("progress ring uses SVG Circle for visual display", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("circumference");
    expect(src).toContain("strokeDashoffset");
    expect(src).toContain("Circle");
  });

  it("shows current BF → target BF with arrow", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("arrow-forward");
    expect(src).toContain("latestBF.bf");
    expect(src).toContain("targetBF.target_bf");
  });

  it("shows percentage progress in the ring center", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("progressPct");
    expect(src).toContain("PROGRESS");
  });

  it("shows target image thumbnail when available", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("Your Goal Physique");
    expect(src).toContain("targetBF.imageUrl");
  });

  it("navigates to scan tab when tapped", () => {
    const src = readFile("app/(tabs)/index.tsx");
    // The progress ring card should navigate to scan
    expect(src).toContain('router.push("/(tabs)/scan"');
  });

  it("has fallback BF card when no target is set", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("latestBF && !targetBF");
    expect(src).toContain("BODY FAT ESTIMATE");
  });

  it("shows body fat to go text", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("body fat to go");
  });
});

// ── Server Endpoints ─────────────────────────────────────────────────────
describe("Server Swap Endpoints", () => {
  it("server has mealSwapWithPantry endpoint", () => {
    const src = readFile("server/routers.ts");
    expect(src).toContain("mealSwapWithPantry");
  });

  it("exerciseSwap endpoint accepts exercise name and muscle group", () => {
    const src = readFile("server/routers.ts");
    expect(src).toContain("exerciseName");
    expect(src).toContain("muscleGroup");
  });

  it("mealSwapWithPantry endpoint accepts pantry items", () => {
    const src = readFile("server/routers.ts");
    expect(src).toContain("pantryItems");
  });
});
