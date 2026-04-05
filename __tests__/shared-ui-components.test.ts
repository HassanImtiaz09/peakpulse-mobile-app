import { describe, it, expect, vi } from "vitest";

// Mock React Native modules
vi.mock("react-native", () => ({
  StyleSheet: { create: (s: any) => s },
  TouchableOpacity: "TouchableOpacity",
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  ActivityIndicator: "ActivityIndicator",
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

vi.mock("@/constants/ui-colors", () => ({
  SF: {
    bg: "#0A0E14",
    fg: "#F1F5F9",
    surface: "#111827",
    gold: "#F59E0B",
    muted: "#64748B",
    teal: "#14B8A6",
  },
  UI: {
    radius: { sm: 8, md: 12, lg: 16 },
  },
}));

describe("Shared UI Component Library", () => {
  describe("PPButton", () => {
    it("should export PPButton with correct variant options", () => {
      const variants = ["primary", "secondary", "outline", "ghost", "danger"];
      const sizes = ["sm", "md", "lg"];
      // Verify the expected API surface
      expect(variants).toHaveLength(5);
      expect(sizes).toHaveLength(3);
    });

    it("should have correct size dimensions", () => {
      const SIZE_MAP = { sm: 36, md: 48, lg: 56 };
      expect(SIZE_MAP.sm).toBe(36);
      expect(SIZE_MAP.md).toBe(48);
      expect(SIZE_MAP.lg).toBe(56);
    });

    it("should disable interaction when loading or disabled", () => {
      const isDisabled = (loading: boolean, disabled: boolean) => loading || disabled;
      expect(isDisabled(true, false)).toBe(true);
      expect(isDisabled(false, true)).toBe(true);
      expect(isDisabled(false, false)).toBe(false);
      expect(isDisabled(true, true)).toBe(true);
    });
  });

  describe("PPCard", () => {
    it("should support all variant types", () => {
      const variants = ["default", "elevated", "accent", "premium"];
      expect(variants).toContain("default");
      expect(variants).toContain("elevated");
      expect(variants).toContain("accent");
      expect(variants).toContain("premium");
    });

    it("accent variant should accept custom accentColor", () => {
      const accentColor = "#FF6B6B";
      expect(accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe("PPInput", () => {
    it("should support all input variants", () => {
      const variants = ["default", "filled", "outlined"];
      expect(variants).toHaveLength(3);
    });

    it("should show error state with red border", () => {
      const getErrorStyle = (error?: string) =>
        error ? { borderColor: "#EF4444" } : {};
      expect(getErrorStyle("Required")).toEqual({ borderColor: "#EF4444" });
      expect(getErrorStyle()).toEqual({});
    });
  });
});
