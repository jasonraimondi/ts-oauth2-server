import { it, expect } from "vitest";
import { generateRandomToken } from "../../../src/index.js";

it("generates a token of length", () => {
  expect(generateRandomToken().length).toBe(80);
  expect(generateRandomToken(32).length).toBe(32);
});
