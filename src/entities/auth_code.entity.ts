import { CodeChallengeMethod } from "../code_verifiers/verifier.js";
import { OAuthClient } from "./client.entity.js";
import { OAuthScope } from "./scope.entity.js";
import { OAuthUser } from "./user.entity.js";

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
