import { OAuthClient } from "~/entities/client.entity";
import { OAuthUser } from "~/entities/user.entity";
import { GrantIdentifier } from "~/grants/abstract/grant.interface";

export interface OAuthUserRepository {
  getByUserEntityByCredentials(
    identifier: string,
    password?: string,
    grantType?: GrantIdentifier,
    client?: OAuthClient,
  ): Promise<OAuthUser|undefined>;
}
