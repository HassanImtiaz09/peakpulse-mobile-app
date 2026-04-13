import { describe, it, expect } from "vitest";

const API_BASE = "http://localhost:3000";

// Helper to extract tRPC error code from response (handles both wrapped and unwrapped formats)
function getErrorCode(data: any): string | undefined {
  return data.error?.json?.data?.code ?? data.error?.data?.code;
}

describe("FytNova Backend API", () => {
  it("health endpoint returns ok", async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("tRPC health check returns ok", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    const status = data.result?.data?.json?.status ?? data.result?.json?.status;
    expect(status).toBe("ok");
  });

  it("auth.me returns null for unauthenticated user", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/auth.me`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    // auth.me returns { result: { data: { json: null } } } for unauthenticated
    const result = data.result?.data?.json;
    expect(result === null || result === undefined).toBe(true);
  });

  it("profile.get returns UNAUTHORIZED for unauthenticated user", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/profile.get`);
    const data = await res.json();
    expect(getErrorCode(data)).toBe("UNAUTHORIZED");
  });

  it("bodyScan.getLatest returns UNAUTHORIZED for unauthenticated user", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/bodyScan.getLatest`);
    const data = await res.json();
    expect(getErrorCode(data)).toBe("UNAUTHORIZED");
  });

  it("workoutPlan.getActive returns UNAUTHORIZED for unauthenticated user", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/workoutPlan.getActive`);
    const data = await res.json();
    expect(getErrorCode(data)).toBe("UNAUTHORIZED");
  });

  it("mealPlan.getActive returns UNAUTHORIZED for unauthenticated user", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/mealPlan.getActive`);
    const data = await res.json();
    expect(getErrorCode(data)).toBe("UNAUTHORIZED");
  });

  it("mealLog.getToday returns UNAUTHORIZED for unauthenticated user", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/mealLog.getToday`);
    const data = await res.json();
    expect(getErrorCode(data)).toBe("UNAUTHORIZED");
  });

  it("progress.getAll returns UNAUTHORIZED for unauthenticated user", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/progress.getAll`);
    const data = await res.json();
    expect(getErrorCode(data)).toBe("UNAUTHORIZED");
  });

  it("workoutPlan.getRecentSessions returns UNAUTHORIZED for unauthenticated user", async () => {
    const res = await fetch(`${API_BASE}/api/trpc/workoutPlan.getRecentSessions`);
    const data = await res.json();
    expect(getErrorCode(data)).toBe("UNAUTHORIZED");
  });
});
