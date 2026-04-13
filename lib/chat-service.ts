/**
 * Chat Service — Real-time messaging for Social Circles and Challenges
 *
 * Uses AsyncStorage for local persistence with polling-based updates.
 * Architecture is ready to migrate to server-side when auth is enabled.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: "text" | "system" | "achievement" | "challenge_update" | "image";
  imageUrl?: string;
  replyToId?: string;
  reactions: Record<string, string[]>; // emoji -> userId[]
  readBy: ReadReceipt[]; // per-message read receipts
  createdAt: string;
  editedAt?: string;
  deleted?: boolean;
}

export interface ReadReceipt {
  userId: string;
  userName: string;
  readAt: string;
}

export interface ChatRoom {
  id: string;
  type: "circle" | "challenge";
  name: string;
  description?: string;
  memberIds: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  pinnedMessageId?: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
  role: "admin" | "member";
}

export type ChatEventType = "new_message" | "message_edited" | "message_deleted" | "reaction_added" | "typing";

export interface ChatEvent {
  type: ChatEventType;
  roomId: string;
  data: any;
  timestamp: string;
}

// ── Storage Keys ─────────────────────────────────────────────────────────────

const CHAT_ROOMS_KEY = "@peakpulse_chat_rooms";
const CHAT_MESSAGES_PREFIX = "@peakpulse_chat_msgs_";
const CHAT_EVENTS_PREFIX = "@peakpulse_chat_events_";
const CHAT_READ_PREFIX = "@peakpulse_chat_read_";
const CURRENT_USER_KEY = "@peakpulse_chat_user";

// ── Current User ─────────────────────────────────────────────────────────────

export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
}

const DEFAULT_USER: ChatUser = {
  id: "local_user",
  name: "You",
  avatar: "💪",
};

export async function getChatUser(): Promise<ChatUser> {
  try {
    const data = await AsyncStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

export async function setChatUser(user: ChatUser): Promise<void> {
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

// ── Room Management ──────────────────────────────────────────────────────────

export async function getChatRooms(): Promise<ChatRoom[]> {
  try {
    const data = await AsyncStorage.getItem(CHAT_ROOMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveChatRooms(rooms: ChatRoom[]): Promise<void> {
  await AsyncStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(rooms));
}

export async function getOrCreateRoom(
  id: string,
  type: "circle" | "challenge",
  name: string,
  description?: string,
): Promise<ChatRoom> {
  const rooms = await getChatRooms();
  const existing = rooms.find((r) => r.id === id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const room: ChatRoom = {
    id,
    type,
    name,
    description,
    memberIds: ["local_user"],
    unreadCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  rooms.push(room);
  await saveChatRooms(rooms);
  return room;
}

export async function getRoomById(roomId: string): Promise<ChatRoom | null> {
  const rooms = await getChatRooms();
  return rooms.find((r) => r.id === roomId) ?? null;
}

export async function updateRoomLastMessage(roomId: string, message: ChatMessage): Promise<void> {
  const rooms = await getChatRooms();
  const idx = rooms.findIndex((r) => r.id === roomId);
  if (idx >= 0) {
    rooms[idx].lastMessage = message;
    rooms[idx].updatedAt = new Date().toISOString();
    await saveChatRooms(rooms);
  }
}

// ── Message Management ───────────────────────────────────────────────────────

export async function getMessages(roomId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
  try {
    const data = await AsyncStorage.getItem(CHAT_MESSAGES_PREFIX + roomId);
    let messages: ChatMessage[] = data ? JSON.parse(data) : [];

    if (before) {
      messages = messages.filter((m) => m.createdAt < before);
    }

    // Sort by newest first, then take limit
    messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return messages.slice(0, limit).reverse(); // Return in chronological order
  } catch {
    return [];
  }
}

async function saveMessages(roomId: string, messages: ChatMessage[]): Promise<void> {
  // Keep only last 500 messages per room
  const trimmed = messages.slice(-500);
  await AsyncStorage.setItem(CHAT_MESSAGES_PREFIX + roomId, JSON.stringify(trimmed));
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function sendMessage(
  roomId: string,
  text: string,
  type: ChatMessage["type"] = "text",
  options?: { imageUrl?: string; replyToId?: string },
): Promise<ChatMessage> {
  const user = await getChatUser();
  const message: ChatMessage = {
    id: generateId(),
    roomId,
    senderId: user.id,
    senderName: user.name,
    senderAvatar: user.avatar,
    text,
    type,
    imageUrl: options?.imageUrl,
    replyToId: options?.replyToId,
    reactions: {},
    readBy: [],
    createdAt: new Date().toISOString(),
  };

  const messages = await getMessages(roomId, 500);
  messages.push(message);
  await saveMessages(roomId, messages);
  await updateRoomLastMessage(roomId, message);

  // Simulate circle member responses for demo
  if (type === "text" && Math.random() > 0.6) {
    setTimeout(() => simulateResponse(roomId, text), 2000 + Math.random() * 5000);
  }

  return message;
}

export async function sendSystemMessage(roomId: string, text: string): Promise<ChatMessage> {
  return sendMessage(roomId, text, "system");
}

export async function editMessage(roomId: string, messageId: string, newText: string): Promise<void> {
  const data = await AsyncStorage.getItem(CHAT_MESSAGES_PREFIX + roomId);
  if (!data) return;
  const messages: ChatMessage[] = JSON.parse(data);
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx >= 0) {
    messages[idx].text = newText;
    messages[idx].editedAt = new Date().toISOString();
    await saveMessages(roomId, messages);
  }
}

export async function deleteMessage(roomId: string, messageId: string): Promise<void> {
  const data = await AsyncStorage.getItem(CHAT_MESSAGES_PREFIX + roomId);
  if (!data) return;
  const messages: ChatMessage[] = JSON.parse(data);
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx >= 0) {
    messages[idx].deleted = true;
    messages[idx].text = "This message was deleted";
    await saveMessages(roomId, messages);
  }
}

export async function addReaction(roomId: string, messageId: string, emoji: string): Promise<void> {
  const user = await getChatUser();
  const data = await AsyncStorage.getItem(CHAT_MESSAGES_PREFIX + roomId);
  if (!data) return;
  const messages: ChatMessage[] = JSON.parse(data);
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx >= 0) {
    if (!messages[idx].reactions[emoji]) {
      messages[idx].reactions[emoji] = [];
    }
    const userIdx = messages[idx].reactions[emoji].indexOf(user.id);
    if (userIdx >= 0) {
      messages[idx].reactions[emoji].splice(userIdx, 1);
      if (messages[idx].reactions[emoji].length === 0) {
        delete messages[idx].reactions[emoji];
      }
    } else {
      messages[idx].reactions[emoji].push(user.id);
    }
    await saveMessages(roomId, messages);
  }
}

// ── Read Tracking ────────────────────────────────────────────────────────────

export async function markRoomAsRead(roomId: string): Promise<void> {
  await AsyncStorage.setItem(CHAT_READ_PREFIX + roomId, new Date().toISOString());
  const rooms = await getChatRooms();
  const idx = rooms.findIndex((r) => r.id === roomId);
  if (idx >= 0) {
    rooms[idx].unreadCount = 0;
    await saveChatRooms(rooms);
  }
}

export async function getLastReadTimestamp(roomId: string): Promise<string | null> {
  return AsyncStorage.getItem(CHAT_READ_PREFIX + roomId);
}

// ── Simulated Responses (for demo) ──────────────────────────────────────────

const CIRCLE_MEMBERS = [
  { id: "member_alex", name: "Alex M.", avatar: "💪" },
  { id: "member_sarah", name: "Sarah K.", avatar: "🏃" },
  { id: "member_james", name: "James T.", avatar: "🎯" },
  { id: "member_priya", name: "Priya R.", avatar: "🌟" },
  { id: "member_marcus", name: "Marcus L.", avatar: "🔥" },
];

const RESPONSE_TEMPLATES = [
  "Nice work! Keep it up 💪",
  "That's amazing progress!",
  "You're crushing it! 🔥",
  "Wow, inspiring stuff!",
  "Let's gooo! 🚀",
  "Great job! I need to step up my game too",
  "This motivates me so much 🙌",
  "Consistency is key! You're proving it",
  "Goals! 💯",
  "Love seeing this kind of dedication",
  "You're an inspiration to the whole circle!",
  "Keep pushing! We're all in this together 💪",
  "That's what I'm talking about!",
  "Incredible! How long did it take you?",
  "I'm so proud of this group 🥹",
];

async function simulateResponse(roomId: string, _triggerText: string): Promise<void> {
  const member = CIRCLE_MEMBERS[Math.floor(Math.random() * CIRCLE_MEMBERS.length)];
  const response = RESPONSE_TEMPLATES[Math.floor(Math.random() * RESPONSE_TEMPLATES.length)];

  const message: ChatMessage = {
    id: generateId(),
    roomId,
    senderId: member.id,
    senderName: member.name,
    senderAvatar: member.avatar,
    text: response,
    type: "text",
    reactions: {},
    readBy: [],
    createdAt: new Date().toISOString(),
  };

  const messages = await getMessages(roomId, 500);
  messages.push(message);
  await saveMessages(roomId, messages);
  await updateRoomLastMessage(roomId, message);

  // Increment unread
  const rooms = await getChatRooms();
  const idx = rooms.findIndex((r) => r.id === roomId);
  if (idx >= 0) {
    rooms[idx].unreadCount = (rooms[idx].unreadCount || 0) + 1;
    await saveChatRooms(rooms);
  }
}

// ── Seed Data ────────────────────────────────────────────────────────────────

export async function seedChatRoom(roomId: string, roomName: string, type: "circle" | "challenge"): Promise<void> {
  const room = await getOrCreateRoom(roomId, type, roomName);
  const existingMessages = await getMessages(roomId, 1);
  if (existingMessages.length > 0) return; // Already seeded

  const now = Date.now();
  const seedMessages: ChatMessage[] = [
    {
      id: generateId(),
      roomId,
      senderId: "system",
      senderName: "FytNova",
      senderAvatar: "⚡",
      text: `Welcome to ${roomName}! This is your group chat. Share progress, motivate each other, and stay accountable together.`,
      type: "system",
      reactions: {},
      readBy: [],
      createdAt: new Date(now - 86400000).toISOString(),
    },
    {
      id: generateId(),
      roomId,
      senderId: "member_alex",
      senderName: "Alex M.",
      senderAvatar: "💪",
      text: "Hey everyone! Excited to be part of this group. Let's crush our goals together! 🔥",
      type: "text",
      reactions: { "💪": ["member_sarah", "member_james"], "🔥": ["member_priya"] },
      readBy: [
        { userId: "member_sarah", userName: "Sarah K.", readAt: new Date(now - 80000000).toISOString() },
        { userId: "member_james", userName: "James T.", readAt: new Date(now - 79000000).toISOString() },
        { userId: "member_priya", userName: "Priya R.", readAt: new Date(now - 78000000).toISOString() },
        { userId: "member_marcus", userName: "Marcus L.", readAt: new Date(now - 77000000).toISOString() },
      ],
      createdAt: new Date(now - 82800000).toISOString(),
    },
    {
      id: generateId(),
      roomId,
      senderId: "member_sarah",
      senderName: "Sarah K.",
      senderAvatar: "🏃",
      text: "Just finished my morning run — 5K in 28 minutes! New personal best 🎉",
      type: "text",
      reactions: { "🎉": ["member_alex", "member_marcus"], "👏": ["member_james", "member_priya"] },
      readBy: [
        { userId: "member_alex", userName: "Alex M.", readAt: new Date(now - 70000000).toISOString() },
        { userId: "member_james", userName: "James T.", readAt: new Date(now - 69000000).toISOString() },
        { userId: "member_priya", userName: "Priya R.", readAt: new Date(now - 68500000).toISOString() },
      ],
      createdAt: new Date(now - 72000000).toISOString(),
    },
    {
      id: generateId(),
      roomId,
      senderId: "member_james",
      senderName: "James T.",
      senderAvatar: "🎯",
      text: "Amazing Sarah! I hit a new squat PR today — 120kg! The form checker really helped me fix my depth.",
      type: "text",
      reactions: { "💪": ["member_alex", "member_sarah"] },
      readBy: [
        { userId: "member_alex", userName: "Alex M.", readAt: new Date(now - 66000000).toISOString() },
        { userId: "member_sarah", userName: "Sarah K.", readAt: new Date(now - 65000000).toISOString() },
      ],
      createdAt: new Date(now - 68400000).toISOString(),
    },
    {
      id: generateId(),
      roomId,
      senderId: "member_priya",
      senderName: "Priya R.",
      senderAvatar: "🌟",
      text: "Love the energy in this group! Who's up for a 7-day step challenge? 10K steps daily minimum 🚶‍♀️",
      type: "text",
      reactions: { "🙋": ["member_alex", "member_sarah", "member_marcus"], "✅": ["member_james"] },
      readBy: [
        { userId: "member_alex", userName: "Alex M.", readAt: new Date(now - 40000000).toISOString() },
        { userId: "member_marcus", userName: "Marcus L.", readAt: new Date(now - 39000000).toISOString() },
      ],
      createdAt: new Date(now - 43200000).toISOString(),
    },
    {
      id: generateId(),
      roomId,
      senderId: "member_marcus",
      senderName: "Marcus L.",
      senderAvatar: "🔥",
      text: "Count me in! Also, meal prep Sunday is tomorrow — anyone sharing their plans?",
      type: "text",
      reactions: { "🍽️": ["member_priya", "member_sarah"] },
      readBy: [],
      createdAt: new Date(now - 21600000).toISOString(),
    },
  ];

  await saveMessages(roomId, seedMessages);
  await updateRoomLastMessage(roomId, seedMessages[seedMessages.length - 1]);
}

// ── Quick Reactions ──────────────────────────────────────────────────────────

export const QUICK_REACTIONS = ["💪", "🔥", "👏", "🎉", "❤️", "😂", "🙌", "💯"];

// ── Read Receipts (per-message) ──────────────────────────────────────────────

/**
 * Mark all messages in a room as read by the current user.
 * Updates the readBy array on each message that hasn't been read yet.
 */
export async function markMessagesAsRead(roomId: string): Promise<number> {
  const user = await getChatUser();
  const data = await AsyncStorage.getItem(CHAT_MESSAGES_PREFIX + roomId);
  if (!data) return 0;
  const messages: ChatMessage[] = JSON.parse(data);
  let changed = 0;
  const now = new Date().toISOString();
  for (const msg of messages) {
    if (!msg.readBy) msg.readBy = [];
    if (msg.senderId !== user.id && !msg.readBy.some((r) => r.userId === user.id)) {
      msg.readBy.push({ userId: user.id, userName: user.name, readAt: now });
      changed++;
    }
  }
  if (changed > 0) {
    await saveMessages(roomId, messages);
  }
  // Also clear room-level unread
  await markRoomAsRead(roomId);
  return changed;
}

/**
 * Get the read receipt summary for a specific message.
 */
export function getReadReceiptSummary(
  message: ChatMessage,
  currentUserId: string,
): { readByNames: string[]; readCount: number; isDelivered: boolean; isRead: boolean } {
  const receipts = (message.readBy ?? []).filter(
    (r) => r.userId !== message.senderId && r.userId !== currentUserId,
  );
  return {
    readByNames: receipts.map((r) => r.userName),
    readCount: receipts.length,
    isDelivered: true, // all local messages are delivered
    isRead: receipts.length > 0,
  };
}

/**
 * Simulate other members reading messages (for demo).
 * Called periodically to create realistic read receipts on the user's messages.
 */
export async function simulateReadReceipts(roomId: string): Promise<void> {
  if (Math.random() > 0.4) return; // 40% chance per poll
  const data = await AsyncStorage.getItem(CHAT_MESSAGES_PREFIX + roomId);
  if (!data) return;
  const messages: ChatMessage[] = JSON.parse(data);
  const now = new Date().toISOString();
  let changed = false;

  // Find user's messages that haven't been fully read
  for (const msg of messages) {
    if (msg.senderId !== "local_user" || msg.type === "system") continue;
    if (!msg.readBy) msg.readBy = [];
    // Pick a random member who hasn't read it yet
    const unreadMembers = CIRCLE_MEMBERS.filter(
      (m) => !msg.readBy.some((r) => r.userId === m.id),
    );
    if (unreadMembers.length > 0 && Math.random() > 0.5) {
      const member = unreadMembers[Math.floor(Math.random() * unreadMembers.length)];
      msg.readBy.push({ userId: member.id, userName: member.name, readAt: now });
      changed = true;
    }
  }
  if (changed) {
    await saveMessages(roomId, messages);
  }
}

// ── Typing Indicators ────────────────────────────────────────────────────────

interface TypingEntry {
  userId: string;
  userName: string;
  expiresAt: number; // timestamp ms
}

const TYPING_TIMEOUT_MS = 4000; // auto-expire after 4 seconds of no input
const typingEntries: Map<string, TypingEntry[]> = new Map();

/**
 * Set a user's typing state in a room. Auto-expires after TYPING_TIMEOUT_MS.
 */
export function setTyping(roomId: string, userId: string, userName: string, isTyping: boolean): void {
  if (!typingEntries.has(roomId)) typingEntries.set(roomId, []);
  const entries = typingEntries.get(roomId)!;
  const idx = entries.findIndex((e) => e.userId === userId);
  if (isTyping) {
    const entry: TypingEntry = { userId, userName, expiresAt: Date.now() + TYPING_TIMEOUT_MS };
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);
  } else {
    if (idx >= 0) entries.splice(idx, 1);
  }
}

/**
 * Get currently typing users in a room (excluding expired entries and current user).
 */
export function getTypingUsers(roomId: string, currentUserId?: string): { userId: string; userName: string }[] {
  const entries = typingEntries.get(roomId) ?? [];
  const now = Date.now();
  // Clean expired entries
  const active = entries.filter((e) => e.expiresAt > now);
  typingEntries.set(roomId, active);
  return active
    .filter((e) => e.userId !== currentUserId)
    .map((e) => ({ userId: e.userId, userName: e.userName }));
}

/**
 * Format typing indicator text (e.g., "Alex is typing...", "Alex and Sarah are typing...")
 */
export function formatTypingText(users: { userName: string }[]): string {
  if (users.length === 0) return "";
  if (users.length === 1) return `${users[0].userName} is typing...`;
  if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing...`;
  return `${users[0].userName} and ${users.length - 1} others are typing...`;
}

/**
 * Simulate other circle members occasionally typing (for demo purposes).
 * Call this periodically to create realistic typing indicators.
 */
export function simulateTyping(roomId: string): void {
  if (Math.random() > 0.3) return; // 30% chance per poll
  const member = CIRCLE_MEMBERS[Math.floor(Math.random() * CIRCLE_MEMBERS.length)];
  setTyping(roomId, member.id, member.name, true);
  // Auto-stop after 2-4 seconds
  setTimeout(() => {
    setTyping(roomId, member.id, member.name, false);
  }, 2000 + Math.random() * 2000);
}

export { CIRCLE_MEMBERS };
export { TYPING_TIMEOUT_MS };

// ── Message Count ────────────────────────────────────────────────────────────

export async function getTotalUnreadCount(): Promise<number> {
  const rooms = await getChatRooms();
  return rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
}
