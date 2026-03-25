import { describe, it, expect } from "vitest";

describe("MUSCLEWIKI_API_KEY validation", () => {
  it("should successfully call MuscleWiki API health endpoint with the configured API key", async () => {
    const key = process.env.MUSCLEWIKI_API_KEY;
    expect(key, "MUSCLEWIKI_API_KEY must be set").toBeTruthy();

    const res = await fetch("https://api.musclewiki.com/health", {
      headers: { "X-API-Key": key! },
    });
    expect(res.ok, `MuscleWiki API returned ${res.status}`).toBe(true);

    const json = await res.json();
    expect(json.status).toBe("ok");
  });

  it("should fetch exercise data with the API key", async () => {
    const key = process.env.MUSCLEWIKI_API_KEY;
    expect(key, "MUSCLEWIKI_API_KEY must be set").toBeTruthy();

    const res = await fetch("https://api.musclewiki.com/exercises/1", {
      headers: { "X-API-Key": key! },
    });
    expect(res.ok, `MuscleWiki API returned ${res.status}`).toBe(true);

    const json = await res.json();
    expect(json.name).toBeTruthy();
    expect(json.id).toBe(1);
    expect(json.videos).toBeDefined();
    expect(json.videos.length).toBeGreaterThan(0);
    expect(json.videos[0].url).toContain("musclewiki.com");
  });
});
