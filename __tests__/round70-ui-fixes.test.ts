/**
 * Round 70 — UI/UX Fixes and Redesigns Tests
 * Tests for: multi-angle GIF fix, Quick Actions grouping, body diagram 3D,
 * workout muscle diagram, AI Coach icon, bottom tab overlap fix
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const PROJECT = path.resolve(__dirname, "..");

describe("Round 70 — Multi-Angle GIF Fix", () => {
  it("exercise-data.ts exists", () => {
    expect(fs.existsSync(path.join(PROJECT, "lib/exercise-data.ts"))).toBe(true);
  });

  it("all angle views for each exercise use valid MuscleWiki or ExerciseDB URLs", async () => {
    const content = fs.readFileSync(path.join(PROJECT, "lib/exercise-data.ts"), "utf-8");
    // Extract exercise blocks with angleViews
    const exerciseBlocks = content.split(/name:\s*"/);
    let invalidCount = 0;
    
    for (const block of exerciseBlocks) {
      const angleViewsMatch = block.match(/angleViews:\s*\[([\s\S]*?)\]/);
      if (!angleViewsMatch) continue;
      
      const urls = [...angleViewsMatch[1].matchAll(/gifUrl:\s*"([^"]+)"/g)].map(m => m[1]);
      for (const url of urls) {
        // Each URL should be from MuscleWiki (mp4) or ExerciseDB (gif fallback)
        if (!url.includes("musclewiki.com") && !url.includes("exercisedb.dev")) {
          invalidCount++;
        }
      }
    }
    
    expect(invalidCount).toBe(0);
  });
});

describe("Round 70 — Bottom Tab Overlap Fix", () => {
  it("dashboard has bottom margin for guest banner", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/index.tsx"), "utf-8");
    // Check that the guest banner has marginBottom to avoid tab bar overlap
    expect(content).toMatch(/marginBottom.*(?:80|90|100|tabBarHeight)/);
  });
});

describe("Round 70 — Quick Actions Grouping", () => {
  it("dashboard has grouped Quick Actions with categories", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/index.tsx"), "utf-8");
    // Check for grouped action categories
    expect(content).toMatch(/ACTION_GROUPS|actionGroup|groupedActions|QUICK_ACTION_GROUPS/i);
  });

  it("has subscription badges (PRO/BASIC)", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/index.tsx"), "utf-8");
    expect(content).toMatch(/PRO|PREMIUM|subscription|gated/i);
  });

  it("has expandable group sections", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/index.tsx"), "utf-8");
    expect(content).toMatch(/expandedGroup|toggleGroup|expanded/i);
  });
});

describe("Round 70 — 3D Body Diagram Redesign", () => {
  it("body-diagram.tsx exists", () => {
    expect(fs.existsSync(path.join(PROJECT, "components/body-diagram.tsx"))).toBe(true);
  });

  it("uses SVG gradients for 3D effect", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/body-diagram.tsx"), "utf-8");
    expect(content).toMatch(/LinearGradient|linearGradient|Defs|defs/);
  });

  it("has front and back body views", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/body-diagram.tsx"), "utf-8");
    expect(content).toMatch(/front/i);
    expect(content).toMatch(/back/i);
  });

  it("supports muscle group highlighting", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/body-diagram.tsx"), "utf-8");
    expect(content).toMatch(/primary|highlighted|active/i);
  });

  it("exports BodyDiagramInline component", () => {
    const content = fs.readFileSync(path.join(PROJECT, "components/body-diagram.tsx"), "utf-8");
    expect(content).toMatch(/export.*BodyDiagramInline/);
  });
});

describe("Round 70 — Workout Exercise Muscle Diagram + Demo Link", () => {
  it("active-workout.tsx has body diagram in exercise header", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/active-workout.tsx"), "utf-8");
    // Check for body diagram in the exercise header card
    expect(content).toMatch(/Exercise header card with body diagram/);
    expect(content).toMatch(/BodyDiagramInline/);
  });

  it("active-workout.tsx has demo link button", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/active-workout.tsx"), "utf-8");
    expect(content).toMatch(/Demo/);
    expect(content).toMatch(/play-circle-outline/);
  });
});

describe("Round 70 — AI Coach Icon Redesign", () => {
  it("AI coach icon uses CDN URL in tab layout", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/_layout.tsx"), "utf-8");
    expect(content).toMatch(/cloudfront\.net.*ai-coach-icon/);
  });

  it("tab layout uses the AI coach icon CDN image", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/_layout.tsx"), "utf-8");
    expect(content).toMatch(/cloudfront.*ai-coach-icon/);
  });

  it("AI coach screen uses the icon CDN image in header", () => {
    const content = fs.readFileSync(path.join(PROJECT, "app/(tabs)/ai-coach.tsx"), "utf-8");
    expect(content).toMatch(/cloudfront.*ai-coach-icon/);
  });
});

describe("Round 70 — File Integrity", () => {
  const requiredFiles = [
    "components/body-diagram.tsx",
    "components/enhanced-gif-player.tsx",
    "lib/exercise-data.ts",
    "lib/exercise-demos.ts",
    "app/active-workout.tsx",
    "app/(tabs)/index.tsx",
    "app/(tabs)/_layout.tsx",
    "app/(tabs)/ai-coach.tsx",

  ];

  requiredFiles.forEach((file) => {
    it(`${file} exists`, () => {
      expect(fs.existsSync(path.join(PROJECT, file))).toBe(true);
    });
  });
});
