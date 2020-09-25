import { OAuthUser } from "../entities";

export interface OAuthUserRepository {
  getByUserIdentifier(userIdentifier: string): Promise<OAuthUser>;
}
