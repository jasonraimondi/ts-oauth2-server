import { OAuthClient } from "../entities/client.entity";
import { OAuthScope } from "../entities/scope.entity";
import { OAuthToken } from "../entities/token.entity";
import { OAuthUser } from "../entities/user.entity";

export interface OAuthTokenRepository {
  issueToken(client: OAuthClient, scopes: OAuthScope[], user?: OAuthUser): Promise<OAuthToken>;

  issueRefreshToken(accessToken: OAuthToken): Promise<OAuthToken>;

  persist(accessToken: OAuthToken): Promise<void>;

  revoke(accessTokenToken: OAuthToken): Promise<void>;

  isRefreshTokenRevoked(refreshToken: OAuthToken): Promise<boolean>;

  getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken>;
}
