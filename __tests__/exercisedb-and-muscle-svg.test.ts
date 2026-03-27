/**
 * Tests for ExerciseDB API service and Muscle SVG Diagram logic
 */
import { describe, it, expect } from "vitest";
import {
  getExerciseDbGifUrl,
  hasExerciseDbGif,
  getExerciseDbId,
  getAllMappedExercises,
} from "../lib/exercisedb-api";

describe("ExerciseDB API Service", () => {
  describe("getExerciseDbGifUrl", () => {
    it("returns a valid GIF URL for a mapped exercise (exact match)", () => {
      const url = getExerciseDbGifUrl("bench press");
      expect(url).toBeTruthy();
      expect(url).toContain("https://static.exercisedb.dev/media/");
      expect(url).toMatch(/\.gif$/);
    });

    it("returns a valid GIF URL for barbell bench press", () => {
      const url = getExerciseDbGifUrl("barbell bench press");
      expect(url).toBeTruthy();
      expect(url).toContain("EIeI8Vf");
    });

    it("returns a valid GIF URL for dumbbell fly", () => {
      const url = getExerciseDbGifUrl("dumbbell fly");
      expect(url).toBeTruthy();
      expect(url).toContain(".gif");
    });

    it("returns null for an unmapped exercise", () => {
      const url = getExerciseDbGifUrl("nonexistent exercise xyz");
      expect(url).toBeNull();
    });

    it("handles case-insensitive matching", () => {
      const url1 = getExerciseDbGifUrl("Bench Press");
      const url2 = getExerciseDbGifUrl("BENCH PRESS");
      expect(url1).toBeTruthy();
      expect(url1).toBe(url2);
    });

    it("strips special characters from exercise names", () => {
      const url = getExerciseDbGifUrl("bench press!");
      expect(url).toBeTruthy();
    });
  });

  describe("hasExerciseDbGif", () => {
    it("returns true for mapped exercises", () => {
      expect(hasExerciseDbGif("squat")).toBe(true);
      expect(hasExerciseDbGif("deadlift")).toBe(true);
      expect(hasExerciseDbGif("pull up")).toBe(true);
      expect(hasExerciseDbGif("push up")).toBe(true);
    });

    it("returns false for unmapped exercises", () => {
      expect(hasExerciseDbGif("nonexistent exercise")).toBe(false);
    });

    it("handles hyphenated variants", () => {
      expect(hasExerciseDbGif("pull-up")).toBe(true);
      expect(hasExerciseDbGif("chin-up")).toBe(true);
      expect(hasExerciseDbGif("push-up")).toBe(true);
    });
  });

  describe("getExerciseDbId", () => {
    it("returns the correct ID for bench press", () => {
      const id = getExerciseDbId("bench press");
      expect(id).toBe("EIeI8Vf");
    });

    it("returns null for unknown exercises", () => {
      const id = getExerciseDbId("unknown exercise");
      expect(id).toBeNull();
    });
  });

  describe("getAllMappedExercises", () => {
    it("returns an array of exercise names", () => {
      const exercises = getAllMappedExercises();
      expect(Array.isArray(exercises)).toBe(true);
      expect(exercises.length).toBeGreaterThan(50);
    });

    it("includes common exercises", () => {
      const exercises = getAllMappedExercises();
      expect(exercises).toContain("bench press");
      expect(exercises).toContain("squat");
      expect(exercises).toContain("deadlift");
      expect(exercises).toContain("pull up");
    });
  });

  describe("GIF URL format", () => {
    it("all mapped exercises produce valid URL format", () => {
      const exercises = getAllMappedExercises();
      for (const name of exercises) {
        const url = getExerciseDbGifUrl(name);
        expect(url).toBeTruthy();
        expect(url).toMatch(/^https:\/\/static\.exercisedb\.dev\/media\/[A-Za-z0-9]+\.gif$/);
      }
    });

    it("different exercises can map to different GIF IDs", () => {
      const benchUrl = getExerciseDbGifUrl("bench press");
      const squatUrl = getExerciseDbGifUrl("squat");
      // They should be different exercises
      expect(benchUrl).not.toBe(squatUrl);
    });

    it("exercise aliases map to the same GIF", () => {
      const url1 = getExerciseDbGifUrl("bench press");
      const url2 = getExerciseDbGifUrl("barbell bench press");
      expect(url1).toBe(url2);
    });
  });
});
