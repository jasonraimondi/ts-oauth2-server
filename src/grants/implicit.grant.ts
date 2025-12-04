import { OAuthException } from "../exceptions/oauth.exception.js";
import { AuthorizationRequest } from "../requests/authorization.request.js";
import { RequestInterface } from "../requests/request.js";
import { RedirectResponse } from "../responses/redirect.response.js";
import { ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { getSecondsUntil } from "../utils/time.js";
import { AbstractAuthorizedGrant } from "./abstract/abstract_authorized.grant.js";

export class ImplicitGrant extends AbstractAuthorizedGrant {
  readonly identifier = "implicit";

  private accessTokenTTL: DateInterval = new DateInterval("1h");

  respondToAccessTokenRequest(_req: RequestInterface, _tokenTTL?: DateInterval): Promise<ResponseInterface> {
    throw OAuthException.badRequest("The implicit grant can't respond to access token requests");
  }

  canRespondToAuthorizationRequest(request: RequestInterface): boolean {
    return this.getQueryStringParameter("response_type", request) === "token";
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

    const bodyScopes = this.getQueryStringParameter("scope", request, []);

    // Finalize scopes without user_id (user not authenticated yet)
    // This validates that the client is authorized to request these scopes
    const finalizedScopes = await this.scopeRepository.finalize(
      await this.validateScopes(bodyScopes, redirectUri),
      this.identifier,
      client,
    );

    const state = this.getQueryStringParameter("state", request);

    const authorizationRequest = new AuthorizationRequest(this.identifier, client, redirectUri);

    authorizationRequest.state = state;

    authorizationRequest.scopes = finalizedScopes;

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

    const extraFields = await this.jwt.extraTokenFields?.({
      user: authorizationRequest.user,
      client: authorizationRequest.client,
    });

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
