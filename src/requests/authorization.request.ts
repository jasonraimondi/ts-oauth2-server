import { CodeChallengeMethod } from "../code_verifiers/verifier.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthUser } from "../entities/user.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { GrantIdentifier } from "../grants/abstract/grant_identifier.js";

/**
 * A validated `/authorize` request, passed between the two halves of the
 * authorization code and implicit flows.
 *
 * {@link AuthorizationServer.validateAuthorizationRequest} returns one. Set
 * `user` to the authenticated end-user and `isAuthorizationApproved` to their
 * consent decision, then pass it to
 * {@link AuthorizationServer.completeAuthorizationRequest}.
 *
 * @example
 * ```ts
 * const authRequest = await authorizationServer.validateAuthorizationRequest(req);
 * authRequest.user = { id: "abc" };
 * authRequest.isAuthorizationApproved = true;
 * const oauthResponse = await authorizationServer.completeAuthorizationRequest(authRequest);
 * ```
 *
 * @see https://tsoauth2server.com/docs/endpoints/authorize
 */
export class AuthorizationRequest {
  scopes: OAuthScope[] = [];
  isAuthorizationApproved: boolean;
  redirectUri: string | undefined;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: CodeChallengeMethod;

  /**
   * OIDC `nonce`, bound into the issued ID token to mitigate replay. Only parsed
   * for openid-scoped authorization requests; otherwise always undefined.
   */
  nonce?: string;
  /**
   * OIDC end-user authentication time (epoch seconds). Consumer-supplied after
   * the user authenticates; required when `maxAge` is present on an openid-scoped request.
   */
  authTime?: number;
  /**
   * OIDC `max_age` (seconds). Parsed from openid-scoped requests; enforced for freshness.
   */
  maxAge?: number;

  // Parsed but inert OIDC authorization parameters for openid-scoped requests
  // (exposed for the consumer, not acted on by the library).
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
