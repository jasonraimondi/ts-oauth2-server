import { CodeChallengeMethod } from "../code_verifiers/verifier";
import { OAuthClient } from "./client.entity";
import { OAuthScope } from "./scope.entity";
import { OAuthUser } from "./user.entity";

export interface OAuthAuthCode {
  code: string;
  redirectUri?: string | null;
  codeChallenge?: string | null;
  codeChallengeMethod?: CodeChallengeMethod | null;
  expiresAt: Date;
  user?: OAuthUser | null;
  client: OAuthClient;
  scopes: OAuthScope[];
}
