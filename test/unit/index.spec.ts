import { ErrorType, OAuthException } from "../../src/exceptions/oauth.exception";
import { JwtService } from "../../src/utils/jwt";

it("can use the index.ts file", async () => {
  const module = await import("../../src/index");

  expect(module).toBeDefined();
  expect(new module.OAuthException("test", ErrorType.AccessDenied)).toBeInstanceOf(OAuthException);
  expect(new module.JwtService("test")).toBeInstanceOf(JwtService);
});
