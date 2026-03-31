/**
 * exercise-stock-videos.ts — Maps exercise names to free stock video URLs.
 *
 * All videos are sourced from Pexels.com under the Pexels License (free for
 * personal and commercial use, no attribution required).
 *
 * DEMO: Only 3 exercises are mapped for the initial demo.
 * Once approved, this will be expanded to cover all exercises.
 */

export interface StockVideoEntry {
  /** Direct MP4 URL */
  url: string;
  /** Credit / attribution (optional but good practice) */
  credit: string;
  /** Pexels page URL for reference */
  sourceUrl: string;
}

/**
 * Map of exercise names (lowercase) → stock video info.
 * Keys must match the `name` field from exercise-data.ts (lowercased).
 */
const STOCK_VIDEO_MAP: Record<string, StockVideoEntry> = {
  "barbell squat": {
    url: "https://videos.pexels.com/video-files/4921644/4921644-sd_534_960_25fps.mp4",
    credit: "Antoni Shkraba Studio / Pexels",
    sourceUrl: "https://www.pexels.com/video/a-man-working-out-in-the-gym-4921644/",
  },
  "barbell bench press": {
    url: "https://videos.pexels.com/video-files/5320001/5320001-hd_1920_1080_25fps.mp4",
    credit: "Tima Miroshnichenko / Pexels",
    sourceUrl: "https://www.pexels.com/video/5320001/",
  },
  "barbell deadlift": {
    url: "https://videos.pexels.com/video-files/14180867/14180867-sd_960_480_24fps.mp4",
    credit: "Navdeep Singh / Pexels",
    sourceUrl: "https://www.pexels.com/video/deadlift-back-workout-14180867/",
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
