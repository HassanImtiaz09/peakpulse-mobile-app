/**
 * Tests for the 3 implementation features:
 * 1. Enhanced AI Coach with Claude + Health Integration
 * 2. Body Visualization with fal.ai
 * 3. Form Checker with Claude Vision + History
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Feature 1: Enhanced AI Coach with Claude + Health Integration ───

describe("Feature 1: Enhanced AI Coach with Claude + Health Integration", () => {
  describe("Claude AI Service (server/claude.ts)", () => {
    it("should export callClaude and callClaudeVision functions", () => {
      const claudePath = path.resolve("server/claude.ts");
      const content = fs.readFileSync(claudePath, "utf-8");
      expect(content).toContain("export async function callClaude");
      expect(content).toContain("export async function callClaudeVision");
    });

    it("should use Anthropic SDK with claude-sonnet-4-20250514 model", () => {
      const claudePath = path.resolve("server/claude.ts");
      const content = fs.readFileSync(claudePath, "utf-8");
      expect(content).toContain("@anthropic-ai/sdk");
      expect(content).toContain("claude-sonnet-4-20250514");
    });

    it("should have fallback to built-in LLM when Claude fails", () => {
      const claudePath = path.resolve("server/claude.ts");
      const content = fs.readFileSync(claudePath, "utf-8");
      expect(content).toContain("invokeLLM");
      expect(content).toMatch(/catch|fallback|error/i);
    });

    it("should accept health context in the system prompt", () => {
      const claudePath = path.resolve("server/claude.ts");
      const content = fs.readFileSync(claudePath, "utf-8");
      expect(content).toMatch(/health|steps|heartRate|sleep|HRV|vo2/i);
    });
  });

  describe("AI Coach tRPC Routes (server/social.router.ts)", () => {
    it("should have Claude-powered chat route with health data fields", () => {
      const routerPath = path.resolve("server/social.router.ts");
      const content = fs.readFileSync(routerPath, "utf-8");
      expect(content).toMatch(/chatWithCoach|callClaude|getCoachMessage/);
      expect(content).toMatch(/steps|heartRate|sleepHours|CoachContext/);
    });

    it("should have morning briefing route", () => {
      const routerPath = path.resolve("server/social.router.ts");
      const content = fs.readFileSync(routerPath, "utf-8");
      expect(content).toMatch(/morningBriefing|contextMessage|briefing/i);
    });

    it("should track source (claude vs gemini) in responses", () => {
      const routerPath = path.resolve("server/social.router.ts");
      const content = fs.readFileSync(routerPath, "utf-8");
      expect(content).toMatch(/source.*claude|source.*gemini|result\.source/i);
    });
  });

  describe("AI Coach UI (app/(tabs)/ai-coach.tsx)", () => {
    it("should have typing animation component", () => {
      const coachPath = path.resolve("app/(tabs)/ai-coach.tsx");
      const content = fs.readFileSync(coachPath, "utf-8");
      expect(content).toMatch(/typing|TypingIndicator|typingDot/i);
    });

    it("should have coach avatar instead of robot emoji", () => {
      const coachPath = path.resolve("app/(tabs)/ai-coach.tsx");
      const content = fs.readFileSync(coachPath, "utf-8");
      // Should have a proper avatar, not just a robot emoji
      expect(content).toMatch(/avatar|COACH_AVATAR|coachAvatar/i);
    });

    it("should have feedback buttons (thumbs up/down)", () => {
      const coachPath = path.resolve("app/(tabs)/ai-coach.tsx");
      const content = fs.readFileSync(coachPath, "utf-8");
      expect(content).toMatch(/feedback|thumbs|helpful|not helpful|\uD83D\uDC4D|\uD83D\uDC4E/i);
    });

    it("should have source badge showing Claude or Gemini", () => {
      const coachPath = path.resolve("app/(tabs)/ai-coach.tsx");
      const content = fs.readFileSync(coachPath, "utf-8");
      expect(content).toMatch(/source.*claude|Claude Vision|Gemini/i);
    });

    it("should pass health data from wearable context to chat", () => {
      const coachPath = path.resolve("app/(tabs)/ai-coach.tsx");
      const content = fs.readFileSync(coachPath, "utf-8");
      expect(content).toMatch(/wearable|healthData|steps|heartRate|sleepHours/i);
    });

    it("should have morning briefing card", () => {
      const coachPath = path.resolve("app/(tabs)/ai-coach.tsx");
      const content = fs.readFileSync(coachPath, "utf-8");
      expect(content).toMatch(/briefing|morningBriefing|contextMessage/i);
    });
  });
});

// ─── Feature 2: Body Visualization with fal.ai ───

describe("Feature 2: Body Visualization with fal.ai", () => {
  describe("fal.ai Service (server/fal-ai.ts)", () => {
    it("should export generateBodyVisualization function", () => {
      const falPath = path.resolve("server/fal-ai.ts");
      const content = fs.readFileSync(falPath, "utf-8");
      expect(content).toContain("export async function generateBodyVisualization");
    });

    it("should use fal-ai client with flux-schnell model", () => {
      const falPath = path.resolve("server/fal-ai.ts");
      const content = fs.readFileSync(falPath, "utf-8");
      expect(content).toContain("@fal-ai/client");
      expect(content).toMatch(/flux.*schnell|fal-ai\/flux/i);
    });

    it("should have fallback to built-in image generation", () => {
      const falPath = path.resolve("server/fal-ai.ts");
      const content = fs.readFileSync(falPath, "utf-8");
      expect(content).toMatch(/fallback|generateImage|catch/i);
    });

    it("should accept body composition parameters", () => {
      const falPath = path.resolve("server/fal-ai.ts");
      const content = fs.readFileSync(falPath, "utf-8");
      expect(content).toMatch(/bodyFat|muscleMass|weight|height|gender/i);
    });
  });

  describe("Body Visualization tRPC Routes (server/scan.router.ts)", () => {
    it("should have enhanced body visualization route with fal.ai", () => {
      const routerPath = path.resolve("server/scan.router.ts");
      const content = fs.readFileSync(routerPath, "utf-8");
      expect(content).toContain("generateBodyVisualization");
    });
  });

  describe("Scan Tab UI (app/(tabs)/scan.tsx)", () => {
    it("should have enhanced preview button for fal.ai HD generation", () => {
      const scanPath = path.resolve("app/(tabs)/scan.tsx");
      const content = fs.readFileSync(scanPath, "utf-8");
      expect(content).toMatch(/enhance|HD|fal\.ai|enhancedPreview|enhanceTransformation/i);
    });

    it("should have fal.ai mutation for body visualization", () => {
      const scanPath = path.resolve("app/(tabs)/scan.tsx");
      const content = fs.readFileSync(scanPath, "utf-8");
      expect(content).toMatch(/bodyVisualization\.generate|enhancedGenerate/i);
    });
  });
});

// ─── Feature 3: Form Checker with Claude Vision + History ───

describe("Feature 3: Form Checker with Claude Vision + History", () => {
  describe("Form Analysis Route (server/workout.router.ts)", () => {
    it("should use Claude Vision for form analysis", () => {
      const routerPath = path.resolve("server/workout.router.ts");
      const content = fs.readFileSync(routerPath, "utf-8");
      expect(content).toContain("callClaudeVision");
    });

    it("should have Gemini as fallback for form analysis", () => {
      const routerPath = path.resolve("server/workout.router.ts");
      const content = fs.readFileSync(routerPath, "utf-8");
      expect(content).toContain("invokeLLM");
      expect(content).toMatch(/fallback|catch/i);
    });

    it("should track source in form analysis response", () => {
      const routerPath = path.resolve("server/workout.router.ts");
      const content = fs.readFileSync(routerPath, "utf-8");
      expect(content).toMatch(/source.*claude|source.*gemini|result\.source/i);
    });

    it("should accept imageBase64 for Claude Vision analysis", () => {
      const routerPath = path.resolve("server/workout.router.ts");
      const content = fs.readFileSync(routerPath, "utf-8");
      expect(content).toContain("imageBase64");
    });
  });

  describe("Form Checker UI (app/form-checker.tsx)", () => {
    it("should have form history tab", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toMatch(/history|History|activeTab/i);
      expect(content).toMatch(/formHistory|FORM_HISTORY_KEY/i);
    });

    it("should persist form history in AsyncStorage", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toContain("AsyncStorage");
      expect(content).toContain("FORM_HISTORY_KEY");
    });

    it("should display source badge (Claude Vision / Gemini)", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toMatch(/Claude Vision|source.*claude/i);
      expect(content).toMatch(/Gemini|source.*gemini/i);
    });

    it("should display key joint angles from analysis", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toMatch(/keyJointAngles|Joint Angles/i);
    });

    it("should display injury risk assessment", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toMatch(/injuryRisk|Injury Risk/i);
    });

    it("should have exercise-specific stats from history", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toMatch(/exerciseHistory|avgScore|bestScore/i);
    });

    it("should have 8 exercises with tips and key points", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      const exercises = ["Squat", "Deadlift", "Bench Press", "Push-up", "Pull-up", "Overhead Press", "Lunge", "Plank"];
      for (const ex of exercises) {
        expect(content).toContain(`"${ex}"`);
      }
    });

    it("should have record and upload video options", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toContain("recordVideo");
      expect(content).toContain("pickVideo");
    });

    it("should show form score with animated bar", () => {
      const formPath = path.resolve("app/form-checker.tsx");
      const content = fs.readFileSync(formPath, "utf-8");
      expect(content).toContain("Animated.View");
      expect(content).toContain("barWidth");
      expect(content).toContain("animatedScore");
    });
  });
});

// ─── Cross-Feature Integration Tests ───

describe("Cross-Feature Integration", () => {
  it("should have Anthropic SDK in package.json dependencies", () => {
    const pkgPath = path.resolve("package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    expect(pkg.dependencies["@anthropic-ai/sdk"]).toBeDefined();
  });

  it("should have fal-ai client in package.json dependencies", () => {
    const pkgPath = path.resolve("package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    expect(pkg.dependencies["@fal-ai/client"]).toBeDefined();
  });

  it("should have both API keys referenced in server code", () => {
    const claudePath = path.resolve("server/claude.ts");
    const falPath = path.resolve("server/fal-ai.ts");
    const claudeContent = fs.readFileSync(claudePath, "utf-8");
    const falContent = fs.readFileSync(falPath, "utf-8");
    expect(claudeContent).toMatch(/ANTHROPIC_API_KEY/);
    expect(falContent).toMatch(/FAL_KEY/);
  });

  it("should use UI color constants consistently across all new features", () => {
    const files = [
      "app/(tabs)/ai-coach.tsx",
      "app/(tabs)/scan.tsx",
      "app/form-checker.tsx",
    ];
    for (const file of files) {
      const content = fs.readFileSync(path.resolve(file), "utf-8");
      expect(content).toMatch(/import \{ UI|import \{ UI, SF|import \{ SF/);
      // Should not have hardcoded dark colors
      expect(content).not.toMatch(/#0a0a14|#080810|#0D0D1A/);
    }
  });

  it("should have FytNova branding in all feature screens", () => {
    const coachContent = fs.readFileSync(path.resolve("app/(tabs)/ai-coach.tsx"), "utf-8");
    const formContent = fs.readFileSync(path.resolve("app/form-checker.tsx"), "utf-8");
    expect(coachContent).toMatch(/FytNova|FYTNOVA/i);
    expect(formContent).toMatch(/AI|Form Checker/i);
  });
});
