import { createHash } from "crypto";
import { describe, expect, it } from "vitest";

import { PlainVerifier } from "../../../src/code_verifiers/plain.verifier.js";
import { S256Verifier } from "../../../src/code_verifiers/S256.verifier.js";
import { base64urlencode } from "../../../src/index.js";
import { timingSafeCompare } from "../../../src/utils/compare.js";

const codeVerifier = "qqVDyvlSezXc64NY5Rx3BbL_aT7c2xEBgoJP9domepFZLEjo9ln8EA";
const codeChallenge = base64urlencode(createHash("sha256").update(codeVerifier).digest());

describe("S256Verifier", () => {
  const verifier = new S256Verifier();

  it("verifies the challenge derived from the code verifier", () => {
    expect(verifier.verifyCodeChallenge(codeVerifier, codeChallenge)).toBe(true);
  });

  it("rejects a challenge derived from another code verifier", () => {
    expect(verifier.verifyCodeChallenge(codeVerifier + "broken", codeChallenge)).toBe(false);
  });

  it("rejects a challenge of a different length", () => {
    expect(verifier.verifyCodeChallenge(codeVerifier, codeChallenge.slice(0, 10))).toBe(false);
  });
});

describe("PlainVerifier", () => {
  const verifier = new PlainVerifier();

  it("verifies a challenge equal to the code verifier", () => {
    expect(verifier.verifyCodeChallenge(codeVerifier, codeVerifier)).toBe(true);
  });

  it("rejects a differing challenge", () => {
    expect(verifier.verifyCodeChallenge(codeVerifier, codeVerifier + "broken")).toBe(false);
  });
});

describe("timingSafeCompare", () => {
  it("compares equal strings", () => {
    expect(timingSafeCompare("a-value", "a-value")).toBe(true);
  });

  it("rejects differing strings of equal length", () => {
    expect(timingSafeCompare("a-value", "b-value")).toBe(false);
  });

  it("rejects strings of differing length without throwing", () => {
    expect(timingSafeCompare("a-value", "a-value-longer")).toBe(false);
  });

  it("compares multi-byte strings by their utf-8 bytes", () => {
    expect(timingSafeCompare("é", "é")).toBe(true);
    expect(timingSafeCompare("é", "e")).toBe(false);
  });
});
