import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { router, protectedProcedure, publicProcedure, guestOrUserProcedure } from "./_core/trpc";
import { db, storagePut, randomSuffix, invokeLLM } from "./helpers";

export const authRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /** Delete account and erase all user data (App Store + Play Store requirement) */
    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      await db.deleteUserAccount(userId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

  }),
  profile: router({
    // Protected — only for logged-in users
    get: protectedProcedure.query(async ({ ctx }) => db.getUserProfile(ctx.user.id)),
    upsert: protectedProcedure
      .input(z.object({
        age: z.number().optional(), gender: z.string().optional(),
        heightCm: z.number().optional(), weightKg: z.number().optional(),
        goal: z.string().optional(), workoutStyle: z.string().optional(),
        dietaryPreference: z.string().optional(), currentBodyFat: z.number().optional(),
        targetBodyFat: z.number().optional(), units: z.string().optional(), daysPerWeek: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => db.upsertUserProfile(ctx.user.id, input)),
    // Daily insight — works for guests too (no user-specific data needed)
    getDailyInsight: guestOrUserProcedure
      .input(z.object({ goal: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const goal = input?.goal?.replace(/_/g, " ") ?? "general fitness";
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an elite fitness coach. Give a 1-2 sentence personalised coaching tip. Be specific, motivating, and actionable." },
            { role: "user", content: `My goal is "${goal}". Give me a daily coaching tip.` },
          ],
        });
        return { insight: response.choices[0].message.content ?? "Stay consistent — small daily actions compound into big results." };
      }),

  }),
  upload: router({
    // Photo upload — works for guests (stored to S3 without user ID)
    photo: guestOrUserProcedure
      .input(z.object({ base64: z.string(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.includes("png") ? "png" : "jpg";
        const key = `uploads/${ctx.user?.id ?? "guest"}/${Date.now()}-${randomSuffix()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),

  // ─── User Goals & Progress Persistence ───────────────────────────────────────
  }),
});
