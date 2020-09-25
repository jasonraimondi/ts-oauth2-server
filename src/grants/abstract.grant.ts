import crypto from "crypto";
import { DateInterval } from "@jmondi/date-interval";
import type { Request, Response } from "express";

import { AuthorizationRequest } from "../requests";
import {
  OAuthAccessTokenRepository,
  OAuthAuthCodeRepository,
  OAuthClientRepository,
  OAuthRefreshTokenRepository,
  OAuthScopeRepository,
  OAuthUserRepository,
} from "../repositories";
import { OAuthAccessToken, OAuthAuthCode, OAuthClient, OAuthRefreshToken, OAuthScope } from "../entities";
import { RedirectResponse } from "../responses";
import { OAuthException } from "../exceptions";
import { arrayDiff, base64decode, JwtService } from "../utils";
import { GrantTypeIdentifiers, IGrant } from "./interfaces";
import { IRequest, IResponse } from "../requests/interface";

export abstract class AbstractGrant implements IGrant {
  protected readonly scopeDelimiterString = " ";

  protected readonly supportedGrantTypes: GrantTypeIdentifiers[] = ["client_credentials", "authorization_code"];

  abstract readonly identifier: GrantTypeIdentifiers;

  constructor(
    protected readonly clientRepository: OAuthClientRepository,
    protected readonly accessTokenRepository: OAuthAccessTokenRepository,
    protected readonly refreshTokenRepository: OAuthRefreshTokenRepository,
    protected readonly authCodeRepository: OAuthAuthCodeRepository,
    protected readonly scopeRepository: OAuthScopeRepository,
    protected readonly userRepository: OAuthUserRepository,
    protected readonly jwt: JwtService,
  ) {}

  protected async validateClient(request: IRequest): Promise<OAuthClient> {
    const [clientId, clientSecret] = this.getClientCredentials(request);

    const isClientValid = await this.clientRepository.isClientValid(this.identifier, clientId, clientSecret);

    if (!isClientValid) {
      throw OAuthException.invalidClient();
    }

    return this.clientRepository.getClientByIdentifier(clientId);
  }

  protected getClientCredentials(request: IRequest): [string, string | undefined] {
    const [basicAuthUser, basicAuthPass] = this.getBasicAuthCredentials(request);

    // @todo is this being body okay?
    let clientId = request.body?.["client_id"] ?? basicAuthUser;

    if (!clientId) throw OAuthException.invalidRequest("client_id");

    // @todo is this being body okay?
    let clientSecret = request.body?.["client_secret"] ?? basicAuthPass;

    if (Array.isArray(clientId)) clientId = clientId[0];

    if (Array.isArray(clientSecret)) clientSecret = clientSecret[0];

    return [clientId, clientSecret];
  }

  protected getBasicAuthCredentials(request: IRequest) {
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

  protected validateRedirectUri(redirectUri: string, client: OAuthClient) {
    if (redirectUri === "" || !client.redirectUris.includes(redirectUri)) {
      throw OAuthException.invalidClient();
    }
  }

  protected async validateScopes(scopes: string | string[], redirectUri?: string) {
    if (typeof scopes === "string") {
      scopes = scopes.split(this.scopeDelimiterString);
    }

    const validScopes = await this.scopeRepository.getScopesByIdentifier(scopes);

    const invalidScopes = arrayDiff(
      scopes,
      validScopes.map((scope) => scope.name),
    );

    if (invalidScopes.length > 0) {
      throw OAuthException.invalidScope(invalidScopes.join(", "), redirectUri);
    }

    return validScopes;
  }

  protected async issueAccessToken(
    accessTokenTTL: DateInterval,
    client: OAuthClient,
    userId?: string,
    scopes: OAuthScope[] = [],
  ): Promise<OAuthAccessToken> {
    const accessToken = await this.accessTokenRepository.getNewToken(client, scopes, userId);

    accessToken.expiresAt = accessTokenTTL.end();

    await this.accessTokenRepository.persistNewAccessToken(accessToken);

    return accessToken;
  }

  protected async issueAuthCode(
    authCodeTTL: DateInterval,
    client: OAuthClient,
    userIdentifier?: string,
    redirectUri?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string,
    scopes: OAuthScope[] = [],
  ): Promise<OAuthAuthCode> {
    const user = userIdentifier ? await this.userRepository.getByUserIdentifier(userIdentifier) : undefined;

    const authCode = await this.authCodeRepository.getNewAuthCode(client, user, scopes);
    authCode.expiresAt = authCodeTTL.end();
    authCode.redirectUri = redirectUri;
    authCode.codeChallenge = codeChallenge;
    authCode.codeChallengeMethod = codeChallengeMethod;
    scopes.forEach((scope) => (authCode.scopes ? authCode.scopes.push(scope) : (authCode.scopes = [scope])));
    await this.authCodeRepository.persistNewAuthCode(authCode);
    return authCode;
  }

  protected async issueRefreshToken(accessToken: OAuthAccessToken): Promise<OAuthRefreshToken | undefined> {
    const refreshToken = await this.refreshTokenRepository.getNewToken(accessToken);

    if (!refreshToken) {
      return;
    }

    await this.refreshTokenRepository.persistNewRefreshToken(refreshToken);

    return refreshToken;
  }

  protected generateUniqueIdentifier(len = 40) {
    return crypto.randomBytes(len).toString("hex");
  }

  protected getGrantType(request: IRequest): GrantTypeIdentifiers {
    const result = request.body?.grant_type ?? request.query?.grant_type;
    if (!result) throw OAuthException.invalidRequest("grant_type");
    if (!this.supportedGrantTypes.includes(result)) throw OAuthException.invalidRequest("grant_type");
    return result;
  }

  protected getRequestParameter(param: string, request: IRequest, defaultValue?: any) {
    return request.body?.[param] ?? defaultValue;
  }

  protected getQueryStringParameter(param: string, request: IRequest, defaultValue?: any) {
    return request.query?.[param] ?? defaultValue;
  }

  protected encrypt(unencryptedData: string): Promise<string> {
    return this.jwt.sign(unencryptedData);
  }

  protected decrypt(encryptedData: string) {
    return this.jwt.decode(encryptedData);
  }

  validateAuthorizationRequest(request: IRequest): Promise<AuthorizationRequest> {
    throw new Error("not implemented error");
  }

  canRespondToAccessTokenRequest(request: IRequest): boolean {
    return this.getRequestParameter("grant_type", request) === this.identifier;
  }

  canRespondToAuthorizationRequest(request: IRequest): boolean {
    return false;
  }

  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<RedirectResponse> {
    throw new Error("not implemented error");
  }

  // not included in phpoauth

  async respondToAccessTokenRequest(
    request: IRequest,
    response: IResponse,
    accessTokenTTL: DateInterval,
  ): Promise<IResponse> {
    throw new Error("not implemented error");
  }
}
