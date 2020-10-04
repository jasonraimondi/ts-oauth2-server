import { OAuthClient } from "./client.entity";
import { OAuthScope } from "./scope.entity";
import { OAuthUser } from "./user.entity";

export interface OAuthToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  client: OAuthClient;
  user?: OAuthUser;
  scopes: OAuthScope[];
}
