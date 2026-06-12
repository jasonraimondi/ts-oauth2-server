import type { OidcUserClaims } from "./oidc/claims.js";
import { LoggerService } from "./utils/logger.js";

export type OidcDiscoveryMetadata = Record<string, unknown>;

/**
 * Resolves the end-user's claims for the UserInfo endpoint, keyed by the OIDC
 * `subject` (the `sub` of the access token). Return whatever attributes you hold;
 * the library filters them down to what the granted scopes permit (OIDC Core
 * §5.4) and always overrides `sub` with the canonical subject. Use this hook for
 * scope-derived profile claims — not for claims you want inside the ID token.
 */
export type OidcGetUserClaims = (subject: string) => OidcUserClaims | Promise<OidcUserClaims>;

/**
 * Context passed to {@link OidcGetIdTokenClaims} when an ID token is minted: the
 * canonical `subject`, the `clientId` (the ID token audience), and the granted
 * `scopes`. The index signature allows forward-compatible additions.
 */
export interface OidcIdTokenClaimsContext {
  subject: string;
  clientId: string;
  scopes: string[];
  [context: string]: unknown;
}

/**
 * Adds custom claims (e.g. roles, tenant, acr) to the issued ID token. Reserved
 * protocol claims ({@link OidcIdTokenClaimsContext} aside, the eight names in
 * `PROTOCOL_CLAIM_NAMES`) are stripped from the return value before merging, so
 * this hook can never overwrite `iss`, `sub`, `aud`, `exp`, `iat`, `at_hash`,
 * `nonce`, or `auth_time`, and its output never reaches the JOSE header. A throw
 * surfaces as `invalid_grant`. Use this for protocol-adjacent ID token claims;
 * use {@link OidcGetUserClaims} for scope-derived UserInfo claims.
 */
export type OidcGetIdTokenClaims = (
  context: OidcIdTokenClaimsContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export interface OidcOptions {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
  getUserClaims: OidcGetUserClaims;
  getIdTokenClaims?: OidcGetIdTokenClaims;
  metadata?: OidcDiscoveryMetadata;
}

/**
 * @see https://tsoauth2server.com/configuration/
 */
export interface AuthorizationServerOptions {
  // @see https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5
  notBeforeLeeway: number;
  requiresPKCE: boolean;
  requiresS256: boolean;
  tokenCID: "id" | "name";
  issuer?: string;
  oidc?: OidcOptions;
  scopeDelimiter: string;
  authenticateIntrospect: boolean;
  authenticateRevoke: boolean;
  /**
   * Require the introspecting client to be confidential (registered with a
   * secret) per RFC 7662 §4 ("protected resources ... specifically
   * authorized"). Defaults to `true`. Set to `false` to let public clients
   * introspect (the pre-v5-RC behavior). Has no effect when
   * `authenticateIntrospect` is `false`.
   */
  introspectionRequiresConfidentialClient: boolean;
  /**
   * Controls how `implicit` grant responses append tokens to the redirect URI.
   * OAuth 2.0 recommends `fragment`; set `query` only for legacy clients.
   */
  implicitRedirectMode: "query" | "fragment";
  /**
   * Extend the loopback redirect-URI port exception to the literal
   * `localhost` hostname. The exception itself — a registered
   * `http://127.0.0.1` or `http://[::1]` URI matches any requested port — is
   * spec-mandated (RFC 8252 §7.3) and always on; `localhost` is discretionary
   * (§8.3 recommends clients use the IP literals instead). Defaults to
   * `true`. Set to `false` to require an exact port match for
   * `http://localhost` redirect URIs.
   */
  treatLocalhostAsLoopback: boolean;
  logger?: LoggerService;
  /**
   * If enabled opaque codes are used instead of JWT-based authorization codes.
   */
  useOpaqueAuthorizationCodes?: boolean;
  /**
   * If enabled opaque tokens are used instead of JWT-based refresh tokens.
   */
  useOpaqueRefreshTokens?: boolean;
}

export const DEFAULT_AUTHORIZATION_SERVER_OPTIONS: AuthorizationServerOptions = {
  requiresPKCE: true,
  requiresS256: true,
  notBeforeLeeway: 0,
  tokenCID: "id",
  issuer: undefined,
  scopeDelimiter: " ",
  authenticateIntrospect: true,
  authenticateRevoke: true,
  introspectionRequiresConfidentialClient: true,
  implicitRedirectMode: "fragment",
  treatLocalhostAsLoopback: true,
};
