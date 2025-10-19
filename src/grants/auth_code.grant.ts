import { PlainVerifier } from "../code_verifiers/plain.verifier.js";
import { S256Verifier } from "../code_verifiers/S256.verifier.js";
import { CodeChallengeMethod, ICodeChallenge } from "../code_verifiers/verifier.js";
import { OAuthAuthCode } from "../entities/auth_code.entity.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthUserIdentifier } from "../entities/user.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";
import { OAuthTokenRepository } from "../repositories/access_token.repository.js";
import { OAuthAuthCodeRepository } from "../repositories/auth_code.repository.js";
import { OAuthClientRepository } from "../repositories/client.repository.js";
import { OAuthScopeRepository } from "../repositories/scope.repository.js";
import { OAuthUserRepository } from "../repositories/user.repository.js";
import { AuthorizationRequest } from "../requests/authorization.request.js";
import { RequestInterface } from "../requests/request.js";
import { RedirectResponse } from "../responses/redirect.response.js";
import { OAuthResponse, ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { JwtInterface } from "../utils/jwt.js";
import { AbstractAuthorizedGrant } from "./abstract/abstract_authorized.grant.js";
import { GrantIdentifier } from "./abstract/grant.interface.js";
import { AuthorizationServerOptions } from "../authorization_server.js";

export interface PayloadAuthCode {
  client_id: string;
  auth_code_id: string;
  expire_time: number;
  scopes: string[];
  user_id?: OAuthUserIdentifier | null;
  redirect_uri?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: CodeChallengeMethod | null;
  audience?: string[] | string | null;
}
/** @deprecated use `PayloadAuthCode` instead */
export interface IAuthCodePayload extends PayloadAuthCode {}

export const REGEXP_CODE_VERIFIER = /^[A-Za-z0-9-._~]{43,128}$/;

export const REGEX_ACCESS_TOKEN = /[A-Za-z0-9\-._~+\/]+=*/;

export class AuthCodeGrant extends AbstractAuthorizedGrant {
  readonly identifier: GrantIdentifier = "authorization_code";

  protected authCodeTTL: DateInterval = new DateInterval("15m");

  private codeChallengeVerifiers = {
    plain: new PlainVerifier(),
    S256: new S256Verifier(),
  };

  constructor(
    protected readonly authCodeRepository: OAuthAuthCodeRepository,
    protected readonly userRepository: OAuthUserRepository,
    clientRepository: OAuthClientRepository,
    tokenRepository: OAuthTokenRepository,
    scopeRepository: OAuthScopeRepository,
    jwt: JwtInterface,
    options: AuthorizationServerOptions,
  ) {
    super(clientRepository, tokenRepository, scopeRepository, jwt, options);
  }

  async respondToAccessTokenRequest(req: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    const client = await this.validateClient(req);

    const incomingRawAuthCodeValue = this.getRequestParameter("code", req);

    if (!incomingRawAuthCodeValue) throw OAuthException.invalidParameter("code");

    let authCodeProperties: Record<string, unknown> | null = null;

    let authCode: OAuthAuthCode | null = null;
    if (this.options.useOpaqueAuthorizationCodes) {
      /**
       * We only getch the auth code from the repository when using opaque authorization codes.
       * If the `useOpaqueAuthorizationCodes` option is disabled we first verify the JWT before fetching the auth code information from the repository.
       */
      authCode = await this.authCodeRepository.getByIdentifier(incomingRawAuthCodeValue);

      if (!authCode) {
        throw OAuthException.invalidParameter("code");
      }

      authCodeProperties = {
        client_id: authCode.client.id,
        redirect_uri: authCode.redirectUri,
        auth_code_id: authCode.code,
        scopes: authCode.scopes.map(scope => scope.name),
        user_id: authCode.user?.id,
        expire_time: Math.ceil(authCode.expiresAt.getTime() / 1000),
        code_challenge: authCode.codeChallenge,
        code_challenge_method: authCode.codeChallengeMethod,
      } satisfies PayloadAuthCode;
    } else {
      authCodeProperties = await this.decrypt(incomingRawAuthCodeValue).catch(e => {
        throw OAuthException.badRequest(e.message ?? "malformed jwt");
      });
    }

    const validatedPayload = await this.validateAuthorizationCode(authCodeProperties, client, req);

    const userId = validatedPayload.user_id;

    const user = userId
      ? await this.userRepository.getUserByCredentials(userId, undefined, this.identifier, client)
      : undefined;

    const scopes: OAuthScope[] = [];

    try {
      const finalizedScopes = await this.scopeRepository.finalize(
        await this.validateScopes(validatedPayload.scopes ?? []),
        this.identifier,
        client,
        userId,
      );
      scopes.push(...finalizedScopes);
    } catch (_) {
      throw OAuthException.invalidParameter("code", "Cannot verify scopes");
    }

    /**
     * If `useOpaqueAuthorizationCodes` is true, `authCode` will already be fetched from the repository above since the properties are required for validating the request.
     * With JWT based authorization codes these properties are already contained in the JWT payload so we did not need to fetch the auth code from the repository yet.
     */
    authCode ??= await this.authCodeRepository.getByIdentifier(validatedPayload.auth_code_id);

    if (authCode.codeChallenge) {
      if (!validatedPayload.code_challenge) throw OAuthException.invalidParameter("code_challenge");

      if (authCode.codeChallenge !== validatedPayload.code_challenge) {
        throw OAuthException.invalidParameter("code_challenge", "Provided code challenge does not match auth code");
      }

      const codeVerifier = this.getRequestParameter("code_verifier", req);

      if (!codeVerifier) {
        throw OAuthException.invalidParameter("code_verifier");
      }

      // Validate code_verifier according to RFC-7636
      // @see: https://tools.ietf.org/html/rfc7636#section-4.1
      if (!REGEXP_CODE_VERIFIER.test(codeVerifier)) {
        throw OAuthException.invalidParameter(
          "code_verifier",
          "Code verifier must follow the specifications of RFC-7636",
        );
      }

      const codeChallengeMethod: CodeChallengeMethod | undefined = validatedPayload.code_challenge_method;

      let verifier: ICodeChallenge = this.codeChallengeVerifiers.plain;

      if (codeChallengeMethod === "S256") {
        verifier = this.codeChallengeVerifiers.S256;
      }

      if (!verifier.verifyCodeChallenge(codeVerifier, validatedPayload.code_challenge)) {
        throw OAuthException.invalidGrant("Failed to verify code challenge.");
      }
    }

    let accessToken = await this.issueAccessToken(accessTokenTTL, client, user, scopes);
    accessToken.originatingAuthCodeId = validatedPayload.auth_code_id;

    accessToken = await this.issueRefreshToken(accessToken, client);

    await this.authCodeRepository.revoke(validatedPayload.auth_code_id);

    const extraJwtFields = await this.extraJwtFields(req, client, user);

    return await this.makeBearerTokenResponse(client, accessToken, scopes, extraJwtFields);
  }

  canRespondToAuthorizationRequest(request: RequestInterface): boolean {
    return this.getQueryStringParameter("response_type", request) === "code";
  }

  async validateAuthorizationRequest(request: RequestInterface): Promise<AuthorizationRequest> {
    const clientId = this.getQueryStringParameter("client_id", request);

    if (typeof clientId !== "string") {
      throw OAuthException.invalidParameter("client_id");
    }

    const client = await this.clientRepository.getByIdentifier(clientId);

    if (!client) {
      throw OAuthException.invalidClient();
    }

    const redirectUri = this.getRedirectUri(request, client);

    const bodyScopes = this.getQueryStringParameter("scope", request, []);

    const scopes = await this.validateScopes(bodyScopes);

    const stateParameter = this.getQueryStringParameter("state", request);

    const audience: string[] | string | null | undefined =
      this.getQueryStringParameter("audience", request) ?? this.getQueryStringParameter("aud", request);

    const authorizationRequest = new AuthorizationRequest(this.identifier, client, redirectUri, undefined, audience);

    authorizationRequest.state = stateParameter;

    authorizationRequest.scopes = scopes;

    const codeChallenge = this.getQueryStringParameter("code_challenge", request);

    if (this.options.requiresPKCE && !codeChallenge) {
      throw OAuthException.invalidParameter(
        "code_challenge",
        "The authorization server requires public clients to use PKCE RFC-7636",
      );
    }

    if (codeChallenge) {
      const codeChallengeMethod: string = this.getQueryStringParameter("code_challenge_method", request, "plain");

      if (codeChallengeMethod !== "S256" && this.options.requiresS256) {
        throw OAuthException.invalidParameter("code_challenge_method", "Must be `S256`");
      }

      if (!(codeChallengeMethod === "S256" || codeChallengeMethod === "plain")) {
        throw OAuthException.invalidParameter("code_challenge_method", "Must be `S256` or `plain`");
      }

      authorizationRequest.codeChallenge = codeChallenge;
      authorizationRequest.codeChallengeMethod = codeChallengeMethod;
    }

    return authorizationRequest;
  }

  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface> {
    if (!authorizationRequest.user) {
      throw OAuthException.badRequest("A user should be set on the authorization request");
    }

    const redirectUri = authorizationRequest.redirectUri;

    if (!redirectUri) {
      throw OAuthException.invalidParameter("redirect_uri");
    }

    if (!authorizationRequest.isAuthorizationApproved) {
      throw OAuthException.badRequest("Authorization is not approved");
    }

    const authCode = await this.issueAuthCode(
      this.authCodeTTL,
      authorizationRequest.client,
      authorizationRequest.user.id,
      authorizationRequest.redirectUri,
      authorizationRequest.codeChallenge,
      authorizationRequest.codeChallengeMethod,
      authorizationRequest.scopes,
    );

    if (this.options.useOpaqueAuthorizationCodes) {
      const finalRedirectUri = this.makeRedirectUrl(redirectUri, {
        code: authCode.code,
        ...(authorizationRequest.state && { state: authorizationRequest.state }),
      });

      return new RedirectResponse(finalRedirectUri);
    }

    const payload: IAuthCodePayload = {
      client_id: authCode.client.id,
      redirect_uri: authCode.redirectUri,
      auth_code_id: authCode.code,
      scopes: authCode.scopes.map(scope => scope.name),
      user_id: authCode.user?.id,
      expire_time: this.authCodeTTL.getEndTimeSeconds(),
      code_challenge: authorizationRequest.codeChallenge,
      code_challenge_method: authorizationRequest.codeChallengeMethod,
      audience: authorizationRequest.audience,
    };

    const jsonPayload = JSON.stringify(payload);

    const code = await this.encrypt(jsonPayload);

    const params: Record<string, string> = { code };

    if (authorizationRequest.state) params.state = authorizationRequest.state;

    const finalRedirectUri = this.makeRedirectUrl(redirectUri, params);

    return new RedirectResponse(finalRedirectUri);
  }

  private async validateAuthorizationCode(payload: any, client: OAuthClient, request: RequestInterface) {
    if (!payload.auth_code_id) {
      throw OAuthException.invalidParameter("code", "Authorization code malformed");
    }

    const isCodeRevoked = await this.authCodeRepository.isRevoked(payload.auth_code_id);

    // https://www.rfc-editor.org/rfc/rfc6749#section-4.1.2
    //   If an authorization code is used more than, the authorization server... SHOULD revoke (when possible) all
    //   tokens previously issued based on that authorization code.
    if (isCodeRevoked) {
      await this.tokenRepository.revokeDescendantsOf?.(payload.auth_code_id);
    }

    if (Date.now() / 1000 > payload.expire_time || isCodeRevoked) {
      throw OAuthException.invalidParameter("code", "Authorization code is expired or revoked");
    }

    if (payload.client_id !== client.id) {
      throw OAuthException.invalidParameter("code", "Authorization code was not issued to this client");
    }

    const redirectUri = this.getRequestParameter("redirect_uri", request);
    if (!!payload.redirect_uri && !redirectUri) {
      throw OAuthException.invalidParameter("redirect_uri");
    }

    if (payload.redirect_uri !== redirectUri) {
      throw OAuthException.invalidParameter("redirect_uri", "Invalid redirect URI");
    }
    return payload;
  }

  private async issueAuthCode(
    authCodeTTL: DateInterval,
    client: OAuthClient,
    userIdentifier?: OAuthUserIdentifier,
    redirectUri?: string,
    codeChallenge?: string,
    codeChallengeMethod?: CodeChallengeMethod,
    scopes: OAuthScope[] = [],
  ): Promise<OAuthAuthCode> {
    const user = userIdentifier
      ? await this.userRepository.getUserByCredentials(userIdentifier, undefined, this.identifier, client)
      : undefined;

    const authCode = await this.authCodeRepository.issueAuthCode(client, user, scopes);
    authCode.expiresAt = authCodeTTL.getEndDate();
    authCode.redirectUri = redirectUri;
    authCode.codeChallenge = codeChallenge;
    authCode.codeChallengeMethod = codeChallengeMethod;
    authCode.scopes = [];
    scopes.forEach(scope => authCode.scopes.push(scope));
    await this.authCodeRepository.persist(authCode);
    return authCode;
  }

  canRespondToRevokeRequest(request: RequestInterface): boolean {
    return this.getRequestParameter("token_type_hint", request) === "auth_code";
  }

  async respondToRevokeRequest(req: RequestInterface): Promise<ResponseInterface> {
    req.body["grant_type"] = this.identifier;

    // Silently ignore - per RFC 7009, invalid tokens should not cause error responses
    // @see https://datatracker.ietf.org/doc/html/rfc7009#section-2.2
    const errorResponse = new OAuthResponse();

    let authenticatedClient;
    if (this.options.authenticateRevoke) {
      try {
        authenticatedClient = await this.validateClient(req);
      } catch (err) {
        this.options.logger?.log(err);
        return errorResponse;
      }
    }

    const token = this.getRequestParameter("token", req);

    if (!token) {
      return errorResponse;
    }

    let providedAuthCode: string;
    let providedClientId: string;

    try {
      const { authCodeId, clientId } = await this.getAuthCodeAndClient(token);
      providedAuthCode = authCodeId;
      providedClientId = clientId;
    } catch (err) {
      this.options.logger?.log(err);
      return errorResponse;
    }

    if (this.options.authenticateRevoke && authenticatedClient && providedAuthCode) {
      if (providedClientId !== authenticatedClient.id) {
        this.options.logger?.log("Token client ID does not match authenticated client");
        return errorResponse;
      }
    }

    try {
      await this.authCodeRepository.revoke(providedAuthCode);
    } catch (err) {
      this.options.logger?.log(err);
      // Silently ignore - per RFC 7009, invalid tokens should not cause error responses
    }

    return errorResponse;
  }

  private async getAuthCodeAndClient(token: string): Promise<{ authCodeId: string; clientId: string }> {
    if (this.options.useOpaqueAuthorizationCodes) {
      const authCodeId = token;

      const clientId = await this.authCodeRepository.getByIdentifier(authCodeId).then(it => it.client.id);

      return {
        authCodeId,
        clientId,
      };
    } else {
      let parsedCode: unknown = this.jwt.decode(token);

      if (!this.isAuthCodePayload(parsedCode)) {
        throw new Error("Malformed auth code payload");
      }

      return {
        authCodeId: parsedCode.auth_code_id,
        clientId: parsedCode.client_id,
      };
    }
  }

  private isAuthCodePayload(code: unknown): code is PayloadAuthCode {
    return typeof code === "object" && code !== null && "auth_code_id" in code;
  }
}
