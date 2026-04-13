import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const LIB_PATH = path.resolve(__dirname, "../lib/rest-timer-audio.ts");
const AUDIO_PATH = path.resolve(__dirname, "../assets/audio/rest-timer-chime.mp3");
const ACTIVE_WORKOUT_PATH = path.resolve(__dirname, "../app/active-workout.tsx");
const REST_SETTINGS_PATH = path.resolve(__dirname, "../app/rest-timer-settings.tsx");

const libSrc = fs.readFileSync(LIB_PATH, "utf-8");
const workoutSrc = fs.readFileSync(ACTIVE_WORKOUT_PATH, "utf-8");
const settingsSrc = fs.readFileSync(REST_SETTINGS_PATH, "utf-8");

describe("Rest Timer Audio Cue", () => {
  describe("Audio asset", () => {
    it("should have the chime MP3 file in assets/audio", () => {
      expect(fs.existsSync(AUDIO_PATH)).toBe(true);
    });

    it("should be a valid MP3 file (starts with valid sync bytes)", () => {
      const buf = fs.readFileSync(AUDIO_PATH);
      // Valid MP3 starts with ID3 tag or frame sync (0xFF 0xFB/0xFA/0xF3/0xF2)
      const isID3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
      const isFrameSync = buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0;
      expect(isID3 || isFrameSync).toBe(true);
    });

    it("should be a reasonable file size (10KB - 500KB for a short chime)", () => {
      const stats = fs.statSync(AUDIO_PATH);
      expect(stats.size).toBeGreaterThan(10_000);
      expect(stats.size).toBeLessThan(500_000);
    });
  });

  describe("lib/rest-timer-audio.ts module", () => {
    it("should export playRestTimerChime function", () => {
      expect(libSrc).toMatch(/export\s+async\s+function\s+playRestTimerChime/);
    });

    it("should export releaseRestTimerAudio function", () => {
      expect(libSrc).toMatch(/export\s+function\s+releaseRestTimerAudio/);
    });

    it("should export isRestTimerSoundEnabled function", () => {
      expect(libSrc).toMatch(/export\s+async\s+function\s+isRestTimerSoundEnabled/);
    });

    it("should export setRestTimerSoundEnabled function", () => {
      expect(libSrc).toMatch(/export\s+async\s+function\s+setRestTimerSoundEnabled/);
    });

    it("should require the chime MP3 asset", () => {
      expect(libSrc).toMatch(/require\(.*rest-timer-chime\.mp3/);
    });

    it("should call setAudioModeAsync with playsInSilentMode", () => {
      expect(libSrc).toMatch(/setAudioModeAsync\(\{.*playsInSilentMode:\s*true/s);
    });

    it("should use createAudioPlayer for imperative playback", () => {
      expect(libSrc).toMatch(/createAudioPlayer/);
    });

    it("should call seekTo(0) before play to allow replaying", () => {
      expect(libSrc).toMatch(/seekTo\(0\)/);
    });

    it("should call player.remove() in releaseRestTimerAudio", () => {
      expect(libSrc).toMatch(/player\.remove\(\)/);
    });

    it("should skip playback on web platform", () => {
      expect(libSrc).toMatch(/Platform\.OS\s*===\s*["']web["']/);
    });

    it("should default sound to enabled when no preference is stored", () => {
      expect(libSrc).toMatch(/if\s*\(val\s*===\s*null\)\s*return\s+true/);
    });

    it("should use AsyncStorage key @rest_timer_sound_enabled", () => {
      expect(libSrc).toMatch(/@rest_timer_sound_enabled/);
    });
  });

  describe("active-workout.tsx integration", () => {
    it("should import playRestTimerChime from rest-timer-audio", () => {
      expect(workoutSrc).toMatch(/import\s*\{[^}]*playRestTimerChime[^}]*\}\s*from\s*["']@\/lib\/rest-timer-audio["']/);
    });

    it("should import releaseRestTimerAudio for cleanup", () => {
      expect(workoutSrc).toMatch(/import\s*\{[^}]*releaseRestTimerAudio[^}]*\}\s*from\s*["']@\/lib\/rest-timer-audio["']/);
    });

    it("should import isRestTimerSoundEnabled for preference check", () => {
      expect(workoutSrc).toMatch(/import\s*\{[^}]*isRestTimerSoundEnabled[^}]*\}\s*from\s*["']@\/lib\/rest-timer-audio["']/);
    });

    it("should call playRestTimerChime when rest timer completes", () => {
      expect(workoutSrc).toMatch(/playRestTimerChime\(\)/);
    });

    it("should check soundEnabled before playing chime", () => {
      expect(workoutSrc).toMatch(/if\s*\(soundEnabled\)\s*\{[\s\S]*?playRestTimerChime/);
    });

    it("should call releaseRestTimerAudio on component cleanup", () => {
      expect(workoutSrc).toMatch(/releaseRestTimerAudio\(\)/);
    });

    it("should load sound preference on mount", () => {
      expect(workoutSrc).toMatch(/isRestTimerSoundEnabled\(\)\.then\(setSoundEnabled\)/);
    });
  });

  describe("rest-timer-settings.tsx sound toggle", () => {
    it("should import sound functions from rest-timer-audio", () => {
      expect(settingsSrc).toMatch(/import\s*\{[^}]*isRestTimerSoundEnabled[^}]*\}\s*from\s*["']@\/lib\/rest-timer-audio["']/);
    });

    it("should have a Switch component for sound toggle", () => {
      expect(settingsSrc).toMatch(/<Switch/);
    });

    it("should call setRestTimerSoundEnabled when toggling", () => {
      expect(settingsSrc).toMatch(/setRestTimerSoundEnabled\(val\)/);
    });

    it("should preview the chime sound when enabling", () => {
      expect(settingsSrc).toMatch(/playRestTimerChime\(\)/);
    });

    it("should display 'Completion Sound' label", () => {
      expect(settingsSrc).toMatch(/Completion Sound/);
    });

    it("should show volume-up icon", () => {
      expect(settingsSrc).toMatch(/volume-up/);
    });
  });
});
