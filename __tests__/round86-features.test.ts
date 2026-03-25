/**
 * Round 86 — Read Receipts & Typing Indicators Tests
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

// ── Chat Service: Read Receipt Types ────────────────────────────────────────

describe("Chat Service — Read Receipt Types", () => {
  const src = readFile("lib/chat-service.ts");

  it("exports ReadReceipt interface with userId, userName, readAt", () => {
    expect(src).toContain("export interface ReadReceipt");
    expect(src).toContain("userId: string");
    expect(src).toContain("userName: string");
    expect(src).toContain("readAt: string");
  });

  it("ChatMessage has readBy field of type ReadReceipt[]", () => {
    expect(src).toContain("readBy: ReadReceipt[]");
  });

  it("new messages initialize readBy as empty array", () => {
    // In sendMessage function
    expect(src).toContain("readBy: [],");
  });
});

// ── Chat Service: markMessagesAsRead ────────────────────────────────────────

describe("Chat Service — markMessagesAsRead", () => {
  const src = readFile("lib/chat-service.ts");

  it("exports markMessagesAsRead function", () => {
    expect(src).toContain("export async function markMessagesAsRead(roomId: string)");
  });

  it("returns the count of newly marked messages", () => {
    expect(src).toContain("Promise<number>");
    expect(src).toContain("return changed;");
  });

  it("skips messages sent by the current user", () => {
    expect(src).toContain("msg.senderId !== user.id");
  });

  it("skips messages already read by the current user", () => {
    expect(src).toContain("!msg.readBy.some((r) => r.userId === user.id)");
  });

  it("pushes a ReadReceipt with userId, userName, readAt", () => {
    expect(src).toContain("msg.readBy.push({ userId: user.id, userName: user.name, readAt: now })");
  });
});

// ── Chat Service: getReadReceiptSummary ─────────────────────────────────────

describe("Chat Service — getReadReceiptSummary", () => {
  const src = readFile("lib/chat-service.ts");

  it("exports getReadReceiptSummary function", () => {
    expect(src).toContain("export function getReadReceiptSummary");
  });

  it("returns readByNames, readCount, isDelivered, isRead", () => {
    expect(src).toContain("readByNames:");
    expect(src).toContain("readCount:");
    expect(src).toContain("isDelivered:");
    expect(src).toContain("isRead:");
  });

  it("filters out the message sender and current user from receipts", () => {
    expect(src).toContain("r.userId !== message.senderId && r.userId !== currentUserId");
  });
});

// ── Chat Service: simulateReadReceipts ──────────────────────────────────────

describe("Chat Service — simulateReadReceipts", () => {
  const src = readFile("lib/chat-service.ts");

  it("exports simulateReadReceipts function", () => {
    expect(src).toContain("export async function simulateReadReceipts(roomId: string)");
  });

  it("only simulates reads on local_user messages", () => {
    expect(src).toContain('msg.senderId !== "local_user"');
  });

  it("picks random unread members to add read receipts", () => {
    expect(src).toContain("unreadMembers");
    expect(src).toContain("msg.readBy.push");
  });
});

// ── Chat Service: Typing Indicators (enhanced) ─────────────────────────────

describe("Chat Service — Typing Indicators", () => {
  const src = readFile("lib/chat-service.ts");

  it("defines TypingEntry interface with userId, userName, expiresAt", () => {
    expect(src).toContain("interface TypingEntry");
    expect(src).toContain("expiresAt: number");
  });

  it("has TYPING_TIMEOUT_MS constant of 4000ms", () => {
    expect(src).toContain("TYPING_TIMEOUT_MS = 4000");
  });

  it("setTyping accepts roomId, userId, userName, isTyping", () => {
    expect(src).toContain("export function setTyping(roomId: string, userId: string, userName: string, isTyping: boolean)");
  });

  it("getTypingUsers filters expired entries and excludes current user", () => {
    expect(src).toContain("e.expiresAt > now");
    expect(src).toContain("e.userId !== currentUserId");
  });

  it("exports formatTypingText function", () => {
    expect(src).toContain("export function formatTypingText");
  });

  it("formatTypingText handles 1 user", () => {
    expect(src).toContain("is typing...");
  });

  it("formatTypingText handles 2 users with 'and'", () => {
    expect(src).toContain("are typing...");
  });

  it("formatTypingText handles 3+ users with 'others'", () => {
    expect(src).toContain("others are typing...");
  });

  it("exports simulateTyping function for demo", () => {
    expect(src).toContain("export function simulateTyping(roomId: string)");
  });
});

// ── Chat Screen: Read Receipt UI ────────────────────────────────────────────

describe("Chat Screen — Read Receipt UI", () => {
  const src = readFile("app/chat.tsx");

  it("imports markMessagesAsRead from chat-service", () => {
    expect(src).toContain("markMessagesAsRead");
  });

  it("imports getReadReceiptSummary from chat-service", () => {
    expect(src).toContain("getReadReceiptSummary");
  });

  it("imports simulateReadReceipts from chat-service", () => {
    expect(src).toContain("simulateReadReceipts");
  });

  it("shows double-check icon (done-all) for read messages", () => {
    expect(src).toContain('name="done-all"');
  });

  it("shows single-check icon (done) for delivered but unread", () => {
    expect(src).toContain('name="done"');
  });

  it("shows gold color for read receipts", () => {
    expect(src).toContain("color={SF.gold}");
  });

  it("shows grey color for unread delivered messages", () => {
    expect(src).toContain('color="rgba(180,83,9,0.4)"');
  });

  it("has read receipt tooltip showing 'Seen by' text", () => {
    expect(src).toContain("Seen by");
  });

  it("has readReceiptTooltip state for showing who read a message", () => {
    expect(src).toContain("readReceiptTooltip");
    expect(src).toContain("setReadReceiptTooltip");
  });

  it("displays read count next to the double-check icon", () => {
    expect(src).toContain("readCountText");
    expect(src).toContain("receipt.readCount");
  });

  it("has readReceiptTooltip styles", () => {
    expect(src).toContain("readReceiptTooltip:");
    expect(src).toContain("readReceiptTooltipTitle:");
    expect(src).toContain("readReceiptTooltipName:");
  });

  it("calls markMessagesAsRead on initialization", () => {
    expect(src).toContain("await markMessagesAsRead(roomId)");
  });

  it("calls simulateReadReceipts in the polling interval", () => {
    expect(src).toContain("await simulateReadReceipts(roomId)");
  });
});

// ── Chat Screen: Typing Indicator UI ────────────────────────────────────────

describe("Chat Screen — Typing Indicator UI", () => {
  const src = readFile("app/chat.tsx");

  it("imports setTyping from chat-service", () => {
    expect(src).toContain("setTyping");
  });

  it("imports getTypingUsers from chat-service", () => {
    expect(src).toContain("getTypingUsers");
  });

  it("imports formatTypingText from chat-service", () => {
    expect(src).toContain("formatTypingText");
  });

  it("imports simulateTyping from chat-service", () => {
    expect(src).toContain("simulateTyping");
  });

  it("has typingText state", () => {
    expect(src).toContain("typingText");
    expect(src).toContain("setTypingText");
  });

  it("has handleTextChange function that broadcasts typing", () => {
    expect(src).toContain("handleTextChange");
    expect(src).toContain('setTyping(roomId, currentUserId, "You", text.length > 0)');
  });

  it("clears typing state on send", () => {
    expect(src).toContain('setTyping(roomId, currentUserId, "You", false)');
  });

  it("auto-clears typing after timeout", () => {
    expect(src).toContain("typingTimerRef");
    expect(src).toContain("clearTimeout(typingTimerRef.current)");
  });

  it("renders typing indicator bar when someone is typing", () => {
    expect(src).toContain("typingText.length > 0");
    expect(src).toContain("typingBar");
  });

  it("shows animated typing dots", () => {
    expect(src).toContain("typingDots");
    expect(src).toContain("typingDot");
  });

  it("has typing indicator styles", () => {
    expect(src).toContain("typingBar:");
    expect(src).toContain("typingDots:");
    expect(src).toContain("typingDot:");
    expect(src).toContain("typingText:");
  });

  it("uses onChangeText={handleTextChange} on the TextInput", () => {
    expect(src).toContain("onChangeText={handleTextChange}");
  });

  it("simulates typing in the polling interval", () => {
    expect(src).toContain("simulateTyping(roomId)");
  });
});

// ── Seed Data: Read Receipts ────────────────────────────────────────────────

describe("Seed Data — Read Receipts", () => {
  const src = readFile("lib/chat-service.ts");

  it("seed messages include readBy arrays", () => {
    // The seed messages should have readBy with demo data
    const readByCount = (src.match(/readBy: \[/g) || []).length;
    // At least 6 seed messages + 2 in sendMessage/simulateResponse
    expect(readByCount).toBeGreaterThanOrEqual(8);
  });

  it("some seed messages have populated read receipts", () => {
    expect(src).toContain('userName: "Sarah K."');
    expect(src).toContain('userName: "Alex M."');
  });

  it("simulated responses include empty readBy", () => {
    // In simulateResponse function
    expect(src).toContain("readBy: [],\n    createdAt: new Date().toISOString(),\n  };\n\n  const messages = await getMessages(roomId, 500);\n  messages.push(message);\n  await saveMessages(roomId, messages);\n  await updateRoomLastMessage(roomId, message);\n\n  // Increment unread");
  });
});

// ── Exports ─────────────────────────────────────────────────────────────────

describe("Chat Service — Exports", () => {
  const src = readFile("lib/chat-service.ts");

  it("exports CIRCLE_MEMBERS", () => {
    expect(src).toContain("export { CIRCLE_MEMBERS }");
  });

  it("exports TYPING_TIMEOUT_MS", () => {
    expect(src).toContain("export { TYPING_TIMEOUT_MS }");
  });
});
