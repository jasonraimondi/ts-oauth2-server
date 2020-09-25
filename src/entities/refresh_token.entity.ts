import { OAuthAccessToken } from "./access_token.entity";

export interface OAuthRefreshToken {
  refreshToken: string;
  expiresAt: Date;
  accessToken?: OAuthAccessToken;
  accessTokenToken?: string;
}
