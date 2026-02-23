import { expect } from "vitest";
import { decode } from "jsonwebtoken";

import { REGEX_ACCESS_TOKEN, ResponseInterface } from "../../../src/index.js";

export function expectTokenResponse(tokenResponse: ResponseInterface) {
  const decodedToken: any = decode(tokenResponse.body.access_token);

  expect(tokenResponse.status).toBe(200);
  expect(tokenResponse.headers["cache-control"]).toBe("no-store");
  expect(tokenResponse.headers["pragma"]).toBe("no-cache");
  expect(tokenResponse.body.token_type).toBe("Bearer");
  expect(tokenResponse.body.expires_in).toBe(3600);
  expect(tokenResponse.body.access_token).toMatch(REGEX_ACCESS_TOKEN);

  expect(decodedToken.exp).toBeTruthy();
  expect(decodedToken.jti).toBeTruthy();

  return decodedToken;
}
