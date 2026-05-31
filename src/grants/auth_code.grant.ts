import { PlainVerifier } from "../code_verifiers/plain.verifier.js";
import { S256Verifier } from "../code_verifiers/S256.verifier.js";
import { CodeChallengeMethod, ICodeChallenge } from "../code_verifiers/verifier.js";
import { OAuthAuthCode } from "../entities/auth_code.entity.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthToken } from "../entities/token.entity.js";
import { OAuthUser, OAuthUserIdentifier } from "../entities/user.entity.js";
import { buildIdTokenClaims, mergeIdTokenClaims } from "../oidc/id_token.js";
import { oidcSubjectIdentifier } from "../oidc/subject.js";
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
import { AuthorizationServerOptions } from "../options.js";
import { AuthCodeEncoder, JwtAuthCodeEncoder, OpaqueAuthCodeEncoder } from "./encoders/auth_code_encoder.js";

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
  nonce?: string | null;
  auth_time?: number | null;
  max_age?: number | null;
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

  private authCodeEncoder: AuthCodeEncoder;

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
    this.authCodeEncoder = this.options.useOpaqueAuthorizationCodes
      ? new OpaqueAuthCodeEncoder(this.authCodeRepository)
      : new JwtAuthCodeEncoder(
          payload => this.encrypt(payload),
          rawCode => this.decrypt(rawCode),
          rawCode => this.jwt.decode(rawCode),
        );
  }

  async respondToAccessTokenRequest(req: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    const client = await this.validateClient(req);

    const incomingRawAuthCodeValue = this.getRequestParameter("code", req);

    if (!incomingRawAuthCodeValue) throw OAuthException.invalidParameter("code");

    const { properties: authCodeProperties, authCode: preloadedAuthCode } =
      await this.resolveAuthCodeData(incomingRawAuthCodeValue);

    const validatedPayload = await this.validateAuthorizationCode(authCodeProperties, client, req);

    this.guardAgainstStaleAuthentication(validatedPayload);

    const userId = validatedPayload.user_id ?? undefined;

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

    const authCode =
      preloadedAuthCode ?? (await this.authCodeRepository.getByIdentifier(validatedPayload.auth_code_id));

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

      const codeChallengeMethod: CodeChallengeMethod | undefined = validatedPayload.code_challenge_method ?? undefined;

      let verifier: ICodeChallenge = this.codeChallengeVerifiers.plain;

      if (codeChallengeMethod === "S256") {
        verifier = this.codeChallengeVerifiers.S256;
      }

      if (!verifier.verifyCodeChallenge(codeVerifier, validatedPayload.code_challenge)) {
        throw OAuthException.invalidGrant("Failed to verify code challenge.");
      }
    }

    const originatingAuthCodeId = validatedPayload.auth_code_id;
    let accessToken = await this.issueAccessToken(accessTokenTTL, client, user, scopes, originatingAuthCodeId);

    accessToken = await this.issueRefreshToken(accessToken, client);

    await this.authCodeRepository.revoke(validatedPayload.auth_code_id);

    const extraJwtFields = await this.extraJwtFields(req, client, user, accessToken.originatingAuthCodeId);

    const tokenResponse = await this.makeBearerTokenResponse(client, accessToken, scopes, extraJwtFields);

    if (this.shouldIssueIdToken(scopes)) {
      tokenResponse.body = {
        ...tokenResponse.body,
        id_token: await this.issueIdToken(
          client,
          user,
          accessToken,
          tokenResponse.body.access_token as string,
          validatedPayload,
          scopes,
        ),
      };
    }

    return tokenResponse;
  }

  private shouldIssueIdToken(scopes: OAuthScope[]): boolean {
    return this.isOpenIdScopeRequest(scopes);
  }

  private isOpenIdScopeRequest(scopes: OAuthScope[] | string[] | undefined): boolean {
    return (
      !!this.options.oidc &&
      scopes?.some(scope => (typeof scope === "string" ? scope : scope.name) === "openid") === true
    );
  }

  /**
   * Mints the ID token for an OIDC authorization-code flow. Added here in
   * AuthCodeGrant after `makeBearerTokenResponse` returns — never by editing
   * AbstractGrant, which the other grants inherit. The ID token carries Protocol
   * Claims only; scope-derived user attributes are served from UserInfo.
   */
  private async issueIdToken(
    client: OAuthClient,
    user: OAuthUser | undefined,
    accessToken: OAuthToken,
    encryptedAccessToken: string,
    payload: PayloadAuthCode,
    scopes: OAuthScope[],
  ): Promise<string> {
    if (!user) {
      throw OAuthException.invalidGrant("The user for this authorization code could not be found");
    }

    const subject = oidcSubjectIdentifier(user.id);
    const claims = buildIdTokenClaims({
      issuer: this.options.issuer ?? "",
      clientId: client.id,
      subject,
      accessTokenExpiresAt: accessToken.accessTokenExpiresAt,
      encryptedAccessToken,
      nonce: payload.nonce,
      authTime: payload.auth_time,
    });

    const getIdTokenClaims = this.options.oidc?.getIdTokenClaims;
    if (!getIdTokenClaims) return this.encrypt(claims);

    let customClaims: Record<string, unknown>;
    try {
      customClaims = await getIdTokenClaims({ subject, clientId: client.id, scopes: scopes.map(s => s.name) });
    } catch (_) {
      throw OAuthException.invalidGrant("The getIdTokenClaims hook threw while building the ID token.");
    }

    return this.encrypt(mergeIdTokenClaims(claims, customClaims));
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

    const finalizedScopes = await this.scopeRepository.finalize(
      await this.validateScopes(bodyScopes),
      this.identifier,
      client,
    );

    const stateParameter = this.getQueryStringParameter("state", request);

    const audience: string[] | string | null | undefined =
      this.getQueryStringParameter("audience", request) ?? this.getQueryStringParameter("aud", request);

    const authorizationRequest = new AuthorizationRequest(this.identifier, client, redirectUri, undefined, audience);

    authorizationRequest.state = stateParameter;

    authorizationRequest.scopes = finalizedScopes;

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

    if (this.isOpenIdScopeRequest(finalizedScopes)) {
      this.parseOidcAuthorizationParameters(request, authorizationRequest);
    }

    return authorizationRequest;
  }

  private parseOidcAuthorizationParameters(
    request: RequestInterface,
    authorizationRequest: AuthorizationRequest,
  ): void {
    authorizationRequest.nonce = this.getQueryStringParameter("nonce", request);
    authorizationRequest.prompt = this.getQueryStringParameter("prompt", request);
    authorizationRequest.loginHint = this.getQueryStringParameter("login_hint", request);
    authorizationRequest.display = this.getQueryStringParameter("display", request);
    authorizationRequest.uiLocales = this.getQueryStringParameter("ui_locales", request);
    authorizationRequest.acrValues = this.getQueryStringParameter("acr_values", request);
    authorizationRequest.idTokenHint = this.getQueryStringParameter("id_token_hint", request);

    const rawMaxAge = this.getQueryStringParameter("max_age", request);
    if (rawMaxAge !== undefined && rawMaxAge !== null && rawMaxAge !== "") {
      const maxAge = Number(rawMaxAge);
      if (!Number.isInteger(maxAge) || maxAge < 0) {
        throw OAuthException.invalidParameter("max_age", "max_age must be a non-negative integer");
      }
      authorizationRequest.maxAge = maxAge;
    }
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

    const isOidcAuthorizationRequest = this.isOpenIdScopeRequest(authorizationRequest.scopes);

    if (
      isOidcAuthorizationRequest &&
      authorizationRequest.maxAge !== undefined &&
      authorizationRequest.authTime === undefined
    ) {
      throw OAuthException.invalidParameter(
        "auth_time",
        "max_age was requested but authTime was not set on the authorization request",
      );
    }

    const authCode = await this.issueAuthCode(
      this.authCodeTTL,
      authorizationRequest.client,
      authorizationRequest.user.id,
      authorizationRequest.redirectUri,
      authorizationRequest.codeChallenge,
      authorizationRequest.codeChallengeMethod,
      authorizationRequest.scopes,
      isOidcAuthorizationRequest
        ? {
            nonce: authorizationRequest.nonce,
            authTime: authorizationRequest.authTime,
            maxAge: authorizationRequest.maxAge,
          }
        : undefined,
    );

    await this.guardAgainstOpaqueNonceLoss(authCode, authorizationRequest);

    const code = await this.authCodeEncoder.issue(authCode, authorizationRequest, this.authCodeTTL.getEndTimeSeconds());

    const params: Record<string, string> = { code };

    if (authorizationRequest.state) params.state = authorizationRequest.state;

    const finalRedirectUri = this.makeRedirectUrl(redirectUri, params);

    return new RedirectResponse(finalRedirectUri);
  }

  private async validateAuthorizationCode(
    payload: PayloadAuthCode,
    client: OAuthClient,
    request: RequestInterface,
  ): Promise<PayloadAuthCode> {
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
    oidc?: { nonce?: string; authTime?: number; maxAge?: number },
  ): Promise<OAuthAuthCode> {
    const user = userIdentifier
      ? await this.userRepository.getUserByCredentials(userIdentifier, undefined, this.identifier, client)
      : undefined;

    const authCode = await this.authCodeRepository.issueAuthCode(client, user, scopes);
    authCode.expiresAt = authCodeTTL.getEndDate();
    authCode.redirectUri = redirectUri;
    authCode.codeChallenge = codeChallenge;
    authCode.codeChallengeMethod = codeChallengeMethod;
    authCode.nonce = oidc?.nonce;
    authCode.authTime = oidc?.authTime;
    authCode.maxAge = oidc?.maxAge;
    authCode.scopes = [];
    scopes.forEach(scope => authCode.scopes.push(scope));
    await this.authCodeRepository.persist(authCode);
    return authCode;
  }

  /**
   * Opaque-code OIDC metadata persistence guard. Opaque codes rebuild their
   * payload from the persisted entity, so a consumer repository that fails to
   * persist `nonce` (or `authTime` when `max_age` was requested) for an
   * openid-scoped request would silently produce a security-degraded flow.
   * Re-read the just-persisted code and fail loud so the misconfiguration
   * surfaces immediately rather than as a nonce-less ID token. JWT codes carry
   * these fields inside the signed code and never reach this guard.
   */
  private async guardAgainstOpaqueNonceLoss(
    authCode: OAuthAuthCode,
    authorizationRequest: AuthorizationRequest,
  ): Promise<void> {
    if (!this.options.useOpaqueAuthorizationCodes || !this.isOpenIdScopeRequest(authorizationRequest.scopes)) return;

    const nonceExpected = authorizationRequest.nonce !== undefined;
    const authTimeExpected = authorizationRequest.maxAge !== undefined;
    if (!nonceExpected && !authTimeExpected) return;

    const persisted = await this.authCodeRepository.getByIdentifier(authCode.code);

    if (nonceExpected && !persisted?.nonce) {
      throw OAuthException.invalidGrant(
        "Authorization code missing nonce — consumer opaque-code repository must persist the nonce field on OAuthAuthCode",
      );
    }

    if (authTimeExpected && persisted?.authTime == null) {
      throw OAuthException.invalidGrant(
        "Authorization code missing auth_time — consumer opaque-code repository must persist the authTime field on OAuthAuthCode",
      );
    }
  }

  /**
   * OIDC `max_age` freshness for openid-scoped codes. When the authorization
   * request carried `max_age`, the end-user authentication recorded in
   * `auth_time` must still be within that window at token time, otherwise the
   * flow is rejected rather than minting an ID token that misrepresents
   * authentication freshness.
   */
  private guardAgainstStaleAuthentication(payload: PayloadAuthCode): void {
    if (!this.isOpenIdScopeRequest(payload.scopes)) return;
    if (payload.max_age == null || payload.auth_time == null) return;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.auth_time + payload.max_age < nowSeconds) {
      throw OAuthException.invalidGrant("max_age exceeded");
    }
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

  private async resolveAuthCodeData(rawCode: string): Promise<{
    properties: PayloadAuthCode;
    authCode: OAuthAuthCode | null;
  }> {
    const { payload, authCode } = await this.authCodeEncoder.resolve(rawCode);
    return { properties: payload, authCode };
  }

  private async getAuthCodeAndClient(token: string): Promise<{ authCodeId: string; clientId: string }> {
    const { auth_code_id, client_id } = await this.authCodeEncoder.unverifiedDecode(token);
    return { authCodeId: auth_code_id, clientId: client_id };
  }
}
