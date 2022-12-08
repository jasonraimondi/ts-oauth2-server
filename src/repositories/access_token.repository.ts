import { OAuthClient } from "../entities/client.entity";
import { OAuthScope } from "../entities/scope.entity";
import { OAuthToken } from "../entities/token.entity";
import { OAuthUser } from "../entities/user.entity";

export interface OAuthTokenRepository {
  issueToken(client: OAuthClient, scopes: OAuthScope[], user?: OAuthUser | null): Promise<OAuthToken>;

  issueRefreshToken(accessToken: OAuthToken, client: OAuthClient): Promise<OAuthToken>;

  persist(accessToken: OAuthToken): Promise<void>;

  revoke(accessToken: OAuthToken): Promise<void>;

  isRefreshTokenRevoked(refreshToken: OAuthToken): Promise<boolean>;

  getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken>;
}
