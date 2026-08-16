import type { OidcUserClaims } from "./oidc/claims.js";
import { LoggerService } from "./utils/logger.js";

/**
 * Extra metadata to merge into the discovery document. The three protected
 * fields — `issuer`, `jwks_uri`, and `id_token_signing_alg_values_supported` —
 * are rejected at construction, so an override cannot weaken the advertised
 * security posture.
 */
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

/**
 * The OIDC layer configuration. Set it alongside a top-level `issuer` to turn
 * OIDC on, and supply a {@link JwtService} with an RS256 key. Without this
 * block the non-OIDC flows are unchanged.
 *
 * The four endpoint URLs are advertised in the discovery document. They
 * describe the routes you have wired, so the library does not derive them.
 *
 * @see https://tsoauth2server.com/docs/oidc/getting_started
 */
export interface OidcOptions {
  /** The `/authorize` URL to advertise. */
  authorizationEndpoint: string;

  /** The `/token` URL to advertise. */
  tokenEndpoint: string;

  /** The `/userinfo` URL to advertise. */
  userinfoEndpoint: string;

  /** The JWKS URL to advertise, where {@link AuthorizationServer.jwks} is served. */
  jwksUri: string;

  /** The Claims Resolver, which supplies the end-user attributes UserInfo returns. */
  getUserClaims: OidcGetUserClaims;

  /** Adds custom claims to the ID token. */
  getIdTokenClaims?: OidcGetIdTokenClaims;

  /** Extra fields for the discovery document. */
  metadata?: OidcDiscoveryMetadata;
}

/**
 * Configuration for the {@link AuthorizationServer}. Every field is optional at
 * the constructor, which merges what you pass over
 * {@link DEFAULT_AUTHORIZATION_SERVER_OPTIONS}.
 *
 * @see https://tsoauth2server.com/docs/authorization_server/configuration
 */
export interface AuthorizationServerOptions {
  /**
   * Seconds to backdate the `nbf` claim of an issued token, to absorb clock
   * skew between your server and the resource servers.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5
   */
  notBeforeLeeway: number;

  /** Require PKCE on the authorization code grant (RFC 7636). Defaults to `true`. */
  requiresPKCE: boolean;

  /**
   * Require the `S256` code challenge method, rejecting `plain`. Defaults to
   * `true`. Has no effect when `requiresPKCE` is `false`.
   */
  requiresS256: boolean;

  /** Which client field to put in the `cid` claim of an access token. Defaults to `id`. */
  tokenCID: "id" | "name";

  /**
   * The authorization server's identity: the `iss` claim of every issued token,
   * and the `issuer` of the discovery document. Required for OIDC, where it
   * must be an `https` URL with no query or fragment.
   */
  issuer?: string;

  /** The OIDC layer configuration. Setting it turns OIDC on. */
  oidc?: OidcOptions;

  /** What separates scopes in a `scope` parameter. Defaults to a space. */
  scopeDelimiter: string;

  /** Require the introspecting client to authenticate. Defaults to `true`. */
  authenticateIntrospect: boolean;

  /** Require the revoking client to authenticate. Defaults to `true`. */
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

/**
 * The option values the {@link AuthorizationServer} constructor uses for every
 * option you do not set. PKCE is required with the `S256` method only,
 * introspection and revocation require an authenticated client, introspection
 * additionally requires a Confidential Client, and the implicit grant returns
 * its token in the redirect fragment.
 *
 * @see https://tsoauth2server.com/docs/authorization_server/configuration
 */
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
};
