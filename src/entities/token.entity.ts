import { OAuthClient } from "./client.entity.js";
import { OAuthScope } from "./scope.entity.js";
import { OAuthUser } from "./user.entity.js";

export interface OAuthToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
  client: OAuthClient;
  user?: OAuthUser | null;
  scopes: OAuthScope[];
  originatingAuthCodeId?: string;
}
