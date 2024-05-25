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
import { ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { JwtInterface } from "../utils/jwt.js";
import { AbstractAuthorizedGrant } from "./abstract/abstract_authorized.grant.js";
import { GrantIdentifier } from "./abstract/grant.interface.js";
import { AuthorizationServerOptions } from "../authorization_server.js";

export interface IAuthCodePayload {
  client_id: string;
  auth_code_id: string;
  expire_time: number;
  scopes: string[];
  user_id?: OAuthUserIdentifier | null;
  redirect_uri?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: CodeChallengeMethod | null;
}

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

    const encryptedAuthCode = this.getRequestParameter("code", req);

    if (!encryptedAuthCode) throw OAuthException.invalidParameter("code");

    const decryptedCode = await this.decrypt(encryptedAuthCode).catch(e => {
      throw OAuthException.badRequest(e.message ?? "malformed jwt");
    });

    const validatedPayload = await this.validateAuthorizationCode(decryptedCode, client, req);

    const userId = validatedPayload.user_id;

    const user = userId ? await this.userRepository.getUserByCredentials(userId) : undefined;

    const scopes: OAuthScope[] = [];

    try {
      const finalizedScopes = await this.scopeRepository.finalize(
        await this.validateScopes(validatedPayload.scopes ?? []),
        this.identifier,
        client,
        userId,
      );
      finalizedScopes.forEach(scope => scopes.push(scope));
    } catch (_) {
      throw OAuthException.invalidParameter("code", "Cannot verify scopes");
    }

    const authCode = await this.authCodeRepository.getByIdentifier(validatedPayload.auth_code_id);

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

    const authorizationRequest = new AuthorizationRequest(this.identifier, client, redirectUri);

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

    const payload: IAuthCodePayload = {
      client_id: authCode.client.id,
      redirect_uri: authCode.redirectUri,
      auth_code_id: authCode.code,
      scopes: authCode.scopes.map(scope => scope.name),
      user_id: authCode.user?.id,
      expire_time: this.authCodeTTL.getEndTimeSeconds(),
      code_challenge: authorizationRequest.codeChallenge,
      code_challenge_method: authorizationRequest.codeChallengeMethod,
    };

    const jsonPayload = JSON.stringify(payload);

    const code = await this.encrypt(jsonPayload);

    const params: Record<string, string> = { code };

    if (authorizationRequest.state) params.state = authorizationRequest.state;

    const finalRedirectUri = this.makeRedirectUrl(redirectUri, params);

    return new RedirectResponse(finalRedirectUri);
  }

  async doRevoke(encryptedToken: string): Promise<void> {
    let decryptedCode: any;

    try {
      decryptedCode = await this.decrypt(encryptedToken);
    } catch (e) {
      return;
    }

    if (!decryptedCode?.auth_code_id) {
      return;
    }

    await this.authCodeRepository.revoke(decryptedCode.auth_code_id);

    return;
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
    const user = userIdentifier ? await this.userRepository.getUserByCredentials(userIdentifier) : undefined;

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
}
