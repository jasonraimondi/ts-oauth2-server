import { generateKeyPairSync } from "crypto";
import { sign } from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
  AccessTokenVerifier,
  DEFAULT_AUTHORIZATION_SERVER_OPTIONS,
  JwtService,
  type AuthorizationServerOptions,
  type OidcOptions,
} from "../../../src/index.js";

function rsaPrivateKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ format: "pem", type: "pkcs8" }).toString();
}

const issuer = "https://issuer.example";

const oidcOptions: OidcOptions = {
  authorizationEndpoint: "https://issuer.example/authorize",
  tokenEndpoint: "https://issuer.example/token",
  userinfoEndpoint: "https://issuer.example/userinfo",
  jwksUri: "https://issuer.example/jwks",
  getUserClaims: async () => ({ sub: "user-1" }),
};

function oidcAuthorizationServerOptions(): AuthorizationServerOptions {
  return {
    ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS,
    issuer,
    oidc: oidcOptions,
  };
}

function futureExp(): number {
  return Math.floor(Date.now() / 1000) + 60;
}

describe("AccessTokenVerifier", () => {
  it("accepts a well-formed at+jwt access token with a matching issuer", async () => {
    const jwt = new JwtService({ key: rsaPrivateKey() });
    const verifier = new AccessTokenVerifier(jwt, oidcAuthorizationServerOptions());
    const token = await jwt.sign(
      { iss: issuer, sub: "user-1", aud: "resource-a", exp: futureExp() },
      { header: { typ: "at+jwt" } },
    );

    await expect(verifier.verify(`Bearer ${token}`)).resolves.toMatchObject({
      iss: issuer,
      sub: "user-1",
      aud: "resource-a",
    });
  });

  it("rejects tokens whose JOSE typ is not at+jwt", async () => {
    const jwt = new JwtService({ key: rsaPrivateKey() });
    const verifier = new AccessTokenVerifier(jwt, oidcAuthorizationServerOptions());
    const token = await jwt.sign({ iss: issuer, sub: "user-1", exp: futureExp() });

    await expect(verifier.verify(token)).rejects.toMatchObject({
      errorType: "invalid_token",
      errorDescription: "Access token typ must be at+jwt",
    });
  });

  it("rejects tokens whose issuer does not match the configured issuer", async () => {
    const jwt = new JwtService({ key: rsaPrivateKey() });
    const verifier = new AccessTokenVerifier(jwt, oidcAuthorizationServerOptions());
    const token = await jwt.sign(
      { iss: "https://attacker.example", sub: "user-1", exp: futureExp() },
      { header: { typ: "at+jwt" } },
    );

    await expect(verifier.verify(token)).rejects.toMatchObject({
      errorType: "invalid_token",
      errorDescription: "Access token issuer mismatch",
    });
  });

  it("rejects tokens whose JOSE alg is not RS256", async () => {
    const jwt = new JwtService({ key: rsaPrivateKey() });
    const verifier = new AccessTokenVerifier(jwt, oidcAuthorizationServerOptions());
    const token = sign({ iss: issuer, sub: "user-1", exp: futureExp() }, "secret-key", {
      algorithm: "HS256",
      header: { typ: "at+jwt" },
    });

    await expect(verifier.verify(token)).rejects.toMatchObject({
      errorType: "invalid_token",
      errorDescription: "Access token alg must be RS256",
    });
  });

  it("rejects expired access tokens", async () => {
    const jwt = new JwtService({ key: rsaPrivateKey() });
    const verifier = new AccessTokenVerifier(jwt, oidcAuthorizationServerOptions());
    const token = await jwt.sign(
      { iss: issuer, sub: "user-1", exp: Math.floor(Date.now() / 1000) - 1 },
      { header: { typ: "at+jwt" } },
    );

    await expect(verifier.verify(token)).rejects.toMatchObject({ errorType: "invalid_token" });
  });
});
