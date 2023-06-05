import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthToken } from "../entities/token.entity.js";
import { OAuthUser } from "../entities/user.entity.js";

export interface OAuthTokenRepository {
  issueToken(client: OAuthClient, scopes: OAuthScope[], user?: OAuthUser | null): Promise<OAuthToken>;

  issueRefreshToken(accessToken: OAuthToken, client: OAuthClient): Promise<OAuthToken>;

  persist(accessToken: OAuthToken): Promise<void>;

  revoke(accessToken: OAuthToken): Promise<void>;

  revokeDescendantsOf?(authCodeId: string): Promise<void>;

  isRefreshTokenRevoked(refreshToken: OAuthToken): Promise<boolean>;

  getByRefreshToken(refreshTokenToken: string): Promise<OAuthToken>;
}
