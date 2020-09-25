import { OAuthUser } from "./user.entity";
import { OAuthClient } from "./client.entity";
import { OAuthScope } from "./scope.entity";

export interface OAuthAuthCode {
  token: string;
  user?: OAuthUser;
  userId?: string;
  client: OAuthClient;
  clientId: string;
  redirectUri?: string; // @todo check why refresh token here
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: Date;
  scopes: OAuthScope[];
}
