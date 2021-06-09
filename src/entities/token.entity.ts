import { OAuthClient } from "./client.entity";
import { OAuthScope } from "./scope.entity";
import { OAuthUser } from "./user.entity";

export interface OAuthToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
  client: OAuthClient;
  user?: OAuthUser | null;
  scopes: OAuthScope[];
}
