import { RequestInterface } from "../requests/request.js";
import { ResponseInterface } from "../responses/response.js";
import { DateInterval } from "../utils/date_interval.js";
import { AbstractGrant } from "./abstract/abstract.grant.js";

export class ClientCredentialsGrant extends AbstractGrant {
  readonly identifier = "client_credentials";

  async respondToAccessTokenRequest(req: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface> {
    const client = await this.validateClient(req);

    const bodyScopes = this.getRequestParameter("scope", req, []);

    const validScopes = await this.validateScopes(bodyScopes);

    const user = undefined;

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, user, validScopes);

    const jwtExtras = await this.extraJwtFields(req, client, user);

    return await this.makeBearerTokenResponse(client, accessToken, validScopes, jwtExtras);
  }

  canRespondToIntrospectRequest(request: RequestInterface): boolean {
    return this.getRequestParameter("grant_type", request) === this.identifier;
  }
}
