import { OAuthAccessToken } from "~/entities/access_token.entity";
import { OAuthRefreshToken } from "~/entities/refresh_token.entity";

export interface OAuthRefreshTokenRepository {
  createRefreshTokenInstance(accessToken: OAuthAccessToken): Promise<OAuthRefreshToken | undefined>;

  persistRefreshToken(refreshToken: OAuthRefreshToken): Promise<void>;

  isRefreshTokenRevoked(refreshToken: OAuthRefreshToken): Promise<boolean>;

  revokeRefreshToken(refreshToken: OAuthRefreshToken): Promise<void>;

  getRefreshToken(refreshTokenToken: string): Promise<OAuthRefreshToken>;
}
