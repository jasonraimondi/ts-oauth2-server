import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcovonly"],
      exclude: [".github/**", ".idea/**", "docs/**", "example/**"],
    },
    setupFiles: ["test/setup.ts"],
    exclude: ["node_modules/**", "example/**", "version-check.ts"],
  },
});
