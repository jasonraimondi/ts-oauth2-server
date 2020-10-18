import { OAuthClient } from "../entities/client.entity";
import { OAuthUser } from "../entities/user.entity";
import { GrantIdentifier } from "../grants/abstract/grant.interface";

export type ExtraAccessTokenFields = Record<string, string | number | boolean>;

export interface OAuthUserRepository {
  getUserByCredentials(
    identifier: string,
    password?: string,
    grantType?: GrantIdentifier,
    client?: OAuthClient,
  ): Promise<OAuthUser | undefined>;

  extraAccessTokenFields?(user: OAuthUser): Promise<ExtraAccessTokenFields | undefined>;
}
