import { generateKeyPairSync, type KeyObject } from "crypto";
import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AuthorizationServer,
  JwtService,
  OAuthRequest,
  type OAuthAuthCode,
  type OAuthAuthCodeRepository,
  type OAuthClient,
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

// Single keypair so jose-crafted attack tokens are signed by the server's key.
const keypair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const rsaPem = keypair.privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const signingKey: KeyObject = keypair.privateKey;

const encodeSegment = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");

describe("OIDC resilience: cross-cutting negative cases", () => {
  // test/setup.ts freezes time globally; real `iat`/`exp` handling needs a real clock.
  beforeEach(() => {
    vi.useRealTimers();
  });

  let user: OAuthUser;
  let client: OAuthClient;
  let oidc: OidcOptions;
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

    oidc = {
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
      new JwtService({ key: rsaPem }),
      { issuer, oidc },
    );
    server.enableGrantType({
      grant: "authorization_code",
      authCodeRepository: inMemoryAuthCodeRepository,
      userRepository: inMemoryUserRepository,
    });
  });

  const userInfo = (token: string) =>
    server.userInfo(new OAuthRequest({ headers: { authorization: `Bearer ${token}` } }));

  const baseClaims = () => ({ iss: issuer, sub: "abc123", scope: "openid", jti: "new token", cid: client.id });

  // Runs the real authorize → token exchange and returns the minted access token.
  async function mintAccessToken(scope = "openid profile"): Promise<string> {
    const authRequest = await server.validateAuthorizationRequest(
      new OAuthRequest({
        query: {
          response_type: "code",
          client_id: client.id,
          redirect_uri: redirectUri,
          scope,
          state: "state-xyz",
          nonce: "n-1",
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        },
      }),
    );
    authRequest.user = user;
    authRequest.isAuthorizationApproved = true;
    const redirect = await server.completeAuthorizationRequest(authRequest);
    const code = new URLSearchParams(redirect.headers.location.split("?")[1]).get("code");
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
    return tokenResponse.body.access_token as string;
  }

  it("accepts a legitimately minted access token (baseline)", async () => {
    const response = await userInfo(await mintAccessToken());
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.sub).toBe("abc123");
  });

  it("rejects an algorithm-confusion token (HS256) with invalid_token", async () => {
    const token = await new SignJWT(baseClaims())
      .setProtectedHeader({ alg: "HS256", typ: "at+jwt" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("attacker-symmetric-secret"));

    const response = await userInfo(token);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("invalid_token");
    expect(response.headers["www-authenticate"]).toContain('error="invalid_token"');
  });

  it("rejects an alg:none token with invalid_token", async () => {
    const token = `${encodeSegment({ alg: "none", typ: "at+jwt" })}.${encodeSegment(baseClaims())}.`;

    const response = await userInfo(token);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("invalid_token");
  });

  it("rejects a token whose typ is not at+jwt with invalid_token", async () => {
    const token = await new SignJWT(baseClaims())
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(signingKey);

    const response = await userInfo(token);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("invalid_token");
    expect(response.body.error_description).toContain("at+jwt");
  });

  it("rejects a token whose issuer does not match with invalid_token", async () => {
    const token = await new SignJWT({ ...baseClaims(), iss: "https://evil.example" })
      .setProtectedHeader({ alg: "RS256", typ: "at+jwt" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(signingKey);

    const response = await userInfo(token);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("invalid_token");
    expect(response.body.error_description).toContain("issuer");
  });

  it("rejects an expired token with invalid_token", async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    const token = await new SignJWT(baseClaims())
      .setProtectedHeader({ alg: "RS256", typ: "at+jwt" })
      .setIssuedAt(past - 60)
      .setExpirationTime(past)
      .sign(signingKey);

    const response = await userInfo(token);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("invalid_token");
  });

  it("rejects a revoked token with invalid_token", async () => {
    const token = await mintAccessToken();
    expect((await userInfo(token)).status).toBe(200);

    await inMemoryAccessTokenRepository.revoke({ accessToken: "new token" } as never);

    const response = await userInfo(token);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("invalid_token");
    expect(response.body.error_description).toContain("revoked");
  });

  it("rejects a token without the openid scope with insufficient_scope", async () => {
    const token = await new SignJWT({ ...baseClaims(), scope: "profile" })
      .setProtectedHeader({ alg: "RS256", typ: "at+jwt" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(signingKey);

    const response = await userInfo(token);
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("insufficient_scope");
    expect(response.headers["www-authenticate"]).toContain('scope="openid"');
  });

  describe("cache headers", () => {
    it("serves JWKS with a public, long-lived cache and JSON content type", () => {
      const response = server.jwks();
      expect(response.headers["content-type"]).toBe("application/json");
      expect(response.headers["cache-control"]).toBe("public, max-age=3600");
    });

    it("serves discovery with a public, long-lived cache and JSON content type", () => {
      const response = server.openidConfiguration();
      expect(response.headers["content-type"]).toBe("application/json");
      expect(response.headers["cache-control"]).toBe("public, max-age=3600");
    });
  });

  describe("opaque-code nonce loss", () => {
    it("fails loud with invalid_grant when an opaque-code repository drops the nonce", async () => {
      const nonceDroppingRepository: OAuthAuthCodeRepository = {
        issueAuthCode: (c, u, s) => inMemoryAuthCodeRepository.issueAuthCode(c, u, s),
        getByIdentifier: code => inMemoryAuthCodeRepository.getByIdentifier(code),
        isRevoked: code => inMemoryAuthCodeRepository.isRevoked(code),
        revoke: code => inMemoryAuthCodeRepository.revoke(code),
        async persist(authCode: OAuthAuthCode) {
          const stripped = { ...authCode };
          delete (stripped as { nonce?: unknown }).nonce;
          await inMemoryAuthCodeRepository.persist(stripped);
        },
      };

      const opaqueServer = new AuthorizationServer(
        inMemoryClientRepository,
        inMemoryAccessTokenRepository,
        inMemoryScopeRepository,
        new JwtService({ key: rsaPem }),
        { issuer, oidc, useOpaqueAuthorizationCodes: true },
      );
      opaqueServer.enableGrantType({
        grant: "authorization_code",
        authCodeRepository: nonceDroppingRepository,
        userRepository: inMemoryUserRepository,
      });

      const authRequest = await opaqueServer.validateAuthorizationRequest(
        new OAuthRequest({
          query: {
            response_type: "code",
            client_id: client.id,
            redirect_uri: redirectUri,
            scope: "openid",
            state: "state-xyz",
            nonce: "n-required",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
          },
        }),
      );
      authRequest.user = user;
      authRequest.isAuthorizationApproved = true;

      await expect(opaqueServer.completeAuthorizationRequest(authRequest)).rejects.toMatchObject({
        errorType: "invalid_grant",
      });
    });
  });
});
