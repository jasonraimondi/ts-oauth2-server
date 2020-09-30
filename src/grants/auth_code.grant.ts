import { DateInterval } from "~/authorization_server";
import { PlainVerifier } from "~/code_verifiers/plain.verifier";
import { S256Verifier } from "~/code_verifiers/s256.verifier";
import { CodeChallengeMethod, ICodeChallenge } from "~/code_verifiers/verifier";
import { OAuthClient } from "~/entities/client.entity";
import { OAuthScope } from "~/entities/scope.entity";
import { OAuthException } from "~/exceptions/oauth.exception";
import { AbstractAuthorizedGrant } from "~/grants/abstract/abstract_authorized.grant";
import { GrantIdentifier } from "~/grants/abstract/grant.interface";
import { AuthorizationRequest } from "~/requests/authorization.request";
import { RequestInterface } from "~/requests/request";
import { RedirectResponse } from "~/responses/redirect.response";
import { ResponseInterface } from "~/responses/response";
import { base64decode } from "~/utils/base64";

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

  protected readonly authCodeTTL: DateInterval = new DateInterval("15m");

  private codeChallengeVerifiers = {
    plain: new PlainVerifier(),
    S256: new S256Verifier(),
  };

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

    const user = userId ? await this.userRepository.getByUserIdentifier(userId) : undefined;

    const scopes: OAuthScope[] = [];

    try {
      const finalizedScopes = await this.scopeRepository.finalizeScopes(
        await this.validateScopes(validatedPayload.scopes ?? []),
        this.identifier,
        client,
        userId,
      );
      finalizedScopes.forEach((scope) => scopes.push(scope));
    } catch (e) {
      throw OAuthException.invalidRequest("code", "Cannot verify scopes");
    }

    const authCode = await this.authCodeRepository.getAuthCodeByIdentifier(validatedPayload.auth_code_id);

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

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user?.identifier, scopes);

    const refreshToken = await this.issueRefreshToken(accessToken);

    await this.authCodeRepository.revokeAuthCode(validatedPayload.auth_code_id);

    return await this.makeBearerTokenResponse(client, accessToken, refreshToken, user?.identifier, scopes);
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

    const client = await this.clientRepository.getClientByIdentifier(clientId);

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
    const redirectUri = authorizationRequest.redirectUri;

    if (!redirectUri) {
      throw OAuthException.invalidRequest("redirect_uri");
    }

    if (authorizationRequest.isAuthorizationApproved) {
      const authCode = await this.issueAuthCode(
        this.authCodeTTL,
        authorizationRequest.client,
        authorizationRequest.user?.identifier, // @todo should this be allowed null?
        authorizationRequest.redirectUri,
        authorizationRequest.codeChallenge,
        authorizationRequest.codeChallengeMethod,
        authorizationRequest.scopes,
      );

      const payload: IAuthCodePayload = {
        client_id: authCode.client.id,
        redirect_uri: authCode.redirectUri,
        auth_code_id: authCode.token,
        scopes: authCode.scopes.map((scope) => scope.name),
        user_id: authCode.userId,
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

    // @todo what exception should I throw here?
    throw OAuthException.invalidRequest("isAuthorizationApproved");
  }

  private async validateAuthorizationCode(payload: any, client: OAuthClient, request: RequestInterface) {
    if (!payload.auth_code_id) {
      throw OAuthException.invalidRequest("code", "Authorization code malformed");
    }

    if (
      Date.now() / 1000 > payload.expire_time ||
      (await this.authCodeRepository.isAuthCodeRevoked(payload.auth_code_id))
    ) {
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
}
