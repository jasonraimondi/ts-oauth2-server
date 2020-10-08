import { PlainVerifier } from "../code_verifiers/plain.verifier";
import { S256Verifier } from "../code_verifiers/s256.verifier";
import { CodeChallengeMethod, ICodeChallenge } from "../code_verifiers/verifier";
import { OAuthAuthCode } from "../entities/auth_code.entity";
import { OAuthClient } from "../entities/client.entity";
import { OAuthScope } from "../entities/scope.entity";
import { OAuthException } from "../exceptions/oauth.exception";
import { AuthorizationRequest } from "../requests/authorization.request";
import { RequestInterface } from "../requests/request";
import { RedirectResponse } from "../responses/redirect.response";
import { ResponseInterface } from "../responses/response";
import { base64decode } from "../utils/base64";
import { DateInterval } from "../utils/date_interval";
import { AbstractAuthorizedGrant } from "./abstract/abstract_authorized.grant";
import { GrantIdentifier } from "./abstract/grant.interface";

export interface IAuthCodePayload {
  client_id: string;
  auth_code_id: string;
  expire_time: number;
  scopes: string[];
  user_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export const REGEXP_CODE_CHALLENGE = /^[A-Za-z0-9-._~]{43,128}$/;

export const REGEXP_CODE_VERIFIER = /^[A-Za-z0-9-._~]{43,128}$/;

export const REGEX_ACCESS_TOKEN = /[A-Za-z0-9\-\._~\+\/]+=*/g;

export class AuthCodeGrant extends AbstractAuthorizedGrant {
  readonly identifier: GrantIdentifier = "authorization_code";

  protected authCodeTTL: DateInterval = new DateInterval("15m");

  private codeChallengeVerifiers = {
    plain: new PlainVerifier(),
    S256: new S256Verifier(),
  };

  set codeTTL(interval: DateInterval) {
    this.authCodeTTL = interval;
  }

  async respondToAccessTokenRequest(
    request: RequestInterface,
    response: ResponseInterface,
    accessTokenTTL: DateInterval,
  ): Promise<ResponseInterface> {
    const client = await this.validateClient(request);

    const encryptedAuthCode = this.getRequestParameter("code", request);

    if (!encryptedAuthCode) throw OAuthException.invalidRequest("code");

    const decryptedCode = await this.decrypt(encryptedAuthCode);

    const validatedPayload = await this.validateAuthorizationCode(decryptedCode, client, request);

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
    } catch (e) {
      throw OAuthException.invalidRequest("code", "Cannot verify scopes");
    }

    const authCode = await this.authCodeRepository.getByIdentifier(validatedPayload.auth_code_id);

    if (!validatedPayload.code_challenge) throw OAuthException.invalidRequest("code_challenge");

    if (authCode.codeChallenge !== validatedPayload.code_challenge) {
      throw OAuthException.invalidRequest("code_challenge", "Provided code challenge does not match auth code");
    }

    const codeVerifier = this.getRequestParameter("code_verifier", request);

    if (!codeVerifier) {
      throw OAuthException.invalidRequest("code_verifier");
    }

    // Validate code_verifier according to RFC-7636
    // @see: https://tools.ietf.org/html/rfc7636#section-4.1
    if (!REGEXP_CODE_VERIFIER.test(codeVerifier)) {
      throw OAuthException.invalidRequest("code_verifier", "Code verifier must follow the specifications of RFS-7636");
    }

    const codeChallengeMethod: CodeChallengeMethod | undefined = validatedPayload.code_challenge_method;

    let verifier: ICodeChallenge = this.codeChallengeVerifiers.plain;

    if (codeChallengeMethod?.toLowerCase() === "s256") {
      verifier = this.codeChallengeVerifiers.S256;
    }

    if (!verifier.verifyCodeChallenge(codeVerifier, validatedPayload.code_challenge)) {
      throw OAuthException.invalidGrant("Failed to verify code challenge.");
    }

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, scopes);

    const [refreshToken, refreshTokenExpiresAt] = await this.issueRefreshToken();

    accessToken.refreshToken = refreshToken;

    accessToken.refreshTokenExpiresAt = refreshTokenExpiresAt;

    await this.authCodeRepository.revoke(validatedPayload.auth_code_id);

    return await this.makeBearerTokenResponse(client, accessToken, scopes);
  }

  canRespondToAuthorizationRequest(request: RequestInterface): boolean {
    const responseType = this.getQueryStringParameter("response_type", request);
    const hasClientId = !!this.getQueryStringParameter("client_id", request);
    return responseType === "code" && hasClientId;
  }

  async validateAuthorizationRequest(request: RequestInterface): Promise<AuthorizationRequest> {
    const clientId = this.getQueryStringParameter("client_id", request);

    if (typeof clientId !== "string") {
      throw OAuthException.invalidRequest("client_id");
    }

    const client = await this.clientRepository.getByIdentifier(clientId);

    if (!client) {
      throw OAuthException.invalidClient();
    }

    let redirectUri = this.getQueryStringParameter("redirect_uri", request);

    if (Array.isArray(redirectUri) && redirectUri.length === 1) redirectUri = redirectUri[0];

    // @todo this might only need to be run if the redirect uri is actually here aka redirect url might be allowed to be null
    this.validateRedirectUri(redirectUri, client);

    const bodyScopes = this.getQueryStringParameter("scope", request, []);

    const scopes = await this.validateScopes(bodyScopes);

    const stateParameter = this.getQueryStringParameter("state", request);

    const authorizationRequest = new AuthorizationRequest(this.identifier, client);

    authorizationRequest.state = stateParameter;

    authorizationRequest.scopes = scopes;

    if (redirectUri) authorizationRequest.redirectUri = redirectUri;

    const codeChallenge = this.getQueryStringParameter("code_challenge", request);

    if (!codeChallenge) {
      throw OAuthException.invalidRequest(
        "code_challenge",
        "The authorization server requires public clients to use PKCE RFC-7636",
      );
    }

    const codeChallengeMethod = this.getQueryStringParameter("code_challenge_method", request, "plain");

    if (!REGEXP_CODE_CHALLENGE.test(base64decode(codeChallenge))) {
      throw OAuthException.invalidRequest(
        "code_challenge",
        `Code challenge must follow the specifications of RFC-7636 and match ${REGEXP_CODE_CHALLENGE.toString()}.`,
      );
    }

    authorizationRequest.codeChallenge = codeChallenge;

    authorizationRequest.codeChallengeMethod = codeChallengeMethod;

    return authorizationRequest;
  }

  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface> {
    if (!authorizationRequest.user) {
      throw OAuthException.logicException("A user should be set on the authorization request");
    }

    const redirectUri = authorizationRequest.redirectUri;

    if (!redirectUri) {
      throw OAuthException.invalidRequest("redirect_uri");
    }

    if (!authorizationRequest.isAuthorizationApproved) {
      // @todo what exception should I throw here?
      throw OAuthException.invalidRequest("isAuthorizationApproved");
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

    const finalRedirectUri = this.makeRedirectUrl(redirectUri, {
      code,
      state: authorizationRequest.state,
    });

    return new RedirectResponse(finalRedirectUri);
  }

  private async validateAuthorizationCode(payload: any, client: OAuthClient, request: RequestInterface) {
    if (!payload.auth_code_id) {
      throw OAuthException.invalidRequest("code", "Authorization code malformed");
    }

    const isCodeRevoked = await this.authCodeRepository.isRevoked(payload.auth_code_id);

    if (Date.now() / 1000 > payload.expire_time || isCodeRevoked) {
      throw OAuthException.invalidRequest("code", "Authorization code is expired or revoked");
    }

    if (payload.client_id !== client.id) {
      throw OAuthException.invalidRequest("code", "Authorization code was not issued to this client");
    }

    const redirectUri = this.getRequestParameter("redirect_uri", request);
    if (!!payload.redirect_uri && !redirectUri) {
      throw OAuthException.invalidRequest("redirect_uri");
    }

    if (payload.redirect_uri !== redirectUri) {
      throw OAuthException.invalidRequest("redirect_uri", "Invalid redirect URI");
    }
    return payload;
  }

  private async issueAuthCode(
    authCodeTTL: DateInterval,
    client: OAuthClient,
    userIdentifier?: string,
    redirectUri?: string,
    codeChallenge?: string,
    codeChallengeMethod?: string,
    scopes: OAuthScope[] = [],
  ): Promise<OAuthAuthCode> {
    const user = userIdentifier ? await this.userRepository.getUserByCredentials(userIdentifier) : undefined;

    const authCode = await this.authCodeRepository.issueAuthCode(client, user, scopes);
    authCode.expiresAt = authCodeTTL.getEndDate();
    authCode.redirectUri = redirectUri;
    authCode.codeChallenge = codeChallenge;
    authCode.codeChallengeMethod = codeChallengeMethod;
    authCode.scopes = [];
    scopes.forEach(scope => (authCode.scopes.push(scope)));
    await this.authCodeRepository.persist(authCode);
    return authCode;
  }
}
