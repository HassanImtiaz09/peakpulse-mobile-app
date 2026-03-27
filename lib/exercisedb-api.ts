/**
 * ExerciseDB API Service
 *
 * Integrates with the free ExerciseDB v1 API (https://exercisedb-api.vercel.app)
 * to provide real animated GIF demonstrations for exercises.
 *
 * Uses a hardcoded mapping of exercise names → ExerciseDB IDs to avoid
 * runtime search API calls and rate limiting. GIF URLs follow a predictable
 * pattern: https://static.exercisedb.dev/media/{id}.gif
 */

/** ExerciseDB GIF base URL */
const GIF_BASE = "https://static.exercisedb.dev/media";

/**
 * Hardcoded mapping: normalised exercise name → ExerciseDB exercise ID.
 * Curated from the full 1,500-exercise database to pick the best visual match.
 */
const EXERCISE_ID_MAP: Record<string, string> = {
  // ── Chest ──────────────────────────────────────────────────────────────────
  "bench press":              "EIeI8Vf",   // barbell bench press
  "barbell bench press":      "EIeI8Vf",
  "dumbbell bench press":     "9YWQHXU",   // dumbbell bench press
  "incline bench press":      "dBbIRVp",   // barbell incline bench press
  "incline dumbbell press":   "ns0SIbU",   // dumbbell incline bench press
  "decline bench press":      "xwPbcJq",   // barbell decline bench press
  "close grip bench press":   "WcHl7ru",   // smith close-grip bench press
  "push up":                  "I4hDWkc",   // push-up
  "push-up":                  "I4hDWkc",
  "pushup":                   "I4hDWkc",
  "dumbbell fly":             "Gt7NXHF",   // dumbbell fly
  "cable crossover":          "0CXGHya",   // cable cross-over variation
  "cable fly":                "xLYSdtg",   // cable middle fly
  "chest press machine":      "DOoWcnA",   // lever chest press
  "pec deck":                 "0CXGHya",   // cable cross-over (closest match)
  "dip":                      "9WTm7dq",   // chest dip
  "chest dip":                "9WTm7dq",

  // ── Back ───────────────────────────────────────────────────────────────────
  "deadlift":                 "hrVQWvE",   // barbell straight leg deadlift
  "barbell row":              "eZyBC3j",   // barbell bent over row
  "barbell bent over row":    "eZyBC3j",
  "dumbbell bent over row":   "BJ0Hz5L",   // dumbbell bent over row
  "pull up":                  "lBDjFxJ",   // pull-up
  "pull-up":                  "lBDjFxJ",
  "chin up":                  "T2mxWqc",   // chin-up
  "chin-up":                  "T2mxWqc",
  "lat pulldown":             "LEprlgG",   // cable lat pulldown full ROM
  "seated cable row":         "fUBheHs",   // cable seated row
  "t-bar row":                "YdGOK7H",   // lever reverse t-bar row
  "bent over row":            "eZyBC3j",   // barbell bent over row
  "dumbbell row":             "C0MA9bC",   // dumbbell one arm bent-over row
  "pendlay row":              "r0z6xzQ",   // barbell pendlay row
  "tbar row":                 "BgljGjd",   // lever reverse t-bar row
  "single arm dumbbell row":  "BJ0Hz5L",   // dumbbell bent over row (closest)

  // ── Shoulders ──────────────────────────────────────────────────────────────
  "overhead press":           "PzQanLE",   // cable shoulder press
  "military press":           "PzQanLE",   // same
  "shoulder press":           "PzQanLE",
  "arnold press":             "PzQanLE",   // closest match
  "lateral raise":            "PxQwqVi",   // dumbbell lateral raise
  "cable lateral raise":      "PxQwqVi",
  "dumbbell shoulder press":  "znQUdHY",   // dumbbell seated shoulder press
  "front raise":              "3eGE2JC",   // dumbbell front raise
  "face pull":                "SpsOSXk",   // cable rear pulldown (closest)
  "rear delt fly":            "8DiFDVA",   // dumbbell rear fly
  "upright row":              "3XGGCwB",   // barbell upright row
  "shrug":                    "VYCsxNx",   // barbell shrug

  // ── Arms ───────────────────────────────────────────────────────────────────
  "barbell curl":             "NbVPDMW",   // dumbbell biceps curl (closest)
  "bicep curl":               "NbVPDMW",
  "dumbbell curl":            "NbVPDMW",
  "hammer curl":              "tR8GGCZ",   // dumbbell hammer curl
  "preacher curl":            "4YRXFK2",   // barbell preacher curl
  "concentration curl":       "NbVPDMW",   // dumbbell biceps curl
  "cable curl":               "QTXKWPh",   // cable pulldown bicep curl
  "tricep pushdown":          "qRZ5S1N",   // cable one arm tricep pushdown
  "skull crusher":            "h8LFzo9",   // barbell lying triceps extension skull crusher
  "overhead tricep extension":"mLXkPrQ",   // cable high pulley overhead tricep extension
  "tricep extension":         "mpKZGWz",   // dumbbell lying triceps extension
  "tricep dip":               "9WTm7dq",   // chest dip (same movement)
  "dumbbell kickback":        "W6PxUkg",   // dumbbell kickback

  // ── Legs ───────────────────────────────────────────────────────────────────
  "squat":                    "LIlE5Tn",   // jump squat (dynamic, good demo)
  "barbell squat":            "LIlE5Tn",
  "front squat":              "RZoaKdx",   // barbell front squat
  "goblet squat":             "VJBxXFi",   // dumbbell goblet squat
  "hack squat":               "VzJFJjp",   // barbell hack squat
  "leg press":                "7zdxRTl",   // smith leg press
  "romanian deadlift":        "7ywAWRd",   // barbell romanian deadlift
  "leg curl":                 "17lJ1kr",   // lever lying leg curl
  "leg extension":            "Nqxpjpd",   // lever leg extension
  "calf raise":               "yl2IYyy",   // cable standing calf raise
  "seated calf raise":        "KKdVuSA",   // barbell seated calf raise
  "hip thrust":               "Pjbc0Kt",   // resistance band hip thrusts
  "lunge":                    "Kxquu2E",   // barbell step-up (similar)
  "bulgarian split squat":    "9E25EOx",   // split squats
  "reverse lunge":            "SSsBDwB",   // dumbbell rear lunge
  "step up":                  "aXtJhlg",   // dumbbell step-up
  "glute bridge":             "u0cNiij",   // low glute bridge on floor
  "sumo deadlift":            "KgI0tqW",   // barbell sumo deadlift
  "stiff leg deadlift":       "5eLRITT",   // dumbbell stiff leg deadlift

  // ── Core ───────────────────────────────────────────────────────────────────
  "plank":                    "VBAWRPG",   // weighted front plank
  "russian twist":            "TXpHrQg",   // russian twist
  "hanging leg raise":        "4bDqVPQ",   // hanging leg raise
  "cable crunch":             "VBAWRPG",   // weighted front plank (closest)
  "mountain climber":         "u4bAmKp",   // mountain climber
  "bicycle crunch":           "tZkGYZ9",   // band bicycle crunch
  "ab wheel rollout":         "km2Ljzj",   // wheel run (closest)
  "crunch":                   "s8nrDXF",   // weighted crunch
  "sit up":                   "6ZCiYWQ",   // sit-up with arms on chest
  "leg raise":                "WhuFnR7",   // lying leg raise flat bench
  "side plank":               "5VXmnV5",   // bodyweight incline side plank
  "cable woodchop":           "fhZQPlV",   // cable twist (up-down)
  "dead bug":                 "VBAWRPG",   // weighted front plank (closest)

  // ── Full Body / Cardio ─────────────────────────────────────────────────────
  "burpee":                   "u4bAmKp",   // mountain climber (closest dynamic)
  "power clean":              "SGY8Zui",   // barbell clean and press
  "clean and jerk":           "SGY8Zui",
  "snatch":                   "SGY8Zui",   // barbell clean and press (closest)
  "box jump":                 "iPm26QU",   // box jump down with stabilization
  "kettlebell swing":         "UNNqXFm",   // kettlebell swing
  "farmer walk":              "qPEzJjA",   // farmers walk
  "battle rope":              "e1e76I2",   // jump rope (closest)
  "rowing machine":           "vpQaQkH",   // ski ergometer (closest)
  "jump rope":                "e1e76I2",   // jump rope
  "jumping jack":             "e1e76I2",   // jump rope (closest)
  "high knees":               "ealLwvX",   // high knee against wall
  "sprint":                   "oLrKqDH",   // run
  "run":                      "oLrKqDH",   // run
};

/**
 * Get the animated GIF URL for an exercise from ExerciseDB.
 * Returns null if the exercise is not in our mapping.
 */
export function getExerciseDbGifUrl(exerciseName: string): string | null {
  const normalised = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  const id = EXERCISE_ID_MAP[normalised];
  if (!id) return null;
  return `${GIF_BASE}/${id}.gif`;
}

/**
 * Check if an exercise has an ExerciseDB GIF available.
 */
export function hasExerciseDbGif(exerciseName: string): boolean {
  const normalised = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  return normalised in EXERCISE_ID_MAP;
}

/**
 * Get the ExerciseDB exercise ID for an exercise.
 */
export function getExerciseDbId(exerciseName: string): string | null {
  const normalised = exerciseName.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();
  return EXERCISE_ID_MAP[normalised] ?? null;
}

/**
 * Get all mapped exercise names (normalised).
 */
export function getAllMappedExercises(): string[] {
  return Object.keys(EXERCISE_ID_MAP);
}
