#!/usr/bin/env tsx
/**
 * Bulk Video URL Validator
 *
 * Pings every MuscleWiki video URL in exercise-data.ts and exercise-gif-registry.ts,
 * flags 404s and other failures, and outputs a summary report.
 *
 * Usage:
 *   npx tsx scripts/validate-video-urls.ts
 *   npx tsx scripts/validate-video-urls.ts --json   # output JSON report
 *   npx tsx scripts/validate-video-urls.ts --fix     # suggest fix commands
 */

import { getAllExercises } from "../lib/exercise-data";
import { EXERCISE_GIFS } from "../lib/exercise-gif-registry";

interface UrlCheckResult {
  url: string;
  source: string;
  exerciseName: string;
  status: number | "error";
  ok: boolean;
  error?: string;
}

const CONCURRENCY = 10;
const TIMEOUT_MS = 15_000;
const JSON_OUTPUT = process.argv.includes("--json");
const SHOW_FIX = process.argv.includes("--fix");

/** HEAD request with timeout */
async function checkUrl(url: string): Promise<{ status: number | "error"; ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return { status: res.status, ok: res.ok };
  } catch (err: any) {
    clearTimeout(timer);
    return { status: "error", ok: false, error: err.message ?? String(err) };
  }
}

/** Process items with limited concurrency */
async function processPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log("🔍 Collecting video URLs...\n");

  const urlEntries: { url: string; source: string; exerciseName: string }[] = [];

  // 1. exercise-data.ts — angleViews
  const exercises = getAllExercises();
  for (const ex of exercises) {
    if (ex.angleViews) {
      for (const view of ex.angleViews) {
        if (view.gifUrl && view.gifUrl.startsWith("http")) {
          urlEntries.push({
            url: view.gifUrl,
            source: "exercise-data.ts (angleViews)",
            exerciseName: ex.name,
          });
        }
      }
    }
  }

  // 2. exercise-gif-registry.ts — EXERCISE_GIFS
  for (const [name, url] of Object.entries(EXERCISE_GIFS)) {
    if (url && url.startsWith("http")) {
      urlEntries.push({
        url,
        source: "exercise-gif-registry.ts",
        exerciseName: name,
      });
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = urlEntries.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });

  console.log(`📋 Found ${urlEntries.length} total URLs (${unique.length} unique)\n`);
  console.log(`⏳ Checking with concurrency=${CONCURRENCY}, timeout=${TIMEOUT_MS}ms...\n`);

  let checked = 0;
  const results = await processPool(unique, CONCURRENCY, async (entry) => {
    const result = await checkUrl(entry.url);
    checked++;
    if (!result.ok) {
      process.stdout.write(`  ❌ [${checked}/${unique.length}] ${entry.exerciseName}: ${result.status}\n`);
    } else if (checked % 20 === 0) {
      process.stdout.write(`  ✅ [${checked}/${unique.length}] checked...\n`);
    }
    return {
      ...entry,
      ...result,
    } as UrlCheckResult;
  });

  // Separate OK and failed
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 RESULTS SUMMARY`);
  console.log(`   Total unique URLs: ${unique.length}`);
  console.log(`   ✅ Passed: ${passed.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log("");

  if (failed.length > 0) {
    console.log("─".repeat(60));
    console.log("FAILED URLs:\n");
    for (const f of failed) {
      console.log(`  Exercise: ${f.exerciseName}`);
      console.log(`  Source:   ${f.source}`);
      console.log(`  URL:      ${f.url}`);
      console.log(`  Status:   ${f.status}${f.error ? ` (${f.error})` : ""}`);
      console.log("");
    }
  }

  if (SHOW_FIX && failed.length > 0) {
    console.log("─".repeat(60));
    console.log("SUGGESTED FIXES:\n");
    console.log("Search MuscleWiki for the correct video URL for each failed exercise:");
    for (const f of failed) {
      const slug = f.exerciseName.toLowerCase().replace(/\s+/g, "-");
      console.log(`  ${f.exerciseName}:`);
      console.log(`    Search: https://musclewiki.com/exercises/${slug}`);
      console.log(`    Current: ${f.url}`);
      console.log("");
    }
  }

  if (JSON_OUTPUT) {
    const report = {
      timestamp: new Date().toISOString(),
      totalUrls: unique.length,
      passed: passed.length,
      failed: failed.length,
      failures: failed.map((f) => ({
        exerciseName: f.exerciseName,
        source: f.source,
        url: f.url,
        status: f.status,
        error: f.error,
      })),
    };
    const outPath = "scripts/url-validation-report.json";
    const fs = await import("fs");
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 JSON report saved to: ${outPath}`);
  }

  // Exit with error code if any failures
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
