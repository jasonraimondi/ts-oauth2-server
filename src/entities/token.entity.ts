import { OAuthScope } from "~/entities/scope.entity";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthUser } from "~/entities/user.entity";

export interface OAuthAccessToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  client: OAuthClient;
  user?: OAuthUser;
  scopes: OAuthScope[];
}
