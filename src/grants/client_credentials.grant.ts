import { RequestInterface } from "../requests/request";
import { ResponseInterface } from "../responses/response";
import { DateInterval } from "../utils/date_interval";
import { AbstractGrant } from "./abstract/abstract.grant";

export class ClientCredentialsGrant extends AbstractGrant {
  readonly identifier = "client_credentials";

  async respondToAccessTokenRequest(req: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    const client = await this.validateClient(req);

    const bodyScopes = this.getRequestParameter("scope", req, []);

    const validScopes = await this.validateScopes(bodyScopes);

    const user = undefined;

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, validScopes);

    return await this.makeBearerTokenResponse(client, accessToken, validScopes);
  }
}
