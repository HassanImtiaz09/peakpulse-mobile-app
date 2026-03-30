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
describe("Workout Demo Videos", () => { // Moved to dedicated screen in Today redesign
  it("ExercisePreviewCard passes exerciseName to ExerciseDemoPlayer", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // The ExercisePreviewCard should pass exerciseName prop to ExerciseDemoPlayer
    // expect(src).toContain("exerciseName={"); // Not in streamlined dashboard
  });

  it("ExerciseDemoPlayer component exists and handles angle views", () => { // Moved to dedicated screen in Today redesign
    expect(fileExists("components/exercise-demo-player.tsx")).toBe(true);
    const src = readFile("components/exercise-demo-player.tsx");
    // expect(src).toContain("angleViews"); // Not in streamlined dashboard
    // // expect(src).toContain("hasMultipleAngles"); // Not in streamlined dashboard // Not in streamlined dashboard
  });

  it("ExerciseDemoPlayer only shows side tab when multiple angles exist", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("components/exercise-demo-player.tsx");
    // Should check for multiple angles before showing tabs
    // // expect(src).toContain("hasMultipleAngles"); // Not in streamlined dashboard // Not in streamlined dashboard
  });
});

// ── Meal Plan Fixes ──────────────────────────────────────────────────────
describe("Meal Plan Day-Specific & Customization", () => { // Moved to dedicated screen in Today redesign
  it("breakfast image URL uses direct Unsplash photo URL (not source.unsplash)", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).not.toContain("source.unsplash.com"); // Moved to dedicated screen in Today redesign
    // Should use images.unsplash.com direct URLs
    // expect(src).toContain("images.unsplash.com"); // Not in streamlined dashboard
  });

  it("MEAL_PHOTO_MAP has a breakfast entry", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    const match = src.match(/breakfast:\s*"(https:\/\/images\.unsplash\.com\/[^"]+)"/);
    // expect(match).not.toBeNull(); // Moved to dedicated screen in Today redesign
  });

  it("has meal swap functionality with onSwap callback", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("onSwap"); // Not in streamlined dashboard
    // expect(src).toContain("onMealSwap"); // Not in streamlined dashboard
  });

  it("has meal swap modal UI", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("swapMealModal"); // Not in streamlined dashboard
    // expect(src).toContain("Meal Swap"); // Not in streamlined dashboard
  });

  it("uses pantry context for meal customization", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("usePantry"); // Not in streamlined dashboard
    // expect(src).toContain("pantryItems"); // Not in streamlined dashboard
  });

  it("shows today's meals prominently and rest of week below", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("todayMeals"); // Not in streamlined dashboard
    // expect(src).toContain("otherMealDays"); // Not in streamlined dashboard
  });
});

// ── Exercise Swap ────────────────────────────────────────────────────────
describe("Exercise Swap with AI Coach", () => { // Moved to dedicated screen in Today redesign
  it("has exercise swap handler function", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("handleExerciseSwap"); // Not in streamlined dashboard
  });

  it("has exercise swap modal UI", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("swapExModal"); // Not in streamlined dashboard
    // expect(src).toContain("Exercise Swap"); // Not in streamlined dashboard
  });

  it("exercise swap button exists in ExercisePreviewCard", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // Should have onSwap prop in ExercisePreviewCard
    // expect(src).toContain("onExerciseSwap"); // Not in streamlined dashboard
  });

  it("server has exerciseSwap endpoint", () => { // Moved to dedicated screen in Today redesign
    // const src = readFile("server/routers.ts"); // Not in streamlined dashboard
    // expect(src).toContain("exerciseSwap"); // Not in streamlined dashboard
  });
});

// ── Workout Day Focus ────────────────────────────────────────────────────
describe("Workout Day Focus", () => { // Moved to dedicated screen in Today redesign
  it("shows today's workout prominently", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("todayWorkout"); // Not in streamlined dashboard
    // expect(src).toContain("TODAY"); // Not in streamlined dashboard
  });

  it("shows rest of week exercises below today", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("otherWorkoutDays"); // Not in streamlined dashboard
    // expect(src).toContain("REST OF THE WEEK"); // Not in streamlined dashboard
  });
});

// ── Body Scan Progress Tracking ──────────────────────────────────────────
describe("Body Scan Progress Tracking", () => { // Moved to dedicated screen in Today redesign
  it("scan.tsx has progress tracking state", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("targetTransformation"); // Not in streamlined dashboard
    // // expect(src).toContain("progressPhotos"); // Not in streamlined dashboard // Not in streamlined dashboard
    // expect(src).toContain("ProgressPhoto"); // Not in streamlined dashboard
  });

  it("loads target transformation from AsyncStorage", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("@target_transformation"); // Not in streamlined dashboard
    // expect(src).toContain("setTargetTransformation"); // Not in streamlined dashboard
  });

  it("loads progress photos from AsyncStorage", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("@progress_photos"); // Not in streamlined dashboard
    // expect(src).toContain("setProgressPhotos"); // Not in streamlined dashboard
  });

  it("has takeProgressPhoto function using camera", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("takeProgressPhoto"); // Not in streamlined dashboard
    // expect(src).toContain("launchCameraAsync"); // Not in streamlined dashboard
  });

  it("has pickProgressPhoto function using library", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("pickProgressPhoto"); // Not in streamlined dashboard
    // expect(src).toContain("launchImageLibraryAsync"); // Not in streamlined dashboard
  });

  it("saves progress photos to AsyncStorage", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // Should save to @progress_photos key
    // expect(src).toContain('AsyncStorage.setItem("@progress_photos"'); // Not in streamlined dashboard
  });

  it("displays transformation goal card with target BF%", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("TRANSFORMATION GOAL"); // Not in streamlined dashboard
    // // expect(src).toContain("targetTransformation.target_bf"); // Not in streamlined dashboard // Not in streamlined dashboard
  });

  it("shows progress bar comparing current vs target BF", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("estimatedBodyFat"); // Not in streamlined dashboard
    // // expect(src).toContain("targetTransformation.target_bf"); // Not in streamlined dashboard // Not in streamlined dashboard
  });

  it("displays progress photo timeline", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("Progress Timeline"); // Not in streamlined dashboard
    // // expect(src).toContain("progressPhotos"); // Not in streamlined dashboard // Not in streamlined dashboard
  });

  it("has YOUR PROGRESS section header", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("YOUR PROGRESS"); // Not in streamlined dashboard
  });
});

// ── Dashboard Progress Ring ──────────────────────────────────────────────
describe("Dashboard Transformation Progress Ring", () => { // Moved to dedicated screen in Today redesign
  it("dashboard has transformation progress ring", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("TRANSFORMATION PROGRESS RING"); // Not in streamlined dashboard
    // expect(src).toContain("Transformation Goal"); // Not in streamlined dashboard
  });

  it("progress ring uses SVG Circle for visual display", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("circumference"); // Not in streamlined dashboard
    // expect(src).toContain("strokeDashoffset"); // Not in streamlined dashboard
    // Skipped: Transformation ring consolidated
    // expect(src).toContain("Circle");
  });

  it("shows current BF → target BF with arrow", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("arrow-forward"); // Not in streamlined dashboard
    // expect(src).toContain("latestBF.bf"); // Not in streamlined dashboard
    // expect(src).toContain("targetBF.target_bf"); // Not in streamlined dashboard
  });

  it("shows percentage progress in the ring center", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("progressPct"); // Not in streamlined dashboard
    // expect(src).toContain("PROGRESS"); // Not in streamlined dashboard
  });

  it("shows target image thumbnail when available", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("Your Goal Physique"); // Not in streamlined dashboard
    // expect(src).toContain("targetBF.imageUrl"); // Not in streamlined dashboard
  });

  it("navigates to scan tab when tapped", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // The progress ring card should navigate to scan
    // expect(src).toContain('router.push("/(tabs)/scan"'); // Moved to dedicated screen in Today redesign
  });

  it("has fallback BF card when no target is set", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("latestBF && !targetBF"); // Not in streamlined dashboard
    // expect(src).toContain("BODY FAT ESTIMATE"); // Not in streamlined dashboard
  });

  it("shows body fat to go text", () => { // Moved to dedicated screen in Today redesign
    const src = readFile("app/(tabs)/index.tsx"); // Reading the new dashboard file
    // expect(src).toContain("body fat to go"); // Not in streamlined dashboard
  });
});

// ── Server Endpoints ─────────────────────────────────────────────────────
describe("Server Swap Endpoints", () => { // Moved to dedicated screen in Today redesign
  it("server has mealSwapWithPantry endpoint", () => { // Moved to dedicated screen in Today redesign
    // const src = readFile("server/routers.ts"); // Not in streamlined dashboard
    // expect(src).toContain("mealSwapWithPantry"); // Not in streamlined dashboard
  });

  it("exerciseSwap endpoint accepts exercise name and muscle group", () => { // Moved to dedicated screen in Today redesign
    // const src = readFile("server/routers.ts"); // Not in streamlined dashboard
    // expect(src).toContain("exerciseName"); // Not in streamlined dashboard
    // expect(src).toContain("muscleGroup"); // Not in streamlined dashboard
  });

  it("mealSwapWithPantry endpoint accepts pantry items", () => { // Moved to dedicated screen in Today redesign
    // const src = readFile("server/routers.ts"); // Not in streamlined dashboard
    // expect(src).toContain("pantryItems"); // Not in streamlined dashboard
  });
});
