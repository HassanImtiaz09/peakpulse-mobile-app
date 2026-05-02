/**
 * ElevenLabs API Key Validation Test
 *
 * Validates that the ELEVENLABS_API_KEY environment variable is set and
 * can authenticate against the ElevenLabs API.
 */
import { describe, it, expect } from "vitest";

describe("ElevenLabs API Key Validation", () => {
  it("should authenticate with the ElevenLabs API and list voices", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey!,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.voices).toBeDefined();
    expect(Array.isArray(data.voices)).toBe(true);
    expect(data.voices.length).toBeGreaterThan(0);
  }, 15000);
});
