import { OAuthAuthCode } from "~/entities/auth_code.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthScope } from "~/entities/scope.entity";
import { OAuthUser } from "~/entities/user.entity";

export interface OAuthAuthCodeRepository {
  getNewAuthCode(client: OAuthClient, user: OAuthUser | undefined, scopes: OAuthScope[]): OAuthAuthCode;

  persistNewAuthCode(authCode: OAuthAuthCode): Promise<void>;

  isAuthCodeRevoked(authCodeCode: string): Promise<boolean>;

  getAuthCodeByIdentifier(authCodeCode: string): Promise<OAuthAuthCode>;

  revokeAuthCode(authCodeCode: string): Promise<void>;
}
