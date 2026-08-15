# FAQ's

## How do I validate access tokens in my API middleware?

Two approaches:

- **Verify the JWT, then check the repository.** Recommended when your API and authorization server share a process. See [Protecting Resources](/docs/getting_started/protecting_resources) for the validation function and middleware.
- **Call the [`/token/introspect`](/docs/endpoints/introspect) endpoint.** Use this when your resource server is a separate service, when you need [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662) compliance, or when the resource server has no access to the signing key.

## Why isn't there a built-in `verifyToken()` method?

Validation requirements differ per application — which scopes each route needs, whether the token's audience is your API, what business rules apply, and whether a database check is worth the latency. The library provides the building blocks (`JwtService.verify()`, `TokenRepository.getByAccessToken()`) and you compose them.

## Common Errors

### `Unsupported grant_type`

Check if you're enabling the desired grant type on the AuthorizationServer. See https://tsoauth2server.com/docs/authorization_server/#enabling-grant-types for more.

```typescript
import {AuthorizationServer} from "@jmondi/oauth2-server";

const authorizationServer = new AuthorizationServer(...);
authorizationServer.enableGrantType({ grant: "password" ... });
```

### `Client has been revoked or is invalid`

Check the `OAuthClientRepository#isClientValid` method, it is returning **false**.
