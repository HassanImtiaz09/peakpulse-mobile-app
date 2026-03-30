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

// ── MP4 Video Player Architecture ──────────────────────────────────────────────
describe("MP4 Video Player Architecture", () => {
  it("exercise-gif-registry.ts exports getExerciseVideoUrl function", () => {
    const src = readFile("lib/exercise-gif-registry.ts");
    expect(src).toContain("getExerciseVideoUrl");
    expect(src).toContain("export function");
  });

  it("exercise-gif-registry contains MP4 video URLs from musclewiki", () => {
    const src = readFile("lib/exercise-gif-registry.ts");
    expect(src).toContain("musclewiki.com");
    expect(src).toContain(".mp4");
    // Should not contain old CDN links
    expect(src).not.toContain("manuscdn.com");
  });

  it("enhanced-gif-player uses GifWebViewPlayer with exerciseName and speed control", () => {
    const src = readFile("components/enhanced-gif-player.tsx");
    expect(src).toContain("GifWebViewPlayer");
    expect(src).toContain("exerciseName");
    expect(src).toContain("speed");
    expect(src).not.toContain("angleViews");
    expect(src).not.toContain("resolveGifAsset");
  });

  it("exercise-gif-registry has approximately 149 video entries", () => {
    const src = readFile("lib/exercise-gif-registry.ts");
    const matches = src.match(/mw\(/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(149);
  });

  it("gif-cache has been replaced by video-cache functions", () => {
    const src = readFile("lib/gif-cache.ts");
    expect(src).toContain("resolveVideoUri");
    expect(src).toContain("prefetchExerciseVideos");
    expect(src).toContain("clearVideoCache");
    expect(src).toContain("EXERCISE_GIFS");
    expect(src).not.toContain("preCacheWorkoutGifs");
    expect(src).not.toContain("getCachedGifUri");
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
    expect(src).toContain("Pro");
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
    expect(src).toContain("Settings & Preferences");
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
    expect(src).toContain("!subscription.isPro");
  });
});
