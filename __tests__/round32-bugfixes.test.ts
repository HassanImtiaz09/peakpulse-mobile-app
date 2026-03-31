import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const APP = path.resolve(__dirname, "..");

describe("Round 32 — Bug Fixes", () => {
  describe("Onboarding hooks ordering fix", () => {
    const src = fs.readFileSync(path.join(APP, "app/onboarding.tsx"), "utf-8");

    it("autoGenTriggered ref is declared before any early returns", () => {
      const refLine = src.indexOf("const autoGenTriggered = useRef(false)");
      const firstEarlyReturn = src.indexOf("if (previewImage)");
      expect(refLine).toBeGreaterThan(-1);
      expect(firstEarlyReturn).toBeGreaterThan(-1);
      expect(refLine).toBeLessThan(firstEarlyReturn);
    });

    it("auto-generate useEffect is declared before any early returns", () => {
      const effectLine = src.indexOf("if (step === 11 && !autoGenTriggered.current");
      const firstEarlyReturn = src.indexOf("if (previewImage)");
      expect(effectLine).toBeGreaterThan(-1);
      expect(firstEarlyReturn).toBeGreaterThan(-1);
      expect(effectLine).toBeLessThan(firstEarlyReturn);
    });
  });

  describe("Notification deep-link fix", () => {
    const src = fs.readFileSync(path.join(APP, "app/_layout.tsx"), "utf-8");

    it("uses getLastNotificationResponseAsync (async version)", () => {
      expect(src).toContain("getLastNotificationResponseAsync()");
    });

    it("useNotificationDeepLink accepts a ready parameter", () => {
      expect(src).toContain("function useNotificationDeepLink(ready: boolean)");
    });

    it("useReferralDeepLink accepts a ready parameter", () => {
      expect(src).toContain("function useReferralDeepLink(ready: boolean)");
    });

    it("deep-link hooks are called with fontsLoaded as ready flag", () => {
      expect(src).toContain("useNotificationDeepLink(fontsLoaded)");
      expect(src).toContain("useReferralDeepLink(fontsLoaded)");
    });

    it("deep-link hooks guard on !ready", () => {
      expect(src).toContain("|| !ready) return;");
    });
  });

  describe("Active workout JSON.parse hardening", () => {
    const src = fs.readFileSync(path.join(APP, "app/active-workout.tsx"), "utf-8");

    it("wraps JSON.parse in try/catch", () => {
      expect(src).toContain("try {");
      expect(src).toContain("JSON.parse(params.dayData)");
      expect(src).toContain("catch (_)");
    });
  });

  describe("Route file verification", () => {
    const routes = [
      "active-workout", "ai-coach", "barcode-scanner", "daily-checkin",
      "form-checker", "gym-finder", "login", "logout", "meal-photo-gallery",
      "nutrition-charts", "onboarding", "onboarding-summary", "referral",
      "subscription", "subscription-plans", "user-guide",
    ];

    routes.forEach((route) => {
      it(`route file exists: app/${route}.tsx`, () => {
        const filePath = path.join(APP, `app/${route}.tsx`);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });
});
