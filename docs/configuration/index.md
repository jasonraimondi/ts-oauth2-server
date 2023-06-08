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
  tokenCID: "id" | "name";
}
```

| Option            | Number         | Default | Details                                                                                                                                                                        |
|-------------------|----------------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `requiresPKCE`    | boolean        | true    | PKCE is enabled by default and recommended for all users. To support a legacy client without PKCE, disable this option. [[Learn more]][requires-pkce]                          |
| `requiresS256`    | boolean        | true    | Disabled by default. If you want to require all clients to use S256, you can enable that here. [[Learn more]][requires-s256]                                                   |
| `notBeforeLeeway` | number         | 0       | Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew.  Its value MUST be a number containing a NumericDate value.     |
| `tokenCID`        | "id" or "name" | "id"    | Sets the JWT `accessToken.cid` to either the `client.id` or `client.name`.<br /><br />In 3.x the default is **"id"**, in v2.x the default was **"name"**. [[Learn more]][token-cid] |

To configure these options, pass the value in as the last argument:

```typescript
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  new JwtService("secret-key"),
  {
    requiresS256: true,
  }
);
```

[requires-pkce]: https://datatracker.ietf.org/doc/html/rfc7636
[requires-s256]: https://datatracker.ietf.org/doc/html/rfc7636#section-4.2
[token-cid]: https://github.com/jasonraimondi/ts-oauth2-server/blob/e7a31b207701f90552abc82d82c72b143bc15130/src/grants/abstract/abstract.grant.ts#L123
