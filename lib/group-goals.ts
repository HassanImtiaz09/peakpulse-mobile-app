/**
 * Group Goals Service — collective weekly targets for the entire social circle.
 *
 * The circle sets a combined target (e.g., 500K steps) and all members
 * contribute towards it. Progress is tracked per member.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FriendProfile } from "@/lib/social-circle";

// ── Types ────────────────────────────────────────────────────────────

export type GroupGoalMetric = "steps" | "calories" | "workouts" | "distance";
export type GroupGoalStatus = "active" | "completed" | "failed" | "expired";

export interface GroupGoalContribution {
  userId: string;
  userName: string;
  avatarEmoji: string;
  value: number;
  percentage: number; // 0-100
}

export interface GroupGoal {
  id: string;
  metric: GroupGoalMetric;
  target: number;
  currentTotal: number;
  status: GroupGoalStatus;
  contributions: GroupGoalContribution[];
  startDate: string; // ISO
  endDate: string;   // ISO
  createdAt: string;
  createdBy: string;
  isAchieved: boolean;
}

interface GroupGoalStore {
  goals: GroupGoal[];
  totalGoalsCompleted: number;
  totalGoalsFailed: number;
}

// ── Storage ──────────────────────────────────────────────────────────

const STORE_KEY = "@peakpulse_group_goals";

export async function getGroupGoalStore(): Promise<GroupGoalStore> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { goals: [], totalGoalsCompleted: 0, totalGoalsFailed: 0 };
}

async function saveStore(store: GroupGoalStore): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// ── Helpers ──────────────────────────────────────────────────────────

function randomId(): string {
  return `gg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a new group goal for the circle.
 */
export async function createGroupGoal(
  metric: GroupGoalMetric,
  target: number,
  durationDays: number,
  createdByName: string,
  friends: FriendProfile[],
): Promise<GroupGoal> {
  const store = await getGroupGoalStore();
  const now = new Date();

  // Generate initial contributions for all members
  const contributions: GroupGoalContribution[] = [
    {
      userId: "current_user",
      userName: createdByName,
      avatarEmoji: "🏆",
      value: 0,
      percentage: 0,
    },
    ...friends.map((f) => ({
      userId: f.id,
      userName: f.name,
      avatarEmoji: f.avatarEmoji,
      value: 0,
      percentage: 0,
    })),
  ];

  const goal: GroupGoal = {
    id: randomId(),
    metric,
    target,
    currentTotal: 0,
    status: "active",
    contributions,
    startDate: now.toISOString(),
    endDate: addDays(now, durationDays).toISOString(),
    createdAt: now.toISOString(),
    createdBy: createdByName,
    isAchieved: false,
  };

  store.goals.unshift(goal);
  await saveStore(store);
  return goal;
}

/**
 * Update progress for a group goal.
 * Recalculates contributions and checks completion.
 */
export async function updateGroupGoalProgress(
  goalId: string,
  userContribution: number,
  friends: FriendProfile[],
): Promise<GroupGoal | null> {
  const store = await getGroupGoalStore();
  const goal = store.goals.find((g) => g.id === goalId);
  if (!goal || goal.status !== "active") return null;

  // Update current user contribution
  const userEntry = goal.contributions.find((c) => c.userId === "current_user");
  if (userEntry) {
    userEntry.value = userContribution;
  }

  // Update friend contributions from their profiles
  for (const contrib of goal.contributions) {
    if (contrib.userId === "current_user") continue;
    const friend = friends.find((f) => f.id === contrib.userId);
    if (friend) {
      contrib.value = getFriendMetricValue(friend, goal.metric);
    }
  }

  // Calculate totals and percentages
  goal.currentTotal = goal.contributions.reduce((s, c) => s + c.value, 0);
  for (const contrib of goal.contributions) {
    contrib.percentage = goal.currentTotal > 0
      ? Math.round((contrib.value / goal.currentTotal) * 100)
      : 0;
  }

  // Check if goal is achieved
  if (goal.currentTotal >= goal.target) {
    goal.isAchieved = true;
    goal.status = "completed";
    store.totalGoalsCompleted += 1;
  }

  // Check if goal has expired
  if (new Date() >= new Date(goal.endDate) && !goal.isAchieved) {
    goal.status = "failed";
    store.totalGoalsFailed += 1;
  }

  await saveStore(store);
  return goal;
}

function getFriendMetricValue(friend: FriendProfile, metric: GroupGoalMetric): number {
  switch (metric) {
    case "steps": return friend.weeklySteps;
    case "calories": return friend.weeklyCalories;
    case "workouts": return friend.weeklyWorkouts;
    case "distance": return friend.weeklyDistance;
  }
}

/**
 * Get all group goals.
 */
export async function getGroupGoals(): Promise<GroupGoal[]> {
  const store = await getGroupGoalStore();
  return store.goals;
}

/**
 * Get active group goals.
 */
export async function getActiveGroupGoals(): Promise<GroupGoal[]> {
  const store = await getGroupGoalStore();
  return store.goals.filter((g) => g.status === "active");
}

/**
 * Delete a group goal.
 */
export async function deleteGroupGoal(goalId: string): Promise<void> {
  const store = await getGroupGoalStore();
  store.goals = store.goals.filter((g) => g.id !== goalId);
  await saveStore(store);
}

// ── Demo Data ────────────────────────────────────────────────────────

/**
 * Load or create demo group goals for first-time users.
 */
export async function loadOrCreateDemoGroupGoals(
  userName: string,
  friends: FriendProfile[],
): Promise<GroupGoal[]> {
  const store = await getGroupGoalStore();
  if (store.goals.length > 0) return store.goals;

  const now = new Date();
  const fiveDaysAgo = addDays(now, -5);

  // Create one active demo goal
  const contributions: GroupGoalContribution[] = [
    { userId: "current_user", userName, avatarEmoji: "🏆", value: 52000, percentage: 0 },
    ...friends.slice(0, 5).map((f) => ({
      userId: f.id,
      userName: f.name,
      avatarEmoji: f.avatarEmoji,
      value: Math.round(30000 + Math.random() * 40000),
      percentage: 0,
    })),
  ];

  const total = contributions.reduce((s, c) => s + c.value, 0);
  for (const c of contributions) {
    c.percentage = Math.round((c.value / total) * 100);
  }

  const demoGoal: GroupGoal = {
    id: randomId(),
    metric: "steps",
    target: 500000,
    currentTotal: total,
    status: "active",
    contributions,
    startDate: fiveDaysAgo.toISOString(),
    endDate: addDays(fiveDaysAgo, 7).toISOString(),
    createdAt: fiveDaysAgo.toISOString(),
    createdBy: userName,
    isAchieved: total >= 500000,
  };

  if (demoGoal.isAchieved) {
    demoGoal.status = "completed";
    store.totalGoalsCompleted = 1;
  }

  // Create one completed demo goal
  const completedContribs: GroupGoalContribution[] = [
    { userId: "current_user", userName, avatarEmoji: "🏆", value: 3200, percentage: 25 },
    ...friends.slice(0, 3).map((f, i) => ({
      userId: f.id,
      userName: f.name,
      avatarEmoji: f.avatarEmoji,
      value: 2500 + i * 500,
      percentage: 0,
    })),
  ];
  const compTotal = completedContribs.reduce((s, c) => s + c.value, 0);
  for (const c of completedContribs) {
    c.percentage = Math.round((c.value / compTotal) * 100);
  }

  const completedGoal: GroupGoal = {
    id: randomId(),
    metric: "calories",
    target: 10000,
    currentTotal: compTotal,
    status: "completed",
    contributions: completedContribs,
    startDate: addDays(now, -14).toISOString(),
    endDate: addDays(now, -7).toISOString(),
    createdAt: addDays(now, -14).toISOString(),
    createdBy: userName,
    isAchieved: true,
  };

  store.goals = [demoGoal, completedGoal];
  await saveStore(store);
  return store.goals;
}

// ── Display Helpers ──────────────────────────────────────────────────

export function getMetricLabel(metric: GroupGoalMetric): string {
  switch (metric) {
    case "steps": return "Steps";
    case "calories": return "Calories";
    case "workouts": return "Workouts";
    case "distance": return "Distance (km)";
  }
}

export function getMetricEmoji(metric: GroupGoalMetric): string {
  switch (metric) {
    case "steps": return "👟";
    case "calories": return "🔥";
    case "workouts": return "💪";
    case "distance": return "📏";
  }
}

export function getMetricUnit(metric: GroupGoalMetric): string {
  switch (metric) {
    case "steps": return "steps";
    case "calories": return "kcal";
    case "workouts": return "workouts";
    case "distance": return "km";
  }
}

export function formatMetricValue(metric: GroupGoalMetric, value: number): string {
  if (metric === "steps") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value}`;
  }
  if (metric === "distance") {
    return `${value.toFixed(1)}`;
  }
  return value.toLocaleString();
}

export function getProgressPercentage(current: number, target: number): number {
  return Math.min(Math.round((current / target) * 100), 100);
}

export function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
