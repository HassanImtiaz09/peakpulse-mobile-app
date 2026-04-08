/**
 * Tests for Home Tab Improvements:
 * 1. Today's Workout uses local plan as fallback
 * 2. Muscle Balance uses BodyDiagramInteractive
 * 3. Sections behind a collapsible "More" toggle
 *
 * Updated: Round 95 — aligned with current index.tsx after major refactors.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const homeTabPath = path.join(__dirname, "..", "app", "(tabs)", "index.tsx");
const homeTabSource = fs.readFileSync(homeTabPath, "utf-8");

describe("Home Tab - Today's Workout fix", () => {
  it("should have localWorkoutPlan state variable", () => {
    expect(homeTabSource).toContain("const [localWorkoutPlan, setLocalWorkoutPlan] = useState");
  });

  it("should use localWorkoutPlan as fallback for workout display", () => {
    expect(homeTabSource).toContain("workoutPlan ?? localWorkoutPlan");
  });

  it("should set localWorkoutPlan from AsyncStorage cached plan", () => {
    expect(homeTabSource).toContain("setLocalWorkoutPlan(plan)");
  });

  it("should check schedule[0] from the plan", () => {
    expect(homeTabSource).toContain("schedule[0]");
  });

  it("should only show 'Loading your plan' when isPlanGenerating, not when hasLocalWorkoutPlan", () => {
    expect(homeTabSource).not.toContain(") : (hasLocalWorkoutPlan || isPlanGenerating) ? (");
    expect(homeTabSource).toContain("isPlanGenerating");
  });
});

describe("Home Tab - Muscle Balance diagram", () => {
  it("should import BodyDiagramInteractive for muscle visualization", () => {
    expect(homeTabSource).toContain("import { BodyDiagramInteractive");
  });

  it("should not use legacy BodyHeatmap", () => {
    expect(homeTabSource).not.toContain("import { BodyHeatmap }");
    expect(homeTabSource).not.toContain("<BodyHeatmap");
  });

  it("should track muscle report state", () => {
    expect(homeTabSource).toContain("muscleReport");
  });
});

describe("Home Tab - Collapsible 'More' sections", () => {
  it("should have showMore state variable", () => {
    expect(homeTabSource).toContain("const [showMore, setShowMore] = useState(false)");
  });

  it("should have a 'More' toggle button", () => {
    expect(homeTabSource).toContain('"Show Less"');
    expect(homeTabSource).toContain('"More"');
  });

  it("should wrap later sections in showMore conditional", () => {
    expect(homeTabSource).toContain("{showMore && (<>");
  });

  it("should close the showMore fragment", () => {
    expect(homeTabSource).toContain("</>)}");
  });

  it("should have the MORE SECTIONS TOGGLE comment after Explore section", () => {
    const exploreIdx = homeTabSource.indexOf("SECTION 6: Explore More Grid");
    const moreToggleIdx = homeTabSource.indexOf("MORE SECTIONS TOGGLE");

    expect(exploreIdx).toBeGreaterThan(-1);
    expect(moreToggleIdx).toBeGreaterThan(exploreIdx);
  });

  it("should have haptic feedback on the More toggle", () => {
    const toggleArea = homeTabSource.substring(
      homeTabSource.indexOf("MORE SECTIONS TOGGLE"),
      homeTabSource.indexOf("MORE SECTIONS TOGGLE") + 500
    );
    expect(toggleArea).toContain("Haptics.impactAsync");
  });
});
