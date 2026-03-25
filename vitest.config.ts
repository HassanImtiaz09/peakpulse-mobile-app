import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@/lib/exercise-gif-registry": path.resolve(__dirname, "__mocks__/gif-registry-mock.ts"),
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    globals: false,
    include: ["__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".expo"],
  },
});
