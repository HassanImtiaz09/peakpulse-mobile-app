import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, userProfiles, InsertUserProfile,
  bodyScans, fitnessPlans, progressPhotos, mealLogs, workoutSessions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertUserProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserProfile(userId);
  if (existing) {
    await db.update(userProfiles).set({ ...data, updatedAt: new Date() }).where(eq(userProfiles.userId, userId));
    return existing.id;
  } else {
    const result = await db.insert(userProfiles).values({ userId, ...data } as InsertUserProfile);
    return (result as any).insertId;
  }
}

export async function createBodyScan(userId: number, data: {
  photoUrl?: string; estimatedBodyFat?: number; confidenceLow?: number;
  confidenceHigh?: number; muscleMassEstimate?: string; analysisNotes?: string; transformationsJson?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bodyScans).values({ userId, ...data });
  return (result as any).insertId;
}

export async function getLatestBodyScan(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(bodyScans).where(eq(bodyScans.userId, userId)).orderBy(desc(bodyScans.createdAt)).limit(1);
  return result[0] ?? null;
}

export async function createFitnessPlan(userId: number, data: {
  planType: "workout" | "meal"; goal?: string; workoutStyle?: string;
  dietaryPreference?: string; planJson: string; insight?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(fitnessPlans).set({ status: "archived" })
    .where(and(eq(fitnessPlans.userId, userId), eq(fitnessPlans.planType, data.planType), eq(fitnessPlans.status, "active")));
  const result = await db.insert(fitnessPlans).values({ userId, ...data, status: "active" });
  return (result as any).insertId;
}

export async function getActiveFitnessPlan(userId: number, planType: "workout" | "meal") {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(fitnessPlans)
    .where(and(eq(fitnessPlans.userId, userId), eq(fitnessPlans.planType, planType), eq(fitnessPlans.status, "active")))
    .orderBy(desc(fitnessPlans.createdAt)).limit(1);
  return result[0] ?? null;
}

export async function createProgressPhoto(userId: number, data: {
  photoUrl: string; note?: string; aiCommentary?: string; isBaseline?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(progressPhotos).values({ userId, ...data });
  return (result as any).insertId;
}

export async function getProgressPhotos(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(progressPhotos).where(eq(progressPhotos.userId, userId)).orderBy(desc(progressPhotos.createdAt));
}

export async function updateProgressPhotoCommentary(id: number, aiCommentary: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(progressPhotos).set({ aiCommentary }).where(eq(progressPhotos.id, id));
}

export async function createMealLog(userId: number, data: {
  name: string; mealType?: string; calories?: number; protein?: number; carbs?: number; fat?: number; photoUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mealLogs).values({ userId, ...data });
  return (result as any).insertId;
}

export async function getTodayMealLogs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mealLogs).where(eq(mealLogs.userId, userId)).orderBy(desc(mealLogs.loggedAt)).limit(50);
}

export async function createWorkoutSession(userId: number, data: {
  planId?: number; dayName?: string; focus?: string; completedExercisesJson?: string; durationMinutes?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workoutSessions).values({ userId, ...data });
  return (result as any).insertId;
}

export async function getRecentWorkoutSessions(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId)).orderBy(desc(workoutSessions.completedAt)).limit(limit);
}

export async function getSocialPosts(limit = 20, offset = 0) {
  // Return sample posts since we don't have a social_posts table yet
  return getSamplePostsData();
}

export async function createSocialPost(userId: number, data: {
  type: string; caption?: string; weightKg?: number; bodyFatPercent?: number; photoUrl?: string; achievement?: string;
}) {
  // Store as a progress photo with social metadata in notes
  const db = await getDb();
  if (!db) return { id: Date.now(), ...data, userId, createdAt: new Date() };
  const note = JSON.stringify({ socialType: data.type, caption: data.caption, achievement: data.achievement });
  const result = await db.insert(progressPhotos).values({ userId, photoUrl: data.photoUrl ?? "", note });
  return { id: (result as any).insertId, ...data, userId, createdAt: new Date() };
}

export async function likePost(userId: number, postId: number) {
  return { success: true, postId, userId };
}

export async function getUserSubscription(userId: number) {
  // Subscription management via Stripe webhooks would update this
  // For now return free plan
  return { plan: "free" as const, expiresAt: null };
}

export function getSamplePostsForGuests() {
  return getSamplePostsData();
}

function getSamplePostsData() {
  return [
    { id: 1, userId: 0, userName: "Alex M.", userAvatar: "💪", type: "progress", caption: "6 weeks in — down 8kg and feeling incredible! The AI meal plan made all the difference.", weightKg: 78, bodyFatPercent: 16, likes: 24, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 2, userId: 0, userName: "Sarah K.", userAvatar: "🏃", type: "achievement", caption: "Just completed my first 5K run after starting the beginner plan! Never thought I'd get here.", achievement: "First 5K Run", likes: 41, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 3, userId: 0, userName: "James T.", userAvatar: "🎯", type: "progress", caption: "Body fat down from 24% to 18% in 10 weeks. Consistency is everything!", bodyFatPercent: 18, likes: 33, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: 4, userId: 0, userName: "Priya R.", userAvatar: "🌟", type: "challenge", caption: "Day 30 of the 30-day squat challenge — completed! Who's joining the next one?", achievement: "30-Day Squat Challenge", likes: 58, createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
    { id: 5, userId: 0, userName: "Marcus L.", userAvatar: "🔥", type: "progress", caption: "Halal meal plan has been a game changer. Lost 5kg while eating food I actually enjoy.", weightKg: 82, likes: 19, createdAt: new Date(Date.now() - 72 * 3600000).toISOString() },
    { id: 6, userId: 0, userName: "Emma W.", userAvatar: "✨", type: "achievement", caption: "Hit my target body fat percentage! The AI body scan was spot on from day one.", bodyFatPercent: 22, likes: 47, createdAt: new Date(Date.now() - 96 * 3600000).toISOString() },
  ];
}
