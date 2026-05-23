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
