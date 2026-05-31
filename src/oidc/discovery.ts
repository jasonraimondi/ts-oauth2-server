import type { OidcOptions } from "../options.js";
import { OIDC_AUTO_RECOGNIZED_SCOPES } from "./claims.js";

export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  scopes_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  code_challenge_methods_supported: string[];
  [metadata: string]: unknown;
}

/**
 * Discovery metadata a consumer override may never set: weakening any of these
 * would silently degrade the server's advertised security posture. The
 * construction guard rejects them up front; the builder also re-applies them
 * last so they win regardless.
 */
export const OIDC_PROTECTED_METADATA = ["issuer", "jwks_uri", "id_token_signing_alg_values_supported"] as const;

/**
 * Assembles the `.well-known/openid-configuration` document. Capability fields
 * are auto-derived from the v1 feature set (RS256, code-only, public subjects,
 * S256 PKCE); endpoint URLs come from the consumer's OIDC config. v1 advertises
 * RS256 only — a single RSA key cannot satisfy OIDC Discovery §3 otherwise.
 */
export function buildOidcDiscoveryDocument(issuer: string, oidc: OidcOptions): OidcDiscoveryDocument {
  const base: OidcDiscoveryDocument = {
    issuer,
    authorization_endpoint: oidc.authorizationEndpoint,
    token_endpoint: oidc.tokenEndpoint,
    userinfo_endpoint: oidc.userinfoEndpoint,
    jwks_uri: oidc.jwksUri,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: [...OIDC_AUTO_RECOGNIZED_SCOPES],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
    code_challenge_methods_supported: ["S256"],
  };

  return {
    ...base,
    ...(oidc.metadata ?? {}),
    issuer,
    jwks_uri: oidc.jwksUri,
    id_token_signing_alg_values_supported: ["RS256"],
  };
}
