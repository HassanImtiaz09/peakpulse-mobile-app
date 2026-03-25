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

// ── Side-View GIF Fix ──────────────────────────────────────────────────────
describe("Side-View GIF Fix", () => {
  it("gif-resolver exports resolveGifAssetOrNull function", () => {
    const src = readFile("lib/gif-resolver.ts");
    expect(src).toContain("resolveGifAssetOrNull");
    expect(src).toContain("export function");
  });

  it("exercise-gif-registry contains side-view entries", () => {
    const src = readFile("lib/exercise-gif-registry.ts");
    expect(src).toContain("side");
    // Should have both front and side entries
    expect(src).toContain("front");
  });

  it("enhanced-gif-player shows 'Side View Not Available' for missing side GIFs", () => {
    const src = readFile("components/enhanced-gif-player.tsx");
    expect(src).toContain("Side View Not Available");
    expect(src).toContain("resolveGifAssetOrNull");
  });

  it("has at least 50 side-view GIF files in assets", () => {
    const gifDir = path.join(ROOT, "assets/exercise-gifs");
    const files = fs.readdirSync(gifDir).filter(f => f.includes("-side") && f.endsWith(".gif"));
    expect(files.length).toBeGreaterThanOrEqual(50);
  });

  it("side-view GIF filenames follow naming convention", () => {
    const gifDir = path.join(ROOT, "assets/exercise-gifs");
    const sideFiles = fs.readdirSync(gifDir).filter(f => f.includes("-side") && f.endsWith(".gif"));
    for (const f of sideFiles) {
      // Side files may have extra suffixes like _dnNh5UH before .gif
      expect(f).toMatch(/-side[^.]*\.gif$/);
    }
  });
});

// ── Profile Subscription Status ────────────────────────────────────────────
describe("Profile Subscription Status Card", () => {
  it("profile.tsx contains SubscriptionStatusCard component", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("SubscriptionStatusCard");
    expect(src).toContain("tier");
    expect(src).toContain("billingCycle");
    expect(src).toContain("expiresAt");
    expect(src).toContain("isTrialActive");
    expect(src).toContain("daysLeftInTrial");
  });

  it("SubscriptionStatusCard shows tier label and status", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("Advanced");
    expect(src).toContain("Basic");
    expect(src).toContain("Free");
    expect(src).toContain("Plan");
    expect(src).toContain("Status");
  });

  it("SubscriptionStatusCard shows trial info when active", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("Free trial active");
    expect(src).toContain("remaining");
  });

  it("SubscriptionStatusCard shows upgrade button for free tier", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("Upgrade");
    expect(src).toContain("onUpgrade");
  });

  it("subscription card shows feature access level", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("Features");
    expect(src).toContain("All");
    expect(src).toContain("Core");
    expect(src).toContain("Limited");
  });
});

// ── Profile Personal Information ───────────────────────────────────────────
describe("Profile Personal Information Card", () => {
  it("profile.tsx contains PersonalInfoCard component", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("PersonalInfoCard");
    expect(src).toContain("Personal Information");
  });

  it("PersonalInfoCard displays all key personal fields", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("Name");
    expect(src).toContain("Email");
    expect(src).toContain("Age");
    expect(src).toContain("Gender");
    expect(src).toContain("Height");
    expect(src).toContain("Weight");
    expect(src).toContain("Goal");
    expect(src).toContain("Style");
    expect(src).toContain("Diet");
    expect(src).toContain("Training");
  });

  it("PersonalInfoCard shows body fat data when available", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("bodyFat");
    expect(src).toContain("targetBF");
    expect(src).toContain("Body Fat");
    expect(src).toContain("Target BF");
  });
});

// ── In-App Feedback Mechanism ──────────────────────────────────────────────
describe("In-App Feedback Screen", () => {
  it("feedback.tsx exists as a screen", () => {
    expect(fileExists("app/feedback.tsx")).toBe(true);
  });

  it("feedback screen has four feedback types", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("Report Bug");
    expect(src).toContain("Suggestion");
    expect(src).toContain("Question");
    expect(src).toContain("Compliment");
  });

  it("feedback screen has category selection per type", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("CATEGORIES");
    expect(src).toContain("Workout Plans");
    expect(src).toContain("New Feature");
    expect(src).toContain("UI/UX Design");
    expect(src).toContain("Getting Started");
    expect(src).toContain("Subscription");
  });

  it("feedback screen has subject and description fields", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("Subject");
    expect(src).toContain("Description");
    expect(src).toContain("maxLength");
    expect(src).toContain("multiline");
  });

  it("feedback screen saves to AsyncStorage history", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("FEEDBACK_STORAGE_KEY");
    expect(src).toContain("AsyncStorage");
    expect(src).toContain("history");
  });

  it("feedback screen has success confirmation", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("Thank You");
    expect(src).toContain("Submit Another");
    expect(src).toContain("Back to Profile");
  });

  it("feedback screen has history view", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("Feedback History");
    expect(src).toContain("No feedback submitted yet");
    expect(src).toContain("submitted");
    expect(src).toContain("acknowledged");
  });

  it("feedback screen uses NanoBanana design tokens", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("#0A0E14");
    expect(src).toContain("#111827");
    expect(src).toContain("#F59E0B");
    expect(src).toContain("BebasNeue_400Regular");
    expect(src).toContain("DMSans_700Bold");
    expect(src).toContain("SpaceMono_400Regular");
  });

  it("profile screen links to feedback screen", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("Send Feedback");
    expect(src).toContain("/feedback");
    expect(src).toContain("Help & Feedback");
  });

  it("feedback screen includes device info note", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("Device info");
    expect(src).toContain("app version");
  });

  it("feedback screen has character count indicators", () => {
    const src = readFile("app/feedback.tsx");
    expect(src).toContain("/100");
    expect(src).toContain("/1000");
  });
});

// ── Integration ────────────────────────────────────────────────────────────
describe("Integration", () => {
  it("profile uses subscription hook with full state", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("useSubscription");
    expect(src).toContain("subscription.tier");
    expect(src).toContain("subscription.billingCycle");
    expect(src).toContain("subscription.isTrialActive");
  });

  it("profile hides upgrade CTA when already on Advanced", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("!subscription.isAdvanced");
  });
});
