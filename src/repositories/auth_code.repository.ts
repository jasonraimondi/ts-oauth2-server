import { OAuthAuthCode } from "../entities/auth_code.entity.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthUser } from "../entities/user.entity.js";

export interface OAuthAuthCodeRepository {
  getByIdentifier(authCodeCode: string): Promise<OAuthAuthCode>;

  issueAuthCode(
    client: OAuthClient,
    user: OAuthUser | undefined,
    scopes: OAuthScope[],
  ): OAuthAuthCode | Promise<OAuthAuthCode>;

  persist(authCode: OAuthAuthCode): Promise<void>;

  isRevoked(authCodeCode: string): Promise<boolean>;
  revoke(authCodeCode: string): Promise<void>;
}
