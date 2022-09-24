import { OAuthException } from "../exceptions/oauth.exception";
import { AuthorizationRequest } from "../requests/authorization.request";
import { RequestInterface } from "../requests/request";
import { RedirectResponse } from "../responses/redirect.response";
import { ResponseInterface } from "../responses/response";
import { DateInterval } from "../utils/date_interval";
import { getSecondsUntil } from "../utils/time";
import { AbstractAuthorizedGrant } from "./abstract/abstract_authorized.grant";

export class ImplicitGrant extends AbstractAuthorizedGrant {
  readonly identifier = "implicit";

  private accessTokenTTL: DateInterval = new DateInterval("1h");

  respondToAccessTokenRequest(_req: RequestInterface, _tokenTTL?: DateInterval): Promise<ResponseInterface> {
    throw OAuthException.badRequest("The implicit grant can't respond to access token requests");
  }

  canRespondToAuthorizationRequest(request: RequestInterface): boolean {
    return this.getQueryStringParameter("response_type", request) === "token"
  }

  canRespondToAccessTokenRequest(_request: RequestInterface): boolean {
    return false;
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

    const scopes = await this.validateScopes(
      this.getQueryStringParameter("scope", request, []), // @see about this.defaultSCopes as third param
      redirectUri,
    );

    const state = this.getQueryStringParameter("state", request);

    const authorizationRequest = new AuthorizationRequest(this.identifier, client, redirectUri);

    authorizationRequest.state = state;

    authorizationRequest.scopes = scopes;

    return authorizationRequest;
  }

  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface> {
    if (!authorizationRequest.user || !authorizationRequest.user?.id) {
      throw OAuthException.badRequest("A user must be set on the AuthorizationRequest");
    }

    let finalRedirectUri = authorizationRequest.redirectUri;

    if (!finalRedirectUri) {
      finalRedirectUri = authorizationRequest.client?.redirectUris[0];
    }

    if (!finalRedirectUri) {
      throw OAuthException.invalidParameter(
        "redirect_uri",
        "Neither the request nor the client contain a valid refresh token",
      );
    }

    if (!authorizationRequest.isAuthorizationApproved) {
      throw OAuthException.accessDenied();
    }

    const finalizedScopes = await this.scopeRepository.finalize(
      authorizationRequest.scopes,
      this.identifier,
      authorizationRequest.client,
      authorizationRequest.user.id,
    );

    const accessToken = await this.issueAccessToken(
      this.accessTokenTTL,
      authorizationRequest.client,
      authorizationRequest.user,
      finalizedScopes,
    );

    const extraFields = authorizationRequest.user
      ? await this.userRepository.extraAccessTokenFields?.(authorizationRequest.user)
      : undefined;

    const encryptedAccessToken = await this.encryptAccessToken(
      authorizationRequest.client,
      accessToken,
      authorizationRequest.scopes,
      extraFields ?? {},
    );

    const params: Record<string, string> = {
      access_token: encryptedAccessToken,
      token_type: "Bearer",
      expires_in: getSecondsUntil(accessToken.accessTokenExpiresAt).toString(),
    };

    if (authorizationRequest.state) params.state = authorizationRequest.state.toString();

    return new RedirectResponse(this.makeRedirectUrl(finalRedirectUri, params));
  }
}
