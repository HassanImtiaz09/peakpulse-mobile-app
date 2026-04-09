#!/usr/bin/env node
/**
 * warmup-bundles.mjs — Pre-build native bundles after Metro starts
 *
 * When Expo Go connects for the first time, Metro needs ~60s to generate
 * the native (Android/iOS) bundle. The APISIX gateway proxy times out
 * before this completes, causing a 504 error.
 *
 * This script waits for Metro to be ready, then triggers the Android
 * bundle build in the background so it's cached when Expo Go connects.
 */

const METRO_PORT = process.env.EXPO_PORT || 8081;
const METRO_URL = `http://localhost:${METRO_PORT}`;
const BUNDLE_PATH = "/node_modules/expo-router/entry.bundle";
const PLATFORMS = ["android"];

async function waitForMetro(maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(METRO_URL);
      if (res.ok) {
        console.log(`[warmup] Metro is ready (attempt ${i + 1})`);
        return true;
      }
    } catch {
      // Metro not ready yet
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.error("[warmup] Metro did not start in time");
  return false;
}

async function warmupBundle(platform) {
  const url = `${METRO_URL}${BUNDLE_PATH}?platform=${platform}&dev=true&minify=false`;
  console.log(`[warmup] Pre-building ${platform} bundle...`);
  const start = Date.now();
  try {
    const res = await fetch(url);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (res.ok) {
      const size = res.headers.get("content-length") || "unknown";
      console.log(
        `[warmup] ${platform} bundle ready (${elapsed}s, ${(Number(size) / 1024 / 1024).toFixed(1)} MB)`
      );
    } else {
      console.error(`[warmup] ${platform} bundle failed: HTTP ${res.status} (${elapsed}s)`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`[warmup] ${platform} bundle error (${elapsed}s):`, err.message);
  }
}

async function main() {
  // Wait a bit for Metro to start accepting connections
  console.log("[warmup] Waiting for Metro to start...");
  const ready = await waitForMetro();
  if (!ready) process.exit(1);

  // Wait for the web bundle to finish first (it's triggered by the --web flag)
  console.log("[warmup] Waiting 10s for web bundle to complete...");
  await new Promise((r) => setTimeout(r, 10000));

  // Pre-build native bundles sequentially to avoid memory spikes
  for (const platform of PLATFORMS) {
    await warmupBundle(platform);
  }

  console.log("[warmup] All bundles pre-cached. Expo Go should connect instantly.");
  process.exit(0);
}

main();
