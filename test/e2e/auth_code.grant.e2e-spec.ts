import request from "supertest";
import { Application } from "express";
import crypto from "crypto";
import querystring from "querystring";
import { decode } from "jsonwebtoken";

import { OAuthClient } from "../../src/entities";
import { inMemoryDatabase } from "../../examples/in_memory/database";
import { base64urlencode } from "../../src/utils";
import { inMemoryExpressApp } from "../../examples/in_memory/main";
import { IAuthCodePayload } from "../../src/grants";

export const ACCESS_TOKEN_REGEX = /[A-Za-z0-9\-\._~\+\/]+=*/g;

describe("auth_code grant e2e", () => {
  let client: OAuthClient;

  let app: Application;

  beforeEach(async () => {
    client = {
      id: "1",
      isConfidential: false,
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
    };

    app = inMemoryExpressApp;

    inMemoryDatabase.clients.push(client);
    inMemoryDatabase.scopes.push({ name: "scope-1" }, { name: "scope-2" });
  });

  it("completes auth_code grant with pkce s256", async () => {
    const codeVerifier = base64urlencode(crypto.randomBytes(40));
    const codeChallenge = base64urlencode(crypto.createHash("sha256").update(codeVerifier).digest("hex"));

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
    expect(tokenResponse.body.access_token).toMatch(ACCESS_TOKEN_REGEX);
    // expect(tokenResponse.body.refresh_token).toMatch(ACCESS_TOKEN_REGEX);
  });
});
