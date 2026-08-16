# The Authorization Server

The `AuthorizationServer` authenticates resource owners and issues Access Tokens. Every flow in this library starts here.

## Initialization

```ts
const authorizationServer = new AuthorizationServer(
  clientRepository,
  accessTokenRepository,
  scopeRepository,
  "secret-key",
  configuration,
);
```

| Parameter | Description |
| --- | --- |
| `clientRepository` | Your [client repository](../getting_started/repositories.md#client-repository) |
| `accessTokenRepository` | Your [token repository](../getting_started/repositories.md#token-repository) |
| `scopeRepository` | Your [scope repository](../getting_started/repositories.md#scope-repository) |
| `"secret-key"` | A signing secret, or a [`JwtService`](../oidc/keypair_lifecycle.md). Keep it out of source control |
| `configuration` | Optional — see [Configuration](./configuration.md) |

## Enabling Grant Types

Both the `client_credentials` and the `refresh_token` grants are enabled by default. You must enable each of the other grants yourself.

```ts
authorizationServer.enableGrantType("implicit");
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository,
  authCodeRepository,
});
```

The `authorization_code` and `password` grants need their repositories, so you enable them with an object. You enable the other grants with their name. The [Grants](../grants/) pages give the details for each grant.

Enable only the grants that your clients use. Each grant that you enable is one more way to get a token.

There is no method to disable a grant. To keep a Client away from a grant, leave that grant out of the `allowedGrants` of the Client, and refuse it in your [`isClientValid`](../getting_started/repositories.md#client-repository) method. The server then rejects the request with `invalid_client`.

:::tip The library enforces PKCE
The `requiresPKCE` and `requiresS256` options default to `true`. Thus the authorization code grant enforces S256 PKCE, and you do not configure it. Disable these options only for an old client that cannot use PKCE.
:::
