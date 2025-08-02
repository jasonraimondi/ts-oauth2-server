import { OAuthAuthCode } from "../entities/auth_code.entity.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthUser } from "../entities/user.entity.js";

export interface OAuthAuthCodeRepository {
  /**
   * Fetches an authorization code entity from storage by its identifier.
   * @param authCodeCode The authorization code string
   * @returns Promise resolving to an OAuthAuthCode
   */
  getByIdentifier(authCodeCode: string): Promise<OAuthAuthCode>;

  /**
   * Asynchronously issues a new OAuthAuthCode for the given client, user, and scopes.
   * The returned auth code should not be persisted yet.
   * Note: The `expiresAt` value set here may be replaced by the authorization server
   * using the TTL configured in `enableGrantType`.
   * @param client OAuth client entity
   * @param user OAuth user entity or undefined
   * @param scopes Array of OAuth scopes
   * @returns OAuthAuthCode or Promise resolving to OAuthAuthCode
   */
  issueAuthCode(
    client: OAuthClient,
    user: OAuthUser | undefined,
    scopes: OAuthScope[],
  ): OAuthAuthCode | Promise<OAuthAuthCode>;

  /**
   * Persists an OAuthAuthCode into your storage.
   * @param authCode The authorization code to persist
   * @returns Promise resolving when persistence is complete
   */
  persist(authCode: OAuthAuthCode): Promise<void>;

  /**
   * Checks if an authorization code has been revoked.
   * Return `true` if the code has been manually revoked, otherwise `false`.
   * @param authCodeCode The authorization code string
   * @returns Promise resolving to a boolean indicating revocation status
   */
  isRevoked(authCodeCode: string): Promise<boolean>;

  /**
   * Revokes an authorization code.
   * @param authCodeCode The authorization code string
   * @returns Promise resolving when revocation is complete
   */
  revoke(authCodeCode: string): Promise<void>;
}
