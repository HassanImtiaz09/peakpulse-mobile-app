/**
 * Round 75 Tests — Video Playback Fix & Detailed Muscle Diagram
 *
 * Tests:
 * 1. Video player components handle MP4 URLs correctly
 * 2. Web fallback uses HTML5 video tag
 * 3. Body diagram uses react-native-body-highlighter
 * 4. Muscle group mapping covers all MuscleGroup types
 * 5. Exercise detail uses interactive diagram
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Round 75: Video Playback Fix", () => {
  it("exercise-demo-player.tsx uses HTML5 video tag for web fallback", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/exercise-demo-player.tsx"),
      "utf-8"
    );
    // Should have web video fallback using HTML5 video element
    expect(content).toContain("Platform.OS");
    expect(content).toContain("<video");
    expect(content).toContain("autoPlay");
    expect(content).toContain("loop");
    expect(content).toContain("muted");
    expect(content).toContain("playsInline");
  });

  it("enhanced-gif-player.tsx uses HTML5 video tag for web fallback", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/enhanced-gif-player.tsx"),
      "utf-8"
    );
    expect(content).toContain("<video");
    expect(content).toContain("autoPlay");
    expect(content).toContain("loop");
    expect(content).toContain("muted");
    expect(content).toContain("playsInline");
  });

  it("exercise-demo-player.tsx uses expo-video VideoView for native", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/exercise-demo-player.tsx"),
      "utf-8"
    );
    expect(content).toContain("VideoView");
    expect(content).toContain("useVideoPlayer");
    expect(content).toContain("expo-video");
  });

  it("enhanced-gif-player.tsx uses expo-video VideoView for native", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/enhanced-gif-player.tsx"),
      "utf-8"
    );
    expect(content).toContain("VideoView");
    expect(content).toContain("useVideoPlayer");
    expect(content).toContain("expo-video");
  });

  it("video players have error handling with error state UI", () => {
    const demoPlayer = fs.readFileSync(
      path.join(ROOT, "components/exercise-demo-player.tsx"),
      "utf-8"
    );
    const enhancedPlayer = fs.readFileSync(
      path.join(ROOT, "components/enhanced-gif-player.tsx"),
      "utf-8"
    );
    // Both should have error handling
    expect(demoPlayer).toContain("error");
    expect(demoPlayer).toContain("Video unavailable");
    expect(enhancedPlayer).toContain("error");
    expect(enhancedPlayer).toContain("Video unavailable");
  });

  it("video players detect MP4 URLs vs GIF URLs", () => {
    const demoPlayer = fs.readFileSync(
      path.join(ROOT, "components/exercise-demo-player.tsx"),
      "utf-8"
    );
    // Should have logic to detect video vs GIF
    expect(demoPlayer).toContain(".mp4");
    expect(demoPlayer).toContain("isVideo");
  });

  it("video players enable caching on native", () => {
    const demoPlayer = fs.readFileSync(
      path.join(ROOT, "components/exercise-demo-player.tsx"),
      "utf-8"
    );
    expect(demoPlayer).toContain("useCaching");
  });
});

describe("Round 75: Detailed Muscle Diagram", () => {
  it("body-diagram.tsx uses react-native-body-highlighter", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/body-diagram.tsx"),
      "utf-8"
    );
    expect(content).toContain("react-native-body-highlighter");
    expect(content).toContain("import Body");
  });

  it("body-diagram.tsx exports BodyDiagramInteractive component", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/body-diagram.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function BodyDiagramInteractive");
  });

  it("body-diagram.tsx exports BodyDiagramInline component", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/body-diagram.tsx"),
      "utf-8"
    );
    expect(content).toContain("export function BodyDiagramInline");
  });

  it("body-diagram.tsx maps all MuscleGroup types to body-highlighter slugs", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/body-diagram.tsx"),
      "utf-8"
    );
    const muscleGroups = [
      "chest", "back", "shoulders", "biceps", "triceps", "forearms",
      "abs", "obliques", "quads", "hamstrings", "glutes", "calves",
      "traps", "lats", "lower_back", "hip_flexors", "full_body",
    ];
    for (const mg of muscleGroups) {
      expect(content).toContain(`${mg}:`);
    }
  });

  it("body-diagram.tsx has front/back toggle for interactive mode", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/body-diagram.tsx"),
      "utf-8"
    );
    expect(content).toContain("Front");
    expect(content).toContain("Back");
    expect(content).toContain("toggleSide");
  });

  it("exercise-detail.tsx uses BodyDiagramInteractive", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "app/exercise-detail.tsx"),
      "utf-8"
    );
    expect(content).toContain("BodyDiagramInteractive");
    expect(content).not.toContain("import { BodyDiagram }");
  });

  it("exercise-library.tsx still uses BodyDiagramInline for cards", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "app/exercise-library.tsx"),
      "utf-8"
    );
    expect(content).toContain("BodyDiagramInline");
  });

  it("active-workout.tsx still uses BodyDiagramInline for cards", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "app/active-workout.tsx"),
      "utf-8"
    );
    expect(content).toContain("BodyDiagramInline");
  });

  it("body-diagram.tsx uses proper Slug types from the library", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "components/body-diagram.tsx"),
      "utf-8"
    );
    expect(content).toContain("type Slug");
    expect(content).toContain("type ExtendedBodyPart");
  });

  it("react-native-body-highlighter is installed", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8")
    );
    expect(pkg.dependencies["react-native-body-highlighter"]).toBeDefined();
  });
});
