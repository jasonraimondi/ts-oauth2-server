import { OAuthClient, OAuthScope, OAuthUser } from "../entities";
import { GrantIdentifier } from "../grants/grant.interface";

export class AuthorizationRequest {
  scopes: OAuthScope[] = [];
  isAuthorizationApproved: boolean;
  redirectUri?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;

  constructor(
    public readonly grantTypeId: GrantIdentifier,
    public readonly client: OAuthClient,
    public user?: OAuthUser,
  ) {
    this.scopes = [];
    this.isAuthorizationApproved = false;
  }
}
