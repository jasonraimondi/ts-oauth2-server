import { AuthorizationServerOptions } from "../../authorization_server";
import { isClientConfidential, OAuthClient } from "../../entities/client.entity";
import { OAuthScope } from "../../entities/scope.entity";
import { OAuthToken } from "../../entities/token.entity";
import { OAuthUser } from "../../entities/user.entity";
import { OAuthException } from "../../exceptions/oauth.exception";
import { OAuthTokenRepository } from "../../repositories/access_token.repository";
import { OAuthAuthCodeRepository } from "../../repositories/auth_code.repository";
import { OAuthClientRepository } from "../../repositories/client.repository";
import { OAuthScopeRepository } from "../../repositories/scope.repository";
import { ExtraAccessTokenFields, OAuthUserRepository } from "../../repositories/user.repository";
import { AuthorizationRequest } from "../../requests/authorization.request";
import { RequestInterface } from "../../requests/request";
import { BearerTokenResponse } from "../../responses/bearer_token.response";
import { ResponseInterface } from "../../responses/response";
import { arrayDiff } from "../../utils/array";
import { base64decode } from "../../utils/base64";
import { DateInterval } from "../../utils/date_interval";
import { JwtInterface } from "../../utils/jwt";
import { getSecondsUntil, roundToSeconds } from "../../utils/time";
import { GrantIdentifier, GrantInterface } from "./grant.interface";

export interface ITokenData {
  iss: undefined;
  sub: string | undefined;
  aud: undefined;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  cid: string;
  scope: string;
}

export abstract class AbstractGrant implements GrantInterface {
  public readonly options: AuthorizationServerOptions = {
    requiresPKCE: true,
    useUrlEncode: true,
  };

  protected readonly scopeDelimiterString = " ";

  protected readonly supportedGrantTypes: GrantIdentifier[] = [
    "client_credentials",
    "authorization_code",
    "refresh_token",
    "password",
    "implicit",
  ];

  abstract readonly identifier: GrantIdentifier;

  constructor(
    protected readonly authCodeRepository: OAuthAuthCodeRepository,
    protected readonly clientRepository: OAuthClientRepository,
    protected readonly tokenRepository: OAuthTokenRepository,
    protected readonly scopeRepository: OAuthScopeRepository,
    protected readonly userRepository: OAuthUserRepository,
    protected readonly jwt: JwtInterface,
  ) {}

  async makeBearerTokenResponse(
    client: OAuthClient,
    accessToken: OAuthToken,
    scopes: OAuthScope[] = [],
    extraJwtFields: ExtraAccessTokenFields = {},
  ) {
    const scope = scopes.map(scope => scope.name).join(this.scopeDelimiterString);

    const encryptedAccessToken = await this.encryptAccessToken(client, accessToken, scopes, extraJwtFields);

    let encryptedRefreshToken: string | undefined = undefined;

    if (accessToken.refreshToken) {
      encryptedRefreshToken = await this.encryptRefreshToken(client, accessToken, scopes);
    }

    const bearerTokenResponse = new BearerTokenResponse(accessToken);

    bearerTokenResponse.body = {
      token_type: "Bearer",
      expires_in: getSecondsUntil(accessToken.accessTokenExpiresAt),
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      scope,
    };

    return bearerTokenResponse;
  }

  protected encryptRefreshToken(client: OAuthClient, refreshToken: OAuthToken, scopes: OAuthScope[]) {
    const expiresAtMs = refreshToken.refreshTokenExpiresAt?.getTime() ?? refreshToken.accessTokenExpiresAt.getTime();
    return this.encrypt({
      client_id: client.id,
      access_token_id: refreshToken.accessToken,
      refresh_token_id: refreshToken.refreshToken,
      scope: scopes.map(scope => scope.name).join(this.scopeDelimiterString),
      user_id: refreshToken.user?.id,
      expire_time: Math.ceil(expiresAtMs / 1000),
      // token_version: 1, // @todo token version?
    });
  }

  protected encryptAccessToken(
    client: OAuthClient,
    accessToken: OAuthToken,
    scopes: OAuthScope[],
    extraJwtFields: ExtraAccessTokenFields,
  ) {
    return this.encrypt(<ITokenData | any>{
      // non standard claims
      ...extraJwtFields,
      cid: client.name,
      scope: scopes.map(scope => scope.name).join(this.scopeDelimiterString),

      // standard claims
      iss: undefined, // @see https://tools.ietf.org/html/rfc7519#section-4.1.1
      sub: accessToken.user?.id, // @see https://tools.ietf.org/html/rfc7519#section-4.1.2
      aud: undefined, // @see https://tools.ietf.org/html/rfc7519#section-4.1.3
      exp: roundToSeconds(accessToken.accessTokenExpiresAt.getTime()), // @see https://tools.ietf.org/html/rfc7519#section-4.1.4
      nbf: roundToSeconds(Date.now()), // @see https://tools.ietf.org/html/rfc7519#section-4.1.5
      iat: roundToSeconds(Date.now()), // @see https://tools.ietf.org/html/rfc7519#section-4.1.6
      jti: accessToken.accessToken, // @see https://tools.ietf.org/html/rfc7519#section-4.1.7
    });
  }

  protected async validateClient(request: RequestInterface): Promise<OAuthClient> {
    const [clientId, clientSecret] = this.getClientCredentials(request);

    const grantType = this.getGrantType(request);

    const client = await this.clientRepository.getByIdentifier(clientId);

    if (isClientConfidential(client) && !clientSecret) {
      throw OAuthException.invalidClient("Confidential clients require client_secret.");
    }

    const userValidationSuccess = await this.clientRepository.isClientValid(grantType, client, clientSecret);

    if (!userValidationSuccess) {
      throw OAuthException.invalidClient();
    }

    if (grantType === "client_credentials") {
      if (!client.secret || client.secret !== clientSecret) {
        throw OAuthException.invalidClient("Invalid client_credentials");
      }
    }

    return client;
  }

  protected getClientCredentials(request: RequestInterface): [string, string | undefined] {
    const [basicAuthUser, basicAuthPass] = this.getBasicAuthCredentials(request);

    let clientId = this.getRequestParameter("client_id", request, basicAuthUser);

    if (!clientId) {
      throw OAuthException.invalidRequest("client_id");
    }

    let clientSecret = this.getRequestParameter("client_secret", request, basicAuthPass);

    if (Array.isArray(clientId) && clientId.length > 0) clientId = clientId[0];

    if (Array.isArray(clientSecret) && clientSecret.length > 0) clientSecret = clientSecret[0];

    return [clientId, clientSecret];
  }

  protected getBasicAuthCredentials(request: RequestInterface) {
    if (!request.headers?.hasOwnProperty("authorization")) {
      return [undefined, undefined];
    }

    const header = request.headers["authorization"];

    if (!header || !header.startsWith("Basic ")) {
      return [undefined, undefined];
    }

    const decoded = base64decode(header.substr(6, header.length));

    if (!decoded.includes(":")) {
      return [undefined, undefined];
    }

    return decoded.split(":");
  }

  protected async validateScopes(
    scopes: undefined | string | string[] = [],
    redirectUri?: string,
  ): Promise<OAuthScope[]> {
    if (typeof scopes === "string") {
      scopes = scopes.split(this.scopeDelimiterString);
    }

    if (!scopes || scopes.length === 0 || scopes[0] === "") {
      return [];
    }

    const validScopes = await this.scopeRepository.getAllByIdentifiers(scopes);

    const invalidScopes = arrayDiff(
      scopes,
      validScopes.map(scope => scope.name),
    );

    if (invalidScopes.length > 0) {
      throw OAuthException.invalidScope(invalidScopes.join(", "), redirectUri);
    }

    return validScopes;
  }

  protected async issueAccessToken(
    accessTokenTTL: DateInterval,
    client: OAuthClient,
    user?: OAuthUser,
    scopes: OAuthScope[] = [],
  ): Promise<OAuthToken> {
    const accessToken = await this.tokenRepository.issueToken(client, scopes, user);
    accessToken.accessTokenExpiresAt = accessTokenTTL.getEndDate();
    await this.tokenRepository.persist(accessToken);
    return accessToken;
  }

  issueRefreshToken(accessToken: OAuthToken): Promise<OAuthToken> {
    return this.tokenRepository.issueRefreshToken(accessToken);
  }

  private getGrantType(request: RequestInterface): GrantIdentifier {
    const result =
      this.getRequestParameter("grant_type", request) ?? this.getQueryStringParameter("grant_type", request);

    if (!result || !this.supportedGrantTypes.includes(result)) {
      throw OAuthException.invalidRequest("grant_type");
    }

    if (this.identifier !== result) {
      throw OAuthException.invalidRequest("grant_type", "something went wrong"); // @todo remove the something went wrong
    }

    return result;
  }

  protected getRequestParameter(param: string, request: RequestInterface, defaultValue?: any) {
    return request.body?.[param] ?? defaultValue;
  }

  protected getQueryStringParameter(param: string, request: RequestInterface, defaultValue?: any) {
    return request.query?.[param] ?? defaultValue;
  }

  protected encrypt(unencryptedData: string | Buffer | Record<string, unknown>): Promise<string> {
    return this.jwt.sign(unencryptedData);
  }

  protected async decrypt(encryptedData: string) {
    return await this.jwt.verify(encryptedData);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateAuthorizationRequest(request: RequestInterface): Promise<AuthorizationRequest> {
    throw new Error("Grant does not support the request");
  }

  canRespondToAccessTokenRequest(request: RequestInterface): boolean {
    return this.getRequestParameter("grant_type", request) === this.identifier;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canRespondToAuthorizationRequest(request: RequestInterface): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface> {
    throw new Error("Grant does not support the request");
  }

  async respondToAccessTokenRequest(
    req: RequestInterface, // eslint-disable-line @typescript-eslint/no-unused-vars
    res: ResponseInterface, // eslint-disable-line @typescript-eslint/no-unused-vars
    tokenTTL: DateInterval, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ResponseInterface> {
    throw new Error("Grant does not support the request");
  }
}
