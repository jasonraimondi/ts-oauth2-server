import { OAuthClient } from "../entities/client.entity.js";
import { OAuthUser, OAuthUserIdentifier } from "../entities/user.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant.interface.js";

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
