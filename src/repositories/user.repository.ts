import { OAuthClient } from "../entities/client.entity.js";
import { OAuthUser, OAuthUserIdentifier } from "../entities/user.entity.js";
import { GrantIdentifier } from "../grants/abstract/grant.interface.js";

export interface OAuthUserRepository {
  getUserByCredentials(
    identifier: OAuthUserIdentifier,
    password?: string,
    grantType?: GrantIdentifier,
    client?: OAuthClient,
  ): Promise<OAuthUser | undefined>;
}
