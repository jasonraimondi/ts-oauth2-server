import { DateInterval } from "@jmondi/date-interval";

import { OAuthException } from "~/exceptions/oauth.exception";
import { GrantInterface } from "~/grants/grant.interface";
import { AuthorizationRequest } from "~/requests/authorization.request";
import { RequestInterface } from "~/requests/request";
import { ResponseInterface } from "~/responses/response";

export class AuthorizationServer {
  private readonly enabledGrantTypes: { [key: string]: GrantInterface } = {};
  private readonly grantTypeAccessTokenTTL: { [key: string]: DateInterval } = {};

  enableGrantType(grantType: GrantInterface, accessTokenTTL?: DateInterval) {
    if (!accessTokenTTL) accessTokenTTL = new DateInterval("PT1H");
    this.enabledGrantTypes[grantType.identifier] = grantType;
    this.grantTypeAccessTokenTTL[grantType.identifier] = accessTokenTTL;
  }

  respondToAccessTokenRequest(req: RequestInterface, res: ResponseInterface) {
    for (const grantType of Object.values(this.enabledGrantTypes)) {
      if (!grantType.canRespondToAccessTokenRequest(req)) {
        continue;
      }
      const accessTokenTTL = this.grantTypeAccessTokenTTL[grantType.identifier];
      return grantType.respondToAccessTokenRequest(req, res, accessTokenTTL);
    }

    throw OAuthException.unsupportedGrantType();
  }

  validateAuthorizationRequest(req: RequestInterface) {
    for (const grantType of Object.values(this.enabledGrantTypes)) {
      if (grantType.canRespondToAuthorizationRequest(req)) {
        return grantType.validateAuthorizationRequest(req);
      }
    }

    throw OAuthException.unsupportedGrantType();
  }

  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface> {
    const grant = this.enabledGrantTypes[authorizationRequest.grantTypeId];
    return await grant.completeAuthorizationRequest(authorizationRequest);
  }
}
