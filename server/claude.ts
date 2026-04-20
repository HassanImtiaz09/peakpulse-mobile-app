/**
 * Claude AI Service — Enhanced AI Coach Intelligence
 *
 * Uses Anthropic Claude claude-sonnet-4-20250514 for:
 * - Contextual coaching with health data awareness
 * - Morning briefings based on sleep/recovery
 * - Post-workout analysis with form memory
 * - Re-engagement nudges for inactive users
 * - Exercise form analysis via Claude Vision
 *
 * Falls back to built-in Gemini LLM if Claude API is unreachable.
 */
import Anthropic from "@anthropic-ai/sdk";
import { invokeLLM } from "./_core/llm";

// Lazy-init singleton — only created when first needed
let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CoachContext {
  // User profile
  name?: string;
  goal?: string;
  currentBF?: number;
  targetBF?: number;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  gender?: string;
  dietaryPreference?: string;
  workoutStyle?: string;

  // Health data (from HealthKit / Health Connect)
  steps?: number;
  heartRate?: number;
  sleepHours?: number;
  sleepQuality?: string;
  activeCalories?: number;
  restingCalories?: number;
  vo2Max?: number | null;
  hrv?: number | null;
  activeMinutes?: number;

  // Activity data
  workoutsCompleted?: number;
  streakDays?: number;
  lastWorkoutDate?: string;
  daysSinceLastWorkout?: number;

  // Form check history
  recentFormScores?: string;
  formWeaknesses?: string;

  // Nutrition
  totalMealsLogged?: number;
  recentMeals?: string;
  calorieGoal?: number;
  caloriesToday?: number;

  // Body scan
  totalScans?: number;
  lastScanBF?: number;
  bfTrend?: string;
}

export type CoachTrigger = "morning_briefing" | "post_workout" | "re_engagement" | "general" | "chat";

export interface CoachResponse {
  message: string;
  personality: "motivator" | "analyst" | "mentor";
  confidence: number;
  suggestions?: string[];
  source: "claude" | "gemini" | "template";
}

// ── System Prompts ─────────────────────────────────────────────────────────────
const COACH_PERSONA = `You are FytNova Coach — an elite, evidence-based fitness and nutrition coach built into the FytNova app. You have three personality modes:

1. MOTIVATOR: Energetic, encouraging, uses action words. For when users need a push.
2. ANALYST: Data-driven, precise, references specific metrics. For when users want insights.
3. MENTOR: Warm, wise, focuses on long-term habits. For when users need perspective.

Choose the most appropriate personality based on the context and trigger.

RULES:
- Keep responses concise: 2-4 sentences for briefings, up to 6 for detailed analysis
- Always reference specific data points when available (e.g., "Your HRV of 45ms suggests...")
- End every response with ONE actionable next step
- Never be generic — always personalize based on the user's data
- Use metric units (kg, km) unless the user's data suggests imperial
- Be honest about limitations — if data is insufficient, say so
- Never diagnose medical conditions — recommend consulting a doctor for health concerns`;

function buildTriggerPrompt(trigger: CoachTrigger, ctx: CoachContext): string {
  const profile = [
    ctx.name ? `Name: ${ctx.name}` : null,
    ctx.goal ? `Goal: ${ctx.goal}` : null,
    ctx.currentBF ? `Current BF: ${ctx.currentBF}%` : null,
    ctx.targetBF ? `Target BF: ${ctx.targetBF}%` : null,
    ctx.age ? `Age: ${ctx.age}` : null,
    ctx.weightKg ? `Weight: ${ctx.weightKg}kg` : null,
    ctx.heightCm ? `Height: ${ctx.heightCm}cm` : null,
    ctx.gender ? `Gender: ${ctx.gender}` : null,
    ctx.dietaryPreference ? `Diet: ${ctx.dietaryPreference}` : null,
    ctx.workoutStyle ? `Style: ${ctx.workoutStyle}` : null,
  ].filter(Boolean).join(", ");

  const health = [
    ctx.steps !== undefined ? `Steps today: ${ctx.steps}` : null,
    ctx.heartRate ? `Resting HR: ${ctx.heartRate} bpm` : null,
    ctx.sleepHours ? `Sleep: ${ctx.sleepHours}h (${ctx.sleepQuality ?? "unknown"})` : null,
    ctx.activeCalories ? `Active calories: ${ctx.activeCalories}` : null,
    ctx.vo2Max ? `VO2 Max: ${ctx.vo2Max}` : null,
    ctx.hrv ? `HRV: ${ctx.hrv}ms` : null,
    ctx.activeMinutes ? `Active minutes: ${ctx.activeMinutes}` : null,
  ].filter(Boolean).join(", ");

  const activity = [
    ctx.workoutsCompleted !== undefined ? `Workouts completed: ${ctx.workoutsCompleted}` : null,
    ctx.streakDays !== undefined ? `Streak: ${ctx.streakDays} days` : null,
    ctx.lastWorkoutDate ? `Last workout: ${ctx.lastWorkoutDate}` : null,
    ctx.daysSinceLastWorkout !== undefined ? `Days since last workout: ${ctx.daysSinceLastWorkout}` : null,
  ].filter(Boolean).join(", ");

  const nutrition = [
    ctx.totalMealsLogged ? `Meals logged: ${ctx.totalMealsLogged}` : null,
    ctx.recentMeals ? `Recent meals: ${ctx.recentMeals}` : null,
    ctx.calorieGoal ? `Calorie goal: ${ctx.calorieGoal}` : null,
    ctx.caloriesToday !== undefined ? `Calories today: ${ctx.caloriesToday}` : null,
  ].filter(Boolean).join(", ");

  const form = [
    ctx.recentFormScores ? `Recent form scores: ${ctx.recentFormScores}` : null,
    ctx.formWeaknesses ? `Form weaknesses: ${ctx.formWeaknesses}` : null,
  ].filter(Boolean).join(", ");

  const body = [
    ctx.totalScans ? `Body scans: ${ctx.totalScans}` : null,
    ctx.lastScanBF ? `Last scan BF: ${ctx.lastScanBF}%` : null,
    ctx.bfTrend ? `BF trend: ${ctx.bfTrend}` : null,
  ].filter(Boolean).join(", ");

  let triggerInstruction = "";
  switch (trigger) {
    case "morning_briefing":
      triggerInstruction = `Generate a MORNING BRIEFING. Analyze their sleep data, recovery status, and today's plan. If sleep was poor, suggest a lighter workout. If recovery is good, push them harder. Reference specific metrics.`;
      break;
    case "post_workout":
      triggerInstruction = `Generate a POST-WORKOUT ANALYSIS. Celebrate their effort, analyze the session data, and suggest recovery actions. If form scores are available, reference specific improvements or areas to watch.`;
      break;
    case "re_engagement":
      triggerInstruction = `Generate a RE-ENGAGEMENT NUDGE. The user has been inactive for ${ctx.daysSinceLastWorkout ?? "several"} days. Be empathetic (not guilt-tripping), acknowledge life happens, and suggest an easy re-entry workout. Reference their streak and progress to motivate.`;
      break;
    default:
      triggerInstruction = `Generate a personalized coaching insight based on all available data. Pick the most impactful observation and actionable advice.`;
  }

  return `USER PROFILE: ${profile || "Limited profile data"}
HEALTH DATA: ${health || "No health data synced"}
ACTIVITY: ${activity || "No activity data"}
NUTRITION: ${nutrition || "No nutrition data"}
FORM HISTORY: ${form || "No form checks"}
BODY COMPOSITION: ${body || "No body scans"}

TRIGGER: ${triggerInstruction}

Respond with JSON:
{
  "message": "Your coaching message here",
  "personality": "motivator|analyst|mentor",
  "confidence": 0.0-1.0,
  "suggestions": ["Optional action 1", "Optional action 2"]
}`;
}

// ── Claude API Call ────────────────────────────────────────────────────────────
async function callClaude(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: options?.maxTokens ?? 512,
      temperature: options?.temperature ?? 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? null;
  } catch (err: any) {
    console.warn("[Claude] API error, will fallback:", err.message);
    return null;
  }
}

// ── Claude Vision Call (for form checking) ─────────────────────────────────────
export async function callClaudeVision(
  systemPrompt: string,
  textPrompt: string,
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg",
  options?: { maxTokens?: number }
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: options?.maxTokens ?? 1024,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: textPrompt },
        ],
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? null;
  } catch (err: any) {
    console.warn("[Claude Vision] API error, will fallback:", err.message);
    return null;
  }
}

// ── Gemini Fallback ────────────────────────────────────────────────────────────
async function callGeminiFallback(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });
    return (response.choices[0]?.message?.content as string) ?? null;
  } catch (err: any) {
    console.warn("[Gemini Fallback] error:", err.message);
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Get a contextual coaching message based on trigger and user data.
 * Tries Claude first, falls back to Gemini, then to template.
 */
export async function getCoachMessage(
  trigger: CoachTrigger,
  context: CoachContext
): Promise<CoachResponse> {
  const prompt = buildTriggerPrompt(trigger, context);

  // Try Claude first
  const claudeResult = await callClaude(COACH_PERSONA, prompt, { maxTokens: 512, temperature: 0.7 });
  if (claudeResult) {
    try {
      const parsed = JSON.parse(claudeResult);
      return { ...parsed, source: "claude" as const };
    } catch {
      // Claude returned non-JSON, wrap it
      return {
        message: claudeResult,
        personality: "mentor" as const,
        confidence: 0.8,
        source: "claude" as const,
      };
    }
  }

  // Fallback to Gemini
  const geminiResult = await callGeminiFallback(COACH_PERSONA, prompt);
  if (geminiResult) {
    try {
      const parsed = JSON.parse(geminiResult);
      return { ...parsed, source: "gemini" as const };
    } catch {
      return {
        message: geminiResult,
        personality: "mentor" as const,
        confidence: 0.6,
        source: "gemini" as const,
      };
    }
  }

  // Template fallback
  return getTemplateFallback(trigger, context);
}

/**
 * Chat with the AI coach — conversational mode.
 * Tries Claude first, falls back to Gemini.
 */
export async function chatWithCoach(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  context: CoachContext
): Promise<{ reply: string; source: "claude" | "gemini" | "template" }> {
  const contextSummary = buildTriggerPrompt("chat", context);
  const systemPrompt = `${COACH_PERSONA}\n\nCURRENT USER CONTEXT:\n${contextSummary}\n\nThis is a conversational chat. Respond naturally (not JSON). Keep responses concise (2-4 sentences) and end with one actionable step.`;

  // Try Claude
  const client = getClient();
  if (client) {
    try {
      const messages: Anthropic.MessageParam[] = [
        ...history.map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user" as const, content: message },
      ];

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        temperature: 0.7,
        system: systemPrompt,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock?.text) {
        return { reply: textBlock.text, source: "claude" };
      }
    } catch (err: any) {
      console.warn("[Claude Chat] error, falling back:", err.message);
    }
  }

  // Fallback to Gemini
  try {
    const geminiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];
    const response = await invokeLLM({ messages: geminiMessages });
    const reply = (response.choices[0]?.message?.content as string) ?? "I'm here to help. What would you like to work on?";
    return { reply, source: "gemini" };
  } catch {
    return { reply: "I'm having trouble connecting right now. Try again in a moment.", source: "template" };
  }
}

// ── Template Fallback ──────────────────────────────────────────────────────────
function getTemplateFallback(trigger: CoachTrigger, ctx: CoachContext): CoachResponse {
  switch (trigger) {
    case "morning_briefing":
      return {
        message: ctx.sleepHours
          ? `Good morning${ctx.name ? `, ${ctx.name}` : ""}! You got ${ctx.sleepHours}h of sleep. ${ctx.sleepHours >= 7 ? "Great recovery — you're primed for a strong session today." : "Sleep was a bit short — consider a lighter workout and prioritize rest tonight."} Your streak is at ${ctx.streakDays ?? 0} days — keep it going!`
          : `Good morning${ctx.name ? `, ${ctx.name}` : ""}! Ready to make today count? ${ctx.streakDays ? `You're on a ${ctx.streakDays}-day streak — impressive!` : "Let's build some momentum today."} Check your workout plan and fuel up with a good breakfast.`,
        personality: "motivator",
        confidence: 0.5,
        suggestions: ["Start your workout", "Log breakfast", "Check today's plan"],
        source: "template",
      };
    case "post_workout":
      return {
        message: `Great session${ctx.name ? `, ${ctx.name}` : ""}! ${ctx.workoutsCompleted ? `That's workout #${ctx.workoutsCompleted} in the books.` : "Another one done!"} Focus on recovery now — hydrate, eat within 30 minutes, and stretch. ${ctx.activeCalories ? `You burned ${ctx.activeCalories} active calories today.` : ""}`,
        personality: "motivator",
        confidence: 0.5,
        suggestions: ["Log your meal", "Stretch routine", "Track recovery"],
        source: "template",
      };
    case "re_engagement":
      return {
        message: `Hey${ctx.name ? ` ${ctx.name}` : ""}, I noticed you've been away for ${ctx.daysSinceLastWorkout ?? "a few"} days. Life happens — no judgment. The best workout is the one you actually do. How about a quick 20-minute session to get back on track? Your body will thank you.`,
        personality: "mentor",
        confidence: 0.5,
        suggestions: ["Quick 20min workout", "Light stretching", "Update your plan"],
        source: "template",
      };
    default:
      return {
        message: `${ctx.name ? `${ctx.name}, ` : ""}Stay consistent with your training and nutrition. ${ctx.currentBF && ctx.targetBF ? `You're at ${ctx.currentBF}% BF heading toward ${ctx.targetBF}% — every workout counts.` : "Every workout brings you closer to your goal."} Focus on progressive overload and adequate protein intake.`,
        personality: "analyst",
        confidence: 0.4,
        suggestions: ["View workout plan", "Log a meal", "Check progress"],
        source: "template",
      };
  }
}
