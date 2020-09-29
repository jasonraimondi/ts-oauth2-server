import { DateInterval } from "~/authorization_server";
import { AbstractGrant } from "~/grants/abstract.grant";
import { RequestInterface } from "~/requests/request";
import { ResponseInterface } from "~/responses/response";

export class ClientCredentialsGrant extends AbstractGrant {
  readonly identifier = "client_credentials";

  async respondToAccessTokenRequest(
    request: RequestInterface,
    response: ResponseInterface,
    accessTokenTTL: DateInterval,
  ): Promise<ResponseInterface> {
    const client = await this.validateClient(request);

    const bodyScopes = this.getRequestParameter("scope", request, []);

    const validScopes = await this.validateScopes(bodyScopes);

    const userId = undefined;

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, userId, validScopes);

    const refreshToken = await this.issueRefreshToken(accessToken);

    return await this.makeBearerTokenResponse(client, accessToken, refreshToken, userId, validScopes);
  }
}
