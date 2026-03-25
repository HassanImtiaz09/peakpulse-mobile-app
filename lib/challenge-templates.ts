/**
 * Challenge Templates Service
 *
 * Pre-built challenge templates that users can launch within their
 * social circles. Each template defines the challenge type, duration,
 * daily targets, and rewards.
 *
 * Templates are categorised by difficulty and focus area.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────────

export type TemplateCategory = "steps" | "calories" | "workout" | "streak" | "distance" | "custom";
export type TemplateDifficulty = "beginner" | "intermediate" | "advanced" | "elite";

export interface ChallengeTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  durationDays: number;
  dailyTarget: number;
  unit: string;
  totalTarget: number;
  reward: string;
  rewardEmoji: string;
  color: string;
  tips: string[];
  isPopular: boolean;
  minParticipants: number;
  maxParticipants: number;
}

export interface LaunchedChallenge {
  id: string;
  templateId: string;
  templateName: string;
  templateEmoji: string;
  category: TemplateCategory;
  durationDays: number;
  dailyTarget: number;
  unit: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  participants: ChallengeParticipant[];
  status: "active" | "completed" | "cancelled";
  createdAt: string;
}

export interface ChallengeParticipant {
  id: string;
  name: string;
  emoji: string;
  dailyProgress: number[]; // one entry per day
  total: number;
  isCreator: boolean;
}

// ── Storage ──────────────────────────────────────────────────────

const LAUNCHED_KEY = "@launched_template_challenges";

export async function getLaunchedChallenges(): Promise<LaunchedChallenge[]> {
  try {
    const raw = await AsyncStorage.getItem(LAUNCHED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function saveLaunchedChallenges(challenges: LaunchedChallenge[]): Promise<void> {
  await AsyncStorage.setItem(LAUNCHED_KEY, JSON.stringify(challenges));
}

// ── Pre-Built Templates ──────────────────────────────────────────

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // ── Steps ──
  {
    id: "steps_7day_10k",
    name: "7-Day Step Challenge",
    emoji: "🚶",
    description: "Hit 10,000 steps every day for a week. The classic fitness challenge.",
    category: "steps",
    difficulty: "beginner",
    durationDays: 7,
    dailyTarget: 10000,
    unit: "steps",
    totalTarget: 70000,
    reward: "Step Master Badge",
    rewardEmoji: "🏅",
    color: "#22C55E",
    tips: [
      "Take a 15-minute walk after each meal",
      "Use stairs instead of elevators",
      "Park further away from entrances",
    ],
    isPopular: true,
    minParticipants: 2,
    maxParticipants: 10,
  },
  {
    id: "steps_14day_15k",
    name: "14-Day Step Marathon",
    emoji: "🏃",
    description: "15,000 steps daily for two weeks. Push your endurance to the limit.",
    category: "steps",
    difficulty: "intermediate",
    durationDays: 14,
    dailyTarget: 15000,
    unit: "steps",
    totalTarget: 210000,
    reward: "Marathon Walker Badge",
    rewardEmoji: "🥇",
    color: "#3B82F6",
    tips: [
      "Schedule two 30-minute walks per day",
      "Walk during phone calls",
      "Explore new walking routes for motivation",
    ],
    isPopular: false,
    minParticipants: 2,
    maxParticipants: 10,
  },
  // ── Calories ──
  {
    id: "cal_7day_burn",
    name: "Calorie Crusher Week",
    emoji: "🔥",
    description: "Burn 500+ active calories every day for 7 days. Torch that fat.",
    category: "calories",
    difficulty: "intermediate",
    durationDays: 7,
    dailyTarget: 500,
    unit: "kcal",
    totalTarget: 3500,
    reward: "Calorie Crusher Badge",
    rewardEmoji: "💪",
    color: "#F97316",
    tips: [
      "Combine cardio and strength training",
      "HIIT sessions burn more in less time",
      "Track with your wearable for accuracy",
    ],
    isPopular: true,
    minParticipants: 2,
    maxParticipants: 10,
  },
  {
    id: "cal_protein_week",
    name: "Protein Goal Week",
    emoji: "🥩",
    description: "Hit your protein target every single day for a week. Build that muscle.",
    category: "calories",
    difficulty: "beginner",
    durationDays: 7,
    dailyTarget: 150,
    unit: "g protein",
    totalTarget: 1050,
    reward: "Protein Pro Badge",
    rewardEmoji: "🏋️",
    color: "#EF4444",
    tips: [
      "Prep protein-rich snacks in advance",
      "Add protein to every meal",
      "Greek yogurt and eggs are your friends",
    ],
    isPopular: true,
    minParticipants: 2,
    maxParticipants: 10,
  },
  // ── Workout ──
  {
    id: "workout_5day_streak",
    name: "5-Day Workout Streak",
    emoji: "💪",
    description: "Complete a workout 5 days in a row. No excuses, no rest days.",
    category: "workout",
    difficulty: "intermediate",
    durationDays: 5,
    dailyTarget: 1,
    unit: "workouts",
    totalTarget: 5,
    reward: "Iron Will Badge",
    rewardEmoji: "🦾",
    color: "#8B5CF6",
    tips: [
      "Alternate muscle groups to avoid fatigue",
      "Even 20 minutes counts — just show up",
      "Lay out your gym clothes the night before",
    ],
    isPopular: true,
    minParticipants: 2,
    maxParticipants: 10,
  },
  {
    id: "workout_30day",
    name: "30-Day Transformation",
    emoji: "🔄",
    description: "Work out at least 5 days per week for 30 days. Transform your body.",
    category: "workout",
    difficulty: "advanced",
    durationDays: 30,
    dailyTarget: 1,
    unit: "workouts",
    totalTarget: 22,
    reward: "Transformation Badge",
    rewardEmoji: "🏆",
    color: "#F59E0B",
    tips: [
      "Plan your weekly schedule in advance",
      "Include rest days for recovery",
      "Take progress photos every week",
    ],
    isPopular: false,
    minParticipants: 2,
    maxParticipants: 20,
  },
  // ── Streak ──
  {
    id: "streak_21day",
    name: "21-Day Habit Builder",
    emoji: "📅",
    description: "Log activity for 21 consecutive days to build an unbreakable habit.",
    category: "streak",
    difficulty: "intermediate",
    durationDays: 21,
    dailyTarget: 1,
    unit: "check-ins",
    totalTarget: 21,
    reward: "Habit Master Badge",
    rewardEmoji: "🧠",
    color: "#10B981",
    tips: [
      "Set a daily alarm as a reminder",
      "Stack the habit with something you already do",
      "Track your streak visually for motivation",
    ],
    isPopular: false,
    minParticipants: 2,
    maxParticipants: 20,
  },
  // ── Distance ──
  {
    id: "distance_50km_week",
    name: "50km Week",
    emoji: "🗺️",
    description: "Cover 50 kilometres in a week through walking, running, or cycling.",
    category: "distance",
    difficulty: "advanced",
    durationDays: 7,
    dailyTarget: 7.14,
    unit: "km",
    totalTarget: 50,
    reward: "Explorer Badge",
    rewardEmoji: "🌍",
    color: "#06B6D4",
    tips: [
      "Mix walking and running to hit the target",
      "Use a GPS watch for accurate tracking",
      "Plan scenic routes to stay motivated",
    ],
    isPopular: false,
    minParticipants: 2,
    maxParticipants: 10,
  },
  {
    id: "distance_100km_month",
    name: "100km Monthly Challenge",
    emoji: "🏔️",
    description: "Cover 100 kilometres in a month. Consistency over intensity.",
    category: "distance",
    difficulty: "intermediate",
    durationDays: 30,
    dailyTarget: 3.33,
    unit: "km",
    totalTarget: 100,
    reward: "Century Badge",
    rewardEmoji: "💯",
    color: "#14B8A6",
    tips: [
      "Just 3.3km per day — a 30-minute walk",
      "Track cumulative distance for motivation",
      "Invite friends to walk with you",
    ],
    isPopular: true,
    minParticipants: 2,
    maxParticipants: 20,
  },
];

// ── Helpers ──────────────────────────────────────────────────────

export function getTemplatesByCategory(category: TemplateCategory): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter((t) => t.category === category);
}

export function getPopularTemplates(): ChallengeTemplate[] {
  return CHALLENGE_TEMPLATES.filter((t) => t.isPopular);
}

export function getTemplateById(id: string): ChallengeTemplate | undefined {
  return CHALLENGE_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateDifficultyLabel(d: TemplateDifficulty): string {
  switch (d) {
    case "beginner": return "Beginner";
    case "intermediate": return "Intermediate";
    case "advanced": return "Advanced";
    case "elite": return "Elite";
  }
}

export function getTemplateDifficultyColor(d: TemplateDifficulty): string {
  switch (d) {
    case "beginner": return "#22C55E";
    case "intermediate": return "#F59E0B";
    case "advanced": return "#EF4444";
    case "elite": return "#8B5CF6";
  }
}

export function getCategoryLabel(c: TemplateCategory): string {
  switch (c) {
    case "steps": return "Steps";
    case "calories": return "Calories";
    case "workout": return "Workout";
    case "streak": return "Streak";
    case "distance": return "Distance";
    case "custom": return "Custom";
  }
}

export function getCategoryIcon(c: TemplateCategory): string {
  switch (c) {
    case "steps": return "directions-walk";
    case "calories": return "local-fire-department";
    case "workout": return "fitness-center";
    case "streak": return "bolt";
    case "distance": return "explore";
    case "custom": return "tune";
  }
}

// ── Launch Challenge from Template ───────────────────────────────

function randomId(): string {
  return `lc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function launchChallengeFromTemplate(
  template: ChallengeTemplate,
  creatorId: string,
  creatorName: string,
  creatorEmoji: string,
  friendIds: { id: string; name: string; emoji: string }[],
): Promise<LaunchedChallenge> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + template.durationDays);

  const participants: ChallengeParticipant[] = [
    {
      id: creatorId,
      name: creatorName,
      emoji: creatorEmoji,
      dailyProgress: new Array(template.durationDays).fill(0),
      total: 0,
      isCreator: true,
    },
    ...friendIds.map((f) => ({
      id: f.id,
      name: f.name,
      emoji: f.emoji,
      dailyProgress: new Array(template.durationDays).fill(0),
      total: 0,
      isCreator: false,
    })),
  ];

  const challenge: LaunchedChallenge = {
    id: randomId(),
    templateId: template.id,
    templateName: template.name,
    templateEmoji: template.emoji,
    category: template.category,
    durationDays: template.durationDays,
    dailyTarget: template.dailyTarget,
    unit: template.unit,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    participants,
    status: "active",
    createdAt: now.toISOString(),
  };

  const existing = await getLaunchedChallenges();
  existing.unshift(challenge);
  await saveLaunchedChallenges(existing);

  return challenge;
}

export async function updateChallengeProgress(
  challengeId: string,
  participantId: string,
  dayIndex: number,
  value: number,
): Promise<LaunchedChallenge | null> {
  const challenges = await getLaunchedChallenges();
  const idx = challenges.findIndex((c) => c.id === challengeId);
  if (idx < 0) return null;

  const challenge = challenges[idx];
  const participant = challenge.participants.find((p) => p.id === participantId);
  if (!participant) return null;

  if (dayIndex >= 0 && dayIndex < participant.dailyProgress.length) {
    participant.dailyProgress[dayIndex] = value;
    participant.total = participant.dailyProgress.reduce((a, b) => a + b, 0);
  }

  // Check if challenge is complete
  const now = new Date();
  const endDate = new Date(challenge.endDate);
  if (now >= endDate && challenge.status === "active") {
    challenge.status = "completed";
  }

  challenges[idx] = challenge;
  await saveLaunchedChallenges(challenges);
  return challenge;
}

export async function cancelLaunchedChallenge(challengeId: string): Promise<void> {
  const challenges = await getLaunchedChallenges();
  const idx = challenges.findIndex((c) => c.id === challengeId);
  if (idx >= 0) {
    challenges[idx].status = "cancelled";
    await saveLaunchedChallenges(challenges);
  }
}

export async function getActiveLaunchedChallenges(): Promise<LaunchedChallenge[]> {
  const challenges = await getLaunchedChallenges();
  return challenges.filter((c) => c.status === "active");
}

export async function getCompletedLaunchedChallenges(): Promise<LaunchedChallenge[]> {
  const challenges = await getLaunchedChallenges();
  return challenges.filter((c) => c.status === "completed");
}

export function getChallengeLeader(challenge: LaunchedChallenge): ChallengeParticipant | null {
  if (challenge.participants.length === 0) return null;
  return challenge.participants.reduce((best, p) => p.total > best.total ? p : best);
}

export function getDaysElapsed(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}
