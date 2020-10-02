import { OAuthScope } from "~/entities/scope.entity";
import { OAuthUser } from "~/entities/user.entity";
import { OAuthClient } from "~/entities/client.entity";

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
