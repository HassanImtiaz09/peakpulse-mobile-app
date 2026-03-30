import { describe, it, expect } from "vitest";

describe("EXPO_PUBLIC_RAPIDAPI_KEY validation", () => {
  it("should have the key set in the environment", () => {
    const key = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should successfully call ExerciseDB API with the configured key", async () => {
    const key = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
    const res = await fetch(
      "https://exercisedb.p.rapidapi.com/exercises?limit=1&offset=0",
      {
        headers: {
          "x-rapidapi-key": key!,
          "x-rapidapi-host": "exercisedb.p.rapidapi.com",
        },
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  }, 15000);
});
