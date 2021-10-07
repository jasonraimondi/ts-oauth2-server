import { CodeChallengeMethod } from "../code_verifiers/verifier";
import { OAuthUserIdentifier } from "./user.entity";

export interface OAuthAuthCode {
  code: string;
  redirectUri?: string | null;
  codeChallenge?: string | null;
  codeChallengeMethod?: CodeChallengeMethod | null;
  expiresAt: Date;
  userId?: OAuthUserIdentifier | null;
  clientId: string;
  scopeNames: string[];
}
