import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@rest_timer_settings";

export type ExerciseType = "compound" | "isolation" | "cardio" | "stretching" | "custom";

export interface RestTimerSettings {
  compound: number;   // seconds
  isolation: number;
  cardio: number;
  stretching: number;
  custom: number;     // fallback for unclassified
}

export const DEFAULT_REST_TIMERS: RestTimerSettings = {
  compound: 90,
  isolation: 60,
  cardio: 30,
  stretching: 45,
  custom: 60,
};

// ─── Common compound exercises (multi-joint) ─────────────────────────────────
const COMPOUND_KEYWORDS = [
  "squat", "deadlift", "bench press", "overhead press", "military press",
  "barbell row", "bent-over row", "pull-up", "chin-up", "dip",
  "clean", "snatch", "thruster", "lunge", "leg press",
  "push-up", "push up", "hip thrust", "rack pull", "front squat",
  "sumo deadlift", "incline press", "decline press", "t-bar row",
  "pendlay row", "power clean", "hang clean", "romanian deadlift",
  "bulgarian split squat", "step-up", "farmer", "carry",
];

// ─── Common isolation exercises (single-joint) ──────────────────────────────
const ISOLATION_KEYWORDS = [
  "curl", "extension", "fly", "flye", "raise", "kickback",
  "pullover", "shrug", "calf raise", "leg curl", "leg extension",
  "hamstring curl", "tricep", "bicep", "lateral raise", "front raise",
  "rear delt", "cable crossover", "pec deck", "concentration",
  "preacher", "wrist curl", "face pull", "ab crunch", "sit-up",
  "plank", "crunch", "side bend",
];

// ─── Cardio keywords ─────────────────────────────────────────────────────────
const CARDIO_KEYWORDS = [
  "run", "sprint", "jog", "cardio", "hiit", "burpee", "jump",
  "jumping jack", "mountain climber", "rowing", "cycling", "bike",
  "treadmill", "elliptical", "stair", "box jump", "skipping",
  "battle rope", "sled",
];

// ─── Stretching keywords ─────────────────────────────────────────────────────
const STRETCHING_KEYWORDS = [
  "stretch", "yoga", "mobility", "foam roll", "cool down",
  "warm up", "flexibility", "pigeon", "child's pose", "cat cow",
  "downward dog",
];

/**
 * Classify an exercise name into a type for rest timer selection.
 */
export function classifyExercise(name: string): ExerciseType {
  const lower = name.toLowerCase();
  if (STRETCHING_KEYWORDS.some(k => lower.includes(k))) return "stretching";
  if (CARDIO_KEYWORDS.some(k => lower.includes(k))) return "cardio";
  if (COMPOUND_KEYWORDS.some(k => lower.includes(k))) return "compound";
  if (ISOLATION_KEYWORDS.some(k => lower.includes(k))) return "isolation";
  return "custom";
}

/**
 * Get the rest time in seconds for a given exercise name.
 */
export function getRestTimeForExercise(name: string, settings: RestTimerSettings): number {
  const type = classifyExercise(name);
  return settings[type];
}

/**
 * Load rest timer settings from AsyncStorage.
 */
export async function loadRestTimerSettings(): Promise<RestTimerSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_REST_TIMERS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_REST_TIMERS };
}

/**
 * Save rest timer settings to AsyncStorage.
 */
export async function saveRestTimerSettings(settings: RestTimerSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
