import { AuthorizationServerOptions } from "../../options.js";
import { AuthorizationRequest } from "../../requests/authorization.request.js";
import { RequestInterface } from "../../requests/request.js";
import { ResponseInterface } from "../../responses/response.js";
import { DateInterval } from "../../utils/date_interval.js";
import { GrantIdentifier } from "./grant_identifier.js";

export { GrantIdentifier } from "./grant_identifier.js";

export interface GrantInterface {
  readonly options: AuthorizationServerOptions;

  readonly identifier: GrantIdentifier;

  canRespondToAccessTokenRequest(request: RequestInterface): boolean;

  respondToAccessTokenRequest(request: RequestInterface, accessTokenTTL: DateInterval): Promise<ResponseInterface>;

  canRespondToAuthorizationRequest(request: RequestInterface): boolean;

  validateAuthorizationRequest(request: RequestInterface): Promise<AuthorizationRequest>;

  completeAuthorizationRequest(authorizationRequest: AuthorizationRequest): Promise<ResponseInterface>;

  canRespondToRevokeRequest(request: RequestInterface): boolean;

  respondToRevokeRequest(request: RequestInterface): Promise<ResponseInterface>;

  canRespondToIntrospectRequest(request: RequestInterface): boolean;

  respondToIntrospectRequest(request: RequestInterface): Promise<ResponseInterface>;
}
