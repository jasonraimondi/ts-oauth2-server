import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthUserIdentifier } from "../entities/user.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant_identifier.js";

/**
 * Storage for scopes, and the place where Requested Scopes become Granted
 * Scopes. Required by the {@link AuthorizationServer} constructor.
 *
 * {@link OAuthScopeRepository.finalize | finalize} is the authorization hook:
 * every later decision — the `scope` field of the token response, the claims
 * UserInfo returns, and whether an ID token is issued — reads the set it
 * returns, not the set the client asked for.
 *
 * @see https://tsoauth2server.com/docs/getting_started/repositories
 */
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
