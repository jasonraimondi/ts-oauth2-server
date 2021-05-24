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
  requiresPKCE: boolean;
}

type EnableGrantTuple = GrantIdentifier | [GrantIdentifier, DateInterval];

export class AuthorizationServer {
  private readonly enabledGrantTypes: { [key: string]: GrantInterface } = {};
  private readonly grantTypeAccessTokenTTL: { [key: string]: DateInterval } = {};

  private readonly availableGrants: { [key in GrantIdentifier]: GrantInterface } = {
    authorization_code: new AuthCodeGrant(
      this.authCodeRepository,
      this.clientRepository,
      this.tokenRepository,
      this.scopeRepository,
      this.userRepository,
      this.jwt,
    ),
    client_credentials: new ClientCredentialsGrant(
      this.authCodeRepository,
      this.clientRepository,
      this.tokenRepository,
      this.scopeRepository,
      this.userRepository,
      this.jwt,
    ),
    implicit: new ImplicitGrant(
      this.authCodeRepository,
      this.clientRepository,
      this.tokenRepository,
      this.scopeRepository,
      this.userRepository,
      this.jwt,
    ),
    password: new PasswordGrant(
      this.authCodeRepository,
      this.clientRepository,
      this.tokenRepository,
      this.scopeRepository,
      this.userRepository,
      this.jwt,
    ),
    refresh_token: new RefreshTokenGrant(
      this.authCodeRepository,
      this.clientRepository,
      this.tokenRepository,
      this.scopeRepository,
      this.userRepository,
      this.jwt,
    ),
  };

  private options: AuthorizationServerOptions = {
    requiresPKCE: true,
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
  }

  setOptions(options: Partial<AuthorizationServerOptions> = {}) {
    this.options = { ...this.options, ...options, };
  }

  enableGrantTypes(...grants: EnableGrantTuple[]) {
    grants.forEach((grant) => {
      if (typeof grant === "string") return this.enableGrantType(grant);
      const [grantType, accessTokenTTL] = grant;
      this.enableGrantType(grantType, accessTokenTTL)
    })
  }

  enableGrantType(grantType: GrantIdentifier, accessTokenTTL: DateInterval = new DateInterval("1h")): void {
    const grant = this.availableGrants[grantType];
    grant.options = this.options;
    this.enabledGrantTypes[grantType] = grant;
    this.grantTypeAccessTokenTTL[grantType] = accessTokenTTL;
  }

  respondToAccessTokenRequest(req: RequestInterface, res: ResponseInterface): Promise<ResponseInterface> {
    for (const grantType of Object.values(this.enabledGrantTypes)) {
      if (!grantType.canRespondToAccessTokenRequest(req)) {
        continue;
      }
      const accessTokenTTL = this.grantTypeAccessTokenTTL[grantType.identifier];
      return grantType.respondToAccessTokenRequest(req, res, accessTokenTTL);
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

  /**
   * I am only using this in testing... should it be here?
   * @param grantType
   */
  getGrant(grantType: GrantIdentifier): any {
    return this.availableGrants[grantType];
  }
}
