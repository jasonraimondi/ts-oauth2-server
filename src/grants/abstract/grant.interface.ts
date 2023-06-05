import { AuthorizationServerOptions } from "../../authorization_server.js";
import { AuthorizationRequest } from "../../requests/authorization.request.js";
import { RequestInterface } from "../../requests/request.js";
import { ResponseInterface } from "../../responses/response.js";
import { DateInterval } from "../../utils/date_interval.js";

export type GrantIdentifier = "authorization_code" | "client_credentials" | "refresh_token" | "password" | "implicit";

export interface GrantInterface {
  options: AuthorizationServerOptions;

  identifier: GrantIdentifier;

  canRespondToAccessTokenRequest(request: RequestInterface): boolean;

  respondToAccessTokenRequest(request: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface>;

  canRespondToAuthorizationRequest(request: RequestInterface): boolean;

  validateAuthorizationRequest(request: RequestInterface): Promise<AuthorizationRequest>;

  completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface>;

  canRespondToRevokeRequest(request: RequestInterface): boolean;

  respondToRevokeRequest(request: RequestInterface): Promise<ResponseInterface>;
}
