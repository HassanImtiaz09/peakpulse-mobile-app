/**
 * Round 89 Tests — Form Annotations, Audio Cues, Photo Comparison
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ── Form Annotations Data ──────────────────────────────────────────────────

describe("Form Annotations Data (lib/form-annotations.ts)", () => {
  const src = readFile("lib/form-annotations.ts");

  it("exports getFormAnnotations function", () => {
    expect(src).toContain("export function getFormAnnotations");
  });

  it("exports hasFormAnnotations function", () => {
    expect(src).toContain("export function hasFormAnnotations");
  });

  it("exports FormAnnotation type", () => {
    expect(src).toMatch(/export (interface|type) FormAnnotation/);
  });

  it("defines annotations for at least 15 exercises", () => {
    const matches = src.match(/exerciseKey:/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(15);
  });

  it("includes joint angle data with degrees", () => {
    expect(src).toContain("angle:");
    expect(src).toContain("label:");
  });

  it("includes alignment lines", () => {
    expect(src).toContain("alignmentLines");
  });

  it("includes checkpoints with descriptions", () => {
    expect(src).toContain("checkpoints");
    expect(src).toContain("description:");
  });

  it("covers major compound lifts", () => {
    const exercises = ["bench press", "squat", "deadlift", "pull up", "shoulder press"];
    for (const ex of exercises) {
      expect(src.toLowerCase()).toContain(ex);
    }
  });

  it("includes type coding for alignment lines and warnings", () => {
    expect(src).toContain('type: "correct"');
    expect(src).toContain("isWarning");
  });
});

// ── Form Annotation Overlay Component ──────────────────────────────────────

describe("FormAnnotationOverlay Component", () => {
  const src = readFile("components/form-annotation-overlay.tsx");

  it("file exists", () => {
    expect(fileExists("components/form-annotation-overlay.tsx")).toBe(true);
  });

  it("exports FormAnnotationOverlay component", () => {
    expect(src).toContain("export function FormAnnotationOverlay");
  });

  it("exports AnnotationLegend component", () => {
    expect(src).toContain("export function AnnotationLegend");
  });

  it("uses SVG for rendering overlays", () => {
    expect(src).toMatch(/from ["']react-native-svg["']/);
  });

  it("renders joint angle arcs", () => {
    expect(src).toMatch(/angle|Arc|arc|Circle|circle/i);
  });

  it("renders alignment lines", () => {
    expect(src).toMatch(/Line|line/);
  });

  it("supports simplified mode prop", () => {
    expect(src).toContain("simplified");
  });

  it("accepts width and height props", () => {
    expect(src).toContain("width");
    expect(src).toContain("height");
  });
});

// ── Audio Form Cues ────────────────────────────────────────────────────────

describe("Audio Form Cues (lib/audio-form-cues.ts)", () => {
  const src = readFile("lib/audio-form-cues.ts");

  it("file exists", () => {
    expect(fileExists("lib/audio-form-cues.ts")).toBe(true);
  });

  it("exports audio cue functions", () => {
    expect(src).toMatch(/export (function|const|async function) (getAudioCues|speakCue|stopSpeaking|isSpeaking)/);
  });

  it("imports expo-speech for text-to-speech", () => {
    expect(src).toMatch(/from ["']expo-speech["']/);
  });

  it("defines form cues for multiple exercises", () => {
    const matches = src.match(/exerciseName:|name:/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(10);
  });

  it("includes step-by-step cue text", () => {
    expect(src).toMatch(/step|cue|text|instruction/i);
  });

  it("has stop/cancel functionality", () => {
    expect(src).toMatch(/stop|cancel|pause/i);
  });

  it("covers bench press cues", () => {
    expect(src.toLowerCase()).toContain("bench press");
  });

  it("covers squat cues", () => {
    expect(src.toLowerCase()).toContain("squat");
  });
});

// ── Exercise Demo Player Integration ───────────────────────────────────────

describe("ExerciseDemoPlayer Integration", () => {
  const src = readFile("components/exercise-demo-player.tsx");

  it("has annotation toggle button", () => {
    expect(src).toMatch(/annotation|form.?cue|overlay/i);
  });

  it("has audio cue play button", () => {
    expect(src).toMatch(/audio|speech|narrat|cue/i);
  });

  it("has compare photo button", () => {
    expect(src).toContain("onComparePhoto");
  });

  it("imports FormAnnotationOverlay", () => {
    expect(src).toContain("FormAnnotationOverlay");
  });

  it("imports audio form cues", () => {
    expect(src).toMatch(/audio-form-cues|form-cues/);
  });

  it("accepts exerciseName prop", () => {
    expect(src).toContain("exerciseName");
  });

  it("has annotation toggle state", () => {
    expect(src).toMatch(/showAnnotation|annotationsVisible|showOverlay/);
  });

  it("has audio playing state", () => {
    expect(src).toMatch(/isPlaying|audioPlaying|isSpeaking/);
  });
});

// ── Form Compare Screen ────────────────────────────────────────────────────

describe("Form Compare Screen (app/form-compare.tsx)", () => {
  const src = readFile("app/form-compare.tsx");

  it("file exists", () => {
    expect(fileExists("app/form-compare.tsx")).toBe(true);
  });

  it("uses ScreenContainer", () => {
    expect(src).toContain("ScreenContainer");
  });

  it("has golden background", () => {
    expect(src).toMatch(/GOLDEN_SOCIAL|golden/i);
  });

  it("imports expo-image-picker", () => {
    expect(src).toMatch(/expo-image-picker/);
  });

  it("has camera photo capture", () => {
    expect(src).toContain("launchCameraAsync");
  });

  it("has gallery photo picker", () => {
    expect(src).toContain("launchImageLibraryAsync");
  });

  it("requests camera permissions", () => {
    expect(src).toContain("requestCameraPermissionsAsync");
  });

  it("has side-by-side view mode", () => {
    expect(src).toContain("side");
    expect(src).toContain("Side by Side");
  });

  it("has overlay view mode", () => {
    expect(src).toContain("overlay");
    expect(src).toContain("Overlay");
  });

  it("shows reference image from exercise data", () => {
    expect(src).toContain("referenceAsset");
    expect(src).toContain("getExerciseInfo");
  });

  it("shows form annotations on reference image", () => {
    expect(src).toContain("FormAnnotationOverlay");
    expect(src).toContain("showAnnotations");
  });

  it("has annotation toggle button", () => {
    expect(src).toContain("toggleAnnotations");
  });

  it("saves photos to AsyncStorage for history", () => {
    expect(src).toContain("AsyncStorage");
    expect(src).toContain("savePhoto");
  });

  it("displays saved photo history", () => {
    expect(src).toContain("savedPhotos");
    expect(src).toContain("Form History");
  });

  it("has form comparison tips section", () => {
    expect(src).toContain("Form Comparison Tips");
  });

  it("accepts exerciseName from route params", () => {
    expect(src).toContain("useLocalSearchParams");
    expect(src).toContain("exerciseName");
  });
});

// ── Navigation Integration ─────────────────────────────────────────────────

describe("Navigation to Form Compare", () => {
  it("plans.tsx passes onComparePhoto to ExerciseDemoPlayer", () => {
    const src = readFile("app/(tabs)/plans.tsx");
    expect(src).toContain("onComparePhoto");
    expect(src).toContain("form-compare");
  });

  it("active-workout.tsx passes onComparePhoto to ExerciseDemoPlayer", () => {
    const src = readFile("app/active-workout.tsx");
    expect(src).toContain("onComparePhoto");
    expect(src).toContain("form-compare");
  });
});

// ── Annotation Legend ──────────────────────────────────────────────────────

describe("Annotation Legend", () => {
  const src = readFile("components/form-annotation-overlay.tsx");

  it("shows color-coded legend items", () => {
    expect(src).toMatch(/legend|Legend/);
  });

  it("explains joint angles", () => {
    expect(src).toMatch(/joint|angle|Joint|Angle/i);
  });

  it("explains alignment lines", () => {
    expect(src).toMatch(/alignment|Alignment/i);
  });
});
