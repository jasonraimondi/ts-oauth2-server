import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  AccessTokenVerifier,
  buildIdTokenClaims,
  buildOidcDiscoveryDocument,
  calculateAtHash,
  calculateRsaJwkThumbprint,
  DEFAULT_AUTHORIZATION_SERVER_OPTIONS,
  filterOidcClaimsByScope,
  handleUserInfoRequest,
  isAutoRecognizedOidcScope,
  JwtService,
  mergeIdTokenClaims,
  OAuthException,
  OIDC_AUTO_RECOGNIZED_SCOPES,
  OIDC_PROTECTED_METADATA,
  OIDC_SCOPE_CLAIMS,
  oidcSubjectIdentifier,
  PROTOCOL_CLAIM_NAMES,
} from "../../../src/index.js";
// Type-only surface — the import resolves (and a consumer's compile checks) only
// while these remain exported from the package entry point.
import type {
  AccessTokenPayload,
  FilteredOidcUserClaims,
  GrantedOidcScopes,
  IdTokenClaims,
  IdTokenClaimsInput,
  JsonWebKeySet,
  JwtAsymmetricKeyOptions,
  JwtInterface,
  OidcAddressClaim,
  OidcDiscoveryDocument,
  OidcDiscoveryMetadata,
  OidcGetIdTokenClaims,
  OidcGetUserClaims,
  OidcIdTokenClaimsContext,
  OidcOptions,
  OidcStandardClaim,
  OidcStandardScope,
  OidcUserClaims,
  PublicJsonWebKey,
  UserInfoDependencies,
} from "../../../src/index.js";

describe("OIDC public API surface", () => {
  it("exports the AccessTokenVerifier seam from the package entry point", () => {
    expect(typeof AccessTokenVerifier).toBe("function");
  });

  it("exports the ID token builders and protocol-claim guard", () => {
    expect(typeof buildIdTokenClaims).toBe("function");
    expect(typeof calculateAtHash).toBe("function");
    expect(typeof mergeIdTokenClaims).toBe("function");
    expect(typeof oidcSubjectIdentifier).toBe("function");
    expect([...PROTOCOL_CLAIM_NAMES]).toEqual(["iss", "sub", "aud", "exp", "iat", "at_hash", "nonce", "auth_time"]);
  });

  it("exports the discovery builder and its protected-metadata guard", () => {
    expect(typeof buildOidcDiscoveryDocument).toBe("function");
    expect([...OIDC_PROTECTED_METADATA]).toEqual(["issuer", "jwks_uri", "id_token_signing_alg_values_supported"]);
  });

  it("exports the claims resolver and scope helpers", () => {
    expect(typeof filterOidcClaimsByScope).toBe("function");
    expect(typeof isAutoRecognizedOidcScope).toBe("function");
    expect(OIDC_AUTO_RECOGNIZED_SCOPES).toContain("openid");
    expect(OIDC_SCOPE_CLAIMS).toBeTypeOf("object");
  });

  it("exports the UserInfo handler", () => {
    expect(typeof handleUserInfoRequest).toBe("function");
  });

  it("exports the JWKS/JWT primitives", () => {
    expect(typeof JwtService).toBe("function");
    expect(typeof calculateRsaJwkThumbprint).toBe("function");
  });

  it("exports the OIDC OAuthException bearer-error helpers", () => {
    expect(typeof OAuthException.invalidToken).toBe("function");
    expect(typeof OAuthException.insufficientScope).toBe("function");
  });

  it("exports the default options object", () => {
    expect(DEFAULT_AUTHORIZATION_SERVER_OPTIONS).toBeTypeOf("object");
  });

  it("keeps the OIDC type surface importable", () => {
    // The type-only imports compile only while each name is exported from the
    // package entry; referencing them here in type positions makes a dropped
    // export a compile error for consumers (and this file).
    const _typeWitness: [
      OidcOptions?,
      OidcGetUserClaims?,
      OidcGetIdTokenClaims?,
      OidcIdTokenClaimsContext?,
      OidcDiscoveryMetadata?,
      OidcUserClaims?,
      OidcAddressClaim?,
      FilteredOidcUserClaims?,
      OidcStandardScope?,
      OidcStandardClaim?,
      GrantedOidcScopes?,
      AccessTokenPayload?,
      OidcDiscoveryDocument?,
      IdTokenClaims?,
      IdTokenClaimsInput?,
      UserInfoDependencies?,
      JsonWebKeySet?,
      PublicJsonWebKey?,
      JwtAsymmetricKeyOptions?,
      JwtInterface?,
    ] = [];
    expect(_typeWitness).toEqual([]);
  });

  it("documents the exported OIDC callback types with TSDoc", () => {
    const optionsSource = readFileSync(fileURLToPath(new URL("../../../src/options.ts", import.meta.url)), "utf8");
    for (const symbol of ["OidcGetUserClaims", "OidcGetIdTokenClaims", "OidcIdTokenClaimsContext"]) {
      const declaration = new RegExp(`\\*/\\s*\\nexport (?:type|interface) ${symbol}\\b`);
      expect(declaration.test(optionsSource), `${symbol} must be preceded by a TSDoc comment`).toBe(true);
    }
  });
});
