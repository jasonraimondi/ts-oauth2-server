import { CodeChallengeMethod } from "../code_verifiers/verifier.js";
import { OAuthClient } from "./client.entity.js";
import { OAuthScope } from "./scope.entity.js";
import { OAuthUser } from "./user.entity.js";

/**
 * A persisted authorization code — the short-lived artifact the authorization
 * code grant issues at `/authorize` and redeems at `/token`.
 *
 * Your {@link OAuthAuthCodeRepository} creates, stores, and returns entities of
 * this shape. The row is the sole record when
 * `useOpaqueAuthorizationCodes` is enabled, because an Opaque Authorization
 * Code rebuilds its payload from here. A repository that drops a field loses it
 * across the authorize-to-token round trip.
 *
 * @see https://tsoauth2server.com/docs/getting_started/entities
 */
export interface OAuthAuthCode {
  /** Unique authorization code identifier. */
  code: string;

  /** The redirect URI of the authorization request. The token request must repeat it. */
  redirectUri?: string | null;

  /** The PKCE code challenge from the authorization request (RFC 7636). */
  codeChallenge?: string | null;

  /** How the PKCE code challenge was derived. `S256` unless `requiresS256` is disabled. */
  codeChallengeMethod?: CodeChallengeMethod | null;

  /**
   * When the code expires. The server sets this to 15 minutes from issuance
   * before it calls {@link OAuthAuthCodeRepository.persist}.
   */
  expiresAt: Date;

  /** The end-user who approved the authorization request. */
  user?: OAuthUser | null;

  /** The client the code was issued to. */
  client: OAuthClient;

  /** The Granted Scopes — the set {@link OAuthScopeRepository.finalize} returned. */
  scopes: OAuthScope[];
  /**
   * OIDC `nonce` from the authorization request. Opaque-code repositories must
   * persist this field or OIDC nonce binding is lost across the round trip.
   */
  nonce?: string | null;
  /**
   * OIDC end-user authentication time (epoch seconds), supplied by the consumer
   * on the authorization request. Required when `max_age` was requested.
   */
  authTime?: number | null;
  /**
   * OIDC `max_age` (seconds) from the authorization request, used to enforce
   * authentication freshness at token time.
   */
  maxAge?: number | null;
}
