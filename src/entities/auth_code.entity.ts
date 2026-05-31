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
  /**
   * OIDC `nonce` from the authorization request. Opaque-code repositories must
   * persist this field or OIDC nonce binding is lost across the round trip.
   */
  nonce?: string | null;
  /**
   * OIDC end-user authentication time (epoch seconds), supplied by the consumer
   * on the authorization request. Required when `max_age` was requested.
   */
  authTime?: number | null;
  /**
   * OIDC `max_age` (seconds) from the authorization request, used to enforce
   * authentication freshness at token time.
   */
  maxAge?: number | null;
}
