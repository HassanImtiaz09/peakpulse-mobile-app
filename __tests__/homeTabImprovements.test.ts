/**
 * Tests for Home Tab Improvements:
 * 1. Today's Workout uses local plan as fallback
 * 2. Muscle Balance uses MuscleSvgDiagram instead of BodyHeatmap
 * 3. Sections 7-13 are behind a collapsible "More" toggle
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

  it("should check schedule[0] from the merged plan", () => {
    expect(homeTabSource).toContain("(workoutPlan ?? localWorkoutPlan)?.schedule?.[0]");
  });

  it("should only show 'Loading your plan' when isPlanGenerating, not when hasLocalWorkoutPlan", () => {
    // The old code had: (hasLocalWorkoutPlan || isPlanGenerating)
    // The new code should only check isPlanGenerating
    expect(homeTabSource).not.toContain(") : (hasLocalWorkoutPlan || isPlanGenerating) ? (");
    expect(homeTabSource).toContain(") : (isPlanGenerating) ? (");
  });
});

describe("Home Tab - Muscle Balance image quality", () => {
  it("should import MuscleSvgDiagram instead of BodyHeatmap", () => {
    expect(homeTabSource).toContain('import { MuscleSvgDiagram }');
    expect(homeTabSource).not.toContain('import { BodyHeatmap }');
  });

  it("should render MuscleSvgDiagram in the Muscle Balance section", () => {
    expect(homeTabSource).toContain("<MuscleSvgDiagram");
  });

  it("should not render BodyHeatmap anywhere", () => {
    expect(homeTabSource).not.toContain("<BodyHeatmap");
  });

  it("should pass primary and secondary muscle groups to MuscleSvgDiagram", () => {
    expect(homeTabSource).toContain("primary={muscleReport.overExercised.concat(muscleReport.optimal)");
    expect(homeTabSource).toContain("secondary={muscleReport.underExercised");
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

  it("should wrap sections 7-13 in showMore conditional", () => {
    expect(homeTabSource).toContain("{showMore && (<>");
  });

  it("should close the showMore fragment", () => {
    expect(homeTabSource).toContain("</>)}");
  });

  it("should keep sections 1-6 always visible (not inside showMore)", () => {
    // The "MORE SECTIONS TOGGLE" comment should appear after the Explore section
    const exploreIdx = homeTabSource.indexOf("SECTION 6: Explore More Grid");
    const moreToggleIdx = homeTabSource.indexOf("MORE SECTIONS TOGGLE");
    const section7Idx = homeTabSource.indexOf("SECTION 7: Wearable Metrics Panel");
    
    expect(exploreIdx).toBeGreaterThan(-1);
    expect(moreToggleIdx).toBeGreaterThan(exploreIdx);
    expect(section7Idx).toBeGreaterThan(moreToggleIdx);
  });

  it("should have haptic feedback on the More toggle", () => {
    // Find the toggle button area
    const toggleArea = homeTabSource.substring(
      homeTabSource.indexOf("MORE SECTIONS TOGGLE"),
      homeTabSource.indexOf("SECTION 7:")
    );
    expect(toggleArea).toContain("Haptics.impactAsync");
  });
});
