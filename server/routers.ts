/**
 * App Router Ã¢ÂÂ Composes domain-specific routers into the unified tRPC API.
 *
 * Each domain router lives in its own file for better separation of concerns:
 *   - auth.router.ts     Ã¢ÂÂ auth, profile, upload
 *   - scan.router.ts     Ã¢ÂÂ bodyScan, progress, goals, progressCheckin
 *   - workout.router.ts  Ã¢ÂÂ workoutPlan, workout, exerciseSwap, dailyCheckIn
 *   - nutrition.router.ts Ã¢ÂÂ mealPlan, mealImages, mealPrep, mealLog, mealSwap, etc.
 *   - social.router.ts   Ã¢ÂÂ social, subscription, aiCoach
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

  // Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Domain Routers (merged) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
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
  ...progressHistoryRouter,
});

export type AppRouter = typeof appRouter;
