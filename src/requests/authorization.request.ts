import { OAuthClient, OAuthScope, OAuthUser } from "../entities";
import { GrantTypeIdentifiers } from "../grants/interfaces";

export class AuthorizationRequest {
  scopes: OAuthScope[] = [];
  isAuthorizationApproved: boolean;
  redirectUri?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;

  constructor(
    public readonly grantTypeId: GrantTypeIdentifiers,
    public readonly client: OAuthClient,
    public user?: OAuthUser,
  ) {
    this.scopes = [];
    this.isAuthorizationApproved = false;
  }
}
