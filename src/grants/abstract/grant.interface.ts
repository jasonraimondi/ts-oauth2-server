import { AuthorizationServerOptions } from "../../options.js";
import { AuthorizationRequest } from "../../requests/authorization.request.js";
import { RequestInterface } from "../../requests/request.js";
import { ResponseInterface } from "../../responses/response.js";
import { DateInterval } from "../../utils/date_interval.js";
import { GrantIdentifier } from "./grant_identifier.js";

export type { GrantIdentifier } from "./grant_identifier.js";

/**
 * The contract every grant implements. The {@link AuthorizationServer} keeps
 * the enabled grants in a map and, for each endpoint, dispatches to the first
 * grant whose matching `canRespondTo...` predicate accepts the request.
 *
 * Implement it through {@link AbstractGrant} rather than directly.
 */
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
