import { z } from "zod";
import { router, protectedProcedure, publicProcedure, guestOrUserProcedure } from "./_core/trpc";
import { db, invokeLLM, checkAiLimit, randomSuffix } from "./helpers";

export const socialRouter = router({
  social: router({
    // Get community feed posts
    getFeed: guestOrUserProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          // Return sample posts for guests
          return { posts: db.getSamplePostsForGuests(), total: 6 };
        }
        const posts = await db.getSocialPosts(input.limit, input.offset);
        return { posts, total: posts.length };
      }),
    createPost: protectedProcedure
      .input(z.object({ type: z.enum(["progress", "achievement", "challenge"]), caption: z.string().optional(), weightKg: z.number().optional(), bodyFatPercent: z.number().optional(), photoUrl: z.string().optional(), achievement: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        return db.createSocialPost(ctx.user.id, { type: input.type, caption: input.caption, weightKg: input.weightKg, bodyFatPercent: input.bodyFatPercent, photoUrl: input.photoUrl, achievement: input.achievement });
      }),
    likePost: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.likePost(ctx.user.id, input.postId);
      }),

  }),
  subscription: router({
    getPlans: publicProcedure.query(() => ({
      plans: [
        { id: "basic", name: "Basic", price: 5.99, currency: "GBP", interval: "month", features: ["Unlimited AI Workout Plans", "Unlimited AI Meal Plans", "Unlimited Calorie Scans", "Voice Coaching & Audio Cues", "Workout Analytics & Charts", "Progress Photos (5/month)", "Basic Body Scan", "Offline Workout Mode", "PR Tracking", "Custom Timer Sounds"], notIncluded: ["Wearable Sync", "AI Coach Chat", "Form Checker", "Social Feed", "Meal Prep Plans"] },
        { id: "pro", name: "Pro", price: 11.99, currency: "GBP", interval: "month", popular: true, features: ["Everything in Basic", "Wearable Device Sync", "AI Coach Chat", "Exercise Form Checker", "Social Feed & Challenges", "Meal Prep Plans", "Unlimited Progress Photos", "Priority AI Processing", "Advanced AI Body Scan", "Real-time Form Analysis"], notIncluded: [] },
      ],
    })),
    getCurrentPlan: guestOrUserProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return { plan: "free", expiresAt: null };
      const sub = await db.getUserSubscription(ctx.user.id);
      return sub ?? { plan: "free", expiresAt: null };
    }),

  }),
  aiCoach: router({
    // Comprehensive AI coach analysis: form history + progress + personalised tips
    getInsights: guestOrUserProcedure
      .input(z.object({
        formHistory: z.array(z.object({
          exercise: z.string(),
          score: z.number(),
          date: z.string(),
          corrections: z.array(z.string()).optional(),
        })).optional(),
        progressPhotos: z.array(z.object({
          date: z.string(),
          estimatedBF: z.number().optional(),
          trend: z.string().optional(),
        })).optional(),
        profile: z.object({
          goal: z.string().optional(),
          weightKg: z.number().optional(),
          heightCm: z.number().optional(),
          age: z.number().optional(),
          gender: z.string().optional(),
          currentBF: z.number().optional(),
          targetBF: z.number().optional(),
          workoutsCompleted: z.number().optional(),
          streakDays: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "aiCoach.getInsights");
        const { formHistory = [], progressPhotos = [], profile = {} } = input;
        const formSummary = formHistory.length > 0
          ? formHistory.map(f => `${f.exercise}: ${f.score}/100 on ${f.date}${f.corrections?.length ? ` (issues: ${f.corrections.slice(0,2).join(", ")})` : ""}`).join("; ")
          : "No form checks recorded yet";
        const progressSummary = progressPhotos.length > 0
          ? progressPhotos.map(p => `${p.date}: ${p.estimatedBF ? p.estimatedBF + "% BF" : ""} ${p.trend ?? ""}`).join("; ")
          : "No progress photos logged yet";
        const profileSummary = `Goal: ${profile.goal ?? "general fitness"}, Age: ${profile.age ?? "unknown"}, Gender: ${profile.gender ?? "unknown"}, Weight: ${profile.weightKg ?? "unknown"}kg, Height: ${profile.heightCm ?? "unknown"}cm, Current BF: ${profile.currentBF ?? "unknown"}%, Target BF: ${profile.targetBF ?? "unknown"}%, Workouts completed: ${profile.workoutsCompleted ?? 0}, Streak: ${profile.streakDays ?? 0} days`;
        const prompt = `You are an elite AI fitness coach. Analyse this athlete's data and provide a comprehensive coaching report.

ATHLETE PROFILE: ${profileSummary}
FORM HISTORY: ${formSummary}
PROGRESS PHOTOS: ${progressSummary}

Return a JSON coaching report with this exact structure:
{
  "overallScore": 72,
  "headline": "Solid foundation — time to sharpen your technique",
  "formAnalysis": {
    "summary": "2-3 sentence analysis of their form patterns across exercises",
    "topIssues": ["Issue 1 with specific correction", "Issue 2 with specific correction"],
    "strengths": ["Strength 1", "Strength 2"],
    "priorityExercise": "Squat",
    "priorityReason": "Why to focus on this exercise next"
  },
  "progressAnalysis": {
    "summary": "2-3 sentence analysis of body composition progress",
    "trend": "improving",
    "estimatedWeeksToGoal": 12,
    "weeklyBFLoss": 0.3
  },
  "weeklyPlan": [
    { "day": "Monday", "focus": "Form drill: Squat depth", "tip": "Specific actionable tip" },
    { "day": "Wednesday", "focus": "Progressive overload", "tip": "Specific actionable tip" },
    { "day": "Friday", "focus": "Technique refinement", "tip": "Specific actionable tip" }
  ],
  "personalizedTips": [
    { "category": "Nutrition", "icon": "🥩", "tip": "Specific tip based on their goal and BF%" },
    { "category": "Recovery", "icon": "😴", "tip": "Specific recovery tip" },
    { "category": "Form", "icon": "🎯", "tip": "Most critical form fix" },
    { "category": "Mindset", "icon": "🧠", "tip": "Motivational insight specific to their progress" }
  ],
  "nextMilestone": {
    "title": "Milestone name",
    "description": "What achieving this milestone means",
    "estimatedDate": "4 weeks"
  }
}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an elite AI fitness coach. Always respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        let result: any;
        try { result = JSON.parse((response.choices[0].message.content as string) ?? "{}"); }
        catch {
          result = {
            overallScore: 70,
            headline: "Keep up the great work — consistency is your superpower",
            formAnalysis: { summary: "You're building good habits. Focus on technique over weight.", topIssues: ["Ensure full range of motion on all exercises"], strengths: ["Consistent training frequency"], priorityExercise: "Squat", priorityReason: "Foundation of all lower body strength" },
            progressAnalysis: { summary: "Steady progress detected. Stay consistent with nutrition.", trend: "improving", estimatedWeeksToGoal: 12, weeklyBFLoss: 0.3 },
            weeklyPlan: [
              { day: "Monday", focus: "Compound lifts", tip: "Focus on form over weight" },
              { day: "Wednesday", focus: "Accessory work", tip: "Target weak points" },
              { day: "Friday", focus: "Full body", tip: "End the week strong" },
            ],
            personalizedTips: [
              { category: "Nutrition", icon: "🥩", tip: "Hit your protein target every day — it's the #1 driver of muscle retention" },
              { category: "Recovery", icon: "😴", tip: "7-9 hours of sleep is non-negotiable for body composition" },
              { category: "Form", icon: "🎯", tip: "Record yourself once a week to catch form drift early" },
              { category: "Mindset", icon: "🧠", tip: "Progress is not always visible — trust the data, not the mirror" },
            ],
            nextMilestone: { title: "First Form Score 80+", description: "Achieving excellent form on a compound lift", estimatedDate: "2 weeks" },
          };
        }
        return result;
      }),
    // AI Coach chat — conversational coaching
    chat: guestOrUserProcedure
      .input(z.object({
        message: z.string(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
        profile: z.object({
          goal: z.string().optional(),
          currentBF: z.number().optional(),
          targetBF: z.number().optional(),
          workoutsCompleted: z.number().optional(),
          // Premium context fields
          streakDays: z.number().optional(),
          totalMeals: z.number().optional(),
          totalScans: z.number().optional(),
          recentFormScores: z.string().optional(),
          recentMeals: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkAiLimit(ctx.user?.id, "aiCoach.chat");
        const p = input.profile ?? {};
        // Build base profile context
        let profileContext = `Goal: ${p.goal ?? "general fitness"}, Current BF: ${p.currentBF ?? "unknown"}%, Target BF: ${p.targetBF ?? "unknown"}%, Workouts completed: ${p.workoutsCompleted ?? 0}`;
        // Premium context: form memory, body progress, meal awareness
        const hasPremiumContext = p.streakDays !== undefined || p.recentFormScores || p.recentMeals;
        if (hasPremiumContext) {
          profileContext += `, Streak: ${p.streakDays ?? 0} days, Total meals logged: ${p.totalMeals ?? 0}, Total body scans: ${p.totalScans ?? 0}`;
          if (p.recentFormScores) profileContext += `. Recent form scores: ${p.recentFormScores}`;
          if (p.recentMeals) profileContext += `. Recent meals: ${p.recentMeals}`;
        }
        const premiumInstructions = hasPremiumContext
          ? " You have access to their form check history, body scan data, and meal logs. Reference specific data points when giving advice. Track their form improvements over time and celebrate progress. If their nutrition doesn't align with their goal, mention it tactfully."
          : "";
        const systemPrompt = `You are PeakPulse AI Coach — an elite, no-nonsense fitness coach. You give specific, evidence-based advice. You know the user's profile: ${profileContext}.${premiumInstructions} Keep responses concise (2-4 sentences max) and always end with one actionable next step.`;
        const messages: any[] = [
          { role: "system", content: systemPrompt },
          ...(input.history ?? []),
          { role: "user", content: input.message },
        ];
        const response = await invokeLLM({ messages, model: "flash-lite" });
        return { reply: (response.choices[0].message.content as string) ?? "I'm here to help. What would you like to work on today?" };
      }),
  }),
});
