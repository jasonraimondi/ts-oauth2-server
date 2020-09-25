import commonjs from "@rollup/plugin-commonjs";
import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from "@rollup/plugin-node-resolve";

const pkg = require("./package.json");

export default {
  input: "src/index.ts",
  output: [
    { file: pkg.main, format: "cjs", sourcemap: true },
    { file: pkg.module, format: "es", sourcemap: true },
  ],
  external: [
    "crypto",
    "querystring",
    ...Object.keys(pkg.dependencies || {}),
  ],
  watch: ["src/**/*"],
  plugins: [
    typescript({
      tsconfig: __dirname + "/tsconfig.build.json",
      useTsconfigDeclarationDir: true,
    }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    nodeResolve(),
  ],
};
