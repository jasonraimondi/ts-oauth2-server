import { OAuthClient, OAuthScope } from "../entities";
import { GrantTypeIdentifiers } from "../grants/interfaces";

export interface OAuthScopeRepository {
  getScopesByIdentifier(scopeNames: string[]): Promise<OAuthScope[]>;
  finalizeScopes(
    scopes: OAuthScope[],
    identifier: GrantTypeIdentifiers,
    client: OAuthClient,
    user_id?: string,
  ): Promise<OAuthScope[]>;
}
