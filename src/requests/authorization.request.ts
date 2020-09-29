import { OAuthClient } from "~/entities/client.entity";
import { OAuthScope } from "~/entities/scope.entity";
import { OAuthUser } from "~/entities/user.entity";
import { GrantIdentifier } from "~/grants/grant.interface";

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
