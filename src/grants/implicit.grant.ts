import { DateInterval } from "~/authorization_server";
import { OAuthException } from "~/exceptions/oauth.exception";
import { AbstractAuthorizedGrant } from "~/grants/abstract/abstract_authorized.grant";
import { AuthorizationRequest } from "~/requests/authorization.request";
import { RequestInterface } from "~/requests/request";
import { RedirectResponse } from "~/responses/redirect.response";
import { ResponseInterface } from "~/responses/response";
import { getSecondsUntil } from "~/utils/time";

export class ImplicitGrant extends AbstractAuthorizedGrant {
  readonly identifier = "implicit";

  protected accessTokenTTL: DateInterval = new DateInterval("1h");

  set tokenTTL(interval: DateInterval) {
    this.accessTokenTTL = interval;
  }

  respondToAccessTokenRequest(
    req: RequestInterface,
    res: ResponseInterface,
    tokenTTL: DateInterval,
  ): Promise<ResponseInterface> {
    throw OAuthException.logicException("This grant does not use this method");
  }

  canRespondToAccessTokenRequest(request: RequestInterface): boolean {
    const clientId = this.getQueryStringParameter("client_id", request);
    return this.getQueryStringParameter("response_type", request) === "token" && !!clientId;
  }

  async validateAuthorizationRequest(request: RequestInterface): Promise<AuthorizationRequest> {
    const clientId = this.getQueryStringParameter("client_id", request);

    if (!clientId) {
      throw OAuthException.invalidRequest("client_id");
    }

    const client = await this.clientRepository.getClientByIdentifier(clientId);

    if (!client) {
      throw OAuthException.invalidClient();
    }

    const redirectUri = this.getQueryStringParameter("redirect_uri", request);

    this.validateRedirectUri(redirectUri, client);

    const scopes = await this.validateScopes(
      this.getQueryStringParameter("scope", request), // @see about this.defaultSCopes as third param
      redirectUri,
    );

    const state = this.getQueryStringParameter("state", request);

    const authorizationRequest = new AuthorizationRequest(this.identifier, client);
    authorizationRequest.redirectUri = redirectUri;
    authorizationRequest.state = state;
    authorizationRequest.scopes = scopes;
    return authorizationRequest;
  }

  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface> {
    if (!authorizationRequest.user || !authorizationRequest.user?.identifier) {
      throw OAuthException.logicException("A user must be set on the AuthorizationRequest");
    }

    let finalRedirectUri = authorizationRequest.redirectUri;

    if (!finalRedirectUri) {
      finalRedirectUri = authorizationRequest.client?.redirectUris[0];
    }

    if (!authorizationRequest.isAuthorizationApproved) {
      throw OAuthException.accessDenied();
    }

    const finalizedScopes = await this.scopeRepository.finalizeScopes(
      authorizationRequest.scopes,
      this.identifier,
      authorizationRequest.client,
      authorizationRequest.user.identifier,
    );

    const accessToken = await this.issueAccessToken(
      this.tokenTTL,
      authorizationRequest.client,
      authorizationRequest.user.identifier,
      finalizedScopes,
    );

    const encryptedAccessToken = await this.encryptAccessToken(
      authorizationRequest.client,
      accessToken,
      authorizationRequest.scopes,
    );

    return new RedirectResponse(
      this.makeRedirectUrl(finalRedirectUri, {
        access_token: encryptedAccessToken,
        token_type: "Bearer",
        expires_in: getSecondsUntil(accessToken.expiresAt),
        state: authorizationRequest.state,
      }),
    );
  }
}
