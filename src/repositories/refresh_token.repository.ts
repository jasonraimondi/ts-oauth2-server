import { OAuthAccessToken, OAuthRefreshToken } from "../entities";

export interface OAuthRefreshTokenRepository {
  getNewToken(accessToken: OAuthAccessToken): Promise<OAuthRefreshToken | undefined>;

  persistNewRefreshToken(refreshToken: OAuthRefreshToken): Promise<void>;
}
