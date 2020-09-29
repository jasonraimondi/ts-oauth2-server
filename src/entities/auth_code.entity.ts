import { OAuthScope } from "~/entities/scope.entity";
import { OAuthUser } from "~/entities/user.entity";
import { OAuthClient } from "~/entities/client.entity";

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
