import { OAuthClient } from "../entities/client.entity";
import { OAuthUser, OAuthUserIdentifier } from "../entities/user.entity";
import { GrantIdentifier } from "../grants/abstract/grant.interface";

export interface OAuthUserRepository {
  getUserByCredentials(
    identifier: OAuthUserIdentifier,
    password?: string,
    grantType?: GrantIdentifier,
    client?: OAuthClient,
  ): Promise<OAuthUser | undefined>;
}
