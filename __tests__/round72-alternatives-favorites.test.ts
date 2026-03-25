/**
 * Round 72 Tests — Exercise Alternatives & Favorites in Fullscreen GIF Player
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), "utf-8");
}

describe("Exercise Alternatives System", () => {
  it("getAlternativeExercises is exported from exercise-data.ts", () => {
    const src = readFile("lib/exercise-data.ts");
    expect(src).toContain("export function getAlternativeExercises(");
  });

  it("getAlternativeExercises accepts exerciseName and limit parameters", () => {
    const src = readFile("lib/exercise-data.ts");
    expect(src).toMatch(/getAlternativeExercises\(\s*exerciseName:\s*string/);
    expect(src).toMatch(/limit:\s*number\s*=\s*5/);
  });

  it("scoring logic gives primary-to-primary overlap 3 points", () => {
    const src = readFile("lib/exercise-data.ts");
    expect(src).toContain("info.primaryMuscles.includes(m)) score += 3");
  });

  it("scoring logic gives same category bonus of 2 points", () => {
    const src = readFile("lib/exercise-data.ts");
    expect(src).toContain("ex.category === info.category) score += 2");
  });

  it("filters out exercises with 0 overlap", () => {
    const src = readFile("lib/exercise-data.ts");
    expect(src).toContain(".filter((s) => s.score > 0)");
  });

  it("sorts by score descending and limits results", () => {
    const src = readFile("lib/exercise-data.ts");
    expect(src).toContain(".sort((a, b) => b.score - a.score)");
    expect(src).toContain(".slice(0, limit)");
  });

  it("excludes the original exercise from alternatives", () => {
    const src = readFile("lib/exercise-data.ts");
    expect(src).toContain("ex.key !== info.key");
  });
});

describe("Alternatives in Exercise Detail Screen", () => {
  const src = readFile("app/exercise-detail.tsx");

  it("imports getAlternativeExercises", () => {
    expect(src).toContain("getAlternativeExercises");
  });

  it("computes alternatives with useMemo", () => {
    expect(src).toMatch(/alternatives\s*=\s*useMemo\(\(\)\s*=>\s*getAlternativeExercises/);
  });

  it("renders TRY INSTEAD section", () => {
    expect(src).toContain("TRY INSTEAD");
  });

  it("renders alternative exercise cards with GIF thumbnails", () => {
    expect(src).toContain("altGifWrap");
    expect(src).toContain("altGif");
    expect(src).toContain("altName");
    expect(src).toContain("altCue");
  });

  it("navigates to exercise-detail on alternative tap", () => {
    expect(src).toContain('pathname: "/exercise-detail"');
    expect(src).toContain("params: { name: alt.name }");
  });

  it("shows category and difficulty chips for alternatives", () => {
    expect(src).toContain("altChip");
    expect(src).toContain("altChipDifficulty");
  });

  it("shows subtitle explaining the alternatives", () => {
    expect(src).toContain("Similar exercises targeting the same muscle groups");
  });
});

describe("Alternatives in Active Workout Screen", () => {
  const src = readFile("app/active-workout.tsx");

  it("imports getAlternativeExercises", () => {
    expect(src).toContain("getAlternativeExercises");
  });

  it("renders TRY INSTEAD section", () => {
    expect(src).toContain("TRY INSTEAD");
  });

  it("renders alternative cards with GIF thumbnails", () => {
    expect(src).toContain("alt.angleViews[0]?.gifUrl");
    expect(src).toContain("alt.name");
    expect(src).toContain("alt.cue");
  });

  it("limits alternatives to 3 in active workout", () => {
    expect(src).toContain("getAlternativeExercises(exercise.name, 3)");
  });

  it("navigates to exercise-detail on alternative tap", () => {
    expect(src).toContain('pathname: "/exercise-detail"');
  });
});

describe("Favorites Button in Fullscreen GIF Player", () => {
  describe("EnhancedGifPlayer", () => {
    const src = readFile("components/enhanced-gif-player.tsx");

    it("imports useFavorites", () => {
      expect(src).toContain('import { useFavorites } from "@/lib/favorites-context"');
    });

    it("uses isFavorite and toggleFavorite", () => {
      expect(src).toContain("isFavorite, toggleFavorite");
    });

    it("renders heart icon in fullscreen modal", () => {
      expect(src).toContain('"favorite"');
      expect(src).toContain('"favorite-border"');
    });

    it("uses red color for favorited state", () => {
      expect(src).toContain('#EF4444');
    });

    it("toggles favorite on press", () => {
      expect(src).toContain("toggleFavorite(exerciseName)");
    });
  });

  describe("ExerciseDemoPlayer", () => {
    const src = readFile("components/exercise-demo-player.tsx");

    it("imports useFavorites", () => {
      expect(src).toContain('import { useFavorites } from "@/lib/favorites-context"');
    });

    it("uses isFavorite and toggleFavorite", () => {
      expect(src).toContain("isFavorite, toggleFavorite");
    });

    it("renders heart icon in fullscreen modal", () => {
      expect(src).toContain('"favorite"');
      expect(src).toContain('"favorite-border"');
    });

    it("uses red color for favorited state", () => {
      expect(src).toContain('#EF4444');
    });

    it("only shows favorite button when exerciseName is provided", () => {
      expect(src).toContain("exerciseName ?");
    });
  });
});

describe("Favorites Context", () => {
  const src = readFile("lib/favorites-context.tsx");

  it("exports FavoritesProvider", () => {
    expect(src).toContain("export function FavoritesProvider");
  });

  it("exports useFavorites hook", () => {
    expect(src).toContain("export function useFavorites");
  });

  it("persists to AsyncStorage", () => {
    expect(src).toContain("AsyncStorage.setItem");
    expect(src).toContain("AsyncStorage.getItem");
  });

  it("provides toggleFavorite function", () => {
    expect(src).toContain("toggleFavorite");
  });

  it("provides isFavorite function", () => {
    expect(src).toContain("isFavorite");
  });

  it("provides haptic feedback on toggle", () => {
    expect(src).toContain("Haptics.impactAsync");
    expect(src).toContain("Haptics.notificationAsync");
  });
});
