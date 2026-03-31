/**
 * Pexels API Key Validation Test
 * Validates that the PEXELS_API_KEY env var is set and can successfully call the Pexels API.
 */
import { describe, it, expect } from "vitest";

describe("PEXELS_API_KEY validation", () => {
  const apiKey = process.env.PEXELS_API_KEY;

  it("should have PEXELS_API_KEY set", () => {
    expect(apiKey).toBeDefined();
    expect(apiKey!.length).toBeGreaterThan(10);
  });

  it("should successfully search Pexels videos with the API key", async () => {
    const res = await fetch(
      "https://api.pexels.com/v1/videos/search?query=squat+exercise&per_page=1",
      {
        headers: { Authorization: apiKey! },
      }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.videos).toBeDefined();
    expect(data.videos.length).toBeGreaterThan(0);
  }, 15000);
});
