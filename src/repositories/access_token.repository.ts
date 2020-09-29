import { OAuthAccessToken } from "~/entities/access_token.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthScope } from "~/entities/scope.entity";

export interface OAuthAccessTokenRepository {
  getNewToken(client: OAuthClient, scopes: OAuthScope[], userId: string | undefined): Promise<OAuthAccessToken>;

  persistNewAccessToken(accessToken: OAuthAccessToken): Promise<void>;

  revokeAccessToken(accessTokenToken: OAuthAccessToken): Promise<void>;
}
