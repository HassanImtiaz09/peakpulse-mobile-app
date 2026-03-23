import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock exercise-data module (vitest can't resolve @/ aliases)
vi.mock("@/lib/exercise-data", () => ({
  getExerciseInfo: (name: string) => ({
    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps"],
    category: "gym",
    difficulty: "intermediate",
  }),
  getAllExercises: () => [],
}));

// Mock exercise-demos module
vi.mock("@/lib/exercise-demos", () => ({
  getExerciseDemo: (name: string) => null,
}));

describe("Round 68 — Muscle Balance Analysis Engine", () => {
  it("should export analyzeMuscleBalance function", async () => {
    const mod = await import("../lib/muscle-balance");
    expect(typeof mod.analyzeMuscleBalance).toBe("function");
  });

  it("should export generateSuggestions function", async () => {
    const mod = await import("../lib/muscle-balance");
    expect(typeof mod.generateSuggestions).toBe("function");
  });

  it("should export generatePlanChanges function", async () => {
    const mod = await import("../lib/muscle-balance");
    expect(typeof mod.generatePlanChanges).toBe("function");
  });

  it("should export applyPlanChanges function", async () => {
    const mod = await import("../lib/muscle-balance");
    expect(typeof mod.applyPlanChanges).toBe("function");
  });

  it("should export getTodayTargetMuscles function", async () => {
    const mod = await import("../lib/muscle-balance");
    expect(typeof mod.getTodayTargetMuscles).toBe("function");
  });

  it("getTodayTargetMuscles should return empty arrays for null schedule", async () => {
    const { getTodayTargetMuscles } = await import("../lib/muscle-balance");
    const result = getTodayTargetMuscles(null as any);
    expect(result.primary).toEqual([]);
    expect(result.secondary).toEqual([]);
  });

  it("getTodayTargetMuscles should return empty arrays for undefined schedule", async () => {
    const { getTodayTargetMuscles } = await import("../lib/muscle-balance");
    const result = getTodayTargetMuscles(undefined);
    expect(result.primary).toEqual([]);
    expect(result.secondary).toEqual([]);
  });

  it("analyzeMuscleBalance should return a valid report structure", async () => {
    const { analyzeMuscleBalance } = await import("../lib/muscle-balance");
    const report = await analyzeMuscleBalance(7);
    expect(report).toHaveProperty("entries");
    expect(report).toHaveProperty("overExercised");
    expect(report).toHaveProperty("optimal");
    expect(report).toHaveProperty("underExercised");
    expect(report).toHaveProperty("totalWorkouts");
    expect(report).toHaveProperty("windowDays");
    expect(Array.isArray(report.entries)).toBe(true);
    expect(Array.isArray(report.overExercised)).toBe(true);
    expect(Array.isArray(report.optimal)).toBe(true);
    expect(Array.isArray(report.underExercised)).toBe(true);
  });

  it("generateSuggestions should return array for any report", async () => {
    const { analyzeMuscleBalance, generateSuggestions } = await import("../lib/muscle-balance");
    const report = await analyzeMuscleBalance(7);
    const suggestions = generateSuggestions(report);
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it("generatePlanChanges should return array", async () => {
    const { analyzeMuscleBalance, generatePlanChanges } = await import("../lib/muscle-balance");
    const report = await analyzeMuscleBalance(7);
    const changes = generatePlanChanges(report, []);
    expect(Array.isArray(changes)).toBe(true);
  });

  it("applyPlanChanges should return schedule unchanged when no changes", async () => {
    const { applyPlanChanges } = await import("../lib/muscle-balance");
    const schedule = [
      { day: "Monday", focus: "Chest", exercises: [{ name: "Bench Press", sets: 3, reps: "10" }] },
    ];
    const result = applyPlanChanges(schedule, []);
    expect(result).toEqual(schedule);
  });

  it("MuscleBalanceEntry should have correct status types", async () => {
    const { analyzeMuscleBalance } = await import("../lib/muscle-balance");
    const report = await analyzeMuscleBalance(7);
    for (const entry of report.entries) {
      expect(["over", "optimal", "under", "none"]).toContain(entry.status);
      expect(typeof entry.muscle).toBe("string");
      expect(typeof entry.percentage).toBe("number");
      expect(typeof entry.primaryHits).toBe("number");
    }
  });
});

describe("Round 68 — Body Heatmap Component", () => {
  it("body-heatmap.tsx file should exist", () => {
    const filePath = path.join(__dirname, "..", "components", "body-heatmap.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("body-heatmap.tsx should export BodyHeatmap", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "components", "body-heatmap.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function BodyHeatmap");
  });

  it("body-heatmap.tsx should support gender prop", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "components", "body-heatmap.tsx"),
      "utf-8"
    );
    expect(content).toContain("gender");
    expect(content).toContain("male");
    expect(content).toContain("female");
  });

  it("body-heatmap.tsx should support target and balance modes", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "components", "body-heatmap.tsx"),
      "utf-8"
    );
    expect(content).toContain("target");
    expect(content).toContain("balance");
  });

  it("body-heatmap.tsx should have front and back views", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "components", "body-heatmap.tsx"),
      "utf-8"
    );
    expect(content).toContain("Front");
    expect(content).toContain("Back");
  });

  it("body-heatmap.tsx should have legend with over/optimal/under colors", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "components", "body-heatmap.tsx"),
      "utf-8"
    );
    expect(content).toContain("#EF4444"); // over - red
    expect(content).toContain("#22C55E"); // optimal - green
    expect(content).toContain("#3B82F6"); // under - blue
  });
});

describe("Round 68 — Dashboard Integration", () => {
  it("dashboard should import BodyHeatmap", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "index.tsx"),
      "utf-8"
    );
    expect(content).toContain("import { BodyHeatmap }");
  });

  it("dashboard should import muscle-balance functions", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "index.tsx"),
      "utf-8"
    );
    expect(content).toContain("analyzeMuscleBalance");
    expect(content).toContain("generateSuggestions");
    expect(content).toContain("generatePlanChanges");
    expect(content).toContain("applyPlanChanges");
  });

  it("dashboard should have Muscle Balance section", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "index.tsx"),
      "utf-8"
    );
    expect(content).toContain("Muscle Balance");
  });

  it("dashboard should have Suggested Changes section", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "index.tsx"),
      "utf-8"
    );
    expect(content).toContain("Suggested Changes");
  });

  it("dashboard should have Apply to My Plan button", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "index.tsx"),
      "utf-8"
    );
    expect(content).toContain("Apply to My Plan");
  });

  it("dashboard should have balance window selector (7d, 14d, 30d)", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "index.tsx"),
      "utf-8"
    );
    expect(content).toContain("balanceWindow");
    expect(content).toContain("setBalanceWindow");
  });

  it("dashboard should use userGender for body heatmap", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "index.tsx"),
      "utf-8"
    );
    expect(content).toContain("userGender");
    expect(content).toContain("gender={userGender}");
  });
});

describe("Round 68 — Plans Page Integration", () => {
  it("plans.tsx should import BodyHeatmap", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "plans.tsx"),
      "utf-8"
    );
    expect(content).toContain("import { BodyHeatmap }");
  });

  it("plans.tsx should import getTodayTargetMuscles", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "plans.tsx"),
      "utf-8"
    );
    expect(content).toContain("getTodayTargetMuscles");
  });

  it("plans.tsx should have TODAY'S TARGET MUSCLES section", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "plans.tsx"),
      "utf-8"
    );
    expect(content).toContain("TODAY'S TARGET MUSCLES");
  });

  it("plans.tsx should use gender from activeProfile", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "plans.tsx"),
      "utf-8"
    );
    expect(content).toContain("userGender");
  });
});

describe("Round 68 — File Structure", () => {
  const requiredFiles = [
    "lib/muscle-balance.ts",
    "components/body-heatmap.tsx",
  ];

  requiredFiles.forEach((file) => {
    it(`${file} should exist`, () => {
      const filePath = path.join(__dirname, "..", file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
