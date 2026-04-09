/**
 * XP Leaderboard — Generates simulated community leaderboard data
 * and compares the user's XP against anonymized community averages.
 *
 * Since we don't have a real social backend, this generates deterministic
 * but realistic-looking community data seeded by the current week/month.
 * The user's real XP is inserted into the rankings.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────────────────

export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  level: number;
  isCurrentUser: boolean;
  avatar: string; // emoji avatar
}

export interface LeaderboardData {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  userRank: number;
  userPercentile: number;
  communityAvg: number;
  communityMedian: number;
  totalParticipants: number;
}

export interface LeaderboardInsight {
  message: string;
  type: "ahead" | "behind" | "average" | "top";
  emoji: string;
}

// ── Constants ────────────────────────────────────────────────────────────

const COMMUNITY_NAMES = [
  "Alex M.", "Jordan K.", "Sam T.", "Riley P.", "Casey L.",
  "Morgan W.", "Taylor R.", "Quinn B.", "Avery S.", "Drew H.",
  "Jamie C.", "Reese F.", "Blake N.", "Skyler D.", "Finley G.",
  "Rowan J.", "Sage E.", "Parker A.", "Emerson V.", "Dakota Z.",
  "Hayden M.", "River K.", "Phoenix T.", "Kai P.", "Aspen L.",
  "Lennox W.", "Harley R.", "Marlowe B.", "Ellis S.", "Remy H.",
  "Oakley C.", "Sutton F.", "Arden N.", "Wren D.", "Shiloh G.",
  "Briar J.", "Indigo E.", "Zephyr A.", "Onyx V.", "Cove Z.",
  "Lane M.", "Hollis K.", "Sterling T.", "Beckett P.", "Calloway L.",
  "Merritt W.", "Linden R.", "Cypress B.", "Arbor S.", "Haven H.",
];

const AVATARS = [
  "🏋️", "💪", "🏃", "🧘", "🚴", "🏊", "⚡", "🔥", "🌟", "💎",
  "🎯", "🏆", "🥇", "🦁", "🐺", "🦅", "🐉", "🦊", "🐻", "🦈",
];

const LEADERBOARD_KEY = "@xp_leaderboard_cache";

// ── Pure Helper Functions (exported for testing) ─────────────────────────

/**
 * Deterministic pseudo-random number generator (seeded).
 * Returns a function that produces values in [0, 1).
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Get a seed based on the current period.
 * Weekly: changes every Monday. Monthly: changes every 1st.
 */
export function getPeriodSeed(period: LeaderboardPeriod): number {
  const now = new Date();
  if (period === "weekly") {
    // Seed based on ISO week number
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
    const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
    return now.getFullYear() * 100 + weekNum;
  } else if (period === "monthly") {
    return now.getFullYear() * 100 + now.getMonth();
  }
  // all_time: fixed seed
  return 42424242;
}

/**
 * Generate simulated community XP values for a given period.
 */
export function generateCommunityXP(
  period: LeaderboardPeriod,
  count: number = 50,
): number[] {
  const seed = getPeriodSeed(period);
  const rng = seededRandom(seed);

  // XP ranges by period
  const ranges: Record<LeaderboardPeriod, { min: number; max: number; topBoost: number }> = {
    weekly: { min: 20, max: 400, topBoost: 200 },
    monthly: { min: 100, max: 1800, topBoost: 800 },
    all_time: { min: 500, max: 12000, topBoost: 5000 },
  };

  const { min, max, topBoost } = ranges[period];
  const xpValues: number[] = [];

  for (let i = 0; i < count; i++) {
    // Use a skewed distribution (more people at lower XP)
    const raw = rng();
    const skewed = Math.pow(raw, 1.5); // Right-skewed
    let xp = Math.round(min + skewed * (max - min));

    // Top 5% get a boost
    if (rng() > 0.95) {
      xp += Math.round(rng() * topBoost);
    }

    xpValues.push(xp);
  }

  return xpValues.sort((a, b) => b - a);
}

/**
 * Build leaderboard entries from community XP values and user XP.
 */
export function buildLeaderboard(
  communityXP: number[],
  userXP: number,
  userName: string = "You",
  period: LeaderboardPeriod,
): LeaderboardData {
  const seed = getPeriodSeed(period);
  const rng = seededRandom(seed + 999);

  // Insert user XP into sorted list
  const allXP = [...communityXP, userXP].sort((a, b) => b - a);
  const userIndex = allXP.indexOf(userXP);

  // Build entries
  let communityIdx = 0;
  const entries: LeaderboardEntry[] = allXP.map((xp, idx) => {
    const isUser = idx === userIndex;
    if (isUser) {
      return {
        rank: idx + 1,
        name: userName,
        xp,
        level: xpToLevel(xp),
        isCurrentUser: true,
        avatar: "👤",
      };
    }
    const nameIdx = communityIdx % COMMUNITY_NAMES.length;
    const avatarIdx = Math.floor(rng() * AVATARS.length);
    communityIdx++;
    return {
      rank: idx + 1,
      name: COMMUNITY_NAMES[nameIdx],
      xp,
      level: xpToLevel(xp),
      isCurrentUser: false,
      avatar: AVATARS[avatarIdx],
    };
  });

  // Stats
  const totalParticipants = entries.length;
  const userRank = userIndex + 1;
  const userPercentile = Math.round(((totalParticipants - userRank) / totalParticipants) * 100);
  const communityAvg = Math.round(communityXP.reduce((s, x) => s + x, 0) / communityXP.length);
  const sorted = [...communityXP].sort((a, b) => a - b);
  const communityMedian = sorted[Math.floor(sorted.length / 2)] ?? 0;

  return {
    period,
    entries,
    userRank,
    userPercentile,
    communityAvg,
    communityMedian,
    totalParticipants,
  };
}

/**
 * Get a motivational insight based on user's position.
 */
export function getLeaderboardInsight(data: LeaderboardData, userXP: number): LeaderboardInsight {
  if (data.userRank === 1) {
    return { message: "You're #1! Keep pushing to stay on top.", type: "top", emoji: "👑" };
  }
  if (data.userRank <= 3) {
    return { message: `Top 3! Just ${data.entries[0].xp - userXP} XP behind #1.`, type: "top", emoji: "🥇" };
  }
  if (data.userPercentile >= 75) {
    return { message: `Top ${100 - data.userPercentile}%! You're outperforming most of the community.`, type: "ahead", emoji: "🔥" };
  }
  if (userXP >= data.communityAvg) {
    return { message: `Above average! You're ${userXP - data.communityAvg} XP ahead of the community average.`, type: "ahead", emoji: "💪" };
  }
  if (userXP >= data.communityMedian) {
    return { message: "You're right in the middle of the pack. A few more workouts will push you ahead!", type: "average", emoji: "📈" };
  }
  return { message: `${data.communityAvg - userXP} XP behind the average. Log a workout or meal to climb!`, type: "behind", emoji: "🚀" };
}

/**
 * Simple XP to level conversion (matches xp-engine.ts thresholds).
 */
function xpToLevel(xp: number): number {
  // Simplified: each level needs level * 50 XP
  let level = 1;
  let xpNeeded = 0;
  while (level < 50) {
    xpNeeded += level * 50;
    if (xp < xpNeeded) break;
    level++;
  }
  return level;
}

// ── Async Operations ─────────────────────────────────────────────────────

/**
 * Get leaderboard data for a given period, using user's real XP.
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  userXP: number,
  userName?: string,
): Promise<LeaderboardData> {
  const communityXP = generateCommunityXP(period);
  return buildLeaderboard(communityXP, userXP, userName, period);
}
