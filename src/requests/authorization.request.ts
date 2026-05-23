import { CodeChallengeMethod } from "../code_verifiers/verifier.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthUser } from "../entities/user.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { GrantIdentifier } from "../grants/abstract/grant_identifier.js";

export class AuthorizationRequest {
  scopes: OAuthScope[] = [];
  isAuthorizationApproved: boolean;
  redirectUri: string | undefined;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: CodeChallengeMethod;

  /**
   * OIDC `nonce`, bound into the issued ID token to mitigate replay. Only parsed
   * when OIDC is enabled; otherwise always undefined.
   */
  nonce?: string;
  /**
   * OIDC end-user authentication time (epoch seconds). Consumer-supplied after
   * the user authenticates; required when `maxAge` is present.
   */
  authTime?: number;
  /**
   * OIDC `max_age` (seconds). Parsed from the request; enforced for freshness.
   */
  maxAge?: number;

  // Parsed but inert OIDC authorization parameters (exposed for the consumer,
  // not acted on by the library).
  prompt?: string;
  loginHint?: string;
  display?: string;
  uiLocales?: string;
  acrValues?: string;
  idTokenHint?: string;

  constructor(
    public readonly grantTypeId: GrantIdentifier,
    public readonly client: OAuthClient,
    redirectUri?: string,
    public user?: OAuthUser,
    public audience?: string[] | string | null,
  ) {
    this.scopes = [];
    this.isAuthorizationApproved = false;
    this.redirectUri = redirectUri ?? client.redirectUris[0];
    if (!this.redirectUri) throw OAuthException.badRequest("Unknown redirect_uri");
  }
}
