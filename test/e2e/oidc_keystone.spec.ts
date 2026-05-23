import { generateKeyPairSync } from "crypto";
import { createLocalJWKSet, jwtVerify } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { responseToVanilla } from "../../src/adapters/vanilla.js";
import {
  AuthorizationServer,
  JwtService,
  OAuthRequest,
  type OAuthClient,
  type OAuthResponse,
  type OAuthUser,
  type OidcOptions,
} from "../../src/index.js";
import { inMemoryDatabase } from "./_helpers/in_memory/database.js";
import {
  inMemoryAccessTokenRepository,
  inMemoryAuthCodeRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
  inMemoryUserRepository,
} from "./_helpers/in_memory/repository.js";

const issuer = "https://issuer.example";
const redirectUri = "https://rp.example/callback";

// Known-good PKCE pair: base64url(sha256(verifier)) === challenge.
const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA";
const codeChallenge = "hA3IxucyJC0BsZH9zdYvGeK0ck2dC-seLBn20l18Iws";

function rsaPem(): string {
  return generateKeyPairSync("rsa", { modulusLength: 2048 })
    .privateKey.export({ format: "pem", type: "pkcs8" })
    .toString();
}

describe("OIDC keystone: authorize → token → jwks → userinfo (vanilla adapter)", () => {
  // test/setup.ts installs fake timers globally; a real-clock JWKS verify against
  // `iat`/`exp` cannot work under frozen time, so opt back into real timers here.
  beforeEach(() => {
    vi.useRealTimers();
  });

  let user: OAuthUser;
  let client: OAuthClient;
  let server: AuthorizationServer;

  beforeEach(() => {
    user = { id: "abc123", email: "alice@example.com" };
    client = {
      id: "oidc-client",
      name: "OIDC RP",
      secret: undefined,
      redirectUris: [redirectUri],
      allowedGrants: ["authorization_code"],
      scopes: [{ name: "openid" }, { name: "profile" }],
    };
    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.users[user.id] = user;

    const oidc: OidcOptions = {
      authorizationEndpoint: `${issuer}/authorize`,
      tokenEndpoint: `${issuer}/token`,
      userinfoEndpoint: `${issuer}/userinfo`,
      jwksUri: `${issuer}/jwks`,
      getUserClaims: async subject => ({ sub: subject, name: "Alice", email: "alice@example.com" }),
    };

    server = new AuthorizationServer(
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      new JwtService({ key: rsaPem() }),
      { issuer, oidc },
    );
    server.enableGrantType({
      grant: "authorization_code",
      authCodeRepository: inMemoryAuthCodeRepository,
      userRepository: inMemoryUserRepository,
    });
  });

  it("issues an id_token jose can verify against /jwks whose sub matches userinfo", async () => {
    // 1. Authorization request (scope=openid, nonce, PKCE).
    const authRequest = await server.validateAuthorizationRequest(
      new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: redirectUri,
          scope: "openid profile",
          state: "state-xyz",
          nonce: "n-0S6_WzA2Mj",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        },
      }),
    );
    authRequest.user = user;
    authRequest.isAuthorizationApproved = true;

    const redirectResponse = await server.completeAuthorizationRequest(authRequest);
    const code = new URLSearchParams(redirectResponse.headers.location.split("?")[1]).get("code");
    expect(code).toBeTruthy();

    // 2. Token request → access token + id_token.
    const tokenResponse = await server.respondToAccessTokenRequest(
      new OAuthRequest({
        body: {
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: redirectUri,
          client_id: client.id,
          code_verifier: codeVerifier,
        },
      }),
    );
    const idToken = tokenResponse.body.id_token as string;
    const accessToken = tokenResponse.body.access_token as string;
    expect(idToken).toEqual(expect.any(String));

    // 3. Fetch the live JWKS through the vanilla adapter.
    const jwksResponse = responseToVanilla(server.jwks() as OAuthResponse);
    const jwks = createLocalJWKSet(await jwksResponse.json());

    // 4. Independently verify the id_token with jose (NOT the library's JwtService).
    const { payload: idClaims } = await jwtVerify(idToken, jwks, { issuer, audience: client.id });
    expect(idClaims.nonce).toBe("n-0S6_WzA2Mj");

    // 5. Call UserInfo through the vanilla adapter.
    const userInfoResponse = responseToVanilla(
      (await server.userInfo(
        new OAuthRequest({ headers: { authorization: `Bearer ${accessToken}` } }),
      )) as OAuthResponse,
    );
    expect(userInfoResponse.status).toBe(200);
    expect(userInfoResponse.headers.get("content-type")).toBe("application/json");
    expect(userInfoResponse.headers.get("cache-control")).toBe("no-store");
    const userInfo = await userInfoResponse.json();

    // 6. Keystone assertion: id_token sub === userinfo sub, byte-for-byte.
    expect(userInfo.sub).toBe(idClaims.sub);
    expect(userInfo.sub).toBe("abc123");
    expect(userInfo.name).toBe("Alice");
    // email requires the `email` scope, which was not granted.
    expect(userInfo.email).toBeUndefined();
  });
});
