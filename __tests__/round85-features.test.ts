/**
 * Round 85 Feature Tests
 *
 * Tests for: Golden backgrounds, Chat service, Wearable Integration,
 * Achievement badges gallery, Challenge templates chat integration.
 */
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

// ── Golden Backgrounds ──────────────────────────────────────────────
describe("Golden Backgrounds Applied Across All Screens", () => {
  it("should have golden-backgrounds constants file", () => {
    expect(fileExists("constants/golden-backgrounds.ts")).toBe(true);
    const src = readFile("constants/golden-backgrounds.ts");
    expect(src).toContain("GOLDEN_SOCIAL");
    expect(src).toContain("GOLDEN_OVERLAY_STYLE");
    expect(src).toContain("cloudfront.net");
  });

  it("should have ImageBackground in dashboard index.tsx", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("ImageBackground");
  });

  it("should have golden backgrounds in social-circle.tsx", () => {
    const src = readFile("app/social-circle.tsx");
    expect(src).toContain("ImageBackground");
    expect(src).toContain("HERO_BG");
  });

  it("should have golden backgrounds in challenge.tsx", () => {
    const src = readFile("app/challenge.tsx");
    expect(src).toContain("ImageBackground");
    expect(src).toContain("HERO_BG");
  });

  it("should have golden backgrounds in weekly-summary.tsx", () => {
    const src = readFile("app/weekly-summary.tsx");
    expect(src).toContain("ImageBackground");
  });

  it("should have golden backgrounds in achievements.tsx", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("ImageBackground");
    expect(src).toContain("GOLDEN_SOCIAL");
  });

  it("should have golden backgrounds in chat.tsx", () => {
    const src = readFile("app/chat.tsx");
    expect(src).toContain("ImageBackground");
    expect(src).toContain("GOLDEN_SOCIAL");
  });

  const screensToCheck = [
    "app/daily-checkin.tsx",
    "app/notification-settings.tsx",
    "app/settings.tsx",
    "app/wearable-sync.tsx",
    "app/workout-history.tsx",
    "app/progress-photos.tsx",
  ];

  screensToCheck.forEach((screen) => {
    it(`should have golden background in ${screen}`, () => {
      if (fileExists(screen)) {
        const src = readFile(screen);
        expect(src).toContain("ImageBackground");
      }
    });
  });
});

// ── Chat Service ────────────────────────────────────────────────────
describe("Chat Service", () => {
  it("should exist as a module", () => {
    expect(fileExists("lib/chat-service.ts")).toBe(true);
  });

  it("should export core chat functions", () => {
    const src = readFile("lib/chat-service.ts");
    expect(src).toContain("export async function getMessages");
    expect(src).toContain("export async function sendMessage");
    expect(src).toContain("export async function addReaction");
    expect(src).toContain("export async function deleteMessage");
    expect(src).toContain("export async function getOrCreateRoom");
    expect(src).toContain("export async function markRoomAsRead");
  });

  it("should export ChatMessage and ChatRoom types", () => {
    const src = readFile("lib/chat-service.ts");
    expect(src).toContain("export interface ChatMessage");
    expect(src).toContain("export interface ChatRoom");
  });

  it("should support message reactions", () => {
    const src = readFile("lib/chat-service.ts");
    expect(src).toContain("reactions");
    expect(src).toContain("QUICK_REACTIONS");
  });

  it("should support reply-to messages", () => {
    const src = readFile("lib/chat-service.ts");
    expect(src).toContain("replyToId");
  });

  it("should support system messages", () => {
    const src = readFile("lib/chat-service.ts");
    expect(src).toContain("sendSystemMessage");
  });

  it("should seed demo chat rooms", () => {
    const src = readFile("lib/chat-service.ts");
    expect(src).toContain("seedChatRoom");
  });

  it("should persist messages in AsyncStorage", () => {
    const src = readFile("lib/chat-service.ts");
    expect(src).toContain("AsyncStorage");
  });
});

// ── Chat Screen ─────────────────────────────────────────────────────
describe("Chat Screen", () => {
  it("should exist as a screen", () => {
    expect(fileExists("app/chat.tsx")).toBe(true);
  });

  it("should accept roomId, roomName, roomType params", () => {
    const src = readFile("app/chat.tsx");
    expect(src).toContain("roomId");
    expect(src).toContain("roomName");
    expect(src).toContain("roomType");
  });

  it("should poll for new messages", () => {
    const src = readFile("app/chat.tsx");
    expect(src).toContain("setInterval");
    expect(src).toContain("3000");
  });

  it("should support message input and send", () => {
    const src = readFile("app/chat.tsx");
    expect(src).toContain("TextInput");
    expect(src).toContain("handleSend");
  });

  it("should support reactions on messages", () => {
    const src = readFile("app/chat.tsx");
    expect(src).toContain("handleReaction");
    expect(src).toContain("QUICK_REACTIONS");
  });

  it("should support reply-to functionality", () => {
    const src = readFile("app/chat.tsx");
    expect(src).toContain("replyTo");
    expect(src).toContain("replyBar");
  });

  it("should support message deletion", () => {
    const src = readFile("app/chat.tsx");
    expect(src).toContain("handleDelete");
  });

  it("should render system messages differently", () => {
    const src = readFile("app/chat.tsx");
    expect(src).toContain("systemMsg");
  });
});

// ── Chat Integration in Social Circle ───────────────────────────────
describe("Chat Integration in Social Circle", () => {
  it("should have Chat tab in social-circle.tsx", () => {
    const src = readFile("app/social-circle.tsx");
    expect(src).toContain('"chat"');
    expect(src).toContain("Chat");
  });

  it("should navigate to chat screen from social circle", () => {
    const src = readFile("app/social-circle.tsx");
    expect(src).toContain('pathname: "/chat"');
    expect(src).toContain("circle");
  });

  it("should show recent messages preview in chat tab", () => {
    const src = readFile("app/social-circle.tsx");
    expect(src).toContain("Recent Messages");
  });
});

// ── Chat Integration in Challenge ───────────────────────────────────
describe("Chat Integration in Challenge", () => {
  it("should have Challenge Chat button on active challenge cards", () => {
    const src = readFile("app/challenge.tsx");
    expect(src).toContain("Challenge Chat");
  });

  it("should navigate to chat screen from challenge", () => {
    const src = readFile("app/challenge.tsx");
    expect(src).toContain('pathname: "/chat"');
    expect(src).toContain("challenge");
  });

  it("should only show chat button on active (not completed) challenges", () => {
    const src = readFile("app/challenge.tsx");
    expect(src).toContain("!isCompleted");
  });
});

// ── Wearable Integration ────────────────────────────────────────────
describe("Wearable Integration", () => {
  it("should be renamed to 'Wearable Integration' in the panel", () => {
    const src = readFile("components/wearable-metrics-panel.tsx");
    expect(src).toContain("Wearable Integration");
    expect(src).not.toContain("Wearable Metrics");
  });

  it("should have dropdown with multiple wearable platforms", () => {
    const src = readFile("components/wearable-metrics-panel.tsx");
    expect(src).toContain("Apple Health");
    expect(src).toContain("Google Fit");
    expect(src).toContain("Fitbit");
    expect(src).toContain("Garmin Connect");
    expect(src).toContain("Samsung Health");
    expect(src).toContain("WHOOP");
    expect(src).toContain("Oura Ring");
  });

  it("should have SELECT YOUR PLATFORM label", () => {
    const src = readFile("components/wearable-metrics-panel.tsx");
    expect(src).toContain("SELECT YOUR PLATFORM");
  });

  it("should show device descriptions for each platform", () => {
    const src = readFile("components/wearable-metrics-panel.tsx");
    expect(src).toContain("Apple Watch, iPhone sensors");
    expect(src).toContain("Pixel Watch, Samsung, Wear OS");
    expect(src).toContain("Charge, Versa, Sense, Inspire");
    expect(src).toContain("Forerunner, Venu, Fenix, Vivoactive");
    expect(src).toContain("Galaxy Watch, Galaxy Ring");
  });

  it("should mention 15-minute auto-sync in info text", () => {
    const src = readFile("components/wearable-metrics-panel.tsx");
    expect(src).toContain("15 minutes");
  });
});

// ── Background Auto-Sync ────────────────────────────────────────────
describe("Background Wearable Auto-Sync", () => {
  it("should have 15-minute auto-sync interval in wearable-context", () => {
    const src = readFile("lib/wearable-context.tsx");
    expect(src).toContain("15 * 60 * 1000");
    expect(src).toContain("SYNC_INTERVAL_MS");
  });

  it("should only auto-sync when permission is granted", () => {
    const src = readFile("lib/wearable-context.tsx");
    expect(src).toContain('permissionStatus !== "granted"');
  });

  it("should clear interval on cleanup", () => {
    const src = readFile("lib/wearable-context.tsx");
    expect(src).toContain("clearInterval");
  });

  it("should also sync on app foreground", () => {
    const src = readFile("lib/wearable-context.tsx");
    expect(src).toContain("AppState");
    expect(src).toContain("foreground");
  });
});

// ── Achievements Gallery ────────────────────────────────────────────
describe("Achievements Gallery", () => {
  it("should exist as a screen", () => {
    expect(fileExists("app/achievements.tsx")).toBe(true);
  });

  it("should have badge categories: all, fitness, nutrition, social, challenges", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain('"all"');
    expect(src).toContain('"fitness"');
    expect(src).toContain('"nutrition"');
    expect(src).toContain('"social"');
    expect(src).toContain('"challenges"');
  });

  it("should have badge rarity tiers", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain('"common"');
    expect(src).toContain('"uncommon"');
    expect(src).toContain('"rare"');
    expect(src).toContain('"epic"');
    expect(src).toContain('"legendary"');
  });

  it("should have at least 25 badges defined", () => {
    const src = readFile("app/achievements.tsx");
    const badgeMatches = src.match(/id: "/g);
    expect(badgeMatches).toBeTruthy();
    expect(badgeMatches!.length).toBeGreaterThanOrEqual(25);
  });

  it("should have trophy case section", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("Trophy");
    expect(src).toContain("trophyCase");
    expect(src).toContain("DEMO_TROPHIES");
  });

  it("should have at least 5 trophies", () => {
    const src = readFile("app/achievements.tsx");
    const trophyMatches = src.match(/id: "t\d+"/g);
    expect(trophyMatches).toBeTruthy();
    expect(trophyMatches!.length).toBeGreaterThanOrEqual(5);
  });

  it("should show overall progress percentage", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("completionPct");
    expect(src).toContain("Achievement Progress");
  });

  it("should have rarity breakdown row", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("rarityRow");
    expect(src).toContain("RARITY_COLORS");
    expect(src).toContain("RARITY_LABELS");
  });

  it("should have badge detail modal", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("selectedBadge");
    expect(src).toContain("Modal");
    expect(src).toContain("modalContent");
  });

  it("should show locked/unlocked state for badges", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("unlocked");
    expect(src).toContain("lockOverlay");
    expect(src).toContain("lock");
  });

  it("should show progress bars for locked badges", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("progressBarFill");
    expect(src).toContain("progressLabel");
  });

  it("should support sharing achievements", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("handleShare");
    expect(src).toContain("Share.share");
  });

  it("should persist achievements in AsyncStorage", () => {
    const src = readFile("app/achievements.tsx");
    expect(src).toContain("AsyncStorage");
    expect(src).toContain("ACHIEVEMENTS_KEY");
  });
});

// ── Dashboard Integration ───────────────────────────────────────────
describe("Dashboard Integration", () => {
  it("should have Achievements in quick actions", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("Achievements");
    expect(src).toContain("/achievements");
  });

  it("should have WearableMetricsPanel imported in dashboard", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("WearableMetricsPanel");
  });
});
