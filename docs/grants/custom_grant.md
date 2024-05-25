# Custom Grants

To implement a custom grant, you need to extend the `AbstractGrant` class. This guide will walk you through the steps to create your own custom grant.

## Extending the CustomGrant class

Once you've implemented your custom grant you need to enable it in your `AuthorizationServer`.

```ts
export class MyCustomGrant extends CustomGrant {
  readonly identifier = "custom:my_custom_grant";

  ... // Implement required methods
}
```
 
Use your custom grant

```typescript
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
);

const customGrant = new MyCustomGrant(...);

authorizationServer.enableGrantTypes(
  ["client_credentials", new DateInterval("1d")],
  [customGrant, new DateInterval("1d")],
);
```
