import { OAuthUser } from "~/entities/user.entity";

export interface OAuthUserRepository {
  getByUserIdentifier(userIdentifier: string): Promise<OAuthUser>;
}
