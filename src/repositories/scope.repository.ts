import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthUserIdentifier } from "../entities/user.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant.interface.js";

export interface OAuthScopeRepository {
  getAllByIdentifiers(scopeNames: string[]): Promise<OAuthScope[]>;

  finalize(
    scopes: OAuthScope[],
    identifier: GrantIdentifier,
    client: OAuthClient,
    user_id?: OAuthUserIdentifier,
  ): Promise<OAuthScope[]>;
}
