import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcovonly"],
    },
    setupFiles: ["test/setup.ts"],
    exclude: ["node_modules/**", "examples/**"],
  },
});
