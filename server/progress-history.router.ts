/**
 * Progress-history router
 *
 * Provides CRUD for manual progress entries (weight / body-fat logging)
 * and a unified timeline endpoint that merges check-ins + manual entries
 * for the progress graph.
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";

export const progressHistoryRouter = {
  progressEntry: router({
    /** Log a new manual entry */
    save: protectedProcedure
      .input(
        z.object({
          weightKg: z.number().positive().optional(),
          bodyFatPercent: z.number().min(1).max(60).optional(),
          note: z.string().max(500).optional(),
          recordedAt: z.string().datetime().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.saveProgressEntry(ctx.user.id, {
          weightKg: input.weightKg,
          bodyFatPercent: input.bodyFatPercent,
          note: input.note,
          recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
        });
        return { id };
      }),

    /** Fetch all manual entries for the authenticated user */
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(100) }).optional())
      .query(async ({ ctx, input }) => {
        return db.getProgressEntries(ctx.user.id, input?.limit ?? 100);
      }),

    /** Delete a manual entry */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProgressEntry(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  /** Unified timeline that merges check-ins + manual entries for graphing */
  progressTimeline: router({
    get: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(200) }).optional())
      .query(async ({ ctx, input }) => {
        return db.getProgressTimeline(ctx.user.id, input?.limit ?? 200);
      }),
  }),
};
