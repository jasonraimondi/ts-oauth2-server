import { OAuthUser } from "./user.entity";
import { OAuthRefreshToken } from "./refresh_token.entity";
import { OAuthClient } from "./client.entity";
import { OAuthScope } from "./scope.entity";

export interface OAuthAccessToken {
  toJWT: object; // @todo refactor
  token: string;
  client: OAuthClient;
  clientId: string;
  user?: OAuthUser;
  userId?: string;
  refreshToken?: OAuthRefreshToken;
  refreshTokenToken?: string;
  expiresAt: Date;
  scopes?: OAuthScope[];
}
