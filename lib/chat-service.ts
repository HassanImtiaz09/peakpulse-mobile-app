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
  createdAt: string;
  editedAt?: string;
  deleted?: boolean;
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
      senderName: "PeakPulse",
      senderAvatar: "⚡",
      text: `Welcome to ${roomName}! This is your group chat. Share progress, motivate each other, and stay accountable together.`,
      type: "system",
      reactions: {},
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
      createdAt: new Date(now - 21600000).toISOString(),
    },
  ];

  await saveMessages(roomId, seedMessages);
  await updateRoomLastMessage(roomId, seedMessages[seedMessages.length - 1]);
}

// ── Quick Reactions ──────────────────────────────────────────────────────────

export const QUICK_REACTIONS = ["💪", "🔥", "👏", "🎉", "❤️", "😂", "🙌", "💯"];

// ── Typing Indicators ────────────────────────────────────────────────────────

const typingUsers: Map<string, Set<string>> = new Map();

export function setTyping(roomId: string, userId: string, isTyping: boolean): void {
  if (!typingUsers.has(roomId)) typingUsers.set(roomId, new Set());
  const set = typingUsers.get(roomId)!;
  if (isTyping) set.add(userId);
  else set.delete(userId);
}

export function getTypingUsers(roomId: string): string[] {
  return Array.from(typingUsers.get(roomId) ?? []);
}

// ── Message Count ────────────────────────────────────────────────────────────

export async function getTotalUnreadCount(): Promise<number> {
  const rooms = await getChatRooms();
  return rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
}
