import { OAuthException } from "./exceptions/oauth.exception.js";
import { GrantIdentifier, GrantInterface } from "./grants/abstract/grant.interface.js";
import { AuthCodeGrant } from "./grants/auth_code.grant.js";
import { ClientCredentialsGrant } from "./grants/client_credentials.grant.js";
import { ImplicitGrant } from "./grants/implicit.grant.js";
import { PasswordGrant } from "./grants/password.grant.js";
import { RefreshTokenGrant } from "./grants/refresh_token.grant.js";
import { OAuthTokenRepository } from "./repositories/access_token.repository.js";
import { OAuthAuthCodeRepository } from "./repositories/auth_code.repository.js";
import { OAuthClientRepository } from "./repositories/client.repository.js";
import { OAuthScopeRepository } from "./repositories/scope.repository.js";
import { OAuthUserRepository } from "./repositories/user.repository.js";
import { AuthorizationRequest } from "./requests/authorization.request.js";
import { RequestInterface } from "./requests/request.js";
import { ResponseInterface } from "./responses/response.js";
import { DateInterval } from "./utils/date_interval.js";
import { JwtInterface, JwtService } from "./utils/jwt.js";
import { DEFAULT_AUTHORIZATION_SERVER_OPTIONS } from "./options.js";
import { ProcessTokenExchangeFn, TokenExchangeGrant } from "./grants/token_exchange.grant.js";
import { AbstractGrant } from "./grants/abstract/abstract.grant.js";

/**
 * @see https://tsoauth2server.com/configuration/
 */
export interface AuthorizationServerOptions {
  // @see https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5
  notBeforeLeeway: number;
  requiresPKCE: boolean;
  requiresS256: boolean;
  tokenCID: "id" | "name";
  issuer?: string;
  scopeDelimiter: string;
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
    }
  | {
      grant: "urn:ietf:params:oauth:grant-type:token-exchange";
      processTokenExchange: ProcessTokenExchangeFn;
    }
  | {
      grant: AbstractGrant;
    };
export type EnableGrant = EnableableGrants | [EnableableGrants, DateInterval];

export type OAuthTokenIntrospectionResponse = {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
};

export class AuthorizationServer {
  public readonly enabledGrantTypes: Record<string, GrantInterface> = {};
  public readonly grantTypeAccessTokenTTL: Record<string, DateInterval> = {};

  private readonly availableGrants: {
    authorization_code?: AuthCodeGrant;
    password?: PasswordGrant;
    implicit?: ImplicitGrant;
    client_credentials: ClientCredentialsGrant;
    refresh_token: RefreshTokenGrant;
  };
  private readonly options: AuthorizationServerOptions = DEFAULT_AUTHORIZATION_SERVER_OPTIONS;
  private readonly jwt: JwtInterface;

  constructor(
    private readonly clientRepository: OAuthClientRepository,
    private readonly tokenRepository: OAuthTokenRepository,
    private readonly scopeRepository: OAuthScopeRepository,
    serviceOrString: JwtInterface | string,
    options?: Partial<AuthorizationServerOptions>,
  ) {
    this.jwt = typeof serviceOrString === "string" ? new JwtService(serviceOrString) : (this.jwt = serviceOrString);
    this.options = { ...DEFAULT_AUTHORIZATION_SERVER_OPTIONS, ...options };
    const grantProps = [
      this.clientRepository,
      this.tokenRepository,
      this.scopeRepository,
      this.jwt,
      this.options,
    ] as const;
    this.availableGrants = {
      client_credentials: new ClientCredentialsGrant(...grantProps),
      refresh_token: new RefreshTokenGrant(...grantProps),
      implicit: new ImplicitGrant(...grantProps),
    };
  }

  enableGrantTypes(...grants: EnableGrant[]): void {
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
        this.options,
      );
    } else if (toEnable.grant === "password") {
      grant = new PasswordGrant(
        toEnable.userRepository,
        this.clientRepository,
        this.tokenRepository,
        this.scopeRepository,
        this.jwt,
        this.options,
      );
    } else if (toEnable.grant === "urn:ietf:params:oauth:grant-type:token-exchange") {
      grant = new TokenExchangeGrant(
        toEnable.processTokenExchange,
        this.clientRepository,
        this.tokenRepository,
        this.scopeRepository,
        this.jwt,
        this.options,
      );
    } else if (toEnable.grant instanceof AbstractGrant) {
      grant = toEnable.grant;
    }

    if (!grant) {
      // This should never be hit, but the typescript compiler wants me to have it here
      // if anyone hits this exception, or knows how we can refactor to make the compiler
      // happy without this piece of code, please open a ticket or pr, thanks for the help!
      //
      // https://github.com/jasonraimondi/ts-oauth2-server/issues
      throw OAuthException.internalServerError();
    }

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

  async introspect(req: RequestInterface): Promise<ResponseInterface> {
    for (const grantType of Object.values(this.enabledGrantTypes)) {
      if (grantType.canRespondToIntrospectRequest(req)) {
        return grantType.respondToIntrospectRequest(req);
      }
    }

    throw OAuthException.unsupportedGrantType();
  }

  // I am only using this in testing... should it be here?
  getGrant<T extends GrantInterface>(grantType: GrantIdentifier): T {
    return this.enabledGrantTypes[grantType] as T;
  }
}
