import { OAuthClient } from "../entities/client.entity.js";
import { OAuthUser, OAuthUserIdentifier } from "../entities/user.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant_identifier.js";

/**
 * Storage for end-users. Required by the `authorization_code` and `password`
 * grants, and passed to {@link AuthorizationServer.enableGrantType} when you
 * enable either one.
 *
 * The password grant calls it with the credentials from the token request, so
 * that is where you verify a password. The authorization code grant calls it
 * with the identifier alone, to load the user a stored code belongs to.
 *
 * @see https://tsoauth2server.com/docs/getting_started/repositories
 */
export interface OAuthUserRepository {
  /**
   * Fetches a user entity from storage by their identifier and optional password.
   * The grant type and client may also be provided for additional validation.
   * @param identifier The user identifier
   * @param password Optional password for credential validation
   * @param grantType Optional grant type identifier
   * @param client Optional OAuth client entity
   * @returns Promise resolving to an OAuthUser or undefined if not found
   */
  getUserByCredentials(
    identifier: OAuthUserIdentifier,
    password?: string,
    grantType?: GrantIdentifier,
    client?: OAuthClient,
  ): Promise<OAuthUser | undefined>;
}
