import { OAuthClient } from "./client.entity";
import { OAuthScope } from "./scope.entity";
import { OAuthUser } from "./user.entity";

export interface OAuthAuthCode {
  code: string;
  redirectUri?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: Date;
  user?: OAuthUser;
  client: OAuthClient;
  scopes: OAuthScope[];
}
