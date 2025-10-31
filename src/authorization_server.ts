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
import { LoggerService } from "./utils/logger.js";

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
  authenticateIntrospect: boolean;
  authenticateRevoke: boolean;
  logger?: LoggerService;
  /**
   * If enabled opaque codes are used instead of JWT-based authorization codes.
   */
  useOpaqueAuthorizationCodes?: boolean;
  /**
   * If enabled opaque tokens are used instead of JWT-based refresh tokens.
   */
  useOpaqueRefreshTokens?: boolean;
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

/**
 * The Authorization Server is the core component of the OAuth 2.0 framework.
 * It is responsible for authenticating resource owners and issuing access tokens to clients.
 *
 * @see https://tsoauth2server.com/authorization_server/
 */
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

  /**
   * Creates an instance of the AuthorizationServer.
   *
   * @param clientRepository - Repository for managing OAuth clients
   * @param tokenRepository - Repository for managing access tokens
   * @param scopeRepository - Repository for managing OAuth scopes
   * @param serviceOrString - JWT service instance or secret key string for signing tokens
   * @param options - Optional configuration options for the authorization server
   *
   * @example
   * ```ts
   * const authorizationServer = new AuthorizationServer(
   *   clientRepository,
   *   accessTokenRepository,
   *   scopeRepository,
   *   "secret-key",
   *   { requiresPKCE: true }
   * );
   * ```
   */
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
    this.enableGrantTypes("client_credentials", "refresh_token");
  }

  /**
   * Enables multiple grant types on the authorization server.
   *
   * @param grants - Array of grant types to enable
   *
   * @example
   * ```ts
   * authorizationServer.enableGrantTypes(
   *   "client_credentials",
   *   "refresh_token",
   *   { grant: "authorization_code", userRepository, authCodeRepository }
   * );
   * ```
   */
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

  /**
   * Enables a specific grant type on the authorization server.
   * By default, no grant types are enabled when creating an AuthorizationServer.
   * Each grant type must be explicitly enabled using this method.
   *
   * @param toEnable - The grant type to enable
   * @param accessTokenTTL - Time-to-live for access tokens (defaults to 1 hour)
   *
   * @example
   * ```ts
   * // Enable simple grant types
   * authorizationServer.enableGrantType("client_credentials");
   * authorizationServer.enableGrantType("refresh_token");
   *
   * // Enable authorization code grant with required repositories
   * authorizationServer.enableGrantType({
   *   grant: "authorization_code",
   *   userRepository,
   *   authCodeRepository,
   * });
   * ```
   */
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

  /**
   * Handles requests to the `/token` endpoint and issues access tokens.
   * This is a back-channel endpoint that supports multiple grant types.
   *
   * @param req - The incoming HTTP request
   * @returns A promise that resolves to an OAuth response with the access token
   * @throws {OAuthException} When the grant type is not supported or the request is invalid
   *
   * @example
   * ```ts
   * app.post("/token", async (req, res) => {
   *   try {
   *     const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
   *     return handleExpressResponse(res, oauthResponse);
   *   } catch (e) {
   *     handleExpressError(e, res);
   *   }
   * });
   * ```
   */
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

  /**
   * Validates the authorization request from the `/authorize` endpoint.
   * This is the first step in the authorization code flow.
   *
   * @param req - The incoming HTTP request
   * @returns A promise that resolves to an AuthorizationRequest object
   * @throws {OAuthException} When the request is invalid or grant type is not supported
   *
   * @example
   * ```ts
   * app.get("/authorize", async (req, res) => {
   *   const authRequest = await authorizationServer.validateAuthorizationRequest(
   *     requestFromExpress(req)
   *   );
   *   // Handle user authentication and consent...
   * });
   * ```
   */
  validateAuthorizationRequest(req: RequestInterface): Promise<AuthorizationRequest> {
    for (const grant of Object.values(this.enabledGrantTypes)) {
      if (grant.canRespondToAuthorizationRequest(req)) {
        return grant.validateAuthorizationRequest(req);
      }
    }

    throw OAuthException.unsupportedGrantType();
  }

  /**
   * Completes the authorization request and issues an authorization code.
   * This should be called after the user has been authenticated and has approved the authorization.
   *
   * @param authorizationRequest - The authorization request with user and approval status set
   * @returns A promise that resolves to an OAuth response with the authorization code
   *
   * @example
   * ```ts
   * // Set the authenticated user and approval status
   * authRequest.user = req.user;
   * authRequest.isAuthorizationApproved = true;
   *
   * // Complete the authorization
   * const oauthResponse = await authorizationServer.completeAuthorizationRequest(authRequest);
   * return handleExpressResponse(res, oauthResponse);
   * ```
   */
  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface> {
    const grant = this.enabledGrantTypes[authorizationRequest.grantTypeId];
    return await grant.completeAuthorizationRequest(authorizationRequest);
  }

  /**
   * Handles requests to the `/token/revoke` endpoint to revoke tokens.
   * This endpoint revokes access tokens, refresh tokens, or authorization codes.
   *
   * @param req - The incoming HTTP request containing the token to revoke
   * @returns A promise that resolves to an OAuth response
   * @throws {OAuthException} When the request is invalid or grant type doesn't support revocation
   *
   * @example
   * ```ts
   * app.post("/token/revoke", async (req, res) => {
   *   try {
   *     const oauthResponse = await authorizationServer.revoke(req);
   *     return handleExpressResponse(res, oauthResponse);
   *   } catch (e) {
   *     handleExpressError(e, res);
   *   }
   * });
   * ```
   */
  async revoke(req: RequestInterface): Promise<ResponseInterface> {
    for (const grantType of Object.values(this.enabledGrantTypes)) {
      if (grantType.canRespondToRevokeRequest(req)) {
        return grantType.respondToRevokeRequest(req);
      }
    }

    throw OAuthException.unsupportedGrantType();
  }

  /**
   * Handles requests to the `/token/introspect` endpoint to introspect tokens.
   * This endpoint allows clients to query the authorization server to determine
   * the active state and meta-information of a given token.
   *
   * @param req - The incoming HTTP request containing the token to introspect
   * @returns A promise that resolves to an OAuth response with token information
   * @throws {OAuthException} When the request is invalid or grant type doesn't support introspection
   *
   * @example
   * ```ts
   * app.post("/token/introspect", async (req, res) => {
   *   try {
   *     const oauthResponse = await authorizationServer.introspect(req);
   *     return handleExpressResponse(res, oauthResponse);
   *   } catch (e) {
   *     handleExpressError(e, res);
   *   }
   * });
   * ```
   */
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
