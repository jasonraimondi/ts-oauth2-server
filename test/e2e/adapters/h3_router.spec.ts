import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer, type Server } from "node:http";
import { createApp, createRouter, defineEventHandler, toNodeListener } from "h3";
import { handleH3Error, handleH3Response, requestFromH3 } from "../../../src/adapters/h3.js";
import { ErrorType, OAuthException, OAuthResponse } from "../../../src/index.js";

// Runs against a real h3 app + router (no mocks) to pin the regression where
// fire-and-forget send()/sendRedirect() let the handler resolve before the
// response was written, so h3's router 404ed the documented pattern.
describe("adapters/h3.js against a real h3 router", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    // h3's send() defers the write via setImmediate, which the global
    // fake-timer setup would otherwise swallow.
    vi.useRealTimers();
  });

  beforeAll(async () => {
    const app = createApp();
    const router = createRouter();

    router.post(
      "/token",
      defineEventHandler(async event => {
        await requestFromH3(event);
        return handleH3Response(
          event,
          new OAuthResponse({
            status: 200,
            headers: { "cache-control": "no-store" },
            body: { access_token: "token123", token_type: "Bearer" },
          }),
        );
      }),
    );

    router.get(
      "/authorize",
      defineEventHandler(event =>
        handleH3Response(
          event,
          new OAuthResponse({
            status: 302,
            headers: { location: "https://example.com/callback?code=abc123" },
          }),
        ),
      ),
    );

    router.post(
      "/error",
      defineEventHandler(event =>
        handleH3Error(new OAuthException("Invalid client", ErrorType.InvalidClient, undefined, undefined, 401), event),
      ),
    );

    app.use(router);
    server = createServer(toNodeListener(app));
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("expected a TCP address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
  });

  it("delivers token responses instead of 404ing", async () => {
    const response = await fetch(`${baseUrl}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ access_token: "token123", token_type: "Bearer" });
  });

  it("delivers redirect responses", async () => {
    const response = await fetch(`${baseUrl}/authorize`, { redirect: "manual" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://example.com/callback?code=abc123");
  });

  it("delivers error responses", async () => {
    const response = await fetch(`${baseUrl}/error`, { method: "POST" });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "invalid_client" });
  });
});
