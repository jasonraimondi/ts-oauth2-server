# FAQs

## How do I validate an Access Token in my API middleware?

You have two options:

- **Verify the JWT, then read the repository.** Use this option when your API and your authorization server run in the same process. [Protecting Resources](/docs/getting_started/protecting_resources) gives the validation function and the middleware.
- **Call the [`/token/introspect`](/docs/endpoints/introspect) endpoint.** Use this option when your resource server is a different service, when you must obey [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662), or when your resource server cannot read the signing key.

## Why is there no `verifyToken()` method?

Each application validates differently. The scopes for a route, the audience of the Access Token, the business rules, and the cost of a database read are all different for each application. The library gives you the parts — `JwtService.verify()` and `OAuthTokenRepository.getByAccessToken()` — and you assemble them.

## Common Errors

### `Unsupported grant_type`

You did not enable that grant on the `AuthorizationServer`. See [Enabling Grant Types](/docs/authorization_server/#enabling-grant-types).

```typescript
import {AuthorizationServer} from "@jmondi/oauth2-server";

const authorizationServer = new AuthorizationServer(...);
authorizationServer.enableGrantType({ grant: "password" ... });
```

### `Client has been revoked or is invalid`

Your `OAuthClientRepository#isClientValid` method returns **false**. Examine that method.
