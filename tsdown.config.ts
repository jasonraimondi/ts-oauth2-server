import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    vanilla: "./src/adapters/vanilla.ts",
    express: "./src/adapters/express.ts",
    fastify: "./src/adapters/fastify.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  fixedExtension: false,
  outputOptions: {
    keepNames: true,
  },
});
