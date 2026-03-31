/**
 * exercise-stock-videos.ts — Maps exercise names to free stock video URLs.
 *
 * All videos are sourced from Pexels.com under the Pexels License (free for
 * personal and commercial use, attribution appreciated).
 *
 * 75 exercises mapped to Pexels stock videos.
 */

export interface StockVideoEntry {
  /** Direct MP4 URL */
  url: string;
  /** Credit / attribution */
  credit: string;
  /** Pexels page URL for reference */
  sourceUrl: string;
}

/**
 * Map of exercise names (lowercase) → stock video info.
 * Keys must match the `name` field from exercise-data.ts (lowercased).
 */
const STOCK_VIDEO_MAP: Record<string, StockVideoEntry> = {
  "ab wheel rollout": {
    url: "https://videos.pexels.com/video-files/8026953/8026953-sd_338_640_25fps.mp4",
    credit: "MART  PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/an-ab-roller-on-a-black-surface-8026953/",
  },
  "arnold press": {
    url: "https://videos.pexels.com/video-files/20535458/20535458-sd_360_640_25fps.mp4",
    credit: "Павел Лобашкин / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-girl-at-the-gym-doing-dumbbells-20535458/",
  },
  "barbell curl": {
    url: "https://videos.pexels.com/video-files/6548000/6548000-sd_360_640_24fps.mp4",
    credit: "Andres  Ayrton / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-exercising-with-a-barbell-6548000/",
  },
  "battle rope": {
    url: "https://videos.pexels.com/video-files/4943928/4943928-sd_338_640_24fps.mp4",
    credit: "Anastasia  Shuraeva / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-working-out-at-the-gym-4943928/",
  },
  "bench press": {
    url: "https://videos.pexels.com/video-files/29569377/12727679_360_640_60fps.mp4",
    credit: "JULLIAN PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/dynamic-weight-training-overhead-shot-29569377/",
  },
  "bent over row": {
    url: "https://videos.pexels.com/video-files/5319764/5319764-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-5319764/",
  },
  "bicep curl": {
    url: "https://videos.pexels.com/video-files/6547801/6547801-sd_360_640_24fps.mp4",
    credit: "Andres  Ayrton / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-doing-dumbbell-curls-6547801/",
  },
  "bicycle crunch": {
    url: "https://videos.pexels.com/video-files/8026545/8026545-sd_338_640_25fps.mp4",
    credit: "MART  PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-working-out-8026545/",
  },
  "box jump": {
    url: "https://videos.pexels.com/video-files/6388435/6388435-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-jump-box-6388435/",
  },
  "bulgarian split squat": {
    url: "https://videos.pexels.com/video-files/8026940/8026940-sd_338_640_25fps.mp4",
    credit: "MART  PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-single-leg-squats-at-home-8026940/",
  },
  "burpee": {
    url: "https://videos.pexels.com/video-files/8026934/8026934-sd_338_640_25fps.mp4",
    credit: "MART  PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-doing-exercise-8026934/",
  },
  "cable crossover": {
    url: "https://videos.pexels.com/video-files/5319434/5319434-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-inside-the-gym-5319434/",
  },
  "cable fly": {
    url: "https://videos.pexels.com/video-files/8402113/8402113-sd_360_640_30fps.mp4",
    credit: "RDNE Stock project / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-dumbbell-chest-flys-at-an-outdoor-gym-8402113/",
  },
  "cable woodchop": {
    url: "https://videos.pexels.com/video-files/34491184/14614263_360_640_30fps.mp4",
    credit: "Pexels User / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-cable-exercise-workout-in-gym-34491184/",
  },
  "calf raise": {
    url: "https://videos.pexels.com/video-files/6455076/6455076-sd_360_640_24fps.mp4",
    credit: "Julia Larson / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-doing-hanging-knee-raises-at-the-gym-6455076/",
  },
  "chest dip": {
    url: "https://videos.pexels.com/video-files/8401314/8401314-sd_360_640_30fps.mp4",
    credit: "RDNE Stock project / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-doing-exercise-outdoors-8401314/",
  },
  "chin up": {
    url: "https://videos.pexels.com/video-files/33486546/14244558_360_640_30fps.mp4",
    credit: "Sport O'Scope / Pexels",
    sourceUrl: "https://www.pexels.com/video/outdoor-calisthenics-exercise-on-pull-up-bar-33486546/",
  },
  "close grip bench press": {
    url: "https://videos.pexels.com/video-files/29546656/12718515_360_640_60fps.mp4",
    credit: "JULLIAN PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/dimly-lit-gym-workout-with-weights-and-equipment-29546656/",
  },
  "concentration curl": {
    url: "https://videos.pexels.com/video-files/4921646/4921646-sd_356_640_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921646/",
  },
  "crunch": {
    url: "https://videos.pexels.com/video-files/8893543/8893543-sd_338_640_24fps.mp4",
    credit: "Jill Burrow / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-exercise-8893543/",
  },
  "dead bug": {
    url: "https://videos.pexels.com/video-files/8026951/8026951-sd_338_640_25fps.mp4",
    credit: "MART  PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-working-out-8026951/",
  },
  "deadlift": {
    url: "https://videos.pexels.com/video-files/12890962/12890962-sd_360_640_30fps.mp4",
    credit: "Connor Scott McManus / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-lifting-weights-in-a-gym-12890962/",
  },
  "decline bench press": {
    url: "https://videos.pexels.com/video-files/29546656/12718515_360_640_60fps.mp4",
    credit: "JULLIAN PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/dimly-lit-gym-workout-with-weights-and-equipment-29546656/",
  },
  "dip": {
    url: "https://videos.pexels.com/video-files/34568748/14646224_360_640_25fps.mp4",
    credit: "JULLIAN PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/dynamic-workout-man-exercising-on-parallel-bars-34568748/",
  },
  "dumbbell fly": {
    url: "https://videos.pexels.com/video-files/8402113/8402113-sd_360_640_30fps.mp4",
    credit: "RDNE Stock project / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-dumbbell-chest-flys-at-an-outdoor-gym-8402113/",
  },
  "dumbbell row": {
    url: "https://videos.pexels.com/video-files/20535458/20535458-sd_360_640_25fps.mp4",
    credit: "Павел Лобашкин / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-girl-at-the-gym-doing-dumbbells-20535458/",
  },
  "dumbbell shoulder press": {
    url: "https://videos.pexels.com/video-files/20535458/20535458-sd_360_640_25fps.mp4",
    credit: "Павел Лобашкин / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-girl-at-the-gym-doing-dumbbells-20535458/",
  },
  "face pull": {
    url: "https://videos.pexels.com/video-files/34324804/14541698_360_640_50fps.mp4",
    credit: "Slava  Kol / Pexels",
    sourceUrl: "https://www.pexels.com/video/gym-workout-with-cable-machine-exercise-34324804/",
  },
  "front raise": {
    url: "https://videos.pexels.com/video-files/8837224/8837224-sd_338_640_25fps.mp4",
    credit: "MART  PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-using-dumbbells-8837224/",
  },
  "front squat": {
    url: "https://videos.pexels.com/video-files/4921644/4921644-sd_356_640_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921644/",
  },
  "glute bridge": {
    url: "https://videos.pexels.com/video-files/6525525/6525525-sd_360_640_30fps.mp4",
    credit: "Polina Tankilevitch / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-working-out-6525525/",
  },
  "goblet squat": {
    url: "https://videos.pexels.com/video-files/8893509/8893509-sd_338_640_24fps.mp4",
    credit: "Jill Burrow / Pexels",
    sourceUrl: "https://www.pexels.com/video/closeup-video-of-a-woman-working-out-8893509/",
  },
  "hack squat": {
    url: "https://videos.pexels.com/video-files/6892543/6892543-sd_360_640_25fps.mp4",
    credit: "Kampus Production / Pexels",
    sourceUrl: "https://www.pexels.com/video/an-elderly-man-using-a-smith-machine-6892543/",
  },
  "hammer curl": {
    url: "https://videos.pexels.com/video-files/6547801/6547801-sd_360_640_24fps.mp4",
    credit: "Andres  Ayrton / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-doing-dumbbell-curls-6547801/",
  },
  "hanging leg raise": {
    url: "https://videos.pexels.com/video-files/8233063/8233063-sd_338_640_25fps.mp4",
    credit: "ROMAN ODINTSOV / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-exercising-at-the-park-8233063/",
  },
  "high knees": {
    url: "https://videos.pexels.com/video-files/6326808/6326808-sd_360_640_25fps.mp4",
    credit: "Pavel Danilyuk / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-exercising-high-knees-6326808/",
  },
  "hip thrust": {
    url: "https://videos.pexels.com/video-files/4921644/4921644-sd_356_640_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921644/",
  },
  "incline bench press": {
    url: "https://videos.pexels.com/video-files/29546656/12718515_360_640_60fps.mp4",
    credit: "JULLIAN PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/dimly-lit-gym-workout-with-weights-and-equipment-29546656/",
  },
  "incline dumbbell press": {
    url: "https://videos.pexels.com/video-files/28932450/12520854_360_640_60fps.mp4",
    credit: "Sai Krishna / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-gym-workout-routine-with-dumbbells-28932450/",
  },
  "jump rope": {
    url: "https://videos.pexels.com/video-files/8027442/8027442-sd_338_640_25fps.mp4",
    credit: "MART  PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/close-up-video-of-a-jumping-rope-8027442/",
  },
  "jumping jack": {
    url: "https://videos.pexels.com/video-files/5025960/5025960-sd_360_640_25fps.mp4",
    credit: "olia danilevich / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-jumping-jacks-5025960/",
  },
  "kettlebell swing": {
    url: "https://videos.pexels.com/video-files/8893512/8893512-sd_338_640_24fps.mp4",
    credit: "Jill Burrow / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-work-out-8893512/",
  },
  "lat pulldown": {
    url: "https://videos.pexels.com/video-files/35585700/15079784_360_640_30fps.mp4",
    credit: "khezez  | خزاز / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-gym-workout-back-pull-exercises-35585700/",
  },
  "lateral raise": {
    url: "https://videos.pexels.com/video-files/20535458/20535458-sd_360_640_25fps.mp4",
    credit: "Павел Лобашкин / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-girl-at-the-gym-doing-dumbbells-20535458/",
  },
  "leg curl": {
    url: "https://videos.pexels.com/video-files/26540715/11957015_360_640_30fps.mp4",
    credit: "AbduAllah Essam Atia / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-is-doing-squats-in-a-gym-26540715/",
  },
  "leg extension": {
    url: "https://videos.pexels.com/video-files/35585537/15079511_360_640_30fps.mp4",
    credit: "khezez  | خزاز / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-leg-workout-on-gym-machine-35585537/",
  },
  "leg press": {
    url: "https://videos.pexels.com/video-files/26540715/11957015_360_640_30fps.mp4",
    credit: "AbduAllah Essam Atia / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-is-doing-squats-in-a-gym-26540715/",
  },
  "leg raise": {
    url: "https://videos.pexels.com/video-files/6525525/6525525-sd_360_640_30fps.mp4",
    credit: "Polina Tankilevitch / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-working-out-6525525/",
  },
  "lunge": {
    url: "https://videos.pexels.com/video-files/35585589/15079340_360_640_30fps.mp4",
    credit: "khezez  | خزاز / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-workout-routine-in-modern-gym-setting-35585589/",
  },
  "mountain climber": {
    url: "https://videos.pexels.com/video-files/5025787/5025787-sd_360_640_25fps.mp4",
    credit: "olia danilevich / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-exercising-outdoors-5025787/",
  },
  "overhead press": {
    url: "https://videos.pexels.com/video-files/5319753/5319753-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-doing-work-out-5319753/",
  },
  "overhead tricep extension": {
    url: "https://videos.pexels.com/video-files/6296281/6296281-sd_360_640_25fps.mp4",
    credit: "Pavel Danilyuk / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-6296281/",
  },
  "pendlay row": {
    url: "https://videos.pexels.com/video-files/12890962/12890962-sd_360_640_30fps.mp4",
    credit: "Connor Scott McManus / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-lifting-weights-in-a-gym-12890962/",
  },
  "plank": {
    url: "https://videos.pexels.com/video-files/6525477/6525477-sd_360_640_30fps.mp4",
    credit: "Polina Tankilevitch / Pexels",
    sourceUrl: "https://www.pexels.com/video/side-view-of-woman-exercising-legs-6525477/",
  },
  "preacher curl": {
    url: "https://videos.pexels.com/video-files/4921646/4921646-sd_356_640_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921646/",
  },
  "pull up": {
    url: "https://videos.pexels.com/video-files/33486546/14244558_360_640_30fps.mp4",
    credit: "Sport O'Scope / Pexels",
    sourceUrl: "https://www.pexels.com/video/outdoor-calisthenics-exercise-on-pull-up-bar-33486546/",
  },
  "push up": {
    url: "https://videos.pexels.com/video-files/4260553/4260553-sd_360_640_25fps.mp4",
    credit: "Michelangelo Buonarroti / Pexels",
    sourceUrl: "https://www.pexels.com/video/jumping-sport-strong-fitness-4260553/",
  },
  "rear delt fly": {
    url: "https://videos.pexels.com/video-files/8402113/8402113-sd_360_640_30fps.mp4",
    credit: "RDNE Stock project / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-dumbbell-chest-flys-at-an-outdoor-gym-8402113/",
  },
  "reverse lunge": {
    url: "https://videos.pexels.com/video-files/8456719/8456719-sd_360_640_25fps.mp4",
    credit: "Mikhail Nilov / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-reverse-lunges-8456719/",
  },
  "romanian deadlift": {
    url: "https://videos.pexels.com/video-files/12890962/12890962-sd_360_640_30fps.mp4",
    credit: "Connor Scott McManus / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-lifting-weights-in-a-gym-12890962/",
  },
  "russian twist": {
    url: "https://videos.pexels.com/video-files/4929273/4929273-sd_338_640_25fps.mp4",
    credit: "cottonbro studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-is-walking-through-a-doorway-with-a-sign-that-says-the-world-s-largest-building-4929273/",
  },
  "seated cable row": {
    url: "https://videos.pexels.com/video-files/35585654/15079802_360_640_30fps.mp4",
    credit: "khezez  | خزاز / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-exercising-on-cable-machine-in-gym-35585654/",
  },
  "shrug": {
    url: "https://videos.pexels.com/video-files/5319764/5319764-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-5319764/",
  },
  "side plank": {
    url: "https://videos.pexels.com/video-files/6437947/6437947-sd_360_640_30fps.mp4",
    credit: "Marta Wave / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-an-exercise-position-6437947/",
  },
  "sit up": {
    url: "https://videos.pexels.com/video-files/8893543/8893543-sd_338_640_24fps.mp4",
    credit: "Jill Burrow / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-exercise-8893543/",
  },
  "skull crusher": {
    url: "https://videos.pexels.com/video-files/35585835/15079952_360_640_30fps.mp4",
    credit: "khezez  | خزاز / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-performing-tricep-exercises-in-gym-35585835/",
  },
  "sprint": {
    url: "https://videos.pexels.com/video-files/8484855/8484855-sd_360_640_24fps.mp4",
    credit: "Liliana Drew / Pexels",
    sourceUrl: "https://www.pexels.com/video/women-jogging-on-the-track-8484855/",
  },
  "squat": {
    url: "https://videos.pexels.com/video-files/4921641/4921641-sd_356_640_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921641/",
  },
  "step up": {
    url: "https://videos.pexels.com/video-files/6739974/6739974-sd_360_640_25fps.mp4",
    credit: "Mikhail Nilov / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-step-up-and-down-over-a-wooden-box-6739974/",
  },
  "stiff leg deadlift": {
    url: "https://videos.pexels.com/video-files/12890962/12890962-sd_360_640_30fps.mp4",
    credit: "Connor Scott McManus / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-lifting-weights-in-a-gym-12890962/",
  },
  "sumo deadlift": {
    url: "https://videos.pexels.com/video-files/12890962/12890962-sd_360_640_30fps.mp4",
    credit: "Connor Scott McManus / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-lifting-weights-in-a-gym-12890962/",
  },
  "t-bar row": {
    url: "https://videos.pexels.com/video-files/6389822/6389822-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-exercising-on-rowing-machine-6389822/",
  },
  "tricep extension": {
    url: "https://videos.pexels.com/video-files/35585834/15079882_360_640_30fps.mp4",
    credit: "khezez  | خزاز / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-exercising-with-cable-machine-in-gym-35585834/",
  },
  "tricep pushdown": {
    url: "https://videos.pexels.com/video-files/5319433/5319433-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-inside-the-gym-5319433/",
  },
  "upright row": {
    url: "https://videos.pexels.com/video-files/5319764/5319764-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-5319764/",
  },
};

/**
 * Get the stock video URL for an exercise, if available.
 * Returns null if no stock video is mapped for this exercise.
 */
export function getStockVideoUrl(exerciseName: string): string | null {
  const key = exerciseName.toLowerCase().trim();
  return STOCK_VIDEO_MAP[key]?.url ?? null;
}

/**
 * Get the full stock video entry for an exercise.
 */
export function getStockVideoEntry(exerciseName: string): StockVideoEntry | null {
  const key = exerciseName.toLowerCase().trim();
  return STOCK_VIDEO_MAP[key] ?? null;
}

/**
 * Check if a stock video exists for the given exercise.
 */
export function hasStockVideo(exerciseName: string): boolean {
  const key = exerciseName.toLowerCase().trim();
  return key in STOCK_VIDEO_MAP;
}

/**
 * Get all exercise names that have stock videos.
 */
export function getExercisesWithStockVideos(): string[] {
  return Object.keys(STOCK_VIDEO_MAP);
}
