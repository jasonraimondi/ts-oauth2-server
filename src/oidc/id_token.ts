import { createHash } from "crypto";
import { roundToSeconds } from "../utils/time.js";

export interface IdTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  at_hash: string;
  nonce?: string;
  auth_time?: number;
  [claim: string]: unknown;
}

/**
 * The reserved OIDC Protocol Claims. A consumer-supplied `getIdTokenClaims`
 * hook can never override these — they are stripped from the hook output before
 * it is merged into the ID token payload (OIDC Core §2).
 */
export const PROTOCOL_CLAIM_NAMES = ["iss", "sub", "aud", "exp", "iat", "at_hash", "nonce", "auth_time"] as const;

export interface IdTokenClaimsInput {
  issuer: string;
  clientId: string;
  subject: string;
  accessTokenExpiresAt: Date;
  encryptedAccessToken: string;
  nonce?: string | null;
  authTime?: number | null;
}

/**
 * `at_hash` per OIDC Core §3.1.3.6: the base64url-encoded left-most half of the
 * SHA-256 hash of the ASCII access token. SHA-256 is the correct hash for an
 * RS256-signed ID token.
 */
export function calculateAtHash(encryptedAccessToken: string): string {
  const digest = createHash("sha256").update(encryptedAccessToken, "ascii").digest();
  return digest.subarray(0, digest.length / 2).toString("base64url");
}

/**
 * Assembles the lean Protocol Claims set for an ID token. Scope-derived user
 * attributes are never placed here — they are served from UserInfo. `aud` is the
 * client (deliberately different from the access token's resource `aud`) and
 * `exp` reuses the access-token TTL.
 */
export function buildIdTokenClaims(input: IdTokenClaimsInput): IdTokenClaims {
  const claims: IdTokenClaims = {
    iss: input.issuer,
    sub: input.subject,
    aud: input.clientId,
    exp: roundToSeconds(input.accessTokenExpiresAt),
    iat: roundToSeconds(Date.now()),
    at_hash: calculateAtHash(input.encryptedAccessToken),
  };

  if (input.nonce != null) claims.nonce = input.nonce;
  if (input.authTime != null) claims.auth_time = input.authTime;

  return claims;
}

/**
 * Merges consumer-supplied custom claims into the protocol claim set with the
 * protocol claims always winning. The strip is explicit — every
 * PROTOCOL_CLAIM_NAMES key is removed from the hook output before merging — so
 * a consumer can add claims (roles, tenant, acr) but can never corrupt iss, sub,
 * aud, exp, iat, at_hash, nonce, or auth_time.
 */
export function mergeIdTokenClaims(
  protocolClaims: IdTokenClaims,
  customClaims: Record<string, unknown>,
): IdTokenClaims {
  const reserved = new Set<string>(PROTOCOL_CLAIM_NAMES);
  const safeCustomClaims: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(customClaims)) {
    if (!reserved.has(key)) safeCustomClaims[key] = value;
  }
  return { ...safeCustomClaims, ...protocolClaims };
}
