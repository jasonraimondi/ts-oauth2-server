import { LoggerService } from "./utils/logger.js";

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
  scopeDelimiter: string;
  authenticateIntrospect: boolean;
  authenticateRevoke: boolean;
  /**
   * Controls how `implicit` grant responses append tokens to the redirect URI.
   * OAuth 2.0 recommends `fragment`; `query` is preserved for backwards compatibility.
   * The default will change to `fragment` in the next major version.
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
  implicitRedirectMode: "query",
};
