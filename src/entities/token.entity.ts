import { OAuthClient } from "./client.entity.js";
import { OAuthScope } from "./scope.entity.js";
import { OAuthUser } from "./user.entity.js";

/**
 * A persisted access token, together with the refresh token issued beside it.
 *
 * Your {@link OAuthTokenRepository} creates, stores, and returns entities of
 * this shape. The token strings here are identifiers, not the credentials the
 * client receives: the server signs a JWT that carries `accessToken` as its
 * `jti` claim, and revocation and introspection look the row up again by these
 * identifiers.
 *
 * @see https://tsoauth2server.com/docs/getting_started/entities
 */
export interface OAuthToken {
  /** Unique access token identifier. Becomes the `jti` claim of the issued JWT. */
  accessToken: string;

  /**
   * When the access token expires. The server overwrites the value your
   * repository sets with the TTL configured for the grant.
   */
  accessTokenExpiresAt: Date;

  /**
   * Unique refresh token identifier, set by
   * {@link OAuthTokenRepository.issueRefreshToken}. Absent until a refresh
   * token is issued.
   */
  refreshToken?: string | null;

  /**
   * When the refresh token expires. The server overwrites the value your
   * repository sets with the TTL configured for the grant.
   */
  refreshTokenExpiresAt?: Date | null;

  /** The client the token was issued to. */
  client: OAuthClient;

  /** The end-user the token was issued for. Absent for the client credentials grant. */
  user?: OAuthUser | null;

  /** The Granted Scopes — the set {@link OAuthScopeRepository.finalize} returned. */
  scopes: OAuthScope[];

  /**
   * The identifier of the authorization code this token descends from. The
   * authorization code grant uses it to revoke every descendant token when a
   * code is redeemed twice (RFC 6749 §4.1.2).
   */
  originatingAuthCodeId?: string;
}
