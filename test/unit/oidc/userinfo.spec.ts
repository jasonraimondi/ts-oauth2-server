import { generateKeyPairSync } from "crypto";
import { describe, expect, it } from "vitest";
import {
  AuthorizationServer,
  JwtService,
  OAuthRequest,
  type OAuthToken,
  type OAuthTokenRepository,
  type OidcOptions,
} from "../../../src/index.js";
import { OAuthException } from "../../../src/exceptions/oauth.exception.js";
import type { AccessTokenVerifier } from "../../../src/oidc/access_token_verifier.js";
import { handleUserInfoRequest } from "../../../src/oidc/userinfo.js";
import {
  inMemoryAccessTokenRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
} from "../../e2e/_helpers/in_memory/repository.js";

const issuer = "https://issuer.example";

function rsaPem(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ format: "pem", type: "pkcs8" }).toString();
}

// The default token repo for happy-path tests omits getByAccessToken so the
// revocation check is skipped; revocation tests supply their own.
const { getByAccessToken: _omitRevocation, ...tokenRepoWithoutRevocation } = inMemoryAccessTokenRepository;

function oidcOptions(getUserClaims: OidcOptions["getUserClaims"]): OidcOptions {
  return {
    authorizationEndpoint: `${issuer}/authorize`,
    tokenEndpoint: `${issuer}/token`,
    userinfoEndpoint: `${issuer}/userinfo`,
    jwksUri: `${issuer}/jwks`,
    getUserClaims,
  };
}

function createServer(
  jwt: JwtService,
  getUserClaims: OidcOptions["getUserClaims"] = async () => ({ sub: "abc123" }),
  tokenRepository: OAuthTokenRepository = tokenRepoWithoutRevocation,
): AuthorizationServer {
  return new AuthorizationServer(inMemoryClientRepository, tokenRepository, inMemoryScopeRepository, jwt, {
    issuer,
    oidc: oidcOptions(getUserClaims),
  });
}

function accessTokenClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: issuer,
    sub: "abc123",
    scope: "openid profile",
    jti: "tok-1",
    iat: now,
    nbf: now,
    exp: now + 3600,
    ...overrides,
  };
}

function sign(
  jwt: JwtService,
  claims: Record<string, unknown>,
  header: Record<string, unknown> = { typ: "at+jwt", alg: "RS256" },
): Promise<string> {
  return jwt.sign(claims, { header });
}

function bearer(token: string): OAuthRequest {
  return new OAuthRequest({ headers: { authorization: `Bearer ${token}` } });
}

describe("AuthorizationServer userInfo", () => {
  it("returns scope-derived claims as JSON with no-store and the canonical sub", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt, async () => ({ sub: "ignored", name: "Alice", email: "alice@example.com" }));
    const token = await sign(jwt, accessTokenClaims({ scope: "openid profile" }));

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(200);
    expect(res.get("content-type")).toBe("application/json");
    expect(res.get("cache-control")).toBe("no-store");
    // email requires the `email` scope which was not granted; profile yields name.
    expect(res.body).toEqual({ name: "Alice", sub: "abc123" });
  });

  it("applies sub last so a consumer getUserClaims cannot overwrite it", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt, async () => ({ sub: "evil", name: "Alice" }));
    const token = await sign(jwt, accessTokenClaims({ scope: "openid email profile" }));

    const res = await server.userInfo(bearer(token));

    expect(res.body.sub).toBe("abc123");
  });

  it("reads the access token from the form body", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt, async () => ({ sub: "abc123", name: "Alice" }));
    const token = await sign(jwt, accessTokenClaims());

    const res = await server.userInfo(new OAuthRequest({ body: { access_token: token } }));

    expect(res.status).toBe(200);
    expect(res.body.sub).toBe("abc123");
  });

  it("returns 403 insufficient_scope when the openid scope is absent", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt);
    const token = await sign(jwt, accessTokenClaims({ scope: "profile" }));

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(403);
    expect(res.get("www-authenticate")).toBe(
      'Bearer error="insufficient_scope", error_description="openid scope required", scope="openid"',
    );
  });

  it("returns 401 invalid_token when an id_token (typ JWT) is presented as a bearer token", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt);
    const token = await sign(jwt, accessTokenClaims(), { typ: "JWT", alg: "RS256" });

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(401);
    expect(res.get("www-authenticate")).toBe(
      'Bearer error="invalid_token", error_description="Access token typ must be at+jwt"',
    );
  });

  it("returns 401 invalid_token when the issuer does not match", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt);
    const token = await sign(jwt, accessTokenClaims({ iss: "https://evil.example" }));

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(401);
    expect(res.get("www-authenticate")).toBe(
      'Bearer error="invalid_token", error_description="Access token issuer mismatch"',
    );
  });

  it("returns 401 invalid_token when the access token is expired", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt);
    const now = Math.floor(Date.now() / 1000);
    const token = await sign(jwt, accessTokenClaims({ iat: now - 100, nbf: now - 100, exp: now - 10 }));

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(401);
    expect(res.get("www-authenticate")).toBe('Bearer error="invalid_token", error_description="jwt expired"');
  });

  it("returns 401 invalid_token when no access token is presented", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt);

    const res = await server.userInfo(new OAuthRequest());

    expect(res.status).toBe(401);
    expect(res.get("www-authenticate")).toBe('Bearer error="invalid_token", error_description="Missing access token"');
  });

  it("returns 401 invalid_token when the access token carries no subject", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const server = createServer(jwt);
    const { sub: _omitSub, ...noSub } = accessTokenClaims({ scope: "openid" });
    const token = await sign(jwt, noSub);

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(401);
    expect(res.get("www-authenticate")).toBe(
      'Bearer error="invalid_token", error_description="Access token is missing a subject"',
    );
  });

  it("returns 401 invalid_token when getByAccessToken reports the token revoked", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const revokedRepo: OAuthTokenRepository = {
      ...tokenRepoWithoutRevocation,
      getByAccessToken: async () => ({ accessTokenExpiresAt: new Date(0) }) as OAuthToken,
    };
    const server = createServer(jwt, async () => ({ sub: "abc123" }), revokedRepo);
    const token = await sign(jwt, accessTokenClaims());

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(401);
    expect(res.get("www-authenticate")).toBe(
      'Bearer error="invalid_token", error_description="Access token has been revoked"',
    );
  });

  it("returns 401 invalid_token when isAccessTokenRevoked flags a token whose expiry is still in the future", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const flagRevokedRepo: OAuthTokenRepository = {
      ...tokenRepoWithoutRevocation,
      getByAccessToken: async () => ({ accessTokenExpiresAt: new Date(Date.now() + 3_600_000) }) as OAuthToken,
      isAccessTokenRevoked: async () => true,
    };
    const server = createServer(jwt, async () => ({ sub: "abc123" }), flagRevokedRepo);
    const token = await sign(jwt, accessTokenClaims());

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(401);
    expect(res.get("www-authenticate")).toBe(
      'Bearer error="invalid_token", error_description="Access token has been revoked"',
    );
  });

  it("returns claims when getByAccessToken reports the token active", async () => {
    const jwt = new JwtService({ key: rsaPem() });
    const activeRepo: OAuthTokenRepository = {
      ...tokenRepoWithoutRevocation,
      getByAccessToken: async () => ({ accessTokenExpiresAt: new Date(Date.now() + 3_600_000) }) as OAuthToken,
    };
    const server = createServer(jwt, async () => ({ sub: "abc123", name: "Alice" }), activeRepo);
    const token = await sign(jwt, accessTokenClaims());

    const res = await server.userInfo(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: "Alice", sub: "abc123" });
  });

  it("sanitizes the error_description so a verifier message cannot break out of the WWW-Authenticate header", async () => {
    const malicious = 'bad "value"\r\nWWW-Authenticate: injected="1"';
    const verifier = {
      verify: async () => {
        throw OAuthException.invalidToken(malicious);
      },
    } as unknown as AccessTokenVerifier;

    const res = await handleUserInfoRequest(new OAuthRequest({ body: { access_token: "x" } }), {
      verifier,
      oidc: oidcOptions(async () => ({ sub: "abc123" })),
      scopeDelimiter: " ",
    });

    const header = res.get("www-authenticate") ?? "";
    expect(res.status).toBe(401);
    // The structural quotes around the value remain, but the injected payload's quotes,
    // backslashes and CR/LF must be stripped so it cannot inject extra auth-scheme params.
    expect(header).toBe('Bearer error="invalid_token", error_description="bad valueWWW-Authenticate: injected=1"');
    expect(header).not.toMatch(/[\r\n]/);
    // The body still carries the raw description (JSON-encoded, so injection-safe there).
    expect(res.body.error_description).toBe(malicious);
  });

  it("throws when OIDC is not enabled", () => {
    const server = new AuthorizationServer(
      inMemoryClientRepository,
      tokenRepoWithoutRevocation,
      inMemoryScopeRepository,
      "secret-key",
    );

    expect(() => server.userInfo(new OAuthRequest())).toThrow(/OIDC/);
  });
});
