import { OAuthAccessToken } from "~/entities/access_token.entity";
import { OAuthRefreshToken } from "~/entities/refresh_token.entity";

export interface OAuthRefreshTokenRepository {
  getNewToken(accessToken: OAuthAccessToken): Promise<OAuthRefreshToken | undefined>;

  persistNewRefreshToken(refreshToken: OAuthRefreshToken): Promise<void>;

  isRefreshTokenRevoked(refreshTokenToken: string): Promise<boolean>;
}
