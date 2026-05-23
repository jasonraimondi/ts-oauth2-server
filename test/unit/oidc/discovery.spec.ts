import { generateKeyPairSync } from "crypto";
import { describe, expect, it } from "vitest";
import {
  AuthorizationServer,
  JwtService,
  type AuthorizationServerOptions,
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

const baseOidcOptions: OidcOptions = {
  authorizationEndpoint: "https://issuer.example/authorize",
  tokenEndpoint: "https://issuer.example/token",
  userinfoEndpoint: "https://issuer.example/userinfo",
  jwksUri: "https://issuer.example/jwks",
  getUserClaims: async () => ({ sub: "user-1" }),
};

function createServer(
  oidc: OidcOptions = baseOidcOptions,
  options: Partial<AuthorizationServerOptions> = {},
): AuthorizationServer {
  return new AuthorizationServer(
    inMemoryClientRepository,
    inMemoryAccessTokenRepository,
    inMemoryScopeRepository,
    new JwtService({ key: rsaPrivateKey() }),
    { issuer: "https://issuer.example", oidc, ...options },
  );
}

describe("AuthorizationServer openidConfiguration", () => {
  it("returns the issuer and all four REQUIRED endpoint URLs", () => {
    const doc = createServer().openidConfiguration().body;

    expect(doc.issuer).toBe("https://issuer.example");
    expect(doc.authorization_endpoint).toBe("https://issuer.example/authorize");
    expect(doc.token_endpoint).toBe("https://issuer.example/token");
    expect(doc.userinfo_endpoint).toBe("https://issuer.example/userinfo");
    expect(doc.jwks_uri).toBe("https://issuer.example/jwks");
  });

  it("advertises RS256 as the only id_token signing algorithm", () => {
    expect(createServer().openidConfiguration().body.id_token_signing_alg_values_supported).toEqual(["RS256"]);
  });

  it("advertises code-only response types and the public subject type", () => {
    const doc = createServer().openidConfiguration().body;

    expect(doc.response_types_supported).toEqual(["code"]);
    expect(doc.subject_types_supported).toEqual(["public"]);
  });

  it("advertises S256-only code challenge methods", () => {
    expect(createServer().openidConfiguration().body.code_challenge_methods_supported).toEqual(["S256"]);
  });

  it("advertises the standard OIDC scopes and omits offline_access", () => {
    expect(createServer().openidConfiguration().body.scopes_supported).toEqual([
      "openid",
      "profile",
      "email",
      "address",
      "phone",
    ]);
  });

  it("serves the document with cacheable JSON headers", () => {
    const res = createServer().openidConfiguration();

    expect(res.status).toBe(200);
    expect(res.get("content-type")).toBe("application/json");
    expect(res.get("cache-control")).toBe("public, max-age=3600");
  });

  it("shallow-merges non-security consumer metadata into the document", () => {
    const doc = createServer({
      ...baseOidcOptions,
      metadata: { claims_supported: ["sub", "email"], scopes_supported: ["openid", "tenant"] },
    }).openidConfiguration().body;

    expect(doc.claims_supported).toEqual(["sub", "email"]);
    expect(doc.scopes_supported).toEqual(["openid", "tenant"]);
  });

  it.each(["issuer", "jwks_uri", "id_token_signing_alg_values_supported"])(
    "throws at construction when metadata overrides the security-critical field %s",
    field => {
      expect(() => createServer({ ...baseOidcOptions, metadata: { [field]: "https://evil.example" } })).toThrow(
        /cannot override/,
      );
    },
  );

  it("throws when OIDC is not enabled", () => {
    const server = new AuthorizationServer(
      inMemoryClientRepository,
      inMemoryAccessTokenRepository,
      inMemoryScopeRepository,
      "secret-key",
    );

    expect(() => server.openidConfiguration()).toThrow(/OIDC/);
  });
});
