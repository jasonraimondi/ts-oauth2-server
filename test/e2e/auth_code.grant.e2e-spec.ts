import request from "supertest";
import { Application } from "express";
import querystring from "querystring";
import { decode } from "jsonwebtoken";

import { OAuthClient } from "~/entities/client.entity";
import { IAuthCodePayload, REGEX_ACCESS_TOKEN } from "~/grants/auth_code.grant";
import { inMemoryDatabase } from "../../examples/in_memory/database";
import { inMemoryExpressApp } from "../../examples/in_memory/main";

describe.skip("auth_code grant e2e", () => {
  let client: OAuthClient;

  let app: Application;

  beforeEach(async () => {
    client = {
      id: "auth-code-client-id", // @todo these need to be not unique
      name: "test client",
      secret: undefined,
      redirectUris: ["http://localhost"],
      allowedGrants: ["authorization_code"],
    };

    app = inMemoryExpressApp;

    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.scopes["scope-1"] = { name: "scope-1" };
  });

  it("completes auth_code grant with pkce s256", async () => {
    const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA"; // base64urlencode(crypto.randomBytes(40));
    const codeChallenge = "ODQwZGM4YzZlNzMyMjQyZDAxYjE5MWZkY2RkNjJmMTllMmI0NzI0ZDlkMGJlYjFlMmMxOWY2ZDI1ZDdjMjMwYg"; // base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest("hex"));

    const authorizeResponse = await request(app).get("/authorize").query({
      response_type: "code",
      client_id: client.id,
      redirect_uri: "http://localhost",
      scope: "scope-1 scope-2",
      state: "state-is-a-secret",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authorizeResponseQuery = querystring.parse(authorizeResponse.headers.location);
    const decodedCode: IAuthCodePayload = <IAuthCodePayload>decode(String(authorizeResponseQuery.code));

    expect(authorizeResponse.status).toBe(302);
    expect(authorizeResponse.headers.location).toMatch(new RegExp("http://localhost"));
    expect(decodedCode.client_id).toBe(client.id);
    expect(decodedCode.expire_time).toBeGreaterThan(Date.now() / 1000);
    expect(authorizeResponseQuery.state).toBe("state-is-a-secret");

    const tokenResponse = await request(app).post("/token").send({
      grant_type: "authorization_code",
      code: authorizeResponseQuery.code,
      redirect_uri: "http://localhost",
      client_id: client.id,
      code_verifier: codeVerifier,
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.token_type).toBe("Bearer");
    expect(tokenResponse.body.access_token).toMatch(REGEX_ACCESS_TOKEN);
    expect(tokenResponse.body.refresh_token).toMatch(REGEX_ACCESS_TOKEN);
  });
});
