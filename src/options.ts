import type { OidcUserClaims } from "./oidc/claims.js";
import { LoggerService } from "./utils/logger.js";

export type OidcDiscoveryMetadata = Record<string, unknown>;
export type OidcGetUserClaims = (subject: string) => OidcUserClaims | Promise<OidcUserClaims>;

export interface OidcIdTokenClaimsContext {
  subject: string;
  clientId: string;
  scopes: string[];
  [context: string]: unknown;
}

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
