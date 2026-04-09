/**
 * Round 87 — Chat Search, Media Sharing, Notification Badges
 *
 * Tests for:
 * 1. Message search with keyword highlighting and scroll-to
 * 2. Media sharing (image messages) in chat
 * 3. Unread notification badges on Social Circle and Challenge tabs
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

// ── 1. Chat Service — Image Message Support ─────────────────────────────────

describe("Chat Service — Image Message Support", () => {
  const src = readFile("lib/chat-service.ts");

  it("ChatMessage type includes 'image' in type union", () => {
    expect(src).toMatch(/type:\s*["']text["']\s*\|\s*["']system["']/);
    expect(src).toMatch(/["']image["']/);
  });

  it("ChatMessage has optional imageUrl field", () => {
    expect(src).toMatch(/imageUrl\?:\s*string/);
  });

  it("sendMessage accepts imageUrl in options", () => {
    expect(src).toMatch(/options\?.*imageUrl/);
  });

  it("sendMessage sets imageUrl on the message", () => {
    expect(src).toMatch(/imageUrl:\s*options\?\.imageUrl/);
  });

  it("getTotalUnreadCount function is exported", () => {
    expect(src).toMatch(/export\s+async\s+function\s+getTotalUnreadCount/);
  });

  it("getTotalUnreadCount sums unreadCount from all rooms", () => {
    expect(src).toMatch(/rooms\.reduce/);
    expect(src).toMatch(/unreadCount/);
  });
});

// ── 2. Chat Screen — Message Search ─────────────────────────────────────────

describe("Chat Screen — Message Search", () => {
  const src = readFile("app/chat.tsx");

  it("has search state variables", () => {
    expect(src).toMatch(/searchOpen/);
    expect(src).toMatch(/searchQuery/);
    expect(src).toMatch(/searchMatchIndex/);
  });

  it("computes searchMatches from messages filtered by query", () => {
    expect(src).toMatch(/searchMatches/);
    expect(src).toMatch(/toLowerCase\(\)\.includes\(q\)/);
  });

  it("has search open and close handlers", () => {
    expect(src).toMatch(/handleSearchOpen/);
    expect(src).toMatch(/handleSearchClose/);
  });

  it("has search next and previous navigation", () => {
    expect(src).toMatch(/handleSearchNext/);
    expect(src).toMatch(/handleSearchPrev/);
  });

  it("scrolls to matched message index", () => {
    expect(src).toMatch(/scrollToIndex.*searchMatches/);
  });

  it("renders search header with input when search is open", () => {
    expect(src).toMatch(/searchOpen\s*\?/);
    expect(src).toMatch(/searchHeader/);
    expect(src).toMatch(/Search messages/);
  });

  it("shows match count and navigation arrows", () => {
    expect(src).toMatch(/searchCount/);
    expect(src).toMatch(/keyboard-arrow-up/);
    expect(src).toMatch(/keyboard-arrow-down/);
  });

  it("shows 'No results' when query has no matches", () => {
    expect(src).toMatch(/No results/);
    expect(src).toMatch(/searchNoResults/);
  });

  it("has search icon in the header", () => {
    expect(src).toMatch(/onPress={handleSearchOpen}/);
    expect(src).toMatch(/name="search"/);
  });

  it("highlights matched text with different colors for active match", () => {
    expect(src).toMatch(/renderHighlightedText/);
    expect(src).toMatch(/searchHighlight/);
    expect(src).toMatch(/searchActive/);
  });

  it("tracks activeMatchId for the currently focused search result", () => {
    expect(src).toMatch(/activeMatchId/);
  });

  it("handles onScrollToIndexFailed gracefully", () => {
    expect(src).toMatch(/onScrollToIndexFailed/);
  });
});

// ── 3. Chat Screen — Media Sharing ──────────────────────────────────────────

describe("Chat Screen — Media Sharing", () => {
  const src = readFile("app/chat.tsx");

  it("has handleSendImage function", () => {
    expect(src).toMatch(/handleSendImage/);
  });

  it("offers Progress Photo, Workout Screenshot, and Meal Photo options", () => {
    expect(src).toMatch(/Progress Photo/);
    expect(src).toMatch(/Workout Screenshot/);
    expect(src).toMatch(/Meal Photo/);
  });

  it("sends image messages with type 'image' and imageUrl", () => {
    expect(src).toMatch(/sendMessage\(roomId,.*"image"/);
  });

  it("renders image messages with Image component", () => {
    expect(src).toMatch(/chatImage/);
    expect(src).toMatch(/<Image/);
  });

  it("has full-screen image viewer modal", () => {
    expect(src).toMatch(/mediaViewerUrl/);
    expect(src).toMatch(/mediaViewerBg/);
    expect(src).toMatch(/mediaViewerImage/);
    expect(src).toMatch(/mediaViewerClose/);
  });

  it("opens image viewer on tap", () => {
    expect(src).toMatch(/setMediaViewerUrl\(item\.imageUrl/);
  });

  it("has camera/attach button in the input bar", () => {
    expect(src).toMatch(/attachBtn/);
    expect(src).toMatch(/photo-camera/);
    expect(src).toMatch(/onPress={handleSendImage}/);
  });

  it("shows fullscreen icon overlay on image messages", () => {
    expect(src).toMatch(/imageOverlay/);
    expect(src).toMatch(/name="fullscreen"/);
  });

  it("shows photo icon in message metadata for image messages", () => {
    expect(src).toMatch(/isImage.*<MaterialIcons name="photo"/);
  });
});

// ── 4. Social Circle — Unread Badge ─────────────────────────────────────────

describe("Social Circle — Unread Chat Badge", () => {
  const src = readFile("app/social-circle.tsx");

  it("imports getTotalUnreadCount from chat-service", () => {
    expect(src).toMatch(/import\s*{.*getTotalUnreadCount.*}\s*from\s*["']@\/lib\/chat-service["']/);
  });

  it("has chatUnreadCount state", () => {
    expect(src).toMatch(/chatUnreadCount/);
    expect(src).toMatch(/setChatUnreadCount/);
  });

  it("polls unread count every 5 seconds", () => {
    expect(src).toMatch(/setInterval\(fetchUnread,\s*5000\)/);
  });

  it("renders red badge on Chat tab when unreadCount > 0", () => {
    expect(src).toMatch(/chatUnreadCount\s*>\s*0/);
    expect(src).toMatch(/backgroundColor:\s*["']?(?:#EF4444|UI\.red)["']?/);
  });

  it("shows count text capped at 99+", () => {
    expect(src).toMatch(/chatUnreadCount\s*>\s*99\s*\?\s*["']99\+["']/);
  });

  it("clears unread count when Chat tab is selected", () => {
    expect(src).toMatch(/setChatUnreadCount\(0\)/);
  });

  it("cleans up interval on unmount", () => {
    expect(src).toMatch(/clearInterval\(interval\)/);
  });
});

// ── 5. Challenge — Unread Badge ─────────────────────────────────────────────

describe("Challenge — Unread Chat Badge", () => {
  const src = readFile("app/challenge.tsx");

  it("imports getTotalUnreadCount from chat-service", () => {
    expect(src).toMatch(/import\s*{.*getTotalUnreadCount.*}\s*from\s*["']@\/lib\/chat-service["']/);
  });

  it("has chatUnreadCount state", () => {
    expect(src).toMatch(/chatUnreadCount/);
    expect(src).toMatch(/setChatUnreadCount/);
  });

  it("polls unread count every 5 seconds", () => {
    expect(src).toMatch(/setInterval\(fetchUnread,\s*5000\)/);
  });

  it("renders red badge on Active tab when unreadCount > 0", () => {
    expect(src).toMatch(/tab\s*===\s*["']active["']\s*&&\s*chatUnreadCount\s*>\s*0/);
    expect(src).toMatch(/backgroundColor:\s*["']?(?:#EF4444|UI\.red)["']?/);
  });

  it("shows count text capped at 99+", () => {
    expect(src).toMatch(/chatUnreadCount\s*>\s*99\s*\?\s*["']99\+["']/);
  });

  it("cleans up interval on unmount", () => {
    expect(src).toMatch(/clearInterval\(interval\)/);
  });
});

// ── 6. Chat Screen — Existing Features Still Present ────────────────────────

describe("Chat Screen — Existing Features Preserved", () => {
  const src = readFile("app/chat.tsx");

  it("still has read receipts", () => {
    expect(src).toMatch(/getReadReceiptSummary/);
    expect(src).toMatch(/markMessagesAsRead/);
    expect(src).toMatch(/readReceiptTooltip/);
    expect(src).toMatch(/done-all/);
  });

  it("still has typing indicators", () => {
    expect(src).toMatch(/typingText/);
    expect(src).toMatch(/typingBar/);
    expect(src).toMatch(/typingDot/);
    expect(src).toMatch(/formatTypingText/);
  });

  it("still has reactions", () => {
    expect(src).toMatch(/handleReaction/);
    expect(src).toMatch(/QUICK_REACTIONS/);
    expect(src).toMatch(/reactionBadge/);
  });

  it("still has reply functionality", () => {
    expect(src).toMatch(/replyTo/);
    expect(src).toMatch(/replyBar/);
    expect(src).toMatch(/replyPreview/);
  });

  it("still has message deletion", () => {
    expect(src).toMatch(/handleDelete/);
    expect(src).toMatch(/deleteMessage/);
  });

  it("still has golden-themed styling", () => {
    expect(src).toMatch(/GOLDEN_SOCIAL/);
    expect(src).toMatch(/ImageBackground/);
  });

  it("still has 3-second polling interval", () => {
    expect(src).toMatch(/3000/);
  });
});
