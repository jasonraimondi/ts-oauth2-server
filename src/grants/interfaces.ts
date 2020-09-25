import { DateInterval } from "@jmondi/date-interval";
import { AuthorizationRequest } from "../requests";
import { RedirectResponse } from "../responses";
import { IRequest, IResponse } from "../requests/interface";

export type GrantTypeIdentifiers = "authorization_code" | "client_credentials" | "refresh_token";

export interface IGrant {
  identifier: GrantTypeIdentifiers;

  respondToAccessTokenRequest(
    request: IRequest,
    response: IResponse,
    accessTokenTTL: DateInterval,
  ): Promise<IResponse>;

  canRespondToAuthorizationRequest(request: IRequest): boolean;

  validateAuthorizationRequest(request: IRequest): Promise<AuthorizationRequest>;

  completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<RedirectResponse>;

  canRespondToAccessTokenRequest(request: IRequest): boolean;
}
