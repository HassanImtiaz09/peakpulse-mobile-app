import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, userProfiles, InsertUserProfile,
  bodyScans, fitnessPlans, progressPhotos, mealLogs, workoutSessions, aiUsage,
  userGoals, progressCheckins,, progressEntries, progressCheckins} from "../drizzle/schema";
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

export async function getAllBodyScans(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bodyScans).where(eq(bodyScans.userId, userId)).orderBy(bodyScans.createdAt);
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
  photoUrl: string; note?: string; aiCommentary?: string; isBaseline?: boolean; weightKg?: number; bodyFatPercent?: number;
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

// ââ AI Usage Metering âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

/** Monthly AI call limits per subscription tier */
export const AI_CALL_LIMITS: Record<string, number> = {
  free: 10,
  basic: 30,
  pro: Infinity,
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function incrementAiUsage(userId: number, endpoint: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const month = currentMonth();
  await (db as any).execute(
    `INSERT INTO ai_usage (userId, endpoint, month, callCount) VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE callCount = callCount + 1`,
    [userId, endpoint, month]
  );
  const rows = await db
    .select({ callCount: aiUsage.callCount })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.endpoint, endpoint), eq(aiUsage.month, month)))
    .limit(1);
  return rows[0]?.callCount ?? 1;
}

export async function getMonthlyAiCallCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const month = currentMonth();
  const rows = await db
    .select({ callCount: aiUsage.callCount })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, month)));
  return rows.reduce((sum, r) => sum + r.callCount, 0);
}

/**
 * Checks the user's monthly AI call count against their plan limit.
 * Increments the counter if allowed; throws with code AI_LIMIT_EXCEEDED if not.
 */
export async function enforceAiLimit(userId: number, plan: string, endpoint: string): Promise<void> {
  const limit = AI_CALL_LIMITS[plan] ?? AI_CALL_LIMITS.free;
  if (!isFinite(limit)) {
    // Advanced = unlimited; still track for analytics
    await incrementAiUsage(userId, endpoint);
    return;
  }
  const count = await getMonthlyAiCallCount(userId);
  if (count >= limit) {
    throw new Error(`AI_LIMIT_EXCEEDED:${plan}:${limit}:${count}`);
  }
  await incrementAiUsage(userId, endpoint);
}



// âââ User Goals (Target Transformation) ââââââââââââââââââââââââââââââââââââââ

export async function saveUserGoal(userId: number, data: {
  targetBodyFat: number;
  imageUrl?: string;
  description?: string;
  originalPhotoUrl?: string;
  originalBodyFat?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  // Deactivate previous goals
  await db.update(userGoals).set({ isActive: false }).where(eq(userGoals.userId, userId));
  // Insert new active goal
  const [result] = await db.insert(userGoals).values({ userId, ...data });
  return result.insertId;
}

export async function getActiveUserGoal(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userGoals)
    .where(and(eq(userGoals.userId, userId), eq(userGoals.isActive, true)))
    .orderBy(desc(userGoals.createdAt))
    .limit(1);
  return result[0] ?? null;
}

// âââ Progress Check-ins ââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function saveProgressCheckin(userId: number, data: {
  photoUrl: string;
  weightKg?: number;
  bodyFatEstimate?: number;
  progressRating?: string;
  summary?: string;
  analysisJson?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(progressCheckins).values({ userId, ...data });
  return result.insertId;
}

export async function getProgressCheckins(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(progressCheckins)
    .where(eq(progressCheckins.userId, userId))
    .orderBy(desc(progressCheckins.createdAt))
    .limit(limit);
}

export async function getLatestProgressCheckin(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(progressCheckins)
    .where(eq(progressCheckins.userId, userId))
    .orderBy(desc(progressCheckins.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export function getSamplePostsForGuests() {
  return getSamplePostsData();
}

function getSamplePostsData() {
  return [
    { id: 1, userId: 0, userName: "Alex M.", userAvatar: "ð¥ðª", type: "progress", caption: "6 weeks in â down 8kg and feeling incredible! The AI meal plan made all the difference. My energy levels are through the roof ð¥ð", weightKg: 78, bodyFatPercent: 16, likes: 124, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 2, userId: 0, userName: "Sarah K.", userAvatar: "ð¥ð", type: "achievement", caption: "Just completed my first 5K run after starting the beginner plan! Never thought I'd get here. 8 weeks ago I could barely run for 5 minutes ð¥ð­ð¥ðª", achievement: "First 5K Run Completed", likes: 241, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 3, userId: 0, userName: "James T.", userAvatar: "ð¥ð¯", type: "progress", caption: "Body fat down from 24% to 18% in 10 weeks. The AI form checker caught my squat form was off â fixed it and my knees stopped hurting. Consistency is everything!", bodyFatPercent: 18, weightKg: 85, likes: 183, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { id: 4, userId: 0, userName: "Priya R.", userAvatar: "ð¥ð", type: "challenge", caption: "Day 30 of the 30-day squat challenge â COMPLETED! ð¥ð Started at 50 bodyweight squats, now doing 100 with 20kg. Who's joining the next one?", achievement: "30-Day Squat Challenge Champion", likes: 358, createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
    { id: 5, userId: 0, userName: "Marcus L.", userAvatar: "ð¥ð¥", type: "progress", caption: "The halal meal plan has been a game changer during Ramadan. Lost 5kg while eating food I actually enjoy and keeping my energy up for fasting. This app actually understands my lifestyle ð¥ð", weightKg: 82, bodyFatPercent: 20, likes: 219, createdAt: new Date(Date.now() - 72 * 3600000).toISOString() },
    { id: 6, userId: 0, userName: "Emma W.", userAvatar: "â¨", type: "achievement", caption: "Hit my target body fat percentage after 12 weeks! The AI body scan was spot on from day one and the weekly progress photos kept me accountable. Best investment I've made ð¥ð«", bodyFatPercent: 22, likes: 447, createdAt: new Date(Date.now() - 96 * 3600000).toISOString() },
    { id: 7, userId: 0, userName: "Tariq A.", userAvatar: "ð¥ðï¸", type: "progress", caption: "Calisthenics plan is absolutely brutal but the results speak for themselves. First muscle-up achieved today after 8 weeks of training! The AI progression is perfectly calibrated ð¥ðª", bodyFatPercent: 12, likes: 312, createdAt: new Date(Date.now() - 120 * 3600000).toISOString() },
    { id: 8, userId: 0, userName: "Yuki N.", userAvatar: "ð¥ð¸", type: "challenge", caption: "Completed the 10K steps daily challenge for 21 days straight! My Fitbit sync with PeakPulse made tracking effortless. Starting the 7-day plank streak next ð¥ð¯", achievement: "21-Day Step Streak", likes: 189, createdAt: new Date(Date.now() - 144 * 3600000).toISOString() },
    { id: 9, userId: 0, userName: "David O.", userAvatar: "â¡", type: "progress", caption: "Home workout plan â no gym, no excuses. Down 12kg in 14 weeks using just bodyweight and resistance bands. The AI adapted the plan when I told it I only had 30 mins per day. Incredible ð¥ð ", weightKg: 88, bodyFatPercent: 19, likes: 276, createdAt: new Date(Date.now() - 168 * 3600000).toISOString() },
    { id: 10, userId: 0, userName: "Layla H.", userAvatar: "ð¥ð", type: "achievement", caption: "Vegan meal plan + strength training = best decision ever. 6 months in, strongest I've ever been. The AI meal prep feature saves me 3 hours every Sunday ð¥ð±ð¥ð", achievement: "6-Month Vegan Fitness Journey", likes: 523, createdAt: new Date(Date.now() - 192 * 3600000).toISOString() },
  ];
}

/**
 * Delete a user account and ALL associated data.
 * Required by Apple App Store (5.1.1v) and Google Play (User Data policy).
 * Cascades across: profiles, body scans, fitness plans, progress photos,
 * meal logs, workout sessions, AI usage, goals, progress check-ins.
 */
export async function deleteUserAccount(userId: number): Promise<void> {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  // Delete from all child tables first (foreign key order)
  await d.delete(progressCheckins).where(eq(progressCheckins.userId, userId));
  await d.delete(userGoals).where(eq(userGoals.userId, userId));
  await d.delete(aiUsage).where(eq(aiUsage.userId, userId));
  await d.delete(workoutSessions).where(eq(workoutSessions.userId, userId));
  await d.delete(mealLogs).where(eq(mealLogs.userId, userId));
  await d.delete(progressPhotos).where(eq(progressPhotos.userId, userId));
  await d.delete(fitnessPlans).where(eq(fitnessPlans.userId, userId));
  await d.delete(bodyScans).where(eq(bodyScans.userId, userId));
  await d.delete(userProfiles).where(eq(userProfiles.userId, userId));
  // Finally delete the user record
  await d.delete(users).where(eq(users.id, userId));
}


// ── Progress Entries (manual weight / body-fat logging) ──────────────────────

export async function saveProgressEntry(
  userId: number,
  data: {
    weightKg?: number | null;
    bodyFatPercent?: number | null;
    note?: string | null;
    source?: string;
    recordedAt?: Date;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(progressEntries).values({
    userId,
    weightKg: data.weightKg ?? null,
    bodyFatPercent: data.bodyFatPercent ?? null,
    note: data.note ?? null,
    source: data.source ?? "manual",
    recordedAt: data.recordedAt ?? new Date(),
  });
  return result[0].insertId;
}

export async function getProgressEntries(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(progressEntries)
    .where(eq(progressEntries.userId, userId))
    .orderBy(desc(progressEntries.recordedAt))
    .limit(limit);
}

export async function deleteProgressEntry(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(progressEntries)
    .where(and(eq(progressEntries.id, id), eq(progressEntries.userId, userId)));
}

/**
 * Unified timeline: merges progressCheckins + progressEntries into a single
 * sorted array for the progress graph.
 */
export async function getProgressTimeline(userId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];

  const [checkins, entries] = await Promise.all([
    db
      .select({
        date: progressCheckins.createdAt,
        weightKg: progressCheckins.weightKg,
        bodyFatPercent: progressCheckins.bodyFatEstimate,
      })
      .from(progressCheckins)
      .where(eq(progressCheckins.userId, userId))
      .orderBy(desc(progressCheckins.createdAt))
      .limit(limit),
    db
      .select({
        date: progressEntries.recordedAt,
        weightKg: progressEntries.weightKg,
        bodyFatPercent: progressEntries.bodyFatPercent,
      })
      .from(progressEntries)
      .where(eq(progressEntries.userId, userId))
      .orderBy(desc(progressEntries.recordedAt))
      .limit(limit),
  ]);

  const merged = [
    ...checkins.map((c) => ({ ...c, source: "checkin" })),
    ...entries.map((e) => ({ ...e, source: "entry" })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return merged;
}
