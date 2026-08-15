import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";

/**
 * Asserts that a client may request every one of the given scopes, comparing
 * them against the scopes on its registration.
 *
 * @param client - The client that made the request
 * @param scopes - The Requested Scopes
 * @throws {OAuthException} `unauthorized_scope` naming the scopes the client may not request
 */
export function guardAgainstInvalidClientScopes(client: OAuthClient, scopes: OAuthScope[]): void {
  const requestedScopes = scopes.map(scope => scope.name);
  const allowedClientScopes = client.scopes.map(scope => scope.name);
  const invalidScopes = requestedScopes.filter(x => !allowedClientScopes.includes(x));

  if (invalidScopes.length > 0) {
    throw OAuthException.unauthorizedScope(invalidScopes.join(", "));
  }
}
