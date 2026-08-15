# The Authorization Server

The `AuthorizationServer` authenticates resource owners and issues access tokens. It is the entry point for every flow in this library.

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

The constructor enables `client_credentials` and `refresh_token`. Every other grant is opt-in, so your server supports only the flows you ask for.

```ts
authorizationServer.enableGrantType("implicit");
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository,
  authCodeRepository,
});
```

The `authorization_code` and `password` grants take their repositories in an object; the rest enable by name. See [Grants](../grants/) for the per-grant detail.

Enable only the grants your clients actually use — each one is an additional way to obtain a token.

:::tip PKCE is already on
`requiresPKCE` and `requiresS256` both default to `true`, so the authorization code grant enforces S256 PKCE without configuration. Disable them only for a legacy client that cannot support it.
:::
