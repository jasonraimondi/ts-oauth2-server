import { it, expect } from "vitest";
import { JwtService } from "../../src/index.js";

it("can use the index.ts file", async () => {
  const module = await import("../../src/index.js");

  expect(module).toBeDefined();
  expect(module.AuthorizationServer).toBeInstanceOf(Function);
  expect(new module.JwtService("test")).toBeInstanceOf(JwtService);
});
