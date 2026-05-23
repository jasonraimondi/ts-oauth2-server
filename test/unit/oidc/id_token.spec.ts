import { describe, expect, it } from "vitest";
import { buildIdTokenClaims, calculateAtHash } from "../../../src/oidc/id_token.js";
import { oidcSubjectIdentifier } from "../../../src/oidc/subject.js";

describe("calculateAtHash", () => {
  // OIDC Core §A.3 known-answer test vector.
  it("matches the OIDC Core A.3 known-answer vector", () => {
    expect(calculateAtHash("jHkWEdUXMU1BwAsC4vtUsZwnNvTIxEl0z9K3vx5KF0Y")).toBe("77QmUPtjPfzWtF2AnpK9RQ");
  });
});

describe("oidcSubjectIdentifier", () => {
  it("stringifies a numeric identifier", () => {
    expect(oidcSubjectIdentifier(42)).toBe("42");
  });

  it("passes a string identifier through unchanged", () => {
    expect(oidcSubjectIdentifier("abc123")).toBe("abc123");
  });
});

describe("buildIdTokenClaims", () => {
  const baseInput = {
    issuer: "https://issuer.example",
    clientId: "client-1",
    subject: "user-1",
    accessTokenExpiresAt: new Date("2021-12-11T01:00:00.000Z"),
    encryptedAccessToken: "jHkWEdUXMU1BwAsC4vtUsZwnNvTIxEl0z9K3vx5KF0Y",
  };

  it("assembles the protocol claim set", () => {
    const claims = buildIdTokenClaims(baseInput);

    expect(claims.iss).toBe("https://issuer.example");
    expect(claims.sub).toBe("user-1");
    expect(claims.aud).toBe("client-1");
    expect(claims.exp).toBe(Math.floor(baseInput.accessTokenExpiresAt.getTime() / 1000));
    expect(claims.iat).toBe(Math.floor(Date.now() / 1000));
    expect(claims.at_hash).toBe("77QmUPtjPfzWtF2AnpK9RQ");
  });

  it("includes nonce and auth_time only when supplied", () => {
    const withConditional = buildIdTokenClaims({ ...baseInput, nonce: "n-1", authTime: 1_700_000_000 });
    expect(withConditional.nonce).toBe("n-1");
    expect(withConditional.auth_time).toBe(1_700_000_000);

    const withoutConditional = buildIdTokenClaims(baseInput);
    expect(withoutConditional).not.toHaveProperty("nonce");
    expect(withoutConditional).not.toHaveProperty("auth_time");
  });
});
