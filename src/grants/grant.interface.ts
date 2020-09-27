import { DateInterval } from "@jmondi/date-interval";
import { AuthorizationRequest } from "../requests";
import { ResponseInterface } from "../responses/response";
import { RequestInterface } from "../requests/request";

export type GrantIdentifier = "authorization_code" | "client_credentials" | "refresh_token";

export interface GrantInterface {
  identifier: GrantIdentifier;

  canRespondToAccessTokenRequest(request: RequestInterface): boolean;

  respondToAccessTokenRequest(
    request: RequestInterface,
    response: ResponseInterface,
    accessTokenTTL: DateInterval,
  ): Promise<ResponseInterface>;

  canRespondToAuthorizationRequest(request: RequestInterface): boolean;

  validateAuthorizationRequest(request: RequestInterface): Promise<AuthorizationRequest>;

  completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface>;
}
