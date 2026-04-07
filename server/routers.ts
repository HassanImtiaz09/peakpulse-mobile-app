/**
 * App Router â Composes domain-specific routers into the unified tRPC API.
 *
 * Each domain router lives in its own file for better separation of concerns:
 *   - auth.router.ts     â auth, profile, upload
 *   - scan.router.ts     â bodyScan, progress, goals, progressCheckin
 *   - workout.router.ts  â workoutPlan, workout, exerciseSwap, dailyCheckIn
 *   - nutrition.router.ts â mealPlan, mealImages, mealPrep, mealLog, mealSwap, etc.
 *   - social.router.ts   â social, subscription, aiCoach
 *
 * Shared helpers (getUserPlan, checkAiLimit, etc.) are in helpers.ts.
 */
import { router, publicProcedure } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { authRouter } from "./auth.router";
import { scanRouter } from "./scan.router";
import { workoutRouter } from "./workout.router";
import { nutritionRouter } from "./nutrition.router";
import { socialRouter } from "./social.router";
import { progressHistoryRouter } from "./progress-history.router";

export const appRouter = router({
  // Health check
  health: publicProcedure.query(() => ({ status: "ok" })),

  // System routes (built-in)
  system: systemRouter,

  // âââ Domain Routers (merged) âââââââââââââââââââââââââââââââââââââââââââââââ
  // Auth & Profile
  ...authRouter._def.procedures,

  // Body Scan & Progress
  ...scanRouter._def.procedures,

  // Workouts & Training
  ...workoutRouter._def.procedures,

  // Nutrition & Meals
  ...nutritionRouter._def.procedures,

  // Social, Subscription & AI Coach
  ...socialRouter._def.procedures,
});

export type AppRouter = typeof appRouter;
