import { AbstractGrant } from "~/grants/abstract/abstract.grant";
import { RequestInterface } from "~/requests/request";
import { ResponseInterface } from "~/responses/response";
import { DateInterval } from "~/utils/date_interval";

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

    const user = undefined;

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, validScopes);

    // @todo THIS MUST BE REMOVED
    const [refreshToken, refreshTokenExpiresAt] = await this.issueRefreshToken();

    accessToken.refreshToken = refreshToken;
    accessToken.refreshTokenExpiresAt = refreshTokenExpiresAt;
    return await this.makeBearerTokenResponse(client, accessToken, validScopes);
  }
}
