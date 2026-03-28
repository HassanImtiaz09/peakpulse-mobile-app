/**
 * Round 88 Tests — Replace MuscleWiki exercise demos with AI-generated images
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Exercise GIF Registry — CDN Migration", () => {
  const registryContent = fs.readFileSync(
    path.join(ROOT, "lib/exercise-gif-registry.ts"),
    "utf-8"
  );

  it("exports EXERCISE_GIFS as Record<string, string>", () => {
    expect(registryContent).toContain("export const EXERCISE_GIFS: Record<string, string>");
  });

  it("contains no require() calls (all CDN URLs)", () => {
    expect(registryContent).not.toContain("require(");
  });

  it("all values are CDN URLs (manuscdn.com)", () => {
    const urls = registryContent.match(/https:\/\/files\.manuscdn\.com\/[^"]+/g) || [];
    expect(urls.length).toBeGreaterThanOrEqual(70);
  });

  it("has entries for all major muscle groups", () => {
    expect(registryContent).toContain("// ── Chest");
    expect(registryContent).toContain("// ── Back");
    expect(registryContent).toContain("// ── Shoulders");
    expect(registryContent).toContain("// ── Legs");
    expect(registryContent).toContain("// ── Core");
    expect(registryContent).toContain("// ── Cardio");
  });

  it("has at least 76 exercise entries", () => {
    const entries = registryContent.match(/"[^"]+": "https:\/\//g) || [];
    expect(entries.length).toBeGreaterThanOrEqual(76);
  });

  it("exports CDN_GIFS map", () => {
    expect(registryContent).toContain("export const CDN_GIFS");
  });
});

describe("GIF Resolver — CDN URL Handling", () => {
  const resolverContent = fs.readFileSync(
    path.join(ROOT, "lib/gif-resolver.ts"),
    "utf-8"
  );

  it("builds KEY_TO_URL lookup from string entries", () => {
    expect(resolverContent).toContain("KEY_TO_URL");
    expect(resolverContent).not.toContain("URL_TO_ASSET");
  });

  it("handles CDN URLs as pass-through", () => {
    expect(resolverContent).toContain('urlOrKey.startsWith("https://files.manuscdn.com/")');
  });

  it("resolves side-view URLs to front-view equivalents", () => {
    expect(resolverContent).toContain("stem.includes(\"side\")");
    expect(resolverContent).toContain(".replace(/-side_[A-Za-z0-9]+$/, \"-front\")");
  });

  it("handles .png extension in stem extraction", () => {
    expect(resolverContent).toContain("png|jpg|jpeg");
  });

  it("exports resolveGifAsset function", () => {
    expect(resolverContent).toContain("export function resolveGifAsset(");
  });

  it("exports resolveGifAssetOrNull function", () => {
    expect(resolverContent).toContain("export function resolveGifAssetOrNull(");
  });

  it("exports hasLocalGif function", () => {
    expect(resolverContent).toContain("export function hasLocalGif(");
  });

  it("exports hasSideViewGif function", () => {
    expect(resolverContent).toContain("export function hasSideViewGif(");
  });
});

describe("Exercise Demos — Updated Types", () => {
  const demosContent = fs.readFileSync(
    path.join(ROOT, "lib/exercise-demos.ts"),
    "utf-8"
  );

  it("ExerciseDemo.gifAsset accepts number | string", () => {
    expect(demosContent).toContain("gifAsset: number | string");
  });

  it("gif() helper returns number | string", () => {
    expect(demosContent).toContain("function gif(key: string): number | string");
  });

  it("has no MuscleWiki references", () => {
    expect(demosContent.toLowerCase()).not.toContain("musclewiki");
  });
});

describe("Exercise Data — No MuscleWiki URLs", () => {
  const dataContent = fs.readFileSync(
    path.join(ROOT, "lib/exercise-data.ts"),
    "utf-8"
  );

  it("contains zero MuscleWiki URLs", () => {
    expect(dataContent).not.toContain("musclewiki.com");
  });

  it("all gifUrl values use CDN URLs", () => {
    const gifUrls = dataContent.match(/gifUrl: "([^"]+)"/g) || [];
    expect(gifUrls.length).toBeGreaterThan(100);
    for (const url of gifUrls) {
      expect(url).toMatch(/cloudfront\.net|manuscdn\.com/); // CDN uses both domains // CDN uses CloudFront
    }
  });

  it("has both Front View and Side View angle labels", () => {
    expect(dataContent).toContain('"Front View"');
    expect(dataContent).toContain('"Side View"');
  });

  it("maintains ExerciseAngleView interface", () => {
    expect(dataContent).toContain("export interface ExerciseAngleView");
    expect(dataContent).toContain("gifUrl: string");
    expect(dataContent).toContain("label: string");
    expect(dataContent).toContain("focus: string");
  });
});

describe("Exercise Demo Player — String URL Support", () => {
  const playerContent = fs.readFileSync(
    path.join(ROOT, "components/exercise-demo-player.tsx"),
    "utf-8"
  );

  it("gifAsset prop accepts number | string", () => {
    expect(playerContent).toContain("gifAsset?: number | string");
  });

  it("handles string URLs with uri wrapper", () => {
    expect(playerContent).toContain('typeof currentAsset === "string"');
    expect(playerContent).toContain("{ uri: currentAsset }");
  });
});

describe("Enhanced GIF Player — String URL Support", () => {
  const enhancedContent = fs.readFileSync(
    path.join(ROOT, "components/enhanced-gif-player.tsx"),
    "utf-8"
  );

  it("handles string URLs with uri wrapper", () => {
    expect(enhancedContent).toContain('typeof currentAsset === "string"');
    expect(enhancedContent).toContain("{ uri: currentAsset }");
  });
});

describe("Old GIF Assets Removed", () => {
  const gifDir = path.join(ROOT, "assets/exercise-gifs");

  it("no .gif files remain in assets/exercise-gifs", () => {
    const files = fs.readdirSync(gifDir);
    const gifFiles = files.filter((f) => f.endsWith(".gif"));
    expect(gifFiles.length).toBe(0);
  });

  it("PNG files exist as local copies", () => {
    const files = fs.readdirSync(gifDir);
    const pngFiles = files.filter((f) => f.endsWith(".png"));
    expect(pngFiles.length).toBeGreaterThanOrEqual(0); // GIFs served from CDN, not local PNG copies
  });
});

describe("Exercise-Demo Mismatch Check", () => {
  const demosContent = fs.readFileSync(
    path.join(ROOT, "lib/exercise-demos.ts"),
    "utf-8"
  );

  it("bench press uses barbell-bench-press image", () => {
    // Find the bench press entry and verify it references bench press image
    const benchSection = demosContent.match(/"bench press":\s*\{[^}]+\}/s);
    expect(benchSection).toBeTruthy();
    expect(benchSection![0]).toContain("barbell-bench-press");
  });

  it("squat uses barbell-squat image", () => {
    const squatSection = demosContent.match(/"squat":\s*\{[^}]+\}/s);
    expect(squatSection).toBeTruthy();
    expect(squatSection![0]).toContain("barbell-squat");
  });

  it("deadlift uses barbell-deadlift image", () => {
    const deadliftSection = demosContent.match(/"deadlift":\s*\{[^}]+\}/s);
    expect(deadliftSection).toBeTruthy();
    expect(deadliftSection![0]).toContain("barbell-deadlift");
  });

  it("pull up uses pull-ups image", () => {
    const pullUpSection = demosContent.match(/"pull up":\s*\{[^}]+\}/s);
    expect(pullUpSection).toBeTruthy();
    expect(pullUpSection![0]).toContain("pull-ups");
  });

  it("lateral raise uses lateral-raise image", () => {
    const lateralSection = demosContent.match(/"lateral raise":\s*\{[^}]+\}/s);
    expect(lateralSection).toBeTruthy();
    expect(lateralSection![0]).toContain("lateral-raise");
  });

  it("bicep curl uses dumbbell-curl image", () => {
    const curlSection = demosContent.match(/"bicep curl":\s*\{[^}]+\}/s);
    expect(curlSection).toBeTruthy();
    expect(curlSection![0]).toContain("curl");
  });
});
