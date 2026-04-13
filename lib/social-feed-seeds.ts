import { UI } from "@/constants/ui-colors";
/**
 * Social Feed Seed Data
 *
 * Pre-populated example posts and weekly challenge templates to make the
 * Community and 7-Day Challenge sections feel populated for new users.
 * All posts are clearly labelled as examples from the FytNova team.
 *
 * These appear when the real feed is empty (no server posts yet).
 */

export interface SeedPost {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  type: "progress" | "achievement" | "challenge";
  caption?: string;
  weightKg?: number;
  bodyFatPercent?: number;
  photoUrl?: string;
  achievement?: string;
  likes: number;
  createdAt: string;
  isSeed: true;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

// ── Example Posts ─────────────────────────────────────────────────

export const SEED_POSTS: SeedPost[] = [
  // ── Workout Logs ──
  {
    id: -1,
    userId: -1,
    userName: "Alex (FytNova Team)",
    userAvatar: "💪",
    type: "progress",
    caption: "Crushed a new PR on bench press today — 100 kg for 3 reps! The progressive overload program is really paying off. Feeling strong 💪",
    weightKg: 82.5,
    likes: 47,
    createdAt: hoursAgo(2),
    isSeed: true,
  },
  {
    id: -2,
    userId: -2,
    userName: "Sarah M.",
    userAvatar: "🏃‍♀️",
    type: "progress",
    caption: "Week 4 of my running plan — just completed my first 10K without stopping! Started at barely 2K. Consistency is everything 🎯",
    likes: 89,
    createdAt: hoursAgo(5),
    isSeed: true,
  },
  {
    id: -3,
    userId: -3,
    userName: "Marcus J.",
    userAvatar: "🏋️",
    type: "progress",
    caption: "Leg day done right. Squats, Romanian deadlifts, and Bulgarian split squats. Walking might be optional tomorrow 😅",
    likes: 34,
    createdAt: hoursAgo(8),
    isSeed: true,
  },

  // ── Achievement Posts ──
  {
    id: -4,
    userId: -4,
    userName: "Emily R.",
    userAvatar: "⭐",
    type: "achievement",
    caption: "After 6 months of consistent training, I finally hit my goal weight! Down 12 kg and feeling amazing. This community kept me going ❤️",
    achievement: "Goal Weight Reached — 12 kg Lost",
    weightKg: 65,
    bodyFatPercent: 22,
    likes: 156,
    createdAt: hoursAgo(12),
    isSeed: true,
  },
  {
    id: -5,
    userId: -5,
    userName: "David K.",
    userAvatar: "🔥",
    type: "achievement",
    caption: "30-day workout streak complete! Didn't miss a single day. Some days were just 20 minutes, but showing up is what matters.",
    achievement: "30-Day Workout Streak",
    likes: 203,
    createdAt: daysAgo(1),
    isSeed: true,
  },
  {
    id: -6,
    userId: -6,
    userName: "Priya S.",
    userAvatar: "🧘",
    type: "achievement",
    caption: "First unassisted pull-up today! 4 months ago I couldn't even hang for 10 seconds. Progress isn't always linear but it's always worth it.",
    achievement: "First Unassisted Pull-Up",
    likes: 178,
    createdAt: daysAgo(1),
    isSeed: true,
  },

  // ── Challenge Posts ──
  {
    id: -7,
    userId: -7,
    userName: "Team FytNova",
    userAvatar: "⚡",
    type: "challenge",
    caption: "This week's community challenge: 7-Day Step Challenge — hit 10,000 steps every day! 1,243 people have already joined. Are you in? 🚶‍♂️",
    likes: 312,
    createdAt: daysAgo(2),
    isSeed: true,
  },
  {
    id: -8,
    userId: -8,
    userName: "Coach Mike",
    userAvatar: "🎯",
    type: "challenge",
    caption: "Day 5 of the Calorie Crusher challenge — burned 2,800 active calories this week! HIIT + strength combo is the secret. Who's keeping up? 🔥",
    likes: 67,
    createdAt: daysAgo(2),
    isSeed: true,
  },

  // ── Transformation & Tips ──
  {
    id: -9,
    userId: -9,
    userName: "Jordan T.",
    userAvatar: "📈",
    type: "progress",
    caption: "3-month progress check: Deadlift went from 80 kg to 140 kg. Squat from 60 kg to 110 kg. Tracking every session in FytNova made the difference.",
    likes: 124,
    createdAt: daysAgo(3),
    isSeed: true,
  },
  {
    id: -10,
    userId: -10,
    userName: "Nutrition Tip (FytNova)",
    userAvatar: "🥗",
    type: "progress",
    caption: "Quick tip: Meal prepping on Sunday saves 5+ hours during the week. Use the My Pantry feature to track what you have and plan meals around it!",
    likes: 95,
    createdAt: daysAgo(4),
    isSeed: true,
  },
  {
    id: -11,
    userId: -11,
    userName: "Lisa W.",
    userAvatar: "💃",
    type: "achievement",
    caption: "Completed my first full push-up set — 3 sets of 10! Started with wall push-ups 2 months ago. Every rep counts when you're building from zero.",
    achievement: "Push-Up Milestone — 3x10 Reps",
    likes: 142,
    createdAt: daysAgo(5),
    isSeed: true,
  },
  {
    id: -12,
    userId: -12,
    userName: "Ryan B.",
    userAvatar: "🏆",
    type: "challenge",
    caption: "Just won the 7-Day Plank Streak challenge! Final time: 3 minutes 45 seconds. My core has never been this strong. Next up: the 14-Day Step Marathon 🏃",
    achievement: "7-Day Plank Streak Champion",
    likes: 88,
    createdAt: daysAgo(6),
    isSeed: true,
  },
];

// ── Weekly Challenge Templates ──────────────────────────────────

export interface WeeklyChallengeTemplate {
  id: string;
  title: string;
  emoji: string;
  description: string;
  weekNumber: number; // 1-52 for the year
  category: "steps" | "strength" | "cardio" | "nutrition" | "mindfulness";
  dailyGoal: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  participantCount: number;
  color: string;
  tips: string[];
  rewards: string[];
}

export const WEEKLY_CHALLENGE_TEMPLATES: WeeklyChallengeTemplate[] = [
  {
    id: "wk_steps_10k",
    title: "10K Steps Every Day",
    emoji: "🚶",
    description: "Walk 10,000 steps daily for 7 days. The classic step challenge that builds healthy habits.",
    weekNumber: 1,
    category: "steps",
    dailyGoal: "10,000 steps",
    difficulty: "beginner",
    participantCount: 2847,
    color: UI.green,
    tips: [
      "Take a 15-minute walk after each meal",
      "Use stairs instead of elevators",
      "Walk during phone calls",
    ],
    rewards: ["Step Master Badge 🏅", "+50 XP"],
  },
  {
    id: "wk_push_up",
    title: "Push-Up Progression",
    emoji: "💪",
    description: "Start with 10 push-ups on Day 1, add 5 each day. Can you hit 40 by Day 7?",
    weekNumber: 2,
    category: "strength",
    dailyGoal: "10-40 push-ups (progressive)",
    difficulty: "beginner",
    participantCount: 1563,
    color: "#8B5CF6",
    tips: [
      "Modify to knee push-ups if needed",
      "Focus on form over speed",
      "Rest 60 seconds between sets",
    ],
    rewards: ["Push-Up Pro Badge 💪", "+75 XP"],
  },
  {
    id: "wk_hiit",
    title: "HIIT Burn Week",
    emoji: "🔥",
    description: "Complete a 20-minute HIIT session every day. Burn fat, build endurance, crush it.",
    weekNumber: 3,
    category: "cardio",
    dailyGoal: "20-minute HIIT session",
    difficulty: "intermediate",
    participantCount: 982,
    color: UI.orange2,
    tips: [
      "Alternate between 30s work / 15s rest",
      "Include burpees, mountain climbers, and jump squats",
      "Hydrate well before and after",
    ],
    rewards: ["HIIT Hero Badge 🔥", "+100 XP"],
  },
  {
    id: "wk_protein",
    title: "Protein Target Week",
    emoji: "🥩",
    description: "Hit your daily protein goal (1.6g per kg bodyweight) every day for a week.",
    weekNumber: 4,
    category: "nutrition",
    dailyGoal: "1.6g protein per kg bodyweight",
    difficulty: "intermediate",
    participantCount: 1245,
    color: UI.red,
    tips: [
      "Prep protein-rich snacks in advance",
      "Greek yogurt, eggs, and chicken are your friends",
      "Use the Pantry feature to track protein sources",
    ],
    rewards: ["Protein Pro Badge 🥩", "+75 XP"],
  },
  {
    id: "wk_plank",
    title: "Plank Progression",
    emoji: "🧘",
    description: "Hold a plank for increasing durations: 30s → 60s → 90s → 2min → 2.5min → 3min → 3.5min",
    weekNumber: 5,
    category: "strength",
    dailyGoal: "Plank hold (progressive duration)",
    difficulty: "beginner",
    participantCount: 1891,
    color: "#0EA5E9",
    tips: [
      "Keep your core tight and back flat",
      "Breathe steadily throughout",
      "If you shake, you're getting stronger",
    ],
    rewards: ["Core Crusher Badge 🧘", "+75 XP"],
  },
  {
    id: "wk_no_sugar",
    title: "No Added Sugar",
    emoji: "🚫",
    description: "Eliminate added sugars for 7 days. Read labels, cook fresh, and feel the difference.",
    weekNumber: 6,
    category: "nutrition",
    dailyGoal: "Zero added sugar intake",
    difficulty: "advanced",
    participantCount: 743,
    color: UI.red2,
    tips: [
      "Check labels for hidden sugars (dextrose, fructose, sucrose)",
      "Replace sweet snacks with fruit",
      "Meal prep to avoid temptation",
    ],
    rewards: ["Sugar-Free Warrior Badge 🚫", "+125 XP"],
  },
  {
    id: "wk_meditation",
    title: "Mindful Minutes",
    emoji: "🧠",
    description: "Meditate for 10 minutes every day. Build mental resilience alongside physical strength.",
    weekNumber: 7,
    category: "mindfulness",
    dailyGoal: "10-minute meditation",
    difficulty: "beginner",
    participantCount: 2156,
    color: "#6366F1",
    tips: [
      "Start with guided meditation if you're new",
      "Same time each day builds the habit",
      "Focus on breathing, not perfection",
    ],
    rewards: ["Zen Master Badge 🧠", "+50 XP"],
  },
  {
    id: "wk_squat",
    title: "Squat Challenge",
    emoji: "🏋️",
    description: "50 bodyweight squats per day for 7 days. Break them into sets throughout the day.",
    weekNumber: 8,
    category: "strength",
    dailyGoal: "50 bodyweight squats",
    difficulty: "intermediate",
    participantCount: 1342,
    color: "#7C3AED",
    tips: [
      "5 sets of 10 spread throughout the day",
      "Keep knees tracking over toes",
      "Add a pause at the bottom for extra burn",
    ],
    rewards: ["Squat King/Queen Badge 🏋️", "+100 XP"],
  },
];

/**
 * Get the current week's challenge template based on the week number of the year.
 */
export function getCurrentWeeklyChallenge(): WeeklyChallengeTemplate {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  const idx = (weekNum - 1) % WEEKLY_CHALLENGE_TEMPLATES.length;
  return WEEKLY_CHALLENGE_TEMPLATES[idx];
}

/**
 * Get seed posts for the social feed when the real feed is empty.
 * Returns posts sorted by recency.
 */
export function getSeedPosts(): SeedPost[] {
  return [...SEED_POSTS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
