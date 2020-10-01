import { OAuthAccessToken } from "~/entities/token.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthScope } from "~/entities/scope.entity";
import { OAuthUser } from "~/entities/user.entity";

export interface OAuthAccessTokenRepository {
  getNewToken(client: OAuthClient, scopes: OAuthScope[], user?: OAuthUser): Promise<OAuthAccessToken>;

  persistNewToken(accessToken: OAuthAccessToken): Promise<void>;

  revokeToken(accessTokenToken: OAuthAccessToken): Promise<void>;

  createRefreshTokenInstance(): Promise<[string, Date]>;

  isRefreshTokenRevoked(refreshToken: OAuthAccessToken): Promise<boolean>;

  getRefreshToken(refreshTokenToken: string): Promise<OAuthAccessToken>;
}
