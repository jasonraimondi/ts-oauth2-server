import { DateInterval } from "@jmondi/date-interval";

import { IGrant } from "./grants";
import { OAuthException } from "./exceptions";
import { AuthorizationRequest } from "./requests";
import { IRequest, IResponse } from "./requests/interface";

export class AuthorizationServer {
  private readonly enabledGrantTypes: { [key: string]: IGrant } = {};
  private readonly grantTypeAccessTokenTTL: {
    [key: string]: DateInterval;
  } = {};

  enableGrantType(grantType: IGrant, accessTokenTTL?: DateInterval) {
    if (!accessTokenTTL) accessTokenTTL = new DateInterval("PT1H");
    this.enabledGrantTypes[grantType.identifier] = grantType;
    this.grantTypeAccessTokenTTL[grantType.identifier] = accessTokenTTL;
  }

  respondToAccessTokenRequest(req: IRequest, res: IResponse) {
    for (const grantType of Object.values(this.enabledGrantTypes)) {
      if (!grantType.canRespondToAccessTokenRequest(req)) {
        continue;
      }
      const accessTokenTTL = this.grantTypeAccessTokenTTL[grantType.identifier];
      return grantType.respondToAccessTokenRequest(req, res, accessTokenTTL);
    }

    throw OAuthException.unsupportedGrantType();
  }

  validateAuthorizationRequest(req: IRequest) {
    for (const grantType of Object.values(this.enabledGrantTypes)) {
      if (grantType.canRespondToAuthorizationRequest(req)) {
        return grantType.validateAuthorizationRequest(req);
      }
    }

    throw OAuthException.unsupportedGrantType();
  }

  async completeAuthorizationRequest(authorizationRequest: AuthorizationRequest, response: IResponse): Promise<void> {
    const grant = this.enabledGrantTypes[authorizationRequest.grantTypeId];
    const completedRequest = await grant.completeAuthorizationRequest(authorizationRequest);
    await completedRequest.generateHttpResponse(response);
  }
}
