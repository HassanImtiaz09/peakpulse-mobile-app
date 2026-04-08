/**
 * PeakPulse AI Coach Personality System
 * 
 * Provides distinct AI coach personas with unique communication styles,
 * contextual greetings, streak motivation, and personalized system prompts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ——— Types ————————————————————————————————————————

export interface CoachPersona {
  key: string;
  name: string;
  emoji: string;
  tagline: string;
  style: string;
  tone: string[];
  encouragementStyle: string;
  correctionStyle: string;
  signOff: string;
}

export interface UserContext {
  userName: string;
  streakDays: number;
  workoutsThisWeek: number;
  lastWorkoutDaysAgo: number;
  currentGoal: string;
  fitnessLevel: string;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  recentMood?: string;
}

// ——— Coach Personas ———————————————————————————————

export const COACH_PERSONAS: Record<string, CoachPersona> = {
  pulse: {
    key: "pulse",
    name: "Pulse",
    emoji: "⚡",
    tagline: "Your hype machine",
    style: "High-energy motivational coach who celebrates every win",
    tone: ["enthusiastic", "upbeat", "empowering", "celebratory"],
    encouragementStyle: "Explosive positivity with exclamation marks and fire emojis",
    correctionStyle: "Reframes setbacks as setup for comebacks",
    signOff: "Let's GO! ⚡",
  },
  atlas: {
    key: "atlas",
    name: "Atlas",
    emoji: "🧠",
    tagline: "Data-driven strategist",
    style: "Analytical coach who backs everything with science and numbers",
    tone: ["precise", "methodical", "evidence-based", "strategic"],
    encouragementStyle: "Points to measurable progress and trending improvements",
    correctionStyle: "Provides specific adjustments with reasoning",
    signOff: "Trust the process. 🧠",
  },
  sage: {
    key: "sage",
    name: "Sage",
    emoji: "🌿",
    tagline: "Mindful wellness guide",
    style: "Compassionate coach focused on holistic wellbeing and balance",
    tone: ["warm", "empathetic", "nurturing", "mindful"],
    encouragementStyle: "Gentle affirmations emphasizing self-care and growth",
    correctionStyle: "Compassionate redirection with focus on listening to your body",
    signOff: "Be kind to yourself. 🌿",
  },
  titan: {
    key: "titan",
    name: "Titan",
    emoji: "🔥",
    tagline: "No-excuses drill sergeant",
    style: "Tough-love coach who pushes you past your comfort zone",
    tone: ["direct", "commanding", "no-nonsense", "challenging"],
    encouragementStyle: "Acknowledges effort but immediately raises the bar",
    correctionStyle: "Blunt feedback with clear action items",
    signOff: "No excuses. 🔥",
  },
};

export const DEFAULT_PERSONA = "pulse";

// ——— Helper ——————————————————————————————————————

export function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

// ——— Contextual Greetings ————————————————————————

const GREETINGS: Record<string, Record<string, string[]>> = {
  pulse: {
    morning: [
      "Rise and GRIND, {name}! ⚡ New day, new gains!",
      "Good morning, champ! Ready to crush it today? 💪",
    ],
    afternoon: [
      "What's up, {name}! Afternoon power hour incoming! ⚡",
      "Hey {name}! Don't let the day slip — let's get moving! 🔥",
    ],
    evening: [
      "Evening warrior! {name}, let's finish this day STRONG! 💪",
      "Hey {name}! Perfect time for a killer session! ⚡",
    ],
    night: [
      "Night owl mode, {name}! Late-night legends are made now! 🌙",
      "Still going, {name}? That's the champion mindset! ⚡",
    ],
  },
  atlas: {
    morning: [
      "Good morning, {name}. Your body is primed for peak performance after rest.",
      "Morning, {name}. Cortisol levels are optimal — ideal training window.",
    ],
    afternoon: [
      "Afternoon, {name}. Core temperature peaks now — strength output is highest.",
      "Hello, {name}. Studies show afternoon sessions yield 5-10% better performance.",
    ],
    evening: [
      "Evening, {name}. Flexibility peaks now — great for mobility work.",
      "Hello, {name}. Let's review your metrics and plan strategically.",
    ],
    night: [
      "Good evening, {name}. Let's review today's data and optimize tomorrow.",
      "Late session, {name}. Keep intensity moderate to protect sleep quality.",
    ],
  },
  sage: {
    morning: [
      "Good morning, {name}. 🌿 Take a deep breath — today is yours.",
      "Hello, beautiful soul. {name}, let's move with intention today.",
    ],
    afternoon: [
      "Afternoon, {name}. 🌿 How is your body feeling right now?",
      "Hi {name}. Take a moment to check in with yourself. How are you?",
    ],
    evening: [
      "Good evening, {name}. 🌿 What a journey today has been.",
      "Evening, {name}. Let's wind down and honor what your body did today.",
    ],
    night: [
      "Peaceful evening, {name}. 🌙 Rest is where transformation happens.",
      "Hello, {name}. Listen to your body — it knows what it needs tonight.",
    ],
  },
  titan: {
    morning: [
      "Up and at 'em, {name}. The weak sleep in. You don't. 🔥",
      "Morning, {name}. Every champion earns their title before sunrise.",
    ],
    afternoon: [
      "{name}. Half the day is gone. What have you earned so far? 🔥",
      "Afternoon, {name}. No coasting. Every hour counts.",
    ],
    evening: [
      "{name}. The day's not over until YOU say it is. Let's work. 🔥",
      "Evening, {name}. Champions put in the work when others quit.",
    ],
    night: [
      "{name}. Still here? Good. That's what separates you from the rest.",
      "Late night, {name}. Discipline doesn't have a bedtime. 🔥",
    ],
  },
};

// ——— Streak Messages —————————————————————————————

const STREAK_MESSAGES: Record<string, Record<string, string[]>> = {
  pulse: {
    lost: ["Streak reset? No sweat, {name}! Every comeback story starts HERE! ⚡"],
    building: ["{streakDays} days strong, {name}! You're building something EPIC! 🔥"],
    solid: ["{streakDays}-day streak! {name}, you're UNSTOPPABLE right now! 💪"],
    epic: ["{streakDays} DAYS?! {name}, you're a MACHINE! Absolute legend! 🏆"],
  },
  atlas: {
    lost: ["Streak reset to 0. No problem — consistency compounds. Restart today, {name}."],
    building: ["{streakDays}-day streak. Building neural pathways for habit formation, {name}."],
    solid: ["{streakDays} consecutive days. You've passed the 21-day habit threshold, {name}."],
    epic: ["{streakDays}-day streak. Statistically, you're in the top 5% of consistency, {name}."],
  },
  sage: {
    lost: ["A new beginning, {name}. 🌿 Every moment is a chance to start fresh."],
    building: ["{streakDays} days of showing up for yourself, {name}. That takes courage. 🌿"],
    solid: ["{streakDays} days, {name}. Your dedication to yourself is beautiful. 🌿"],
    epic: ["{streakDays} days of self-love in action, {name}. You inspire me. 🌿"],
  },
  titan: {
    lost: ["Streak broken. You know what to do, {name}. Get back in there. Now. 🔥"],
    building: ["{streakDays} days. Not bad, {name}. But don't get comfortable."],
    solid: ["{streakDays}-day streak, {name}. Now THAT'S discipline. Keep it locked in."],
    epic: ["{streakDays} days. {name}, you've proven you're built different. Respect. 🔥"],
  },
};

// ——— Inactivity Nudges ———————————————————————————

const INACTIVITY_NUDGES: Record<string, Record<string, string[]>> = {
  pulse: {
    gentle: ["Hey {name}! Missing your energy! Ready to get back at it? ⚡"],
    moderate: ["{name}! It's been {lastWorkoutDaysAgo} days — your muscles are calling! 💪"],
    urgent: ["{name}, {lastWorkoutDaysAgo} days away?! Your comeback is going to be LEGENDARY! 🔥"],
  },
  atlas: {
    gentle: ["{name}, a {lastWorkoutDaysAgo}-day gap is within recovery range. Resume when ready."],
    moderate: ["Data shows {lastWorkoutDaysAgo} days off, {name}. Detraining begins at day 14."],
    urgent: ["{name}, {lastWorkoutDaysAgo}-day break detected. Recommend 50% intensity restart protocol."],
  },
  sage: {
    gentle: ["Thinking of you, {name}. 🌿 Whenever you're ready, I'm here."],
    moderate: ["It's been {lastWorkoutDaysAgo} days, {name}. Your body misses movement. Even a walk counts. 🌿"],
    urgent: ["{name}, I hope you're okay. 🌿 Remember, any movement is a gift to yourself."],
  },
  titan: {
    gentle: ["{name}. Rest day is over. Time to move. 🔥"],
    moderate: ["{lastWorkoutDaysAgo} days off, {name}? That's enough. No more excuses."],
    urgent: ["{name}. {lastWorkoutDaysAgo} days. I'm not going to sugarcoat it — get moving. NOW. 🔥"],
  },
};

// ——— Post-Workout Messages ———————————————————————

const POST_WORKOUT_MESSAGES: Record<string, string[]> = {
  pulse: [
    "CRUSHED IT, {name}! Another one in the books! ⚡",
    "That's what I'm talking about, {name}! {workoutsThisWeek} workouts this week!",
    "{name} just got STRONGER. Science says so. I say so. Facts. 💪",
  ],
  atlas: [
    "Workout logged, {name}. That's {workoutsThisWeek} sessions this week — on track.",
    "Session complete. Recovery window open for 30-45 min, {name}. Protein time.",
    "Good data point, {name}. Consistency metric improving week over week.",
  ],
  sage: [
    "Beautiful work, {name}. 🌿 Take a moment to appreciate what you just did.",
    "You showed up for yourself today, {name}. That matters more than any number.",
    "Breathe, smile, and be proud, {name}. {workoutsThisWeek} sessions of self-care this week. 🌿",
  ],
  titan: [
    "Done. Good. Now recover and come back stronger, {name}. 🔥",
    "{workoutsThisWeek} workouts this week, {name}. That's the bare minimum. Keep going.",
    "You survived. Barely. Tomorrow we push harder, {name}. 🔥",
  ],
};

// ——— Goal-Specific Encouragement ————————————————

const GOAL_MESSAGES: Record<string, Record<string, string[]>> = {
  pulse: {
    "weight loss": ["Every workout is a deposit in your fat-burning bank, {name}! 🔥"],
    "muscle gain": ["Progressive overload is your best friend, {name}! Push a little more! 💪"],
    "general fitness": ["Balanced fitness = balanced life, {name}! You're doing this right! ⚡"],
    endurance: ["One more minute, one more mile, {name}! Your lungs are getting stronger! 🏃"],
    flexibility: ["Flexibility is freedom, {name}! Your future self thanks you! 🧘"],
  },
  atlas: {
    "weight loss": ["Caloric deficit + resistance training = optimal fat loss, {name}."],
    "muscle gain": ["Hypertrophy requires progressive overload + adequate protein, {name}."],
    "general fitness": ["Balanced programming across strength, cardio, and mobility, {name}."],
    endurance: ["VO2 max improves ~5-10% per 4-week mesocycle with proper periodization, {name}."],
    flexibility: ["Consistent stretching yields measurable ROM improvements in 4-6 weeks, {name}."],
  },
  sage: {
    "weight loss": ["Your body is transforming at its own pace, {name}. Trust the journey. 🌿"],
    "muscle gain": ["Growing stronger is a form of self-love, {name}. Honor the process. 🌿"],
    "general fitness": ["Wholeness comes from balance, {name}. You're nurturing every part of yourself."],
    endurance: ["Each breath carries you further, {name}. You're expanding your capacity for life. 🌿"],
    flexibility: ["Opening your body opens your mind, {name}. Beautiful practice. 🧘"],
  },
  titan: {
    "weight loss": ["Fat doesn't burn itself, {name}. You showed up. That's how it's done. 🔥"],
    "muscle gain": ["Muscles are earned, not given, {name}. Keep lifting heavy."],
    "general fitness": ["Well-rounded athletes are dangerous athletes, {name}. Keep diversifying."],
    endurance: ["Pain is temporary, endurance is forever, {name}. Push through. 🔥"],
    flexibility: ["Flexibility prevents injury. Smart athletes stretch, {name}. Don't skip it."],
  },
};

// ——— Template Engine —————————————————————————————

function fillTemplate(template: string, context: UserContext): string {
  return template
    .replace(/{name}/g, context.userName || "champ")
    .replace(/{streakDays}/g, String(context.streakDays || 0))
    .replace(/{workoutsThisWeek}/g, String(context.workoutsThisWeek || 0))
    .replace(/{lastWorkoutDaysAgo}/g, String(context.lastWorkoutDaysAgo || 0))
    .replace(/{currentGoal}/g, context.currentGoal || "general fitness");
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ——— Public API ——————————————————————————————————

export function getGreeting(personaKey: string, context: UserContext): string {
  const tod = context.timeOfDay || getTimeOfDay();
  const greetings = GREETINGS[personaKey]?.[tod] || GREETINGS.pulse[tod];
  return fillTemplate(pickRandom(greetings), context);
}

export function getStreakMessage(personaKey: string, context: UserContext): string {
  let category: string;
  if (context.streakDays === 0) category = "lost";
  else if (context.streakDays < 7) category = "building";
  else if (context.streakDays < 30) category = "solid";
  else category = "epic";

  const messages = STREAK_MESSAGES[personaKey]?.[category] || STREAK_MESSAGES.pulse[category];
  return fillTemplate(pickRandom(messages), context);
}

export function getPostWorkoutMessage(personaKey: string, context: UserContext): string {
  const messages = POST_WORKOUT_MESSAGES[personaKey] || POST_WORKOUT_MESSAGES.pulse;
  return fillTemplate(pickRandom(messages), context);
}

export function getInactivityNudge(personaKey: string, context: UserContext): string {
  let urgency: string;
  if (context.lastWorkoutDaysAgo <= 3) urgency = "gentle";
  else if (context.lastWorkoutDaysAgo <= 7) urgency = "moderate";
  else urgency = "urgent";

  const messages = INACTIVITY_NUDGES[personaKey]?.[urgency] || INACTIVITY_NUDGES.pulse[urgency];
  return fillTemplate(pickRandom(messages), context);
}

export function getGoalMessage(personaKey: string, context: UserContext): string {
  const goal = context.currentGoal?.toLowerCase() || "general fitness";
  const personaGoals = GOAL_MESSAGES[personaKey] || GOAL_MESSAGES.pulse;
  const messages = personaGoals[goal] || personaGoals["general fitness"];
  return fillTemplate(pickRandom(messages), context);
}

// ——— System Prompt Builder ——————————————————————

export function buildCoachSystemPrompt(personaKey: string, context: UserContext): string {
  const persona = COACH_PERSONAS[personaKey] || COACH_PERSONAS.pulse;

  const contextBlock = [
    `User: ${context.userName || "User"}`,
    `Fitness Level: ${context.fitnessLevel || "unknown"}`,
    `Goal: ${context.currentGoal || "general fitness"}`,
    `Streak: ${context.streakDays || 0} days`,
    `Workouts This Week: ${context.workoutsThisWeek || 0}`,
    `Last Workout: ${context.lastWorkoutDaysAgo || 0} days ago`,
    context.recentMood ? `Recent Mood: ${context.recentMood}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are ${persona.name} ${persona.emoji}, a PeakPulse AI fitness coach.

PERSONALITY: ${persona.style}
TONE: ${persona.tone.join(", ")}
ENCOURAGEMENT STYLE: ${persona.encouragementStyle}
CORRECTION STYLE: ${persona.correctionStyle}
SIGN-OFF: ${persona.signOff}

USER CONTEXT:
${contextBlock}

RULES:
- Stay in character as ${persona.name} at all times
- Keep responses concise (2-4 sentences for quick questions, more for detailed advice)
- Reference the user's actual data (streak, workouts, goal) to personalize advice
- If the user seems discouraged, adapt your tone to be more supportive while staying in character
- Never provide medical advice — recommend consulting a professional for injuries or health concerns
- Use the user's name naturally but not in every sentence
- End longer messages with your signature sign-off when appropriate`;
}

// ——— Persistence —————————————————————————————————

const PERSONA_STORAGE_KEY = "@peakpulse/coach-persona";

export async function saveSelectedPersona(personaKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PERSONA_STORAGE_KEY, personaKey);
  } catch (error) {
    console.error("Failed to save coach persona:", error);
  }
}

export async function loadSelectedPersona(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(PERSONA_STORAGE_KEY);
    if (saved && COACH_PERSONAS[saved]) {
      return saved;
    }
  } catch (error) {
    console.error("Failed to load coach persona:", error);
  }
  return DEFAULT_PERSONA;
}

// ——— Contextual Welcome Message ——————————————————

export function getWelcomeMessage(personaKey: string, context: UserContext): string {
  const greeting = getGreeting(personaKey, context);
  const parts = [greeting];

  if (context.streakDays > 0) {
    parts.push(getStreakMessage(personaKey, context));
  } else if (context.lastWorkoutDaysAgo > 2) {
    parts.push(getInactivityNudge(personaKey, context));
  }

  if (context.currentGoal) {
    parts.push(getGoalMessage(personaKey, context));
  }

  return parts.join(" ");
}
