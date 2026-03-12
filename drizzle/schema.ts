import {
  boolean,
  float,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  age: int("age"),
  gender: varchar("gender", { length: 20 }),
  heightCm: float("heightCm"),
  weightKg: float("weightKg"),
  goal: varchar("goal", { length: 50 }),
  workoutStyle: varchar("workoutStyle", { length: 50 }),
  dietaryPreference: varchar("dietaryPreference", { length: 50 }),
  currentBodyFat: float("currentBodyFat"),
  targetBodyFat: float("targetBodyFat"),
  units: varchar("units", { length: 20 }).default("metric"),
  daysPerWeek: int("daysPerWeek").default(4),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const bodyScans = mysqlTable("body_scans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  photoUrl: text("photoUrl"),
  estimatedBodyFat: float("estimatedBodyFat"),
  confidenceLow: float("confidenceLow"),
  confidenceHigh: float("confidenceHigh"),
  muscleMassEstimate: varchar("muscleMassEstimate", { length: 50 }),
  analysisNotes: text("analysisNotes"),
  transformationsJson: text("transformationsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const fitnessPlans = mysqlTable("fitness_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planType: mysqlEnum("planType", ["workout", "meal"]).notNull(),
  goal: varchar("goal", { length: 50 }),
  workoutStyle: varchar("workoutStyle", { length: 50 }),
  dietaryPreference: varchar("dietaryPreference", { length: 50 }),
  planJson: text("planJson").notNull(),
  insight: text("insight"),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const progressPhotos = mysqlTable("progress_photos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  note: text("note"),
  aiCommentary: text("aiCommentary"),
  isBaseline: boolean("isBaseline").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const mealLogs = mysqlTable("meal_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  mealType: varchar("mealType", { length: 50 }),
  calories: int("calories"),
  protein: float("protein"),
  carbs: float("carbs"),
  fat: float("fat"),
  photoUrl: text("photoUrl"),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
});

export const workoutSessions = mysqlTable("workout_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId"),
  dayName: varchar("dayName", { length: 50 }),
  focus: varchar("focus", { length: 100 }),
  completedExercisesJson: text("completedExercisesJson"),
  durationMinutes: int("durationMinutes"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type BodyScan = typeof bodyScans.$inferSelect;
export type FitnessPlan = typeof fitnessPlans.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type MealLog = typeof mealLogs.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
