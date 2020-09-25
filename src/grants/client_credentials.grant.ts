import { DateInterval } from "@jmondi/date-interval";
import type { Request, Response } from "express";

import { AbstractGrant } from "./abstract.grant";
import { OAuthException } from "../exceptions";
import { IRequest, IResponse } from "../requests/interface";

export class ClientCredentialsGrant extends AbstractGrant {
  readonly identifier = "client_credentials";

  async respondToAccessTokenRequest(
    request: IRequest,
    response: IResponse,
    accessTokenTTL: DateInterval,
  ): Promise<Response> {
    const [clientId, clientSecret] = this.getClientCredentials(request);

    const grantType = this.getGrantType(request);

    if (grantType !== this.identifier) {
      // @todo fix this error message
      throw OAuthException.invalidGrant(`${grantType} !== ${this.identifier}`);
    }

    const isClientValid = await this.clientRepository.isClientValid(grantType, clientId, clientSecret);

    if (!isClientValid) {
      throw OAuthException.errorValidatingClient();
    }

    const client = await this.clientRepository.getClientByIdentifier(clientId);

    const bodyScopes = request.body?.scopes ?? [];

    const validScopes = await this.validateScopes(bodyScopes);

    const userId = undefined;

    const accessToken = await this.issueAccessToken(accessTokenTTL, client, userId, validScopes);

    const expiresIn = accessTokenTTL.toSeconds();

    const jwtSignedToken = this.jwt.sign(accessToken.toJWT, { expiresIn });

    return response.send({
      token_type: "Bearer",
      expires_in: accessTokenTTL.toSeconds(),
      access_token: jwtSignedToken,
    });
  }
}
