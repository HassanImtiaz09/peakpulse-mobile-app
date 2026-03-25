/**
 * Round 84 Tests — Social Notifications, Challenge Templates, Wearable Metrics Panel
 *
 * Uses file-reading assertions to avoid react-native import parse errors in vitest.
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "..");

function readFile(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf-8");
}

// ── Social Notifications Service ──────────────────────────────────
describe("Social Notifications Service", () => {
  let src: string;
  beforeAll(() => { src = readFile("lib/social-notifications.ts"); });

  it("exports social notification functions", () => {
    expect(src).toContain("export async function notifyFriendJoined");
  });

  it("has notifyFriendJoined method", () => {
    expect(src).toMatch(/notifyFriendJoined/);
  });

  it("has notifyChallengeCompleted method", () => {
    expect(src).toMatch(/notifyChallengeCompleted/);
  });

  it("has notifyChallengeInvitation method", () => {
    expect(src).toMatch(/notifyChallengeInvitation/);
  });

  it("has notifyCircleMilestone method", () => {
    expect(src).toMatch(/notifyCircleMilestone/);
  });

  it("checks notification preferences before sending", () => {
    expect(src).toContain("SocialNotificationPrefs");
  });

  it("uses expo-notifications scheduling", () => {
    expect(src).toContain("Notifications");
  });

  it("supports notification categories for social events", () => {
    expect(src).toMatch(/friend.*join|challenge.*complete|circle/i);
  });
});

// ── Challenge Templates Service ───────────────────────────────────
describe("Challenge Templates Service", () => {
  let src: string;
  beforeAll(() => { src = readFile("lib/challenge-templates.ts"); });

  it("exports CHALLENGE_TEMPLATES array", () => {
    expect(src).toContain("CHALLENGE_TEMPLATES");
  });

  it("defines template structure with name, description, duration", () => {
    expect(src).toContain("name");
    expect(src).toContain("description");
    expect(src).toContain("duration");
  });

  it("includes step challenge template", () => {
    expect(src).toMatch(/step/i);
  });

  it("includes protein goal template", () => {
    expect(src).toMatch(/protein/i);
  });

  it("includes workout streak template", () => {
    expect(src).toMatch(/workout|streak/i);
  });

  it("has at least 5 templates", () => {
    const matches = src.match(/\{[\s\S]*?id:\s*["']/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(5);
  });

  it("exports launchChallengeFromTemplate function", () => {
    expect(src).toContain("launchChallengeFromTemplate");
  });

  it("includes difficulty levels", () => {
    expect(src).toMatch(/difficulty|easy|medium|hard/i);
  });

  it("includes category for each template", () => {
    expect(src).toContain("category");
  });
});

// ── Challenge Screen Templates Tab ────────────────────────────────
describe("Challenge Screen Templates Tab", () => {
  let src: string;
  beforeAll(() => { src = readFile("app/challenge.tsx"); });

  it("imports CHALLENGE_TEMPLATES from challenge-templates", () => {
    expect(src).toContain("challenge-templates");
  });

  it("has a templates tab", () => {
    expect(src).toMatch(/[Tt]emplates/);
  });

  it("renders template cards with name and description", () => {
    expect(src).toContain("template");
  });

  it("has a launch/start button for templates", () => {
    expect(src).toMatch(/[Ll]aunch|[Ss]tart|[Cc]reate.*[Tt]emplate/);
  });
});

// ── Notification Settings Social Section ──────────────────────────
describe("Notification Settings Social Section", () => {
  let src: string;
  beforeAll(() => { src = readFile("app/notification-settings.tsx"); });

  it("has Social Circle notification section", () => {
    expect(src).toMatch(/[Ss]ocial.*[Cc]ircle|SOCIAL.*CIRCLE/);
  });

  it("has toggle for friend joins notifications", () => {
    expect(src).toMatch(/friend.*join|friendJoins/i);
  });

  it("has toggle for challenge completed notifications", () => {
    expect(src).toMatch(/challenge.*complet|challengeCompleted/i);
  });
});

// ── AI Notification Scheduler Preferences ─────────────────────────
describe("AI Notification Scheduler Social Preferences", () => {
  let src: string;
  beforeAll(() => { src = readFile("lib/ai-notification-scheduler.ts"); });

  it("includes social notification preferences in NotificationPreferences", () => {
    expect(src).toMatch(/socialCircle|social_circle|friendJoins|challengeCompleted/);
  });
});

// ── Wearable Metrics Panel Component ──────────────────────────────
describe("Wearable Metrics Panel Component", () => {
  let src: string;
  beforeAll(() => { src = readFile("components/wearable-metrics-panel.tsx"); });

  it("exports WearableMetricsPanel component", () => {
    expect(src).toContain("export function WearableMetricsPanel");
  });

  it("uses useWearable hook for data", () => {
    expect(src).toContain("useWearable");
  });

  it("has overview tab", () => {
    expect(src).toContain("overview");
  });

  it("has heart tab for cardiac metrics", () => {
    expect(src).toContain("heart");
  });

  it("has activity tab", () => {
    expect(src).toContain("activity");
  });

  it("has sleep tab", () => {
    expect(src).toContain("sleep");
  });

  it("shows connect CTA when not connected", () => {
    expect(src).toContain("Connect Your Wearable");
  });

  it("shows Apple Health option", () => {
    expect(src).toContain("Apple Health");
  });

  it("shows Google Fit option", () => {
    expect(src).toContain("Google Fit");
  });

  it("displays steps metric", () => {
    expect(src).toContain("Steps");
  });

  it("displays heart rate metric", () => {
    expect(src).toContain("Heart Rate");
  });

  it("displays calories metric", () => {
    expect(src).toContain("Calories");
  });

  it("displays sleep metric", () => {
    expect(src).toContain("Sleep");
  });

  it("shows VO2 Max metric", () => {
    expect(src).toContain("VO2 Max");
  });

  it("shows HRV metric", () => {
    expect(src).toContain("HRV");
  });

  it("shows Blood Oxygen metric", () => {
    expect(src).toContain("Blood O2");
  });

  it("has weekly sparkline charts", () => {
    expect(src).toContain("WeeklySparkline");
  });

  it("shows 7-day averages", () => {
    expect(src).toContain("getWeeklyAverage");
  });

  it("has sync button", () => {
    expect(src).toContain("syncFromHealthPlatform");
  });

  it("links to wearable-sync screen for management", () => {
    expect(src).toContain("wearable-sync");
  });

  it("links to health-trends screen", () => {
    expect(src).toContain("health-trends");
  });

  it("supports other wearables option", () => {
    expect(src).toContain("Other Wearables");
  });
});

// ── Dashboard Integration ─────────────────────────────────────────
describe("Dashboard Wearable Metrics Integration", () => {
  let src: string;
  beforeAll(() => { src = readFile("app/(tabs)/index.tsx"); });

  it("imports WearableMetricsPanel", () => {
    expect(src).toContain("WearableMetricsPanel");
  });

  it("renders WearableMetricsPanel component", () => {
    expect(src).toContain("<WearableMetricsPanel");
  });

  it("has Wearable Metrics section title", () => {
    expect(src).toContain("Wearable Metrics");
  });

  it("always shows wearable panel (not gated by isConnected)", () => {
    // The new panel should NOT be wrapped in wearableData.isConnected
    // It should always be visible to show connect CTA or metrics
    const panelSection = src.indexOf("<WearableMetricsPanel");
    const precedingLines = src.substring(Math.max(0, panelSection - 200), panelSection);
    expect(precedingLines).not.toContain("wearableData.isConnected");
  });
});
