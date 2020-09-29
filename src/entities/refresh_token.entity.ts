import { OAuthAccessToken } from "~/entities/access_token.entity";

export interface OAuthRefreshToken {
  accessToken: OAuthAccessToken;
  refreshToken: string;
  expiresAt: Date;
}
