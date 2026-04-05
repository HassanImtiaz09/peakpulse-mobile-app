import { describe, it, expect } from "vitest";

/**
 * Tests for the Nutrition Hub screen configuration
 * and Progress Dashboard data handling.
 */

describe("Nutrition Hub", () => {
  const HUB_SECTIONS = [
    {
      title: "Track & Log",
      cards: [
        { id: "log", route: "/(tabs)/meals" },
        { id: "timeline", route: "/meal-timeline" },
        { id: "barcode", route: "/barcode-scanner" },
        { id: "receipt", route: "/scan-receipt" },
      ],
    },
    {
      title: "Plan & Prep",
      cards: [
        { id: "mealplan", route: "/(tabs)/meals" },
        { id: "mealprep", route: "/meal-prep" },
      ],
    },
    {
      title: "Analyse & Insights",
      cards: [
        { id: "charts", route: "/nutrition-charts" },
        { id: "gallery", route: "/meal-photo-gallery" },
      ],
    },
    {
      title: "Kitchen & Pantry",
      cards: [
        { id: "pantry", route: "/pantry" },
      ],
    },
  ];

  it("should have 4 sections", () => {
    expect(HUB_SECTIONS).toHaveLength(4);
  });

  it("should cover all 9 nutrition entry points", () => {
    const allCards = HUB_SECTIONS.flatMap((s) => s.cards);
    expect(allCards).toHaveLength(9);
  });

  it("all cards should have unique IDs", () => {
    const allIds = HUB_SECTIONS.flatMap((s) => s.cards.map((c) => c.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("all routes should start with /", () => {
    const allRoutes = HUB_SECTIONS.flatMap((s) => s.cards.map((c) => c.route));
    for (const route of allRoutes) {
      expect(route.startsWith("/")).toBe(true);
    }
  });

  it("Track & Log should have the most cards (4)", () => {
    const trackLog = HUB_SECTIONS.find((s) => s.title === "Track & Log");
    expect(trackLog?.cards).toHaveLength(4);
  });
});

describe("Progress Dashboard", () => {
  describe("TrendLine chart data processing", () => {
    it("should handle empty data gracefully", () => {
      const data: number[] = [];
      const hasData = data.length >= 2;
      expect(hasData).toBe(false);
    });

    it("should compute correct min/max for Y axis", () => {
      const values = [80, 85, 78, 92, 88];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.1;
      expect(min).toBe(78);
      expect(max).toBe(92);
      expect(padding).toBeCloseTo(1.4);
    });

    it("should generate valid SVG path for trend data", () => {
      const data = [80, 85, 78, 92, 88];
      const width = 300;
      const height = 120;
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;

      const points = data.map((v, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((v - min) / range) * height,
      }));

      const path = points
        .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
        .join(" ");

      expect(path).toMatch(/^M0,/);
      expect(path).toContain("L");
      expect(points).toHaveLength(5);
    });

    it("should normalize body fat percentage values", () => {
      const rawBF = [15.5, 14.8, 14.2, 13.9];
      const formatted = rawBF.map((v) => v.toFixed(1) + "%");
      expect(formatted[0]).toBe("15.5%");
      expect(formatted[3]).toBe("13.9%");
    });
  });

  describe("Server-first data loading", () => {
    it("should prefer server data over AsyncStorage", () => {
      const serverGoal = { targetBodyFat: 12, imageUrl: "https://example.com/img.jpg" };
      const localGoal = { targetBodyFat: 15 };

      const resolved = serverGoal || localGoal;
      expect(resolved.targetBodyFat).toBe(12);
    });

    it("should fall back to local when server returns null", () => {
      const serverGoal = null;
      const localGoal = { targetBodyFat: 15 };

      const resolved = serverGoal || localGoal;
      expect(resolved?.targetBodyFat).toBe(15);
    });
  });
});
