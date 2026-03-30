/**
 * Round 48 — Exercise GIF Fixes + Instructions
 *
 * Tests:
 * 1. Exercise instructions module covers all 75 exercises
 * 2. Each instruction has steps, avoid, and breathing fields
 * 3. EnhancedGifPlayer uses base64 approach (CORS fix)
 * 4. GifWebViewPlayer accepts base64Data prop
 * 5. Exercise detail screen includes HOW TO PERFORM section
 * 6. Exercise detail screen includes AVOID section
 * 7. Exercise detail screen includes breathing cue
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Exercise Instructions Module", () => {
  const src = readFile("lib/exercise-instructions.ts");

  it("exports getExerciseInstructions function", () => {
    expect(src).toContain("export function getExerciseInstructions");
  });

  it("exports hasExerciseInstructions function", () => {
    expect(src).toContain("export function hasExerciseInstructions");
  });

  it("defines ExerciseInstruction interface with steps, avoid, breathing", () => {
    expect(src).toContain("steps: string[]");
    expect(src).toContain("avoid: string[]");
    expect(src).toContain("breathing: string");
  });

  it("has instructions for all major exercises", () => {
    const exercises = [
      "bench press", "squat", "deadlift", "pull up", "overhead press",
      "bicep curl", "plank", "lunge", "hip thrust", "burpee",
      "lat pulldown", "dumbbell row", "lateral raise", "leg press",
      "romanian deadlift", "calf raise", "russian twist", "mountain climber",
    ];
    for (const name of exercises) {
      expect(src).toContain(`"${name}"`);
    }
  });

  it("covers all 75 exercises from exercise-data.ts", () => {
    const exerciseData = readFile("lib/exercise-data.ts");
    const nameMatches = exerciseData.match(/name:\s*"([^"]+)"/g) || [];
    const exerciseNames = nameMatches.map(m => m.replace(/name:\s*"/, "").replace(/"$/, ""));
    
    for (const name of exerciseNames) {
      const key = name.toLowerCase().trim();
      expect(src).toContain(`"${key}"`);
    }
  });
});

describe("EnhancedGifPlayer — CORS Fix (Base64 Approach)", () => {
  const src = readFile("components/enhanced-gif-player.tsx");

  it("imports GifWebViewPlayer", () => {
    expect(src).toContain("GifWebViewPlayer");
  });

  it("has fetchGifAsBase64 function for CORS bypass", () => {
    expect(src).toContain("fetchGifAsBase64");
  });

  it("passes base64Data to GifWebViewPlayer", () => {
    expect(src).toContain("base64Data");
  });

  it("uses FileSystem for native binary download", () => {
    expect(src).toContain("expo-file-system");
    expect(src).toContain("downloadAsync");
    expect(src).toContain("EncodingType.Base64");
  });

  it("has CDN GIF as priority 1 in resolution chain", () => {
    expect(src).toContain("getExerciseDbGifUrl");
    expect(src).toContain("Priority 1");
  });
});

describe("GifWebViewPlayer — Speed & Play/Pause Control", () => {
  const src = readFile("components/gif-webview-player.tsx");

  it("accepts base64Data prop", () => {
    expect(src).toContain("base64Data?: string");
  });

  it("has speed control in WebView HTML", () => {
    expect(src).toContain("speed");
    expect(src).toContain("speedBadge");
  });

  it("has play/pause toggle via overlay", () => {
    expect(src).toContain("playIcon");
    expect(src).toContain("pauseSvg");
    expect(src).toContain("playSvg");
  });

  it("has fullscreen/expand button", () => {
    expect(src).toContain("showExpandButton");
    expect(src).toContain("fullscreen");
    expect(src).toContain("Modal");
  });

  it("has GIF frame parser (LZW decoder)", () => {
    expect(src).toContain("parseGIF");
    expect(src).toContain("decodeLZW");
  });

  it("has expo-image fallback for when base64 is unavailable", () => {
    expect(src).toContain("ExpoImageFallback");
    expect(src).toContain("startAnimating");
    expect(src).toContain("stopAnimating");
  });
});

describe("Exercise Detail Screen — Instructions Integration", () => {
  const src = readFile("app/exercise-detail.tsx");

  it("imports getExerciseInstructions", () => {
    expect(src).toContain("getExerciseInstructions");
  });

  it("has HOW TO PERFORM section", () => {
    expect(src).toContain("HOW TO PERFORM");
  });

  it("renders numbered steps", () => {
    expect(src).toContain("stepNumberCircle");
    expect(src).toContain("stepText");
  });

  it("has AVOID section with warnings", () => {
    expect(src).toContain("AVOID");
    expect(src).toContain("avoidItem");
  });

  it("has breathing cue", () => {
    expect(src).toContain("breathingRow");
    expect(src).toContain("breathingText");
  });

  it("uses EnhancedGifPlayer for exercise demos", () => {
    expect(src).toContain("EnhancedGifPlayer");
  });
});
