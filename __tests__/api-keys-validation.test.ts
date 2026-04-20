import { describe, it, expect } from "vitest";

describe("API Key Validation", () => {
  it("ANTHROPIC_API_KEY is set and valid format", () => {
    const key = process.env.ANTHROPIC_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
    // Anthropic keys start with "sk-ant-"
    expect(key!.startsWith("sk-ant-")).toBe(true);
  });

  it("FAL_KEY is set and valid format", () => {
    const key = process.env.FAL_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("Anthropic API key authenticates successfully", async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not set");

    // Lightweight call: send a minimal message to check auth
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 5,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    // 200 = success, 429 = rate limited (but key is valid)
    expect([200, 429]).toContain(res.status);
  }, 30000);

  it("fal.ai API key authenticates successfully", async () => {
    const key = process.env.FAL_KEY;
    if (!key) throw new Error("FAL_KEY not set");

    // Lightweight call: check auth by hitting the queue status endpoint
    const res = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "test",
        image_size: { width: 64, height: 64 },
        num_images: 1,
      }),
    });

    // 200 = success, 429 = rate limited (but key is valid), 422 = validation error (but auth passed)
    expect([200, 429, 422]).toContain(res.status);
  }, 30000);
});
