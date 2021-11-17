import { AuthorizationServerOptions } from "../../authorization_server";
import { AuthorizationRequest } from "../../requests/authorization.request";
import { RequestInterface } from "../../requests/request";
import { ResponseInterface } from "../../responses/response";
import { DateInterval } from "../../utils/date_interval";

export type GrantIdentifier = "authorization_code" | "client_credentials" | "refresh_token" | "password" | "implicit";

export interface GrantInterface {
  options: AuthorizationServerOptions;

  identifier: GrantIdentifier;

  canRespondToAccessTokenRequest(request: RequestInterface): boolean;

  respondToAccessTokenRequest(request: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface>;

  canRespondToAuthorizationRequest(request: RequestInterface): boolean;

  validateAuthorizationRequest(request: RequestInterface): Promise<AuthorizationRequest>;

  completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface>;
}
