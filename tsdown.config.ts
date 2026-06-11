import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    vanilla: "./src/adapters/vanilla.ts",
    express: "./src/adapters/express.ts",
    fastify: "./src/adapters/fastify.ts",
    h3: "./src/adapters/h3.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  // The public declarations reference Node/Web globals (Buffer, crypto's
  // KeyObject, URLSearchParams, fetch Response/Request). The dts bundler
  // strips source-level triple-slash directives, and `@types/node` is not
  // auto-included under `moduleResolution: bundler` without an explicit
  // `types` array, so consumers compiling with `skipLibCheck: false` cannot
  // resolve those globals. Emit the reference into every declaration file.
  banner: { dts: '/// <reference types="node" />\n' },
  sourcemap: true,
  clean: true,
  fixedExtension: false,
  deps: {
    neverBundle: ["express", "fastify", "h3", /^@fastify\//, /^@types\//],
  },
});
