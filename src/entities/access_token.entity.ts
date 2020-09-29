import { OAuthScope } from "~/entities/scope.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthUser } from "~/entities/user.entity";
import { OAuthRefreshToken } from "~/entities/refresh_token.entity";

export interface OAuthAccessToken {
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
