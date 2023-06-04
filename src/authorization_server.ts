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
import { JwtInterface, JwtService } from "./utils/jwt";

export interface AuthorizationServerOptions {
  // @see https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5
  notBeforeLeeway: number;
  requiresPKCE: boolean;
  requiresS256: boolean;
  tokenCID: "id" | "name";
}

export type EnableableGrants =
  | "client_credentials"
  | "refresh_token"
  | "implicit"
  | {
      grant: "authorization_code";
      authCodeRepository: OAuthAuthCodeRepository;
      userRepository: OAuthUserRepository;
    }
  | {
      grant: "password";
      userRepository: OAuthUserRepository;
    };
export type EnableGrant = EnableableGrants | [EnableableGrants, DateInterval];

export class AuthorizationServer {
  private readonly availableGrants: {
    authorization_code?: AuthCodeGrant;
    password?: PasswordGrant;
    implicit?: ImplicitGrant;
    client_credentials: ClientCredentialsGrant;
    refresh_token: RefreshTokenGrant;
  };
  public readonly enabledGrantTypes: { [key: string]: GrantInterface } = {};
  public readonly grantTypeAccessTokenTTL: { [key: string]: DateInterval } = {};

  private options: AuthorizationServerOptions = {
    requiresPKCE: true,
    requiresS256: true,
    notBeforeLeeway: 0,
    tokenCID: "id",
  };

  private readonly jwt: JwtInterface;

  constructor(
    private readonly clientRepository: OAuthClientRepository,
    private readonly tokenRepository: OAuthTokenRepository,
    private readonly scopeRepository: OAuthScopeRepository,
    serviceOrString: JwtInterface | string,
    options?: Partial<AuthorizationServerOptions>,
  ) {
    this.setOptions(options);
    this.jwt = typeof serviceOrString === "string" ? new JwtService(serviceOrString) : (this.jwt = serviceOrString);
    this.availableGrants = {
      client_credentials: new ClientCredentialsGrant(
        this.clientRepository,
        this.tokenRepository,
        this.scopeRepository,
        this.jwt,
      ),
      refresh_token: new RefreshTokenGrant(this.clientRepository, this.tokenRepository, this.scopeRepository, this.jwt),
      implicit: new ImplicitGrant(this.clientRepository, this.tokenRepository, this.scopeRepository, this.jwt),
    };
  }

  setOptions(options: Partial<AuthorizationServerOptions> = {}) {
    this.options = { ...this.options, ...options };
  }

  enableGrantTypes(...grants: EnableGrant[]) {
    for (const grant of grants) {
      if (Array.isArray(grant)) {
        const [grantType, accessTokenTTL] = grant;
        this.enableGrantType(grantType, accessTokenTTL);
      } else {
        this.enableGrantType(grant);
      }
    }
  }

  enableGrantType(toEnable: EnableGrant, accessTokenTTL: DateInterval = new DateInterval("1h")): void {
    if (Array.isArray(toEnable)) {
      const [grantType, ttl] = toEnable;
      accessTokenTTL = ttl;
      toEnable = grantType;
    }

    let grant;

    if (typeof toEnable === "string") {
      grant = this.availableGrants[toEnable];
    } else if (toEnable.grant === "authorization_code") {
      grant = new AuthCodeGrant(
        toEnable.authCodeRepository,
        toEnable.userRepository,
        this.clientRepository,
        this.tokenRepository,
        this.scopeRepository,
        this.jwt,
      );
    } else if (toEnable.grant === "password") {
      grant = new PasswordGrant(
        toEnable.userRepository,
        this.clientRepository,
        this.tokenRepository,
        this.scopeRepository,
        this.jwt,
      );
    }

    if (!grant) {
      // This should never be hit, but the typescript compiler wants me to have it here
      // if anyone hits this exception, or knows how we can refactor to make the compiler
      // happy without this piece of code, please open a ticket or pr, thanks for the help!
      //
      // https://github.com/jasonraimondi/ts-oauth2-server/issues
      throw OAuthException.internalServerError();
    }

    grant.options = this.options;
    this.enabledGrantTypes[grant.identifier] = grant;
    this.grantTypeAccessTokenTTL[grant.identifier] = accessTokenTTL;
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
  getGrant(grantType: GrantIdentifier): GrantInterface | undefined {
    return this.enabledGrantTypes[grantType];
  }
}
