# Configuration

::: info

The default configuration is great for most users. You might not need to tweak anything here.

:::

The authorization server has a few optional settings with the following default values;

```ts
type AuthorizationServerOptions = {
  requiresPKCE: true;
  requiresS256: false;
  notBeforeLeeway: 0;
  tokenCID: "id"|"name"; // in 3.x default is "id", in 2.x the default is "name"
}
```

* `requiresPKCE` - Enabled by default, PKCE is enabled and encouraged for all users. If you need to support a legacy client system without PKCE, you can disable PKCE with the authorization server.
* `requiresS256` - Disabled by default. If you want to require all clients to use S256, you can enable that here.
* `notBeforeLeeway` - Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew.  Its value MUST be a number containing a NumericDate value.
* `tokenCID` - Sets the JWT `accessToken.cid` to either the `client.id` or `client.name`. In 3.x the default is 
  **"id"**, in v2.x the default was **"name"**. [(additional context)](https://github.com/jasonraimondi/ts-oauth2-server/blob/e7a31b207701f90552abc82d82c72b143bc15130/src/grants/abstract/abstract.grant.ts#L123)

To configure these options, pass the value in as the last argument:

```typescript
const authorizationServer = new AuthorizationServer(
  authCodeRepository,
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  userRepository,
  new JwtService("secret-key"),
  {
    requiresS256: true, // default is false
  }
);
```