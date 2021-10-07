import { OAuthUserIdentifier } from "./user.entity";

export interface OAuthToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
  clientId: string;
  userId?: OAuthUserIdentifier | null;
  scopeNames: string[];
}
