/**
 * A framework-agnostic OAuth 2.0 authorization server for Node.js, with an
 * OpenID Connect layer on top of the authorization code grant.
 *
 * The {@link AuthorizationServer} orchestrates the flows. You supply the
 * storage: the library defines repository interfaces
 * ({@link OAuthClientRepository}, {@link OAuthTokenRepository},
 * {@link OAuthScopeRepository}, and — per grant —
 * {@link OAuthAuthCodeRepository} and {@link OAuthUserRepository}), and you
 * implement them against your database.
 *
 * The server has no HTTP layer. Its endpoint methods take a
 * {@link RequestInterface} and return a {@link ResponseInterface}. Import one
 * of the adapters (`@jmondi/oauth2-server/vanilla`, `/express`, `/fastify`,
 * `/h3`) to convert your framework's objects, or write your own.
 *
 * The constructor enables the `client_credentials` and `refresh_token` grants.
 * Enable the other grants with {@link AuthorizationServer.enableGrantType}.
 * PKCE is required by default, with the `S256` challenge method only.
 *
 * These specifications are implemented: RFC 6749, RFC 6750, RFC 7009,
 * RFC 7519, RFC 7636, RFC 7662, RFC 8693, RFC 9068, and OpenID Connect
 * Core 1.0 with Discovery 1.0.
 *
 * Requires Node 22 or later.
 *
 * @example
 * ```ts
 * import { AuthorizationServer } from "@jmondi/oauth2-server";
 * import { handleExpressError, handleExpressResponse } from "@jmondi/oauth2-server/express";
 *
 * const authorizationServer = new AuthorizationServer(
 *   clientRepository,
 *   accessTokenRepository,
 *   scopeRepository,
 *   "secret-key",
 * );
 *
 * app.post("/token", async (req, res) => {
 *   try {
 *     const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
 *     return handleExpressResponse(res, oauthResponse);
 *   } catch (e) {
 *     handleExpressError(e, res);
 *   }
 * });
 * ```
 *
 * @see https://tsoauth2server.com/
 * @module
 */

export * from "./authorization_server.js";
export * from "./entities/auth_code.entity.js";
export * from "./entities/client.entity.js";
export * from "./entities/scope.entity.js";
export * from "./entities/token.entity.js";
export * from "./entities/user.entity.js";
export * from "./exceptions/oauth.exception.js";
export * from "./oidc/access_token_verifier.js";
export * from "./oidc/claims.js";
export * from "./oidc/discovery.js";
export * from "./oidc/id_token.js";
export * from "./oidc/subject.js";
export * from "./oidc/userinfo.js";
export { DEFAULT_AUTHORIZATION_SERVER_OPTIONS } from "./options.js";
export type {
  OidcDiscoveryMetadata,
  OidcGetIdTokenClaims,
  OidcGetUserClaims,
  OidcIdTokenClaimsContext,
  OidcOptions,
} from "./options.js";
export * from "./repositories/access_token.repository.js";
export * from "./repositories/auth_code.repository.js";
export * from "./repositories/client.repository.js";
export * from "./repositories/scope.repository.js";
export * from "./repositories/user.repository.js";
export * from "./requests/authorization.request.js";
export * from "./requests/request.js";
export * from "./responses/response.js";
export * from "./code_verifiers/verifier.js";
export * from "./utils/base64.js";
export * from "./utils/date_interval.js";
export * from "./utils/errors.js";
export * from "./utils/jwt.js";
export * from "./utils/logger.js";
export * from "./utils/scopes.js";
export * from "./utils/time.js";
export * from "./utils/token.js";

/**
 * These should probably not be exported...
 */
export * from "./grants/auth_code.grant.js";
export * from "./grants/client_credentials.grant.js";
export * from "./grants/implicit.grant.js";
export * from "./grants/password.grant.js";
export * from "./grants/refresh_token.grant.js";
export * from "./grants/token_exchange.grant.js";
export * from "./grants/abstract/abstract.grant.js";
export * from "./grants/abstract/abstract_authorized.grant.js";
export * from "./grants/abstract/grant.interface.js";
