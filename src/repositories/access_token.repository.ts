import { OAuthAccessToken, OAuthClient, OAuthScope } from "../entities";

export interface OAuthAccessTokenRepository {
  getNewToken(client: OAuthClient, scopes: OAuthScope[], userId: string | undefined): Promise<OAuthAccessToken>;

  persistNewAccessToken(accessToken: OAuthAccessToken): Promise<void>;
}
