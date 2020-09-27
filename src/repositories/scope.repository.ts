import { OAuthClient, OAuthScope } from "../entities";
import { GrantIdentifier } from "../grants/grant.interface";

export interface OAuthScopeRepository {
  getScopesByIdentifier(scopeNames: string[]): Promise<OAuthScope[]>;
  finalizeScopes(
    scopes: OAuthScope[],
    identifier: GrantIdentifier,
    client: OAuthClient,
    user_id?: string,
  ): Promise<OAuthScope[]>;
}
