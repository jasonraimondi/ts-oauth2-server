import { OAuthAuthCode, OAuthClient, OAuthScope, OAuthUser } from "../entities";

export interface OAuthAuthCodeRepository {
  getNewAuthCode(client: OAuthClient, user: OAuthUser | undefined, scopes: OAuthScope[]): OAuthAuthCode;

  persistNewAuthCode(authCode: OAuthAuthCode): Promise<void>;

  isAuthCodeRevoked(authCodeCode: string): Promise<boolean>;

  getAuthCodeByIdentifier(authCodeCode: string): Promise<OAuthAuthCode>;

  revokeAuthCode(authCodeCode: string): Promise<void>;
}
