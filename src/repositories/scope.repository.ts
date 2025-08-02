import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthUserIdentifier } from "../entities/user.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant.interface.js";

export interface OAuthScopeRepository {
  /**
   * Fetches all scope entities from storage by their names.
   * @param scopeNames Array of scope name strings
   * @returns Promise resolving to an array of OAuthScope entities
   */
  getAllByIdentifiers(scopeNames: string[]): Promise<OAuthScope[]>;

  /**
   * Finalizes the set of scopes for a client and user before token or authorization code issuance.
   * This method validates the requested scopes and optionally modifies the set of scopes.
   * @param scopes Array of OAuthScope entities
   * @param identifier The grant type identifier
   * @param client The OAuth client entity
   * @param user_id Optional user identifier
   * @returns Promise resolving to an array of finalized OAuthScope entities
   */
  finalize(
    scopes: OAuthScope[],
    identifier: GrantIdentifier,
    client: OAuthClient,
    user_id?: OAuthUserIdentifier,
  ): Promise<OAuthScope[]>;
}
