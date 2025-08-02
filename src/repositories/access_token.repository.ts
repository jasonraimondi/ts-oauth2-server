import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthToken } from "../entities/token.entity.js";
import { OAuthUser } from "../entities/user.entity.js";

export interface OAuthTokenRepository {
  /**
   * Asynchronously issues a new OAuthToken for the given client, scopes, and optional user.
   * The returned token should not be persisted yet.
   * Note: The `accessTokenExpiresAt` and `refreshTokenExpiresAt` value set here will be replaced
   * by the authorization server using the TTL configured in `enableGrantType`.
   * @param client OAuth client entity
   * @param scopes Array of OAuth scopes
   * @param user Optional OAuth user entity
   * @returns Promise resolving to an OAuthToken
   */
  issueToken(client: OAuthClient, scopes: OAuthScope[], user?: OAuthUser | null): Promise<OAuthToken>;

  /**
   * Enhances an already-persisted OAuthToken with refresh token fields.
   * @param accessToken The persisted access token
   * @param client OAuth client entity
   * @returns Promise resolving to an OAuthToken with refresh token fields
   */
  issueRefreshToken(accessToken: OAuthToken, client: OAuthClient): Promise<OAuthToken>;

  /**
   * Persists an OAuthToken into your storage.
   * @param accessToken The access token to persist
   * @returns Promise resolving when persistence is complete
   */
  persist(accessToken: OAuthToken): Promise<void>;

  /**
   * Revokes an access token. Called when a refresh token is used to reissue an access token.
   * The original access token is revoked, and a new access token is issued.
   * @param accessToken The access token to revoke
   * @returns Promise resolving when revocation is complete
   */
  revoke(accessToken: OAuthToken): Promise<void>;

  /**
   * (Optional) Called by the authorization code grant if the original authorization code is reused.
   * See RFC6749 section 4.1.2 for details.
   * @param authCodeId The authorization code identifier
   * @returns Promise resolving when descendant tokens are revoked
   */
  revokeDescendantsOf?(authCodeId: string): Promise<void>;

  /**
   * Called when an access token is validated by the authorization server.
   * Return `true` if the refresh token has been manually revoked, otherwise `false`.
   * @param refreshToken The refresh token to check
   * @returns Promise resolving to a boolean indicating revocation status
   */
  isRefreshTokenRevoked(refreshToken: OAuthToken): Promise<boolean>;

  /**
   * Fetches a refresh token entity from storage by refresh token string.
   * @param refreshTokenToken The refresh token string
   * @returns Promise resolving to an OAuthToken
   */
  getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken>;

  /**
   * (Optional) Required if using /introspect RFC7662 "OAuth 2.0 Token Introspection"
   * @see https://tsoauth2server.com/docs/getting_started/endpoints#the-introspect-endpoint
   * @param accessTokenToken The access token string
   * @returns Promise resolving to an OAuthToken
   */
  getByAccessToken?(accessTokenToken: string): Promise<OAuthToken>;
}
