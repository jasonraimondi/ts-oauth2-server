import { createHmac, createPublicKey, generateKeyPairSync } from "crypto";
import { sign } from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { calculateRsaJwkThumbprint, JwtService, OAuthException } from "../../../src/index.js";

function rsaPrivateKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ format: "pem", type: "pkcs8" }).toString();
}

function decodeJoseHeader(token: string): Record<string, unknown> {
  const [encodedHeader] = token.split(".");
  if (!encodedHeader) throw new Error("JWT header is missing");
  return JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as Record<string, unknown>;
}

function base64urlJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function forgeHs256Token(payload: Record<string, unknown>, secret: string): string {
  const signingInput = [base64urlJson({ alg: "HS256", typ: "JWT" }), base64urlJson(payload)].join(".");
  const signature = createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

describe("JwtService", () => {
  it("signs and verifies RS256 tokens with a consumer supplied RSA private key", async () => {
    const service = new JwtService({ key: rsaPrivateKey() });

    const token = await service.sign({ sub: "user-1" });
    const header = decodeJoseHeader(token);
    const verified = await service.verify(token);

    expect(header.alg).toBe("RS256");
    expect(header.kid).toBe(service.getKeySet().keys[0].kid);
    expect(verified.sub).toBe("user-1");
  });

  it("allows overriding the RS256 kid", async () => {
    const service = new JwtService({ key: rsaPrivateKey(), kid: "test-key" });

    const token = await service.sign({ sub: "user-1" });

    expect(decodeJoseHeader(token).kid).toBe("test-key");
    expect(service.getKeySet().keys[0].kid).toBe("test-key");
  });

  it("exports a public-only RSA JWK set", () => {
    const service = new JwtService({ key: rsaPrivateKey() });

    const jwk = service.getKeySet().keys[0];

    expect(jwk).toMatchObject({ kty: "RSA", use: "sig", alg: "RS256", kid: expect.any(String) });
    expect(jwk.n).toEqual(expect.any(String));
    expect(jwk.e).toBe("AQAB");
    for (const privateMember of ["d", "p", "q", "dp", "dq", "qi"]) {
      expect(jwk).not.toHaveProperty(privateMember);
    }
  });

  it("calculates the RFC 7638 RSA thumbprint known-answer value", () => {
    const n = [
      "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAt",
      "VT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn6",
      "4tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FD",
      "W2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n9",
      "1CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINH",
      "aQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
    ].join("");

    expect(calculateRsaJwkThumbprint({ kty: "RSA", n, e: "AQAB" })).toBe(
      "NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs",
    );
  });

  it("keeps the HS256 JOSE header byte-identical", async () => {
    const service = new JwtService("secret-key");

    const token = await service.sign({ sub: "user-1" });

    expect(decodeJoseHeader(token)).toStrictEqual({ alg: "HS256", typ: "JWT" });
  });

  it("pins verification to the configured algorithm and ignores caller supplied algorithms", async () => {
    const service = new JwtService({ key: rsaPrivateKey() });
    const token = await service.sign({ sub: "user-1" });

    await expect(service.verify(token, { algorithms: ["HS256"] })).resolves.toMatchObject({ sub: "user-1" });
  });

  it("rejects an HS256 token forged with the RSA public key as HMAC secret", async () => {
    const privateKey = rsaPrivateKey();
    const publicKey = createPublicKey(privateKey).export({ format: "pem", type: "spki" }).toString();
    const service = new JwtService({ key: privateKey });
    const forgedToken = forgeHs256Token({ sub: "attacker" }, publicKey);

    await expect(service.verify(forgedToken)).rejects.toThrow();
  });

  it("rejects alg:none tokens", async () => {
    const service = new JwtService("secret-key");
    const token = sign({ sub: "attacker" }, "", { algorithm: "none" });

    await expect(service.verify(token)).rejects.toThrow();
  });

  it("forwards sign header overrides", async () => {
    const service = new JwtService("secret-key");

    const token = await service.sign({ sub: "user-1" }, { header: { typ: "at+jwt" } });

    expect(decodeJoseHeader(token)).toStrictEqual({ alg: "HS256", typ: "at+jwt" });
  });

  it("rejects unsupported asymmetric algorithms", () => {
    expect(() => new JwtService({ key: rsaPrivateKey(), algorithm: "ES256" as never })).toThrow(
      /Only RS256 asymmetric signing is supported/,
    );
  });

  it("rejects malformed, public-only, and non-RSA private keys", () => {
    const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const publicKeyPem = publicKey.export({ format: "pem", type: "spki" }).toString();
    const { privateKey: ecPrivateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });

    expect(() => new JwtService({ key: "not a pem" })).toThrow(/Invalid RS256 private key/);
    expect(() => new JwtService({ key: publicKey })).toThrow(/requires a private key/);
    expect(() => new JwtService({ key: publicKeyPem })).toThrow(/requires a private key/);
    expect(() => new JwtService({ key: ecPrivateKey })).toThrow(/requires an RSA private key/);
  });
});

describe("OAuthException OIDC helpers", () => {
  it("creates invalid_token errors", () => {
    const error = OAuthException.invalidToken("bad token");

    expect(error.errorType).toBe("invalid_token");
    expect(error.status).toBe(401);
    expect(error.errorDescription).toBe("bad token");
  });

  it("creates insufficient_scope errors", () => {
    const error = OAuthException.insufficientScope("openid scope required");

    expect(error.errorType).toBe("insufficient_scope");
    expect(error.status).toBe(403);
    expect(error.errorDescription).toBe("openid scope required");
  });
});
