import { ErrorType, OAuthException } from "~/exceptions/oauth.exception";
import { JWT } from "~/utils/jwt";

it("can use the index.ts file", async () => {
  const module = await import("~/index");

  expect(module).toBeDefined();
  expect(new module.OAuthException("test", ErrorType.AccessDenied)).toBeInstanceOf(OAuthException)
  expect(new module.JWT("test")).toBeInstanceOf(JWT);
});
