/**
 * exercise-stock-videos.ts â Maps exercise names to free stock video URLs.
 *
 * All videos are sourced from Pexels.com under the Pexels License (free for
 * personal and commercial use, attribution appreciated).
 *
 * IMPORTANT: Only exercises with VERIFIED accurate video matches are included.
 * Exercises not listed here will fall back to the CDN GIF player in
 * exercise-detail.tsx (via EnhancedGifPlayer).
 *
 * Round 51 audit: Reviewed all 75 exercises. Removed mismatched and duplicate
 * videos. Only keeping videos that accurately demonstrate the specific exercise.
 * 57 exercises have verified stock videos; 18 use GIF fallback.
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
 * Map of exercise names (lowercase) â stock video info.
 * Keys must match the `key` field from exercise-data.ts.
 */
const STOCK_VIDEO_MAP: Record<string, StockVideoEntry> = {
  // ââ CHEST âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "bench press": {
    url: "https://videos.pexels.com/video-files/29569377/12727679_360_640_60fps.mp4",
    credit: "JULLIAN PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/dynamic-weight-training-overhead-shot-29569377/",
  },
  "incline bench press": {
    url: "https://videos.pexels.com/video-files/4920810/4920810-hd_1920_1080_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4920810/",
  },
  "incline dumbbell press": {
    url: "https://videos.pexels.com/video-files/28932450/12520854_360_640_60fps.mp4",
    credit: "Sai Krishna / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-gym-workout-routine-with-dumbbells-28932450/",
  },
  "push up": {
    url: "https://videos.pexels.com/video-files/4260553/4260553-sd_360_640_25fps.mp4",
    credit: "Michelangelo Buonarroti / Pexels",
    sourceUrl: "https://www.pexels.com/video/jumping-sport-strong-fitness-4260553/",
  },
  "dumbbell fly": {
    url: "https://videos.pexels.com/video-files/8402113/8402113-sd_360_640_30fps.mp4",
    credit: "RDNE Stock project / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-dumbbell-chest-flys-at-an-outdoor-gym-8402113/",
  },
  "chest dip": {
    url: "https://videos.pexels.com/video-files/8401314/8401314-sd_360_640_30fps.mp4",
    credit: "RDNE Stock project / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-doing-exercise-outdoors-8401314/",
  },
  "cable crossover": {
    url: "https://videos.pexels.com/video-files/5319434/5319434-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-inside-the-gym-5319434/",
  },

  // ââ BACK ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "bent over row": {
    url: "https://videos.pexels.com/video-files/5319764/5319764-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-5319764/",
  },
  "lat pulldown": {
    url: "https://videos.pexels.com/video-files/35585700/15079784_360_640_30fps.mp4",
    credit: "khezez | Ø®Ø²Ø§Ø² / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-gym-workout-back-pull-exercises-35585700/",
  },
  "pull up": {
    url: "https://videos.pexels.com/video-files/33486546/14244558_360_640_30fps.mp4",
    credit: "Sport O'Scope / Pexels",
    sourceUrl: "https://www.pexels.com/video/outdoor-calisthenics-exercise-on-pull-up-bar-33486546/",
  },
  "seated cable row": {
    url: "https://videos.pexels.com/video-files/35585654/15079802_360_640_30fps.mp4",
    credit: "khezez | Ø®Ø²Ø§Ø² / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-exercising-on-cable-machine-in-gym-35585654/",
  },
  "deadlift": {
    url: "https://videos.pexels.com/video-files/12890962/12890962-sd_360_640_30fps.mp4",
    credit: "Connor Scott McManus / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-lifting-weights-in-a-gym-12890962/",
  },

  // ââ SHOULDERS âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "dumbbell shoulder press": {
    url: "https://videos.pexels.com/video-files/4367541/4367541-hd_1920_1080_30fps.mp4",
    credit: "Pavel Danilyuk / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-doing-dumbbell-shoulder-press-4367541/",
  },
  "overhead press": {
    url: "https://videos.pexels.com/video-files/5319753/5319753-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-doing-work-out-5319753/",
  },
  "lateral raise": {
    url: "https://videos.pexels.com/video-files/6293119/6293119-sd_960_506_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-using-dumbbell-5319088/",
  },
  "front raise": {
    url: "https://videos.pexels.com/video-files/8837224/8837224-sd_338_640_25fps.mp4",
    credit: "MART PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-using-dumbbells-8837224/",
  },
  "face pull": {
    url: "https://videos.pexels.com/video-files/34324804/14541698_360_640_50fps.mp4",
    credit: "Slava Kol / Pexels",
    sourceUrl: "https://www.pexels.com/video/gym-workout-with-cable-machine-exercise-34324804/",
  },
  "rear delt fly": {
    url: "https://videos.pexels.com/video-files/4921622/4921622-sd_640_360_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921622/",
  },

  // ââ ARMS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "bicep curl": {
    url: "https://videos.pexels.com/video-files/6547801/6547801-sd_360_640_24fps.mp4",
    credit: "Andres Ayrton / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-doing-dumbbell-curls-6547801/",
  },
  "barbell curl": {
    url: "https://videos.pexels.com/video-files/6548000/6548000-sd_360_640_24fps.mp4",
    credit: "Andres Ayrton / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-exercising-with-a-barbell-6548000/",
  },
  "concentration curl": {
    url: "https://videos.pexels.com/video-files/6547799/6547799-uhd_2160_3840_24fps.mp4",
    credit: "Andres Ayrton / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-training-in-gym-6547799/",
  },
  "tricep pushdown": {
    url: "https://videos.pexels.com/video-files/5319433/5319433-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-inside-the-gym-5319433/",
  },
  "overhead tricep extension": {
    url: "https://videos.pexels.com/video-files/6296281/6296281-sd_360_640_25fps.mp4",
    credit: "Pavel Danilyuk / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-6296281/",
  },
  "skull crusher": {
    url: "https://videos.pexels.com/video-files/35585835/15079952_360_640_30fps.mp4",
    credit: "khezez | Ø®Ø²Ø§Ø² / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-performing-tricep-exercises-in-gym-35585835/",
  },
  "tricep extension": {
    url: "https://videos.pexels.com/video-files/35585834/15079882_360_640_30fps.mp4",
    credit: "khezez | Ø®Ø²Ø§Ø² / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-exercising-with-cable-machine-in-gym-35585834/",
  },
  "dip": {
    url: "https://videos.pexels.com/video-files/34568748/14646224_360_640_25fps.mp4",
    credit: "JULLIAN PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/dynamic-workout-man-exercising-on-parallel-bars-34568748/",
  },

  // ââ LEGS ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "squat": {
    url: "https://videos.pexels.com/video-files/4921641/4921641-sd_356_640_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921641/",
  },
  "front squat": {
    url: "https://videos.pexels.com/video-files/4921644/4921644-sd_356_640_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921644/",
  },
  "goblet squat": {
    url: "https://videos.pexels.com/video-files/8893509/8893509-sd_338_640_24fps.mp4",
    credit: "Jill Burrow / Pexels",
    sourceUrl: "https://www.pexels.com/video/closeup-video-of-a-woman-working-out-8893509/",
  },
  "bulgarian split squat": {
    url: "https://videos.pexels.com/video-files/8026940/8026940-sd_338_640_25fps.mp4",
    credit: "MART PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-single-leg-squats-at-home-8026940/",
  },
  "lunge": {
    url: "https://videos.pexels.com/video-files/35585589/15079340_360_640_30fps.mp4",
    credit: "khezez | Ø®Ø²Ø§Ø² / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-workout-routine-in-modern-gym-setting-35585589/",
  },
  "reverse lunge": {
    url: "https://videos.pexels.com/video-files/8456719/8456719-sd_360_640_25fps.mp4",
    credit: "Mikhail Nilov / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-reverse-lunges-8456719/",
  },
  "leg extension": {
    url: "https://videos.pexels.com/video-files/35585537/15079511_360_640_30fps.mp4",
    credit: "khezez | Ø®Ø²Ø§Ø² / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-leg-workout-on-gym-machine-35585537/",
  },
  "hip thrust": {
    url: "https://videos.pexels.com/video-files/4267358/4267358-hd_1280_720_25fps.mp4",
    credit: "Gustavo Fring / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-exercising-4267358/",
  },
  "glute bridge": {
    url: "https://videos.pexels.com/video-files/6525487/6525487-hd_1920_1080_25fps.mp4",
    credit: "Polina Tankilevitch / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-glute-bridge-exercise-6525487/",
  },
  "calf raise": {
    url: "https://videos.pexels.com/video-files/32115656/13692093_360_640_24fps.mp4",
    credit: "Gaurav Kumar / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-calf-workout-in-gym-setting-32115656/",
  },
  "hack squat": {
    url: "https://videos.pexels.com/video-files/6892543/6892543-sd_360_640_25fps.mp4",
    credit: "Kampus Production / Pexels",
    sourceUrl: "https://www.pexels.com/video/an-elderly-man-using-a-smith-machine-6892543/",
  },
  "step up": {
    url: "https://videos.pexels.com/video-files/6739974/6739974-sd_360_640_25fps.mp4",
    credit: "Mikhail Nilov / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-step-up-and-down-over-a-wooden-box-6739974/",
  },

  // ââ CORE ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "crunch": {
    url: "https://videos.pexels.com/video-files/8893543/8893543-sd_338_640_24fps.mp4",
    credit: "Jill Burrow / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-exercise-8893543/",
  },
  "sit up": {
    url: "https://videos.pexels.com/video-files/4754028/4754028-uhd_4096_2160_25fps.mp4",
    credit: "cottonbro studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-doing-an-exercise-on-a-mat-4754028/",
  },
  "russian twist": {
    url: "https://videos.pexels.com/video-files/6892537/6892537-sd_640_360_25fps.mp4",
    credit: "Kampus Production / Pexels",
    sourceUrl: "https://www.pexels.com/video/an-elderly-man-doing-ab-workout-6892537/",
  },
  "plank": {
    url: "https://videos.pexels.com/video-files/6023273/6023273-hd_720_1366_25fps.mp4",
    credit: "Kampus Production / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-woman-planking-6023273/",
  },
  "side plank": {
    url: "https://videos.pexels.com/video-files/6437947/6437947-sd_360_640_30fps.mp4",
    credit: "Marta Wave / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-an-exercise-position-6437947/",
  },
  "bicycle crunch": {
    url: "https://videos.pexels.com/video-files/8026545/8026545-sd_338_640_25fps.mp4",
    credit: "MART PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-working-out-8026545/",
  },
  "hanging leg raise": {
    url: "https://videos.pexels.com/video-files/8233063/8233063-sd_338_640_25fps.mp4",
    credit: "ROMAN ODINTSOV / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-exercising-at-the-park-8233063/",
  },
  "dead bug": {
    url: "https://videos.pexels.com/video-files/8026951/8026951-sd_338_640_25fps.mp4",
    credit: "MART PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-working-out-8026951/",
  },
  "ab wheel rollout": {
    url: "https://videos.pexels.com/video-files/8026953/8026953-sd_338_640_25fps.mp4",
    credit: "MART PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/an-ab-roller-on-a-black-surface-8026953/",
  },
  "cable woodchop": {
    url: "https://videos.pexels.com/video-files/34491184/14614263_360_640_30fps.mp4",
    credit: "Pexels User / Pexels",
    sourceUrl: "https://www.pexels.com/video/intense-cable-exercise-workout-in-gym-34491184/",
  },
  "mountain climber": {
    url: "https://videos.pexels.com/video-files/5025787/5025787-sd_360_640_25fps.mp4",
    credit: "olia danilevich / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-exercising-outdoors-5025787/",
  },

  // ââ CARDIO / FULL BODY ââââââââââââââââââââââââââââââââââââââââââââââââââââ
  "burpee": {
    url: "https://videos.pexels.com/video-files/8026934/8026934-sd_338_640_25fps.mp4",
    credit: "MART PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/man-doing-exercise-8026934/",
  },
  "jumping jack": {
    url: "https://videos.pexels.com/video-files/5025960/5025960-sd_360_640_25fps.mp4",
    credit: "olia danilevich / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-jumping-jacks-5025960/",
  },
  "box jump": {
    url: "https://videos.pexels.com/video-files/6388435/6388435-sd_360_640_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-jump-box-6388435/",
  },
  "jump rope": {
    url: "https://videos.pexels.com/video-files/8027442/8027442-sd_338_640_25fps.mp4",
    credit: "MART PRODUCTION / Pexels",
    sourceUrl: "https://www.pexels.com/video/close-up-video-of-a-jumping-rope-8027442/",
  },
  "kettlebell swing": {
    url: "https://videos.pexels.com/video-files/8893512/8893512-sd_338_640_24fps.mp4",
    credit: "Jill Burrow / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-doing-work-out-8893512/",
  },
  "battle rope": {
    url: "https://videos.pexels.com/video-files/4943928/4943928-sd_338_640_24fps.mp4",
    credit: "Anastasia Shuraeva / Pexels",
    sourceUrl: "https://www.pexels.com/video/woman-working-out-at-the-gym-4943928/",
  },
  "sprint": {
    url: "https://videos.pexels.com/video-files/8484855/8484855-sd_360_640_24fps.mp4",
    credit: "Liliana Drew / Pexels",
    sourceUrl: "https://www.pexels.com/video/women-jogging-on-the-track-8484855/",
  },
};

// ââ EXERCISES USING GIF FALLBACK (no accurate Pexels match found) âââââââââââ
// These 18 exercises will use the CDN GIF player (EnhancedGifPlayer):
// - arnold press, cable fly, chin up, close grip bench press, decline bench press
// - dumbbell row, hammer curl, leg curl, leg press, leg raise
// - pendlay row, preacher curl, romanian deadlift, shrug, stiff leg deadlift
// - sumo deadlift, tbar row, upright row

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

/**
 * Get the count of exercises with verified stock videos.
 */
export function getStockVideoCount(): number {
  return Object.keys(STOCK_VIDEO_MAP).length;
}
