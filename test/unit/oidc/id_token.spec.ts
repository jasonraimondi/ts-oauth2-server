import { describe, expect, it } from "vitest";
import {
  buildIdTokenClaims,
  calculateAtHash,
  mergeIdTokenClaims,
  PROTOCOL_CLAIM_NAMES,
} from "../../../src/oidc/id_token.js";
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

describe("PROTOCOL_CLAIM_NAMES", () => {
  it("lists exactly the eight reserved protocol claim names", () => {
    expect([...PROTOCOL_CLAIM_NAMES]).toEqual(["iss", "sub", "aud", "exp", "iat", "at_hash", "nonce", "auth_time"]);
  });
});

describe("mergeIdTokenClaims", () => {
  const protocolClaims = buildIdTokenClaims({
    issuer: "https://issuer.example",
    clientId: "client-1",
    subject: "user-1",
    accessTokenExpiresAt: new Date("2021-12-11T01:00:00.000Z"),
    encryptedAccessToken: "jHkWEdUXMU1BwAsC4vtUsZwnNvTIxEl0z9K3vx5KF0Y",
    nonce: "protocol-nonce",
    authTime: 1_700_000_000,
  });

  it("merges non-protocol custom claims into the payload", () => {
    const merged = mergeIdTokenClaims(protocolClaims, { roles: ["admin"], tenant: "acme" });
    expect(merged.roles).toEqual(["admin"]);
    expect(merged.tenant).toBe("acme");
  });

  it.each([...PROTOCOL_CLAIM_NAMES])("protocol claim %s wins over a colliding custom claim", name => {
    const merged = mergeIdTokenClaims(protocolClaims, { [name]: "attacker-value", roles: ["admin"] });
    expect(merged[name]).toBe(protocolClaims[name]);
    expect(merged.roles).toEqual(["admin"]);
  });

  it("yields exactly the protocol claim set when custom claims are empty", () => {
    const merged = mergeIdTokenClaims(protocolClaims, {});
    expect(Object.keys(merged).sort()).toEqual(Object.keys(protocolClaims).sort());
  });
});
