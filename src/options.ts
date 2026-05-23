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
   * Controls how `implicit` grant responses append tokens to the redirect URI.
   * OAuth 2.0 recommends `fragment`; set `query` only for legacy clients.
   */
  implicitRedirectMode: "query" | "fragment";
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
  implicitRedirectMode: "fragment",
};
