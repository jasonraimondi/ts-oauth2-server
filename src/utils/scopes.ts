import { OAuthScope } from "../entities/scope.entity.js";
import { OAuthClient } from "../entities/client.entity.js";
import { OAuthException } from "../exceptions/oauth.exception.js";

export function guardAgainstInvalidClientScopes(scopes: OAuthScope[], client: OAuthClient): void {
  const requestedScopes = scopes.map(scope => scope.name);
  const allowedClientScopes = client.scopes.map(scope => scope.name);
  const invalidScopes = requestedScopes.filter(x => !allowedClientScopes.includes(x));

  if (invalidScopes.length > 0) {
    throw OAuthException.unauthorizedScope(invalidScopes.join(", "));
  }
}
