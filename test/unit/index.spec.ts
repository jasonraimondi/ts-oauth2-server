import { JwtService } from "../../src";

it("can use the index.ts file", async () => {
  const module = await import("../../src");

  expect(module).toBeDefined();
  expect(module.AuthorizationServer).toBeInstanceOf(Function);
  expect(new module.JwtService("test")).toBeInstanceOf(JwtService);
});
