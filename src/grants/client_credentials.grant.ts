import { DateInterval } from "@jmondi/date-interval";

import { AbstractGrant } from "./abstract.grant";
import { OAuthException } from "../exceptions";
import { ResponseInterface } from "../responses/response";
import { RequestInterface } from "../requests/request";

export class ClientCredentialsGrant extends AbstractGrant {
  readonly identifier = "client_credentials";

  async respondToAccessTokenRequest(
    request: RequestInterface,
    response: ResponseInterface,
    accessTokenTTL: DateInterval,
  ): Promise<ResponseInterface> {
    const [clientId, clientSecret] = this.getClientCredentials(request);

    const grantType = this.getGrantType(request);

    const isClientValid = await this.clientRepository.isClientValid(grantType, clientId, clientSecret);

    if (!isClientValid) {
      throw OAuthException.invalidClient();
    }

    const client = await this.clientRepository.getClientByIdentifier(clientId);

    const bodyScopes = this.getRequestParameter("scope", request, []);

    const validScopes = await this.validateScopes(bodyScopes);

    const userId = undefined;

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, userId, validScopes);

    const expiresIn = accessTokenTTL.toSeconds();

    const to = {
      sub: userId,
      iss: "https://authorization-server.com",
      cid: client.name,
      iat: Date.now() / 1000,
      exp: accessTokenTTL.end().getTime() / 1000,
      scope: validScopes,
    };

    const jwtSignedToken = await this.jwt.sign(to, { expiresIn });

    const refreshToken = await this.issueRefreshToken(accessToken);

    response.body = {
      token_type: "Bearer",
      expires_in: accessTokenTTL.toSeconds(),
      access_token: jwtSignedToken,
      refresh_token: refreshToken?.refreshToken,
      scope: validScopes.map((scope) => scope.name).join(this.scopeDelimiterString),
    };

    response.set("Cache-Control", "no-store");
    response.set("Pragma", "no-cache");

    return response;
  }
}
