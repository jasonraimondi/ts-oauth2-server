import { generateKeyPairSync } from "crypto";
import { describe, expect, it } from "vitest";
import {
  AuthorizationServer,
  JwtService,
  type AuthorizationServerOptions,
  type JsonWebKeySet,
  type JwtInterface,
  type OidcOptions,
} from "../../../src/index.js";
import {
  inMemoryAccessTokenRepository,
  inMemoryClientRepository,
  inMemoryScopeRepository,
} from "../../e2e/_helpers/in_memory/repository.js";

function rsaPrivateKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ format: "pem", type: "pkcs8" }).toString();
}

const oidcOptions: OidcOptions = {
  authorizationEndpoint: "https://issuer.example/authorize",
  tokenEndpoint: "https://issuer.example/token",
  userinfoEndpoint: "https://issuer.example/userinfo",
  jwksUri: "https://issuer.example/jwks",
  getUserClaims: async () => ({ sub: "user-1" }),
};

function createAuthorizationServer(
  serviceOrString: JwtInterface | string,
  options: Partial<AuthorizationServerOptions> = {},
): AuthorizationServer {
  return new AuthorizationServer(
    inMemoryClientRepository,
    inMemoryAccessTokenRepository,
    inMemoryScopeRepository,
    serviceOrString,
    options,
  );
}

describe("AuthorizationServer OIDC options", () => {
  it.each([
    [undefined, "OIDC requires `issuer` to be set"],
    ["not-a-url", "OIDC `issuer` must be https (loopback http permitted)"],
    ["ftp://issuer.example", "OIDC `issuer` must be https (loopback http permitted)"],
    ["http://issuer.example", "OIDC `issuer` must be https (loopback http permitted)"],
  ] as const)("throws for invalid issuer %s", (issuer, message) => {
    const jwt = new JwtService({ key: rsaPrivateKey() });

    expect(() => createAuthorizationServer(jwt, { issuer, oidc: oidcOptions })).toThrow(message);
  });

  it.each([
    "https://issuer.example/tenant?foo=bar",
    "https://issuer.example/tenant#fragment",
    "https://issuer.example/tenant?",
    "https://issuer.example/tenant#",
  ])(
    "throws for issuer query or fragment in %s",
    issuer => {
      const jwt = new JwtService({ key: rsaPrivateKey() });

      expect(() => createAuthorizationServer(jwt, { issuer, oidc: oidcOptions })).toThrow(
        "OIDC `issuer` must not contain a query or fragment",
      );
    },
  );

  it.each(["https://issuer.example", "http://localhost", "http://127.0.0.1", "http://[::1]"])(
    "accepts issuer %s",
    issuer => {
      const jwt = new JwtService({ key: rsaPrivateKey() });

      expect(() => createAuthorizationServer(jwt, { issuer, oidc: oidcOptions })).not.toThrow();
    },
  );

  it("throws when the JWT service does not expose a JWKS", () => {
    const jwtWithoutKeySet: JwtInterface = {
      verify: async () => ({}),
      decode: () => null,
      sign: async () => "token",
    };

    expect(() =>
      createAuthorizationServer(jwtWithoutKeySet, { issuer: "https://issuer.example", oidc: oidcOptions }),
    ).toThrow("OIDC requires a JwtInterface that implements getKeySet()");
  });

  it("throws for the string-secret JWT path when OIDC requires a JWKS", () => {
    expect(() =>
      createAuthorizationServer("secret-key", { issuer: "https://issuer.example", oidc: oidcOptions }),
    ).toThrow("OIDC requires a JwtInterface that implements getKeySet()");
  });

  it("does not apply OIDC construction guards when OIDC is disabled", () => {
    expect(() => createAuthorizationServer("secret-key", { issuer: "http://issuer.example" })).not.toThrow();
  });

  it("returns the configured public key set from jwks() with cacheable JSON headers", () => {
    const jwt = new JwtService({ key: rsaPrivateKey(), kid: "oidc-key-1" });
    const server = createAuthorizationServer(jwt, { issuer: "https://issuer.example", oidc: oidcOptions });

    const response = server.jwks();
    const body = response.body as JsonWebKeySet;
    const key = body.keys[0];

    expect(response.status).toBe(200);
    expect(response.get("content-type")).toBe("application/json");
    expect(response.get("cache-control")).toBe("public, max-age=3600");
    expect(key).toMatchObject({ kty: "RSA", use: "sig", alg: "RS256", kid: "oidc-key-1" });
    expect(key.n).toEqual(expect.any(String));
    expect(key.e).toBe("AQAB");
    for (const privateMember of ["d", "p", "q", "dp", "dq", "qi"]) {
      expect(key).not.toHaveProperty(privateMember);
    }
  });
});
