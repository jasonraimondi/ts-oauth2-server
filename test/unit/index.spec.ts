import { JwtService } from "../../src/utils/jwt";

it("can use the index.ts file", async () => {
  const module = await import("../../src/index");

  expect(module).toBeDefined();
  expect(module.AuthorizationServer).toBeInstanceOf(Function);
  expect(new module.JwtService("test")).toBeInstanceOf(JwtService);
});
