import { getRegistryKeyForExercise } from "../lib/exercise-demos";
import { EXERCISE_GIFS, getExerciseVideoUrl } from "../lib/exercise-gif-registry";
import { getExerciseDbGifUrl } from "../lib/exercisedb-api";

const exercises = ["Bench Press", "Barbell Squat", "Push Up", "Deadlift", "Lat Pulldown", "Bicep Curl", "Dumbbell Fly", "Cable Row"];

for (const name of exercises) {
  const key = getRegistryKeyForExercise(name);
  const frontKey = key.endsWith("-front") ? key : key.endsWith("-side") ? key.replace(/-side$/, "-front") : `${key}-front`;
  const registryFront = EXERCISE_GIFS[frontKey];
  const registrySide = getExerciseVideoUrl(frontKey, "side");
  const cdnUrl = getExerciseDbGifUrl(name);
  console.log(`\n${name}:`);
  console.log(`  registryKey: ${key}`);
  console.log(`  normalisedFrontKey: ${frontKey}`);
  console.log(`  registryFront: ${registryFront ? registryFront.substring(0, 80) + "..." : "MISSING"}`);
  console.log(`  registrySide: ${registrySide ? registrySide.substring(0, 80) + "..." : "MISSING"}`);
  console.log(`  cdnGifUrl: ${cdnUrl ? "YES" : "NO"}`);
  console.log(`  WOULD RESOLVE: ${registryFront ? "REGISTRY" : cdnUrl ? "CDN" : "API/NONE"}`);
}

// Also check total registry entries
const frontKeys = Object.keys(EXERCISE_GIFS).filter(k => k.endsWith("-front"));
const sideKeys = Object.keys(EXERCISE_GIFS).filter(k => k.endsWith("-side"));
console.log(`\nRegistry stats: ${frontKeys.length} front, ${sideKeys.length} side, ${Object.keys(EXERCISE_GIFS).length} total`);
