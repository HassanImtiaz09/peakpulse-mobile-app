import { describe, it, expect } from "vitest";

describe("GEMINI_API_KEY validation", () => {
  it("should successfully call Gemini 2.5 Flash with the configured API key", async () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key, "GEMINI_API_KEY must be set").toBeTruthy();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const body = {
      contents: [{ role: "user", parts: [{ text: "Reply with the single word: OK" }] }],
      generationConfig: { maxOutputTokens: 10 },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    // Read body once
    const json = (await res.json()) as any;

    expect(res.ok, `Gemini API returned ${res.status}: ${JSON.stringify(json)}`).toBe(true);
    const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    expect(text.length, "Expected non-empty response from Gemini").toBeGreaterThan(0);
  });
});
