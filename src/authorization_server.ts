import { OAuthException } from "./exceptions/oauth.exception";
import { GrantIdentifier, GrantInterface } from "./grants/abstract/grant.interface";
import { AuthCodeGrant } from "./grants/auth_code.grant";
import { ClientCredentialsGrant } from "./grants/client_credentials.grant";
import { ImplicitGrant } from "./grants/implicit.grant";
import { PasswordGrant } from "./grants/password.grant";
import { RefreshTokenGrant } from "./grants/refresh_token.grant";
import { OAuthTokenRepository } from "./repositories/access_token.repository";
import { OAuthAuthCodeRepository } from "./repositories/auth_code.repository";
import { OAuthClientRepository } from "./repositories/client.repository";
import { OAuthScopeRepository } from "./repositories/scope.repository";
import { OAuthUserRepository } from "./repositories/user.repository";
import { AuthorizationRequest } from "./requests/authorization.request";
import { RequestInterface } from "./requests/request";
import { ResponseInterface } from "./responses/response";
import { DateInterval } from "./utils/date_interval";
import { JwtInterface } from "./utils/jwt";

export interface AuthorizationServerOptions {
  // @see https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5
  notBeforeLeeway: number;
  requiresPKCE: boolean;
  requiresS256: boolean;
  tokenCID: "id" | "name";
}

type EnableGrantTuple = GrantIdentifier | [GrantIdentifier, DateInterval];

export class AuthorizationServer {
  private readonly enabledGrantTypes: { [key: string]: GrantInterface } = {};
  private readonly grantTypeAccessTokenTTL: { [key: string]: DateInterval } = {};

  private readonly availableGrants: { [key in GrantIdentifier]: GrantInterface };

  private options: AuthorizationServerOptions = {
    requiresPKCE: true,
    requiresS256: false,
    notBeforeLeeway: 0,
    tokenCID: "id",
  };

  constructor(
    private readonly authCodeRepository: OAuthAuthCodeRepository,
    private readonly clientRepository: OAuthClientRepository,
    private readonly tokenRepository: OAuthTokenRepository,
    private readonly scopeRepository: OAuthScopeRepository,
    private readonly userRepository: OAuthUserRepository,
    private readonly jwt: JwtInterface,
    options?: Partial<AuthorizationServerOptions>,
  ) {
    this.setOptions(options);
    const repos: [
      OAuthAuthCodeRepository,
      OAuthClientRepository,
      OAuthTokenRepository,
      OAuthScopeRepository,
      OAuthUserRepository,
      JwtInterface,
    ] = [
      this.authCodeRepository,
      this.clientRepository,
      this.tokenRepository,
      this.scopeRepository,
      this.userRepository,
      this.jwt,
    ];
    this.availableGrants = {
      authorization_code: new AuthCodeGrant(...repos),
      client_credentials: new ClientCredentialsGrant(...repos),
      implicit: new ImplicitGrant(...repos),
      password: new PasswordGrant(...repos),
      refresh_token: new RefreshTokenGrant(...repos),
    };
  }

  setOptions(options: Partial<AuthorizationServerOptions> = {}) {
    this.options = { ...this.options, ...options };
  }

  enableGrantTypes(...grants: EnableGrantTuple[]) {
    grants.forEach(grant => {
      if (typeof grant === "string") return this.enableGrantType(grant);
      const [grantType, accessTokenTTL] = grant;
      this.enableGrantType(grantType, accessTokenTTL);
    });
  }

  enableGrantType(grantType: GrantIdentifier, accessTokenTTL: DateInterval = new DateInterval("1h")): void {
    const grant = this.availableGrants[grantType];
    grant.options = this.options;
    this.enabledGrantTypes[grantType] = grant;
    this.grantTypeAccessTokenTTL[grantType] = accessTokenTTL;
  }

  respondToAccessTokenRequest(req: RequestInterface): Promise<ResponseInterface> {
    for (const grantType of Object.values(this.enabledGrantTypes)) {
      if (!grantType.canRespondToAccessTokenRequest(req)) {
        continue;
      }
      const accessTokenTTL = this.grantTypeAccessTokenTTL[grantType.identifier];
      return grantType.respondToAccessTokenRequest(req, accessTokenTTL);
    }

    throw OAuthException.unsupportedGrantType();
  }

  validateAuthorizationRequest(req: RequestInterface): Promise<AuthorizationRequest> {
    for (const grant of Object.values(this.enabledGrantTypes)) {
      if (grant.canRespondToAuthorizationRequest(req)) {
        return grant.validateAuthorizationRequest(req);
      }
    }

    throw OAuthException.unsupportedGrantType();
  }

  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface> {
    const grant = this.enabledGrantTypes[authorizationRequest.grantTypeId];
    return await grant.completeAuthorizationRequest(authorizationRequest);
  }

  async revoke(req: RequestInterface): Promise<ResponseInterface> {
    const tokenTypeHint = req.body?.["token_type_hint"];
    let response;

    for (const grantType of Object.values(this.enabledGrantTypes)) {
      // As per https://www.rfc-editor.org/rfc/rfc7009#section-2.1, the `token_type_hint` field is optional, and in
      //  case we MUST extend our search across all supported token types.
      if (!tokenTypeHint || grantType.canRespondToRevokeRequest(req)) {
        response = grantType.respondToRevokeRequest(req);
      }
    }

    if (!response) {
      // token_type_hint must have been specified, but none of our grant types handled it
      throw OAuthException.unsupportedGrantType();
    }

    return response;
  }

  /**
   * I am only using this in testing... should it be here?
   * @param grantType
   */
  getGrant(grantType: GrantIdentifier): any {
    return this.availableGrants[grantType];
  }
}
